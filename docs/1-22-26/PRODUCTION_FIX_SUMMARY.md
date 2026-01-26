# Production 502 Fix - Interactive Reports Router

## Problem
PM2 logs show: `Error: Cannot find module './routes/interactiveReports'`
- Production expects: `dist/routes/interactiveReports.js`
- File exists at: `server/src/routes/interactiveReports.js`
- Build process was NOT copying `src/routes/*.js` files to `dist/routes/`

## Root Cause
The `build-copy.js` script copies:
- `src/api` → `dist/api` ✅
- `src/utils` → `dist/utils` ✅
- `src/services` → `dist/services` ✅
- But NOT `src/routes` → `dist/routes` ❌

## Solution Applied

### Option A: Added src/routes to build-copy.js ✅

**File Changed:** `server/scripts/build-copy.js`
- Added: `await copyDir('src/routes', 'routes', { filter: (srcPath) => !srcPath.endsWith('.ts') && !srcPath.endsWith('.tsx') });`
- This copies all `.js` files from `src/routes/` to `dist/routes/` (excluding `.ts` files which are compiled by tsc)

### Safe Loader Pattern

**File Changed:** `server/src/index.ts` (lines 3510-3527)
- Wrapped router require in try/catch (matching `adminTemplatesRouter` pattern)
- If module missing: logs warning, creates dummy router returning 501, server continues
- If module exists: mounts routes normally
- **This prevents production crashes** even if build fails

## Files Changed

1. **`server/scripts/build-copy.js`**
   - Added `src/routes` copy step (line 63-68)
   - Filters out `.ts` files (only copies `.js`)

2. **`server/src/index.ts`**
   - Added safe loader for interactiveReports router (lines 3510-3527)
   - Matches existing `adminTemplatesRouter` pattern

3. **`server/src/routes/interactiveReports.js`**
   - Already uses correct `module.exports = router` (CommonJS)
   - Import paths work in both src/ and dist/ contexts

## Build Output Verification

After `npm run build`, verify:
```bash
ls -la server/dist/routes/interactiveReports.js
# Should exist ✅
```

## MySQL Migration

**File:** `server/database/migrations/create_interactive_reports_tables.sql`
- Already MySQL-compatible ✅
- Uses `CHAR(36)` for UUIDs (generated via `uuid` package)
- Uses MySQL `JSON` type
- Uses `DATETIME` for timestamps
- Uses `ENGINE=InnoDB` with proper charset

**Migration Command:**
```bash
mysql -u orthodoxapps -p orthodoxmetrics_db < server/database/migrations/create_interactive_reports_tables.sql
```

## Testing Commands

### 1. Build and Verify
```bash
cd server
npm run build
ls -la dist/routes/interactiveReports.js  # Should exist
```

### 2. Restart PM2
```bash
pm2 restart orthodox-backend
pm2 logs orthodox-backend --lines 50  # Check for "✅ Interactive reports router loaded successfully"
```

### 3. Test Endpoint (from server)
```bash
curl -i http://127.0.0.1:3001/api/records/interactive-reports
# Expected: 401 Unauthorized (NOT 404, NOT 502) ✅
```

### 4. Test Through Nginx
```bash
curl -i https://orthodoxmetrics.com/api/records/interactive-reports
# Expected: 401/403/200 (NOT 502, NOT 404) ✅
```

## Expected Status Codes

- **401** = Unauthorized (not logged in) ✅
- **403** = Forbidden (wrong role) ✅
- **200** = Success (authenticated with correct role) ✅
- **404** = Route not found ❌ (should NOT happen after fix)
- **502** = Bad Gateway ❌ (should NOT happen after fix)
- **501** = Not Implemented (only if module fails to load, with safe loader)

## Module Export Compatibility

**Verified:** `server/src/routes/interactiveReports.js` uses:
```javascript
module.exports = router;
```
This is correct for CommonJS `require()` in production.

## Import Path Resolution

From `dist/routes/interactiveReports.js`:
- `../middleware/auth` → `dist/middleware/auth.js` ✅ (bridge to `../../middleware/auth`)
- `../../utils/tokenUtils` → `dist/utils/tokenUtils.js` ✅ (copied from `server/utils/`)
- `../../middleware/rateLimiter` → `dist/middleware/rateLimiter.js` ✅ (copied from `server/middleware/`)
- `../config/db` → `dist/config/db.js` ✅ (copied from `server/config/`)

All paths resolve correctly in dist context.

## Production Deployment Steps

1. **Pull latest code** (includes build-copy.js fix)
2. **Run build:**
   ```bash
   cd server
   npm run build
   ```
3. **Verify file exists:**
   ```bash
   ls -la dist/routes/interactiveReports.js
   ```
4. **Restart PM2:**
   ```bash
   pm2 restart orthodox-backend
   ```
5. **Check logs:**
   ```bash
   pm2 logs orthodox-backend --lines 20
   # Should see: "✅ [Server] Interactive reports router loaded successfully"
   ```
6. **Test endpoint:**
   ```bash
   curl -i http://127.0.0.1:3001/api/records/interactive-reports
   # Should return 401 (not 404, not 502)
   ```

## Safety Net

The safe loader ensures:
- If module missing: Server starts, returns 501 for interactive reports endpoints
- If module exists: Server starts, routes work normally
- **No production crashes** regardless of build state

---

## ✅ Fix Complete

- Build process now copies `src/routes/*.js` to `dist/routes/`
- Safe loader prevents crashes
- Module exports are CommonJS compatible
- All import paths resolve correctly in dist context

**After build + restart, the 502 error will be resolved.**
