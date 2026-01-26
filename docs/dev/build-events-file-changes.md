# Build Events System - File Changes Summary

**Date:** 2026-01-23  
**Total Files Created:** 6  
**Total Files Modified:** 2

## Files Created

### 1. Database Migration
**File:** `server/database/migrations/2026-01-23_build-events-tables.sql`  
**Lines:** 67  
**Purpose:** Creates `build_runs` and `build_run_events` tables, adds notification types

**Key Sections:**
- Lines 12-30: `build_runs` table definition
- Lines 35-48: `build_run_events` table definition
- Lines 52-54: Notification types insertion
- Lines 58-61: Indexes for performance

### 2. Build Events Service
**File:** `server/src/api/buildEvents.js`  
**Lines:** 303  
**Purpose:** Core service for processing build events and managing notifications

**Key Functions:**
- Lines 15-158: `processBuildEvent()` - Main event processor
- Lines 165-222: `getBuildStatus()` - Status retrieval with stale cleanup
- Lines 229-299: `notifyAdmins()` - Admin notification creation

**Key Logic:**
- Lines 46-60: `build_started` handling - Creates build_runs record
- Lines 63-66: `heartbeat` handling - Updates last_heartbeat_at
- Lines 69-85: `build_completed` handling - Updates status, calculates duration
- Lines 88-98: `build_failed` handling - Updates status, captures error
- Lines 100-115: Event insertion into `build_run_events`
- Lines 234-244: Admin user query (admin/super_admin roles)
- Lines 252-269: Notification message formatting

### 3. Internal Build Events Route
**File:** `server/src/routes/internal/buildEvents.js`  
**Lines:** 60  
**Purpose:** Token-protected endpoint for receiving build events

**Key Sections:**
- Lines 12-26: Token validation middleware
- Lines 30-38: Required field validation
- Lines 41-50: Event processing and response

### 4. Admin Build Status Route
**File:** `server/src/routes/admin/buildStatus.js`  
**Lines:** 40  
**Purpose:** Admin-accessible endpoint for build status

**Key Sections:**
- Lines 15-16: Admin role requirement
- Lines 20-21: Heartbeat timeout parameter (default 90s)
- Lines 23-30: Status retrieval and response

### 5. Build Event Emitter Utility
**File:** `server/scripts/build-event-emitter.js`  
**Lines:** 230  
**Purpose:** Utility for build scripts to emit events

**Key Functions:**
- Lines 18-46: Constructor - Initializes runId, git info, origin detection
- Lines 48-75: `getGitInfo()` - Collects git repo/branch/commit
- Lines 77-148: `emit()` - HTTP POST to backend
- Lines 150-175: `startHeartbeat()` / `stopHeartbeat()` - Heartbeat management
- Lines 177-215: Helper methods (`startBuild`, `stageStarted`, `stageCompleted`, `buildCompleted`, `buildFailed`)

**Key Features:**
- Lines 50-52: Non-blocking if token not set
- Lines 130-139: Error handling (non-fatal)
- Lines 141-143: 5-second timeout
- Lines 159-164: Heartbeat every 25 seconds

### 6. Documentation
**Files:**
- `docs/dev/current-setup/2026-01-23_build-events-current-setup.md` (199 lines)
- `docs/dev/build-events-implementation-summary.md` (Created above)

## Files Modified

### 1. Build Script Integration
**File:** `server/scripts/build-all.js`  
**Total Lines:** 470 (unchanged)  
**Lines Modified:** 8 locations

**Changes:**
- **Line 17:** Added `const buildEmitter = require('./build-event-emitter');`
- **Lines 117-119:** Added `await buildEmitter.stageStarted(label).catch(() => {});` in `runCommand()`
- **Lines 131-133:** Added `await buildEmitter.stageCompleted(label, durationMs).catch(() => {});` after successful command
- **Lines 155-157:** Added stage failure emission in error handler
- **Lines 310-324:** Modified `restartPM2()` to wrap in try/catch with stage events
- **Lines 336-343:** Added `build_started` emission and heartbeat start in `main()`
- **Lines 447-451:** Added `build_completed` emission on success
- **Lines 453-457:** Added `build_failed` emission on error

### 2. Server Route Registration
**File:** `server/src/index.ts`  
**Total Lines:** 4165 (unchanged)  
**Lines Modified:** 2 locations

**Changes:**
- **Line 459:** Added internal build events router:
  ```typescript
  const buildEventsRouter = require('./routes/internal/buildEvents');
  app.use('/api/internal', buildEventsRouter);
  ```
