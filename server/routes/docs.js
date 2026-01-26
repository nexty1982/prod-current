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

// Test route to verify router is working
router.get('/', (req, res) => {
  console.log('✅ GET /api/docs/ - Test route hit');
  res.json({ 
    success: true, 
    message: 'OM Specification Documentation API is working',
    docsDir: DOCS_DIR,
    nodeEnv: process.env.NODE_ENV,
    exists: fs.existsSync(DOCS_DIR)
  });
});

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
  console.log('📄 GET /api/docs/files - Request received');
  console.log(`📄 DOCS_DIR: ${DOCS_DIR}`);
  console.log(`📄 NODE_ENV: ${process.env.NODE_ENV}`);
  
  try {
    // Check if directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      console.warn(`⚠️ Docs directory does not exist: ${DOCS_DIR}`);
      // Try to create it
      try {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
        console.log(`✅ Created docs directory: ${DOCS_DIR}`);
        return res.json({ files: [] });
      } catch (mkdirError) {
        console.error(`❌ Failed to create docs directory: ${mkdirError.message}`);
        return res.status(500).json({ 
          success: false,
          error: 'Directory creation failed',
          message: mkdirError.message,
          docsDir: DOCS_DIR
        });
      }
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
    
    console.log(`✅ Returning ${files.length} files from ${DOCS_DIR}`);
    res.json({ files });
  } catch (error) {
    console.error('❌ Error listing docs files:', {
      error: error.message,
      stack: error.stack,
      DOCS_DIR: DOCS_DIR
    });
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
router.post('/upload', (req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    // Ensure upload is defined
    if (!upload) {
      throw new Error('Multer upload middleware is not initialized.');
    }

    // Initial logging
    console.log(`[${requestId}] 📤 POST /api/docs/upload`, {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      timestamp: new Date().toISOString()
    });

    // Wrap multer middleware to catch errors
    upload.single('file')(req, res, (multerErr) => {
      if (multerErr) {
        console.error(`[${requestId}] ❌ Multer error:`, {
          code: multerErr.code,
          message: multerErr.message,
          field: multerErr.field
        });
        
        let statusCode = 400;
        let errorCode = 'UPLOAD_ERROR';
        
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          errorCode = 'FILE_TOO_LARGE';
          multerErr.message = `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
        } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
          errorCode = 'UNEXPECTED_FIELD';
          multerErr.message = 'Unexpected field name. Expected field name: "file"';
        }
        
        return res.status(statusCode).json({
          success: false,
          error: multerErr.message || 'File upload error',
          code: errorCode
        });
      }
      
      // Continue with upload processing
      try {
        if (!req.file) {
          console.error(`[${requestId}] ❌ No file in request`);
          return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded',
            message: 'Please select a file to upload',
            code: 'NO_FILE'
          });
        }

        const stats = fs.statSync(req.file.path);
        const ext = path.extname(req.file.filename).toLowerCase().substring(1);
        
        // Extract timestamp from filename
        const timestampMatch = req.file.filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)_(.+)$/);
        const timestamp = timestampMatch ? timestampMatch[1] : req.body.timestamp || stats.birthtime.toISOString().replace(/[:.]/g, '-');
        const originalName = timestampMatch ? timestampMatch[2] : req.file.originalname;

        console.log(`[${requestId}] ✅ Upload successful:`, {
          filename: req.file.filename,
          originalname: originalName,
          size: stats.size,
          type: ext,
          timestamp
        });

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
        console.error(`[${requestId}] ❌ Error in docs upload:`, {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        // Clean up file if it was created but error occurred
        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
            console.log(`[${requestId}] 🗑️ Cleaned up uploaded file: ${req.file.path}`);
          } catch (unlinkError) {
            console.error(`[${requestId}] ❌ Failed to clean up file:`, unlinkError);
          }
        }
        
        // Pass to error handler for proper JSON response
        error.statusCode = error.statusCode || 500;
        error.status = error.statusCode;
        next(error);
      }
    });
  } catch (outerError) {
    // Catch any errors that occur before multer processes the request
    console.error(`[${requestId || 'unknown'}] ❌ Outer error in docs upload route:`, {
      message: outerError.message,
      code: outerError.code,
      stack: outerError.stack
    });
    
    // Ensure we return JSON, not HTML
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: outerError.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    } else {
      next(outerError);
    }
  }
});

/**
 * GET /api/docs/download/:filename
 * Download a documentation file
 */
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security check: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
        message: 'Filename contains invalid characters'
      });
    }
    
    const filePath = path.join(DOCS_DIR, filename);
    
    // Security check: ensure file is within docs directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDocsDir = path.resolve(DOCS_DIR);
    
    if (!resolvedPath.startsWith(resolvedDocsDir)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid path',
        message: 'Cannot access files outside docs directory'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `Document not found: ${filename}`
      });
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the file
    res.sendFile(filePath);
    
    console.log(`✅ Downloaded file: ${filename}`);
  } catch (error) {
    console.error('❌ Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
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

