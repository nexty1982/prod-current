# OCR Church Routes Mount Status

## Current Mount Configuration

### Router Mount Point
**File:** `dist/index.js`  
**Line:** 685  
**Code:**
```javascript
app.use('/api/church/:churchId/ocr', routerToMount);
```

### Routes Defined in Router
**File:** `dist/routes/churchOcrRoutes.js`

The router defines the following routes:

1. **GET /jobs** (line 95)
   - Logs: `[OCR Jobs] GET /api/church/${churchId}/ocr/jobs`
   - Queries `ocr_jobs` table in church DB
   - Returns array of jobs (empty array if none)

2. **GET /jobs/:jobId** (line 164)
   - Logs: `[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}`
   - Queries single job from `ocr_jobs` table
   - Returns 404 if job not found

3. **GET /jobs/:jobId/fusion/drafts** (line 246)
   - Logs: `[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`
   - Queries `ocr_fused_drafts` table
   - Returns array (empty if none)

4. **POST /jobs/:jobId/fusion/drafts** (line 319)
   - Creates/updates fusion drafts

5. **GET /jobs/:jobId/mapping** (line 429)
   - Logs: `[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/mapping`
   - Returns mapping JSON or 404

6. **GET /jobs/:jobId/image** (line 469)
   - Logs: `[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/image`
   - Serves image file or returns 404

## Router Configuration

**File:** `src/routes/churchOcrRoutes.ts`  
**Router Creation:** `Router({ mergeParams: true })`

The `mergeParams: true` option ensures that `req.params.churchId` from the parent route (`/api/church/:churchId/ocr`) is accessible in router handlers.

## Router Loading Logic

**File:** `dist/index.js` lines 657-696

The router is loaded via:
```javascript
churchOcrRouter = require('./routes/churchOcrRoutes');
```

Then mounted if valid:
```javascript
if (churchOcrRouter) {
    const routerToMount = churchOcrRouter.default || churchOcrRouter;
    if (routerToMount && typeof routerToMount === 'function') {
        app.use('/api/church/:churchId/ocr', routerToMount);
    }
}
```

## Issue Analysis

**Problem:** Routes return 404 despite being defined in router.

**Possible Causes:**
1. Router not loading (require fails silently)
2. Router export format incorrect
3. Router not mounting (condition fails)
4. Route paths not matching (mergeParams issue)
5. **Middleware order issue** - Catch-all `/api/*` handler or other middleware blocking routes

## Middleware Order Investigation

**Catch-all 404 Handler:**
- **Location:** `dist/index.js` line 3393
- **Code:** `app.use('/api/*', (req, res) => { res.status(404).json({ error: 'Not found' }); })`
- **Status:** Mounted AFTER church OCR router (line 685), so should not block routes

**Legacy OCR Router:**
- **Location:** `dist/index.js` line 653
- **Mount:** `app.use('/api/ocr', ocrRouter)`
- **Status:** Only handles `/api/ocr/*` routes, should not interfere with `/api/church/*`

**Diagnostic Middleware Added:**
- Added diagnostic logging middleware before router mount to trace route matching
- Logs: `[DIAG] Entering church OCR router: METHOD URL params: {...}`

## Fixes Applied

1. ✅ Added `mergeParams: true` to router creation (ensures `req.params.churchId` is accessible)
2. ✅ Added logging to all jobs routes (`[OCR Jobs] GET ...`)
3. ✅ Fixed router exports (module.exports for CommonJS compatibility)
4. ✅ Fixed rebuild script integer comparison bug (handles empty grep results)
5. ✅ Improved error handling for missing tables (returns empty array instead of 500)
6. ✅ Made bundle existence check non-blocking (doesn't affect response if it fails)
7. ✅ Added diagnostic middleware to trace route matching (`[DIAG] Entering church OCR router`)
8. ✅ Verified middleware order (church OCR router mounted before catch-all 404 handler)

## Verification Steps

After rebuild and restart:

1. **Check router loading:**
   ```bash
   pm2 logs orthodox-backend --lines 100 | grep OCR
   ```
   Should see:
   - `✅ [OCR] Loaded churchOcrRoutes from compiled dist`
   - `🔍 Registering /api/church/:churchId/ocr routes (via router)`
   - `✅ /api/church/:churchId/ocr routes registered via router`

2. **Test endpoints:**
   ```bash
   node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
   ```

3. **Check route logs:**
   ```bash
   pm2 logs orthodox-backend --lines 50 | grep "\[OCR Jobs\]"
   ```
   Should see route execution logs when endpoints are hit.

## Router Signature Debugging

**Added router signature and route listing for debugging:**

1. **Router Signature:**
   - `churchOcrRoutes:v2:jobs-only`
   - Attached to router as `__om_signature`

2. **Route Listing:**
   - Function `listRoutes()` extracts all registered routes from router stack
   - Attached to router as `__om_routes` array
   - Format: `["GET /jobs", "GET /jobs/:jobId", ...]`

3. **Mount Logging:**
   - Logs router export keys
   - Logs which export is used (default vs module)
   - Logs router signature
   - Logs registered routes array

4. **Diagnostic Middleware:**
   - `[DIAG] Entering church OCR router` - logs all requests to router
   - `[DIAG JOBS PREFIX HIT]` - logs specifically /jobs requests

## Verification Results

_To be filled after testing:_

- [ ] Router loads successfully
- [ ] Router signature appears: `churchOcrRoutes:v2:jobs-only`
- [ ] Router routes list shows: `GET /jobs` and other jobs routes
- [ ] Routes return 200 (not 404)
- [ ] Route logs appear in PM2 output (`[OCR Jobs] GET ...`)
- [ ] Diagnostic logs show router is being hit
- [ ] All 5 jobs endpoints work correctly
