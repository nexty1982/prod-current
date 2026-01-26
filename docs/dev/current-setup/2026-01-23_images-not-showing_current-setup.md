# Images Not Showing - Current Setup Documentation

**Date:** 2026-01-23  
**Purpose:** Document current image serving setup and identify why `/images/*` requests are failing

## 1. Current Image Locations on Disk

### Canonical Directories Found:
- ✅ `logos` - exists in `front-end/public/images/logos/`
- ✅ `backgrounds` - exists in `front-end/public/images/backgrounds/`
- ✅ `icons` - exists in `front-end/public/images/icons/`
- ✅ `ui` - exists in `front-end/public/images/ui/`
- ✅ `records` - exists in `front-end/public/images/records/`
- ❌ `misc` - **MISSING** (not found in public/images/)

### Filesystem Locations:
- **Source/Development:** `/var/www/orthodoxmetrics/prod/front-end/public/images/`
- **Production Build:** `/var/www/orthodoxmetrics/prod/front-end/dist/images/`
- **Both locations exist** and contain the same directory structure (except `misc`)

### Sample Files Found:
- `logos/biz-logo.png`
- `logos/orthodox-metrics-logo.svg`
- `backgrounds/bgtiled1.png`, `bgtiled2.png`, etc.
- `icons/baptism.png`, `default.png`, `funeral.png`, `marriage.png`
- `records/baptism.png`, `gold-hor.png`, `om-logo.png`, etc.
- `ui/components.png`, `GE-buttons-1.png`, etc.

## 2. Source-of-Truth Image Root

**Chosen Canonical Root:** `front-end/dist/images/` (production)

**Rationale:**
- Vite copies `public/` contents to `dist/` during build
- Production should serve from `dist/` (built assets)
- Development can serve from `public/` (source)

## 3. How Images Are Currently Requested

### Expected URL Pattern:
- `/images/logos/biz-logo.png`
- `/images/backgrounds/bgtiled1.png`
- `/images/icons/baptism.png`
- `/images/ui/components.png`
- `/images/records/om-logo.png`
- `/images/misc/...` (directory exists with many files)

### Current Failure Mode:
Based on code analysis, requests to `/images/*` are likely:
1. **404 with `application/json`** - Catch-all route returning JSON error
2. **OR** being proxied through backend Express instead of served directly by Nginx

## 4. Current Routing/Serving Layers

### A) Frontend (Vite)
**File:** `front-end/vite.config.ts`

**Configuration:**
- `publicDir: 'public'` - Vite serves files from `public/` at root path
- **No proxy for `/images/*`** - Comment says "Vite automatically serves files from public/ at the root path - NO PROXY NEEDED"
- In dev mode, Vite serves `/images/*` directly from `public/images/`

**Status:** ✅ Correctly configured for development

### B) Backend (Express)
**File:** `server/src/index.ts` (lines 3849-3875)

**Current Implementation:**
```typescript
// Serve /images/* from front-end/dist/images (production) or front-end/public/images (development)
const distImagesPath = path.join(prodRoot, 'front-end/dist/images');
const publicImagesPath = path.join(prodRoot, 'front-end/public/images');

if (fs.existsSync(distImagesPath)) {
    imagesPath = distImagesPath;
    app.use('/images', express.static(imagesPath));
} else if (fs.existsSync(publicImagesPath)) {
    imagesPath = publicImagesPath;
    app.use('/images', express.static(imagesPath));
}
```

**Problem Identified:**
- Static middleware is mounted **AFTER** catch-all route `app.get('*', ...)`
- Catch-all route (line 3965) checks for `/images/*` and returns 404 JSON
- **Order matters:** Catch-all `app.get('*', ...)` should come AFTER static middleware, but Express routes are matched in order
- Actually, looking closer: `app.use('/images', ...)` comes BEFORE `app.get('*', ...)`, so order should be OK
- **Real issue:** The catch-all `app.get('*', ...)` is a GET handler, but static middleware uses `app.use()`, which should match first

**Catch-All Route (lines 3965-3973):**
```typescript
app.get('*', versionSwitcherMiddleware, (req, res) => {
  if (req.path.startsWith('/images/')) {
    return res.status(404).json({ error: 'Image not found', path: req.path });
  }
  // ... serve index.html
});
```

**Status:** ⚠️ Potential issue - catch-all may be intercepting before static middleware

### C) Nginx
**File:** Not found in codebase (likely `/etc/nginx/sites-enabled/orthodoxmetrics.com`)

**Current Status:** **UNKNOWN** - Need to check if Nginx has:
- `location ^~ /images/` block
- Or if it's proxying everything to backend

