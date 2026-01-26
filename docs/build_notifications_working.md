# Notifications System - Detailed Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Components](#backend-components)
5. [Frontend Components](#frontend-components)
6. [Admin Notification Management](#admin-notification-management)
   - [System-Wide Settings](#system-wide-settings)
   - [Custom Notifications](#custom-notifications)
   - [Notification Queue](#notification-queue)
7. [Build Script Integration](#build-script-integration)
8. [Event Lifecycle](#event-lifecycle)
9. [WebSocket Real-Time Updates](#websocket-real-time-updates)
10. [Configuration](#configuration)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Notifications System provides comprehensive notification management for OrthodoxMetrics, including:
- **Build lifecycle notifications** - Automatic notifications for build events (started, completed, failed)
- **System-wide notification settings** - Control which notification types are enabled globally
- **Custom notifications** - Create and schedule custom notifications for specific audiences
- **Notification queue & history** - View and manage all notifications sent through the system

Notifications appear in:
- The bell icon dropdown in the top-right header (with unread badge count)
- The `/social/notifications` page
- The Admin Settings → Notifications section

### Key Features
- **Real-time updates** via WebSocket (no page refresh needed)
- **Automatic notification creation** for admin/super_admin users on build events
- **Build status tracking** in database with heartbeat monitoring
- **Non-blocking** - build failures don't break the build process
- **Retry logic** - waits for backend to be ready after PM2 restart
- **Role-based targeting** - Send notifications to specific user roles
- **Scheduled notifications** - Schedule notifications for future delivery
- **Notification history** - Complete audit trail of all notifications

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Build Script                             │
│  (server/scripts/build-all.js)                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BuildEventEmitter                                       │   │
│  │  - Generates runId (UUID)                                │   │
│  │  - Emits events via HTTP POST                            │   │
│  │  - Handles retries and timeouts                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              │ /api/internal/build-events
                              │ X-OM-BUILD-TOKEN header
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server                              │
│  (server/src/index.ts)                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Internal Build Events Router                           │   │
│  │  (server/src/routes/internal/buildEvents.js)            │   │
│  │  - Validates token                                       │   │
│  │  - Calls BuildEventsService.processBuildEvent()         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BuildEventsService                                      │   │
│  │  (server/src/api/buildEvents.js)                         │   │
│  │  - Stores events in build_runs & build_run_events        │   │
│  │  - Calls notifyAdmins() for build_started/completed/     │   │
│  │    failed events                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NotificationService                                      │   │
│  │  (server/src/api/notifications.js)                        │   │
│  │  - Creates notification in database                        │   │
│  │  - Emits WebSocket event to user                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WebSocketService                                         │   │
│  │  (server/src/services/websocketService.js)                │   │
│  │  - Emits 'new_notification' to user's socket room         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              │ 'new_notification' event
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Application                        │
│  (front-end/src/)                                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NotificationContext                                     │   │
│  │  (front-end/src/context/NotificationContext.tsx)         │   │
│  │  - Listens for WebSocket 'new_notification' events        │   │
│  │  - Updates state and counts                               │   │
│  │  - Polls /api/notifications/counts every 30s             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NotificationBell Component                              │   │
│  │  (front-end/src/components/notifications/NotificationBell │   │
│  │  - Shows badge with unread count                         │   │
│  │  - Displays dropdown with notifications                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### build_runs Table
Tracks each build execution:

```sql
CREATE TABLE build_runs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID for this build run',
    env ENUM('prod', 'staging', 'dev') NOT NULL COMMENT 'Environment',
    origin ENUM('server', 'frontend', 'root-harness') NOT NULL COMMENT 'Build origin',
    command VARCHAR(255) NOT NULL COMMENT 'Command that triggered build',
    host VARCHAR(255) NOT NULL COMMENT 'Hostname where build ran',
    pid INT COMMENT 'Process ID of build process',
    status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    last_heartbeat_at TIMESTAMP NULL COMMENT 'Last heartbeat timestamp',
    meta_json JSON COMMENT 'Additional metadata (branch, commit, etc.)',
    INDEX idx_run_id (run_id),
    INDEX idx_status_heartbeat (status, last_heartbeat_at),
    INDEX idx_started_at (started_at DESC),
    INDEX idx_env_origin (env, origin)
);
```

**Key Fields:**
- `run_id`: Unique UUID for each build run
- `status`: Current build status (running → success/failed)
- `last_heartbeat_at`: Used to detect stale builds (no heartbeat for 90+ seconds = failed)

### build_run_events Table
Tracks individual events within a build:

```sql
CREATE TABLE build_run_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_id VARCHAR(36) NOT NULL COMMENT 'FK to build_runs.run_id',
    event ENUM('build_started', 'stage_started', 'stage_completed', 
               'build_completed', 'build_failed', 'heartbeat') NOT NULL,
    stage VARCHAR(100) NULL COMMENT 'Stage name (e.g., "Backend Clean", "Frontend Build")',
    message TEXT NULL COMMENT 'Event message',
    duration_ms INT NULL COMMENT 'Duration in milliseconds (for stage_completed)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload_json JSON COMMENT 'Additional event payload',
    INDEX idx_run_id (run_id),
    INDEX idx_event_created (event, created_at),
    INDEX idx_run_event (run_id, event),
    FOREIGN KEY (run_id) REFERENCES build_runs(run_id) ON DELETE CASCADE
);
```

**Event Types:**
- `build_started`: Build process initiated
- `stage_started`: Individual build stage started (e.g., "Backend TypeScript")
- `stage_completed`: Build stage finished successfully
- `build_completed`: Entire build finished successfully
- `build_failed`: Build failed (at any stage)
- `heartbeat`: Periodic ping (every 25 seconds) to indicate build is still running

### notification_types Table
Defines notification types (created by migration):

```sql
INSERT IGNORE INTO notification_types (name, description, category, default_enabled) VALUES
('build_started', 'Build process started', 'system', TRUE),
('build_completed', 'Build process completed successfully', 'system', TRUE),
('build_failed', 'Build process failed', 'system', TRUE);
```

### notifications Table
Stores individual notifications for users:

```sql
-- Standard notifications table (already exists)
-- Key fields:
- user_id: User who receives the notification
- notification_type_id: FK to notification_types
- title: Notification title
- message: Notification message
- is_read: Whether user has read it
- priority: 'low', 'normal', 'high', 'urgent'
- created_at: When notification was created
```

---

## Backend Components

### 1. Build Events Service (`server/src/api/buildEvents.js`)

**Main Class:** `BuildEventsService`

#### Key Methods:

##### `processBuildEvent(eventData)`
Processes incoming build events and updates database.

**Flow:**
1. Validates required fields (runId, event, env, origin, command)
2. Converts ISO timestamp to Date object for MySQL compatibility
3. Starts database transaction
4. Handles event-specific logic:
   - **`build_started`**: Creates/updates `build_runs` record, calls `notifyAdmins('build_started')`
   - **`heartbeat`**: Updates `last_heartbeat_at` in `build_runs`
   - **`build_completed`**: Updates status to 'success', sets `ended_at`, calculates duration, calls `notifyAdmins('build_completed')`
   - **`build_failed`**: Updates status to 'failed', sets `ended_at`, calls `notifyAdmins('build_failed')`
5. Inserts event into `build_run_events` table
6. Commits transaction

**Example eventData:**
```javascript
{
    runId: '7eecdbe0-b462-4d1a-ac18-e7b1690920a0',
    event: 'build_started',
    env: 'prod',
    origin: 'server',
    command: 'node scripts/build-all.js',
    host: 'orthodoxmetrics',
    pid: 16732,
    ts: '2026-01-23T17:49:44.123Z',
    repo: 'orthodoxmetrics',
    branch: 'main',
    commit: '45ef8a0'
}
```

##### `notifyAdmins(eventType, data)`
Creates notifications for all admin and super_admin users.

**Flow:**
1. Queries `users` table for admin/super_admin users with `is_active = 1`
2. For each admin user:
   - Formats title and message based on event type
   - Sets priority (normal for started/completed, high for failed)
   - Calls `notificationService.createNotification()`
3. Logs success count

**Notification Content:**

**build_started:**
- Title: `"Build Started: {env} {origin}"`
- Message: `"Build started: {command}\nRun ID: {runId}\nHost: {host}"`
- Priority: `normal`

**build_completed:**
- Title: `"Build Completed: {env} {origin}"`
- Message: `"Build completed successfully: {command}\nDuration: {duration}\nRun ID: {runId}"`
- Priority: `normal`

**build_failed:**
- Title: `"Build Failed: {env} {origin}"`
- Message: `"Build failed: {command}\n{error message}\nRun ID: {runId}\nStage: {stage}"`
- Priority: `high`

##### `getBuildStatus(heartbeatTimeoutSeconds = 90)`
Returns current build status for admin dashboard.

**Flow:**
1. Finds active builds (status='running' with recent heartbeat)
2. Marks stale builds as 'failed' (no heartbeat for 90+ seconds)
3. Returns status object with active run info

### 2. Internal Build Events Router (`server/src/routes/internal/buildEvents.js`)

**Endpoint:** `POST /api/internal/build-events`

**Authentication:** Token-based via `X-OM-BUILD-TOKEN` header

**Middleware:** `validateBuildToken` - checks token matches `process.env.OM_BUILD_EVENT_TOKEN`

**Flow:**
1. Validates token
2. Parses JSON body
3. Calls `buildEventsService.processBuildEvent()`
4. Returns success/error response

### 3. Notification Service (`server/src/api/notifications.js`)

**Main Class:** `NotificationService`

#### `createNotification(userId, typeName, title, message, options)`

**Flow:**
1. Gets notification type ID from `notification_types` table
2. Validates type exists and is active
3. Inserts notification into `notifications` table
4. Fetches full notification with type info (for WebSocket emission)
5. **Emits WebSocket event** to user's socket room (`user_{userId}`)
6. Returns notification ID

**WebSocket Emission:**
```javascript
websocketService.io.to(`user_${userId}`).emit('new_notification', {
    id: notification.id,
    user_id: notification.user_id,
    notification_type_id: notification.notification_type_id,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    priority: notification.priority,
    is_read: notification.is_read || false,
    // ... other fields
    type_name: notification.type_name,
    category: notification.category
});
```

### 4. WebSocket Service (`server/src/services/websocketService.js`)

**Socket Rooms:**
- Each user joins `user_{userId}` room on connection
- Notifications are emitted to this room

**Event:** `new_notification`
- Emitted when notification is created
- Frontend listens for this event and updates UI

---

## Frontend Components

### 1. NotificationContext (`front-end/src/context/NotificationContext.tsx`)

**Purpose:** Manages notification state and provides hooks for components

**Key State:**
- `notifications`: Array of NotificationType objects
- `counts`: Object with `{ total, unread, urgent, high }`
- `loading`: Boolean
- `error`: String | null

**Key Methods:**

##### `fetchNotifications(options)`
Fetches notifications from `/api/notifications` endpoint.

**Query Parameters:**
- `limit`: Number of notifications to fetch (default: 20)
- `offset`: Pagination offset
- `unread_only`: Boolean to filter unread only
- `category`: Filter by category
- `priority`: Filter by priority

##### `fetchCounts()`
Fetches notification counts from `/api/notifications/counts`.

**Returns:**
```javascript
{
    total: 5,
    unread: 2,
    urgent: 0,
    high: 1
}
```

##### `addNotification(notification)`
Adds notification to state (called when WebSocket event received).

**WebSocket Listener:**
```javascript
useEffect(() => {
    if (!authenticated || !isConnected) return;
    
    const unsubscribe = onNewNotification((notificationData) => {
        // Transform notification data
        const notification: NotificationType = {
            id: notificationData.id,
            user_id: notificationData.user_id,
            // ... map all fields
        };
        
        addNotification(notification); // Adds to state and refreshes counts
    });
    
    return () => unsubscribe();
}, [authenticated, isConnected, onNewNotification, addNotification]);
```

**Polling Fallback:**
- Polls `/api/notifications/counts` every 30 seconds
- Ensures counts stay updated even if WebSocket disconnects

### 2. NotificationBell Component (`front-end/src/components/notifications/NotificationBell.tsx`)

**Location:** Top-right header (bell icon)

**Features:**
- Badge showing unread count (`counts.unread`)
- Dropdown menu with recent notifications
- Mark as read / dismiss actions
- "View All Notifications" link

**Badge Display:**
```javascript
<Badge badgeContent={counts.unread} color="error">
    {hasUnreadNotifications() ? (
        <NotificationsActive />
    ) : (
        <NotificationsIcon />
    )}
</Badge>
```

**Dropdown Content:**
- Header with "Mark All Read" button (if unread exist)
- List of notifications (unread highlighted)
- Each notification shows:
  - Icon (based on category)
  - Title and message
  - Priority badge
  - Time ago (e.g., "2 minutes ago")
  - Mark as read / dismiss buttons
- Footer with "View All Notifications" link

---

## Build Script Integration

### BuildEventEmitter (`server/scripts/build-event-emitter.js`)

**Purpose:** Utility class for build scripts to emit events

**Key Properties:**
- `runId`: UUID generated in constructor
- `baseUrl`: Backend URL (default: `http://127.0.0.1:3001`)
- `token`: From `process.env.OM_BUILD_EVENT_TOKEN`
- `hostname`: Server hostname
- `pid`: Build process PID
- `env`: Mapped from `NODE_ENV` ('production' → 'prod', etc.)
- `origin`: Auto-detected from script path ('server', 'frontend', etc.)

**Key Methods:**

##### `emit(event, data)`
Sends HTTP POST request to `/api/internal/build-events`.

**Flow:**
1. Checks token exists (warns if not set)
2. Builds event payload with runId, event type, metadata
3. Sends POST request with `X-OM-BUILD-TOKEN` header
4. Handles errors non-fatally (logs warning, returns false)
5. Returns true on success, false on failure

**Timeout:** 5 seconds

##### `startBuild(data)`
Emits `build_started` event and starts heartbeat interval.

##### `stageStarted(stage, message)`
Emits `stage_started` event.

##### `stageCompleted(stage, durationMs, message)`
Emits `stage_completed` event with duration.

##### `buildCompleted(data)`
Stops heartbeat and emits `build_completed` event.

**Special Logic:**
- Waits for backend to be ready (up to 30 seconds)
- Retries up to 5 times with exponential backoff
- Ensures backend is accessible after PM2 restart

##### `buildFailed(error, stage)`
Stops heartbeat and emits `build_failed` event.

##### `startHeartbeat()`
Emits `heartbeat` events every 25 seconds.

**Purpose:** Keeps `last_heartbeat_at` updated so backend knows build is still running

### build-all.js Integration

**File:** `server/scripts/build-all.js`

**Integration Points:**

1. **Start of build:**
```javascript
const buildEmitter = require('./build-event-emitter');

// In main() function:
try {
    await buildEmitter.startBuild({
        command: 'npm run build:deploy',
        env: process.env.NODE_ENV || 'production'
    });
} catch (err) {
    console.warn('⚠️  Failed to emit build_started event (non-fatal):', err.message);
}
```

2. **Before each stage:**
```javascript
await buildEmitter.stageStarted('Backend TypeScript').catch(() => {});
```

3. **After each stage:**
```javascript
await buildEmitter.stageCompleted('Backend TypeScript', durationMs).catch(() => {});
```

4. **After PM2 restart:**
```javascript
// Wait 3 seconds for backend to fully start
await new Promise(resolve => setTimeout(resolve, 3000));
```

5. **Build success:**
```javascript
await buildEmitter.buildCompleted({
    durationSeconds: duration
});
```

6. **Build failure:**
```javascript
await buildEmitter.buildFailed(error, error.stage || null);
```

---

## Event Lifecycle

### Complete Build Flow:

```
1. User runs: npm run build:deploy
   │
   ├─> BuildEventEmitter constructor
   │   ├─> Generates runId (UUID)
   │   ├─> Loads OM_BUILD_EVENT_TOKEN from .env
   │   └─> Detects env, origin, hostname, pid
   │
   ├─> buildEmitter.startBuild()
   │   ├─> Emits 'build_started' event
   │   │   └─> HTTP POST /api/internal/build-events
   │   │       ├─> Backend validates token
   │   │       ├─> Creates build_runs record
   │   │       ├─> Creates build_run_events record
   │   │       └─> Calls notifyAdmins('build_started')
   │   │           ├─> Queries admin users
   │   │           ├─> Creates notification for each admin
   │   │           └─> Emits WebSocket 'new_notification'
   │   │               └─> Frontend receives event
   │   │                   └─> Updates bell badge count
   │   │
   │   └─> Starts heartbeat interval (every 25s)
   │
   ├─> Backend Clean stage
   │   ├─> buildEmitter.stageStarted('Backend Clean')
   │   └─> buildEmitter.stageCompleted('Backend Clean', durationMs)
   │
   ├─> Backend TypeScript stage
   │   ├─> buildEmitter.stageStarted('Backend TypeScript')
   │   └─> buildEmitter.stageCompleted('Backend TypeScript', durationMs)
   │
   ├─> Frontend Build stage
   │   ├─> buildEmitter.stageStarted('Frontend Build')
   │   └─> buildEmitter.stageCompleted('Frontend Build', durationMs)
   │
   ├─> PM2 Restart stage
   │   ├─> buildEmitter.stageStarted('PM2 Restart')
   │   ├─> pm2 restart orthodox-backend
   │   ├─> Wait 3 seconds for backend to start
   │   └─> buildEmitter.stageCompleted('PM2 Restart', durationMs)
   │
   └─> buildEmitter.buildCompleted({ durationSeconds })
       ├─> Stops heartbeat
       ├─> Waits for backend to be ready (up to 30s)
       ├─> Retries up to 5 times
       ├─> Emits 'build_completed' event
       │   └─> HTTP POST /api/internal/build-events
       │       ├─> Updates build_runs status to 'success'
       │       ├─> Sets ended_at timestamp
       │       ├─> Creates build_run_events record
       │       └─> Calls notifyAdmins('build_completed')
       │           └─> Creates notifications + WebSocket events
       │
       └─> Frontend receives 'new_notification'
           └─> Updates bell badge and dropdown
```

### Error Flow:

```
If build fails at any stage:
   │
   └─> buildEmitter.buildFailed(error, stage)
       ├─> Stops heartbeat
       ├─> Emits 'build_failed' event
       │   └─> HTTP POST /api/internal/build-events
       │       ├─> Updates build_runs status to 'failed'
       │       ├─> Sets ended_at timestamp
       │       ├─> Creates build_run_events record
       │       └─> Calls notifyAdmins('build_failed')
       │           └─> Creates notifications with priority='high'
       │
       └─> Frontend receives 'new_notification'
           └─> Updates bell badge (red badge for high priority)
```

---

## WebSocket Real-Time Updates

### Backend Emission

When `notificationService.createNotification()` is called:

1. Notification is inserted into database
2. Full notification is fetched (with type info)
3. WebSocket service checks if user is online (`userSockets.has(userId)`)
4. If online, emits to user's room:
   ```javascript
   websocketService.io.to(`user_${userId}`).emit('new_notification', notificationData);
   ```

### Frontend Reception

1. **WebSocketContext** receives `new_notification` event
2. **NotificationContext** listener transforms data:
   ```javascript
   const notification: NotificationType = {
       id: notificationData.id,
       user_id: notificationData.user_id,
       notification_type_id: notificationData.notification_type_id,
       title: notificationData.title,
       message: notificationData.message,
       // ... map all fields
   };
   ```
3. Calls `addNotification(notification)`:
   - Adds to `notifications` array (at beginning)
   - Calls `fetchCounts()` to update badge count
4. **NotificationBell** component re-renders:
   - Badge count updates
   - Dropdown shows new notification (if open)

### Fallback Polling

If WebSocket is unavailable:
- `NotificationContext` polls `/api/notifications/counts` every 30 seconds
- Ensures badge count stays updated
- User may need to refresh to see new notifications

---

## Configuration

### Environment Variables

**Backend (`server/.env`):**
```bash
# Required: Token for build events authentication
OM_BUILD_EVENT_TOKEN=976039130793628df5b62b8685f4cc478e771cd2a9d6ecaf1a05b9bc9b64eae0

# Optional: Backend URL (default: http://127.0.0.1:3001)
OM_BUILD_EVENT_URL=http://127.0.0.1:3001
```

**Build Scripts:**
- Automatically load `.env` file via `dotenv` package
- Token is read from `process.env.OM_BUILD_EVENT_TOKEN`
- If token not set, events are disabled (non-fatal warning)

### Database Migration

**File:** `server/database/migrations/2026-01-23_build-events-tables.sql`

**Run:**
```bash
mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-01-23_build-events-tables.sql
```

**Creates:**
- `build_runs` table
- `build_run_events` table
- Notification types: `build_started`, `build_completed`, `build_failed`

### Backend Routes

**Internal (Token-protected):**
- `POST /api/internal/build-events` - Receives build events

**Admin (Session + Role-protected):**
- `GET /api/admin/build-status` - Returns current build status

**Public (Session-protected):**
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/counts` - Get notification counts
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Dismiss notification

---

## Troubleshooting

### Notifications Not Appearing

**Checklist:**

1. **Notification types exist:**
   ```sql
   SELECT * FROM notification_types 
   WHERE name IN ('build_started', 'build_completed', 'build_failed');
   ```

2. **Admin users exist:**
   ```sql
   SELECT id, email, role FROM users 
   WHERE role IN ('admin', 'super_admin') AND is_active = 1;
   ```

3. **Notifications created:**
   ```sql
   SELECT n.*, nt.name as type_name, u.email 
   FROM notifications n
   JOIN notification_types nt ON n.notification_type_id = nt.id
   LEFT JOIN users u ON n.user_id = u.id
   WHERE nt.name IN ('build_started', 'build_completed', 'build_failed')
   ORDER BY n.created_at DESC LIMIT 10;
   ```

4. **Backend logs:**
   ```bash
   pm2 logs orthodox-backend --lines 100 | grep -i "Created.*build notifications\|Error notifying"
   ```

5. **Token configured:**
   ```bash
   grep OM_BUILD_EVENT_TOKEN /var/www/orthodoxmetrics/prod/server/.env
   ```

6. **Backend rebuilt:**
   ```bash
   # Check if WebSocket code exists in compiled file
   grep -n "websocketService\|new_notification" /var/www/orthodoxmetrics/prod/server/dist/api/notifications.js
   ```

### Common Issues

**Issue: "OM_BUILD_EVENT_TOKEN not set"**
- **Cause:** Token not in `.env` file
- **Fix:** Add `OM_BUILD_EVENT_TOKEN=...` to `server/.env`

**Issue: "connect ECONNREFUSED 127.0.0.1:3001"**
- **Cause:** Backend not running or not ready after PM2 restart
- **Fix:** 
  - Check `pm2 status orthodox-backend`
  - Wait longer after PM2 restart (build script waits 3s + retries)

**Issue: "Unknown column 'deleted_at'"**
- **Cause:** Query uses wrong column name
- **Fix:** Use `is_active = 1` instead of `deleted_at IS NULL`

**Issue: "Build event failed: 500"**
- **Cause:** Database error (timestamp format, missing column, etc.)
- **Fix:** Check PM2 logs for full error message

**Issue: Notifications created but not showing in bell**
- **Cause:** WebSocket not emitting or frontend not receiving
- **Fix:**
  - Check browser console for WebSocket errors
  - Verify WebSocket code in compiled backend
  - Check `NotificationContext` is listening for events

**Issue: Badge count not updating**
- **Cause:** `fetchCounts()` not being called or WebSocket not working
- **Fix:**
  - Check browser Network tab for `/api/notifications/counts` requests
  - Verify WebSocket connection in browser DevTools
  - Check polling fallback (every 30s)

### Debug Commands

**Check build runs:**
```sql
SELECT run_id, env, origin, status, started_at, ended_at 
FROM build_runs 
ORDER BY started_at DESC LIMIT 5;
```

**Check build events:**
```sql
SELECT run_id, event, stage, created_at 
FROM build_run_events 
ORDER BY created_at DESC LIMIT 20;
```

**Check notification counts:**
```sql
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread
FROM notifications n
JOIN notification_types nt ON n.notification_type_id = nt.id
WHERE n.user_id = ? 
AND nt.name IN ('build_started', 'build_completed', 'build_failed')
AND n.is_dismissed = FALSE;
```

**Test backend endpoint:**
```bash
curl -H "X-OM-BUILD-TOKEN: YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -X POST http://127.0.0.1:3001/api/internal/build-events \
     -d '{
       "runId": "test-123",
       "event": "build_started",
       "env": "prod",
       "origin": "server",
       "command": "test",
       "host": "test",
       "pid": 12345
     }'
```

---

## Admin Notification Management

The Admin Settings → Notifications section (`/admin/settings` → Notifications tab) provides three main areas for managing notifications:

### System-Wide Settings

**Location:** `front-end/src/components/admin/NotificationManagement.tsx` (Tab 0)

**Purpose:** Control which notification types are enabled system-wide for all users.

**Features:**
- **Category-based organization** - Notifications grouped by category (System, User, Admin, Billing, Backup, etc.)
- **Toggle switches** - Enable/disable each notification type globally
- **Visual indicators** - Shows count of enabled notifications per category (e.g., "System 6/6 enabled")
- **Accordion UI** - Collapsible categories for easy navigation

**Backend Endpoint:**
- `PUT /api/admin/notifications/types/:id/toggle` - Toggles a notification type's `default_enabled` status

**Database:**
- Updates `notification_types.default_enabled` field
- Affects all users system-wide

**Usage:**
1. Navigate to Admin Settings → Notifications → System-Wide Settings tab
2. Expand category accordions to see notification types
3. Toggle switches to enable/disable notification types
4. Changes take effect immediately for all users

### Custom Notifications

**Location:** `front-end/src/components/admin/NotificationManagement.tsx` (Tab 1)

**Purpose:** Create and send custom notifications to specific user groups or schedule them for future delivery.

**Features:**
- **Quick actions** - Pre-configured buttons for common scenarios:
  - **Broadcast All** - Send to all users immediately
  - **Admin Alert** - Send to administrators only
  - **Scheduled Message** - Schedule for future delivery
- **Create Custom Notification dialog** - Full-featured notification creator:
  - **Title & Message** - Required fields
  - **Priority** - Low, Normal, High, Urgent
  - **Target Audience** - All Users, Administrators, Regular Users, Specific Roles, Specific Church
  - **Schedule Delivery** - Optional date/time picker
  - **Action Button** - Optional action URL and text
  - **Icon** - Optional emoji/icon
- **Role-based targeting** - Select specific system roles (e.g., `role:priest`, `role:admin`)
- **Draft support** - Save notifications as drafts for later editing

**Backend Endpoint:**
- `POST /api/admin/notifications/custom` - Creates custom notifications

**Request Body:**
```javascript
{
    title: "Notification Title",
    message: "Notification message content",
    priority: "normal", // 'low', 'normal', 'high', 'urgent'
    scheduled_at: null, // ISO date string or null for immediate send
    target_audience: "all", // 'all', 'admins', 'users', 'role:roleName', 'church_specific'
    church_id: null, // Required if target_audience is 'church_specific'
    icon: "📢",
    action_url: null,
    action_text: null,
    is_draft: false
}
```

**Backend Flow:**
1. Validates title and message are provided
2. Determines target users based on `target_audience`:
   - `all` → All active users
   - `admins` → Users with `admin` or `super_admin` roles
   - `users` → Non-admin users
   - `role:roleName` → Users with specific role
   - `church_specific` → Users in specific church (requires `church_id`)
3. Looks up `system_alert` notification type ID
4. If `shouldSendNow` (not draft and no scheduled time):
   - Creates notification records for all target users
   - Emits WebSocket events for real-time delivery
5. If draft or scheduled:
   - Creates a single notification record under creator's user ID
   - Stores scheduling metadata in `data` JSON field
6. Returns success with recipient count

**Database Storage:**
- Custom notifications stored in `notifications` table
- `data` JSON field contains:
  ```json
  {
    "target_audience": "all",
    "church_id": null,
    "custom_notification": true,
    "created_by": "admin@example.com",
    "scheduled_at": "2026-01-24T10:00:00Z", // if scheduled
    "is_draft": false,
    "target_user_count": 150
  }
  ```

### Notification Queue

**Location:** `front-end/src/components/admin/NotificationManagement.tsx` (Tab 2)

**Purpose:** View complete history of all notifications sent through the system, including custom notifications and system-generated notifications (build events, etc.).

**Features:**
- **Comprehensive history table** - Shows all notifications grouped by campaign
- **Campaign grouping** - Notifications with same title, message, target audience, and date are grouped together
- **Statistics display**:
  - **Total Sent** - Number of notifications sent in this campaign
  - **Read Count** - How many recipients have read the notification
  - **Dismissed Count** - How many recipients have dismissed the notification
- **Status indicators** - Visual chips showing status (sent, pending, draft, failed)
- **Priority badges** - Color-coded priority indicators
- **Target audience display** - Shows human-readable audience (e.g., "All Users", "Administrators", role descriptions)
- **View Details button** - Opens detailed view of notification campaign
- **View Details action** - Eye icon in Actions column opens details for specific notification

**Backend Endpoint:**
- `GET /api/admin/notifications/queue` - Returns notification queue/history

**Response Format:**
```javascript
{
    success: true,
    queue: [
        {
            id: 123,
            title: "Build Completed: prod server",
            message: "Build completed successfully...",
            priority: "normal",
            notification_type: "build_completed",
            category: "system",
            scheduled_at: "2026-01-23T14:02:33Z",
            created_at: "2026-01-23T14:02:33Z",
            target_audience: "all",
            status: "sent",
            total_sent: 5,
            read_count: 3,
            dismissed_count: 1,
            target_user_count: 5,
            created_by: null, // null for system-generated
            is_custom: false
        },
        // ... more notifications
    ]
}
```

**Backend Query Logic:**
1. Fetches last 500 notifications from `notifications` table
2. Groups notifications by campaign key: `title|message|target_audience|date`
3. Calculates statistics per campaign:
   - `total_sent` - Count of notifications in campaign
   - `read_count` - Count of read notifications
   - `dismissed_count` - Count of dismissed notifications
4. Determines status:
   - `draft` - If `data.is_draft === true`
   - `pending` - If `data.scheduled_at` exists and is in future
   - `sent` - Otherwise
5. Returns top 100 campaigns sorted by `created_at DESC`

**View Details Dialog:**
- Opens when clicking "View Details" button or eye icon
- Shows comprehensive notification information:
  - Title and message
  - Priority and status chips
  - Target audience
  - Notification type
  - Statistics (total sent, read count, dismissed count)
  - Creator information
  - Created and scheduled timestamps

**Frontend Component:**
- `NotificationManagement` component manages all three tabs
- Uses `useState` for dialog state (`viewQueueDialogOpen`, `selectedNotification`)
- Fetches queue on component mount and after creating custom notifications
- Displays empty state when queue is empty

---

## Summary

The Notifications System provides comprehensive notification management:

1. **Build scripts** emit events via HTTP POST to backend
2. **Backend** stores events in database and creates notifications
3. **WebSocket** pushes notifications to connected clients in real-time
4. **Frontend** displays notifications in bell icon with badge count
5. **Polling fallback** ensures counts stay updated even if WebSocket fails
6. **Admin interface** provides full control over notification types and custom notifications
7. **Notification queue** provides complete audit trail and statistics

The system is designed to be:
- **Non-blocking**: Build failures don't break the build process
- **Resilient**: Retries and timeouts handle temporary failures
- **Real-time**: WebSocket provides instant updates
- **User-friendly**: Clear notifications with priority indicators
- **Admin-friendly**: Comprehensive management interface with role-based targeting
- **Auditable**: Complete history and statistics for all notifications
