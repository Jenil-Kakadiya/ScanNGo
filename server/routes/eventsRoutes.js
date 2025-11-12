const express = require('express');
// Import Event model (capitalized) per models/event.js
const { Event, User, Registration, EventDay, Session, Attendance, EventCertificateRequirement } = require('../models');
const { authenticateAdminToken, authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

const generateRandomString = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, chars.length);
        result += chars[randomIndex];
    }
    return result;
};

const generateVerificationCode = async () => {
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
        const code = generateRandomString(20);
        const existing = await Registration.findOne({ where: { verificationCode: code } });
        if (!existing) {
            return code;
        }
        attempts++;
    }
    throw new Error('Unable to generate unique verification code');
};

const generateTemporaryPassword = () => generateRandomString(12);

// GET all events (public endpoint for users)
router.get('/public', async (req, res) => {
    try {
        const events = await Event.findAll({
            where: { status: 'active' },
            // include: [
            //     {
            //         model: User,
            //         as: 'User',
            //         attributes: ['id', 'name', 'email']
            //     }
            // ],
            order: [['dateTime', 'ASC']]
        });


        // Transform events to include attendee count
        const eventsWithAttendees = events.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            status: event.status,
            location: event.location,
            dateTime: event.dateTime,
            organizerId: event.organizerId,
            creatorEmail: event.creatorEmail,
            attendees: event.Registrations ? event.Registrations.length : 0,
            organizer: event.User ? {
                id: event.User.id,
                name: event.User.name,
                email: event.User.personalEmail
            } : null,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }));

        res.status(200).json({
            success: true,
            events: eventsWithAttendees
        });
    } catch (error) {
        console.error('Error fetching public events:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET user's registered events
router.get('/user-events', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // First, get user's registrations
        const registrations = await Registration.findAll({
            where: { userId: userId },
            order: [['createdAt', 'DESC']],
            raw: true
        });

        console.log('Registrations:', registrations);

        // Extract eventIds from registrations
        const eventIds = registrations.map(reg => reg.eventId);
        
        if (eventIds.length === 0) {
            return res.status(200).json({
                success: true,
                events: []
            });
        }

        // Fetch events for those eventIds
        const events = await Event.findAll({
            where: { id: eventIds },
            include: [
                {
                    model: User,
                    as: 'User',
                    attributes: ['id', 'name', 'personalEmail']
                }
            ]
        });

        console.log('Events:', events);

        // Combine registration data with event data
        const userEvents = registrations.map(reg => {
            const event = events.find(e => e.id === reg.eventId);
            if (!event) return null;

            return {
                id: event.id,
                name: event.name,
                description: event.description,
                status: event.status,
                location: event.location,
                dateTime: event.dateTime,
                organizerId: event.organizerId,
                creatorEmail: event.creatorEmail,
                registrationStatus: reg.status,
                checkedIn: reg.checkedIn,
                registrationDate: reg.createdAt,
                verificationCode: reg.verificationCode,
                organizer: event.User ? {
                    id: event.User.id,
                    name: event.User.name,
                    email: event.User.personalEmail
                } : null
            };
        }).filter(event => event !== null);

        res.status(200).json({
            success: true,
            events: userEvents
        });
    } catch (error) {
        console.error('Error fetching user events:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET events organized by the current user
router.get('/organized', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fetch events organized by this user
        const events = await Event.findAll({
            where: { organizerId: userId },
            order: [['dateTime', 'DESC']]
        });

        // Transform events to include attendee count
        const eventsWithAttendees = events.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            status: event.status,
            location: event.location,
            dateTime: event.dateTime,
            organizerId: event.organizerId,
            creatorEmail: event.creatorEmail,
        }));

        console.log("eventsWithAttendees in organized events page", eventsWithAttendees)
        res.status(200).json({
            success: true,
            events: eventsWithAttendees
        });
    } catch (error) {
        console.error('Error fetching organized events:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /:eventId/delegates - Allow organizer to register a delegate for their event
router.post('/:eventId/delegates', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user.id;
        const { name, email, mobileNo } = req.body;

        if (!name || !email || !mobileNo) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and mobile number are required'
            });
        }

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        if (event.organizerId !== organizerId) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to add delegates for this event'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedMobile = mobileNo.trim();

        const existingByEmail = await User.findOne({
            where: { personalEmail: normalizedEmail }
        });

        if (existingByEmail) {
            return res.status(400).json({
                success: false,
                error: 'A user with this email already exists'
            });
        }

        const existingByMobile = await User.findOne({
            where: { mobileNo: normalizedMobile }
        });

        if (existingByMobile) {
            return res.status(400).json({
                success: false,
                error: 'A user with this mobile number already exists'
            });
        }

        const temporaryPassword = generateTemporaryPassword();

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
            isActive: 1
        });

        const verificationCode = await generateVerificationCode();

        const registration = await Registration.create({
            eventId: event.id,
            userId: delegate.id,
            status: 'confirmed',
            verificationCode,
            checkedIn: false
        });

        res.status(201).json({
            success: true,
            message: 'Delegate registered successfully',
            delegate: {
                id: delegate.id,
                name: delegate.name,
                email: delegate.personalEmail,
                mobileNo: delegate.mobileNo
            },
            registration: {
                id: registration.id,
                verificationCode: registration.verificationCode,
                status: registration.status,
                checkedIn: registration.checkedIn
            },
            temporaryPassword
        });
    } catch (error) {
        console.error('Error creating delegate:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to register delegate'
        });
    }
});

