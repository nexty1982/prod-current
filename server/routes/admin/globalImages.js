const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { promisePool } = require('../../config/db');
const router = express.Router();

// Helper function to scan directory for images
const scanDirectoryForImages = (directory, type, baseUrl) => {
    const images = [];
    
    if (fs.existsSync(directory)) {
        const files = fs.readdirSync(directory);
        files.forEach(file => {
            if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                
                // Determine if this is a global image or user image
                const isGlobal = directory.includes('/global/');
                const source = isGlobal ? 'global' : 'user';
                
                // Generate a clean name from filename
                let name = file.replace(/\.[^/.]+$/, ''); // Remove extension
                name = name.replace(/^global_(profile|banner)_\d+/, ''); // Remove global_type_timestamp prefix
                name = name.replace(/^(banner_|profile_)/, ''); // Remove type prefixes
                name = name.replace(/^\d+_/, ''); // Remove timestamp prefixes
                name = name.replace(/[_-]/g, ' '); // Replace underscores and dashes with spaces
                name = name.charAt(0).toUpperCase() + name.slice(1); // Capitalize first letter
                
                // If name is empty after cleaning, use a default name
                if (!name || name.trim() === '') {
                    name = `${type.charAt(0).toUpperCase() + type.slice(1)} Image`;
                }
                
                images.push({
                    id: uuidv4(),
                    name: name,
                    url: `${baseUrl}/${file}`,
                    type: type,
                    size: `${stats.size} bytes`,
                    uploadedAt: stats.mtime.toISOString(),
                    uploadedBy: isGlobal ? 'Super Admin' : 'System',
                    source: source,
                    filename: file
                });
            }
        });
    }
    
    return images;
};

// Middleware to check if user is super admin
const requireSuperAdmin = async (req, res, next) => {
    console.log('🔒 requireSuperAdmin middleware - checking session...');
    console.log('   Session user:', req.session?.user);
    console.log('   Session ID:', req.sessionID);

    if (!req.session || !req.session.user) {
        console.log('❌ No authenticated user session found');
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }

    const userRole = req.session.user.role;
    console.log('   User role:', userRole);

    if (userRole !== 'super_admin') {
        console.log('❌ Insufficient privileges - super admin required');
        return res.status(403).json({
            success: false,
            message: 'Super admin privileges required'
        });
    }

    console.log('✅ Super admin access granted');
    next();
};

// Ensure global image directories exist
const globalProfileDir = path.join(__dirname, '../../../front-end/public/images/global/profile');
const globalBannerDir = path.join(__dirname, '../../../front-end/public/images/global/banner');
const userProfileDir = path.join(__dirname, '../../../front-end/public/images/profile');
const userBannerDir = path.join(__dirname, '../../../front-end/public/images/banner');

// Create directories if they don't exist
if (!fs.existsSync(globalProfileDir)) {
    fs.mkdirSync(globalProfileDir, { recursive: true });
}
if (!fs.existsSync(globalBannerDir)) {
    fs.mkdirSync(globalBannerDir, { recursive: true });
}
if (!fs.existsSync(userProfileDir)) {
    fs.mkdirSync(userProfileDir, { recursive: true });
}
if (!fs.existsSync(userBannerDir)) {
    fs.mkdirSync(userBannerDir, { recursive: true });
}

// Configure multer for global images
const globalImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // We'll determine the destination after the file is processed
        cb(null, globalProfileDir); // Default to profile directory
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const fileName = `global_${timestamp}${extension}`;
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

