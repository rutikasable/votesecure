const { supabase } = require('../config/supabase');

/**
 * Get aggregated election results & vote statistics
 * GET /api/elections/:electionId/results
 */
exports.getElectionResults = async (req, res) => {
  try {
    const { electionId } = req.params;

    // 1. Validate electionId format
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

    // 2. Verify election exists in Supabase
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, title, status')
      .eq('id', parsedElectionId)
      .maybeSingle();

    if (electionError) {
      console.error('Database error in getElectionResults checking election:', electionError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching election details.',
      });
    }

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.',
      });
    }

    // 3. Fetch all candidates belonging to this election
    const { data: candidates, error: candidateError } = await supabase
      .from('candidates')
      .select('id, name, party, photo')
      .eq('election_id', parsedElectionId)
      .order('id', { ascending: true });

    if (candidateError) {
      console.error('Database error fetching candidates in getElectionResults:', candidateError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching candidate details.',
      });
    }

    // 4. Fetch all votes cast in this election (fetches ONLY candidate_id for tallying to preserve voter privacy)
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('election_id', parsedElectionId);

    if (votesError) {
      console.error('Database error fetching votes in getElectionResults:', votesError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while tallying election votes.',
      });
    }

    // 5. Tally votes per candidate
    const voteTallyMap = {};
    if (votes && Array.isArray(votes)) {
      for (const v of votes) {
        voteTallyMap[v.candidate_id] = (voteTallyMap[v.candidate_id] || 0) + 1;
      }
    }

    const totalVotes = votes ? votes.length : 0;

    // 6. Format results for every candidate belonging to this election (including zero-vote candidates)
    const results = (candidates || []).map((candidate) => ({
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      party: candidate.party || null,
      photo: candidate.photo || null,
      vote_count: voteTallyMap[candidate.id] || 0,
    }));

    // 7. Sort candidates by vote_count descending
    results.sort((a, b) => b.vote_count - a.vote_count);

    // 8. Return aggregated results (never exposing voter identities)
    return res.status(200).json({
      success: true,
      election: {
        id: election.id,
        title: election.title,
        status: election.status,
      },
      total_votes: totalVotes,
      results,
    });
  } catch (error) {
    console.error('Unexpected error in getElectionResults:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while calculating election results.',
    });
  }
};
