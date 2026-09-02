const { supabase } = require('../config/supabase');

/**
 * Get aggregated admin dashboard statistics
 * GET /api/admin/stats
 */
exports.getAdminStats = async (req, res) => {
  try {
    const [
      { data: elections, error: eErr },
      { data: candidates, error: cErr },
      { data: votes, error: vErr },
      { count: votersCount, error: uErr },
    ] = await Promise.all([
      supabase.from('elections').select('id, title, status, start_date, end_date').order('id', { ascending: false }),
      supabase.from('candidates').select('id, name, party, election_id'),
      supabase.from('votes').select('id, election_id, created_at'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'voter'),
    ]);

    if (eErr || cErr || vErr) {
      console.error('Error fetching admin stats:', eErr || cErr || vErr);
      return res.status(500).json({ success: false, message: 'Failed to fetch admin stats.' });
    }

    const totalElections = elections ? elections.length : 0;
    const activeElections = (elections || []).filter((e) => e.status === 'active').length;
    const upcomingElections = (elections || []).filter((e) => e.status === 'upcoming').length;
    const endedElections = (elections || []).filter((e) => e.status === 'ended').length;
    const totalCandidates = candidates ? candidates.length : 0;
    const totalVotes = votes ? votes.length : 0;
    const registeredVoters = votersCount || 0;

    // Votes per election breakdown
    const votesByElection = {};
    for (const v of votes || []) {
      votesByElection[v.election_id] = (votesByElection[v.election_id] || 0) + 1;
    }

    const electionSummaries = (elections || []).map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      start_date: e.start_date,
      end_date: e.end_date,
      votes: votesByElection[e.id] || 0,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalElections,
        activeElections,
        upcomingElections,
        endedElections,
        totalCandidates,
        totalVotes,
        registeredVoters,
      },
      elections: electionSummaries,
    });
  } catch (error) {
    console.error('Unexpected error in getAdminStats:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching admin statistics.' });
  }
};

/**
 * Get registered voters list for admin registry
 * GET /api/admin/voters
 * Note: Never exposes passwords, hashes, or candidate choices.
 */
exports.getAdminVoters = async (req, res) => {
  try {
    // 1. Fetch voters
    const { data: voters, error: votersError } = await supabase
      .from('users')
      .select('id, name, email, mobile, role, created_at')
      .eq('role', 'voter')
      .order('id', { ascending: false });

    if (votersError) {
      console.error('Error fetching admin voters:', votersError);
      return res.status(500).json({ success: false, message: 'Failed to fetch registered voters.' });
    }

    // 2. Fetch participation status (voter_id only to tally participation without candidate choice)
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id');

    const votedVoterIds = new Set((votes || []).map((v) => v.voter_id));

    const sanitizedVoters = (voters || []).map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
      mobile: v.mobile || '—',
      role: v.role,
      registrationDate: v.created_at ? new Date(v.created_at).toLocaleDateString() : '—',
      hasVoted: votedVoterIds.has(v.id),
    }));

    return res.status(200).json({
      success: true,
      count: sanitizedVoters.length,
      voters: sanitizedVoters,
    });
  } catch (error) {
    console.error('Unexpected error in getAdminVoters:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching voter registry.' });
  }
};
