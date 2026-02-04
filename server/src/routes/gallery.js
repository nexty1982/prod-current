const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { execSync } = require('child_process');

// Import services
// Detects context (dist vs source) and uses appropriate path
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let publicImagesFs, catalogSuggest;
if (isDist) {
  // Running from dist: only try dist path (src/ doesn't exist in dist)
  publicImagesFs = require('../services/publicImagesFs');
  catalogSuggest = require('../services/catalogSuggest');
} else {
  // Running from source: try dist path first, then src path
  try {
    publicImagesFs = require('../services/publicImagesFs');
    catalogSuggest = require('../services/catalogSuggest');
  } catch (e) {
    try {
      publicImagesFs = require('../services/publicImagesFs');
      catalogSuggest = require('../services/catalogSuggest');
    } catch (e2) {
      console.error('❌ Failed to load publicImagesFs service:', e2);
      throw new Error('Could not load publicImagesFs service. Check that the file exists in either server/src/services/ or server/services/');
    }
  }
}

const router = express.Router();

// Backward compatibility: get gallery directory (now uses new service)
// This maintains compatibility with existing code that references galleryDir
const getGalleryDirectory = () => {
  try {
    return publicImagesFs.resolveSafePath('gallery');
  } catch (error) {
    // If gallery doesn't exist, return the path anyway (will be created if needed)
    const imagesRoot = publicImagesFs.getImagesRoot();
    return path.join(imagesRoot, 'gallery');
  }
};

const galleryDir = getGalleryDirectory();

// DO NOT create directories on startup - only resolve path
// Directory creation should only happen in POST /mkdir and /upload endpoints
try {
  if (fs.existsSync(galleryDir)) {
    console.log(`✅ Gallery directory exists: ${galleryDir}`);
  } else {
    console.warn(`⚠️ Gallery directory does not exist: ${galleryDir} (will be created on first upload)`);
  }
} catch (error) {
  console.error(`❌ Error checking gallery directory: ${error.message}`);
}

// Test route to verify router is working
router.get('/', (req, res) => {
  console.log('✅ GET /api/gallery/ - Test route hit');
  res.json({ 
    success: true, 
    message: 'Gallery API is working',
    galleryDir: galleryDir,
    nodeEnv: process.env.NODE_ENV,
    exists: fs.existsSync(galleryDir)
  });
});

// Test POST route to verify POST requests work
router.post('/test', (req, res) => {
  console.log('✅✅✅ POST /api/gallery/test - Test POST route hit');
  console.log('Request headers:', req.headers);
  console.log('Request body keys:', Object.keys(req.body || {}));
  res.json({ 
    success: true, 
    message: 'Gallery POST API is working',
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : []
  });
});

/**
 * GET /api/gallery/images
 * Compatibility shim: Frontend always passes path/recursive params, so this
 * immediately passes through to the new handler below. Kept for backward
 * compatibility with any external tools that might call without params.
 */
router.get('/images', (req, res, next) => {
  // Frontend always passes path/recursive, so pass through immediately
  if (req.query.path !== undefined || req.query.recursive !== undefined) {
    return next(); // Pass to the new handler below
  }
  
  // Legacy fallback: return empty response if no params (shouldn't happen in practice)
  console.log('🖼️ GET /api/gallery/images (no params - using fallback)');
  return res.json({
    success: true,
    count: 0,
    images: [],
    message: 'Please provide path and recursive parameters. Use GET /api/gallery/images?path=<dir>&recursive=1'
  });
});

// Configure multer for gallery image uploads
// Updated to support targetDir from request body
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Get target directory from request body (parsed by multer or body-parser)
      const targetDir = req.body?.targetDir || 'gallery';
      const absPath = publicImagesFs.resolveSafePath(targetDir);
      
      // Ensure directory exists
      if (!fs.existsSync(absPath)) {
        fs.mkdirSync(absPath, { recursive: true });
      }
      
      cb(null, absPath);
    } catch (error) {
      // Use gallery directory as fallback
      const targetPath = targetDir ? path.join(publicImagesFs.getImagesRoot(), targetDir) : galleryDir;
      try {
        const safePath = targetDir ? publicImagesFs.resolveSafePath(targetDir) : galleryDir;
        if (!fs.existsSync(safePath)) {
          fs.mkdirSync(safePath, { recursive: true });
        }
        cb(null, safePath);
      } catch (error) {
        // Fallback to galleryDir if path resolution fails
        if (!fs.existsSync(galleryDir)) {
          fs.mkdirSync(galleryDir, { recursive: true });
        }
        cb(null, galleryDir);
      }
    }
  },
  filename: (req, file, cb) => {
    try {
      const targetDir = req.body?.targetDir || 'gallery';
      const absPath = publicImagesFs.resolveSafePath(targetDir);
      const autoNameMode = req.body?.autoNameMode || 'keep';
      
      // Sanitize filename based on mode
      let sanitized = publicImagesFs.sanitizeFilename(file.originalname, autoNameMode);
      
      // If sanitization changed the name significantly, ensure extension is preserved
      const originalExt = path.extname(file.originalname);
      if (!sanitized.endsWith(originalExt)) {
        sanitized = path.basename(sanitized, path.extname(sanitized)) + originalExt;
      }
      
      // Check if file already exists and make it unique if needed
      const ext = path.extname(sanitized);
      const baseName = path.basename(sanitized, ext);
      let finalName = sanitized;
      let counter = 1;
      
      while (fs.existsSync(path.join(absPath, finalName))) {
        finalName = `${baseName}_${counter}${ext}`;
        counter++;
      }
      
      cb(null, finalName);
    } catch (error) {
      // Fallback to simple sanitization
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const ext = path.extname(sanitized);
      const baseName = path.basename(sanitized, ext);
      let finalName = sanitized;
      let counter = 1;
      
      while (fs.existsSync(path.join(galleryDir, finalName))) {
        finalName = `${baseName}_${counter}${ext}`;
        counter++;
      }
      
      cb(null, finalName);
    }
  }
});

// File filter for images only - allows jpg, jpeg, png, gif, tiff, webp, svg
const fileFilter = (req, file, cb) => {
  // Allowed image extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp', '.svg'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/tiff',
    'image/webp',
    'image/svg+xml'
  ];
  
  // Check both MIME type and file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMimeType = file.mimetype && (file.mimetype.startsWith('image/') || allowedMimeTypes.includes(file.mimetype));
  const isValidExtension = allowedExtensions.includes(ext);
  
  if (isValidMimeType || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (matching Gallery component)
  }
});

/**
 * POST /api/gallery/upload
 * Upload a new image to the gallery directory
 */
