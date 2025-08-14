const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found or account disabled'
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is not valid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Token has expired, please login again'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
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
  if (req.user && (req.user.role === 'admin' || req.user.id === parseInt(req.params.id))) {
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
  requireAdminOrOwner
};
