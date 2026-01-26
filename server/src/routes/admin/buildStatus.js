/**
 * Build Status API
 * GET /api/admin/build-status
 * 
 * Returns current build status for admins
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const buildEventsService = require('../../api/buildEvents');

// Middleware: require admin or super_admin
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * GET /api/admin/build-status
 * Get current build status
 * 
 * Query params:
 *   - heartbeatTimeout: seconds before considering build stale (default 90)
 */
router.get('/build-status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const heartbeatTimeout = parseInt(req.query.heartbeatTimeout) || 90;

        const status = await buildEventsService.getBuildStatus(heartbeatTimeout);

        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('Error getting build status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get build status'
        });
    }
});

module.exports = router;
