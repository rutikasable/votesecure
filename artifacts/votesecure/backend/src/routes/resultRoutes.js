const express = require('express');
const router = express.Router({ mergeParams: true });
const resultController = require('../controllers/resultController');

// GET /api/elections/:electionId/results
router.get('/:electionId/results', resultController.getElectionResults);

module.exports = router;