- **Lines 480-482:** Added admin build status router:
  ```typescript
  const buildStatusRouter = require('./routes/admin/buildStatus');
  app.use('/api/admin', buildStatusRouter);
  ```

## Line Count Summary

| File | Type | Lines | Status |
|------|------|-------|--------|
| `server/database/migrations/2026-01-23_build-events-tables.sql` | New | 67 | ✅ |
| `server/src/api/buildEvents.js` | New | 303 | ✅ |
| `server/src/routes/internal/buildEvents.js` | New | 60 | ✅ |
| `server/src/routes/admin/buildStatus.js` | New | 40 | ✅ |
| `server/scripts/build-event-emitter.js` | New | 230 | ✅ |
| `server/scripts/build-all.js` | Modified | 470 | ✅ (+8 event emissions) |
| `server/src/index.ts` | Modified | 4165 | ✅ (+2 route mounts) |
| **Total** | | **5,335** | |

## Database Migration Application

**On Server:**
```bash
cd /var/www/orthodoxmetrics/prod/server
mysql -u orthodoxapps -p orthodoxmetrics_db < database/migrations/2026-01-23_build-events-tables.sql
```

**Verify Tables Created:**
```bash
mysql -u orthodoxapps -p orthodoxmetrics_db -e "SHOW TABLES LIKE 'build%';"
mysql -u orthodoxapps -p orthodoxmetrics_db -e "DESCRIBE build_runs;"
mysql -u orthodoxapps -p orthodoxmetrics_db -e "DESCRIBE build_run_events;"
```

## Environment Setup

**Add to `server/.env`:**
```bash
OM_BUILD_EVENT_TOKEN=your-secure-random-token-here
```

**Generate Secure Token:**
```bash
openssl rand -hex 32
```

## Verification Steps

### 1. Database Migration
```bash
# Apply migration
mysql -u orthodoxapps -p orthodoxmetrics_db < server/database/migrations/2026-01-23_build-events-tables.sql

# Verify
mysql -u orthodoxapps -p orthodoxmetrics_db -e "SELECT COUNT(*) FROM build_runs;"
```

### 2. Backend Rebuild
```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
pm2 restart orthodox-backend
```

### 3. Test Build Event Emission
```bash
# Set token in environment
export OM_BUILD_EVENT_TOKEN=test-token-123

# Run build
cd /var/www/orthodoxmetrics/prod/server
npm run build:deploy

# Expected:
# - Notification appears for admins (check UI)
# - GET /api/admin/build-status shows running=true during build
# - Notification appears on completion
```

### 4. Verify Endpoints
```bash
# Test internal endpoint (with token)
curl -X POST http://127.0.0.1:3001/api/internal/build-events \
  -H "Content-Type: application/json" \
  -H "X-OM-BUILD-TOKEN: your-token" \
  -d '{
    "runId": "test-123",
    "event": "build_started",
    "env": "prod",
    "origin": "server",
    "command": "npm run build:deploy"
  }'

# Test status endpoint (as admin)
curl -b cookies.txt http://127.0.0.1:3001/api/admin/build-status
```

### 5. Verify Notifications
- Log in as admin/super_admin
- Check notifications panel
- Should see "Build Started" notification when build runs
- Should see "Build Completed" or "Build Failed" when done

### 6. Verify Heartbeat Timeout
- Start a build
- Wait 90+ seconds without heartbeat
- GET /api/admin/build-status should show `running=false`
- Stale builds should be auto-marked as `failed`

## Security Notes

1. **Token Storage:** `OM_BUILD_EVENT_TOKEN` should be in `.env`, not committed to repo
2. **Internal Endpoint:** Only accessible with valid token (no session auth)
3. **Admin Endpoint:** Requires admin/super_admin role (session-based)
4. **Non-Blocking:** Event failures don't break builds
5. **Database:** Uses app DB (`orthodoxmetrics_db`), not auth DB

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Environment variable `OM_BUILD_EVENT_TOKEN` set
- [ ] Backend rebuilt and restarted
- [ ] Build event emission works (check logs)
- [ ] Notifications appear for admins
- [ ] Build status endpoint returns correct data
- [ ] Heartbeat mechanism works (25s intervals)
- [ ] Stale builds auto-cleanup works (90s timeout)
- [ ] Build failures emit `build_failed` event
- [ ] Build successes emit `build_completed` event