// Create multer instance
const uploadGlobalImage = multer({ 
    storage: globalImageStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all global images
router.get('/', requireSuperAdmin, (req, res) => {
    console.log('📸 Fetching global images...');
    console.log('   Session user:', req.session?.user);
    
    try {
        const images = [];
        
        // Scan global profile images
        const globalProfileImages = scanDirectoryForImages(globalProfileDir, 'profile', '/images/global/profile');
        images.push(...globalProfileImages);
        
        // Scan global banner images
        const globalBannerImages = scanDirectoryForImages(globalBannerDir, 'banner', '/images/global/banner');
        images.push(...globalBannerImages);
        
        // Scan user profile images (auto-detected)
        const userProfileImages = scanDirectoryForImages(userProfileDir, 'profile', '/images/profile');
        images.push(...userProfileImages);
        
        // Scan user banner images (auto-detected)
        const userBannerImages = scanDirectoryForImages(userBannerDir, 'banner', '/images/banner');
        images.push(...userBannerImages);
        
        console.log(`✅ Found ${images.length} total images (${globalProfileImages.length + globalBannerImages.length} global, ${userProfileImages.length + userBannerImages.length} auto-detected)`);
        
        res.json({ images });
    } catch (error) {
        console.error('Error fetching global images:', error);
        res.status(500).json({ error: 'Failed to fetch global images' });
    }
});

// Upload global image
router.post('/upload', requireSuperAdmin, uploadGlobalImage.single('image'), (req, res) => {
    console.log('📤 Uploading global image...');
    console.log('   Session user:', req.session?.user);
    console.log('   File:', req.file);
    console.log('   Body:', req.body);
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { name, type } = req.body;
        
        if (!name || !type || !['profile', 'banner'].includes(type)) {
            return res.status(400).json({ error: 'Invalid name or type' });
        }

        // Determine the correct directory
        const targetDir = type === 'profile' ? globalProfileDir : globalBannerDir;
        
        // Create a new filename with the type included
        const timestamp = Date.now();
        const extension = path.extname(req.file.originalname);
        const newFileName = `global_${type}_${timestamp}${extension}`;
        
        // Move the file to the correct directory with the new name
        const oldPath = req.file.path;
        const newPath = path.join(targetDir, newFileName);
        
        fs.renameSync(oldPath, newPath);
        
        const imageUrl = `/images/global/${type}/${newFileName}`;
        const stats = fs.statSync(newPath);

        const image = {
            id: uuidv4(),
            name: name,
            url: imageUrl,
            type: type,
            size: `${stats.size} bytes`,
            uploadedAt: stats.mtime.toISOString(),
            uploadedBy: req.session.user.username || 'Unknown'
        };

        res.json({
            success: true,
            message: 'Global image uploaded successfully',
            image: image
        });
    } catch (error) {
        console.error('Error uploading global image:', error);
        res.status(500).json({ error: 'Failed to upload global image' });
    }
});

// Delete global image
router.delete('/:imageId', requireSuperAdmin, (req, res) => {
    try {
        const { imageId } = req.params;
        const { type, filename, source } = req.query;
        
        if (!type || !filename || !['profile', 'banner'].includes(type)) {
            return res.status(400).json({ error: 'Invalid image type or filename' });
        }

        let uploadDir;
        if (source === 'user') {
            uploadDir = type === 'profile' ? userProfileDir : userBannerDir;
        } else {
            uploadDir = type === 'profile' ? globalProfileDir : globalBannerDir;
        }
        
        const filePath = path.join(uploadDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Error deleting global image:', error);
        res.status(500).json({ error: 'Failed to delete global image' });
    }
});

// Get global images for user selection (no auth required)
router.get('/available', (req, res) => {
    console.log('📸 Fetching available global images (public)...');
    
    try {
        const images = [];
        
        // Scan global profile images
        const globalProfileImages = scanDirectoryForImages(globalProfileDir, 'profile', '/images/global/profile');
        images.push(...globalProfileImages);
        
        // Scan global banner images
        const globalBannerImages = scanDirectoryForImages(globalBannerDir, 'banner', '/images/global/banner');
        images.push(...globalBannerImages);
        
        // Scan user profile images (auto-detected)
        const userProfileImages = scanDirectoryForImages(userProfileDir, 'profile', '/images/profile');
        images.push(...userProfileImages);
        
        // Scan user banner images (auto-detected)
        const userBannerImages = scanDirectoryForImages(userBannerDir, 'banner', '/images/banner');
        images.push(...userBannerImages);
        
        console.log(`✅ Found ${images.length} available images (${globalProfileImages.length + globalBannerImages.length} global, ${userProfileImages.length + userBannerImages.length} auto-detected)`);
        res.json({ images });
    } catch (error) {
        console.error('Error fetching available global images:', error);
        res.status(500).json({ error: 'Failed to fetch available global images' });
    }
});

// Get banner images only for user selection (no auth required)
router.get('/banner', (req, res) => {
    console.log('📸 Fetching available banner images (public)...');
    
    try {
        const images = [];
        
        // Scan global banner images
        const globalBannerImages = scanDirectoryForImages(globalBannerDir, 'banner', '/images/global/banner');
        images.push(...globalBannerImages);
        
        // Scan user banner images (auto-detected)
        const userBannerImages = scanDirectoryForImages(userBannerDir, 'banner', '/images/banner');
        images.push(...userBannerImages);
        
        console.log(`✅ Found ${images.length} available banner images (${globalBannerImages.length} global, ${userBannerImages.length} auto-detected)`);
        res.json({ images });
    } catch (error) {
        console.error('Error fetching available banner images:', error);
        res.status(500).json({ error: 'Failed to fetch available banner images' });
    }
});

// Public route: Get all global images (profile and banner) for all users
router.get('/public', (req, res) => {
    console.log('📸 Fetching public global images...');
    try {
        const images = [];
        
        // Scan global profile images
        const globalProfileImages = scanDirectoryForImages(globalProfileDir, 'profile', '/images/global/profile');
        images.push(...globalProfileImages);
        
        // Scan global banner images
        const globalBannerImages = scanDirectoryForImages(globalBannerDir, 'banner', '/images/global/banner');
        images.push(...globalBannerImages);
        
        // Scan user profile images (auto-detected)
        const userProfileImages = scanDirectoryForImages(userProfileDir, 'profile', '/images/profile');
        images.push(...userProfileImages);
        
        // Scan user banner images (auto-detected)
        const userBannerImages = scanDirectoryForImages(userBannerDir, 'banner', '/images/banner');
        images.push(...userBannerImages);
        
        console.log(`📸 Public API returning: ${globalProfileImages.length} global profile, ${globalBannerImages.length} global banner, ${userProfileImages.length} user profile, ${userBannerImages.length} user banner images`);
        
        res.json({ images });
    } catch (error) {
        console.error('Error fetching public global images:', error);
        res.status(500).json({ error: 'Failed to fetch public global images' });
    }
});

// Save extracted images to profile/banner directory
router.post('/save-extracted', async (req, res) => {
    console.log('📤 Saving extracted images...');
    console.log('   Session user:', req.session?.user);
    console.log('   Body:', req.body);
    
    try {
        const { images, type } = req.body;
        
        if (!images || !Array.isArray(images) || !type || !['profile', 'banner'].includes(type)) {
            return res.status(400).json({ error: 'Invalid images data or type' });
        }

        const savedImages = [];
        const targetDir = type === 'profile' ? userProfileDir : userBannerDir;
        const baseUrl = type === 'profile' ? '/images/profile' : '/images/banner';
        
        console.log(`📁 Target directory: ${targetDir}`);
        console.log(`🔗 Base URL: ${baseUrl}`);
        console.log(`📊 Number of images to save: ${images.length}`);

        for (let i = 0; i < images.length; i++) {
            const imageData = images[i];
            
            if (!imageData.data || !imageData.name) {
                console.warn(`Skipping invalid image data at index ${i}`);
                continue;
            }

            try {
                // Convert base64 to buffer
                const base64Data = imageData.data.replace(/^data:image\/[a-z]+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Create filename with timestamp
                const timestamp = Date.now() + i; // Add i to ensure unique timestamps
                const extension = 'png';
                const fileName = `${type}_${timestamp}.${extension}`;
                const filePath = path.join(targetDir, fileName);
                
                // Save file
                console.log(`💾 Saving file: ${filePath}`);
                fs.writeFileSync(filePath, buffer);
                
                // Get file stats
                const stats = fs.statSync(filePath);
                console.log(`✅ File saved successfully: ${fileName} (${stats.size} bytes)`);
                
                const savedImage = {
                    id: uuidv4(),
                    name: imageData.name,
                    url: `${baseUrl}/${fileName}`,
                    type: type,
                    size: `${stats.size} bytes`,
                    uploadedAt: stats.mtime.toISOString(),
                    uploadedBy: req.session?.user?.username || 'System',
                    source: 'user'
                };
                
                savedImages.push(savedImage);
                console.log(`✅ Saved extracted image: ${fileName}`);
                
            } catch (err) {
                console.error(`Error saving image ${i}:`, err);
            }
        }

        console.log(`✅ Successfully saved ${savedImages.length} extracted images`);
        
        res.json({
            success: true,
            message: `Successfully saved ${savedImages.length} extracted images`,
            images: savedImages
        });
        
    } catch (error) {
        console.error('Error saving extracted images:', error);
        res.status(500).json({ error: 'Failed to save extracted images' });
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 5MB)' });
        }
    }
    
    console.error('Global images error:', error);
    res.status(500).json({ error: 'Global images operation failed' });
});

module.exports = router; 