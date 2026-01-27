# Templates Route 404 Fix - Verification Guide

## Problem Identified

**Root Cause:** Production server runs from `dist/index.js` (compiled from `server/src/index.ts`), but the `/api/admin/templates` route was only in `server/index.js`.

## Solution Applied

✅ Added route to `server/src/index.ts` (lines 57-70, 291)
✅ Added health endpoint `/api/admin/_routes` (lines 296-340)
✅ Enhanced startup logging
✅ Created smoke test script

## Step 1: Identify Process Manager

### Check for PM2
```bash
pm2 list
pm2 info <app-name>
pm2 show <app-name>
```

**If PM2 is used:**
- Look for process name (e.g., `orthodoxmetrics-backend`, `server`, `node`)
- Note the script it runs (should be `dist/index.js`)

### Check for systemd
```bash
systemctl list-units | grep -i orthodox
systemctl list-units | grep -i node
systemctl status orthodoxmetrics
```

**If systemd is used:**
- Service file location: `/etc/systemd/system/orthodoxmetrics.service`
- Check `ExecStart` command in service file

### Check for direct node process
```bash
ps aux | grep "node.*dist/index.js"
ps aux | grep "node.*server"
```

**If running directly:**
- Note the PID and command
- Check if it's in a screen/tmux session

## Step 2: Rebuild TypeScript

**CRITICAL:** Must rebuild before restarting!

```bash
cd server
npm run build
```

**Expected output:**
```
[build-copy] Copied routes -> routes
[build-copy] Copied routes/admin -> routes/admin
...
✅ Build completed successfully
```

**Verify routes were copied:**
```bash
ls -la dist/routes/admin/templates.js
# Should exist
```

## Step 3: Restart Server

### If using PM2:
```bash
# Option 1: Zero-downtime reload (recommended)
pm2 reload <app-name>

# Option 2: Full restart
pm2 restart <app-name>

# Check status
pm2 status
pm2 logs <app-name> --lines 50
```

### If using systemd:
```bash
sudo systemctl restart orthodoxmetrics
sudo systemctl status orthodoxmetrics
sudo journalctl -u orthodoxmetrics -n 50 --no-pager
```

### If running directly:
```bash
# Stop: Ctrl+C or kill <PID>
# Start:
cd server
npm start
```

## Step 4: Verify Route is Mounted

### Check Server Logs

**Look for these log lines:**
```
✅ [Server] Admin templates router loaded successfully
✅ [Server] Mounted /api/admin/templates route
🚀 Server running in PRODUCTION mode at http://0.0.0.0:3001
📁 Entrypoint: dist/index.js (compiled from src/index.ts)
🔍 Route health check: GET /api/admin/_routes
✅ Critical routes mounted:
   - /api/admin/templates
   - /api/admin/churches
   - /api/admin/users
```

**If you see:**
- `❌ [Server] Failed to load admin templates router` → Check `routes/admin/templates.js` exists
- No "Mounted /api/admin/templates route" → Route not in `src/index.ts` or build failed

### Test with curl

**Test 1: Unauthenticated (should get 401, NOT 404)**
```bash
curl -i http://localhost:3001/api/admin/templates
```

**Expected:**
```
HTTP/1.1 401 Unauthorized
...
{"error":"Authentication required","code":"NO_SESSION"}
```

**NOT:**
```
HTTP/1.1 404 Not Found
```

**Test 2: Health endpoint (with admin session)**
```bash
# Get session cookie from browser (DevTools → Application → Cookies)
curl -i -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  http://localhost:3001/api/admin/_routes
```

**Expected:**
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
  }
}
```

## Step 5: Test in Browser

1. **Open:** `/devel-tools/live-table-builder`
2. **Check Console:** Should NOT see:
   ```
   GET /api/admin/templates -> 404 Not Found
   Failed to load templates from database: Error: Request failed with status code 404
   ```
3. **Should see:** Either 401/403 (if not authenticated) or successful template load

## Smoke Test (Pre-Deployment)

**Run before deploying:**
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

## Troubleshooting

### Still Getting 404?

1. **Verify build completed:**
   ```bash
   ls -la dist/index.js
   ls -la dist/routes/admin/templates.js
   ```

2. **Check which file is actually running:**
   ```bash
   # In server logs, look for:
   # "📁 Entrypoint: dist/index.js (compiled from src/index.ts)"
   # If it says something else, that's the problem
   ```

3. **Verify route in compiled file:**
   ```bash
   grep -n "api/admin/templates" dist/index.js
   # Should find the mount line
   ```

4. **Check route file exists:**
   ```bash
   ls -la server/routes/admin/templates.js
   ls -la dist/routes/admin/templates.js
   ```

5. **Check for route conflicts:**
   ```bash
   # Make sure /api/admin/templates is mounted BEFORE /api/admin (catch-all)
   grep -n "app.use.*api/admin" dist/index.js
   ```

### Process Manager Not Found?

**Check running processes:**
```bash
# Linux/Mac
ps aux | grep node

# Windows (PowerShell)
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

**Check for screen/tmux:**
```bash
screen -ls
tmux ls
```

## Files Changed Summary

1. **`server/src/index.ts`**
   - Lines 57-70: Added `adminTemplatesRouter` import
   - Line 291: Added route mount
   - Lines 296-340: Added health endpoint
   - Lines 3580-3595: Enhanced startup logging

2. **`server/scripts/smoke-routes.js`** (NEW)
   - Smoke test for route verification

3. **`server/package.json`**
   - Added `smoke:routes` script

## Acceptance Criteria

- [ ] `npm run build` completes successfully
- [ ] Server restarts without errors
- [ ] Server logs show route mounted
- [ ] `curl http://localhost:3001/api/admin/templates` returns 401 (NOT 404)
- [ ] Browser console shows no 404 errors
- [ ] `/devel-tools/live-table-builder` loads templates successfully

## Next Steps After Fix

1. **Rebuild:** `cd server && npm run build`
2. **Restart:** Use appropriate process manager command
3. **Verify:** Check logs and test endpoint
4. **Test:** Load Live Table Builder and confirm no 404
