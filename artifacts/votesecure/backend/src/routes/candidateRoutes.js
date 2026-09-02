const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', candidateController.getCandidates);
router.get('/:id', candidateController.getCandidateById);

// Admin-only routes
router.post('/', authMiddleware, adminMiddleware, candidateController.createCandidate);
router.put('/:id', authMiddleware, adminMiddleware, candidateController.updateCandidate);
router.delete('/:id', authMiddleware, adminMiddleware, candidateController.deleteCandidate);

module.exports = router;
