const express = require('express');
const router = express.Router();
const electionController = require('../controllers/electionController');
const candidateController = require('../controllers/candidateController');
const resultController = require('../controllers/resultController');
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const voterMiddleware = require('../middleware/voterMiddleware');

// Public routes: View all elections / view specific election / candidates / results
router.get('/', electionController.getElections);
router.get('/:id', electionController.getElectionById);
router.get('/:electionId/candidates', candidateController.getCandidatesByElection);
router.get('/:electionId/results', resultController.getElectionResults);

// Voter-only routes: Check vote status for current voter
router.get('/:electionId/vote-status', authMiddleware, voterMiddleware, voteController.getVoteStatus);

// Admin-only routes: Create, update, delete elections
router.post('/', authMiddleware, adminMiddleware, electionController.createElection);
router.put('/:id', authMiddleware, adminMiddleware, electionController.updateElection);
router.delete('/:id', authMiddleware, adminMiddleware, electionController.deleteElection);

module.exports = router;
