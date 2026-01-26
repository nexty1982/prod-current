// Bridge route to src/routes/admin/users.js
// Support both development (../src/routes/admin/users) and production paths
let usersModule;
try {
    // Try src path (development)
    usersModule = require('../src/routes/admin/users');
} catch (e) {
    // Fallback: try production/dist path
    try {
        usersModule = require('../api/users');
    } catch (e2) {
        // Last fallback: try relative path
        try {
            usersModule = require('./users');
        } catch (e3) {
            // Last resort: create minimal stub (prevents crash)
            console.warn('⚠️  [routes/admin/users] Failed to load users router from all paths, using stub');
            const express = require('express');
            const stubRouter = express.Router();
            stubRouter.use((req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Service temporarily unavailable',
                    message: 'Users router failed to load'
                });
            });
            usersModule = stubRouter;
        }
    }
}
// Ensure we export a router, not an object
if (usersModule && typeof usersModule.use === 'function') {
    // It's already a router
    module.exports = usersModule;
} else if (usersModule && usersModule.router && typeof usersModule.router.use === 'function') {
    // Extract router from object
    module.exports = usersModule.router;
} else {
    // Fallback: create stub router
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req, res) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Users router failed to load'
        });
    });
    module.exports = stubRouter;
}
