const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');

const router = express.Router();

const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('mobileNo').matches(/^[0-9+\-\s()]+$/).withMessage('Must be a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be either user or admin'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, mobileNo, password, role = 'user' } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobileNo.trim();

    const [existingEmail, existingMobile] = await Promise.all([
      User.findOne({ personalEmail: normalizedEmail }),
      User.findOne({ mobileNo: normalizedMobile }),
    ]);

    if (existingEmail || existingMobile) {
      return res.status(400).json({
        success: false,
        message: existingEmail ? 'Email already registered' : 'Mobile number already registered',
      });
    }

    const user = await User.create({
      name,
      personalEmail: normalizedEmail,
      mobileNo: normalizedMobile,
      password,
      role,
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
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ personalEmail: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.personalEmail, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

router.get('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Profile endpoint - implement JWT middleware for authentication',
  });
});

module.exports = router;