router.post('/upload', (req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Log IMMEDIATELY when route is hit
  console.log(`[${requestId}] 🚀 ROUTE HIT: POST /api/gallery/upload`);
  console.log(`[${requestId}] Request headers:`, {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    method: req.method,
    path: req.path
  });
  
  try {
    // Ensure upload is defined
    if (!upload) {
      console.error(`[${requestId}] ❌ Upload middleware not initialized`);
      throw new Error('Multer upload middleware is not initialized.');
    }

    // Initial logging
    console.log(`[${requestId}] 📤 Starting upload processing`, {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      timestamp: new Date().toISOString()
    });

    // Wrap multer middleware to catch errors
    upload.single('image')(req, res, (multerErr) => {
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
        multerErr.message = 'Maximum file size is 10MB';
      } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
        errorCode = 'UNEXPECTED_FIELD';
        multerErr.message = 'Unexpected field name. Expected field name: "image"';
      }
      
      return res.status(statusCode).json({
        success: false,
        error: multerErr.message || 'File upload error',
        code: errorCode
      });
    }
    
    // Continue with upload processing
    try {
      console.log(`[${requestId}] ✅ Multer processing complete, file received:`, {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
      });

      if (!req.file) {
        console.error(`[${requestId}] ❌ No file in request`);
        return res.status(400).json({ 
          success: false,
          error: 'No image file provided',
          message: 'Please select an image file to upload',
          code: 'NO_FILE'
        });
      }

      const { filename, originalname, size, mimetype, path: filePath } = req.file;
      
      // Extract target directory from file path to build correct URL
      // filePath is absolute (e.g., /var/www/.../front-end/public/images/logos/image.png)
      // We need to extract the relative path from images root
      let imageUrl;
      try {
        const imagesRoot = publicImagesFs.getImagesRoot();
        const relativePath = path.relative(imagesRoot, filePath);
        // Normalize path separators and build URL
        const normalizedPath = relativePath.replace(/\\/g, '/');
        imageUrl = `/images/${normalizedPath}`;
      } catch (error) {
        // Fallback: try to extract directory from targetDir in request body
        const targetDir = req.body?.targetDir || 'gallery';
        imageUrl = `/images/${targetDir}/${filename}`;
      }
      
      // Add cache-busting query parameter using current timestamp
      const cacheBuster = Date.now();
      imageUrl = `${imageUrl}?v=${cacheBuster}`;

      // Verify file was actually saved (multer should have written it by now)
      if (!fs.existsSync(filePath)) {
        console.error(`[${requestId}] ❌ File was not saved to disk:`, filePath);
        return res.status(500).json({
          success: false,
          error: 'File was not saved to disk',
          code: 'FILE_SAVE_ERROR'
        });
      }

      // Get file stats to verify the file was written correctly
      try {
        const stats = fs.statSync(filePath);
        // Verify the file size matches what was uploaded
        if (stats.size !== size) {
          console.warn(`[${requestId}] ⚠️ File size mismatch: uploaded ${size}, saved ${stats.size}`);
        }
        console.log(`[${requestId}] ✅ Upload successful:`, {
          filename,
          originalname,
          size,
          mimetype,
          url: imageUrl,
          path: filePath,
          savedSize: stats.size,
          exists: true,
          sizeMatch: stats.size === size
        });
      } catch (statError) {
        console.error(`[${requestId}] ❌ Error getting file stats:`, statError);
        // Continue anyway, file might still be there
      }

      // Send response
      try {
        res.status(200).json({
          success: true,
          message: 'Image uploaded successfully',
          image: {
            filename,
            original_name: originalname,
            size,
            mime_type: mimetype,
            url: imageUrl
          }
        });
        console.log(`[${requestId}] ✅ Response sent successfully`);
      } catch (responseError) {
        console.error(`[${requestId}] ❌ Error sending response:`, {
          message: responseError.message,
          stack: responseError.stack
        });
        // Response already sent or headers sent, can't send another
        throw responseError;
      }
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in gallery upload:`, {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Clean up uploaded file if there was an error
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
    console.error(`[${requestId || 'unknown'}] ❌ Outer error in gallery upload route:`, {
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
 * POST /api/gallery/delete
 * Delete an image from the gallery directory
 */
router.post('/delete', (req, res) => {
  try {
    const { path: imagePath } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ 
        success: false,
        error: 'Image path is required',
        message: 'Please provide the path to the image to delete'
      });
    }

    // Extract relative path from imagePath (e.g., /images/logos/image.png -> logos/image.png)
    // Remove leading /images/ prefix if present
    let relativePath = imagePath.replace(/^\/images\//, '').replace(/^\//, '');
    if (!relativePath) {
      // Fallback: extract just filename
      relativePath = imagePath.split('/').pop();
    }
    
    // Resolve safe path using the service
    let filePath;
    try {
      filePath = publicImagesFs.resolveSafePath(relativePath);
    } catch (error) {
      // Fallback to galleryDir if path resolution fails
      const filename = imagePath.split('/').pop();
      filePath = path.join(galleryDir, filename);
    }

    // Security check: ensure the file is within the gallery directory
    const resolvedPath = path.resolve(filePath);
    const resolvedGalleryDir = path.resolve(galleryDir);
    
    if (!resolvedPath.startsWith(resolvedGalleryDir)) {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid path',
        message: 'Cannot delete files outside gallery directory'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        error: 'File not found',
        message: `Image not found: ${filename}`
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    
    console.log(`✅ Deleted gallery image: ${filename}`);
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
      deleted: filename
    });
  } catch (error) {
    console.error('❌ Error deleting gallery image:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete image',
      message: error.message
    });
  }
});

/**
 * POST /api/gallery/check-usage
 * Check if images are being used in the codebase
 * Body: { images: [{ name: string, path: string }] }
 * Returns: { success: true, usage: { [imageName]: boolean } }
 */
router.post('/check-usage', async (req, res) => {
  // Set a timeout for this request (30 seconds)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'Usage check took too long. The codebase may be too large. Try checking fewer images at once.'
      });
    }
  }, 30000);

  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'Images array is required'
      });
    }

    // Process all images - no hard limit
    // Frontend batches requests in groups of 500 to avoid overwhelming the server
    // Backend processes all images it receives efficiently
    const imagesToCheck = images;

    // Get the front-end source directory
    // IMPORTANT: Never create directories in front-end - only read existing ones
    const getFrontEndDir = () => {
      if (process.env.NODE_ENV === 'production') {
        return '/var/www/orthodoxmetrics/prod/front-end';
      }
      
      // When running from dist/, __dirname is dist/routes
      // When running from server/, __dirname is server/routes
      // Calculate paths relative to server root, not dist root
      const serverRoot = path.resolve(__dirname, '../..'); // Go up from routes to server root
      const projectRoot = path.resolve(serverRoot, '..'); // Go up from server to project root
      
      const possiblePaths = [
        path.join(projectRoot, 'front-end'), // Most common: project-root/front-end
        path.join(serverRoot, '../front-end'), // Fallback: server/../front-end
        '/var/www/orthodoxmetrics/prod/front-end', // Production fallback
      ];
      
      // Only return paths that actually exist - never create directories
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          return possiblePath;
        }
      }
      
      // If none exist, return null instead of creating a directory
      return null;
    };

    const frontEndDir = getFrontEndDir();
    if (!frontEndDir || !fs.existsSync(frontEndDir)) {
      clearTimeout(timeout);
      return res.status(500).json({
        success: false,
        error: 'Front-end directory not found',
        message: 'Could not locate front-end directory. Please ensure front-end directory exists at project root.'
      });
    }

    const usageMap = {};
    let checkedCount = 0;

    // For each image, check if it's referenced in the codebase
    // Use a simpler, faster approach that doesn't block
    for (const image of imagesToCheck) {
      const imageName = image.name || path.basename(image.path || '');
      // Use the actual image path from API, or construct from name if missing
      // API should always provide path, but handle gracefully if not
      const imagePath = image.path || (imageName ? `/images/${imageName}` : '');
      
      // Extract just the filename for searching
      const fileName = path.basename(imagePath);
      const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
      
      // Search patterns to look for (simplified)
      const searchPatterns = [
        fileName, // Full filename
        imagePath, // Full path
        `images/gallery/${fileName}`, // Relative path
      ];

      let isUsed = false;

      try {
        // Use a simple file system search instead of grep for reliability
        // This is slower but more reliable and won't hang
        const srcDir = path.join(frontEndDir, 'src');
        if (fs.existsSync(srcDir)) {
          const searchInDirectory = (dir, depth = 0, maxDepth = 5) => {
            if (depth > maxDepth) return false;
            
            try {
              const files = fs.readdirSync(dir, { withFileTypes: true });
              
              for (const file of files) {
                // Skip large directories
                if (file.name === 'node_modules' || 
                    file.name === '.git' || 
                    file.name === 'dist' || 
                    file.name === 'build' ||
                    file.name.startsWith('.')) {
                  continue;
                }
                
                const fullPath = path.join(dir, file.name);
                
                if (file.isDirectory()) {
                  if (searchInDirectory(fullPath, depth + 1, maxDepth)) {
                    return true;
                  }
                } else if (file.isFile()) {
                  const ext = path.extname(file.name).toLowerCase();
                  if (['.tsx', '.ts', '.js', '.jsx', '.html', '.css', '.scss', '.json'].includes(ext)) {
                    try {
                      // Read entire file (not just first 50KB) for better accuracy
                      // But limit to 200KB to prevent memory issues
                      const stats = fs.statSync(fullPath);
                      let content;
                      if (stats.size > 200 * 1024) {
                        // For large files, only read first 200KB
                        const fd = fs.openSync(fullPath, 'r');
                        const buffer = Buffer.alloc(200 * 1024);
                        fs.readSync(fd, buffer, 0, 200 * 1024, 0);
                        fs.closeSync(fd);
                        content = buffer.toString('utf-8');
                      } else {
                        // For smaller files, read entire content
                        content = fs.readFileSync(fullPath, { encoding: 'utf-8', flag: 'r' });
                      }
                      if (searchPatterns.some(pattern => content.includes(pattern))) {
                        return true;
                      }
                    } catch (readError) {
                      // Skip files that can't be read
                    }
                  }
                }
              }
            } catch (dirError) {
              // Skip directories that can't be read
            }
            
            return false;
          };
          
          isUsed = searchInDirectory(srcDir);
        } else {
          isUsed = false;
        }
      } catch (error) {
        // If search fails, mark as not used
        isUsed = false;
      }

      usageMap[imageName] = isUsed;
      checkedCount++;
    }

    clearTimeout(timeout);
    res.json({
      success: true,
      usage: usageMap,
      checked: checkedCount,
      total: images.length,
      limited: false // No longer limiting
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error checking image usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check image usage',
      message: error.message
    });
  }
});

/**
 * GET /api/gallery/used-images
 * Returns a list of all images that are actively being used in production
 * Query params: format=json|csv|txt (default: json)
 */
router.get('/used-images', (req, res) => {
  // Set a timeout for this request (60 seconds)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'Generating used images list took too long. The codebase may be too large. Please try again later or contact support.'
      });
    }
  }, 60000);

  try {
    const format = req.query.format || 'json';
    const { execSync } = require('child_process');
    
    // Get the front-end source directory
    // IMPORTANT: Never create directories in front-end - only read existing ones
    const getFrontEndDir = () => {
      if (process.env.NODE_ENV === 'production') {
        return '/var/www/orthodoxmetrics/prod/front-end';
      }
      
      // When running from dist/, __dirname is dist/routes
      // When running from server/, __dirname is server/routes
      // Calculate paths relative to server root, not dist root
      const serverRoot = path.resolve(__dirname, '../..'); // Go up from routes to server root
      const projectRoot = path.resolve(serverRoot, '..'); // Go up from server to project root
      
      const possiblePaths = [
        path.join(projectRoot, 'front-end'), // Most common: project-root/front-end
        path.join(serverRoot, '../front-end'), // Fallback: server/../front-end
        '/var/www/orthodoxmetrics/prod/front-end', // Production fallback
      ];
      
      // Only return paths that actually exist - never create directories
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          return possiblePath;
        }
      }
      
      // If none exist, return null instead of creating a directory
      return null;
    };

    const frontEndDir = getFrontEndDir();
    if (!frontEndDir || !fs.existsSync(frontEndDir)) {
      clearTimeout(timeout);
      return res.status(500).json({
        success: false,
        error: 'Front-end directory not found',
        message: 'Could not locate front-end directory. Please ensure front-end directory exists at project root.'
      });
    }

    const imagesDir = path.join(frontEndDir, 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      clearTimeout(timeout);
      return res.status(404).json({
        success: false,
        error: 'Images directory not found',
        message: `Images directory does not exist: ${imagesDir}`
      });
    }
    
    // Find all image files recursively
    const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tiff', '.bmp'];
    const findImageFiles = (dir, basePath = '') => {
      const imageFiles = [];
      
      if (!fs.existsSync(dir)) {
        return imageFiles;
      }
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || 
              entry.name === 'node_modules' || 
              entry.name === 'dist' || 
              entry.name === 'build') {
            continue;
          }
          
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(basePath, entry.name);
          
          if (entry.isDirectory()) {
            imageFiles.push(...findImageFiles(fullPath, relativePath));
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTENSIONS.includes(ext)) {
              try {
                const stats = fs.statSync(fullPath);
                // Validate stats
                if (!stats || typeof stats.size !== 'number' || !stats.mtime) {
                  imageFiles.push({
                    name: entry.name,
                    path: `/images/${relativePath.replace(/\\/g, '/')}`,
                    fullPath: fullPath,
                    size: null,
                    modified: null,
                    type: ext.substring(1),
                    metadataStatus: 'error',
                    statError: 'Invalid file stats returned by filesystem'
                  });
                } else {
                  imageFiles.push({
                    name: entry.name,
                    path: `/images/${relativePath.replace(/\\/g, '/')}`,
                    fullPath: fullPath,
                    size: stats.size, // Always numeric bytes
                    modified: stats.mtime.toISOString(), // Always ISO string
                    type: ext.substring(1),
                    metadataStatus: 'ok'
                  });
                }
              } catch (statError) {
                // Include file with error status instead of skipping
                imageFiles.push({
                  name: entry.name,
                  path: `/images/${relativePath.replace(/\\/g, '/')}`,
                  fullPath: fullPath,
                  size: null,
                  modified: null,
                  type: ext.substring(1),
                  metadataStatus: 'error',
                  statError: statError.message || 'Failed to read file stats'
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}:`, error.message);
      }
      
      return imageFiles;
    };

    // Check if image is used (file system search - more reliable than grep)
    const checkImageUsage = (imagePath, imageName) => {
      const fileName = path.basename(imagePath);
      const searchPatterns = [fileName, imagePath, `images/${fileName}`];
      const references = [];
      
      try {
        const srcDir = path.join(frontEndDir, 'src');
        if (!fs.existsSync(srcDir)) {
          return { isUsed: false, referencedIn: [] };
        }

        // Use file system search instead of grep for reliability
        const searchInDirectory = (dir, depth = 0, maxDepth = 5) => {
          if (depth > maxDepth) return references.length > 0;
          
          try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const file of files) {
              // Skip large directories
              if (file.name === 'node_modules' || 
                  file.name === '.git' || 
                  file.name === 'dist' || 
                  file.name === 'build' ||
                  file.name.startsWith('.')) {
                continue;
              }
              
              const fullPath = path.join(dir, file.name);
              
              if (file.isDirectory()) {
                searchInDirectory(fullPath, depth + 1, maxDepth);
                if (references.length >= 5) {
                  return true; // Found enough references
                }
              } else if (file.isFile()) {
                const ext = path.extname(file.name).toLowerCase();
                if (['.tsx', '.ts', '.js', '.jsx', '.html', '.css', '.scss', '.json'].includes(ext)) {
                  try {
                    // Read entire file (up to 200KB) for better accuracy
                    const stats = fs.statSync(fullPath);
                    let content;
                    if (stats.size > 200 * 1024) {
                      // For large files, only read first 200KB
                      const fd = fs.openSync(fullPath, 'r');
                      const buffer = Buffer.alloc(200 * 1024);
                      fs.readSync(fd, buffer, 0, 200 * 1024, 0);
                      fs.closeSync(fd);
                      content = buffer.toString('utf-8');
                    } else {
                      // For smaller files, read entire content
                      content = fs.readFileSync(fullPath, { encoding: 'utf-8', flag: 'r' });
                    }
                    if (searchPatterns.some(pattern => content.includes(pattern))) {
                      references.push(path.relative(frontEndDir, fullPath));
                      if (references.length >= 5) {
                        return true; // Found enough references
                      }
                    }
                  } catch (readError) {
                    // Skip files that can't be read
                  }
                }
              }
            }
          } catch (dirError) {
            // Skip directories that can't be read
          }
          
          return references.length > 0;
        };
        
        const found = searchInDirectory(srcDir);
        return {
          isUsed: found,
          referencedIn: references.slice(0, 5)
        };
      } catch (error) {
        // If search fails, assume not used
        return { isUsed: false, referencedIn: [] };
      }
    };

    // Find all images
    const allImages = findImageFiles(imagesDir);
    console.log(`Found ${allImages.length} total images to check`);
    
    // Support pagination via query params
    const offset = parseInt(req.query.offset || '0', 10);
    const limit = parseInt(req.query.limit || '200', 10);
    const paginated = req.query.offset !== undefined || req.query.limit !== undefined;
    
    // If pagination requested, only process the requested range
    // Otherwise, process all images (for backward compatibility)
    const imagesToCheck = paginated 
      ? allImages.slice(offset, offset + limit)
      : allImages;
    
    // Check usage for each image in the batch
    const usedImages = [];
    let checked = 0;
    
    for (const image of imagesToCheck) {
      checked++;
      if (checked % 50 === 0) {
        console.log(`Checked ${checked}/${imagesToCheck.length} images...`);
      }
      
      const usage = checkImageUsage(image.path, image.name);
      if (usage.isUsed) {
        usedImages.push({
          name: image.name,
          path: image.path,
          size: image.size,
          type: image.type,
          modified: image.modified,
          referencedIn: usage.referencedIn
        });
      }
    }
    
    console.log(`Usage check complete: ${usedImages.length} used images found out of ${checked} checked (offset: ${offset}, limit: ${limit})`);

    clearTimeout(timeout);
    
    // Format output
    if (format === 'csv') {
      const headers = ['Name', 'Path', 'Size (bytes)', 'Type', 'Modified', 'Referenced In'];
      const rows = usedImages.map(img => [
        img.name,
        img.path,
        img.size,
        img.type,
        img.modified,
        img.referencedIn.join('; ')
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="used-images-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else if (format === 'txt') {
      let output = `# Images Actively Used in Production\n\n`;
      output += `Generated: ${new Date().toISOString()}\n`;
      output += `Total Images: ${allImages.length}\n`;
      output += `Checked Images: ${checked} (offset: ${offset}, limit: ${limit})\n`;
      output += `Used Images: ${usedImages.length}\n`;
      if (paginated && offset + limit < allImages.length) {
        output += `Note: This is a paginated result. More images available.\n`;
      }
      output += `\n## Used Images (${usedImages.length})\n\n`;
      
      usedImages.forEach((img, index) => {
        output += `${index + 1}. **${img.name}**\n`;
        output += `   - Path: ${img.path}\n`;
        output += `   - Size: ${(img.size / 1024).toFixed(2)} KB\n`;
        output += `   - Type: ${img.type.toUpperCase()}\n`;
        output += `   - Modified: ${new Date(img.modified).toLocaleString()}\n`;
        if (img.referencedIn && img.referencedIn.length > 0) {
          output += `   - Referenced in:\n`;
          img.referencedIn.forEach(ref => {
            output += `     - ${ref}\n`;
          });
        }
        output += `\n`;
      });
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="used-images-${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(output);
    } else {
      // JSON format (default)
      res.json({
        success: true,
        generated_at: new Date().toISOString(),
        total_images: allImages.length,
        checked_images: checked,
        used_images: usedImages.length,
        unused_images: allImages.length - usedImages.length,
        limited: false, // No longer limiting
        paginated: paginated,
        offset: offset,
        limit: limit,
        has_more: paginated && (offset + limit < allImages.length),
        used: usedImages
      });
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error generating used images list:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate used images list',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/gallery/tree
 * Returns directory tree structure for public/images
 * Query params: path (relative path, default ""), depth (default 2), debug (optional)
 * 
 * IMPORTANT: This endpoint does NOT create directories. It only reads existing ones.
 */
router.get('/tree', (req, res) => {
  try {
    const subPath = req.query.path || '';
    const depth = parseInt(req.query.depth || '2', 10);
    const debug = req.query.debug === '1';
    
    console.log(`🌳 GET /api/gallery/tree - path="${subPath}", depth=${depth}, debug=${debug}`);
    
    // Get images root for debug info
    let imagesRoot;
    let rootExists = false;
    let rootCanRead = false;
    let rootCanWrite = false;
    let firstEntries = [];
    
    try {
      imagesRoot = publicImagesFs.getImagesRoot();
      console.log(`🌳 Resolved images root: ${imagesRoot}`);
      rootExists = fs.existsSync(imagesRoot);
      console.log(`🌳 Images root exists: ${rootExists}`);
      
      if (rootExists) {
        try {
          fs.accessSync(imagesRoot, fs.constants.R_OK);
          rootCanRead = true;
          console.log(`🌳 Images root is readable`);
        } catch (e) {
          console.error(`🌳 Images root is NOT readable:`, e.message);
        }
        try {
          fs.accessSync(imagesRoot, fs.constants.W_OK);
          rootCanWrite = true;
        } catch (e) {}
        
        if (rootCanRead) {
          try {
            const entries = fs.readdirSync(imagesRoot, { withFileTypes: true });
            console.log(`🌳 Found ${entries.length} entries in images root`);
            firstEntries = entries.slice(0, 5).map(e => ({
              name: e.name,
              isDirectory: e.isDirectory(),
              isFile: e.isFile()
            }));
            if (debug) {
              console.log(`🌳 First 5 entries:`, firstEntries);
            }
          } catch (e) {
            console.error(`🌳 Error reading images root:`, e.message);
            firstEntries = [{ error: e.message }];
          }
        }
      } else {
        console.error(`🌳 Images root does not exist: ${imagesRoot}`);
      }
    } catch (rootError) {
      console.error(`🌳 Failed to resolve images root:`, rootError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to resolve images root',
        message: rootError.message,
        ...(debug && { computedPath: imagesRoot })
      });
    }
    
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.tiff', '.webp', '.svg'];
    
    const buildTree = (dirPath, currentDepth = 0) => {
      if (currentDepth > depth) {
        return { directories: [], files: [] };
      }
      
      try {
        let absPath;
        if (dirPath === '' || dirPath === '/') {
          absPath = imagesRoot;
        } else {
          absPath = publicImagesFs.resolveSafePath(dirPath);
        }
        
        if (debug && currentDepth === 0) {
          console.log(`🌳 buildTree: dirPath="${dirPath}", absPath="${absPath}"`);
        }
        
        // DO NOT create directory - only check if it exists
        if (!fs.existsSync(absPath)) {
          if (debug) {
            console.log(`🌳 Path does not exist: ${absPath}`);
          }
          return { directories: [], files: [] };
        }
        
        const stats = fs.statSync(absPath);
        if (!stats.isDirectory()) {
          if (debug) {
            console.log(`🌳 Path is not a directory: ${absPath}`);
          }
          return { directories: [], files: [] };
        }
        
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        if (debug && currentDepth === 0) {
          console.log(`🌳 Found ${entries.length} entries in ${absPath}`);
        }
        
        const directories = [];
        const files = [];
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          
          const fullPath = path.join(absPath, entry.name);
          const relativePath = subPath ? `${subPath}/${entry.name}` : entry.name;
          
          if (entry.isDirectory()) {
            const children = buildTree(relativePath, currentDepth + 1);
            directories.push({
              name: entry.name,
              path: relativePath,
              childrenCount: children.directories.length + children.files.length
            });
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (imageExtensions.includes(ext)) {
              try {
                const stats = fs.statSync(fullPath);
                const urlPath = publicImagesFs.getUrlPath(relativePath);
                const cacheBuster = stats.mtime.getTime();
                
                files.push({
                  name: entry.name,
                  path: urlPath,
                  url: `${urlPath}?v=${cacheBuster}`,
                  size: stats.size,
                  created: (stats.birthtime && stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime).toISOString(),
                  modified: stats.mtime.toISOString(),
                  ext: ext.substring(1),
                  metadataStatus: 'ok'
                });
              } catch (statError) {
                const urlPath = publicImagesFs.getUrlPath(relativePath);
                files.push({
                  name: entry.name,
                  path: urlPath,
                  url: urlPath,
                  size: null,
                  created: null,
                  modified: null,
                  ext: ext.substring(1),
                  metadataStatus: 'error',
                  statError: statError.message
                });
              }
            }
          }
        }
        
        return { directories, files };
      } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return { directories: [], files: [] };
      }
    };
    
    const tree = buildTree(subPath);
    
    res.json({
      success: true,
      path: subPath || '/',
      depth,
      ...tree
    });
  } catch (error) {
    console.error('Error building directory tree:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to build directory tree'
    });
  }
});

