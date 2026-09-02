/**
 * Voter Authorization Middleware
 * Verifies that the authenticated user is a voter.
 * Administrators are forbidden from casting votes.
 * Must be used after authMiddleware.
 */
const voterMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.',
    });
  }

  if (req.user.role === 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Administrators are not permitted to cast votes.',
    });
  }

  if (req.user.role !== 'voter') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Only registered voters can cast votes.',
    });
  }

  next();
};

module.exports = voterMiddleware;
