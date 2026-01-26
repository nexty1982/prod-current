# Gallery Image Paths - Fix Applied

**Date**: January 23, 2026  
**Issue**: Images returning 404 with JSON responses from Express backend  
**Root Cause**: Backend catch-all route intercepting `/images/*` requests

## Problem Identified

**Symptoms**:
- `curl http://localhost:5174/images/logos/biz-logo.png` returns HTTP 404
- Response is JSON: `{"error": "API endpoint not found"}` or similar
- Response headers show `x-powered-by: Express` (backend, not Vite)

**Root Cause**:
The Express backend server has a catch-all route (`app.get('*', ...)`) at line 794 that serves `index.html` for all non-API routes. This route was intercepting `/images/*` requests before static file middleware could serve them.

**Why It Happened**:
- Backend serves static files from `front-end/dist/` (production build)
- Static file middleware for `/images/*` was missing
- Catch-all route caught `/images/*` and tried to serve `index.html` instead

## Fix Applied

**File**: `server/index.js` (lines 743-752)

Added static file serving for `/images/*` BEFORE the catch-all route:

```javascript
// Serve images from front-end/public/images/ (dev) or front-end/dist/images/ (prod)
// This must come BEFORE the catch-all route to serve actual image files
const imagesPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, '../front-end/dist/images')
  : path.resolve(__dirname, '../front-end/public/images');
if (fs.existsSync(imagesPath)) {
  app.use('/images', express.static(imagesPath));
  console.log(`✅ [Server] Serving /images/* from: ${imagesPath}`);
} else {
  console.warn(`⚠️  [Server] Images directory not found: ${imagesPath}`);
}
```

**Key Points**:
1. ✅ Placed BEFORE catch-all route (line 794)
2. ✅ Handles both dev (`public/images/`) and prod (`dist/images/`) paths
3. ✅ Checks directory exists before mounting
4. ✅ Logs which path is being used

## Verification

**After server restart**, test:

```bash
# Should return HTTP 200 with image data
curl -I http://localhost:5174/images/logos/biz-logo.png

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: image/png
# Content-Length: <size>
```

**Run verification script**:
```bash
bash scripts/verify-image-paths.sh http://localhost:5174
```

**Expected**: All 6 canonical directories should pass ✅

## Files Modified

1. `server/index.js` - Added static file serving for `/images/*`

## Next Steps

1. **Restart backend server** (if not already restarted)
2. **Run verification**: `bash scripts/verify-image-paths.sh http://localhost:5174`
3. **Test in browser**: Navigate to `/apps/gallery` and verify images load

## Notes

- This fix works for both development and production
- In dev: serves from `front-end/public/images/`
- In prod: serves from `front-end/dist/images/` (after build)
- The static middleware must be BEFORE the catch-all route to work correctly
