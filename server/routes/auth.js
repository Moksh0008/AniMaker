const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper: format Supabase user into a safe object for frontend
function formatUser(supabaseUser) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    username: supabaseUser.user_metadata?.username || '',
    name: supabaseUser.user_metadata?.name || '',
    bio: supabaseUser.user_metadata?.bio || '',
    profileImage: supabaseUser.user_metadata?.profileImage || '',
    created_at: supabaseUser.created_at
  };
}

// @route   POST /api/auth/signup
// @desc    Register a new user via Supabase
// @access  Public
router.post('/signup', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Name is required (max 50 characters)'),
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { username, name, email, password } = req.body;

    // Check if username is already taken by another user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    if (existingUsers && existingUsers.users) {
      const taken = existingUsers.users.find(
        u => u.user_metadata?.username === username
      );
      if (taken) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      // Check duplicate email
      const emailTaken = existingUsers.users.find(u => u.email === email);
      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    // Create user in Supabase Auth with metadata
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since we don't have email setup
      user_metadata: {
        username,
        name,
        bio: '',
        profileImage: ''
      }
    });

    if (error) {
      console.error('Supabase signup error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create account'
      });
    }

    // Generate a session token for the new user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    // Instead of magic link, create a session directly
    // Sign in the user to get a JWT
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      // User created but couldn't sign in — still return success with basic info
      console.error('Auto sign-in after signup failed:', signInError);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token: null,
        user: formatUser(data.user)
      });
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res
      .status(201)
      .cookie('token', signInData.session.access_token, cookieOptions)
      .json({
        success: true,
        message: 'Account created successfully',
        token: signInData.session.access_token,
        user: formatUser(signInData.user)
      });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user via Supabase
// @access  Public
router.post('/login', [
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;

    // Sign in via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Don't reveal whether email exists — same message for both
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res
      .status(200)
      .cookie('token', data.session.access_token, cookieOptions)
      .json({
        success: true,
        message: 'Logged in successfully',
        token: data.session.access_token,
        user: formatUser(data.user)
      });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user / clear cookie
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // Sign out from Supabase (invalidates the refresh token)
    await supabase.auth.admin.signOut(req.user.id);
  } catch {
    // Continue even if Supabase sign-out fails — cookie will be cleared
  }

  res
    .cookie('token', '', {
      httpOnly: true,
      expires: new Date(0)
    })
    .json({
      success: true,
      message: 'Logged out successfully'
    });
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // Fetch fresh user data from Supabase
    const { data, error } = await supabase.auth.admin.getUserById(req.user.id);

    if (error || !data || !data.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: formatUser(data.user)
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile via Supabase
// @access  Private
router.put('/profile', protect, [
  body('name').optional().trim().isLength({ max: 50 }),
  body('bio').optional().trim().isLength({ max: 200 }),
  body('username').optional().trim().isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { name, bio, username, profileImage } = req.body;
    const updateMetadata = {};

    if (name) updateMetadata.name = name;
    if (bio !== undefined) updateMetadata.bio = bio;
    if (profileImage !== undefined) updateMetadata.profileImage = profileImage;

    // Check username uniqueness if changing
    if (username && username !== req.user.user_metadata?.username) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      if (existingUsers && existingUsers.users) {
        const taken = existingUsers.users.find(
          u => u.user_metadata?.username === username && u.id !== req.user.id
        );
        if (taken) {
          return res.status(400).json({
            success: false,
            message: 'Username is already taken'
          });
        }
      }
      updateMetadata.username = username;
    }

    // Update user metadata in Supabase
    const { data, error } = await supabase.auth.admin.updateUserById(
      req.user.id,
      { user_metadata: { ...req.user.user_metadata, ...updateMetadata } }
    );

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated',
      user: formatUser(data.user)
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

module.exports = router;
