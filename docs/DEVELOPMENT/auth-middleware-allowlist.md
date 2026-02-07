# Auth Middleware Allowlist for System Routes

**Date**: February 4, 2026  
**Status**: ✅ Complete  
**Issue**: Auth middleware blocking health check and maintenance status endpoints

## Problem

Even though health and maintenance routes were defined without explicit auth requirements in their routers, when auth middleware was applied globally or to parent routes, it would block these endpoints from being accessed without authentication.

This prevented:
- External monitoring systems from checking health
- Frontend from polling maintenance status
- Uptime monitors from verifying backend is responsive

## Solution

Added an **exact-path allowlist** at the top of the `authMiddleware` function that bypasses authentication for specific system routes.

## Changes Made

### File: `server/src/middleware/auth.js`

#### Added Allowlist (Lines 6-22)

**Location**: Immediately at the start of `authMiddleware`, before any authentication checks

```javascript
const authMiddleware = (req, res, next) => {
  // ============================================================================
  // SYSTEM ROUTES ALLOWLIST - No auth required for health checks
  // ============================================================================
  const PUBLIC_SYSTEM_ROUTES = [
    '/api/system/health',
    '/api/maintenance/status'
  ];
  
  // Check if current path matches any public system route (exact match only)
  const requestPath = req.path || req.url;
  if (PUBLIC_SYSTEM_ROUTES.includes(requestPath)) {
    console.log(`🔓 [AUTH BYPASS] Public system route accessed: ${requestPath}`);
    console.log(`   → Skipping authentication for health/monitoring endpoint`);
    return next();
  }
  // ============================================================================

  const hasOMSession = req.headers.cookie?.includes('orthodoxmetrics.sid=');
  // ... rest of auth middleware
```

### How It Works

1. **Early Exit**: Allowlist check happens FIRST, before any session/JWT validation
2. **Exact Match Only**: Uses `includes()` for exact path matching (no wildcards, no regex)
3. **Debug Logging**: Logs when bypass occurs with `🔓 [AUTH BYPASS]` prefix
4. **No User Attachment**: Simply calls `next()` without setting `req.user`
5. **No Session Requirement**: Completely skips session and JWT checks

### Routes Allowed

#### ✅ `/api/system/health`
- System health check
- Returns: status, uptime, database, memory metrics
- Used by: Monitoring systems, uptime checkers, frontend

#### ✅ `/api/maintenance/status`
- Maintenance mode status
- Returns: maintenance boolean, status, startTime
- Used by: Frontend to show maintenance page

### Routes Still Protected

All other routes continue to require authentication as normal:
- ❌ `/api/system/status` - Still requires super_admin
- ❌ `/api/system/config` - Still requires admin/dev
- ❌ `/api/maintenance/toggle` - Still requires super_admin
- ❌ `/api/*` - All other routes require authentication

## Security Considerations

### ✅ Safe Design

1. **Exact Match Only**: No wildcards, no regex patterns, no path traversal
2. **Minimal Exposure**: Only 2 routes allowed
3. **Read-Only**: Both endpoints only read system state, no mutations
4. **No Sensitive Data**: Health metrics and maintenance status contain no user data
5. **Industry Standard**: Health checks are commonly public (Kubernetes probes, etc.)

### ✅ No Weakening of Security

- No changes to session validation logic
- No changes to JWT validation logic
- No bypass for user routes
- No role-based exceptions
- No authentication required elsewhere is affected

### ❌ What's NOT Allowed

- No wildcards: `/api/system/*` ❌
- No patterns: `/api/**/health` ❌
- No similar paths: `/api/health` ❌
- No user routes: `/api/user/*` ❌

## Testing

### Manual Testing

```bash
# Test health endpoint (should return 200 without auth)
curl http://localhost:3001/api/system/health

# Expected response:
{
  "status": "ok",
  "uptime": 86400,
  "timestamp": "2026-02-04T...",
  "database": { "success": true },
  "memory": { "heapUsed": 245, "heapTotal": 512, "rss": 768 }
}

# Test maintenance status (should return 200 without auth)
curl http://localhost:3001/api/maintenance/status

# Expected response:
{
  "maintenance": false,
  "status": "production",
  "startTime": null,
  "message": null
}

# Test protected route (should return 401)
curl http://localhost:3001/api/system/status

# Expected response:
{
  "error": "Authentication required",
  "code": "NO_SESSION"
}
```

### Check Logs

When health endpoints are accessed, you should see:

```
🔓 [AUTH BYPASS] Public system route accessed: /api/system/health
   → Skipping authentication for health/monitoring endpoint
```

## Monitoring Integration

These endpoints are now safe to use with:

### Uptime Monitors
- Pingdom
- UptimeRobot
- StatusPage.io
- Custom monitoring scripts

### Health Check Endpoints
- Kubernetes liveness/readiness probes
- Docker health checks
- Load balancer health checks
- HAProxy health checks

### Example Kubernetes Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/system/health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  
readinessProbe:
  httpGet:
    path: /api/system/health
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Related Fixes

This auth middleware bypass works in conjunction with:

1. **systemStatus.js** - Added public `/health` endpoint
2. **maintenance-public.js** - Enhanced error handling for `/status` endpoint
3. **index.ts** - Removed duplicate health handler

All three changes together ensure:
- Routes are properly defined
- Routes don't require auth in their handlers
- Auth middleware doesn't block them anyway

## Deployment

The changes are in:
- `server/src/middleware/auth.js`

After deployment:
1. Build server: `npm run build`
2. Restart PM2: `pm2 restart orthodoxmetrics-server`
3. Test endpoints without auth
4. Check logs for `🔓 [AUTH BYPASS]` messages

## Success Criteria

✅ `/api/system/health` accessible without auth (returns 200)  
✅ `/api/maintenance/status` accessible without auth (returns 200)  
✅ Logs show `🔓 [AUTH BYPASS]` when these endpoints are accessed  
✅ All other routes still require authentication  
✅ No req.user is set for bypassed routes  
✅ No session validation occurs for bypassed routes

---

**Last Updated**: February 4, 2026  
**Status**: Ready for Testing