/**
 * GET /api/gallery/images (NEW - with path support)
 * Updated to support path parameter and recursive listing
 * 
 * IMPORTANT: This endpoint does NOT create directories. It only reads existing ones.
 */
router.get('/images', (req, res) => {
  console.log('🖼️ GET /api/gallery/images - Request received');
  console.log('🖼️ Query params:', req.query);
  
  try {
    const subPath = req.query.path !== undefined ? req.query.path : ''; // Default to empty (root) to show all images
    const recursive = req.query.recursive === '1' || req.query.recursive === 'true';
    const debug = req.query.debug === '1';
    
    console.log(`🖼️ Loading images from path: "${subPath}", recursive: ${recursive}`);
    
    // Get images root for debug info
    let imagesRoot;
    let rootExists = false;
    let rootCanRead = false;
    
    try {
      imagesRoot = publicImagesFs.getImagesRoot();
      console.log(`🖼️ Resolved images root: ${imagesRoot}`);
      rootExists = fs.existsSync(imagesRoot);
      console.log(`🖼️ Images root exists: ${rootExists}`);
      
      if (rootExists) {
        try {
          fs.accessSync(imagesRoot, fs.constants.R_OK);
          rootCanRead = true;
          console.log(`🖼️ Images root is readable`);
        } catch (e) {
          console.error(`🖼️ Images root is NOT readable:`, e.message);
        }
      } else {
        console.error(`🖼️ Images root does not exist: ${imagesRoot}`);
      }
    } catch (rootError) {
      console.error(`🖼️ Failed to resolve images root:`, rootError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to resolve images root',
        message: rootError.message,
        ...(debug && { computedPath: imagesRoot })
      });
    }
    
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.tiff', '.webp', '.svg'];
    
    const getAllImageFiles = (dir, basePath = '') => {
      const imageFiles = [];
      
      try {
        let absPath;
        if (dir === '' || dir === '/') {
          absPath = imagesRoot;
        } else {
          try {
            absPath = publicImagesFs.resolveSafePath(dir);
          } catch (pathError) {
            console.error(`❌ Path resolution error for "${dir}":`, pathError.message);
            return imageFiles; // Return empty array if path is invalid
          }
        }
        
        // DO NOT create directory - only check if it exists
        if (!fs.existsSync(absPath)) {
          console.warn(`⚠️ Path does not exist: ${absPath}`);
          return imageFiles;
        }
        
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          
          const fullPath = path.join(absPath, entry.name);
          const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
          
          if (entry.isDirectory() && recursive) {
            imageFiles.push(...getAllImageFiles(relativePath, relativePath));
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (imageExtensions.includes(ext)) {
              try {
                const stats = fs.statSync(fullPath);
                const urlPath = publicImagesFs.getUrlPath(relativePath);
                const cacheBuster = stats.mtime.getTime();
                const createdDate = stats.birthtime && stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime;
                
                imageFiles.push({
                  name: entry.name,
                  path: urlPath,
                  url: `${urlPath}?v=${cacheBuster}`,
                  size: stats.size,
                  created: createdDate.toISOString(),
                  modified: stats.mtime.toISOString(),
                  type: ext.substring(1),
                  metadataStatus: 'ok'
                });
              } catch (statError) {
                const urlPath = publicImagesFs.getUrlPath(relativePath);
                imageFiles.push({
                  name: entry.name,
                  path: urlPath,
                  url: urlPath,
                  size: null,
                  created: null,
                  modified: null,
                  type: ext.substring(1),
                  metadataStatus: 'error',
                  statError: statError.message || 'Failed to read file stats'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
      
      return imageFiles;
    };
    
    // Pass subPath as initial basePath so files in subdirectories get correct relative paths
    // For root (empty path), use empty string as basePath
    const basePathForRecursion = subPath === '' ? '' : subPath;
    const imageFiles = getAllImageFiles(subPath, basePathForRecursion);
    console.log(`🖼️ Found ${imageFiles.length} image files (before sorting)`);
    
    const sortedImageFiles = imageFiles.sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : 0;
      const dateB = b.created ? new Date(b.created).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return a.name.localeCompare(b.name);
    });
    
    if (debug) {
      const sample = sortedImageFiles[0] || {};
      console.log('🔍 [DEBUG] Sample image object keys:', Object.keys(sample));
      console.log('🔍 [DEBUG] Sample image object:', JSON.stringify(sample, null, 2));
    }
    
    console.log(`✅ Returning ${sortedImageFiles.length} images with metadata`);
    
    const response = {
      success: true,
      count: sortedImageFiles.length,
      path: subPath,
      recursive,
      scope: subPath === '' ? 'all-images' : (subPath === 'gallery' ? 'gallery-only' : 'directory-specific'),
      images: sortedImageFiles
    };
    
    // Add debug info if requested
    if (debug) {
      response.debug = {
        resolvedImagesRoot: imagesRoot,
        rootExists,
        rootCanRead,
        sampleImage: sortedImageFiles[0] || null,
        nodeEnv: process.env.NODE_ENV
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error reading images:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to read images',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      images: []
    });
  }
});

/**
 * POST /api/gallery/mkdir
 * Create a new directory
 * Body: { path: "newdir" }
 */
router.post('/mkdir', (req, res) => {
  try {
    const { path: dirPath } = req.body;
    
    if (!dirPath || typeof dirPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path is required',
        code: 'MISSING_PATH'
      });
    }
    
    let absPath;
    try {
      absPath = publicImagesFs.resolveSafePath(dirPath);
    } catch (pathError) {
      return res.status(400).json({
        success: false,
        error: pathError.message || 'Invalid path',
        code: 'INVALID_PATH',
        path: dirPath
      });
    }
    
    if (fs.existsSync(absPath)) {
      const stats = fs.statSync(absPath);
      return res.status(409).json({
        success: false,
        error: stats.isDirectory() ? 'Directory already exists' : 'Path exists but is not a directory',
        code: 'ALREADY_EXISTS',
        path: absPath
      });
    }
    
    // Ensure parent directory exists and is writable
    const parentDir = path.dirname(absPath);
    if (!fs.existsSync(parentDir)) {
      return res.status(400).json({
        success: false,
        error: `Parent directory does not exist: ${parentDir}`,
        code: 'ENOENT',
        path: absPath,
        parentPath: parentDir
      });
    }
    
    try {
      fs.accessSync(parentDir, fs.constants.W_OK);
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        error: `Permission denied: cannot write to parent directory`,
        code: accessError.code || 'EACCES',
        path: absPath,
        parentPath: parentDir,
        errno: accessError.errno
      });
    }
    
    try {
      fs.mkdirSync(absPath, { recursive: true });
      
      res.json({
        success: true,
        message: 'Directory created successfully',
        path: dirPath,
        absolutePath: absPath
      });
    } catch (mkdirError) {
      console.error('Error creating directory:', mkdirError);
      return res.status(500).json({
        success: false,
        error: mkdirError.message || 'Failed to create directory',
        code: mkdirError.code || 'UNKNOWN',
        path: absPath,
        errno: mkdirError.errno
      });
    }
  } catch (error) {
    console.error('Error in mkdir endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create directory',
      code: error.code || 'UNKNOWN',
      path: error.path || req.body?.path
    });
  }
});

