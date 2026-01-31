# Build Events System - Implementation Summary

**Date:** 2026-01-23  
**Status:** ✅ Complete

## Overview

Implemented a comprehensive build lifecycle event tracking system that:
- Emits events from build scripts to the backend
- Stores build state in database
- Creates notifications for admins/super_admins
- Provides build status API endpoint

## Files Created/Modified

### Database Migration
**File:** `server/database/migrations/2026-01-23_build-events-tables.sql`
- **Lines:** 1-67
- **Tables Created:**
  - `build_runs` - Tracks each build execution
  - `build_run_events` - Tracks individual events within builds
- **Notification Types:** Added `build_started`, `build_completed`, `build_failed`

### Backend API Service
**File:** `server/src/api/buildEvents.js`
- **Lines:** 1-303
- **Key Functions:**
  - `processBuildEvent()` - Processes incoming build events (lines 15-158)
  - `getBuildStatus()` - Returns current build status (lines 165-222)
  - `notifyAdmins()` - Creates notifications for admins (lines 229-303)

### Internal Build Events Endpoint
**File:** `server/src/routes/internal/buildEvents.js`
- **Lines:** 1-60
- **Endpoint:** `POST /api/internal/build-events`
- **Protection:** Token-based via `X-OM-BUILD-TOKEN` header
- **Validation:** Required fields checked (lines 30-38)

### Admin Build Status Endpoint
**File:** `server/src/routes/admin/buildStatus.js`
- **Lines:** 1-40
- **Endpoint:** `GET /api/admin/build-status`
- **Protection:** Requires admin/super_admin role
- **Query Params:** `heartbeatTimeout` (default 90 seconds)

