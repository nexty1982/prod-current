// Bridge route to src/routes/admin/churches.js
// Support both development (../src/routes/admin/churches) and production paths
let churchesModule;
try {
    // Try src path (development)
    churchesModule = require('../src/routes/admin/churches');
} catch (e) {
    // Fallback: try production/dist path
    try {
        churchesModule = require('../api/churches');
    } catch (e2) {
        // Last fallback: try relative path
        try {
            churchesModule = require('./churches');
        } catch (e3) {
            // Last resort: create minimal stub (prevents crash)
            console.warn('⚠️  [routes/admin/churches] Failed to load churches router from all paths, using stub');
            const express = require('express');
            const stubRouter = express.Router();
            stubRouter.use((req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Service temporarily unavailable',
                    message: 'Churches router failed to load'
                });
            });
            churchesModule = stubRouter;
        }
    }
}
// Ensure we export a router, not an object
if (churchesModule && typeof churchesModule.use === 'function') {
    // It's already a router
    module.exports = churchesModule;
} else if (churchesModule && churchesModule.router && typeof churchesModule.router.use === 'function') {
    // Extract router from object
    module.exports = churchesModule.router;
} else {
    // Fallback: create stub router
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req, res) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Churches router failed to load'
        });
    });
    module.exports = stubRouter;
}
