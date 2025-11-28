const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Admin, User, Event, Registration } = require('../models');
const { authenticateToken, authenticateAdminToken } = require('../middleware/auth');

const router = express.Router();

router.get('/adminData', authenticateAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).lean();

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const [totalUsers, totalEvents, activeEvents, totalRegistrations] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Event.countDocuments({ status: 'active' }),
      Registration.countDocuments(),
    ]);

    res.json({
      email: admin.email,
      name: admin.name,
      mobileNo: admin.mobileNo,
      role: admin.role,
      stats: {
        totalUsers,
        activeUsers: totalUsers,
        totalEvents,
        activeEvents,
        totalRegistrations,
      },
    });
  } catch (error) {
    console.error('Admin data error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    // console.log(admin);
    if (!admin) {
      return res.status(400).json({
        success: false,
        error: 'User not found',
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, admin.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
      });
    }

    const token = jwt.sign(
      { userId: admin._id.toString(), email: admin.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      user: admin.toJSON(),
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

router.get('/allUsers', authenticateAdminToken, async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json({
      success: true,
      users: users.map((user) => ({
        id: user._id.toString(),
        email: user.personalEmail,
        name: user.name,
        mobileNo: user.mobileNo,
        role: user.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

