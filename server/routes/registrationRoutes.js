const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');

const {
  Registration,
  Event,
  User,
  Attendance,
  Session,
  EventDay,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const generateVerificationCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let attempts = 0;

  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 20; i += 1) {
      const randomIndex = crypto.randomInt(0, chars.length);
      code += chars[randomIndex];
    }

    const exists = await Registration.exists({ verificationCode: code });
    if (!exists) {
      return code;
    }
    attempts += 1;
  }

  throw new Error('Failed to generate unique verification code');
};

router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required',
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    if (event.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot register for inactive or completed event',
      });
    }

    const existingRegistration = await Registration.findOne({ eventId, userId });
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered for this event',
        registration: {
          id: existingRegistration._id.toString(),
          verificationCode: existingRegistration.verificationCode,
          status: existingRegistration.status,
          checkedIn: existingRegistration.checkedIn,
          createdAt: existingRegistration.createdAt,
        },
      });
    }

    const verificationCode = await generateVerificationCode();

    const registration = await Registration.create({
      eventId,
      userId,
      status: 'confirmed',
      verificationCode,
      checkedIn: false,
    });

    res.status(201).json({
      success: true,
      message: 'Successfully registered for the event',
      registration: {
        id: registration._id.toString(),
        eventId: registration.eventId.toString(),
        userId: registration.userId.toString(),
        verificationCode: registration.verificationCode,
        status: registration.status,
        checkedIn: registration.checkedIn,
      },
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register for event',
    });
  }
});

router.put('/checkin/:verificationCode', authenticateToken, async (req, res) => {
  try {
    const { verificationCode } = req.params;
    const organizerId = req.user.id;

    if (!verificationCode || verificationCode.length !== 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format',
      });
    }

    const registration = await Registration.findOne({ verificationCode })
      .populate('eventId', 'organizerId name dateTime location status')
      .populate('userId', 'name personalEmail')
      .lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
      });
    }

    if (registration.eventId.organizerId.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to check in attendees for this event',
      });
    }

    if (registration.checkedIn) {
      return res.status(400).json({
        success: false,
        error: 'User is already checked in',
        registration,
      });
    }

    if (registration.eventId.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot check in for inactive or completed event',
      });
    }

    const updated = await Registration.findByIdAndUpdate(
      registration._id,
      { checkedIn: true },
      { new: true }
    )
      .populate('eventId', 'name dateTime location status')
      .populate('userId', 'name personalEmail')
      .lean();

    res.status(200).json({
      success: true,
      message: 'User checked in successfully',
      registration: {
        id: updated._id.toString(),
        eventId: updated.eventId?._id?.toString(),
        userId: updated.userId?._id?.toString(),
        verificationCode: updated.verificationCode,
        status: updated.status,
        checkedIn: updated.checkedIn,
        event: updated.eventId
          ? {
              id: updated.eventId._id.toString(),
              name: updated.eventId.name,
              dateTime: updated.eventId.dateTime,
              location: updated.eventId.location,
              status: updated.eventId.status,
            }
          : null,
        user: updated.userId
          ? {
              id: updated.userId._id.toString(),
              name: updated.userId.name,
              email: updated.userId.personalEmail,
            }
          : null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error checking in user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check in user',
    });
  }
});

router.get('/:verificationCode', async (req, res) => {
  try {
    const { verificationCode } = req.params;

    if (!verificationCode || verificationCode.length !== 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format',
      });
    }

    const registration = await Registration.findOne({ verificationCode })
      .populate('eventId', 'name dateTime location status')
      .populate('userId', 'name personalEmail')
      .lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
      });
    }

    res.status(200).json({
      success: true,
      registration: {
        id: registration._id.toString(),
        eventId: registration.eventId?._id?.toString(),
        userId: registration.userId?._id?.toString(),
        verificationCode: registration.verificationCode,
        status: registration.status,
        checkedIn: registration.checkedIn,
        event: registration.eventId
          ? {
              id: registration.eventId._id.toString(),
              name: registration.eventId.name,
              dateTime: registration.eventId.dateTime,
              location: registration.eventId.location,
              status: registration.eventId.status,
            }
          : null,
        user: registration.userId
          ? {
              id: registration.userId._id.toString(),
              name: registration.userId.name,
              email: registration.userId.personalEmail,
            }
          : null,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch registration',
    });
  }
});

router.post('/attendance/mark', authenticateToken, async (req, res) => {
  try {
    const { verificationCode, sessionId } = req.body;
    const organizerId = req.user.id;

    if (!verificationCode || verificationCode.length !== 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format',
      });
    }

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    const registration = await Registration.findOne({ verificationCode })
      .populate('eventId', 'organizerId status')
      .populate('userId', 'name personalEmail')
      .lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
      });
    }

    if (registration.eventId.organizerId.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to mark attendance for this event',
      });
    }

    const session = await Session.findById(sessionId).populate('eventDayId', 'eventId').lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    if (session.eventDayId.eventId.toString() !== registration.eventId._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Session does not belong to this event',
      });
    }

    if (registration.eventId.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot mark attendance for inactive or completed event',
      });
    }

    let attendance = await Attendance.findOne({
      registrationId: registration._id,
      sessionId,
    })
      .populate({
        path: 'registrationId',
        populate: { path: 'userId', select: 'name personalEmail' },
      })
      .populate('sessionId', 'title')
      .lean();

    if (attendance && attendance.status === 'present') {
      return res.status(200).json({
        success: true,
        alreadyPresent: true,
        message: 'User is already marked as present for this session',
        attendance,
      });
    }

    await Attendance.updateOne(
      { registrationId: registration._id, sessionId },
      {
        status: 'present',
        markedBy: organizerId,
        markedAt: new Date(),
      },
      { upsert: true }
    );

    attendance = await Attendance.findOne({
      registrationId: registration._id,
      sessionId,
    })
      .populate({
        path: 'registrationId',
        populate: { path: 'userId', select: 'name personalEmail' },
      })
      .populate('sessionId', 'title')
      .lean();

    res.status(200).json({
      success: true,
      alreadyPresent: false,
      message: 'Attendance marked successfully',
      attendance,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark attendance',
    });
  }
});

module.exports = router;

