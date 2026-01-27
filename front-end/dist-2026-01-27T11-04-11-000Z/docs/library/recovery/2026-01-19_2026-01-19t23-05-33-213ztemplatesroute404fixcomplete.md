# Templates Route 404 Fix - Complete Implementation

## Problem Summary

The `/api/admin/templates` endpoint was returning 404 errors in production, even though the route was mounted in `server/index.js`. The root cause was that **production runs from `dist/index.js` (compiled from `server/src/index.ts`)**, not from `server/index.js`.

## Root Cause

1. **Production Entry Point:** `package.json` shows `"start": "NODE_ENV=production node dist/index.js"`
2. **Source File:** `dist/index.js` is compiled from `server/src/index.ts` (TypeScript source)
3. **Missing Route:** The `/api/admin/templates` route was only in `server/index.js`, NOT in `server/src/index.ts`

## Solution Implemented

### 1. Added Route to TypeScript Source

**File:** `server/src/index.ts`

**Changes:**
- **Lines 57-70:** Added import and error handling for `adminTemplatesRouter`:
  ```typescript
  // Load admin templates router (for /api/admin/templates)
  let adminTemplatesRouter;
  try {
    adminTemplatesRouter = require('./routes/admin/templates');
    console.log('✅ [Server] Admin templates router loaded successfully');
  } catch (error) {
    console.error('❌ [Server] Failed to load admin templates router:', error);
    // Create a dummy router that returns 500 to prevent crashes
    const express = require('express');
    adminTemplatesRouter = express.Router();
    adminTemplatesRouter.use((req, res) => {
      res.status(500).json({ success: false, error: 'Admin templates router failed to load' });
    });
  }
  ```

- **Line 291:** Added route mount:
  ```typescript
  app.use('/api/admin/templates', adminTemplatesRouter);
  console.log('✅ [Server] Mounted /api/admin/templates route');
  ```

### 2. Added Health/Diagnostics Endpoint

**File:** `server/src/index.ts` (after line 293)

**New Endpoint:** `GET /api/admin/_routes` (admin-only)

**Purpose:** Verify which routes are mounted at runtime

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-17T...",
  "entrypoint": "dist/index.js (compiled from src/index.ts)",
  "routes": {
    "/api/admin/templates": {
      "mounted": true,
      "router": "routes/admin/templates",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  },
  "build_info": {
    "node_version": "v20.x.x",
    "node_env": "production",
    "port": 3001
  }
}
```

### 3. Enhanced Server Startup Logging

**File:** `server/src/index.ts` (lines 3580-3592)

**Added:**
- Entrypoint identification log
- Route health check endpoint log
- Critical routes mount confirmation

### 4. Created Smoke Test Script

**File:** `server/scripts/smoke-routes.js` (NEW)

**Purpose:** Verify routes are mounted before deployment

**Usage:**
```bash
cd server
npm run smoke:routes
```

**Checks:**
- Route file exists: `routes/admin/templates.js`
- Route imported in `server/index.js`
- Route imported in `server/src/index.ts`
- Route mounted in both files

**Exit Code:** 0 if all pass, 1 if any fail

### 5. Added npm Script

**File:** `server/package.json`

**Added:**
```json
"smoke:routes": "node scripts/smoke-routes.js"
```

## How to Verify and Restart

### Step 1: Identify Process Manager

**Check for PM2:**
```bash
pm2 list
pm2 info orthodoxmetrics-backend  # or your app name
```

**Check for systemd:**
```bash
systemctl status orthodoxmetrics
# or
systemctl status node
```

**Check for npm/node directly:**
```bash
ps aux | grep "node.*dist/index.js"
# or
ps aux | grep "node.*server"
```

### Step 2: Rebuild TypeScript

**Before restarting, rebuild:**
```bash
cd server
npm run build
```

This compiles `src/index.ts` → `dist/index.js` and copies routes.

### Step 3: Restart Server

**If using PM2:**
```bash
pm2 restart orthodoxmetrics-backend
# or
pm2 reload orthodoxmetrics-backend  # zero-downtime reload
pm2 logs orthodoxmetrics-backend --lines 50  # Check logs
```

**If using systemd:**
```bash
sudo systemctl restart orthodoxmetrics
sudo systemctl status orthodoxmetrics
sudo journalctl -u orthodoxmetrics -n 50  # Check logs
```

**If running directly:**
```bash
# Stop current process (Ctrl+C or kill PID)
cd server
npm start
```

### Step 4: Verify Route is Mounted

**Check server logs for:**
```
✅ [Server] Admin templates router loaded successfully
✅ [Server] Mounted /api/admin/templates route
🚀 Server running in PRODUCTION mode at http://0.0.0.0:3001
📁 Entrypoint: dist/index.js (compiled from src/index.ts)
🔍 Route health check: GET /api/admin/_routes
✅ Critical routes mounted:
   - /api/admin/templates
