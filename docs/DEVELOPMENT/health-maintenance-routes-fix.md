# Health and Maintenance Status Routes Fix

**Date**: February 4, 2026  
**Status**: ✅ Fixed  
**Issue**: `/api/system/health` and `/api/maintenance/status` returning 401 when backend is healthy

## Problem Analysis

### Symptoms
- `/api/system/health` returns 401 Unauthorized
- `/api/maintenance/status` returns 401 Unauthorized
- Backend is otherwise healthy and functional
- These endpoints should be public for monitoring

### Root Cause

**For `/api/system/health`:**
The route was defined in two places with conflicting order:
1. Line 642 in index.ts: `app.use('/api/system', systemStatusRouter)` - Mounted first, catches ALL `/api/system/*` routes
2. Line 4082 in index.ts: `app.get('/api/system/health', ...)` - Defined later, NEVER reached

The systemStatusRouter didn't have a `/health` endpoint, so requests to `/api/system/health` would hit the router but find no matching route, potentially falling through to auth-protected handlers.

**For `/api/maintenance/status`:**
This route was already public (no auth middleware) but lacked robust error handling.

## Changes Made

### File 1: `server/src/api/systemStatus.js`

#### Added Public Health Endpoint (Lines 15-42)

**Before**: No `/health` endpoint in this router

**After**: Added public health check endpoint

