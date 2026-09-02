const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');
const voterMiddleware = require('../middleware/voterMiddleware');

// POST /api/votes - Cast a vote in an active election (Voters only)
router.post('/', authMiddleware, voterMiddleware, voteController.castVote);

// GET /api/votes/status/:electionId - Check if authenticated voter has voted in election
router.get('/status/:electionId', authMiddleware, voterMiddleware, voteController.getVoteStatus);

// GET /api/votes/history - Get authenticated voter's voting history and receipts
router.get('/history', authMiddleware, voterMiddleware, voteController.getVoteHistory);

module.exports = router;