```

### Step 5: Test Endpoint

**Test with curl (should get 401/403, NOT 404):**
```bash
curl -i http://localhost:3001/api/admin/templates
# Expected: HTTP/1.1 401 Unauthorized (or 403 Forbidden)
# NOT: HTTP/1.1 404 Not Found
```

**Test health endpoint (with admin auth):**
```bash
curl -i -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" http://localhost:3001/api/admin/_routes
# Expected: 200 OK with routes JSON
```

**Test in browser:**
- Open `/devel-tools/live-table-builder`
- Check browser console - should NOT see 404 for `/api/admin/templates`
- Should see 401/403 if not authenticated, or 200 if authenticated

## Files Changed

1. **`server/src/index.ts`**
   - Added `adminTemplatesRouter` import (lines 57-70)
   - Added route mount at `/api/admin/templates` (line 291)
   - Added health endpoint `/api/admin/_routes` (after line 293)
   - Enhanced startup logging (lines 3580-3592)

2. **`server/scripts/smoke-routes.js`** (NEW)
   - Smoke test script to verify routes

3. **`server/package.json`**
   - Added `smoke:routes` script

## Verification Checklist

- [ ] Rebuild completed: `npm run build` in `server/` directory
- [ ] Server restarted (PM2/systemd/direct)
- [ ] Server logs show: "✅ [Server] Admin templates router loaded successfully"
- [ ] Server logs show: "✅ [Server] Mounted /api/admin/templates route"
- [ ] `curl http://localhost:3001/api/admin/templates` returns 401/403 (NOT 404)
- [ ] Browser console shows no 404 for `/api/admin/templates`
- [ ] `/devel-tools/live-table-builder` loads templates successfully

## Smoke Test Usage

**Run before deployment:**
```bash
cd server
npm run smoke:routes
```

**Expected output:**
```
🔍 [Smoke Test] Checking route mounts...

📋 Checking route files...

✅ Admin templates route file: routes/admin/templates.js

📋 Checking route mounts in index files...

✅ Templates route in server/index.js: /api/admin/templates (imported and mounted in index.js)
✅ Templates route in server/src/index.ts: /api/admin/templates (imported and mounted in src/index.ts)

============================================================
📊 SUMMARY
============================================================
✅ Passed: 3
❌ Failed: 0

✅ All route checks passed!
```

## Health Endpoint Usage

**Check routes at runtime:**
```bash
curl -H "Cookie: connect.sid=YOUR_SESSION" http://localhost:3001/api/admin/_routes
```

**Response confirms:**
- Which entrypoint is running
- Which routes are mounted
- Node version and environment

## Next Steps

1. **Rebuild:** `cd server && npm run build`
2. **Restart:** Use appropriate process manager command
3. **Verify:** Check logs and test endpoint
4. **Test:** Load `/devel-tools/live-table-builder` and confirm no 404

## Prevention

- **Always update `server/src/index.ts`** when adding routes (not just `server/index.js`)
- **Run `npm run smoke:routes`** before deploying
- **Check `/api/admin/_routes`** after deployment to verify routes
- **Monitor server logs** for route mount confirmations
