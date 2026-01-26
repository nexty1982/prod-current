/**
 * Internal Build Events API Bridge
 * POST /api/internal/build-events
 * 
 * Bridge route to src/routes/internal/buildEvents.js
 * Supports both development (../src/routes/internal/buildEvents) and production paths
 */

let buildEventsModule;
try {
    // Try src path (development)
    buildEventsModule = require('../../src/routes/internal/buildEvents');
} catch (e) {
    // Fallback: try dist path (production compiled)
    try {
        buildEventsModule = require('../../dist/src/routes/internal/buildEvents');
    } catch (e2) {
        // Last resort: create minimal stub (prevents crash but returns 503)
        console.warn('⚠️  [routes/internal/buildEvents] Failed to load build events router from all paths, using stub');
        const express = require('express');
        const stubRouter = express.Router();
        stubRouter.post('/build-events', (req, res) => {
            res.status(503).json({
                success: false,
                error: 'Service temporarily unavailable',
                message: 'Build events router failed to load'
            });
        });
        buildEventsModule = stubRouter;
    }
}

// Ensure we export a router
if (buildEventsModule && typeof buildEventsModule.use === 'function') {
    // It's already a router
    module.exports = buildEventsModule;
} else if (buildEventsModule && buildEventsModule.router && typeof buildEventsModule.router.use === 'function') {
    // Extract router from object
    module.exports = buildEventsModule.router;
} else {
    // Fallback: create stub router
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.post('/build-events', (req, res) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Build events router failed to load'
        });
    });
    module.exports = stubRouter;
}