/**
 * POST /api/gallery/rmdir
 * Delete a directory
 * Body: { path: "dir", recursive: false }
 */
router.post('/rmdir', (req, res) => {
  try {
    const { path: dirPath, recursive = false } = req.body;
    
    if (!dirPath || typeof dirPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path is required'
      });
    }
    
    const absPath = publicImagesFs.resolveSafePath(dirPath);
    
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        success: false,
        error: 'Directory not found'
      });
    }
    
    const stats = fs.statSync(absPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Path is not a directory'
      });
    }
    
    if (recursive) {
      fs.rmSync(absPath, { recursive: true, force: true });
    } else {
      // Check if directory is empty
      const entries = fs.readdirSync(absPath);
      if (entries.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Directory is not empty. Use recursive: true to delete with contents.'
        });
      }
      fs.rmdirSync(absPath);
    }
    
    res.json({
      success: true,
      message: 'Directory deleted successfully',
      path: dirPath
    });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete directory'
    });
  }
});

/**
 * POST /api/gallery/cleanup-empty-dirs
 * Automatically delete directories that contain no image files
 * Response: { success: true, deleted: ["dir1", "dir2"], count: 2 }
 */
router.post('/cleanup-empty-dirs', (req, res) => {
  try {
    const imagesRoot = publicImagesFs.getImagesRoot();
    const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tiff', '.bmp'];
    const deleted = [];
    
    // Recursively find and delete empty directories
    // Returns true if directory was deleted, false if it still exists (has images or subdirs)
    const checkAndDeleteEmptyDir = (dirPath) => {
      if (!fs.existsSync(dirPath)) {
        return false;
      }
      
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return false;
      }
      
      // Check if directory contains any image files
      let hasImages = false;
      let hasNonEmptySubdirs = false;
      
      try {
        let entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        // First, process subdirectories recursively
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDirPath = path.join(dirPath, entry.name);
            const subDirWasDeleted = checkAndDeleteEmptyDir(subDirPath);
            if (!subDirWasDeleted) {
              // Subdirectory still exists, so it must have images or non-empty subdirs
              hasNonEmptySubdirs = true;
            }
          }
        }
        
        // Re-read entries after potentially deleting subdirectories
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        // Check for image files in current directory
        for (const entry of entries) {
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTENSIONS.includes(ext)) {
              hasImages = true;
              break; // Found an image, no need to continue
            }
          } else if (entry.isDirectory()) {
            // If there are still subdirectories after cleanup, mark as having non-empty subdirs
            hasNonEmptySubdirs = true;
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return false; // Can't read, don't delete
      }
      
      // If directory has no images and no non-empty subdirectories, delete it
      if (!hasImages && !hasNonEmptySubdirs) {
        try {
          // Final check that directory is still empty (in case of race conditions)
          const finalEntries = fs.readdirSync(dirPath);
          if (finalEntries.length === 0) {
            fs.rmdirSync(dirPath);
            const relativePath = publicImagesFs.getRelativePath(dirPath);
            deleted.push(relativePath);
            console.log(`🗑️ Deleted empty directory: ${relativePath}`);
            return true; // Directory was deleted
          }
        } catch (deleteError) {
          console.error(`Error deleting directory ${dirPath}:`, deleteError);
          return false;
        }
      }
      
      return false; // Directory not deleted (has images or non-empty subdirs)
    };
    
    // Start from images root and check all first-level directories
    try {
      const entries = fs.readdirSync(imagesRoot, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(imagesRoot, entry.name);
          checkAndDeleteEmptyDir(dirPath);
        }
      }
    } catch (error) {
      console.error('Error reading images root:', error);
      return res.status(500).json({
        success: false,
        error: `Failed to read images root: ${error.message}`
      });
    }
    
    res.json({
      success: true,
      deleted,
      count: deleted.length,
      message: deleted.length > 0 
        ? `Deleted ${deleted.length} empty directory(ies)` 
        : 'No empty directories found'
    });
  } catch (error) {
    console.error('Error cleaning up empty directories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cleanup empty directories'
    });
  }
});

