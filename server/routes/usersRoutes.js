const express = require('express');
const { User, Registration, Event } = require('../models');
const { authenticateToken, authenticateAdminToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const router = express.Router();


router.get('/user', authenticateToken,  async (req, res) => {
  try {
    // console.log("----")
    const user = await User.findByPk(req.user.id, {
      row: true
    });
    res.json({
        email : user.personalEmail,
        name: user.name,
        mobileNo: user.mobileNo,
        role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user dashboard data with stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    // Get user's registration count
    const userRegistrations = await Registration.count({ 
      where: { userId: req.user.id } 
    });
    
    // Get user's attended events count
    const attendedEvents = await Registration.count({ 
      where: { 
        userId: req.user.id,
        checkedIn: true 
      } 
    });

    // Get total active events (for reference)
    const totalActiveEvents = await Event.count({ 
      where: { status: 'active' } 
    });

    res.json({
      email: user.personalEmail,
      name: user.name,
      mobileNo: user.mobileNo,
      role: user.role,
      stats: {
        totalEvents: totalActiveEvents,
        activeEvents: totalActiveEvents,
        totalRegistrations: userRegistrations,
        attendedEvents: attendedEvents,
        totalUsers: 0, // Not relevant for regular users
        activeUsers: 0 // Not relevant for regular users
      }
    });
  } catch (error) {
    console.error('User dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    console.log(req.body)
    const { name, email, mobileNo, password, role = 'user'} = req.body;

    if (!name || !email || !mobileNo || !password ) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }
    // console.log("-------0")
    const existingUser = await User.findOne({ where: { personalEmail : email } });
    // console.log(existingUser)
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }
    // console.log("-------1")
    const existingUserByMobile = await User.findOne({ where: { mobileNo } });
    if (existingUserByMobile) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile number already exists' 
      });
    }
    console.log("-------2")
    // Password will be hashed automatically by User model's beforeCreate hook
    
    const user = await User.create({ 
      name, 
      personalEmail : email, 
      mobileNo,
      universityEmail : '',
      password: password, // Pass plain password, hook will hash it
      batch: '2022-2026',
      role,
      isActive: 1 
    });
    // console.log("-------3")
    const token = jwt.sign(
      { userId: user.id, email: user.personalEmail, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      user: user.toJSON(), 
      token 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Trim whitespace and validate
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ 
      where: { 
        personalEmail: trimmedEmail.toLowerCase(), 
        isActive: 1 
      } 
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Check if password field exists
    if (!user.password) {
      return res.status(500).json({ 
        success: false,
        error: 'Password field not found in user record' 
      });
    }
    
    // Compare passwords using the model method or bcrypt directly
    const isPasswordCorrect = await bcrypt.compare(trimmedPassword, user.password);
    
    if (!isPasswordCorrect) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.personalEmail, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    res.status(200).json({ 
      success: true,
      message: 'Login successful',
      user: user.toJSON(), 
      token 
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});


router.get('/get-email', authenticateToken, async (req, res) => {

  let userId = req.user.id
  const user = await User.findByPk(userId);

  res.status(202).json({
    success:true,
    email: user.personalEmail
  });
});

// router.post('/change-email',authMiddleware, async (req, res) => {

//   let userId = req.user.id
//   const user = await User.findByPk(userId);

//   await user.update({email:req.body.email})
  
//   res.status(202).json({
//     success:true
//   });
// });

// Function to find or create user for Google OAuth
async function findOrCreateUser(email, name) {
  try {
    // First, try to find existing user by email
    let user = await User.findOne({ where: { personalEmail: email } });
    
    if (user) {
      // User exists, update last login time
      // await user.update({ lastlogin: new Date() });
      return user;
    }
    
    // User doesn't exist, create new user
    // For Google OAuth users, we need to provide a password and mobileNo due to allowNull: false
    // but they won't be used since authType is 'google'
    user = await User.create({
      name: name,
      personalEmail: email,
      role: 'user',
      password: 'google_oauth_user', // Placeholder password, won't be used
      mobileNo: '9999999999',
      isActive: 1 // Placeholder mobile number, won't be used
    });

    return user;
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
}



// Passport Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.GOOGLE_REDIRECT_URL}`
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;

      // Lookup or create user in database
      const user = await findOrCreateUser(email, name);
      done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign(
        { userId: user.id, email: user.personalEmail, role: user.role }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // 🔁 Redirect back to frontend with token and user data
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.personalEmail,
        role: user.role
      }));
      
      // Use hardcoded frontend URL for now (you can set this as env variable later)
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/dashboard/?token=${token}&user=${userData}`);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}?error=Authentication failed`);
    }
  }
);

// router.get('/me', authenticateToken, async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id);
//     res.json({ user: user.toJSON() });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Get user by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const user = await User.findByPk(req.params.id);
//     if (!user) return res.status(404).json({ error: 'User not found' });
//     res.json({ user: user.toJSON() });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Update user
// router.put('/:id', async (req, res) => {
//   try {
//     const user = await User.findByPk(req.params.id);
//     if (!user) return res.status(404).json({ error: 'User not found' });
    
//     await user.update(req.body);
//     res.json({ message: 'User updated', user: user.toJSON() });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Delete user (soft delete)
// router.delete('/:id', async (req, res) => {
//   try {
//     const user = await User.findByPk(req.params.id);
//     res.status(500).json({ error: error.message });
//   }
// });

// Admin: Get all users with registration stats and details
router.get('/', authenticateAdminToken, async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Registration,
          as: 'Registrations',
          attributes: ['id', 'eventId', 'status', 'checkedIn', 'createdAt'],
          include: [
            {
              model: Event,
              as: 'Event',
              attributes: ['id', 'name', 'status', 'dateTime', 'location']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const result = users.map((u) => {
      const regs = Array.isArray(u.Registrations) ? u.Registrations : [];
      const registrationsCount = regs.length;
      const attendedCount = regs.filter(r => r.checkedIn === true).length;
      const activeRegistrationsCount = regs.filter(r => r.status === 'confirmed').length;
      return {
        id: u.id,
        name: u.name,
        personalEmail: u.personalEmail,
        mobileNo: u.mobileNo,
        department: u.department,
        batch: u.batch,
        role: u.role,
        isActive: u.isActive,
        registrationsCount,
        attendedCount,
        activeRegistrationsCount,
        registrations: regs.map(r => ({
          id: r.id,
          status: r.status,
          checkedIn: r.checkedIn,
          createdAt: r.createdAt,
          event: r.Event ? {
            id: r.Event.id,
            name: r.Event.name,
            status: r.Event.status,
            dateTime: r.Event.dateTime,
            location: r.Event.location
          } : null
        }))
      };
    });

    res.status(200).json({ success: true, users: result });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Disable a user
router.put('/:id/disable', authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    await user.update({ isActive: 0 });
    res.status(200).json({ success: true, message: 'User disabled successfully' });
  } catch (error) {
    console.error('Error disabling user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
