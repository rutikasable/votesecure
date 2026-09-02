const { supabase } = require('../config/supabase');

const VALID_STATUSES = ['upcoming', 'active', 'ended'];

// Helper to validate date string
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

/**
 * 1. Get all elections
 * GET /api/elections
 * Query param: ?status=active (optional)
 */
exports.getElections = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase.from('elections').select('*').order('created_at', { ascending: false });

    // Optional status filtering
    if (status) {
      const normalizedStatus = String(status).toLowerCase().trim();
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      query = query.eq('status', normalizedStatus);
    }

    const { data: elections, error } = await query;

    if (error) {
      console.error('Database error in getElections:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching elections.',
      });
    }

    return res.status(200).json({
      success: true,
      count: elections ? elections.length : 0,
      elections: elections || [],
    });
  } catch (error) {
    console.error('Unexpected error in getElections:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 2. Get single election by ID
 * GET /api/elections/:id
 */
exports.getElectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: election, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Database error in getElectionById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching election.',
      });
    }

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.',
      });
    }

    return res.status(200).json({
      success: true,
      election,
    });
  } catch (error) {
    console.error('Unexpected error in getElectionById:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 3. Create election (Admin only)
 * POST /api/elections
 */
exports.createElection = async (req, res) => {
  try {
    const { title, description, start_date, end_date, status } = req.body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required.',
      });
    }

    // Validate start_date
    if (!start_date || !isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid start_date is required.',
      });
    }

    // Validate end_date
    if (!end_date || !isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid end_date is required.',
      });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    // Validate start_date is before end_date
    if (startDateObj >= endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'start_date must be before end_date.',
      });
    }

    // Validate or assign status (defaults to "upcoming")
    let electionStatus = 'upcoming';
    if (status !== undefined && status !== null) {
      const normalizedStatus = String(status).toLowerCase().trim();
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      electionStatus = normalizedStatus;
    }

    const newElection = {
      title: title.trim(),
      description: description !== undefined && description !== null ? String(description).trim() : null,
      start_date: startDateObj.toISOString(),
      end_date: endDateObj.toISOString(),
      status: electionStatus,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('elections')
      .insert([newElection])
      .select('*');

    if (insertError) {
      console.error('Database error in createElection:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create election.',
      });
    }

    const created = inserted && inserted[0];

    return res.status(201).json({
      success: true,
      message: 'Election created successfully.',
      election: created,
    });
  } catch (error) {
    console.error('Unexpected error in createElection:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 4. Update election (Admin only)
 * PUT /api/elections/:id
 */
exports.updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, status } = req.body;

    // Check if election exists
    const { data: existing, error: findError } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Database error checking election in updateElection:', findError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.',
      });
    }

    const updates = {};

    // Validate title if supplied
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty.',
        });
      }
      updates.title = title.trim();
    }

    // Validate description if supplied
    if (description !== undefined) {
      updates.description = description !== null ? String(description).trim() : null;
    }

    // Validate status if supplied
    if (status !== undefined) {
      const normalizedStatus = String(status).toLowerCase().trim();
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      updates.status = normalizedStatus;
    }

    // Validate dates if supplied
    const newStartDate = start_date !== undefined ? start_date : existing.start_date;
    const newEndDate = end_date !== undefined ? end_date : existing.end_date;

    if (start_date !== undefined) {
      if (!isValidDate(start_date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start_date format.',
        });
      }
      updates.start_date = new Date(start_date).toISOString();
    }

    if (end_date !== undefined) {
      if (!isValidDate(end_date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end_date format.',
        });
      }
      updates.end_date = new Date(end_date).toISOString();
    }

    const effectiveStartObj = new Date(newStartDate);
    const effectiveEndObj = new Date(newEndDate);

    if (effectiveStartObj >= effectiveEndObj) {
      return res.status(400).json({
        success: false,
        message: 'start_date must be before end_date.',
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from('elections')
      .update(updates)
      .eq('id', id)
      .select('*');

    if (updateError) {
      console.error('Database error in updateElection:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update election.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Election updated successfully.',
      election: updated && updated[0],
    });
  } catch (error) {
    console.error('Unexpected error in updateElection:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 5. Delete election (Admin only)
 * DELETE /api/elections/:id
 */
exports.deleteElection = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if election exists
    const { data: existing, error: findError } = await supabase
      .from('elections')
      .select('id, title')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Database error in deleteElection:', findError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.',
      });
    }

    const { error: deleteError } = await supabase
      .from('elections')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error in deleteElection:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete election.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Election deleted successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in deleteElection:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};