/**
 * POST /api/gallery/move
 * Move or rename a file/directory
 * Body: { from: "old/path.png", to: "new/path.png", overwrite: false }
 */
router.post('/move', (req, res) => {
  try {
    const { from, to, overwrite = false } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Both "from" and "to" paths are required'
      });
    }
    
    const fromPath = publicImagesFs.resolveSafePath(from);
    const toPath = publicImagesFs.resolveSafePath(to);
    
    if (!fs.existsSync(fromPath)) {
      return res.status(404).json({
        success: false,
        error: 'Source path not found'
      });
    }
    
    if (fs.existsSync(toPath) && !overwrite) {
      return res.status(409).json({
        success: false,
        error: 'Target path already exists. Set overwrite: true to replace.'
      });
    }
    
    // Ensure target directory exists
    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
      fs.mkdirSync(toDir, { recursive: true });
    }
    
    // Use fs.rename for atomic move (same volume)
    fs.renameSync(fromPath, toPath);
    
    res.json({
      success: true,
      message: 'File moved successfully',
      from,
      to
    });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to move file'
    });
  }
});

/**
 * POST /api/gallery/rename
 * Rename a file or directory
 * Body: { path: "dir/or/file", newName: "..." }
 */
router.post('/rename', (req, res) => {
  try {
    const { path: filePath, newName } = req.body;
    
    if (!filePath || !newName) {
      return res.status(400).json({
        success: false,
        error: 'Both "path" and "newName" are required'
      });
    }
    
    const absPath = publicImagesFs.resolveSafePath(filePath);
    const dir = path.dirname(absPath);
    const newPath = path.join(dir, newName);
    
    // Validate new path is still within images root
    publicImagesFs.resolveSafePath(publicImagesFs.getRelativePath(newPath));
    
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        success: false,
        error: 'Source path not found'
      });
    }
    
    if (fs.existsSync(newPath)) {
      return res.status(409).json({
        success: false,
        error: 'Target name already exists'
      });
    }
    
    fs.renameSync(absPath, newPath);
    
    const newRelativePath = publicImagesFs.getRelativePath(newPath);
    
    res.json({
      success: true,
      message: 'Renamed successfully',
      oldPath: filePath,
      newPath: newRelativePath
    });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to rename file'
    });
  }
});

