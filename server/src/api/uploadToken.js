// server/routes/uploadToken.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Generate secure upload link (requires admin authentication)
router.post('/upload-link', requireAuth, (req, res) => {
    try {
        const { church_id, language = 'en', record_type = 'baptism', expires_in = '24h' } = req.body;

        if (!church_id) {
            return res.status(400).json({
                success: false,
                message: 'Church ID is required'
            });
        }

        // Create JWT token with upload permissions
        const token = jwt.sign(
            {
                church_id,
                language,
                record_type,
                created_by: req.session.user.id,
                created_at: new Date().toISOString()
            },
            process.env.UPLOAD_TOKEN_SECRET || 'default-secret-change-in-production',
            { expiresIn: expires_in }
        );

        const publicLink = `${req.protocol}://${req.get('host')}/public-upload/${token}`;

        console.log(`Generated upload link for church ${church_id}:`, publicLink);

        res.json({
            success: true,
            url: publicLink,
            token,
            expires_in,
            church_id,
            language,
            record_type
        });

    } catch (error) {
        console.error('Error generating upload link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate upload link'
        });
    }
});

// Verify upload token
router.get('/verify-upload-token/:token', (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const payload = jwt.verify(token, process.env.UPLOAD_TOKEN_SECRET || 'default-secret-change-in-production');

        console.log('Token verified successfully:', payload);

        res.json({
            success: true,
            payload: {
                church_id: payload.church_id,
                language: payload.language,
                record_type: payload.record_type,
                created_by: payload.created_by,
                created_at: payload.created_at
            }
        });

    } catch (error) {
        console.error('Token verification failed:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Upload link has expired'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid upload link'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to verify upload link'
        });
    }
});

// List active upload links (admin only)
router.get('/upload-links', requireAuth, async (req, res) => {
    try {
        // This would ideally query a database table to track active links
        // For now, return a simple response
        res.json({
            success: true,
            message: 'Upload links are generated dynamically and tracked via JWT tokens',
            info: 'Check server logs for generated links'
        });
    } catch (error) {
        console.error('Error listing upload links:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list upload links'
        });
    }
});

module.exports = router;
