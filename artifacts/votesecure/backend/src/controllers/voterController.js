const { query } = require('../config/db');

// Get All Voters (Admin Only)
exports.getAllVoters = async (req, res, next) => {
  try {
    const voters = await query(`
      SELECT u.id, u.name, u.email, u.mobile, u.created_at,
             COUNT(v.id) as total_votes
      FROM users u
      LEFT JOIN votes v ON u.id = v.voter_id
      WHERE u.role = 'voter'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const formatted = voters.map((v) => ({
      id: String(v.id),
      name: v.name,
      email: v.email,
      mobile: v.mobile || '—',
      registrationDate: v.created_at ? v.created_at.toISOString().split('T')[0] : '—',
      voted: v.total_votes > 0,
      totalVotes: v.total_votes,
    }));

    return res.status(200).json({
      success: true,
      voters: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// Get Dashboard Activities
exports.getActivities = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const activities = await query('SELECT * FROM activities ORDER BY created_at DESC LIMIT ?', [limit]);

    const formatted = activities.map((a) => ({
      id: String(a.id),
      label: a.label,
      detail: a.detail,
      timestamp: a.timestamp || a.created_at.toISOString(),
      type: a.type,
    }));

    return res.status(200).json({
      success: true,
      activities: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// Get Admin Dashboard Overview Statistics
exports.getAdminStats = async (req, res, next) => {
  try {
    const [voters] = await query("SELECT COUNT(*) as total FROM users WHERE role = 'voter'");
    const [elections] = await query('SELECT COUNT(*) as total FROM elections');
    const [activeElections] = await query("SELECT COUNT(*) as total FROM elections WHERE status = 'active'");
    const [votes] = await query('SELECT COUNT(*) as total FROM votes');

    const totalVoters = voters.total || 0;
    const totalVotes = votes.total || 0;
    const turnoutRate = totalVoters > 0 ? Number(((totalVotes / totalVoters) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalVoters,
        totalElections: elections.total || 0,
        activeElections: activeElections.total || 0,
        totalVotes,
        turnoutRate,
      },
    });
  } catch (error) {
    next(error);
  }
};
