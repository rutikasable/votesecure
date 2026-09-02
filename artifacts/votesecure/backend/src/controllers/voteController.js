const { supabase } = require('../config/supabase');

/**
 * Cast a vote for a candidate in an active election
 * POST /api/votes
 */
exports.castVote = async (req, res) => {
  try {
    const { election_id, candidate_id } = req.body;

    // 1. Validate request body (require valid numeric IDs)
    if (
      election_id === undefined ||
      election_id === null ||
      isNaN(Number(election_id)) ||
      String(election_id).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid numeric election_id is required.',
      });
    }

    if (
      candidate_id === undefined ||
      candidate_id === null ||
      isNaN(Number(candidate_id)) ||
      String(candidate_id).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid numeric candidate_id is required.',
      });
    }

    const parsedElectionId = Number(election_id);
    const parsedCandidateId = Number(candidate_id);

    // 2. Extract voter identity strictly from verified JWT (req.user.userId)
    const voterId = req.user.userId;

    // 3. Find the election in Supabase
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, title, status')
      .eq('id', parsedElectionId)
      .maybeSingle();

    if (electionError) {
      console.error('Database error checking election in castVote:', electionError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while verifying election.',
      });
    }

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.',
      });
    }

    // 4. Check election status (Voting allowed ONLY when status === "active")
    if (election.status !== 'active') {
      if (election.status === 'upcoming') {
        return res.status(400).json({
          success: false,
          message: 'This election has not started yet. Voting is not open.',
        });
      }
      if (election.status === 'ended') {
        return res.status(400).json({
          success: false,
          message: 'This election has ended. Voting is closed.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Voting is not permitted for an election with status "${election.status}".`,
      });
    }

    // 5. Find the candidate by candidate_id
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, name, election_id')
      .eq('id', parsedCandidateId)
      .maybeSingle();

    if (candidateError) {
      console.error('Database error checking candidate in castVote:', candidateError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while verifying candidate.',
      });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.',
      });
    }

    // 6. Verify candidate belongs to the specified election
    if (Number(candidate.election_id) !== parsedElectionId) {
      return res.status(400).json({
        success: false,
        message: 'Candidate does not belong to the specified election.',
      });
    }

    // 7. Check whether voter already voted in this election
    const { data: existingVote, error: checkVoteError } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_id', voterId)
      .eq('election_id', parsedElectionId)
      .maybeSingle();

    if (checkVoteError) {
      console.error('Database error checking existing vote in castVote:', checkVoteError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while checking voter history.',
      });
    }

    if (existingVote) {
      return res.status(409).json({
        success: false,
        message: 'You have already voted in this election.',
      });
    }

    // 8. Insert vote record
    const newVote = {
      voter_id: voterId,
      election_id: parsedElectionId,
      candidate_id: parsedCandidateId,
    };

    const { error: insertError } = await supabase
      .from('votes')
      .insert([newVote]);

    if (insertError) {
      // Gracefully handle database-level UNIQUE (voter_id, election_id) constraint violation (e.g. concurrent race condition)
      if (insertError.code === '23505' || String(insertError.message).toLowerCase().includes('unique')) {
        return res.status(409).json({
          success: false,
          message: 'You have already voted in this election.',
        });
      }

      console.error('Database error recording vote in castVote:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to record vote. Please try again.',
      });
    }

    // 9. Return HTTP 201 Success
    return res.status(201).json({
      success: true,
      message: 'Vote cast successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in castVote:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while casting vote.',
    });
  }
};

/**
 * Check if the authenticated voter has already cast a vote in an election
 * GET /api/elections/:electionId/vote-status
 */
exports.getVoteStatus = async (req, res) => {
  try {
    const { electionId } = req.params;

    if (
      electionId === undefined ||
      electionId === null ||
      isNaN(Number(electionId)) ||
      String(electionId).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid electionId format. Must be a valid numeric ID.',
      });
    }

    const parsedElectionId = Number(electionId);
    const voterId = req.user.userId;

    // Check votes table for this voter and election (SELECT id ONLY, never candidate_id)
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_id', voterId)
      .eq('election_id', parsedElectionId)
      .maybeSingle();

    if (voteError) {
      console.error('Database error in getVoteStatus:', voteError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while checking vote status.',
      });
    }

    return res.status(200).json({
      success: true,
      has_voted: !!vote,
    });
  } catch (error) {
    console.error('Unexpected error in getVoteStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while checking vote status.',
    });
  }
};

/**
 * Get authenticated voter's voting history and receipt codes
 * GET /api/votes/history
 * Note: Never reveals candidate_id or choice (secret ballot model)
 */
exports.getVoteHistory = async (req, res) => {
  try {
    const voterId = req.user.userId;

    // Fetch vote records for this voter ONLY, omitting candidate_id
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('id, election_id, created_at')
      .eq('voter_id', voterId)
      .order('created_at', { ascending: false });

    if (votesError) {
      console.error('Database error in getVoteHistory:', votesError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching voting history.',
      });
    }

    if (!votes || votes.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        history: [],
      });
    }

    const electionIds = [...new Set(votes.map((v) => v.election_id))];
    const { data: elections, error: electionError } = await supabase
      .from('elections')
      .select('id, title, status, start_date, end_date')
      .in('id', electionIds);

    if (electionError) {
      console.error('Database error fetching election titles in getVoteHistory:', electionError);
    }

    const electionMap = {};
    for (const e of elections || []) {
      electionMap[e.id] = e;
    }

    const history = votes.map((v) => {
      const elec = electionMap[v.election_id] || {};
      return {
        id: v.id,
        election_id: v.election_id,
        election_title: elec.title || `Election #${v.election_id}`,
        election_status: elec.status || 'unknown',
        voted_at: v.created_at,
        receipt_code: `VS-${v.election_id}-${String(v.id).padStart(6, '0')}`,
        status: 'Recorded',
      };
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Unexpected error in getVoteHistory:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while fetching voting history.',
    });
  }
};

