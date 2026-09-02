const { supabase } = require('../config/supabase');

// Helper to validate URL format
const isValidUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * 1. Get all candidates
 * GET /api/candidates
 * Optional query: ?election_id=1
 */
exports.getCandidates = async (req, res) => {
  try {
    const { election_id } = req.query;

    let query = supabase.from('candidates').select('*').order('id', { ascending: true });

    if (election_id !== undefined && election_id !== null && String(election_id).trim() !== '') {
      const parsedElectionId = Number(election_id);
      if (isNaN(parsedElectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid election_id format. Must be a valid numeric ID.',
        });
      }
      query = query.eq('election_id', parsedElectionId);
    }

    const { data: candidates, error } = await query;

    if (error) {
      console.error('Database error in getCandidates:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching candidates.',
      });
    }

    return res.status(200).json({
      success: true,
      count: candidates ? candidates.length : 0,
      candidates: candidates || [],
    });
  } catch (error) {
    console.error('Unexpected error in getCandidates:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 2. Get candidate by ID
 * GET /api/candidates/:id
 */
exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Database error in getCandidateById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching candidate.',
      });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.',
      });
    }

    return res.status(200).json({
      success: true,
      candidate,
    });
  } catch (error) {
    console.error('Unexpected error in getCandidateById:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 3. Get candidates for a specific election
 * GET /api/elections/:electionId/candidates
 */
exports.getCandidatesByElection = async (req, res) => {
  try {
    const { electionId } = req.params;

    const parsedElectionId = Number(electionId);
    if (isNaN(parsedElectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid electionId format. Must be a valid number.',
      });
    }

    // Verify election exists
    const { data: election, error: elError } = await supabase
      .from('elections')
      .select('id, title')
      .eq('id', parsedElectionId)
      .maybeSingle();

    if (elError) {
      console.error('Database error checking election:', elError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.',
      });
    }

    // Fetch candidates for this election
    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('election_id', parsedElectionId)
      .order('id', { ascending: true });

    if (candError) {
      console.error('Database error fetching candidates for election:', candError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching election candidates.',
      });
    }

    return res.status(200).json({
      success: true,
      electionId: parsedElectionId,
      count: candidates ? candidates.length : 0,
      candidates: candidates || [],
    });
  } catch (error) {
    console.error('Unexpected error in getCandidatesByElection:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 4. Create candidate (Admin only)
 * POST /api/candidates
 */
exports.createCandidate = async (req, res) => {
  try {
    const { name, photo, party, description, election_id } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Candidate name is required.',
      });
    }

    // Validate election_id
    if (election_id === undefined || election_id === null || isNaN(Number(election_id))) {
      return res.status(400).json({
        success: false,
        message: 'A valid numeric election_id is required.',
      });
    }

    const parsedElectionId = Number(election_id);

    // Verify referenced election exists
    const { data: election, error: elError } = await supabase
      .from('elections')
      .select('id')
      .eq('id', parsedElectionId)
      .maybeSingle();

    if (elError) {
      console.error('Database error checking referenced election:', elError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while verifying election.',
      });
    }

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Referenced election does not exist.',
      });
    }

    // Validate photo URL if supplied
    let photoUrl = null;
    if (photo !== undefined && photo !== null && String(photo).trim() !== '') {
      const photoStr = String(photo).trim();
      if (!isValidUrl(photoStr)) {
        return res.status(400).json({
          success: false,
          message: 'photo must be a valid URL (http/https).',
        });
      }
      photoUrl = photoStr;
    }

    const newCandidate = {
      name: name.trim(),
      photo: photoUrl,
      party: party !== undefined && party !== null ? String(party).trim() : null,
      description: description !== undefined && description !== null ? String(description).trim() : null,
      election_id: parsedElectionId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('candidates')
      .insert([newCandidate])
      .select('*');

    if (insertError) {
      console.error('Database error in createCandidate:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create candidate.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Candidate created successfully.',
      candidate: inserted && inserted[0],
    });
  } catch (error) {
    console.error('Unexpected error in createCandidate:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 5. Update candidate (Admin only)
 * PUT /api/candidates/:id
 */
exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, photo, party, description, election_id } = req.body;

    // Check if candidate exists
    const { data: existing, error: findError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Database error in updateCandidate find:', findError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.',
      });
    }

    const updates = {};

    // Validate name if supplied
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Candidate name cannot be empty.',
        });
      }
      updates.name = name.trim();
    }

    // Validate photo if supplied
    if (photo !== undefined) {
      if (photo !== null && String(photo).trim() !== '') {
        const photoStr = String(photo).trim();
        if (!isValidUrl(photoStr)) {
          return res.status(400).json({
            success: false,
            message: 'photo must be a valid URL (http/https).',
          });
        }
        updates.photo = photoStr;
      } else {
        updates.photo = null;
      }
    }

    // Update party if supplied
    if (party !== undefined) {
      updates.party = party !== null ? String(party).trim() : null;
    }

    // Update description if supplied
    if (description !== undefined) {
      updates.description = description !== null ? String(description).trim() : null;
    }

    // Validate election_id if supplied
    if (election_id !== undefined) {
      if (election_id === null || isNaN(Number(election_id))) {
        return res.status(400).json({
          success: false,
          message: 'A valid numeric election_id is required.',
        });
      }

      const parsedElectionId = Number(election_id);

      const { data: election, error: elError } = await supabase
        .from('elections')
        .select('id')
        .eq('id', parsedElectionId)
        .maybeSingle();

      if (elError) {
        console.error('Database error checking referenced election in update:', elError);
        return res.status(500).json({
          success: false,
          message: 'Internal server error while verifying election.',
        });
      }

      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Referenced election does not exist.',
        });
      }

      updates.election_id = parsedElectionId;
    }

    const { data: updated, error: updateError } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select('*');

    if (updateError) {
      console.error('Database error in updateCandidate:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update candidate.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate updated successfully.',
      candidate: updated && updated[0],
    });
  } catch (error) {
    console.error('Unexpected error in updateCandidate:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};

/**
 * 6. Delete candidate (Admin only)
 * DELETE /api/candidates/:id
 */
exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if candidate exists
    const { data: existing, error: findError } = await supabase
      .from('candidates')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Database error in deleteCandidate find:', findError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.',
      });
    }

    const { error: deleteError } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error in deleteCandidate:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete candidate.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in deleteCandidate:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};
