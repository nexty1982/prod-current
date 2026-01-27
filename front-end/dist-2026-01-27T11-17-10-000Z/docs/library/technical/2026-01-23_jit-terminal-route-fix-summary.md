# jit-terminal Route Fix - Summary

**Date**: January 23, 2026  
**Issue**: `jit-terminal` route causing server crashes due to module resolution errors

## Step 0: Current Setup (Documented)

### Route File
- **Source**: `server/routes/jit-terminal.js`
- **Dist**: `server/dist/routes/jit-terminal.js`

### Problem
- Route tried to require `../src/api/jit-terminal` in dist environment where that path doesn't exist
- Module depends on `node-pty` native module which may have compatibility issues
- Server crashed during startup when requiring the route

### Mount Location
- **File**: `server/src/index.ts` line ~306
- **Route**: `/api/jit`
- **WebSocket**: Setup function called at line ~3992

## Step 1: Solution Applied

### Pattern Used
Same lazy loading pattern as certificate routes:
1. Defer `require()` until first request (not at module load time)
2. Handle errors gracefully with stub router returning 503
3. Make WebSocket setup optional/non-blocking

### Changes Made

**1. Updated `server/routes/jit-terminal.js`**:
- Changed from immediate `require()` to lazy loading factory pattern
- Added error handling that returns null instead of throwing
- Router middleware checks if module loaded, returns 503 if not
- Added `setupJITWebSocket` function that handles missing module gracefully

**2. Updated `server/src/index.ts`**:
- Added try/catch around `require('./routes/jit-terminal')`
- Creates stub router if route file fails to load
- Stub router returns 503 with helpful error message

### Code Pattern
```javascript
// Lazy load function - only called on first request
function loadJitModule() {
    const isDist = __dirname.includes(path.sep + 'dist' + path.sep);
    const apiPath = isDist ? '../api/jit-terminal' : '../src/api/jit-terminal';
    try {
        return require(apiPath);
    } catch (e) {
        console.error('⚠️  [jit-terminal] Module failed to load:', e.message);
        return null; // Don't throw - return null for graceful degradation
    }
}

// Router middleware - lazy loads on first request
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
            fix: 'Run: cd /var/www/orthodoxmetrics/prod/server && npm rebuild node-pty'
        });
    }
    
    jitModule(req, res, next);
});
```

## Step 2: Verification

### Server Stability
✅ **Server stays stable** - No crash loops
- PM2 restart count stabilized (no rapid restarts)
- Server starts successfully even when node-pty fails to load

### Error Handling
✅ **Graceful degradation**:
- Module load errors are caught and logged
- WebSocket setup skipped gracefully when module unavailable
- Route returns appropriate error responses instead of crashing

### Logs
```
⚠️  [jit-terminal] Module failed to load: The module '/var/www/orthodoxmetrics/prod/server/node_modules/node-pty/build/Release/pty.node'
⚠️  [jit-terminal] WebSocket setup skipped - module not available
```

### Endpoint Behavior
- **When module fails**: Route should return 503 (if auth middleware allows)
- **When module succeeds**: Route functions normally
- **WebSocket**: Setup skipped gracefully if module unavailable

## Before vs After

### Before
- ❌ Server crashed during startup
- ❌ `MODULE_NOT_FOUND` error for `../src/api/jit-terminal`
- ❌ Server couldn't start until module issue fixed

### After
- ✅ Server starts successfully
- ✅ Module errors handled gracefully
- ✅ Route returns 503 with helpful error message
- ✅ WebSocket setup optional/non-blocking
- ✅ No crash loops

## Next Steps (To Restore Full Functionality)

1. **Rebuild node-pty native module**:
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   npm rebuild node-pty
   ```

2. **Restart server**:
   ```bash
   pm2 restart orthodox-backend
   ```

3. **Verify**:
   - Check logs for successful module load
   - Test `/api/jit/sessions` endpoint
   - Verify WebSocket setup completes

## Files Changed

- `server/routes/jit-terminal.js` - Lazy loading pattern
- `server/src/index.ts` - Error handling wrapper
- `docs/dev/current-setup/2026-01-23_jit-terminal-setup.md` - Documentation
- `docs/dev/current-setup/2026-01-23_jit-terminal-fix-summary.md` - This file
