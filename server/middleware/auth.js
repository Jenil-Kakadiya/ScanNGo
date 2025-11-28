const jwt = require('jsonwebtoken');
const { User, Admin } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Handle both ObjectId string and regular string
    const userId = decoded.userId;
    const user = await User.findById(userId);

    if (!user || user.isActive === false) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found or account disabled',
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.personalEmail,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is not valid',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Token has expired, please login again',
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error',
    });
  }
};

const authenticateAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Handle both ObjectId string and regular string
    const adminId = decoded.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Admin not found or account disabled',
      });
    }

    req.user = {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      name: admin.name,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is not valid',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Token has expired, please login again',
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error',
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }
};

// Middleware to check if user is admin or the owner of the resource
const requireAdminOrOwner = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.id === req.params.id)) {
    next();
  } else {
    res.status(403).json({
      error: 'Access denied',
      message: 'Insufficient privileges'
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrOwner,
  authenticateAdminToken
};
