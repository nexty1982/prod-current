# Build Events System - Quick Start Guide

**Purpose:** Enable build lifecycle tracking and admin notifications

## Prerequisites

1. Database migration applied
2. Backend rebuilt
3. Environment variable configured

## Setup Steps

### Step 1: Apply Database Migration

```bash
cd /var/www/orthodoxmetrics/prod/server
mysql -u orthodoxapps -p orthodoxmetrics_db < database/migrations/2026-01-23_build-events-tables.sql
```

### Step 2: Set Environment Variable

Add to `server/.env`:
```bash
OM_BUILD_EVENT_TOKEN=$(openssl rand -hex 32)
```

Or manually:
```bash
OM_BUILD_EVENT_TOKEN=your-secure-random-token-here
```

### Step 3: Rebuild Backend

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
pm2 restart orthodox-backend
```

### Step 4: Verify

```bash
# Run verification script
chmod +x /var/www/orthodoxmetrics/prod/scripts/verify-build-events.sh
/var/www/orthodoxmetrics/prod/scripts/verify-build-events.sh
```

## Usage

### Running a Build

Builds automatically emit events when `OM_BUILD_EVENT_TOKEN` is set:

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build:deploy
```

**What Happens:**
1. Build emits `build_started` event → Admins get notification
2. Each stage emits `stage_started` / `stage_completed` events
3. Heartbeat every 25 seconds (keeps status "running")
4. On completion: `build_completed` → Success notification
5. On failure: `build_failed` → Failure notification (high priority)

### Checking Build Status (API)

```bash
# As admin user (with session cookie)
curl -b cookies.txt http://127.0.0.1:3001/api/admin/build-status
```

**Response:**
```json
{
  "success": true,
  "running": false,
  "activeRun": null,
  "updatedAt": "2026-01-23T12:00:00.000Z"
}
```

When build is running:
```json
{
  "success": true,
  "running": true,
  "activeRun": {
    "runId": "uuid-here",
    "env": "prod",
    "origin": "server",
    "command": "npm run build:deploy",
    "host": "hostname",
    "pid": 12345,
    "startedAt": "2026-01-23T12:00:00.000Z",
    "lastHeartbeatAt": "2026-01-23T12:00:25.000Z",
    "meta": {
      "repo": "orthodoxmetrics",
      "branch": "main",
      "commit": "abc1234"
    }
  },
  "updatedAt": "2026-01-23T12:00:30.000Z"
}
```

### Checking Notifications (UI)

1. Log in as admin or super_admin
2. Check notifications panel/bell icon
3. Should see:
   - "Build Started: prod server" when build begins
   - "Build Completed: prod server" when build succeeds
   - "Build Failed: prod server" when build fails (high priority)

## Troubleshooting

### Build Events Not Appearing

1. **Check token is set:**
   ```bash
   echo $OM_BUILD_EVENT_TOKEN
   # Should output token value
   ```

2. **Check backend logs:**
   ```bash
   pm2 logs orthodox-backend --lines 50 | grep -i "build"
   ```

3. **Test endpoint manually:**
   ```bash
   curl -X POST http://127.0.0.1:3001/api/internal/build-events \
     -H "Content-Type: application/json" \
     -H "X-OM-BUILD-TOKEN: your-token" \
     -d '{"runId":"test","event":"build_started","env":"prod","origin":"server","command":"test"}'
   ```

### Notifications Not Appearing

1. **Check user roles:**
   ```bash
   mysql -u orthodoxapps -p orthodoxmetrics_db -e "SELECT id, email, role FROM users WHERE role IN ('admin', 'super_admin');"
   ```

2. **Check notification types:**
   ```bash
   mysql -u orthodoxapps -p orthodoxmetrics_db -e "SELECT * FROM notification_types WHERE name LIKE 'build%';"
   ```

3. **Check notifications table:**
   ```bash
   mysql -u orthodoxapps -p orthodoxmetrics_db -e "SELECT * FROM notifications WHERE notification_type_id IN (SELECT id FROM notification_types WHERE name LIKE 'build%') ORDER BY created_at DESC LIMIT 5;"
   ```

### Build Status Always Shows Running

- Check heartbeat timeout (default 90 seconds)
- Stale builds should auto-cleanup
- Manually check: `SELECT * FROM build_runs WHERE status='running' AND last_heartbeat_at < DATE_SUB(NOW(), INTERVAL 90 SECOND);`

## Files Reference

- **Migration:** `server/database/migrations/2026-01-23_build-events-tables.sql`
- **Service:** `server/src/api/buildEvents.js`
- **Internal Route:** `server/src/routes/internal/buildEvents.js`
- **Admin Route:** `server/src/routes/admin/buildStatus.js`
- **Emitter:** `server/scripts/build-event-emitter.js`
- **Build Script:** `server/scripts/build-all.js` (modified)

## API Reference

### POST /api/internal/build-events
- **Auth:** `X-OM-BUILD-TOKEN` header
- **Body:** Build event JSON (see implementation summary)

### GET /api/admin/build-status
- **Auth:** Session (admin/super_admin)
- **Query:** `?heartbeatTimeout=90` (optional)