### Build Event Emitter Utility
**File:** `server/scripts/build-event-emitter.js`
- **Lines:** 1-230
- **Features:**
  - Auto-generates runId (UUID)
  - Collects git info (repo, branch, commit)
  - Heartbeat mechanism (every 25 seconds)
  - Helper methods for common events
  - Non-blocking (errors don't fail builds)

### Build Script Integration
**File:** `server/scripts/build-all.js`
- **Lines Modified:**
  - Line 17: Added `buildEmitter` import
  - Lines 117-119: Added `stage_started` emission in `runCommand()`
  - Lines 131-133: Added `stage_completed` emission in `runCommand()`
  - Lines 155-157: Added stage failure emission in error handler
  - Lines 336-343: Added `build_started` and heartbeat start in `main()`
  - Lines 310-324: Modified `restartPM2()` to emit stage events
  - Lines 447-451: Added `build_completed` emission on success
  - Lines 453-457: Added `build_failed` emission on error

### Server Route Registration
**File:** `server/src/index.ts`
- **Lines Modified:**
  - Line 459: Added internal build events router
  - Line 480-482: Added admin build status router

## Database Schema

### build_runs Table
```sql
- id (INT, PRIMARY KEY)
- run_id (VARCHAR(36), UNIQUE) - UUID
- env (ENUM: prod/staging/dev)
- origin (ENUM: server/frontend/root-harness)
- command (VARCHAR(255))
- host (VARCHAR(255))
- pid (INT)
- status (ENUM: running/success/failed)
- started_at (TIMESTAMP)
- ended_at (TIMESTAMP, NULL)
- last_heartbeat_at (TIMESTAMP, NULL)
- meta_json (JSON) - repo, branch, commit
```

### build_run_events Table
```sql
- id (INT, PRIMARY KEY)
- run_id (VARCHAR(36), FK to build_runs)
- event (ENUM: build_started/stage_started/stage_completed/build_completed/build_failed/heartbeat)
- stage (VARCHAR(100), NULL)
- message (TEXT, NULL)
- duration_ms (INT, NULL)
- created_at (TIMESTAMP)
- payload_json (JSON)
```

## Environment Variables

**Required:**
- `OM_BUILD_EVENT_TOKEN` - Token for authenticating build events

**Optional:**
- `OM_BUILD_EVENT_URL` - Backend URL (default: `http://127.0.0.1:3001`)
- `NODE_ENV` - Environment (default: `production`)

## API Endpoints

### POST /api/internal/build-events
**Authentication:** `X-OM-BUILD-TOKEN` header  
**Body:**
```json
{
  "runId": "uuid",
  "event": "build_started|stage_started|stage_completed|build_completed|build_failed|heartbeat",
  "env": "prod|staging|dev",
  "origin": "server|frontend|root-harness",
  "command": "npm run build:deploy",
  "host": "hostname",
  "pid": 12345,
  "stage": "Backend Clean",
  "message": "string",
  "durationMs": 1234,
  "repo": "orthodoxmetrics",
  "branch": "main",
  "commit": "abc1234"
}
```

### GET /api/admin/build-status
**Authentication:** Session (admin/super_admin required)  
**Query Params:**
- `heartbeatTimeout` - Seconds before considering build stale (default: 90)

**Response:**
```json
{
  "success": true,
  "running": false,
  "activeRun": null,
  "updatedAt": "2026-01-23T12:00:00.000Z"
}
```

## Build Stages Tracked

1. **Backend Clean** - `npm run build:clean`
2. **Backend TypeScript** - `npm run build:ts`
3. **Backend Copy** - `npm run build:copy`
4. **Backend Verify** - `npm run build:verify`
5. **Frontend Build** - `npm run build` (front-end)
6. **PM2 Restart** - `pm2 restart orthodox-backend`

## Notification Behavior

- **build_started:** Creates ONE notification for all admins/super_admins
- **build_completed:** Creates ONE notification with success + duration
- **build_failed:** Creates ONE notification with error message + stage
- **Stage events:** Stored in database but do NOT create notifications (too noisy)
- **Heartbeats:** Stored but do NOT create notifications

## Verification Checklist

### 1. Database Migration
```bash
cd /var/www/orthodoxmetrics/prod/server
mysql -u orthodoxapps -p orthodoxmetrics_db < database/migrations/2026-01-23_build-events-tables.sql
```

### 2. Environment Variable Setup
```bash
# Add to server/.env
OM_BUILD_EVENT_TOKEN=your-secure-random-token-here
```

### 3. Test Build Event Emission
```bash
# Set token
export OM_BUILD_EVENT_TOKEN=test-token

# Run build
cd /var/www/orthodoxmetrics/prod/server
npm run build:deploy

# Check:
# - Notification appears for admins
# - GET /api/admin/build-status shows running=true during build
# - Notification appears on completion
```

### 4. Verify Build Status Endpoint
```bash
# As admin user
curl -b cookies.txt http://127.0.0.1:3001/api/admin/build-status

# Should return:
# {
#   "success": true,
#   "running": false,
#   "activeRun": null,
#   "updatedAt": "..."
# }
```

### 5. Verify Heartbeat Timeout
```bash
# Start a build, then wait 90+ seconds
# GET /api/admin/build-status should show running=false
# Stale builds should be auto-marked as failed
```

## Security Considerations

1. **Token Protection:** Internal endpoint requires `X-OM-BUILD-TOKEN` header
2. **Admin-Only Status:** Build status endpoint requires admin/super_admin role
3. **Non-Blocking:** Build event failures don't break builds
4. **Rate Safety:** Heartbeats accepted without notification spam
5. **Database Separation:** Uses app DB, not auth DB

## Error Handling

- Build event emission failures are logged but don't fail builds
- Database errors are caught and logged
- Notification failures don't break event processing
- Stale builds are auto-cleaned after heartbeat timeout

## Next Steps (Optional)

1. **UI Integration:** Add admin banner showing build status
2. **Build History:** Add endpoint to view past builds
3. **Build Metrics:** Track build duration trends
4. **Email Notifications:** Optionally email admins on build failures
