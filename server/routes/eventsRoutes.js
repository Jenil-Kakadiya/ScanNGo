const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');

const {
  Event,
  User,
  Registration,
  EventDay,
  Session,
  Attendance,
  EventCertificateRequirement,
} = require('../models');
const { authenticateAdminToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }
  return result;
};

const generateVerificationCode = async () => {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateRandomString(20);
    const exists = await Registration.exists({ verificationCode: code });
    if (!exists) {
      return code;
    }
    attempts += 1;
  }
  throw new Error('Unable to generate unique verification code');
};

const buildEventResponse = (event, attendeeCount = 0, organizer = null) => ({
  id: event._id.toString(),
  name: event.name,
  description: event.description,
  status: event.status,
  location: event.location,
  dateTime: event.dateTime,
  organizerId: event.organizerId?.toString(),
  creatorEmail: event.creatorEmail,
  attendees: attendeeCount,
  organizer: organizer
    ? {
        id: organizer._id.toString(),
        name: organizer.name,
        email: organizer.personalEmail,
      }
    : null,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  certificateEnabled: event.certificateEnabled,
});

router.get('/public', async (req, res) => {
  try {
    const events = await Event.find({ status: 'active' }).sort({ dateTime: 1 }).lean();
    const eventIds = events.map((event) => event._id);

    const attendeeCounts = await Registration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(attendeeCounts.map((row) => [row._id.toString(), row.count]));

    const organizers = await User.find({
      _id: { $in: events.map((event) => event.organizerId) },
    })
      .select('name personalEmail')
      .lean();
    const organizerMap = new Map(organizers.map((user) => [user._id.toString(), user]));

    const response = events.map((event) =>
      buildEventResponse(
        event,
        countMap.get(event._id.toString()) || 0,
        organizerMap.get(event.organizerId?.toString())
      )
    );

    res.status(200).json({ success: true, events: response });
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/user-events', authenticateToken, async (req, res) => {
  try {
    const registrations = await Registration.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    if (!registrations.length) {
      return res.status(200).json({ success: true, events: [] });
    }

    const eventIds = registrations.map((reg) => reg.eventId);
    const events = await Event.find({ _id: { $in: eventIds } })
      .populate('organizerId', 'name personalEmail')
      .lean();
    const eventMap = new Map(events.map((event) => [event._id.toString(), event]));

    const userEvents = registrations
      .map((reg) => {
        const event = eventMap.get(reg.eventId.toString());
        if (!event) return null;
        return {
          id: event._id.toString(),
          name: event.name,
          description: event.description,
          status: event.status,
          location: event.location,
          dateTime: event.dateTime,
          organizerId: event.organizerId?._id?.toString() || event.organizerId?.toString(),
          creatorEmail: event.creatorEmail,
          registrationStatus: reg.status,
          checkedIn: reg.checkedIn,
          registrationDate: reg.createdAt,
          verificationCode: reg.verificationCode,
          organizer: event.organizerId
            ? {
                id: event.organizerId._id?.toString() || event.organizerId.toString(),
                name: event.organizerId.name,
                email: event.organizerId.personalEmail,
              }
            : null,
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, events: userEvents });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/organized', authenticateToken, async (req, res) => {
  try {
    const events = await Event.find({ organizerId: req.user.id })
      .sort({ dateTime: -1 })
      .lean();

    const response = events.map((event) => ({
      id: event._id.toString(),
      name: event.name,
      description: event.description,
      status: event.status,
      location: event.location,
      dateTime: event.dateTime,
      organizerId: event.organizerId?.toString(),
      creatorEmail: event.creatorEmail,
      certificateEnabled: event.certificateEnabled,
    }));

    res.status(200).json({ success: true, events: response });
  } catch (error) {
    console.error('Error fetching organized events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:eventId/delegates', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user.id;
    const { name, email, mobileNo } = req.body;

    if (!name || !email || !mobileNo) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and mobile number are required',
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.organizerId.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to add delegates for this event',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobileNo.trim();

    const [existingByEmail, existingByMobile] = await Promise.all([
      User.findOne({ personalEmail: normalizedEmail }),
      User.findOne({ mobileNo: normalizedMobile }),
    ]);

    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists',
      });
    }
    if (existingByMobile) {
      return res.status(400).json({
        success: false,
        error: 'A user with this mobile number already exists',
      });
    }

    const temporaryPassword = generateRandomString(12);

    const delegate = await User.create({
      name: name.trim(),
      personalEmail: normalizedEmail,
      mobileNo: normalizedMobile,
      universityEmail: '',
      universityRollNo: '333',
      department: 'ICT',
      batch: '2024-2028',
      password: temporaryPassword,
      role: 'delegate',
      isActive: true,
    });

    const verificationCode = await generateVerificationCode();

    const registration = await Registration.create({
      eventId: event._id,
      userId: delegate._id,
      status: 'confirmed',
      verificationCode,
      checkedIn: false,
    });

    res.status(201).json({
      success: true,
      message: 'Delegate registered successfully',
      delegate: {
        id: delegate._id.toString(),
        name: delegate.name,
        email: delegate.personalEmail,
        mobileNo: delegate.mobileNo,
      },
      registration: {
        id: registration._id.toString(),
        verificationCode: registration.verificationCode,
        status: registration.status,
        checkedIn: registration.checkedIn,
      },
      temporaryPassword,
    });
  } catch (error) {
    console.error('Error creating delegate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register delegate',
    });
  }
});

