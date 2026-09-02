const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public/voter activity logs for dashboard feed
router.get('/activities', voterController.getActivities);

// Admin-only voter directory and overview statistics
router.get('/', authenticateToken, requireAdmin, voterController.getAllVoters);
router.get('/stats', authenticateToken, requireAdmin, voterController.getAdminStats);

module.exports = router;
