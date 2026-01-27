# Current Setup: Build Events System (Phase 0 Documentation)

**Date:** 2026-01-23  
**Status:** Documenting current setup before implementing build event tracking

## Build Scripts Entry Points

### Server Build Scripts (`/var/www/orthodoxmetrics/prod/server`)

**package.json scripts:**
- `npm run build` → `npm run build:clean && npm run build:ts && npm run build:copy && npm run build:verify`
- `npm run build:deploy` → `node scripts/build-all.js` ⭐ **PRIMARY DEPLOY SCRIPT**
- `npm run build:deploy:smart` → `node scripts/build-smart.js --restart`
- `npm run build:smart` → `node scripts/build-smart.js`
- `npm run build:frontend` → `cd ../front-end && npm run build`

**Main Entry Point:** `server/scripts/build-all.js`
- **Stages tracked:**
  1. Backend Clean (`build:clean`)
  2. Backend TypeScript (`build:ts`)
  3. Backend Copy (`build:copy`)
  4. Backend Verify (`build:verify`)
  5. Frontend Build (parallel with backend)
  6. PM2 Restart (after both complete)

**Build Stages in build-all.js:**
- Lines 342-345: Stage indices defined
- Lines 383-386: Backend and frontend built in parallel
- Line 389: PM2 restart after completion
- Lines 414-436: Duration tracking and summary

### Frontend Build Scripts (`/var/www/orthodoxmetrics/prod/front-end`)

**package.json script:**
- `npm run build` → `NODE_OPTIONS="--max-old-space-size=4096" vite build --mode production && node scripts/inject-build-info.js && node scripts/verify-build.js`

**Entry Point:** Vite build system
- No custom Node.js script wrapper
- Build happens via Vite CLI

### Root Build Scripts (`/var/www/orthodoxmetrics/prod`)

**package.json script:**
- `npm run build:hardened` → `node scripts/build-harness.mjs`

**Entry Point:** `scripts/build-harness.mjs`
- Not a standard build (used for special purposes)

## Notifications System

### Database Schema

**File:** `server/database/notifications_schema.sql`

**Tables:**
1. `notification_types` - Types of notifications
2. `notification_templates` - Templates for notifications
3. `user_notification_preferences` - User preferences
4. `notifications` - Main notifications table
5. `notification_queue` - Queue for async processing
6. `notification_history` - Historical notifications

**Main notifications table structure:**
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  notification_type_id INT,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ...
)
```

### Notification Service

**File:** `server/src/api/notifications.js`

**Key Functions:**
- `createNotification(userId, type, title, message, options)` - Create a notification
- Notification types are stored in `notification_types` table
- Notifications are user-specific (targeted by `user_id`)

### Role-Based Targeting

**File:** `server/src/routes/admin/auth-check.js`

**Role Checking:**
- `requireRole(['admin', 'super_admin'])` - Middleware for admin access
- Roles checked: `admin`, `super_admin`
- Users table has `role` field

**How to target admins/super_admins:**
- Query users table for `role IN ('admin', 'super_admin')`
- Create notifications for each user_id found

## Current Build Progress Output

**File:** `server/scripts/build-all.js`

**Progress Tracking:**
- Lines 42-49: Spinner state tracking
- Lines 59-86: Animated spinner for stages
- Lines 109-112: Stage name updates
- Lines 117-178: `runCommand` function tracks build time per stage
- Lines 145-151: Stage results collected with duration
- Lines 414-436: Total duration calculated and logged

**Stages Already Tracked:**
1. Backend Clean
2. Backend TypeScript
3. Backend Copy
4. Backend Verify
5. Frontend Build
6. PM2 Restart

**Duration Tracking:**
- `startTime` captured at line 336
- Each stage tracks `buildTime` in `runCommand`
- Total duration calculated at line 414

## Database Configuration

**App DB (for platform-wide state):**
- Database: `orthodoxmetrics_db` (from config)
- Connection: Uses `getAppPool()` from `server/src/config/db.js`
- **This is where build_runs and build_run_events should be stored**

**Auth DB (separate):**
- Database: Separate auth database
- **Do NOT store build events in auth DB**

## Environment Variables

**Current .env usage:**
- `PORT` - Backend port (default 3001)
- `NODE_ENV` - Environment (prod/staging/dev)
- Database credentials from `.env`

**New env var needed:**
- `OM_BUILD_EVENT_TOKEN` - Token for build event authentication

## Next Steps

1. Create database migration for `build_runs` and `build_run_events` tables
2. Implement `/api/internal/build-events` endpoint
3. Implement `/api/admin/build-status` endpoint
4. Add notification creation for build events
5. Modify `build-all.js` to emit events
6. Add heartbeat mechanism
