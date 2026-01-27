# OCR Route Wiring Status

## PM2 Configuration

- **PM2 Process Name:** `orthodox-backend`
- **PM2 Script Path:** `dist/index.js` (compiled from `src/index.ts`)
- **Start Command:** `npm start` → `NODE_ENV=production node dist/index.js`
- **Express Entrypoint:** `server/dist/index.js`

## Current Route Mounting

### Settings Route (Working - Returns 200)
- **Route:** `GET /api/church/:churchId/ocr/settings`
- **Location:** `dist/index.js` line 700
- **Mount Style:** Direct route definition (`app.get(...)`)
- **Logging:** `[OCR Settings] GET /api/church/${churchId}/ocr/settings`

### Jobs Routes (Not Working - Returns 404)
- **Routes:** 
  - `GET /api/church/:churchId/ocr/jobs`
  - `GET /api/church/:churchId/ocr/jobs/:jobId`
  - `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts`
  - `GET /api/church/:churchId/ocr/jobs/:jobId/mapping`
  - `GET /api/church/:churchId/ocr/jobs/:jobId/image`
- **Location:** `dist/routes/churchOcrRoutes.js` (router file)
- **Mount Attempt:** `dist/index.js` line 685: `app.use('/api/church/:churchId/ocr', routerToMount)`
- **Status:** Router may not be loading or routes not matching

## Router Loading Logic

Located in `dist/index.js` lines 657-696:

```javascript
let churchOcrRouter;
try {
    churchOcrRouter = require('./routes/churchOcrRoutes');
    console.log('✅ [OCR] Loaded churchOcrRoutes from compiled dist');
} catch (e) {
    // Fallback logic...
}

if (churchOcrRouter) {
    const routerToMount = churchOcrRouter.default || churchOcrRouter;
    if (routerToMount && typeof routerToMount === 'function') {
        app.use('/api/church/:churchId/ocr', routerToMount);
        console.log('✅ /api/church/:churchId/ocr routes registered via router');
    }
}
```

## Issue Analysis

1. **Router File Exists:** `dist/routes/churchOcrRoutes.js` exists and has routes defined
2. **Router Export:** File has `exports.default = router` and `module.exports = router`
3. **Router Mount:** Code attempts to mount at `/api/church/:churchId/ocr`
4. **Routes Defined:** Router has `/jobs`, `/jobs/:jobId`, etc. defined
5. **Problem:** Routes return 404, suggesting router not mounted or routes not matching

## Changes Made

### Phase 1: Added Logging to Router Routes
- Added `console.log('[OCR Jobs] GET /api/church/${churchId}/ocr/jobs')` to `/jobs` route
- Added logging to all 5 jobs routes in `src/routes/churchOcrRoutes.ts`
- This will help confirm if router routes are being hit

### Phase 2: Router Export Fix
- Verified `dist/routes/churchOcrRoutes.js` has both `exports.default` and `module.exports`
- Router should load correctly

### Phase 3: Route Order
- Router mounts at line 685 in `dist/index.js` (BEFORE direct routes)
- Direct routes are at lines 1018+ (AFTER router mount)
- Router routes should take precedence if router loads

## Quick Test Script

**Use the automated script to rebuild, restart, and test:**

```bash
cd /var/www/orthodoxmetrics/prod/server
bash scripts/rebuild-and-test-ocr-routes.sh
```

This script automates:
1. TypeScript rebuild
2. Router export fix
3. File verification
4. PM2 restart
5. Log checking
6. Endpoint testing
7. Route log verification

## Manual Steps (if needed)

1. **Rebuild TypeScript:**
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   npm run build:ts
   node scripts/fix-router-exports.js  # Ensure exports are correct
   ```

2. **Restart Server:**
   ```bash
   pm2 restart orthodox-backend
   ```

3. **Check PM2 Logs for Router Loading:**
   ```bash
   pm2 logs orthodox-backend --lines 100 | grep OCR
   ```
   Look for:
   - `✅ [OCR] Loaded churchOcrRoutes from compiled dist`
   - `🔍 Registering /api/church/:churchId/ocr routes (via router)`
   - `✅ /api/church/:churchId/ocr routes registered via router`

4. **Test Endpoints:**
   ```bash
   node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
   ```

5. **Check for Route Logs:**
   When testing, look for `[OCR Jobs] GET /api/church/46/ocr/jobs` in PM2 logs
   - If you see these logs → Router routes are working ✅
   - If you don't see these logs → Router not loading or routes not matching ❌
