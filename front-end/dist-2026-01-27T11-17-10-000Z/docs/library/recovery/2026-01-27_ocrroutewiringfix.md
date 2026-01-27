# OCR Route Wiring Fix

**Date:** January 25, 2026  
**Goal:** Fix missing OCR jobs routes returning 404

---

## Phase 1: Entrypoint Identification

### PM2 Configuration
- **PM2 Process Name:** `orthodox-backend`
- **Entrypoint:** `server/dist/index.js` (compiled from `server/src/index.ts`)
- **Start Command:** `npm start` → `NODE_ENV=production node dist/index.js`
- **Build Command:** `npm run build:ts` → compiles TypeScript to `dist/`
- **Compilation Structure:** `src/index.ts` → `dist/index.js`, `src/routes/churchOcrRoutes.ts` → `dist/routes/churchOcrRoutes.js`

### Current Route Mounts

**Working Route:**
- `GET /api/church/:churchId/ocr/settings` - Defined at line 714 in `server/src/index.ts`
- Mounted directly on `app` object (not via router)
- **Status:** ✅ Working (returns 200)

**Missing Routes (404):**
- `GET /api/church/:churchId/ocr/jobs` - Defined at line 1052 in `server/src/index.ts`
- `GET /api/church/:churchId/ocr/jobs/:jobId` - Defined at line 1493
- `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Defined at line 2325
- `GET /api/church/:churchId/ocr/jobs/:jobId/mapping` - Defined at line 1915
- `GET /api/church/:churchId/ocr/jobs/:jobId/image` - Defined at line 1767

**Route Order:**
- Router mount attempt: Line 689-726
- Direct route definitions: Lines 728+ (settings), 1063+ (jobs)
- Catch-all 404 handler: Line 3666 (`app.use('/api/*', ...)`)

**Current Server State:**
- Settings route: ✅ Working (logs show it's being hit)
- Jobs routes: ❌ Not being hit (no logs, returning 404)
- Router loading: ❌ No logs about router loading
- **Conclusion:** Server running old compiled code - needs rebuild + restart

**Analysis:** Routes are defined BEFORE catch-all, so order is correct.

---

## Phase 2: Settings Route Analysis

**Location:** `server/src/index.ts` line 714

**Mount Method:** Direct `app.get()` call (not via router)

**Path:** `/api/church/:churchId/ocr/settings`

**Status:** ✅ Working (returns 200)

**Conclusion:** Base path `/api/church/:churchId/ocr` is reachable.

---

## Phase 3: Jobs Routes Analysis

**Current Status:** Routes are defined but returning 404

**Root Cause:** Server is running old compiled code from `dist/` directory.

**Routes Defined:**
- All routes are defined directly on `app` object
- Routes are defined BEFORE catch-all 404 handler
- Route paths are correct: `/api/church/:churchId/ocr/jobs`, etc.

**Router File:** `server/src/routes/churchOcrRoutes.ts` exists but:
- Not currently mounted (attempted at line 710)
- Has routes: `/jobs`, `/jobs/:jobId`, `/jobs/:jobId/fusion/drafts`
- Missing routes: `/jobs/:jobId/mapping`, `/jobs/:jobId/image` (now added)

---

## Phase 4: Fix Strategy

### Solution 1: Mount Router Properly (Preferred)

1. **Added missing routes to router:**
   - `/jobs/:jobId/mapping` (GET)
   - `/jobs/:jobId/image` (GET)

2. **Fixed router export:**
   - Added CommonJS fallback: `module.exports = router`

3. **Improved router mounting:**
   - Better error handling for router import
   - Handles both ES module and CommonJS exports
   - Falls back to direct routes if router unavailable

4. **Router Mount Location:** Line 710
   - Mounted at: `/api/church/:churchId/ocr`
   - Router paths: `/jobs`, `/jobs/:jobId`, etc.
   - Final URLs: `/api/church/:churchId/ocr/jobs`, etc.

### Solution 2: Direct Routes (Fallback)

- Direct routes remain defined as fallback
- Will work if router fails to load
- Routes are at correct positions (before catch-all)

---

## Phase 5: Verification Steps

### Step 1: Rebuild TypeScript (REQUIRED)
**Important:** The server runs from `dist/` directory. All TypeScript changes must be compiled before they take effect.

```bash
cd /var/www/orthodoxmetrics/prod/server

# Option A: Full build (recommended)
npm run build

# Option B: TypeScript only (faster, but may miss copy steps)
npm run build:ts
```

**Verify build succeeded:**
```bash
   # Check compiled file exists (note: no src/ subdirectory)
   ls -la dist/index.js
   
   # Check router file exists
   ls -la dist/routes/churchOcrRoutes.js
   
   # If router file doesn't exist, it needs to be compiled
```

### Step 2: Restart Server (REQUIRED)
**Important:** Server must be restarted to load new compiled code.
```bash
# If using PM2:
pm2 restart orthodox-backend

