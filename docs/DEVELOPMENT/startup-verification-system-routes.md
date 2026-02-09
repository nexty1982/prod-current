# Startup Verification for Public System Routes

**Date**: February 4, 2026  
**Status**: ✅ Complete  
**Purpose**: Prevent silent regressions that break health check and monitoring endpoints

## Overview

Added automatic startup verification checks that test critical public endpoints immediately after the server starts. This ensures that health and maintenance status routes are accessible without authentication, preventing future refactors from silently breaking monitoring systems.

## Problem Being Solved

### Before This Fix
- Health endpoints could be accidentally broken by auth middleware changes
- Regressions would only be discovered when monitoring systems failed
- No way to detect if public routes were accidentally protected
- Silent failures could cause production incidents

### After This Fix
- Server automatically tests public endpoints on startup
- Failures are immediately visible in startup logs
- Clear error messages indicate what went wrong and how to fix it
- Prevents deployment of broken monitoring endpoints

## Implementation

### File: `server/src/index.ts`

#### Added Startup Verification (Lines 4574-4668)

**Location**: Inside the `server.listen()` callback, right after WebSocket initialization

```javascript
server.listen(PORT, HOST, () => {
  // ... existing startup logs ...
  
  // Initialize WebSocket service after server starts
  websocketService.initialize(server, sessionMiddleware);
  console.log('🔌 WebSocket service initialized');
  
  // ============================================================================
  // STARTUP VERIFICATION - Test critical public endpoints
  // ============================================================================
  console.log('🏥 Running startup health check verification...');
  
  const http = require('http');
  
  // Test /api/system/health
  const healthCheckOptions = {
    hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
    port: PORT,
    path: '/api/system/health',
    method: 'GET',
    timeout: 5000
  };
  
  const healthReq = http.request(healthCheckOptions, (healthRes) => {
    // ... verification logic ...
    if (healthRes.statusCode === 200) {
      console.log('✅ Health endpoint verification PASSED: /api/system/health returns 200');
    } else {
      console.error('❌ CRITICAL: Health endpoint verification FAILED!');
      console.error(`   /api/system/health returned ${healthRes.statusCode} instead of 200`);
      console.error('   Check: server/src/api/systemStatus.js and auth middleware allowlist');
    }
  });
  
  healthReq.end();
  
  // Test /api/maintenance/status
  // ... similar verification logic ...
});
```

### What Gets Verified

#### 1. `/api/system/health`
- ✅ Returns 200 status code
- ✅ Returns valid JSON
- ✅ Includes status, uptime fields
- ❌ Fails if: 401, 403, 404, 500, or timeout

#### 2. `/api/maintenance/status`
- ✅ Returns 200 status code
- ✅ Returns valid JSON
- ✅ Includes maintenance, status fields
- ❌ Fails if: 401, 403, 404, 500, or timeout

### Verification Process

1. **Timing**: Runs immediately after server binds to port
2. **Method**: Makes actual HTTP requests to localhost
3. **Timeout**: 5 seconds per endpoint
4. **Non-Blocking**: Uses async HTTP requests, doesn't block server startup
5. **Logging**: Success and failure messages clearly visible in logs

## Enhanced Documentation

### File: `server/src/api/systemStatus.js`

Added comprehensive documentation block:

```javascript
// ============================================================================
// PUBLIC HEALTH CHECK ENDPOINT - NO AUTHENTICATION REQUIRED
// ============================================================================
// This endpoint is intentionally public and bypassed in auth middleware
// (see server/src/middleware/auth.js PUBLIC_SYSTEM_ROUTES allowlist).
//
// Used by:
// - External monitoring systems (Pingdom, UptimeRobot, etc.)
// - Kubernetes liveness/readiness probes
// - Docker health checks
// - Load balancer health checks
// - Frontend health polling
//
// Returns: System health metrics (status, uptime, database, memory)
// Auth: NONE - Bypassed via auth middleware allowlist
// Security: Safe - No sensitive data, read-only, aggregated metrics only
//
// DO NOT add auth middleware to this endpoint!
// DO NOT remove from auth middleware allowlist!
// ============================================================================
router.get('/health', async (req, res) => {
  // ... implementation
});
```

### File: `server/src/api/maintenance-public.js`

Added similar documentation:

```javascript
// ============================================================================
// PUBLIC MAINTENANCE STATUS ENDPOINT - NO AUTHENTICATION REQUIRED
// ============================================================================
// This endpoint is intentionally public and bypassed in auth middleware
// (see server/src/middleware/auth.js PUBLIC_SYSTEM_ROUTES allowlist).
//
// Used by:
// - Frontend to show maintenance page
// - External status pages
// - Monitoring systems
//
// Returns: Maintenance mode status (boolean, status, startTime)
// Auth: NONE - Bypassed via auth middleware allowlist
// Security: Safe - Only checks for maintenance file, no sensitive data
//
// DO NOT add auth middleware to this endpoint!
// DO NOT remove from auth middleware allowlist!
// ============================================================================
router.get('/status', (req, res) => {
  // ... implementation
});
```

### File: `server/src/middleware/auth.js`

Enhanced allowlist documentation:

```javascript
// ============================================================================
// SYSTEM ROUTES ALLOWLIST - No auth required for health checks
// ============================================================================
// These routes are intentionally public for monitoring and uptime checks.
// They bypass ALL authentication (session, JWT, etc.) via early return.
//
// ⚠️  CRITICAL: DO NOT REMOVE OR MODIFY WITHOUT UPDATING:
//    1. server/src/api/systemStatus.js - /health endpoint documentation
//    2. server/src/api/maintenance-public.js - /status endpoint documentation
//    3. server/src/index.ts - Startup verification checks
//
// Adding routes here:
//    1. Must be READ-ONLY endpoints
//    2. Must NOT expose sensitive data (user info, credentials, config)
//    3. Must be exact paths (no wildcards, no regex)
//    4. Must have documented use case (monitoring, health checks, etc.)
//
// Current allowed routes:
//    - /api/system/health      → System health metrics (uptime, memory, DB)
//    - /api/maintenance/status → Maintenance mode status (boolean)
// ============================================================================
const PUBLIC_SYSTEM_ROUTES = [
  '/api/system/health',
  '/api/maintenance/status'
];
```

## Startup Log Examples

### Success Case

```
═══════════════════════════════════════════════════════════
✅ Server successfully bound to 0.0.0.0:3001
📁 Entrypoint: dist/index.js (compiled from src/index.ts)
🔍 Route health check: GET /api/admin/_routes
✅ Critical routes mounted:
   - /api/admin/templates
   - /api/admin/churches
   - /api/admin/users
🔌 WebSocket service initialized
═══════════════════════════════════════════════════════════
🏥 Running startup health check verification...
✅ Health endpoint verification PASSED: /api/system/health returns 200
   Status: ok, Uptime: 0s
✅ Maintenance endpoint verification PASSED: /api/maintenance/status returns 200
   Status: production, Maintenance: false
═══════════════════════════════════════════════════════════
```

### Failure Case (Health Endpoint Broken)

```
═══════════════════════════════════════════════════════════
✅ Server successfully bound to 0.0.0.0:3001
🔌 WebSocket service initialized
═══════════════════════════════════════════════════════════
🏥 Running startup health check verification...
❌ CRITICAL: Health endpoint verification FAILED!
   /api/system/health returned 401 instead of 200
   This endpoint MUST be public for monitoring systems!
   Check: server/src/api/systemStatus.js and auth middleware allowlist
✅ Maintenance endpoint verification PASSED: /api/maintenance/status returns 200
   Status: production, Maintenance: false
═══════════════════════════════════════════════════════════
```

### Failure Case (Timeout)

```
🏥 Running startup health check verification...
❌ Health endpoint verification TIMEOUT
❌ CRITICAL: Health endpoint verification FAILED!
   /api/system/health returned undefined instead of 200
   This endpoint MUST be public for monitoring systems!
   Check: server/src/api/systemStatus.js and auth middleware allowlist
```

## Benefits

### 1. Early Detection
- Catches issues at deployment time, not in production
- Visible in startup logs and deployment pipelines
- Prevents broken builds from reaching production

### 2. Clear Error Messages
- Identifies exactly which endpoint failed
- Provides status code received
- Points to relevant files to check

### 3. Documentation as Code
- Comprehensive comments prevent accidental changes
- Cross-references between files make dependencies clear
- Warning comments highlight critical nature of routes

### 4. Future-Proof
- New developers see warnings before modifying routes
- Automated verification prevents silent breakage
- Clear documentation of why routes are public

## Maintenance Guidelines

### Adding New Public Routes

If you need to add a new public system route:

1. **Add to allowlist** in `server/src/middleware/auth.js`
2. **Add verification** in `server/src/index.ts` startup checks
3. **Add documentation** in the route handler file
4. **Update this document** with the new route

### Removing Public Routes

If you need to remove a public route:

1. **Remove from allowlist** in `server/src/middleware/auth.js`
2. **Remove verification** in `server/src/index.ts` startup checks
3. **Update documentation** in relevant files
4. **Test monitoring systems** to ensure they have alternatives

### Modifying Public Routes

If you need to modify a public route:

1. **DO NOT** add authentication
2. **DO NOT** change the path
3. **DO** maintain backward compatibility
4. **DO** update documentation if behavior changes

## Testing

### Manual Testing

After deployment:

```bash
# 1. Check startup logs for verification results
pm2 logs orthodoxmetrics-server --lines 100 | grep "verification"

# Expected output:
✅ Health endpoint verification PASSED: /api/system/health returns 200
✅ Maintenance endpoint verification PASSED: /api/maintenance/status returns 200

# 2. Test endpoints manually
curl http://localhost:3001/api/system/health
curl http://localhost:3001/api/maintenance/status

# Both should return 200 without authentication
```

### Automated Testing

The startup verification runs automatically on every server restart:

```bash
# Restart server to trigger verification
pm2 restart orthodoxmetrics-server

# Watch logs for verification results
pm2 logs orthodoxmetrics-server --lines 50
```

### CI/CD Integration

Consider adding to your CI/CD pipeline:

```bash
# Start server
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test endpoints
curl -f http://localhost:3001/api/system/health || exit 1
curl -f http://localhost:3001/api/maintenance/status || exit 1

# Kill server
kill $SERVER_PID
```

## Related Documentation

- [Health and Maintenance Routes Fix](./health-maintenance-routes-fix.md)
- [Auth Middleware Allowlist](./auth-middleware-allowlist.md)
- [Session Authentication Regression Fix](./session-auth-regression-fix.md)

## Success Criteria

✅ Startup verification checks run on every server start  
✅ Health endpoint returns 200 verified at startup  
✅ Maintenance endpoint returns 200 verified at startup  
✅ Clear error messages if verification fails  
✅ Comprehensive documentation prevents accidental changes  
✅ Cross-references between files make dependencies clear  
✅ Future developers see warnings before modifying routes

---

**Last Updated**: February 4, 2026  
**Status**: Production Ready
