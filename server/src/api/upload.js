const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure upload directories exist
const profileDir = path.join(__dirname, '../front-end/public/images/profile');
const bannerDir = path.join(__dirname, '../front-end/public/images/banner');

// Create directories if they don't exist
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}
if (!fs.existsSync(bannerDir)) {
  fs.mkdirSync(bannerDir, { recursive: true });
}

// Configure multer for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    // Use the filename from the request or generate one
    const fileName = req.body.fileName || `profile_${Date.now()}_${file.originalname}`;
    cb(null, fileName);
  }
});

// Configure multer for banner images
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, bannerDir);
  },
  filename: (req, file, cb) => {
    // Use the filename from the request or generate one
    const fileName = req.body.fileName || `banner_${Date.now()}_${file.originalname}`;
    cb(null, fileName);
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

// Profile image upload endpoint
router.post('/profile', uploadProfile.single('profile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.filename;
    const imageUrl = `/images/profile/${fileName}`;

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      fileName: fileName,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Banner image upload endpoint
router.post('/banner', uploadBanner.single('banner'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.filename;
    const imageUrl = `/images/banner/${fileName}`;

    res.json({
      success: true,
      message: 'Banner image uploaded successfully',
      fileName: fileName,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ error: 'Failed to upload banner image' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Upload error:', error);
  res.status(500).json({ error: 'Upload failed' });
});

module.exports = router; 