# Or restart the process manually
```

### Step 3: Verify Router Loaded
Check server logs for:
```
🔍 Registering /api/church/:churchId/ocr routes (via router)
✅ /api/church/:churchId/ocr routes registered via router
```

OR (if router fails):
```
⚠️  [OCR] Router export invalid, using direct routes
```

### Step 4: Run Tests
```bash
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
```

**Expected Results:**
- `/api/church/46/ocr/jobs` → 200 (even if empty array)
- `/api/church/46/ocr/jobs/1` → 200 if job exists, 404 if not
- `/api/church/46/ocr/jobs/1/fusion/drafts` → 200 (even if empty)
- `/api/church/46/ocr/jobs/1/mapping` → 200 or null mapping
- `/api/church/46/ocr/jobs/1/image` → 200 if image exists, 404 if not

---

## Implementation Details

### Router File: `server/src/routes/churchOcrRoutes.ts`

**Routes Defined:**
- `GET /jobs` → List jobs
- `GET /jobs/:jobId` → Job detail
- `GET /jobs/:jobId/fusion/drafts` → List drafts
- `GET /jobs/:jobId/mapping` → Get mapping (NEW)
- `GET /jobs/:jobId/image` → Serve image (NEW)
- `POST /jobs/:jobId/fusion/drafts` → Save drafts

**Mount Point:** `/api/church/:churchId/ocr`

**Final URLs:**
- `/api/church/:churchId/ocr/jobs`
- `/api/church/:churchId/ocr/jobs/:jobId`
- `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts`
- `/api/church/:churchId/ocr/jobs/:jobId/mapping`
- `/api/church/:churchId/ocr/jobs/:jobId/image`

### Direct Routes: `server/src/index.ts`

**Fallback Implementation:**
- Routes defined directly if router fails to load
- Same paths and logic as router
- Ensures routes work even if router import fails

---

## Verification Results

**Status:** ✅ Code changes complete, **REQUIRES REBUILD AND RESTART**

**⚠️  CRITICAL:** The server runs compiled JavaScript from `dist/` directory. TypeScript source changes will NOT take effect until:
1. TypeScript is compiled to JavaScript
2. Server is restarted

### Changes Made

1. **Added missing routes to router:**
   - `GET /jobs/:jobId/mapping` → Get mapping from DB
   - `GET /jobs/:jobId/image` → Serve image file

2. **Fixed router export:**
   - Added CommonJS fallback: `module.exports = router`
   - Supports both ES modules and CommonJS

3. **Improved router mounting:**
   - Better error handling and logging
   - Handles both `default` export and direct export
   - Falls back gracefully to direct routes

4. **Route order verified:**
   - Router mount: Line 717 (before catch-all)
   - Direct routes: Lines 1063+ (before catch-all)
   - Catch-all 404: Line 3666 (after all routes)

### Next Steps

1. **Fix Router Exports (REQUIRED):**
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   
   # The compiled router file needs module.exports for CommonJS compatibility
   # This is done automatically, but verify it exists:
   node scripts/fix-router-exports.js
   
   # Verify exports are correct:
   grep -A 2 "exports.default" dist/routes/churchOcrRoutes.js
   # Should show: exports.default = router; AND module.exports = router;
   ```

2. **Rebuild TypeScript (if source changed):**
   ```bash
   # Full build (recommended - includes copy and verification)
   npm run build
   
   # OR TypeScript only (faster)
   npm run build:ts
   
   # After build, fix exports again (build overwrites the file):
   node scripts/fix-router-exports.js
   
   # Verify build succeeded (note: no src/ subdirectory in dist)
   ls -la dist/index.js
   ls -la dist/routes/churchOcrRoutes.js
   ```

2. **Restart Server:**
   ```bash
   # If using PM2:
   pm2 restart orthodox-backend
   
   # Check logs for router loading:
   pm2 logs orthodox-backend | grep OCR
   ```

3. **Verify Router Loaded:**
   Look for in server logs:
   ```
   ✅ [OCR] Loaded churchOcrRoutes from compiled dist
   🔍 Registering /api/church/:churchId/ocr routes (via router)
   ✅ /api/church/:churchId/ocr routes registered via router
   ```

4. **Run Tests:**
   ```bash
   node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
   ```

### Expected Test Results

After rebuild and restart:
- ✅ `/api/church/46/ocr/jobs` → 200 (even if empty array)
- ✅ `/api/church/46/ocr/jobs/1` → 200 if job exists, 404 if not
- ✅ `/api/church/46/ocr/jobs/1/fusion/drafts` → 200 (even if empty)
- ✅ `/api/church/46/ocr/jobs/1/mapping` → 200 or null mapping
- ✅ `/api/church/46/ocr/jobs/1/image` → 200 if image exists, 404 if not

### Troubleshooting

If routes still return 404:

1. **⚠️  VERIFY BUILD COMPLETED:**
   ```bash
   # Check compiled files exist and are recent
   ls -la dist/src/index.js
   ls -la dist/src/routes/churchOcrRoutes.js
   
   # Check file modification times (should be recent)
   stat dist/src/index.js
   ```

2. **⚠️  VERIFY SERVER RESTARTED:**
   ```bash
   # Check when server was last restarted
   pm2 describe orthodox-backend | grep "restart time"
   
   # Restart if needed
   pm2 restart orthodox-backend
   ```

3. **Check router loaded:**
   - Look for router loading messages in server logs:
     ```bash
     pm2 logs orthodox-backend --lines 100 | grep OCR
     ```
   - Should see: `✅ [OCR] Loaded churchOcrRoutes` OR `⚠️  [OCR] Router not loaded`
   - If router fails, direct routes should still work

4. **Check route order:**
   - Routes must be defined before catch-all at line 3666
   - Router mount at line 717 should be before direct routes
   - Direct routes at line 1063+ should be before catch-all

5. **Test direct routes:**
   - If router fails, direct routes at lines 1063+ should work
   - Check server logs for `[OCR Jobs] GET` messages
   - If no logs appear, server is running old code

6. **Verify routes in compiled code:**
   ```bash
   # Search compiled file for route definitions
   grep -n "app.get('/api/church/:churchId/ocr/jobs'" dist/src/index.js
   
   # Should find the route definition
   ```
