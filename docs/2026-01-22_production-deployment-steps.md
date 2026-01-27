# Production Deployment - Interactive Reports Fix

## Problem
- **Error:** `Cannot find module './routes/interactiveReports'`
- **Symptom:** Nginx 502 Bad Gateway
- **Root Cause:** `src/routes/interactiveReports.js` not copied to `dist/routes/` during build

## Solution Applied

### 1. Build Process Fix
**File:** `server/scripts/build-copy.js`
- Added: `await copyDir('src/routes', 'routes', { filter: (srcPath) => !srcPath.endsWith('.ts') && !srcPath.endsWith('.tsx') });`
- This copies all `.js` files from `src/routes/` to `dist/routes/`

### 2. Safe Loader
**File:** `server/src/index.ts` (lines 3510-3527)
- Wrapped router require in try/catch
- If missing: Creates dummy router (501), server continues
- If exists: Mounts routes normally
- **Prevents crashes** even if build fails

## Deployment Steps

### Step 1: Pull Latest Code
```bash
cd /var/www/orthodoxmetrics/prod/server
git pull  # or your deployment method
```

### Step 2: Run Database Migration
```bash
mysql -u orthodoxapps -p orthodoxmetrics_db < database/migrations/create_interactive_reports_tables.sql
```

**Verify tables:**
```bash
mysql -u orthodoxapps -p orthodoxmetrics_db -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME LIKE 'interactive_report%';"
```

**Expected:** 6 tables listed

### Step 3: Build Server
```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
```

**Verify build output:**
```bash
ls -la dist/routes/interactiveReports.js
# Should exist ✅
```

**Or run verification script:**
```bash
npm run build:verify:interactive
# Should show all files ✅
```

### Step 4: Restart PM2
```bash
pm2 restart orthodox-backend
```

### Step 5: Check Logs
```bash
pm2 logs orthodox-backend --lines 30
```

**Expected output:**
```
✅ [Server] Interactive reports router loaded successfully
```

**NOT:**
```
❌ Cannot find module './routes/interactiveReports'
```

### Step 6: Test Endpoint
```bash
# From server
curl -i http://127.0.0.1:3001/api/records/interactive-reports

# Expected: HTTP/1.1 401 Unauthorized
# NOT: 404 Not Found
# NOT: 502 Bad Gateway
```

### Step 7: Test Through Nginx
```bash
curl -i https://orthodoxmetrics.com/api/records/interactive-reports

# Expected: HTTP/1.1 401 Unauthorized (or 403/200 if authenticated)
# NOT: 502 Bad Gateway
# NOT: 404 Not Found
```

## Verification Checklist

- [ ] Database migration executed
- [ ] 6 tables verified in database
- [ ] `npm run build` completed successfully
- [ ] `dist/routes/interactiveReports.js` exists
- [ ] PM2 restarted without errors
- [ ] Logs show "✅ Interactive reports router loaded successfully"
- [ ] `curl` test returns 401 (not 404, not 502)

## Rollback Plan

If issues occur:
1. The safe loader will prevent crashes (returns 501)
2. Check PM2 logs for specific error
3. Verify `dist/routes/interactiveReports.js` exists
4. Re-run build if file missing

## Files Changed Summary

1. `server/scripts/build-copy.js` - Added `src/routes` copy step
2. `server/src/index.ts` - Added safe loader for router
3. `server/src/routes/interactiveReports.js` - Already correct (CommonJS export)

## Expected Results

**Before Fix:**
- ❌ 502 Bad Gateway
- ❌ PM2 crash on startup
- ❌ "Cannot find module" error

**After Fix:**
- ✅ 401/403/200 status codes
- ✅ PM2 starts successfully
- ✅ Router loads and mounts correctly
- ✅ No crashes

---

**Status: Ready for Production** 🚀