/**
 * DELETE /api/gallery/file
 * Delete a file
 * Body: { path: "dir/file.png" }
 */
router.delete('/file', (req, res) => {
  try {
    console.log('🗑️ DELETE /api/gallery/file - Request received');
    console.log('🗑️ Request body:', req.body);
    console.log('🗑️ Request headers:', req.headers);
    
    // Check if body exists and is parsed
    if (!req.body) {
      console.error('🗑️ ❌ Request body is missing or not parsed');
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Body parser may not be configured for DELETE requests.',
        hint: 'Ensure express.json() middleware is applied before routes'
      });
    }
    
    const { path: filePath } = req.body;
    
    if (!filePath) {
      console.error('🗑️ ❌ Path parameter is missing from request body');
      return res.status(400).json({
        success: false,
        error: 'Path is required',
        receivedBody: req.body
      });
    }
    
    console.log('🗑️ Attempting to delete file with path:', filePath);
    
    let absPath;
    try {
      absPath = publicImagesFs.resolveSafePath(filePath);
      console.log('🗑️ Resolved absolute path:', absPath);
    } catch (pathError) {
      console.error('🗑️ ❌ Path resolution error:', pathError);
      return res.status(400).json({
        success: false,
        error: 'Invalid path',
        message: pathError.message || 'Failed to resolve file path',
        path: filePath
      });
    }
    
    if (!fs.existsSync(absPath)) {
      console.error('🗑️ ❌ File not found at:', absPath);
      return res.status(404).json({
        success: false,
        error: 'File not found',
        path: filePath,
        absolutePath: absPath
      });
    }
    
    const stats = fs.statSync(absPath);
    if (stats.isDirectory()) {
      console.error('🗑️ ❌ Path is a directory:', absPath);
      return res.status(400).json({
        success: false,
        error: 'Path is a directory. Use /rmdir endpoint instead.',
        path: filePath
      });
    }
    
    fs.unlinkSync(absPath);
    console.log('🗑️ ✅ File deleted successfully:', absPath);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      path: filePath
    });
  } catch (error) {
    console.error('🗑️ ❌ Error deleting file:', error);
    console.error('🗑️ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file',
      code: error.code,
      path: req.body?.path
    });
  }
});

