const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mobile regex pattern (allows digits, spaces, hyphens, plus; 7-15 digits)
const MOBILE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;

/**
 * Register a new voter account
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    // 2. Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // 3. Validate password minimum length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // 4. Validate mobile if provided
    let normalizedMobile = null;
    if (mobile !== undefined && mobile !== null && String(mobile).trim() !== '') {
      const mobileStr = String(mobile).trim();
      if (!MOBILE_REGEX.test(mobileStr)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid mobile number.',
        });
      }
      normalizedMobile = mobileStr;
    }

    // 5. Check whether the email already exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError) {
      console.error('Database error checking existing user:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while checking account details.',
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // 6. Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 7. Store new user in Supabase with role "voter" and hashed password only
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      password: hashedPassword,
      role: 'voter',
    };

    const { data: insertedUsers, error: insertError } = await supabase
      .from('users')
      .insert([newUser])
      .select('id, name, email, mobile, role, created_at');

    if (insertError) {
      console.error('Database error inserting user:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account.',
      });
    }

    const createdUser = insertedUsers && insertedUsers[0];

    // 8. Return HTTP 201 with sanitized user object (never exposing password or hash)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        mobile: createdUser.mobile,
        role: createdUser.role,
        created_at: createdUser.created_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error in register controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during registration.',
    });
  }
};

/**
 * Login voter or user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate that email and password are provided
    if (!email || typeof email !== 'string' || email.trim() === '' ||
        !password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user by email in Supabase users table
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, name, email, password, role, mobile, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (findError) {
      console.error('Database error during login:', findError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    // 3. If user does not exist, return HTTP 401
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Compare supplied password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 5. Generate JWT with minimal payload (userId, role)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is missing in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration error.',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 6. Return HTTP 200 with JWT and safe user details
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Unexpected error in login controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during login.',
    });
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, name, email, mobile, role, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (findError) {
      console.error('Database error fetching profile:', findError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error in getMe controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};
