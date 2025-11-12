const express = require('express');
const { Admin, User, Event, Registration } = require('../models');
const { authenticateToken, authenticateAdminToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();


router.get('/adminData', authenticateToken,  async (req, res) => {
  try {
    // Get admin data
    const admin = await Admin.findByPk(req.user.id, {
      row: true
    });

    // Calculate total users
    const totalUsers = await User.count();

    // Since there's no status field, all users are considered active
    const activeUsers = totalUsers;

    // Get total events
    const totalEvents = await Event.count();

    // Get active events (status = 'active')
    const activeEvents = await Event.count({ where: { status: 'active' } });

    // Get total registrations
    const totalRegistrations = await Registration.count();

    res.json({
        email: admin.email,
        name: admin.name,
        mobileNo: admin.mobileNo,
        role: admin.role,
        stats: {
          totalUsers,
          activeUsers,
          totalEvents,
          activeEvents,
          totalRegistrations
        }
    });
  } catch (error) {
    console.error('Admin data error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
    try {
      // console.log(req.body);
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'Email and password are required' 
        });
      }
  
      const admin = await Admin.findOne({ where: { email } });
      if (!admin) {
        return res.status(400).json({ 
          success: false,
          error: 'User not found' 
        });
      }
      
      const isPasswordCorrect = await bcrypt.compare(password, admin.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid password' 
        });
      }
      
      const token = jwt.sign(
        { userId: admin.id, email: admin.email }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      res.status(200).json({ 
        success: true,
        user: admin.toJSON(),
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

// Get all users
router.get('/allUsers', authenticateAdminToken,  async (req, res) => {
  try {
    // console.log("----")
    const user = await User.findAll({
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

module.exports = router;