/**
 * Admin Components Routes
 * Handles system component management API endpoints
 * 
 * Requires admin or super_admin role for all operations
 */

const express = require('express');
const router = express.Router();
const componentsController = require('../../controllers/admin/componentsController');

// Middleware to check if user is admin or super admin
const requireAdminRole = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            details: 'You must be logged in to access component management'
        });
    }

    const userRole = req.session.user.role;
    const allowedRoles = ['super_admin', 'admin'];
    
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
            success: false,
            error: 'Insufficient privileges',
            details: 'Component management requires admin or super_admin role',
            currentRole: userRole,
            requiredRoles: allowedRoles
        });
    }

    // Log admin action for security auditing
    console.log(`[ADMIN ACCESS] Component management accessed by ${req.session.user.email} (${userRole}) from ${req.ip}`);
    
    next();
};

// Apply admin role requirement to all routes
router.use(requireAdminRole);

/**
 * GET /api/admin/components
 * Retrieve all system components with their current status
 * 
 * Response format:
 * [
 *   {
 *     "id": "authentication-service",
 *     "name": "Authentication Service",
 *     "enabled": true,
 *     "health": "healthy",
 *     "lastUpdated": "2025-01-29T10:30:00.000Z"
 *   },
 *   ...
 * ]
 */
router.get('/', async (req, res) => {
    try {
        await componentsController.getAllComponents(req, res);
    } catch (error) {
        console.error('Error in GET /api/admin/components:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: 'Failed to retrieve components'
        });
    }
});

/**
 * PATCH /api/admin/components/:id
 * Toggle component enabled/disabled status
 * 
 * Request body:
 * {
 *   "enabled": true | false
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "message": "Component 'Authentication Service' has been enabled",
 *   "component": { ... }
 * }
 */
router.patch('/:id', async (req, res) => {
    try {
        // Validate component ID
        const { id } = req.params;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid component ID',
                details: 'Component ID must be a non-empty string'
            });
        }

        // Validate request body
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body',
                details: 'enabled field must be a boolean value (true or false)'
            });
        }

        // Log the toggle action for auditing
        console.log(`[COMPONENT TOGGLE] User ${req.session.user.email} attempting to ${enabled ? 'enable' : 'disable'} component: ${id}`);

        await componentsController.toggleComponent(req, res);
    } catch (error) {
        console.error(`Error in PATCH /api/admin/components/${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: 'Failed to toggle component status'
        });
    }
});

/**
 * GET /api/admin/components/:id/logs
 * Retrieve logs for a specific component
 * 
 * Query parameters:
 * - limit: number (optional, default: 100) - Maximum number of log entries to return
 * 
 * Response format:
 * {
 *   "component": "Authentication Service",
 *   "total": 25,
 *   "logs": [
 *     {
 *       "id": "log_1",
 *       "level": "info",
 *       "message": "User authentication successful",
 *       "timestamp": "2025-01-29T12:45:00.000Z",
 *       "component": "authentication-service",
 *       "metadata": { ... }
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/:id/logs', async (req, res) => {
    try {
        // Validate component ID
        const { id } = req.params;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid component ID',
                details: 'Component ID must be a non-empty string'
            });
        }

        // Validate limit parameter
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        if (isNaN(limit) || limit < 1 || limit > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Invalid limit parameter',
                details: 'Limit must be a number between 1 and 1000'
            });
        }

        // Log the logs access for auditing
        console.log(`[COMPONENT LOGS] User ${req.session.user.email} accessing logs for component: ${id} (limit: ${limit})`);

        await componentsController.getComponentLogs(req, res);
    } catch (error) {
        console.error(`Error in GET /api/admin/components/${req.params.id}/logs:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: 'Failed to retrieve component logs'
        });
    }
});

/**
 * POST /api/admin/components/:id/test
 * Run diagnostic tests for a specific component
 * 
 * Response format:
 * {
 *   "status": "pass" | "warn" | "fail",
 *   "details": "Completed 8 diagnostic tests for Authentication Service",
 *   "timestamp": "2025-01-29T12:45:00.000Z",
 *   "tests": [
 *     {
 *       "name": "Service Connectivity",
 *       "status": "pass",
 *       "duration": "156ms",
 *       "details": null,
 *       "error": null
 *     },
 *     ...
 *   ],
 *   "summary": {
 *     "total": 8,
 *     "passed": 6,
 *     "warnings": 1,
 *     "failed": 1
 *   },
 *   "health": "degraded",
 *   "component": { ... }
 * }
 */
router.post('/:id/test', async (req, res) => {
    try {
        // Validate component ID
        const { id } = req.params;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid component ID',
                details: 'Component ID must be a non-empty string'
            });
        }

        // Log the test action for auditing
        console.log(`[COMPONENT TEST] User ${req.session.user.email} initiating diagnostic test for component: ${id}`);

        await componentsController.runComponentTest(req, res);
    } catch (error) {
        console.error(`Error in POST /api/admin/components/${req.params.id}/test:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: 'Failed to run component diagnostic test'
        });
    }
});

/**
 * Error handling middleware for this router
 */
router.use((error, req, res, next) => {
    console.error('Components router error:', error);
    
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: 'An unexpected error occurred in component management',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;