router.get('/', authenticateAdminToken, async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    const eventIds = events.map((event) => event._id);

    const attendeeCounts = await Registration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(attendeeCounts.map((row) => [row._id.toString(), row.count]));

    const organizers = await User.find({
      _id: { $in: events.map((event) => event.organizerId) },
    })
      .select('name personalEmail')
      .lean();
    const organizerMap = new Map(organizers.map((user) => [user._id.toString(), user]));

    const response = events.map((event) =>
      buildEventResponse(
        event,
        countMap.get(event._id.toString()) || 0,
        organizerMap.get(event.organizerId?.toString())
      )
    );

    res.status(200).json({ success: true, events: response });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:eventId/delegates', authenticateAdminToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const delegateRegistrations = await Registration.find({ eventId })
      .populate({
        path: 'userId',
        select: 'name personalEmail mobileNo role',
      })
      .lean();

    const delegates = delegateRegistrations
      .filter((registration) => registration.userId?.role === 'delegate')
      .map((registration) => ({
        id: registration.userId._id.toString(),
        name: registration.userId.name,
        email: registration.userId.personalEmail,
        mobileNo: registration.userId.mobileNo,
        registrationId: registration._id.toString(),
        verificationCode: registration.verificationCode,
        status: registration.status,
        checkedIn: registration.checkedIn,
        createdAt: registration.createdAt,
      }));

    res.status(200).json({
      success: true,
      delegates,
      totalDelegates: delegates.length,
    });
  } catch (error) {
    console.error('Error fetching delegates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch delegates',
    });
  }
});

router.get('/:eventId/attendance/export', authenticateAdminToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const days = await EventDay.find({ eventId }).sort({ dayDate: 1 }).lean();
    const dayIds = days.map((day) => day._id);
    const sessions = await Session.find({ eventDayId: { $in: dayIds } })
      .sort({ createdAt: 1 })
      .lean();
    const sessionIds = sessions.map((session) => session._id);

    const attendances = await Attendance.find({
      sessionId: { $in: sessionIds },
      status: 'present',
    })
      .populate({
        path: 'registrationId',
        populate: { path: 'userId', select: 'name personalEmail' },
      })
      .lean();

    const attendanceBySession = attendances.reduce((acc, attendance) => {
      const key = attendance.sessionId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(attendance);
      return acc;
    }, {});

    const sessionsByDay = sessions.reduce((acc, session) => {
      const key = session.eventDayId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});

    const responseData = {
      success: true,
      event: {
        id: event._id.toString(),
        name: event.name,
        dateTime: event.dateTime,
        location: event.location,
      },
      days: days.map((day) => ({
        id: day._id.toString(),
        title: day.title,
        dayDate: day.dayDate,
        sessions: (sessionsByDay[day._id.toString()] || []).map((session) => ({
          id: session._id.toString(),
          title: session.title,
          createdAt: session.createdAt,
          attendees: (attendanceBySession[session._id.toString()] || []).map((attendance) => ({
            registrationId: attendance.registrationId?._id?.toString(),
            markedAt: attendance.markedAt,
            user:
              attendance.registrationId?.userId != null
                ? {
                    id: attendance.registrationId.userId._id.toString(),
                    name: attendance.registrationId.userId.name,
                    email: attendance.registrationId.userId.personalEmail,
                  }
                : null,
          })),
        })),
      })),
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch attendance export data',
    });
  }
});

