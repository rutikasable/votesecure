const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Verify JWT token from Bearer header
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const secret = process.env.JWT_SECRET || 'votesecure_jwt_super_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    const users = await query('SELECT id, name, email, role, mobile, created_at FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User not found.',
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token. Please sign in again.',
    });
  }
};

// Restrict access to administrators only
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrative privileges required.',
    });
  }
  next();
};

// Optional authentication (populates req.user if token is valid, doesn't block if missing)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      const secret = process.env.JWT_SECRET || 'votesecure_jwt_super_secret_key_2026';
      const decoded = jwt.verify(token, secret);
      const users = await query('SELECT id, name, email, role, mobile FROM users WHERE id = ?', [decoded.id]);
      if (users.length > 0) {
        req.user = users[0];
      }
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
};