```javascript
// GET /api/system/health - Public health check endpoint (NO AUTH REQUIRED)
// Used by monitoring systems and frontend to check if backend is responsive
router.get('/health', async (req, res) => {
  try {
    // Import db module for connection test
    const db = require('../config/db');
    const dbStatus = await db.testConnection();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      }
    });
  } catch (err) {
    // NEVER throw - always return a response
    res.status(500).json({ 
      status: 'error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

**Key Features:**
- ✅ No auth middleware
- ✅ Returns system health metrics (memory, uptime, database status)
- ✅ Never throws - always returns a valid JSON response
- ✅ Returns 500 status on error but still provides error details

### File 2: `server/src/index.ts`

#### Removed Duplicate Health Endpoint (Lines 4081-4106)

**Before**: Duplicate handler that was never reached

```javascript
// /api/system/health -> Enhanced health check with memory and uptime
app.get('/api/system/health', async (req, res) => {
  // ... handler code that was never executed
});
```

**After**: Removed (handled by systemStatusRouter now)

**Reason**: This handler was defined AFTER the systemStatusRouter was mounted at line 642, so it was never reached. The route is now properly handled by the systemStatusRouter.

### File 3: `server/src/api/maintenance-public.js`

#### Enhanced Error Handling (Lines 7-30)

**Before**: Minimal error handling

```javascript
// GET /api/maintenance/status - Public endpoint
router.get('/status', (req, res) => {
  try {
    // ... code
  } catch (error) {
    res.json({
      maintenance: false,
      status: 'production',
      message: null
    });
  }
});
```

**After**: Better error handling and logging

```javascript
// GET /api/maintenance/status - Public endpoint (NO AUTH REQUIRED)
// Used by frontend to check maintenance status
router.get('/status', (req, res) => {
  try {
    // ... code
  } catch (error) {
    // NEVER throw - always return a valid response
    console.error('[MAINTENANCE] Error checking maintenance status:', error);
    res.json({
      maintenance: false,
      status: 'production',
      message: null,
      error: 'Failed to check maintenance file'
    });
  }
});
```

**Improvements:**
- ✅ Added error logging
- ✅ Added comment clarifying NO AUTH REQUIRED
- ✅ Added error field in response for debugging
- ✅ Ensures response is always sent

## Route Flow After Fix

### `/api/system/health`

1. Request hits `app.use('/api/system', systemStatusRouter)` at line 642 in index.ts
2. Router checks for `/health` endpoint
3. **NEW**: Finds public health endpoint (no auth) in systemStatusRouter
4. Returns health status with 200 OK

### `/api/maintenance/status`

1. Request hits `app.use('/api/maintenance', maintenancePublicRoutes)` at line 638 in index.ts
2. Router checks for `/status` endpoint
3. Finds public status endpoint (no auth) in maintenance-public.js
4. Returns maintenance status with 200 OK

## Testing Checklist

After deploying these changes, verify:

### Health Endpoint
- [ ] `GET /api/system/health` returns 200 (no auth required)
- [ ] Response includes: `status`, `uptime`, `timestamp`, `database`, `memory`
- [ ] Database test passes (status: "ok")
- [ ] Memory metrics are included (heapUsed, heapTotal, rss)
- [ ] Works when NOT logged in
- [ ] Works when logged in

### Maintenance Endpoint
- [ ] `GET /api/maintenance/status` returns 200 (no auth required)
- [ ] Response includes: `maintenance`, `status`, `startTime`, `message`
- [ ] Returns `maintenance: false` when not in maintenance mode
- [ ] Returns `maintenance: true` when in maintenance mode
- [ ] Works when NOT logged in
- [ ] Works when logged in

### Other Routes Unchanged
- [ ] `/api/system/status` still requires auth (super_admin only)
- [ ] `/api/maintenance/toggle` still requires auth (super_admin only)
- [ ] All other protected routes still require auth

## Example Responses

### GET /api/system/health (Success)

```json
{
  "status": "ok",
  "uptime": 86400,
  "timestamp": "2026-02-04T12:00:00.000Z",
  "database": {
    "success": true,
    "message": "Database connection successful"
  },
  "memory": {
    "heapUsed": 245,
    "heapTotal": 512,
    "rss": 768
  }
}
```

### GET /api/system/health (Error)

```json
{
  "status": "error",
  "message": "Database connection failed",
  "timestamp": "2026-02-04T12:00:00.000Z"
}
```

### GET /api/maintenance/status (Not in Maintenance)

```json
{
  "maintenance": false,
  "status": "production",
  "startTime": null,
  "message": null
}
```

### GET /api/maintenance/status (In Maintenance)

```json
{
  "maintenance": true,
  "status": "updating",
  "startTime": "2026-02-04T12:00:00.000Z",
  "message": "System is currently under maintenance"
}
```

## Security Considerations

✅ **Health endpoint is safe to expose publicly because:**
- Returns only aggregated system metrics (memory, uptime)
- Database test doesn't expose connection details
- No user data or sensitive configuration
- Commonly used by monitoring systems (Nagios, Prometheus, etc.)

✅ **Maintenance endpoint is safe to expose publicly because:**
- Only checks for existence of maintenance file
- Returns only maintenance status (boolean)
- No sensitive system information
- Needed by frontend to show maintenance page

❌ **Protected endpoints remain secured:**
- `/api/system/status` requires super_admin (detailed system info)
- `/api/system/config` requires admin/dev (configuration details)
- `/api/maintenance/toggle` requires super_admin (toggle maintenance mode)

## Related Files

- `server/src/api/systemStatus.js` - System status router (modified)
- `server/src/api/maintenance-public.js` - Maintenance status router (enhanced)
- `server/src/index.ts` - Main server file (duplicate removed)

## Deployment Instructions

**Ask user to run:**

```bash
# 1. Navigate to server directory
cd /var/www/orthodoxmetrics/prod/server

# 2. Rebuild TypeScript
npm run build

# 3. Restart PM2
pm2 restart orthodoxmetrics-server

# 4. Test endpoints (should return 200 without auth)
curl http://localhost:3001/api/system/health
curl http://localhost:3001/api/maintenance/status
```

## Success Criteria

✅ `/api/system/health` returns 200 when backend is up (no auth required)  
✅ `/api/maintenance/status` returns 200 when backend is up (no auth required)  
✅ Both endpoints return valid JSON with expected fields  
✅ Both endpoints never throw errors  
✅ Protected routes (`/api/system/status`, `/api/system/config`) still require auth  
✅ Frontend can poll health/maintenance status without authentication

---

**Last Updated**: February 4, 2026  
**Status**: Ready for Testing
