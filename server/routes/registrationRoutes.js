const express = require('express');
const { Registration, Event, User, Attendance, Session, EventDay } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Helper function to generate 20-character random verification code
const generateVerificationCode = () => {
  // Generate random bytes and convert to base64, then take first 20 characters
  // Using alphanumeric characters (A-Z, a-z, 0-9) for better QR code readability
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  
  // Generate 20 characters randomly
  for (let i = 0; i < 20; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }
  
  return code;
};

// POST /register - Register user for an event
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    // Validate eventId is provided
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
    }

    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if event is active
    if (event.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot register for inactive or completed event'
      });
    }

    // Check if user is already registered for this event
    const existingRegistration = await Registration.findOne({
      where: {
        eventId: eventId,
        userId: userId
      }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered for this event',
        registration: {
          id: existingRegistration.id,
          verificationCode: existingRegistration.verificationCode,
          status: existingRegistration.status,
          checkedIn: existingRegistration.checkedIn,
          createdAt: existingRegistration.createdAt
        }
      });
    }

    // Generate unique verification code (retry if code already exists)
    let verificationCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      verificationCode = generateVerificationCode();
      const existingCode = await Registration.findOne({
        where: { verificationCode: verificationCode }
      });
      
      if (!existingCode) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate unique verification code. Please try again.'
      });
    }

    // Create registration
    const registration = await Registration.create({
      eventId: eventId,
      userId: userId,
      status: 'confirmed',
      verificationCode: verificationCode,
      checkedIn: false
    });

    // Fetch registration with event and user details
    const registrationWithDetails = await Registration.findByPk(registration.id, {
    });

    res.status(201).json({
      success: true,
      message: 'Successfully registered for the event',
      registration: {
        id: registrationWithDetails.id,
        eventId: registrationWithDetails.eventId,
        userId: registrationWithDetails.userId,
        verificationCode: registrationWithDetails.verificationCode,
        status: registrationWithDetails.status,
        checkedIn: registrationWithDetails.checkedIn,   
      }
    });

  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register for event'
    });
  }
});

// PUT /checkin/:verificationCode - Check in user by verification code
router.put('/checkin/:verificationCode', authenticateToken, async (req, res) => {
  try {
    const { verificationCode } = req.params;
    const organizerId = req.user.id; // The person checking in (should be the organizer)

    if (!verificationCode || verificationCode.length !== 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format'
      });
    }

    // Find registration by verification code
    const registration = await Registration.findOne({
      where: { verificationCode: verificationCode },
      include: [
        {
          model: Event,
          as: 'Event',
          attributes: ['id', 'name', 'organizerId', 'status']
        }
      ]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    // Check if user checking in is the organizer of the event
    if (registration.Event.organizerId !== organizerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to check in attendees for this event'
      });
    }

    // Check if already checked in
    if (registration.checkedIn === true) {
      return res.status(400).json({
        success: false,
        error: 'User is already checked in',
        registration: {
          id: registration.id,
          verificationCode: registration.verificationCode,
          checkedIn: registration.checkedIn,
          checkedInAt: registration.updatedAt
        }
      });
    }

    // Check if event is active
    if (registration.Event.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot check in for inactive or completed event'
      });
    }

    // Update checkedIn status
    await registration.update({
      checkedIn: true
    });

    // Fetch updated registration with user details
    const updatedRegistration = await Registration.findByPk(registration.id, {
      include: [
        {
          model: Event,
          as: 'Event',
          attributes: ['id', 'name', 'dateTime', 'location', 'status']
        },
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'personalEmail']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'User checked in successfully',
      registration: {
        id: updatedRegistration.id,
        eventId: updatedRegistration.eventId,
        userId: updatedRegistration.userId,
        verificationCode: updatedRegistration.verificationCode,
        status: updatedRegistration.status,
        checkedIn: updatedRegistration.checkedIn,
        event: updatedRegistration.Event ? {
          id: updatedRegistration.Event.id,
          name: updatedRegistration.Event.name,
          dateTime: updatedRegistration.Event.dateTime,
          location: updatedRegistration.Event.location,
          status: updatedRegistration.Event.status
        } : null,
        user: updatedRegistration.User ? {
          id: updatedRegistration.User.id,
          name: updatedRegistration.User.name,
          email: updatedRegistration.User.personalEmail
        } : null,
        updatedAt: updatedRegistration.updatedAt
      }
    });

  } catch (error) {
    console.error('Error checking in user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check in user'
    });
  }
});