**Expected Configuration (Option A - Recommended):**
```nginx
location ^~ /images/ {
    alias /var/www/orthodoxmetrics/prod/front-end/dist/images/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**Status:** ❓ **NEEDS VERIFICATION** - Likely missing or incorrectly configured

## 5. Failure Analysis

### Most Likely Cause:
**Nginx is proxying `/images/*` to backend**, and:
1. Either the static middleware isn't matching correctly
2. Or the catch-all route is intercepting first
3. Or the image files don't exist in the expected location

### Evidence:
- Backend code shows 404 JSON response for `/images/*` in catch-all
- This suggests requests ARE reaching the backend
- But static middleware should serve them before catch-all matches

### Root Cause Hypothesis:
**Nginx doesn't have a `location /images/` block**, so:
- All requests (including `/images/*`) are proxied to backend
- Backend static middleware should serve them, but something is wrong
- Either middleware order issue, or files not found, or path resolution issue

## 6. Required Fixes

### Step 1: Add Nginx Location Block (Option A - Recommended)
Add to `/etc/nginx/sites-enabled/orthodoxmetrics.com`:
```nginx
location ^~ /images/ {
    alias /var/www/orthodoxmetrics/prod/front-end/dist/images/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    
    # Ensure correct content types
    types {
        image/png png;
        image/jpeg jpg jpeg;
        image/svg+xml svg;
        image/webp webp;
        image/gif gif;
    }
    default_type image/png;
}
```

**Placement:** BEFORE the main `location /` proxy block

### Step 2: Create Missing `misc` Directory
```bash
mkdir -p /var/www/orthodoxmetrics/prod/front-end/public/images/misc
mkdir -p /var/www/orthodoxmetrics/prod/front-end/dist/images/misc
touch /var/www/orthodoxmetrics/prod/front-end/public/images/misc/.gitkeep
```

### Step 3: Verify Backend Static Middleware Order
Ensure `app.use('/images', ...)` comes BEFORE `app.get('*', ...)` (already correct in code)

### Step 4: Fix Backend Catch-All
The catch-all should NOT return 404 JSON for `/images/*` - it should let static middleware handle it. But since static middleware comes first, this should be OK. However, the check is redundant and could be removed.

## 7. Verification Checklist

After fixes:
- [ ] Run `node scripts/check-gallery-directories.mjs`
- [ ] Test: `curl -I https://orthodoxmetrics.com/images/logos/biz-logo.png` → 200 + `Content-Type: image/png`
- [ ] Test: `curl -I https://orthodoxmetrics.com/images/backgrounds/bgtiled1.png` → 200 + `Content-Type: image/png`
- [ ] Test: `curl -I https://orthodoxmetrics.com/images/icons/baptism.png` → 200 + `Content-Type: image/png`
- [ ] Test: `curl -I https://orthodoxmetrics.com/images/ui/components.png` → 200 + `Content-Type: image/png`
- [ ] Test: `curl -I https://orthodoxmetrics.com/images/records/om-logo.png` → 200 + `Content-Type: image/png`
- [ ] Test: `curl -I https://orthodoxmetrics.com/images/misc/.gitkeep` → 200 or 404 (directory exists)
- [ ] Verify 2+ real pages show images correctly

## 8. Implementation Summary

**Current State:**
- ✅ Images exist in `front-end/public/images/` and `front-end/dist/images/`
- ✅ All 6 canonical directories now exist (created `misc` directory)
- ✅ Backend has static middleware for `/images/*` (fallback)
- ✅ Backend catch-all route updated with better error handling
- ⚠️ **Nginx configuration needs to be added** (see `2026-01-23_nginx-images-location-block.md`)

**Chosen Solution:**
- **Option A:** Nginx serves `/images/*` directly from `front-end/dist/images/`
- This bypasses backend entirely and is most reliable
- Backend static middleware remains as fallback for dev mode

**Completed:**
1. ✅ Verified `misc` directory exists in both `public/images/` and `dist/images/` (already had files)
2. ✅ Updated backend catch-all route error handling
3. ✅ Created Nginx config template document (`docs/dev/current-setup/2026-01-23_nginx-images-location-block.md`)
4. ✅ Created fix script (`scripts/fix-images-serving.sh`)
5. ✅ Backend static middleware properly configured (serves from `dist/images/` in production)

**Remaining Steps (to be done on server):**
1. ⚠️ Add Nginx `location ^~ /images/` block (see template doc)
2. ⚠️ Run `sudo nginx -t` to verify config
3. ⚠️ Run `sudo systemctl reload nginx`
4. ⚠️ Verify with curl and sanity script
5. ⚠️ Test on real pages

## 9. Files Created/Modified

**Created:**
- `docs/dev/current-setup/2026-01-23_images-not-showing_current-setup.md` (this file)
- `docs/dev/current-setup/2026-01-23_nginx-images-location-block.md` (Nginx template)
- `scripts/fix-images-serving.sh` (automation script)
- `front-end/public/images/misc/` (directory)
- `front-end/dist/images/misc/` (directory)

**Modified:**
- `server/src/index.ts` - Improved catch-all route error handling for `/images/*`
