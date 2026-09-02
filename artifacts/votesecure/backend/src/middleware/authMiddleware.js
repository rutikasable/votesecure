const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Reads Authorization header: Bearer <token>
 * Verifies JWT using process.env.JWT_SECRET
 * Attaches decoded payload to req.user ({ userId, role })
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed authorization header.',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is missing in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration error.',
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Attach verified user info (userId, role) to req.user
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication failed.',
    });
  }
};

module.exports = authMiddleware;
