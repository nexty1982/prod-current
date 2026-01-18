/**
 * Backend API Routes for OM Specification Documentation
 * 
 * This file should be added to your Express backend server.
 * 
 * Installation:
 * 1. Copy this file to your backend routes directory (e.g., routes/docs.js)
 * 2. Install required dependencies: npm install multer
 * 3. Add to your main server file: app.use('/api/docs', require('./routes/docs'));
 * 
 * File Storage:
 * - Production: /var/www/orthodoxmetrics/prod/front-end/public/docs
 * - Development: front-end/public/docs (relative to project root)
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Determine docs directory based on environment
const getDocsDirectory = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/var/www/orthodoxmetrics/prod/front-end/public/docs';
  }
  // Development: relative to backend project root, go up to front-end/public/docs
  // Adjust this path based on your backend project structure
  const backendRoot = process.cwd();
  return path.join(backendRoot, '..', 'front-end', 'public', 'docs');
};

const DOCS_DIR = getDocsDirectory();

// Ensure directory exists
try {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  console.log(`Docs directory ensured: ${DOCS_DIR}`);
} catch (error) {
  console.error(`Error creating docs directory: ${error.message}`);
}

// Allowed file types
const ALLOWED_TYPES = ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCS_DIR);
  },
  filename: (req, file, cb) => {
    // Get timestamp from form data or generate new one
    const timestamp = req.body.timestamp || new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    // Format: {timestamp}_{originalFilename}
    const filename = `${timestamp}_${name}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

/**
 * GET /api/docs/files
 * Returns a list of all documentation files
 */
router.get('/files', (req, res) => {
  try {
    // Check if directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      return res.json({ files: [] });
    }

    // Read directory
    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => {
        // Filter by allowed extensions
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_TYPES.includes(ext);
      })
      .map(file => {
        const filePath = path.join(DOCS_DIR, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase().substring(1); // Remove the dot
        
        // Extract timestamp and original filename
        // Format: YYYY-MM-DDTHH-MM-SS-sssZ_filename.ext
        const timestampMatch = file.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)_(.+)$/);
        let timestamp, originalName;
        
        if (timestampMatch) {
          timestamp = timestampMatch[1];
          originalName = timestampMatch[2];
        } else {
          // If no timestamp prefix, use file modification time
          timestamp = stats.birthtime.toISOString().replace(/[:.]/g, '-');
          originalName = file;
        }
        
        return {
          name: originalName,
          path: file, // Full filename with timestamp
          type: ext,
          size: stats.size,
          uploadedAt: stats.birthtime.toISOString(),
          timestamp: timestamp
        };
      })
      .sort((a, b) => {
        // Sort by timestamp (newest first)
        return new Date(b.timestamp.replace(/-/g, ':').replace('T', 'T').replace(/(\d{3})Z/, '.$1Z')) - 
               new Date(a.timestamp.replace(/-/g, ':').replace('T', 'T').replace(/(\d{3})Z/, '.$1Z'));
      });
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing docs files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list files',
      message: error.message 
    });
  }
});

/**
 * POST /api/docs/upload
 * Uploads a documentation file
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded',
        message: 'Please select a file to upload' 
      });
    }

    const stats = fs.statSync(req.file.path);
    const ext = path.extname(req.file.filename).toLowerCase().substring(1);
    
    // Extract timestamp from filename
    const timestampMatch = req.file.filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)_(.+)$/);
    const timestamp = timestampMatch ? timestampMatch[1] : req.body.timestamp || stats.birthtime.toISOString().replace(/[:.]/g, '-');
    const originalName = timestampMatch ? timestampMatch[2] : req.file.originalname;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: originalName,
        path: req.file.filename, // Full filename with timestamp
        type: ext,
        size: stats.size,
        uploadedAt: stats.birthtime.toISOString(),
        timestamp: timestamp
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up file if it was created but error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

/**
 * Error handler for multer errors
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File too large',
        message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: 'Upload error',
      message: error.message 
    });
  }
  
  if (error) {
    return res.status(400).json({ 
      success: false, 
      error: 'Upload error',
      message: error.message 
    });
  }
  
  next();
});

module.exports = router;

