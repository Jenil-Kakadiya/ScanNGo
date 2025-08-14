const express = require('express');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const router = express.Router();

// Get all users
// router.get('/', async (req, res) => {
//   try {
//     const users = await User.findAll();
//     res.json({ users });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.post('/register', async (req, res) => {
  try {
    const { name, email, mobileNo, password, role = 'user' } = req.body;

    if (!name || !email || !mobileNo || !password ) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }
    
    const existingUserByMobile = await User.findOne({ where: { mobileNo } });
    if (existingUserByMobile) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile number already exists' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ 
      name, 
      email, 
      mobileNo, 
      password: hashedPassword,
      role 
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role }, 
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

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role }, 
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
    email: user.email
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
    let user = await User.findOne({ where: { email } });
    
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
      email: email,
      role: 'user',
      password: 'google_oauth_user', // Placeholder password, won't be used
      mobileNo: 9999999999, // Placeholder mobile number, won't be used
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
        { userId: user.id, email: user.email, role: user.role }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // 🔁 Redirect back to frontend with token and user data
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }));
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}&user=${userData}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=Authentication failed`);
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

module.exports = router;
