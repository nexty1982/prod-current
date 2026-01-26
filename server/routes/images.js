const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * GET /api/images/list?directory=orthodox/avatars
 * Returns a list of image files in the specified directory
 */
router.get('/list', (req, res) => {
  const { directory } = req.query;
  
  if (!directory) {
    return res.status(400).json({ 
      success: false,
      error: 'Directory parameter is required' 
    });
  }

  try {
    // Server-controlled upload directory
    // Support both orthodox/avatars and orthodox/banners
    const baseDir = path.join(__dirname, '../../misc/public/uploads');
    const targetDir = path.join(baseDir, directory);
    
    // Security check: ensure the resolved path is within baseDir
    const resolvedPath = path.resolve(targetDir);
    const resolvedBase = path.resolve(baseDir);
    
    if (!resolvedPath.startsWith(resolvedBase)) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied: directory path outside allowed base' 
      });
    }

    // Check if directory exists
    if (!fs.existsSync(targetDir)) {
      // Return empty array instead of 404 for better UX
      return res.json({
        success: true,
        directory: directory,
        count: 0,
        images: []
      });
    }

    // Read directory and filter for image files
    const files = fs.readdirSync(targetDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    }).map(file => {
      const filePath = path.join(targetDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        url: `/uploads/${directory}/${file}`,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    });

    res.json({
      success: true,
      directory: directory,
      count: imageFiles.length,
      images: imageFiles
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