/**
 * POST /api/gallery/suggest-destination
 * Get catalog suggestions for images
 * Body: { images: [{ path: string, name: string }] }
 */
router.post('/suggest-destination', (req, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: 'Images array is required'
      });
    }
    
    const suggestions = catalogSuggest.suggestDestinations(images);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate suggestions'
    });
  }
});

/**
 * POST /api/gallery/validate-actions
 * Dry-run validation for batch actions (move/rename)
 * Body: {
 *   "actions": [
 *     { "type": "move", "from": "gallery/a.png", "to": "logos/a.png" },
 *     { "type": "rename", "path": "logos/a.png", "newName": "logo-a.png" }
 *   ]
 * }
 * Response: {
 *   "success": true,
 *   "results": [
 *     {
 *       "action": {...},
 *       "ok": true|false,
 *       "code": "OK|ENOENT|EEXIST|EACCES|INVALID_PATH|SAME_PATH|NOT_IMAGE|PARENT_MISSING",
 *       "message": "human readable",
 *       "details": { "absFrom": "...", "absTo": "...", "existsFrom": true, "existsTo": false }
 *     }
 *   ],
 *   "summary": { "total": N, "ok": X, "failed": Y }
 * }
 */
router.post('/validate-actions', (req, res) => {
  try {
    const { actions } = req.body;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Actions array is required and must not be empty'
      });
    }
    
    const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tiff', '.bmp'];
    const results = [];
    
    for (const action of actions) {
      const result = {
        action,
        ok: false,
        code: 'UNKNOWN',
        message: '',
        details: {}
      };
      
      try {
        // Validate action structure
        if (!action.type || (action.type !== 'move' && action.type !== 'rename')) {
          result.code = 'INVALID_ACTION';
          result.message = `Invalid action type: ${action.type}. Must be "move" or "rename"`;
          results.push(result);
          continue;
        }
        
        if (action.type === 'move') {
          if (!action.from || !action.to) {
            result.code = 'INVALID_ACTION';
            result.message = 'Move action requires both "from" and "to" paths';
            results.push(result);
            continue;
          }
          
          // Normalize paths (strip leading /images/ and /)
          const fromPath = action.from.replace(/^\/images\//, '').replace(/^\/+/, '');
          const toPath = action.to.replace(/^\/images\//, '').replace(/^\/+/, '');
          
          if (!fromPath || !toPath) {
            result.code = 'INVALID_PATH';
            result.message = 'Path cannot be empty after normalization';
            results.push(result);
            continue;
          }
          
          // Check if same path
          if (fromPath === toPath) {
            result.code = 'SAME_PATH';
            result.message = 'Source and target paths are the same';
            results.push(result);
            continue;
          }
          
          // Resolve paths safely
          let absFrom, absTo;
          try {
            absFrom = publicImagesFs.resolveSafePath(fromPath);
            absTo = publicImagesFs.resolveSafePath(toPath);
            result.details.absFrom = absFrom;
            result.details.absTo = absTo;
          } catch (pathError) {
            result.code = 'INVALID_PATH';
            result.message = `Path traversal or invalid path: ${pathError.message}`;
            results.push(result);
            continue;
          }
          
          // Check if source exists
          const existsFrom = fs.existsSync(absFrom);
          result.details.existsFrom = existsFrom;
          
          if (!existsFrom) {
            result.code = 'ENOENT';
            result.message = `Source file does not exist: ${fromPath}`;
            results.push(result);
            continue;
          }
          
          // Check if source is a file (not directory)
          const stats = fs.statSync(absFrom);
          if (!stats.isFile()) {
            result.code = 'EISDIR';
            result.message = `Source path is a directory, not a file: ${fromPath}`;
            results.push(result);
            continue;
          }
          
          // Check if target exists
          const existsTo = fs.existsSync(absTo);
          result.details.existsTo = existsTo;
          
          if (existsTo) {
            result.code = 'EEXIST';
            result.message = `Target file already exists: ${toPath}`;
            results.push(result);
            continue;
          }
          
          // Check if target parent directory exists
          const toDir = path.dirname(absTo);
          const parentExists = fs.existsSync(toDir);
          result.details.parentExists = parentExists;
          
          if (!parentExists) {
            result.code = 'PARENT_MISSING';
            result.message = `Target parent directory does not exist: ${path.dirname(toPath)}`;
            results.push(result);
            continue;
          }
          
          // Check if source is an image
          const ext = path.extname(fromPath).toLowerCase();
          if (!IMAGE_EXTENSIONS.includes(ext)) {
            result.code = 'NOT_IMAGE';
            result.message = `Source file is not a recognized image format: ${ext}`;
            results.push(result);
            continue;
          }
          
          // Check if target extension matches (optional but good practice)
          const toExt = path.extname(toPath).toLowerCase();
          if (toExt !== ext) {
            result.code = 'EXTENSION_MISMATCH';
            result.message = `Target extension (${toExt}) does not match source extension (${ext})`;
            results.push(result);
            continue;
          }
          
          // All checks passed
          result.ok = true;
          result.code = 'OK';
          result.message = `Move from ${fromPath} to ${toPath} is valid`;
          
        } else if (action.type === 'rename') {
          if (!action.path || !action.newName) {
            result.code = 'INVALID_ACTION';
            result.message = 'Rename action requires both "path" and "newName"';
            results.push(result);
            continue;
          }
          
          // Normalize paths
          const filePath = action.path.replace(/^\/images\//, '').replace(/^\/+/, '');
          
          if (!filePath) {
            result.code = 'INVALID_PATH';
            result.message = 'Path cannot be empty after normalization';
            results.push(result);
            continue;
          }
          
          // Resolve source path safely
          let absPath;
          try {
            absPath = publicImagesFs.resolveSafePath(filePath);
            result.details.absFrom = absPath;
          } catch (pathError) {
            result.code = 'INVALID_PATH';
            result.message = `Path traversal or invalid path: ${pathError.message}`;
            results.push(result);
            continue;
          }
          
          // Check if source exists
          const existsFrom = fs.existsSync(absPath);
          result.details.existsFrom = existsFrom;
          
          if (!existsFrom) {
            result.code = 'ENOENT';
            result.message = `Source file does not exist: ${filePath}`;
            results.push(result);
            continue;
          }
          
          // Check if source is a file
          const stats = fs.statSync(absPath);
          if (!stats.isFile()) {
            result.code = 'EISDIR';
            result.message = `Source path is a directory, not a file: ${filePath}`;
            results.push(result);
            continue;
          }
          
          // Build new path
          const dir = path.dirname(absPath);
          const newPath = path.join(dir, action.newName);
          
          // Validate new path is still within images root
          try {
            publicImagesFs.resolveSafePath(publicImagesFs.getRelativePath(newPath));
            result.details.absTo = newPath;
          } catch (pathError) {
            result.code = 'INVALID_PATH';
            result.message = `Target path would be outside images root: ${pathError.message}`;
            results.push(result);
            continue;
          }
          
          // Check if new name is same as old
          if (path.basename(absPath) === action.newName) {
            result.code = 'SAME_PATH';
            result.message = 'New name is the same as current name';
            results.push(result);
            continue;
          }
          
          // Check if target exists
          const existsTo = fs.existsSync(newPath);
          result.details.existsTo = existsTo;
          
          if (existsTo) {
            result.code = 'EEXIST';
            result.message = `Target file already exists: ${action.newName}`;
            results.push(result);
            continue;
          }
          
          // Check if source is an image
          const ext = path.extname(filePath).toLowerCase();
          if (!IMAGE_EXTENSIONS.includes(ext)) {
            result.code = 'NOT_IMAGE';
            result.message = `Source file is not a recognized image format: ${ext}`;
            results.push(result);
            continue;
          }
          
          // Check if new name has same extension
          const newExt = path.extname(action.newName).toLowerCase();
          if (newExt !== ext) {
            result.code = 'EXTENSION_MISMATCH';
            result.message = `New name extension (${newExt}) does not match source extension (${ext})`;
            results.push(result);
            continue;
          }
          
          // All checks passed
          result.ok = true;
          result.code = 'OK';
          result.message = `Rename ${filePath} to ${action.newName} is valid`;
        }
      } catch (error) {
        result.code = 'VALIDATION_ERROR';
        result.message = `Validation error: ${error.message}`;
        console.error('Error validating action:', error);
      }
      
      results.push(result);
    }
    
    // Calculate summary
    const summary = {
      total: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length
    };
    
    res.json({
      success: true,
      results,
      summary
    });
  } catch (error) {
    console.error('Error validating actions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate actions'
    });
  }
});

