// Routes/logs.js - Bridge to the actual logs API (built path in dist)
// Safe require helper (local fallback if utils/safeRequire not available)
function safeRequire(modulePath, fallbackFactory, moduleName) {
  try {
    return require(modulePath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      if (moduleName && !safeRequire._warned) {
        safeRequire._warned = safeRequire._warned || new Set();
        if (!safeRequire._warned.has(moduleName)) {
          console.warn(`⚠️  [routes/logs] Module not found: ${modulePath} - using fallback`);
          safeRequire._warned.add(moduleName);
        }
      }
      return fallbackFactory();
    }
    throw error;
  }
}

// Try to use shared safeRequire if available, otherwise use local one
let useSafeRequire = safeRequire;
try {
  const sharedSafeRequire = require('../utils/safeRequire');
  if (sharedSafeRequire && sharedSafeRequire.safeRequire) {
    useSafeRequire = sharedSafeRequire.safeRequire;
  }
} catch (e) {
  // Use local safeRequire defined above
}

// Try multiple paths for logs module
const logsModule = useSafeRequire(
  '../api/logs',
  () => useSafeRequire(
    '../src/api/logs',
    () => {
      // Fallback: create minimal router and logMessage
      const express = require('express');
      const router = express.Router();
      const logMessage = function(level, service, message, details, req) {
        console.log(`[${level.toUpperCase()}] [${service}] ${message}`, details || '');
      };
      return { router, logMessage };
    },
    'logs (src/api/logs)'
  ),
  'logs (api/logs)'
);

module.exports = { 
    router: logsModule.router,
    logMessage: logsModule.logMessage
};
