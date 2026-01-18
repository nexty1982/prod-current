/**
 * Backend API Route for Listing Images from Public Directories
 * 
 * This file should be added to your Express backend server.
 * 
 * Installation:
 * 1. Copy this file to your backend routes directory (e.g., routes/images.js)
 * 2. Add to your main server file: app.use('/api/images', require('./routes/images'));
 * 
 * Usage:
 * GET /api/images/list?directory=orthodox/avatars
 * GET /api/images/list?directory=orthodox/banners
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Allowed image extensions
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];

// Determine public directory based on environment
const getPublicDirectory = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/var/www/orthodoxmetrics/prod/front-end/public';
  }
  // Development: relative to backend project root
  const backendRoot = process.cwd();
  return path.join(backendRoot, '..', 'front-end', 'public');
};

const PUBLIC_DIR = getPublicDirectory();

/**
 * GET /api/images/list
 * Returns a list of image files from a specified directory
 * Query parameter: directory (e.g., "orthodox/avatars" or "orthodox/banners")
 */
router.get('/list', (req, res) => {
  try {
    const directory = req.query.directory;
    
    if (!directory) {
      return res.status(400).json({ 
        success: false, 
        error: 'Directory parameter is required',
        message: 'Please provide a directory query parameter (e.g., ?directory=orthodox/avatars)' 
      });
    }

    // Sanitize directory path to prevent directory traversal
    const sanitizedDir = directory.replace(/\.\./g, '').replace(/^\//, '');
    const targetDir = path.join(PUBLIC_DIR, sanitizedDir);

    // Ensure the directory is within the public directory
    if (!targetDir.startsWith(PUBLIC_DIR)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid directory path',
        message: 'Directory must be within the public directory' 
      });
    }

    // Check if directory exists
    if (!fs.existsSync(targetDir)) {
      console.log(`Directory does not exist: ${targetDir}`);
      return res.json({ files: [] });
    }

    // Read directory and filter image files
    const files = fs.readdirSync(targetDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
      })
      .sort(); // Sort alphabetically
    
    console.log(`Found ${files.length} images in ${targetDir}`);
    
    res.json({ 
      success: true,
      files: files,
      directory: sanitizedDir,
      count: files.length
    });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list images',
      message: error.message 
    });
  }
});

module.exports = router;

