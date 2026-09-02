const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All admin routes require valid JWT and role === 'admin'
router.get('/stats', authMiddleware, adminMiddleware, adminController.getAdminStats);
router.get('/voters', authMiddleware, adminMiddleware, adminController.getAdminVoters);

module.exports = router;
