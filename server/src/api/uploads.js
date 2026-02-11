const { getAppPool } = require('../config/db-compat');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisePool } = require('../config/db-compat');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../misc/public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST /api/uploads/image - Upload a single image
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { filename, originalname, size, mimetype } = req.file;
    const imageUrl = `/uploads/${filename}`;

    // Save image info to database (optional - you can remove this if you don't want to track uploads)
    const insertQuery = `
      INSERT INTO images (filename, original_name, size, mime_type, url, upload_date)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    try {
      const [result] = await getAppPool().query(insertQuery, [filename, originalname, size, mimetype, imageUrl]);
      
      const imageData = {
        id: result.insertId,
        filename,
        original_name: originalname,
        size,
        mime_type: mimetype,
        url: imageUrl,
        upload_date: new Date().toISOString()
      };

      res.status(201).json(imageData);
    } catch (dbError) {
      // If DB insert fails, still return the image URL (images table might not exist yet)
      console.warn('Database insert failed for image, but file uploaded successfully:', dbError.message);
      
      const imageData = {
        id: Date.now(), // Use timestamp as fallback ID
        filename,
        original_name: originalname,
        size,
        mime_type: mimetype,
        url: imageUrl,
        upload_date: new Date().toISOString()
      };

      res.status(201).json(imageData);
    }
  } catch (error) {
    console.error('Image upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// GET /api/uploads/list - List all uploaded images
router.get('/list', async (req, res) => {
  try {
    // First try to get from database
    try {
      const query = `
        SELECT id, filename, original_name, size, mime_type, url, upload_date
        FROM images 
        ORDER BY upload_date DESC
      `;
      
      const [images] = await getAppPool().query(query);
      return res.json(images);
    } catch (dbError) {
      // If database query fails, scan the uploads directory
      console.warn('Database query failed, scanning uploads directory:', dbError.message);
      
      const images = [];
      const files = fs.readdirSync(uploadsDir);
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
          images.push({
            id: stats.mtime.getTime(), // Use modification time as fallback ID
            filename: file,
            original_name: file,
            size: stats.size,
            mime_type: `image/${path.extname(file).slice(1)}`,
            url: `/uploads/${file}`,
            upload_date: stats.mtime.toISOString()
          });
        }
      }
      
      // Sort by upload date descending
      images.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
      
      return res.json(images);
    }
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// DELETE /api/uploads/:filename - Delete an uploaded image
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file from filesystem
    fs.unlinkSync(filePath);

    // Delete from database if it exists
    try {
      await getAppPool().query('DELETE FROM images WHERE filename = ?', [filename]);
    } catch (dbError) {
      console.warn('Database delete failed, but file was removed:', dbError.message);
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
