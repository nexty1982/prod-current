/**
 * OMAI-Spin Admin Routes
 * API endpoints for web-based environment mirroring
 */

const express = require('express');
const router = express.Router();
const omaiSpinController = require('../../controllers/admin/omaiSpinController');
const { requireRole } = require('../../middleware/auth');

// Middleware: Require super admin role for all OMAI-Spin operations
router.use(requireRole('super_admin'));

/**
 * GET /api/admin/omai-spin/dashboard
 * Get OMAI-Spin dashboard data
 */
router.get('/dashboard', async (req, res) => {
    await omaiSpinController.getDashboard(req, res);
});

/**
 * POST /api/admin/omai-spin/start
 * Start a new OMAI-Spin operation
 */
router.post('/start', async (req, res) => {
    await omaiSpinController.startOperation(req, res);
});

/**
 * GET /api/admin/omai-spin/operation/:operationId
 * Get operation status and details
 */
router.get('/operation/:operationId', async (req, res) => {
    await omaiSpinController.getOperationStatus(req, res);
});

/**
 * DELETE /api/admin/omai-spin/operation/:operationId
 * Cancel an active operation
 */
router.delete('/operation/:operationId', async (req, res) => {
    await omaiSpinController.cancelOperation(req, res);
});

/**
 * GET /api/admin/omai-spin/history
 * Get session history with pagination
 */
router.get('/history', async (req, res) => {
    await omaiSpinController.getSessionHistory(req, res);
});

/**
 * GET /api/admin/omai-spin/session/:sessionId/logs
 * Get detailed logs for a session
 */
router.get('/session/:sessionId/logs', async (req, res) => {
    await omaiSpinController.getSessionLogs(req, res);
});

/**
 * GET /api/admin/omai-spin/live-updates
 * Server-Sent Events endpoint for real-time updates
 */
router.get('/live-updates', (req, res) => {
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
    })}\n\n`);

    const eventEmitter = omaiSpinController.getEventEmitter();

    // Set up event listeners
    const handleOperationUpdate = (data) => {
        res.write(`data: ${JSON.stringify({
            type: 'operationUpdate',
            data,
            timestamp: new Date().toISOString()
        })}\n\n`);
    };

    const handleOperationComplete = (data) => {
        res.write(`data: ${JSON.stringify({
            type: 'operationComplete',
            data,
            timestamp: new Date().toISOString()
        })}\n\n`);
    };

    const handleOperationError = (data) => {
        res.write(`data: ${JSON.stringify({
            type: 'operationError',
            data,
            timestamp: new Date().toISOString()
        })}\n\n`);
    };

    // Register event listeners
    eventEmitter.on('operationUpdate', handleOperationUpdate);
    eventEmitter.on('operationComplete', handleOperationComplete);
    eventEmitter.on('operationError', handleOperationError);

    // Handle client disconnect
    req.on('close', () => {
        eventEmitter.removeListener('operationUpdate', handleOperationUpdate);
        eventEmitter.removeListener('operationComplete', handleOperationComplete);
        eventEmitter.removeListener('operationError', handleOperationError);
    });

    // Keep connection alive with periodic pings
    const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
        })}\n\n`);
    }, 30000); // Every 30 seconds

    req.on('close', () => {
        clearInterval(keepAlive);
    });
});

module.exports = router;