// Bridge route to api/jit-terminal.js
// Uses lazy loading pattern to handle native module errors gracefully (node-pty)
const express = require('express');
const path = require('path');

// Lazy load the module to handle native dependency errors gracefully
function loadJitModule() {
    // Determine if we're running from dist or source
    const isDist = __dirname.includes(path.sep + 'dist' + path.sep);
    const apiPath = isDist ? '../api/jit-terminal' : '../src/api/jit-terminal';
    
    try {
        return require(apiPath);
    } catch (e) {
        // If module fails to load (e.g., native module compatibility), return null
        console.error('⚠️  [jit-terminal] Module failed to load:', e.message.substring(0, 150));
        return null;
    }
}

// Create router that lazily loads the module
const router = express.Router();
let jitModule = null;
let moduleLoadAttempted = false;

// Lazy load on first request
router.use((req, res, next) => {
    if (!moduleLoadAttempted) {
        moduleLoadAttempted = true;
        jitModule = loadJitModule();
    }
    
    if (jitModule === null) {
        return res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'JIT Terminal module failed to load. Native dependencies may need rebuilding.',
            details: 'node-pty native module compatibility issue. Run "npm rebuild node-pty" in server directory.',
            fix: 'Run: cd /var/www/orthodoxmetrics/prod/server && npm rebuild node-pty'
        });
    }
    
    // Use the actual module
    jitModule(req, res, next);
});

// Export router with optional WebSocket setup function
router.setupJITWebSocket = function(server) {
    if (!moduleLoadAttempted) {
        moduleLoadAttempted = true;
        jitModule = loadJitModule();
    }
    
    if (jitModule === null || !jitModule.setupJITWebSocket) {
        console.warn('⚠️  [jit-terminal] WebSocket setup skipped - module not available');
        return null;
    }
    
    return jitModule.setupJITWebSocket(server);
};

module.exports = router;
