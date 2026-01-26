const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAppPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Server-controlled upload directories
const UPLOAD_BASE_DIR = path.join(__dirname, '../../misc/public/uploads');
const AVATARS_DIR = path.join(UPLOAD_BASE_DIR, 'orthodox/avatars');
const BANNERS_DIR = path.join(UPLOAD_BASE_DIR, 'orthodox/banners');

// Create directories if they don't exist
[AVATARS_DIR, BANNERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created upload directory: ${dir}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer for profile images (avatars)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATARS_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.session?.user?.id || req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `profile_${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// Configure multer for banner images
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, BANNERS_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.session?.user?.id || req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `banner_${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// Create multer instances
const uploadProfile = multer({ 
  storage: profileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadBanner = multer({ 
  storage: bannerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/upload/profile
 * Upload a profile image (avatar) and update user profile in database
 */
router.post('/profile', requireAuth, uploadProfile.single('profile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    const userId = req.session?.user?.id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const fileName = req.file.filename;
    // Public URL path (will be served via static middleware)
    const imageUrl = `/uploads/orthodox/avatars/${fileName}`;

    // Update user profile in database
    const pool = getAppPool();
    
    // Check if profile exists
    const [existingProfiles] = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingProfiles.length > 0) {
      // Update existing profile
      await pool.query(`
        UPDATE user_profiles 
        SET profile_image_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [imageUrl, userId]);
    } else {
      // Create new profile
      await pool.query(`
        INSERT INTO user_profiles (user_id, profile_image_url, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userId, imageUrl]);
    }

    console.log(`✅ Profile image uploaded for user ${userId}: ${imageUrl}`);

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      fileName: fileName,
      imageUrl: imageUrl,
      profile_image_url: imageUrl
    });
  } catch (error) {
    console.error('❌ Profile upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload profile image',
      message: error.message 
    });
  }
});

/**
 * POST /api/upload/banner
 * Upload a banner image and update user profile in database
 */
router.post('/banner', requireAuth, uploadBanner.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    const userId = req.session?.user?.id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const fileName = req.file.filename;
    const imageUrl = `/uploads/orthodox/banners/${fileName}`;

    // Update user profile in database
    const pool = getAppPool();
    
    const [existingProfiles] = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingProfiles.length > 0) {
      await pool.query(`
        UPDATE user_profiles 
        SET cover_image_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [imageUrl, userId]);
    } else {
      await pool.query(`
        INSERT INTO user_profiles (user_id, cover_image_url, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userId, imageUrl]);
    }

    console.log(`✅ Banner image uploaded for user ${userId}: ${imageUrl}`);

    res.json({
      success: true,
      message: 'Banner image uploaded successfully',
      fileName: fileName,
      imageUrl: imageUrl,
      cover_image_url: imageUrl
    });
  } catch (error) {
    console.error('❌ Banner upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload banner image',
      message: error.message 
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File too large. Maximum size is 5MB for profile images and 10MB for banners.' 
      });
    }
  }
  
  console.error('❌ Upload error:', error);
  res.status(500).json({ 
    success: false,
    error: 'Upload failed',
    message: error.message 
  });
});

module.exports = router;

