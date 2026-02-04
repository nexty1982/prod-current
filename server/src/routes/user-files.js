/**
 * User Files API Routes
 * 
 * Handles user profile files (avatar, banner, images, profile data)
 * Files are stored outside the web root for security: /var/www/orthodoxmetrics/data/
 * 
 * Routes:
 * - GET /api/user-files/:id - Stream user files (avatar, banner, images, profile)
 * - POST /api/user-files/upload - Upload user files
 * 
 * Storage Structure:
 * - Super admin: /var/www/orthodoxmetrics/data/church/007/super_admins/next/{avatar|banner|images|profile}
 * - Regular users: /var/www/orthodoxmetrics/data/church/<id>/users/<username>/{avatar|banner|images|profile}
 * - Church files: /var/www/orthodoxmetrics/data/church/<id>/{banner|images|profile}
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Detects context (dist vs source) and uses appropriate path
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let requireAuthModule;
if (isDist) {
  requireAuthModule = require('../middleware/requireAuth');
} else {
  try {
    requireAuthModule = require('../middleware/requireAuth');
  } catch (e) {
    requireAuthModule = require('../middleware/requireAuth');
  }
}
const { requireAuth } = requireAuthModule;

const router = express.Router();

// Base data directory (outside web root)
const getDataDirectory = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/var/www/orthodoxmetrics/data';
  }
  // Development: relative to backend project root
  const backendRoot = process.cwd();
  return path.join(backendRoot, '..', 'data');
};

const DATA_DIR = getDataDirectory();

// Allowed image extensions
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`✅ Created data directory: ${DATA_DIR}`);
  }
} catch (error) {
  console.error(`❌ Error creating data directory: ${error.message}`);
}

/**
 * Get user's storage path based on role and church
 */
function getUserStoragePath(user, fileType = 'images') {
  const churchId = user.church_id || user.churchId || 46; // Default to 46 if not set
  const username = user.username || user.email?.split('@')[0] || 'unknown';
  const role = user.role || 'user';
  
  // Super admin special case (church 007)
  if (role === 'super_admin' && churchId === 7) {
    return path.join(DATA_DIR, 'church', '007', 'super_admins', 'next', fileType);
  }
  
  // Regular users: /data/church/<id>/users/<username>/<fileType>
  return path.join(DATA_DIR, 'church', String(churchId).padStart(2, '0'), 'users', username, fileType);
}

/**
 * Get church storage path
 */
function getChurchStoragePath(churchId, fileType = 'images') {
  return path.join(DATA_DIR, 'church', String(churchId).padStart(2, '0'), fileType);
}

/**
 * Verify user has access to a file
 * - Users can access their own files
 * - Admins can access files in their church
 * - Super admins can access all files
 */