router.get('/:eventId/days', authenticateAdminToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const eventDays = await EventDay.find({ eventId }).sort({ dayDate: 1 }).lean();
    const dayIds = eventDays.map((day) => day._id);

    const sessions = await Session.find({ eventDayId: { $in: dayIds } }).lean();
    const sessionsByDay = sessions.reduce((acc, session) => {
      const key = session.eventDayId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});

    const attendance = await Attendance.find({
      sessionId: { $in: sessions.map((session) => session._id) },
      status: 'present',
    })
      .select('registrationId sessionId')
      .lean();

    const attendanceBySession = attendance.reduce((acc, row) => {
      const key = row.sessionId.toString();
      if (!acc[key]) acc[key] = new Set();
      acc[key].add(row.registrationId.toString());
      return acc;
    }, {});

    const daysWithStats = eventDays.map((day) => {
      const daySessions = sessionsByDay[day._id.toString()] || [];
      const registrationSet = new Set();
      daySessions.forEach((session) => {
        const sessionSet = attendanceBySession[session._id.toString()];
        if (sessionSet) {
          sessionSet.forEach((regId) => registrationSet.add(regId));
        }
      });

      return {
        id: day._id.toString(),
        eventId: day.eventId.toString(),
        dayDate: day.dayDate,
        title: day.title,
        totalAttendance: registrationSet.size,
        sessionCount: daySessions.length,
      };
    });

    res.status(200).json({ success: true, days: daysWithStats });
  } catch (error) {
    console.error('Error fetching event days:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:eventId/days/:dayId/sessions', authenticateAdminToken, async (req, res) => {
  try {
    const { eventId, dayId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const eventDay = await EventDay.findOne({ _id: dayId, eventId });
    if (!eventDay) {
      return res.status(404).json({ success: false, error: 'Event day not found' });
    }

    const sessions = await Session.find({ eventDayId: dayId }).sort({ createdAt: 1 }).lean();
    const sessionIds = sessions.map((session) => session._id);

    const attendanceCounts = await Attendance.aggregate([
      { $match: { sessionId: { $in: sessionIds }, status: 'present' } },
      { $group: { _id: '$sessionId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(attendanceCounts.map((row) => [row._id.toString(), row.count]));

    const sessionsWithStats = sessions.map((session) => ({
      id: session._id.toString(),
      eventDayId: session.eventDayId.toString(),
      title: session.title,
      attendanceCount: countMap.get(session._id.toString()) || 0,
      createdAt: session.createdAt,
    }));

    res.status(200).json({
      success: true,
      day: {
        id: eventDay._id.toString(),
        dayDate: eventDay.dayDate,
        title: eventDay.title,
      },
      sessions: sessionsWithStats,
    });
  } catch (error) {
    console.error('Error fetching day sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get(
  '/:eventId/days/:dayId/sessions/:sessionId/attendees',
  authenticateAdminToken,
  async (req, res) => {
    try {
      const { eventId, dayId, sessionId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      const eventDay = await EventDay.findOne({ _id: dayId, eventId });
      if (!eventDay) {
        return res.status(404).json({ success: false, error: 'Event day not found' });
      }

      const session = await Session.findOne({ _id: sessionId, eventDayId: dayId });
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const attendances = await Attendance.find({
        sessionId,
        status: 'present',
      })
        .populate({
          path: 'registrationId',
          populate: { path: 'userId', select: 'name personalEmail' },
        })
        .sort({ markedAt: -1 })
        .lean();

      const attendees = attendances
        .map((attendance) =>
          attendance.registrationId?.userId
            ? {
                id: attendance.registrationId.userId._id.toString(),
                name: attendance.registrationId.userId.name,
                email: attendance.registrationId.userId.personalEmail,
                markedAt: attendance.markedAt,
                registrationId: attendance.registrationId._id.toString(),
              }
            : null
        )
        .filter(Boolean);

      res.status(200).json({
        success: true,
        session: {
          id: session._id.toString(),
          title: session.title,
        },
        attendees,
        totalCount: attendees.length,
      });
    } catch (error) {
      console.error('Error fetching session attendees:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get(
  '/:eventId/certificate/eligibility/:userId',
  authenticateAdminToken,
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      if (!event.certificateEnabled) {
        return res.status(400).json({
          success: false,
          error: 'Certificate is not enabled for this event',
        });
      }

      const registration = await Registration.findOne({ eventId, userId });
      if (!registration) {
        return res.status(404).json({
          success: false,
          error: 'User is not registered for this event',
        });
      }

      const requirements = await EventCertificateRequirement.find({ eventId })
        .populate({ path: 'sessionId', select: 'title' })
        .lean();

      if (!requirements.length) {
        return res.status(200).json({
          success: true,
          eligible: true,
          message: 'No certificate requirements set. User is eligible.',
          requiredSessions: [],
          attendedSessions: [],
        });
      }

      const requiredSessionIds = requirements.map((reqItem) => reqItem.sessionId?._id || reqItem.sessionId);

      const attendances = await Attendance.find({
        registrationId: registration._id,
        sessionId: { $in: requiredSessionIds },
        status: 'present',
      })
        .populate({ path: 'sessionId', select: 'title' })
        .lean();

      const attendedSessionIds = new Set(attendances.map((attendance) => attendance.sessionId?._id?.toString() || attendance.sessionId.toString()));
      const missingSessions = requirements
        .filter((reqItem) => !attendedSessionIds.has(reqItem.sessionId._id.toString()))
        .map((reqItem) => ({
          id: reqItem.sessionId._id.toString(),
          title: reqItem.sessionId.title,
        }));

      const eligible = missingSessions.length === 0;

      res.status(200).json({
        success: true,
        eligible,
        message: eligible
          ? 'User is eligible for certificate. All required sessions attended.'
          : `User is not eligible. Missing ${missingSessions.length} required session(s).`,
        requiredSessions: requirements.map((reqItem) => ({
          id: reqItem.sessionId._id.toString(),
          title: reqItem.sessionId.title,
        })),
        attendedSessions: attendances.map((attendance) => ({
          id: attendance.sessionId._id.toString(),
          title: attendance.sessionId.title,
          markedAt: attendance.markedAt,
        })),
        missingSessions,
      });
    } catch (error) {
      console.error('Error checking certificate eligibility:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/:eventId/certificate/eligible-users', authenticateAdminToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    if (!event.certificateEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Certificate is not enabled for this event',
      });
    }

    const requirements = await EventCertificateRequirement.find({ eventId })
      .populate({ path: 'sessionId', select: 'title' })
      .lean();

    if (!requirements.length) {
      const registrations = await Registration.find({ eventId }).populate({
        path: 'userId',
        select: 'name personalEmail',
      });
      const users = registrations
        .map((reg) => reg.userId && ({ id: reg.userId._id.toString(), name: reg.userId.name, email: reg.userId.personalEmail }))
        .filter(Boolean);

      return res.status(200).json({
        success: true,
        eligibleUsers: users,
        requiredSessions: [],
        totalEligible: users.length,
      });
    }

    const requiredSessionIds = requirements.map((reqItem) => reqItem.sessionId._id);

    const registrations = await Registration.find({ eventId }).populate({
      path: 'userId',
      select: 'name personalEmail',
    });
    const registrationIdToUser = new Map(
      registrations
        .filter((reg) => reg.userId)
        .map((reg) => [reg._id.toString(), reg.userId])
    );

    const attendanceRows = await Attendance.find({
      sessionId: { $in: requiredSessionIds },
      status: 'present',
    })
      .select('registrationId sessionId')
      .lean();

    const regIdToSessions = attendanceRows.reduce((acc, row) => {
      const key = row.registrationId.toString();
      if (!acc[key]) acc[key] = new Set();
      acc[key].add(row.sessionId.toString());
      return acc;
    }, {});

    const eligibleUsers = [];
    for (const registration of registrations) {
      const attendedSet = regIdToSessions[registration._id.toString()] || new Set();
      if (attendedSet.size >= requiredSessionIds.length && registration.userId) {
        eligibleUsers.push({
          id: registration.userId._id.toString(),
          name: registration.userId.name,
          email: registration.userId.personalEmail,
        });
      }
    }

    res.status(200).json({
      success: true,
      eligibleUsers,
      requiredSessions: requirements.map((reqItem) => ({
        id: reqItem.sessionId._id.toString(),
        title: reqItem.sessionId.title,
      })),
      totalEligible: eligibleUsers.length,
    });
  } catch (error) {
    console.error('Error listing eligible users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate('organizerId', 'name personalEmail')
      .lean();

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const registrations = await Registration.find({ eventId: event._id }).lean();

    const response = buildEventResponse(
      event,
      registrations.length,
      event.organizerId
        ? {
            _id: event.organizerId._id,
            name: event.organizerId.name,
            personalEmail: event.organizerId.personalEmail,
          }
        : null
    );

    response.registrations = registrations.map((registration) => ({
      id: registration._id.toString(),
      userId: registration.userId.toString(),
      verificationCode: registration.verificationCode,
      status: registration.status,
      checkedIn: registration.checkedIn,
      createdAt: registration.createdAt,
    }));

    res.status(200).json({ success: true, event: response });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const syncEventStructure = async (eventId, days = [], certificateEnabled, certificateSessionRefs = []) => {
  const existingDayIds = await EventDay.find({ eventId }).distinct('_id');
  if (existingDayIds.length) {
    const existingSessionIds = await Session.find({
      eventDayId: { $in: existingDayIds },
    }).distinct('_id');

    await Promise.all([
      Attendance.deleteMany({ sessionId: { $in: existingSessionIds } }),
      Session.deleteMany({ eventDayId: { $in: existingDayIds } }),
      EventDay.deleteMany({ _id: { $in: existingDayIds } }),
    ]);
  } else {
    await EventDay.deleteMany({ eventId });
  }

  await EventCertificateRequirement.deleteMany({ eventId });

  const createdSessions = [];

  if (Array.isArray(days) && days.length) {
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const dayData = days[dayIndex];
      const eventDay = await EventDay.create({
        eventId,
        dayDate: dayData.dayDate,
        title: dayData.title || '',
      });

      if (Array.isArray(dayData.sessions)) {
        for (let sessionIndex = 0; sessionIndex < dayData.sessions.length; sessionIndex += 1) {
          const sessionData = dayData.sessions[sessionIndex];
          const session = await Session.create({
            eventDayId: eventDay._id,
            title: sessionData.title,
          });
          createdSessions.push({ dayIndex, sessionIndex, sessionId: session._id });
        }
      }
    }
  }

  if (certificateEnabled && Array.isArray(certificateSessionRefs) && certificateSessionRefs.length) {
    for (const ref of certificateSessionRefs) {
      const sessionInfo = createdSessions.find(
        (entry) => entry.dayIndex === ref.dayIndex && entry.sessionIndex === ref.sessionIndex
      );
      if (sessionInfo) {
        await EventCertificateRequirement.create({
          eventId,
          sessionId: sessionInfo.sessionId,
        });
      }
    }
  }
};

router.put('/:id', authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      location,
      dateTime,
      startDate,
      endDate,
      organizerId,
      creatorEmail,
      days,
      certificateEnabled,
      certificateSessionIds,
    } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Validate and convert organizerId to ObjectId if provided
    if (organizerId !== undefined) {
      if (mongoose.Types.ObjectId.isValid(organizerId)) {
        // Verify the organizer user exists
        const organizer = await User.findById(organizerId);
        if (!organizer) {
          return res.status(404).json({
            success: false,
            error: 'Organizer user not found',
          });
        }
        event.organizerId = organizerId;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid organizerId. Must be a valid MongoDB ObjectId',
        });
      }
    }

    event.name = name;
    event.description = description;
    event.status = status;
    event.location = location;
    event.dateTime = dateTime;
    event.startDate = startDate || null;
    event.endDate = endDate || null;
    event.creatorEmail = creatorEmail;
    event.certificateEnabled = certificateEnabled !== undefined ? certificateEnabled : event.certificateEnabled;

    await event.save();

    if (Array.isArray(days)) {
      await syncEventStructure(event._id, days, certificateEnabled, certificateSessionIds);
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: event.toJSON(),
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to complete this event',
      });
    }

    event.status = 'completed';
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event marked as complete successfully',
    });
  } catch (error) {
    console.error('Error marking event as complete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const dayIds = await EventDay.find({ eventId: event._id }).distinct('_id');
    const sessionIds = dayIds.length
      ? await Session.find({ eventDayId: { $in: dayIds } }).distinct('_id')
      : [];

    await Promise.all([
      Registration.deleteMany({ eventId: event._id }),
      EventCertificateRequirement.deleteMany({ eventId: event._id }),
      Attendance.deleteMany({ sessionId: { $in: sessionIds } }),
      Session.deleteMany({ eventDayId: { $in: dayIds } }),
      EventDay.deleteMany({ eventId: event._id }),
    ]);
    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/create', authenticateAdminToken, async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      location,
      dateTime,
      startDate,
      endDate,
      organizerId,
      creatorEmail,
      days,
      certificateEnabled,
      certificateSessionIds,
    } = req.body;

    // Validate and convert organizerId to ObjectId
    let validOrganizerId;
    if (organizerId) {
      // Check if it's a valid ObjectId string
      if (mongoose.Types.ObjectId.isValid(organizerId)) {
        validOrganizerId = organizerId;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid organizerId. Must be a valid MongoDB ObjectId',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'organizerId is required',
      });
    }

    // Verify the organizer user exists
    const organizer = await User.findById(validOrganizerId);
    if (!organizer) {
      return res.status(404).json({
        success: false,
        error: 'Organizer user not found',
      });
    }

    const event = await Event.create({
      name,
      description,
      status,
      location,
      dateTime,
      startDate: startDate || null,
      endDate: endDate || null,
      organizerId: validOrganizerId,
      creatorEmail,
      certificateEnabled: certificateEnabled || false,
    });

    await syncEventStructure(event._id, days, certificateEnabled, certificateSessionIds);

    res.status(201).json({ success: true, eventId: event._id.toString() });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:eventId/sessions', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.organizerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view sessions for this event',
      });
    }

    const eventDays = await EventDay.find({ eventId }).sort({ dayDate: 1 }).lean();
    const dayIds = eventDays.map((day) => day._id);
    const sessions = await Session.find({ eventDayId: { $in: dayIds } })
      .sort({ createdAt: 1 })
      .lean();
    const sessionsByDay = sessions.reduce((acc, session) => {
      const key = session.eventDayId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id: session._id.toString(),
        title: session.title,
        createdAt: session.createdAt,
      });
      return acc;
    }, {});

    const daysWithSessions = eventDays.map((day) => ({
      id: day._id.toString(),
      eventId: day.eventId.toString(),
      dayDate: day.dayDate,
      title: day.title,
      sessions: sessionsByDay[day._id.toString()] || [],
    }));

    res.status(200).json({ success: true, days: daysWithSessions });
  } catch (error) {
    console.error('Error fetching event sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