// GET all events with attendee count (admin only)
router.get('/', authenticateAdminToken, async (req, res) => {
    try {
        const events = await Event.findAll({
            include: [
                {
                    model: User,
                    as: 'User',
                },
                {
                    model: Registration,
                    as: 'Registrations',
                    attributes: ['id']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Transform events to include attendee count
        const eventsWithAttendees = events.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            status: event.status,
            location: event.location,
            dateTime: event.dateTime,
            organizerId: event.organizerId,
            creatorEmail: event.creatorEmail,
            attendees: event.Registrations ? event.Registrations.length : 0,
            organizer: event.User ? {
                id: event.User.id,
                name: event.User.name,
                email: event.User.personalEmail
            } : null,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }));

        res.status(200).json({
            success: true,
            events: eventsWithAttendees
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /:eventId/delegates - Fetch delegates for an event (admin only)
router.get('/:eventId/delegates', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const delegateRegistrations = await Registration.findAll({
            where: { eventId },
            include: [
                {
                    model: User,
                    as: 'User',
                    attributes: ['id', 'name', 'personalEmail', 'mobileNo', 'role'],
                    where: { role: 'delegate' },
                    required: true
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const delegates = delegateRegistrations.map((registration) => ({
            id: registration.User.id,
            name: registration.User.name,
            email: registration.User.personalEmail,
            mobileNo: registration.User.mobileNo,
            registrationId: registration.id,
            verificationCode: registration.verificationCode,
            status: registration.status,
            checkedIn: registration.checkedIn,
            createdAt: registration.createdAt
        }));

        res.status(200).json({
            success: true,
            delegates,
            totalDelegates: delegates.length
        });
    } catch (error) {
        console.error('Error fetching delegates:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch delegates'
        });
    }
});

// GET /:eventId/attendance/export - Detailed attendance structure for export (admin only)
router.get('/:eventId/attendance/export', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const days = await EventDay.findAll({
            where: { eventId },
            include: [
                {
                    model: Session,
                    as: 'Sessions',
                    include: [
                        {
                            model: Attendance,
                            as: 'Attendances',
                            where: { status: 'present' },
                            required: false,
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
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [
                ['dayDate', 'ASC'],
                [{ model: Session, as: 'Sessions' }, 'createdAt', 'ASC']
            ]
        });

        const responseData = {
            success: true,
            event: {
                id: event.id,
                name: event.name,
                dateTime: event.dateTime,
                location: event.location
            },
            days: days.map((day) => ({
                id: day.id,
                title: day.title,
                dayDate: day.dayDate,
                sessions: (day.Sessions || []).map((session) => ({
                    id: session.id,
                    title: session.title,
                    createdAt: session.createdAt,
                    attendees: (session.Attendances || []).map((attendance) => ({
                        registrationId: attendance.registrationId,
                        markedAt: attendance.markedAt,
                        user: attendance.Registration && attendance.Registration.User ? {
                            id: attendance.Registration.User.id,
                            name: attendance.Registration.User.name,
                            email: attendance.Registration.User.personalEmail
                        } : null
                    }))
                }))
            }))
        };

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error exporting attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch attendance export data'
        });
    }
});

// GET /events/:eventId/days - Get all days for an event with attendance statistics (admin only)
// NOTE: This route must come before /:id to avoid route conflicts
router.get('/:eventId/days', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        // Verify event exists
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Get all event days with their sessions
        const eventDays = await EventDay.findAll({
            where: { eventId: eventId },
            include: [
                {
                    model: Session,
                    as: 'Sessions',
                    include: [
                        {
                            model: Attendance,
                            as: 'Attendances',
                            where: { status: 'present' },
                            required: false,
                            include: [
                                {
                                    model: Registration,
                                    as: 'Registration',
                                    attributes: ['id']
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['dayDate', 'ASC']]
        });

        // Calculate attendance statistics for each day
        const daysWithStats = await Promise.all(eventDays.map(async (day) => {
            // Get all sessions for this day
            const sessions = await Session.findAll({
                where: { eventDayId: day.id }
            });

            if (sessions.length === 0) {
                return {
                    id: day.id,
                    eventId: day.eventId,
                    dayDate: day.dayDate,
                    title: day.title,
                    totalAttendance: 0,
                    sessionCount: 0
                };
            }

            // Calculate total attendance for this day (count distinct registrations across all sessions)
            const sessionIds = sessions.map(s => s.id);
            
            const dayAttendances = await Attendance.findAll({
                where: {
                    sessionId: sessionIds,
                    status: 'present'
                },
                attributes: ['registrationId'],
                raw: true
            });

            // Get unique registration IDs
            const uniqueRegistrationIds = new Set(dayAttendances.map(a => a.registrationId));
            const totalAttendance = uniqueRegistrationIds.size;

            return {
                id: day.id,
                eventId: day.eventId,
                dayDate: day.dayDate,
                title: day.title,
                totalAttendance: totalAttendance,
                sessionCount: sessions.length
            };
        }));

        res.status(200).json({
            success: true,
            days: daysWithStats
        });
    } catch (error) {
        console.error('Error fetching event days:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /events/:eventId/days/:dayId/sessions - Get all sessions for a day with attendance statistics (admin only)
router.get('/:eventId/days/:dayId/sessions', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId, dayId } = req.params;

        // Verify event exists
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Verify day exists and belongs to event
        const eventDay = await EventDay.findOne({
            where: { id: dayId, eventId: eventId }
        });
        if (!eventDay) {
            return res.status(404).json({
                success: false,
                error: 'Event day not found'
            });
        }

        // Get all sessions for this day
        const sessions = await Session.findAll({
            where: { eventDayId: dayId },
            order: [['createdAt', 'ASC']]
        });

        // Calculate attendance statistics for each session
        const sessionsWithStats = await Promise.all(sessions.map(async (session) => {
            const attendanceCount = await Attendance.count({
                where: {
                    sessionId: session.id,
                    status: 'present'
                }
            });

            return {
                id: session.id,
                eventDayId: session.eventDayId,
                title: session.title,
                attendanceCount: attendanceCount,
                createdAt: session.createdAt
            };
        }));

        res.status(200).json({
            success: true,
            day: {
                id: eventDay.id,
                dayDate: eventDay.dayDate,
                title: eventDay.title
            },
            sessions: sessionsWithStats
        });
    } catch (error) {
        console.error('Error fetching day sessions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /events/:eventId/days/:dayId/sessions/:sessionId/attendees - Get list of users who attended a session (admin only)
router.get('/:eventId/days/:dayId/sessions/:sessionId/attendees', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId, dayId, sessionId } = req.params;

        // Verify event exists
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Verify day exists and belongs to event
        const eventDay = await EventDay.findOne({
            where: { id: dayId, eventId: eventId }
        });
        if (!eventDay) {
            return res.status(404).json({
                success: false,
                error: 'Event day not found'
            });
        }

        // Verify session exists and belongs to day
        const session = await Session.findOne({
            where: { id: sessionId, eventDayId: dayId }
        });
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Get all attendance records for this session
        const attendances = await Attendance.findAll({
            where: {
                sessionId: sessionId,
                status: 'present'
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
            ],
            order: [['markedAt', 'DESC']]
        });

        // Transform to get user list
        const attendees = attendances.map(attendance => ({
            id: attendance.Registration.User.id,
            name: attendance.Registration.User.name,
            email: attendance.Registration.User.personalEmail,
            markedAt: attendance.markedAt,
            registrationId: attendance.registrationId
        }));

        res.status(200).json({
            success: true,
            session: {
                id: session.id,
                title: session.title
            },
            attendees: attendees,
            totalCount: attendees.length
        });
    } catch (error) {
        console.error('Error fetching session attendees:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /events/:eventId/certificate/eligibility/:userId - Check if user is eligible for certificate (admin only)
// NOTE: This route must come before /:id to avoid route conflicts
router.get('/:eventId/certificate/eligibility/:userId', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId, userId } = req.params;

        // Verify event exists and has certificate enabled
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        if (!event.certificateEnabled) {
            return res.status(400).json({
                success: false,
                error: 'Certificate is not enabled for this event'
            });
        }

        // Get user's registration for this event
        const registration = await Registration.findOne({
            where: {
                eventId: eventId,
                userId: userId
            }
        });

        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'User is not registered for this event'
            });
        }

        // Get all certificate requirements for this event
        const certificateRequirements = await EventCertificateRequirement.findAll({
            where: { eventId: eventId },
            include: [
                {
                    model: Session,
                    as: 'Session',
                    attributes: ['id', 'title']
                }
            ]
        });

        if (certificateRequirements.length === 0) {
            return res.status(200).json({
                success: true,
                eligible: true,
                message: 'No certificate requirements set. User is eligible.',
                requiredSessions: [],
                attendedSessions: []
            });
        }

        const requiredSessionIds = certificateRequirements.map(req => req.sessionId);

        // Check attendance for all required sessions
        const attendances = await Attendance.findAll({
            where: {
                registrationId: registration.id,
                sessionId: requiredSessionIds,
                status: 'present'
            },
            include: [
                {
                    model: Session,
                    as: 'Session',
                    attributes: ['id', 'title']
                }
            ]
        });

        const attendedSessionIds = attendances.map(a => a.sessionId);
        const missingSessionIds = requiredSessionIds.filter(id => !attendedSessionIds.includes(id));

        const eligible = missingSessionIds.length === 0;

        // Get details of missing sessions
        const missingSessions = certificateRequirements
            .filter(req => missingSessionIds.includes(req.sessionId))
            .map(req => ({
                id: req.Session.id,
                title: req.Session.title
            }));

        // Get details of attended sessions
        const attendedSessions = attendances.map(a => ({
            id: a.Session.id,
            title: a.Session.title,
            markedAt: a.markedAt
        }));

        res.status(200).json({
            success: true,
            eligible: eligible,
            message: eligible 
                ? 'User is eligible for certificate. All required sessions attended.'
                : `User is not eligible. Missing ${missingSessionIds.length} required session(s).`,
            requiredSessions: certificateRequirements.map(req => ({
                id: req.Session.id,
                title: req.Session.title
            })),
            attendedSessions: attendedSessions,
            missingSessions: missingSessions
        });
    } catch (error) {
        console.error('Error checking certificate eligibility:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /events/:eventId/certificate/eligible-users - List of users eligible for certificate (admin only)
router.get('/:eventId/certificate/eligible-users', authenticateAdminToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        if (!event.certificateEnabled) {
            return res.status(400).json({
                success: false,
                error: 'Certificate is not enabled for this event'
            });
        }

        // Get requirements
        const requirements = await EventCertificateRequirement.findAll({
            where: { eventId },
            include: [{ model: Session, as: 'Session', attributes: ['id', 'title'] }]
        });

        // If no requirements, all registered users are eligible
        if (requirements.length === 0) {
            const registrations = await Registration.findAll({
                where: { eventId },
                include: [{ model: User, as: 'User', attributes: ['id', 'name', 'personalEmail'] }]
            });
            const users = registrations.map(r => ({
                id: r.User.id,
                name: r.User.name,
                email: r.User.personalEmail
            }));
            return res.status(200).json({
                success: true,
                eligibleUsers: users,
                requiredSessions: [],
                totalEligible: users.length
            });
        }

        const requiredSessionIds = requirements.map(r => r.sessionId);
        const requiredCount = requiredSessionIds.length;

        // Fetch all registrations for this event
        const registrations = await Registration.findAll({
            where: { eventId },
            include: [{ model: User, as: 'User', attributes: ['id', 'name', 'personalEmail'] }]
        });
        const registrationIdToUser = new Map(
            registrations.map(r => [r.id, r.User])
        );

        // Count attended required sessions per registration
        const attendanceRows = await Attendance.findAll({
            where: {
                sessionId: requiredSessionIds,
                status: 'present'
            },
            attributes: ['registrationId', 'sessionId'],
            raw: true
        });

        const regIdToDistinctSessions = new Map();
        for (const row of attendanceRows) {
            if (!regIdToDistinctSessions.has(row.registrationId)) {
                regIdToDistinctSessions.set(row.registrationId, new Set());
            }
            regIdToDistinctSessions.get(row.registrationId).add(row.sessionId);
        }

        const eligibleUsers = [];
        for (const r of registrations) {
            const attendedSet = regIdToDistinctSessions.get(r.id) || new Set();
            if (attendedSet.size >= requiredCount) {
                const u = registrationIdToUser.get(r.id);
                eligibleUsers.push({
                    id: u.id,
                    name: u.name,
                    email: u.personalEmail
                });
            }
        }

        res.status(200).json({
            success: true,
            eligibleUsers,
            requiredSessions: requirements.map(req => ({ id: req.Session.id, title: req.Session.title })),
            totalEligible: eligibleUsers.length
        });
    } catch (error) {
        console.error('Error listing eligible users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET single event by ID
router.get('/:id', authenticateAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const event = await Event.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'User',
                    attributes: ['id', 'name', 'personalEmail']
                },
                {
                    model: EventDay,
                    as: 'EventDays',
                    include: [
                        {
                            model: Session,
                            as: 'Sessions',
                            attributes: ['id', 'title', 'createdAt']
                        }
                    ],
                    order: [['dayDate', 'ASC']]
                }
            ]
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const eventWithAttendees = {
            id: event.id,
            name: event.name,
            description: event.description,
            status: event.status,
            location: event.location,
            dateTime: event.dateTime,
            organizerId: event.organizerId,
            creatorEmail: event.creatorEmail,
            attendees: event.Registrations ? event.Registrations.length : 0,
            organizer: event.User ? {
                id: event.User.id,
                name: event.User.name,
                email: event.User.personalEmail
            } : null,
            registrations: event.Registrations || [],
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        };

        res.status(200).json({
            success: true,
            event: eventWithAttendees
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// UPDATE event
router.put('/:id', authenticateAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, location, dateTime, startDate, endDate, organizerId, creatorEmail, days, certificateEnabled, certificateSessionIds } = req.body;

        const event = await Event.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Update event basic info
        await event.update({
            name,
            description,
            status,
            location,
            dateTime,
            startDate: startDate || null,
            endDate: endDate || null,
            organizerId,
            creatorEmail,
            certificateEnabled: certificateEnabled !== undefined ? certificateEnabled : event.certificateEnabled
        });

        const createdSessions = []; // Track created sessions with their IDs

        // Handle days and sessions update
        if (days !== undefined) {
            // Delete existing certificate requirements first (they'll be recreated if needed)
            await EventCertificateRequirement.destroy({
                where: { eventId: id }
            });

            // Get all existing event days for this event
            const existingDays = await EventDay.findAll({
                where: { eventId: id },
                include: [{ model: Session, as: 'Sessions' }]
            });

            // Delete all existing sessions first (cascade will handle this, but being explicit)
            for (const day of existingDays) {
                if (day.Sessions && day.Sessions.length > 0) {
                    await Session.destroy({
                        where: { eventDayId: day.id }
                    });
                }
            }

            // Delete all existing event days
            await EventDay.destroy({
                where: { eventId: id }
            });

            // Create new event days and sessions if provided
            if (Array.isArray(days) && days.length > 0) {
                for (const dayData of days) {
                    // Create event day
                    const eventDay = await EventDay.create({
                        eventId: id,
                        dayDate: dayData.dayDate,
                        title: dayData.title || null
                    });

                    // Create sessions for this day
                    if (dayData.sessions && Array.isArray(dayData.sessions) && dayData.sessions.length > 0) {
                        for (const sessionData of dayData.sessions) {
                            const session = await Session.create({
                                eventDayId: eventDay.id,
                                title: sessionData.title
                            });
                            // Store session with its index for certificate requirements
                            createdSessions.push({
                                sessionId: session.id,
                                dayIndex: days.indexOf(dayData),
                                sessionIndex: dayData.sessions.indexOf(sessionData)
                            });
                        }
                    }
                }
            }

            // Create certificate requirements if certificate is enabled
            if (certificateEnabled && certificateSessionIds && Array.isArray(certificateSessionIds) && certificateSessionIds.length > 0) {
                // certificateSessionIds is an array of { dayIndex, sessionIndex } objects
                for (const certReq of certificateSessionIds) {
                    // Find the corresponding session from createdSessions
                    const sessionInfo = createdSessions.find(s => 
                        s.dayIndex === certReq.dayIndex && s.sessionIndex === certReq.sessionIndex
                    );
                    if (sessionInfo) {
                        await EventCertificateRequirement.create({
                            eventId: id,
                            sessionId: sessionInfo.sessionId
                        });
                    }
                }
            }
        }

        // Fetch updated event with days and sessions
        const updatedEvent = await Event.findByPk(id, {
            include: [
                {
                    model: EventDay,
                    as: 'EventDays',
                    include: [
                        {
                            model: Session,
                            as: 'Sessions'
                        }
                    ]
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            event: updatedEvent
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Mark event as complete (accessible to organizer)
router.put('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const event = await Event.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Check if user is the organizer
        if (event.organizerId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to complete this event'
            });
        }

        await event.update({
            status: 'completed'
        });

        res.status(200).json({
            success: true,
            message: 'Event marked as complete successfully'
        });
    } catch (error) {
        console.error('Error marking event as complete:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE event
router.delete('/:id', authenticateAdminToken, async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        await event.destroy();

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/create', authenticateAdminToken, async (req, res) => {
    try {
        const { name, description, status, location, dateTime, startDate, endDate, organizerId, creatorEmail, days, certificateEnabled, certificateSessionIds } = req.body;

        // Create event
        const event = await Event.create({
            name,
            description,
            status,
            location,
            dateTime,
            startDate: startDate || null,
            endDate: endDate || null,
            organizerId,
            creatorEmail,
            certificateEnabled: certificateEnabled || false
        });

        const createdSessions = []; // Track created sessions with their IDs

        // Create event days and sessions if provided
        if (days && Array.isArray(days) && days.length > 0) {
            for (const dayData of days) {
                // Create event day
                const eventDay = await EventDay.create({
                    eventId: event.id,
                    dayDate: dayData.dayDate,
                    title: dayData.title || null
                });

                // Create sessions for this day
                if (dayData.sessions && Array.isArray(dayData.sessions) && dayData.sessions.length > 0) {
                    for (const sessionData of dayData.sessions) {
                        const session = await Session.create({
                            eventDayId: eventDay.id,
                            title: sessionData.title
                        });
                        // Store session with its index for certificate requirements
                        createdSessions.push({
                            sessionId: session.id,
                            dayIndex: days.indexOf(dayData),
                            sessionIndex: dayData.sessions.indexOf(sessionData)
                        });
                    }
                }
            }
        }

        // Create certificate requirements if certificate is enabled
        if (certificateEnabled && certificateSessionIds && Array.isArray(certificateSessionIds) && certificateSessionIds.length > 0) {
            // certificateSessionIds is an array of { dayIndex, sessionIndex } objects
            for (const certReq of certificateSessionIds) {
                // Find the corresponding session from createdSessions
                const sessionInfo = createdSessions.find(s => 
                    s.dayIndex === certReq.dayIndex && s.sessionIndex === certReq.sessionIndex
                );
                if (sessionInfo) {
                    await EventCertificateRequirement.create({
                        eventId: event.id,
                        sessionId: sessionInfo.sessionId
                    });
                }
            }
        }

        res.status(201).json({ 
            success: true,
            eventId: event.id
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }   
})

// GET /events/:eventId/sessions - Get all sessions for an event (with days)
router.get('/:eventId/sessions', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        // Find event and verify organizer
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Check if user is the organizer
        if (event.organizerId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to view sessions for this event'
            });
        }

        // Fetch event days with sessions
        const eventDays = await EventDay.findAll({
            where: { eventId: eventId },
            include: [
                {
                    model: Session,
                    as: 'Sessions',
                    attributes: ['id', 'title', 'createdAt']
                }
            ],
            order: [['dayDate', 'ASC']]
        });

        // Transform data
        const daysWithSessions = eventDays.map(day => ({
            id: day.id,
            eventId: day.eventId,
            dayDate: day.dayDate,
            title: day.title,
            sessions: day.Sessions ? day.Sessions.map(session => ({
                id: session.id,
                title: session.title,
                createdAt: session.createdAt
            })) : []
        }));

        res.status(200).json({
            success: true,
            days: daysWithSessions
        });
    } catch (error) {
        console.error('Error fetching event sessions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;