# jit-terminal Route Setup Documentation

**Date**: January 23, 2026  
**Issue**: `jit-terminal` route causing server crashes due to module resolution errors

## Step 0: Current Setup

### Route File Location
- **Source**: `server/routes/jit-terminal.js`
- **Dist**: `server/dist/routes/jit-terminal.js`

### Current Implementation
```javascript
// Support both development (../src/api/jit-terminal) and production (../api/jit-terminal) paths
let jitModule;
try {
    jitModule = require('../api/jit-terminal');
} catch (e) {
    jitModule = require('../src/api/jit-terminal');  // ❌ This path doesn't exist in dist
}
module.exports = jitModule;
```

### Mount Location
- **File**: `server/src/index.ts`
- **Line**: ~306: `const jitTerminalRouter = require('./routes/jit-terminal');`
- **Mount**: Line ~550: `app.use('/api/jit', jitTerminalRouter);`
- **WebSocket Setup**: Line ~3992: `jitTerminalRouter.setupJITWebSocket(server)`

### Dependencies
The `server/src/api/jit-terminal.js` module requires:
- `node-pty` - Native module (similar to canvas issue)
- Other dependencies that may fail in dist environment

### Current Error
```
Error: Cannot find module '../src/api/jit-terminal'
Require stack:
- /var/www/orthodoxmetrics/prod/server/dist/routes/jit-terminal.js
- /var/www/orthodoxmetrics/prod/server/dist/index.js
```

**Impact**: Server crashes during startup when trying to require the route, preventing server from starting.

### Pattern Reference
The certificate routes use:
1. `_moduleLoader.js` helper for path detection
2. Lazy loading pattern (factory function) to defer module loading until first request
3. Graceful degradation - return stub router with 503 if module fails to load

## Solution Approach

Apply the same pattern as certificate routes:
1. Use lazy loading to defer `require()` until first request
2. Handle errors gracefully with stub router
3. Ensure WebSocket setup is optional/non-blocking
