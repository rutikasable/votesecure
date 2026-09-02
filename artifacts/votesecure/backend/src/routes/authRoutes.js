const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register - Register new voter
router.post('/register', authController.register);

// POST /api/auth/login - Authenticate and issue JWT
router.post('/login', authController.login);

// GET /api/auth/me - Protected route returning authenticated user info
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
