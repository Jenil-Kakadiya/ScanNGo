const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const { User, Registration, Event } = require('../models');
const { authenticateToken, authenticateAdminToken } = require('../middleware/auth');

const router = express.Router();

router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.personalEmail,
      name: user.name,
      mobileNo: user.mobileNo,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userPromise = User.findById(req.user.id).lean();
    const registrationsPromise = Registration.countDocuments({ userId: req.user.id });
    const attendedPromise = Registration.countDocuments({ userId: req.user.id, checkedIn: true });
    const activeEventsPromise = Event.countDocuments({ status: 'active' });

    const [user, totalRegistrations, attendedEvents, totalActiveEvents] = await Promise.all([
      userPromise,
      registrationsPromise,
      attendedPromise,
      activeEventsPromise,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.personalEmail,
      name: user.name,
      mobileNo: user.mobileNo,
      role: user.role,
      stats: {
        totalEvents: totalActiveEvents,
        activeEvents: totalActiveEvents,
        totalRegistrations,
        attendedEvents,
        totalUsers: 0,
        activeUsers: 0,
      },
    });
  } catch (error) {
    console.error('User dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, mobileNo, password, role = 'user' } = req.body;

    if (!name || !email || !mobileNo || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobileNo.trim();

    const [existingUser, existingUserByMobile] = await Promise.all([
      User.findOne({ personalEmail: normalizedEmail }),
      User.findOne({ mobileNo: normalizedMobile }),
    ]);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    if (existingUserByMobile) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number already exists',
      });
    }

    const user = await User.create({
      name: name.trim(),
      personalEmail: normalizedEmail,
      mobileNo: normalizedMobile,
      universityEmail: '',
      password,
      batch: '2022-2026',
      role,
      isActive: true,
    });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.personalEmail, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await User.findOne({
      personalEmail: trimmedEmail,
      isActive: true,
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found',
      });
    }

    const isPasswordCorrect = await bcrypt.compare(trimmedPassword, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.personalEmail, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/get-email', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.status(202).json({
    success: true,
    email: user.personalEmail,
  });
});

async function findOrCreateUser(email, name) {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ personalEmail: normalizedEmail });

  if (user) {
    return user;
  }

  user = await User.create({
    name: name || 'Google User',
    personalEmail: normalizedEmail,
    role: 'user',
    password: `google_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mobileNo: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    isActive: true,
  });

  return user;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.GOOGLE_REDIRECT_URL}`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const user = await findOrCreateUser(email, name);
        done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign(
        { userId: user._id.toString(), email: user.personalEmail, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const userData = encodeURIComponent(
        JSON.stringify({
          id: user._id.toString(),
          name: user.name,
          email: user.personalEmail,
          role: user.role,
        })
      );

      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/dashboard/?token=${token}&user=${userData}`);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}?error=Authentication failed`);
    }
  }
);

router.get('/', authenticateAdminToken, async (req, res) => {
  try {
    const users = await User.find().lean();
    const registrations = await Registration.find({
      userId: { $in: users.map((u) => u._id) },
    })
      .populate('eventId', 'name status dateTime location')
      .lean();

    const registrationsByUser = registrations.reduce((acc, reg) => {
      const key = reg.userId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(reg);
      return acc;
    }, {});

    const result = users.map((user) => {
      const regs = registrationsByUser[user._id.toString()] || [];
      const attendedCount = regs.filter((r) => r.checkedIn).length;
      const activeRegistrationsCount = regs.filter((r) => r.status === 'confirmed').length;

      return {
        id: user._id.toString(),
        name: user.name,
        personalEmail: user.personalEmail,
        mobileNo: user.mobileNo,
        department: user.department,
        batch: user.batch,
        role: user.role,
        isActive: user.isActive,
        registrationsCount: regs.length,
        attendedCount,
        activeRegistrationsCount,
        registrations: regs.map((r) => ({
          id: r._id.toString(),
          status: r.status,
          checkedIn: r.checkedIn,
          createdAt: r.createdAt,
          event: r.eventId
            ? {
                id: r.eventId._id.toString(),
                name: r.eventId.name,
                status: r.eventId.status,
                dateTime: r.eventId.dateTime,
                location: r.eventId.location,
              }
            : null,
        })),
      };
    });

    res.status(200).json({ success: true, users: result });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/disable', authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.isActive = false;
    await user.save();

    res.status(200).json({ success: true, message: 'User disabled successfully' });
  } catch (error) {
    console.error('Error disabling user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

