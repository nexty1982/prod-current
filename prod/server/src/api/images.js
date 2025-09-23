const { getAppPool } = require('../../config/db-compat');
// server/routes/images.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../../config/db-compat');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../misc/public/uploads');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and SVG files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all images
router.get('/images', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(
      'SELECT id, name, url, mime_type, size, created_at FROM images ORDER BY created_at DESC'
    );

    res.json({ images: rows });
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Server error fetching images' });
  }
});

// Upload images
router.post('/images/upload', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedImages = [];

    // Save each file to the database
    for (const file of req.files) {
      const url = `/uploads/${file.filename}`;
      const [result] = await pool.promise().query(
        'INSERT INTO images (name, url, mime_type, size, created_at) VALUES (?, ?, ?, ?, NOW())',
        [file.originalname, url, file.mimetype, file.size]
      );

      const [imageData] = await pool.promise().query(
        'SELECT id, name, url, mime_type, size, created_at FROM images WHERE id = ?',
        [result.insertId]
      );

      uploadedImages.push(imageData[0]);
    }

    res.status(201).json({ images: uploadedImages });
  } catch (err) {
    console.error('Error uploading images:', err);
    res.status(500).json({ error: 'Server error uploading images' });
  }
});

// Get a single image by ID
router.get('/images/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.promise().query(
      'SELECT id, name, url, mime_type, size, created_at FROM images WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ image: rows[0] });
  } catch (err) {
    console.error('Error fetching image:', err);
    res.status(500).json({ error: 'Server error fetching image' });
  }
});

// Delete an image
router.delete('/images/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get the image URL before deleting
    const [imageData] = await pool.promise().query(
      'SELECT url FROM images WHERE id = ?',
      [id]
    );

    if (imageData.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete the image from the database
    const [result] = await pool.promise().query(
      'DELETE FROM images WHERE id = ?',
      [id]
    );

    // Delete the file from the filesystem
    const filePath = path.join(__dirname, '../../misc/public', imageData[0].url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Server error deleting image' });
  }
});

module.exports = router;
