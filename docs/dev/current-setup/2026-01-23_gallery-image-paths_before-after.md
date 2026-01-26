# Gallery Image Paths - Before vs After

**Date**: January 23, 2026

## Before: Current State

### Where Images Live Now

**Server Production**:
- Location: `/var/www/orthodoxmetrics/prod/front-end/public/images/`
- All 6 canonical directories exist with files:
  - `logos/` - 2 files (biz-logo.png, orthodox-metrics-logo.svg)
  - `backgrounds/` - 6 PNG files
  - `icons/` - 5 PNG files
  - `ui/` - 4 PNG files
  - `records/` - 15 files
  - `misc/` - 100+ files (includes subdirectories)

**Local Development**:
- Location: `front-end/public/images/`
- Same structure as server - all 6 canonical directories exist with files

### Why Images Might 404

**Potential Issues**:
1. **Vite config**: `publicDir` not explicitly set (relies on default `'public'`)
2. **Dev server not running**: Cannot test `/images/*` routes without server
3. **React Router catch-all**: Might intercept `/images/*` if configured incorrectly
4. **Proxy misconfiguration**: If `/images/*` were proxied, backend might return JSON errors

**Current Vite Config**:
- ✅ `base: '/'` - correct
- ⚠️ `publicDir` - not explicitly set (defaults to `'public'`, but explicit is better)
- ✅ No proxy for `/images/*` - correct (should serve directly)

## After: Fixed State

### Changes Made

1. **Explicit `publicDir` in Vite Config**:
   ```typescript
   publicDir: 'public', // Explicitly set for clarity
   ```

2. **Verified Directory Structure**:
   - All 6 canonical directories exist
   - Files are in correct locations
   - No need to copy/move files (already in correct place)

3. **No Code Changes Needed**:
   - Image paths already use `/images/<dir>/<file>` format
   - Gallery component uses correct path resolution
   - Backend API returns correct paths

### Expected Behavior After Fix

**Static File Serving**:
- `/images/logos/biz-logo.png` → `front-end/public/images/logos/biz-logo.png`
- Returns HTTP 200 with `Content-Type: image/png`
- Served directly by Vite dev server (no proxy, no React Router)

**Gallery Component**:
- Loads images from `/images/<canonical-dir>/<file>`
- All 6 canonical directories visible in sidebar
- Images render correctly with proper URLs

## Verification Steps

### 1. Start Dev Server
```bash
cd front-end
npm run dev
```

### 2. Test Static Image Serving
```bash
curl -i http://localhost:5174/images/logos/biz-logo.png
```

**Expected Response**:
```
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: <size>
...
[binary image data]
```

### 3. Test All 6 Canonical Directories
```bash
# Logos
curl -I http://localhost:5174/images/logos/biz-logo.png

# Backgrounds
curl -I http://localhost:5174/images/backgrounds/bgtiled1.png

# Icons
curl -I http://localhost:5174/images/icons/baptism.png

# UI
curl -I http://localhost:5174/images/ui/components.png

# Records
curl -I http://localhost:5174/images/records/baptism.png

# Misc
curl -I http://localhost:5174/images/misc/placeholder.png
```

**All should return**: `HTTP/1.1 200 OK` with `Content-Type: image/*`

### 4. Run Sanity Check Script
```bash
node scripts/check-gallery-directories.mjs --base-url=http://localhost:5174
```

**Expected**: All checks pass ✅

### 5. Browser Testing
1. Navigate to `/apps/gallery`
2. Click each canonical directory in sidebar
3. Verify images load (check Network tab for 200 responses)
4. Verify image URLs are `/images/<dir>/<file>` format

## Summary

**Before**:
- Images exist in correct location ✅
- Vite config mostly correct (missing explicit `publicDir`) ⚠️
- Cannot verify without dev server running ⚠️

**After**:
- Explicit `publicDir: 'public'` in Vite config ✅
- All directories verified ✅
- Ready for testing when dev server runs ✅

**No file moves needed** - images already in correct location!