function verifyFileAccess(req, filePath) {
  const user = req.user || req.session?.user;
  if (!user) {
    return { allowed: false, reason: 'Not authenticated' };
  }
  
  const role = user.role || 'user';
  const userId = user.id;
  const churchId = user.church_id || user.churchId;
  
  // Super admins can access everything
  if (role === 'super_admin') {
    return { allowed: true };
  }
  
  // Extract church ID and username from file path
  const pathParts = filePath.split(path.sep);
  const churchIndex = pathParts.indexOf('church');
  
  if (churchIndex === -1) {
    return { allowed: false, reason: 'Invalid file path' };
  }
  
  const fileChurchId = parseInt(pathParts[churchIndex + 1], 10);
  
  // Check if file is in user's church
  if (fileChurchId === churchId) {
    // If file is in users/<username>, check if it's the current user
    const usersIndex = pathParts.indexOf('users');
    if (usersIndex !== -1) {
      const fileUsername = pathParts[usersIndex + 1];
      const userUsername = user.username || user.email?.split('@')[0];
      
      // User can access their own files, or admins can access any user's files in their church
      if (fileUsername === userUsername || ['admin', 'church_admin'].includes(role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not your file' };
    }
    
    // Church-level files: admins can access
    if (['admin', 'church_admin', 'priest', 'deacon'].includes(role)) {
      return { allowed: true };
    }
  }
  
  return { allowed: false, reason: 'Access denied: different church' };
}

/**
 * GET /api/user-files/:id
 * Stream user files (avatar, banner, images, profile)
 * 
 * Query parameters:
 * - type: 'avatar' | 'banner' | 'images' | 'profile'
 * - filename: specific filename (optional, lists directory if not provided)
 * - churchId: church ID (optional, uses user's church if not provided)
 * - username: username (optional, uses current user if not provided)
 */
router.get('/:id', requireAuth, (req, res) => {
  try {
    const user = req.user || req.session?.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const fileType = (req.query.type || 'images').toLowerCase();
    const filename = req.query.filename;
    const churchId = req.query.churchId ? parseInt(req.query.churchId, 10) : null;
    const username = req.query.username || null;
    
    // Determine storage path
    let storagePath;
    if (churchId && username) {
      // Specific user in specific church
      storagePath = path.join(DATA_DIR, 'church', String(churchId).padStart(2, '0'), 'users', username, fileType);
    } else if (churchId) {
      // Church-level files
      storagePath = getChurchStoragePath(churchId, fileType);
    } else {
      // Current user's files
      storagePath = getUserStoragePath(user, fileType);
    }
    
    // Verify access
    const access = verifyFileAccess(req, storagePath);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        error: access.reason || 'Access denied'
      });
    }
    
    // If filename is provided, stream the file
    if (filename) {
      const filePath = path.join(storagePath, filename);
      
      // Security: prevent directory traversal
      if (!filePath.startsWith(storagePath)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file path'
        });
      }
      
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }
      
      // Verify access to specific file
      const fileAccess = verifyFileAccess(req, filePath);
      if (!fileAccess.allowed) {
        return res.status(403).json({
          success: false,
          error: fileAccess.reason || 'Access denied'
        });
      }
      
      // Stream the file
      const ext = path.extname(filename).toLowerCase();
      const contentType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp'
      }[ext] || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error reading file'
          });
        }
      });
      
      return;
    }
    
    // No filename provided: list directory
    if (!fs.existsSync(storagePath)) {
      return res.json({
        success: true,
        files: [],
        directory: storagePath,
        count: 0
      });
    }
    
    const files = fs.readdirSync(storagePath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
      })
      .map(file => {
        const filePath = path.join(storagePath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          url: `/api/user-files/${req.params.id}?type=${fileType}&filename=${encodeURIComponent(file)}`
        };
      });
    
    res.json({
      success: true,
      files,
      directory: storagePath,
      count: files.length
    });
    
  } catch (error) {
    console.error('Error in GET /api/user-files/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * Configure multer storage for user file uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const user = req.user || req.session?.user;
      if (!user) {
        return cb(new Error('Authentication required'));
      }
      
      const fileType = (req.body.type || req.query.type || 'images').toLowerCase();
      const churchId = req.body.churchId ? parseInt(req.body.churchId, 10) : null;
      const username = req.body.username || null;
      
      // Determine storage path
      let storagePath;
      if (churchId && username) {
        storagePath = path.join(DATA_DIR, 'church', String(churchId).padStart(2, '0'), 'users', username, fileType);
      } else if (churchId) {
        storagePath = getChurchStoragePath(churchId, fileType);
      } else {
        storagePath = getUserStoragePath(user, fileType);
      }
      
      // Ensure directory exists
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
        console.log(`✅ Created user file directory: ${storagePath}`);
      }
      
      cb(null, storagePath);
    } catch (error) {
      console.error('Error in multer destination:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename but sanitize it
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    // Add timestamp to prevent overwrites
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    const timestamp = Date.now();
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

/**
 * POST /api/user-files/upload
 * Upload user files (avatar, banner, images, profile)
 * 
 * Form data:
 * - file: The file to upload
 * - type: 'avatar' | 'banner' | 'images' | 'profile' (default: 'images')
 * - churchId: church ID (optional, uses user's church if not provided)
 * - username: username (optional, uses current user if not provided)
 */
router.post('/upload', requireAuth, (req, res) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] 📤 POST /api/user-files/upload`, {
    userId: req.user?.id || req.session?.user?.id,
    userEmail: req.user?.email || req.session?.user?.email,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });
  
  // Wrap multer middleware to catch errors
  upload.single('file')(req, res, (multerErr) => {
    if (multerErr) {
      console.error(`[${requestId}] ❌ Multer error:`, multerErr);
      
      let statusCode = 400;
      let errorCode = 'UPLOAD_ERROR';
      
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        errorCode = 'FILE_TOO_LARGE';
        multerErr.message = `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
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
    
    try {
      // Validate file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided. Ensure field name is "file".',
          code: 'NO_FILE'
        });
      }
      
      const user = req.user || req.session?.user;
      const fileType = (req.body.type || req.query.type || 'images').toLowerCase();
      
      // Get file info
      const stats = fs.statSync(req.file.path);
      const ext = path.extname(req.file.filename).toLowerCase();
      
      console.log(`[${requestId}] ✅ File uploaded successfully:`, {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: stats.size,
        type: fileType,
        path: req.file.path
      });
      
      // Return success response
      res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          name: req.file.originalname,
          filename: req.file.filename,
          path: req.file.path,
          size: stats.size,
          type: fileType,
          url: `/api/user-files/${user.id}?type=${fileType}&filename=${encodeURIComponent(req.file.filename)}`
        }
      });
      
    } catch (error) {
      console.error(`[${requestId}] ❌ Error processing upload:`, error);
      
      // Clean up file if it was created
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        code: 'PROCESSING_ERROR'
      });
    }
  });
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