/**
 * POST /api/gallery/apply-actions
 * Apply batch actions (move/rename) with structured results
 * Body: {
 *   "actions": [
 *     { "type": "move", "from": "gallery/a.png", "to": "logos/a.png" },
 *     { "type": "rename", "path": "logos/a.png", "newName": "logo-a.png" }
 *   ],
 *   "continueOnError": true
 * }
 * Response: Same shape as validate-actions
 */
router.post('/apply-actions', (req, res) => {
  try {
    const { actions, continueOnError = false } = req.body;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Actions array is required and must not be empty'
      });
    }
    
    const results = [];
    
    for (const action of actions) {
      const result = {
        action,
        ok: false,
        code: 'UNKNOWN',
        message: '',
        details: {}
      };
      
      try {
        // Validate action structure
        if (!action.type || (action.type !== 'move' && action.type !== 'rename')) {
          result.code = 'INVALID_ACTION';
          result.message = `Invalid action type: ${action.type}. Must be "move" or "rename"`;
          results.push(result);
          if (!continueOnError) break;
          continue;
        }
        
        if (action.type === 'move') {
          if (!action.from || !action.to) {
            result.code = 'INVALID_ACTION';
            result.message = 'Move action requires both "from" and "to" paths';
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Normalize paths
          const fromPath = action.from.replace(/^\/images\//, '').replace(/^\/+/, '');
          const toPath = action.to.replace(/^\/images\//, '').replace(/^\/+/, '');
          
          if (!fromPath || !toPath) {
            result.code = 'INVALID_PATH';
            result.message = 'Path cannot be empty after normalization';
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Resolve paths safely
          let absFrom, absTo;
          try {
            absFrom = publicImagesFs.resolveSafePath(fromPath);
            absTo = publicImagesFs.resolveSafePath(toPath);
            result.details.absFrom = absFrom;
            result.details.absTo = absTo;
          } catch (pathError) {
            result.code = 'INVALID_PATH';
            result.message = `Path traversal or invalid path: ${pathError.message}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Check if source exists
          if (!fs.existsSync(absFrom)) {
            result.code = 'ENOENT';
            result.message = `Source file does not exist: ${fromPath}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Check if target exists (no overwrite for now)
          if (fs.existsSync(absTo)) {
            result.code = 'EEXIST';
            result.message = `Target file already exists: ${toPath}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Ensure target directory exists
          const toDir = path.dirname(absTo);
          if (!fs.existsSync(toDir)) {
            try {
              fs.mkdirSync(toDir, { recursive: true });
            } catch (mkdirError) {
              result.code = 'EACCES';
              result.message = `Failed to create target directory: ${mkdirError.message}`;
              results.push(result);
              if (!continueOnError) break;
              continue;
            }
          }
          
          // Perform move
          try {
            fs.renameSync(absFrom, absTo);
            result.ok = true;
            result.code = 'OK';
            result.message = `Successfully moved ${fromPath} to ${toPath}`;
            result.details.from = fromPath;
            result.details.to = toPath;
          } catch (moveError) {
            result.code = 'EACCES';
            result.message = `Failed to move file: ${moveError.message}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
        } else if (action.type === 'rename') {
          if (!action.path || !action.newName) {
            result.code = 'INVALID_ACTION';
            result.message = 'Rename action requires both "path" and "newName"';
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Normalize path
          const filePath = action.path.replace(/^\/images\//, '').replace(/^\/+/, '');
          
          if (!filePath) {
            result.code = 'INVALID_PATH';
            result.message = 'Path cannot be empty after normalization';
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Resolve source path safely
          let absPath;
          try {
            absPath = publicImagesFs.resolveSafePath(filePath);
            result.details.absFrom = absPath;
          } catch (pathError) {
            result.code = 'INVALID_PATH';
            result.message = `Path traversal or invalid path: ${pathError.message}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Check if source exists
          if (!fs.existsSync(absPath)) {
            result.code = 'ENOENT';
            result.message = `Source file does not exist: ${filePath}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Build new path
          const dir = path.dirname(absPath);
          const newPath = path.join(dir, action.newName);
          
          // Validate new path is still within images root
          try {
            publicImagesFs.resolveSafePath(publicImagesFs.getRelativePath(newPath));
            result.details.absTo = newPath;
          } catch (pathError) {
            result.code = 'INVALID_PATH';
            result.message = `Target path would be outside images root: ${pathError.message}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Check if target exists
          if (fs.existsSync(newPath)) {
            result.code = 'EEXIST';
            result.message = `Target file already exists: ${action.newName}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
          
          // Perform rename
          try {
            fs.renameSync(absPath, newPath);
            const newRelativePath = publicImagesFs.getRelativePath(newPath);
            result.ok = true;
            result.code = 'OK';
            result.message = `Successfully renamed ${filePath} to ${action.newName}`;
            result.details.oldPath = filePath;
            result.details.newPath = newRelativePath;
          } catch (renameError) {
            result.code = 'EACCES';
            result.message = `Failed to rename file: ${renameError.message}`;
            results.push(result);
            if (!continueOnError) break;
            continue;
          }
        }
      } catch (error) {
        result.code = 'APPLY_ERROR';
        result.message = `Error applying action: ${error.message}`;
        console.error('Error applying action:', error);
      }
      
      results.push(result);
    }
    
    // Calculate summary
    const summary = {
      total: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length
    };
    
    res.json({
      success: true,
      results,
      summary
    });
  } catch (error) {
    console.error('Error applying actions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply actions'
    });
  }
});

module.exports = router;
