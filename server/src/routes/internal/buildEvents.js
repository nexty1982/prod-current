/**
 * Internal Build Events API
 * 
 * Source: server/src/routes/internal/buildEvents.js
 * Mount point: /api/internal (mounted in server/src/index.ts)
 * 
 * Endpoint: POST /api/internal/build-events
 * 
 * Behavior:
 * - If OM_BUILD_EVENT_TOKEN is not set: returns 204 No Content (disabled, no spam)
 * - If token is set: validates token and processes event
 */

const express = require('express');
const router = express.Router();
const buildEventsService = require('../../api/buildEvents');

// Track if we've logged the disabled message (to avoid spam)
let disabledWarningLogged = false;

// Middleware to validate build event token
function validateBuildToken(req, res, next) {
    const token = req.headers['x-om-build-token'];
    const expectedToken = process.env.OM_BUILD_EVENT_TOKEN;

    if (!expectedToken) {
        // Log only once at startup (or first request) to avoid spam
        if (!disabledWarningLogged) {
            console.log('ℹ️  Build events disabled: OM_BUILD_EVENT_TOKEN not configured');
            disabledWarningLogged = true;
        }
        // Return 204 No Content (disabled, not an error)
        return res.status(204).end();
    }

    if (!token || token !== expectedToken) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or missing build event token'
        });
    }

    next();
}

/**
 * POST /api/internal/build-events
 * Receive build lifecycle events
 */
router.post('/build-events', validateBuildToken, async (req, res) => {
    try {
        const eventData = req.body;

        // Validate required fields
        const required = ['runId', 'event', 'env', 'origin', 'command'];
        const missing = required.filter(field => !eventData[field]);

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(', ')}`
            });
        }

        // Process the event
        const result = await buildEventsService.processBuildEvent(eventData);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error processing build event:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process build event'
        });
    }
});

module.exports = router;