// GET /registration/:verificationCode - Get registration by verification code (for QR code scanning)
router.get('/:verificationCode', async (req, res) => {
  try {
    const { verificationCode } = req.params;

    if (!verificationCode || verificationCode.length !== 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format'
      });
    }

    const registration = await Registration.findOne({
      where: { verificationCode: verificationCode },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        verificationCode: registration.verificationCode,
        status: registration.status,
        checkedIn: registration.checkedIn,
        event: registration.Event ? {
          id: registration.Event.id,
          name: registration.Event.name,
          dateTime: registration.Event.dateTime,
          location: registration.Event.location,
          status: registration.Event.status
        } : null,
        user: registration.User ? {
          id: registration.User.id,
          name: registration.User.name,
          email: registration.User.personalEmail
        } : null,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch registration'
    });
  }
});

// POST /attendance/mark - Mark attendance for a registration and session
router.post('/attendance/mark', authenticateToken, async (req, res) => {
  try {
    const { verificationCode, sessionId } = req.body;
    const organizerId = req.user.id; // The person marking attendance (should be the organizer)

    if (!verificationCode || verificationCode.length !== 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Find registration by verification code
    const registration = await Registration.findOne({
      where: { verificationCode: verificationCode },
      include: [
        {
          model: Event,
          as: 'Event',
          attributes: ['id', 'name', 'organizerId', 'status']
        }
      ]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    // Check if user marking attendance is the organizer of the event
    if (registration.Event.organizerId !== organizerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to mark attendance for this event'
      });
    }

    // Check if session exists and belongs to the event
    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: EventDay,
          as: 'EventDay',
          attributes: ['id', 'eventId']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Verify session belongs to the same event
    if (session.EventDay.eventId !== registration.eventId) {
      return res.status(400).json({
        success: false,
        error: 'Session does not belong to this event'
      });
    }

    // Check if event is active
    if (registration.Event.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot mark attendance for inactive or completed event'
      });
    }

    // Check if attendance already exists and is marked as present
    const existingAttendance = await Attendance.findOne({
      where: {
        registrationId: registration.id,
        sessionId: sessionId
      },
      include: [
        {
          model: Registration,
          as: 'Registration',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'name', 'personalEmail']
            }
          ]
        },
        {
          model: Session,
          as: 'Session',
          attributes: ['id', 'title']
        }
      ]
    });

    // If attendance exists and is already marked as present, return that info
    if (existingAttendance && existingAttendance.status === 'present') {
      return res.status(200).json({
        success: true,
        alreadyPresent: true,
        message: 'User is already marked as present for this session',
        attendance: {
          id: existingAttendance.id,
          registrationId: existingAttendance.registrationId,
          sessionId: existingAttendance.sessionId,
          status: existingAttendance.status,
          markedBy: existingAttendance.markedBy,
          markedAt: existingAttendance.markedAt,
          user: existingAttendance.Registration?.User ? {
            id: existingAttendance.Registration.User.id,
            name: existingAttendance.Registration.User.name,
            email: existingAttendance.Registration.User.personalEmail
          } : null,
          session: existingAttendance.Session ? {
            id: existingAttendance.Session.id,
            title: existingAttendance.Session.title
          } : null
        }
      });
    }

    let attendance;
    if (existingAttendance) {
      // Update existing attendance (if status was 'absent' or something else)
      await existingAttendance.update({
        status: 'present',
        markedBy: organizerId,
        markedAt: new Date()
      });
      attendance = existingAttendance;
    } else {
      // Create new attendance record
      attendance = await Attendance.create({
        registrationId: registration.id,
        sessionId: sessionId,
        status: 'present',
        markedBy: organizerId,
        markedAt: new Date()
      });
    }

    // Fetch attendance with related data
    const attendanceWithDetails = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: Registration,
          as: 'Registration',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'name', 'personalEmail']
            }
          ]
        },
        {
          model: Session,
          as: 'Session',
          attributes: ['id', 'title']
        }
      ]
    });

    res.status(200).json({
      success: true,
      alreadyPresent: false,
      message: 'Attendance marked successfully',
      attendance: {
        id: attendanceWithDetails.id,
        registrationId: attendanceWithDetails.registrationId,
        sessionId: attendanceWithDetails.sessionId,
        status: attendanceWithDetails.status,
        markedBy: attendanceWithDetails.markedBy,
        markedAt: attendanceWithDetails.markedAt,
        user: attendanceWithDetails.Registration?.User ? {
          id: attendanceWithDetails.Registration.User.id,
          name: attendanceWithDetails.Registration.User.name,
          email: attendanceWithDetails.Registration.User.personalEmail
        } : null,
        session: attendanceWithDetails.Session ? {
          id: attendanceWithDetails.Session.id,
          title: attendanceWithDetails.Session.title
        } : null
      }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark attendance'
    });
  }
});

module.exports = router;

