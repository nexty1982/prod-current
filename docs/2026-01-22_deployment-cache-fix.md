# Frontend Deployment Cache Fix

## Problem
Frontend changes were not reflecting in production due to:
1. Stale assets being served (Vite `emptyOutDir: false` was keeping old files)
2. Missing cache headers for `index.html` (browsers cached it, preventing new asset references)
3. No version stamp to verify which build is running

## Solution Implemented

### A) Fixed Vite Build Configuration

**File**: `front-end/vite.config.ts`
- **Changed**: `emptyOutDir: false` → `emptyOutDir: true`
- **Reason**: Ensures `dist/` is cleaned before each build, preventing stale assets
- **Impact**: Users always get fresh builds, no old JS/CSS files mixed with new ones

### B) Added Cache Headers in Express

**File**: `server/src/index.ts`

#### 1. Index.html - No Cache
```javascript
// Catch-all handler for index.html
if (req.path === '/' || req.path === '/index.html' || !req.path.includes('.')) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}
```

**Why**: `index.html` contains references to hashed JS/CSS files. If cached, browsers won't fetch new asset references.

#### 2. Assets - Long Cache (Immutable)
```javascript
app.use('/assets', express.static(path.resolve(__dirname, 'assets'), {
  maxAge: '1y', // 1 year cache for hashed assets (immutable)
  immutable: true, // Mark as immutable for better caching
  etag: true,
  lastModified: true
}));
```

**Why**: Vite produces hashed filenames like `assets/index-abc123.js`. These are immutable and can be cached forever.

#### 3. Manifest.json - No Cache
```javascript
app.get('/manifest.json', (req, res) => {
  // ... 
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
});
```

**Why**: Prevents PWA/service worker caching issues.

### C) Build Info Injection

**File**: `front-end/scripts/inject-build-info.js` (NEW)
- Injects build information (git SHA + timestamp) into `index.html`
- Creates `build-info.json` file for API access
- Runs automatically after Vite build

**Build Info Structure**:
```json
{
  "gitSha": "abc1234",
  "buildTime": "2025-01-XX...",
  "buildTimestamp": 1234567890,
  "version": "1.0.0"
}
```

**Updated**: `front-end/package.json`
- Added `node scripts/inject-build-info.js` to build script

### D) Version Stamp UI

**Files Created**:
1. `front-end/src/shared/lib/buildInfo.ts` - Utility to access build info
2. `front-end/src/features/devel-tools/build-info/BuildInfoPage.tsx` - UI page

**Route Added**: `/devel-tools/build-info`
- Accessible from Developer Tools menu
- Shows git SHA, build time, version
- Displays full build info JSON for verification

**Menu Item Added**: `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`
- "Build Info" under Developer Tools → Development Console

### E) Service Worker Check

**Status**: No service workers found
- Checked `main.tsx` - no service worker registration
- Checked `vite.config.ts` - no PWA plugin
- `manifest.json` exists but is just metadata (not PWA manifest)

**Action**: Added no-cache headers to `manifest.json` route as precaution

---

## Deployment Steps

### 1. Rebuild Frontend
```bash
cd front-end
npm run build
```

This will:
- Clean `dist/` directory (emptyOutDir: true)
- Build with Vite
- Inject build info into `index.html`
- Verify build

### 2. Restart Backend (if needed)
```bash
cd server
pm2 restart orthodox-backend
```

Backend serves static files, so restart ensures new cache headers are active.

### 3. Verify Deployment

#### A) Check Cache Headers
```bash
# Check index.html headers (should show no-cache)
curl -I https://orthodoxmetrics.com/

# Expected headers:
# Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
# Pragma: no-cache
# Expires: 0
```

#### B) Check Build Info in Bundle
```bash
# Download and search for formatRecordDate in the served JS bundle
curl -s https://orthodoxmetrics.com/assets/index-*.js | grep -o "formatRecordDate" | head -1

# Should find: formatRecordDate (confirms new code is in bundle)
```

#### C) Check Version Stamp
1. Navigate to: `/devel-tools/build-info`
2. Verify git SHA matches latest commit
3. Verify build time is recent

#### D) Verify Date Formatting
1. Navigate to: `/apps/records/baptism?church=46`
2. Check date columns (Date Of Birth, Date Of Baptism)
3. Should show `YYYY-MM-DD` format, NOT ISO timestamps

---

## Nginx Configuration (If Using Nginx)

If nginx is in front of Express, add these rules:

```nginx
# No cache for index.html
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    add_header Surrogate-Control "no-store";
    proxy_pass http://localhost:3001;
}

# Long cache for hashed assets (immutable)
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    proxy_pass http://localhost:3001;
}

# No cache for manifest.json
location = /manifest.json {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    proxy_pass http://localhost:3001;
}
```

**Note**: If Express is serving directly (no nginx), the Express cache headers are sufficient.

---

## Files Changed

### Frontend
- `front-end/vite.config.ts` - Changed `emptyOutDir: true`
- `front-end/package.json` - Added build info injection step
- `front-end/scripts/inject-build-info.js` - NEW: Build info injector
- `front-end/src/shared/lib/buildInfo.ts` - NEW: Build info utility
- `front-end/src/features/devel-tools/build-info/BuildInfoPage.tsx` - NEW: Version stamp UI
- `front-end/src/routes/Router.tsx` - Added build-info route
- `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts` - Added Build Info menu item

### Backend
- `server/src/index.ts` - Added cache headers for index.html, assets, manifest.json

---

## Verification Checklist

- [x] Vite config updated (`emptyOutDir: true`)
- [x] Cache headers added for index.html (no-cache)
- [x] Cache headers added for assets (long cache, immutable)
- [x] Build info injection script created
- [x] Version stamp UI page created
- [x] Route added for build-info page
- [x] Menu item added for Build Info
- [x] Service worker check completed (none found)
- [x] Manifest.json cache headers added

---

## Testing Commands

### 1. Verify Build Produces Fresh Assets
```bash
cd front-end
rm -rf dist
npm run build
ls -la dist/assets/ | head -5  # Should show new hashed filenames
```

### 2. Verify Build Info Injection
```bash
cd front-end
npm run build
grep "__BUILD_INFO__" dist/index.html  # Should find injected script
cat dist/build-info.json  # Should show build info
```

### 3. Verify Cache Headers (After Deploy)
```bash
# From server
curl -I http://127.0.0.1:3001/ | grep -i cache
# Should show: Cache-Control: no-store, no-cache...

curl -I http://127.0.0.1:3001/assets/index-*.js | grep -i cache
# Should show: Cache-Control: public, max-age=31536000, immutable
```

### 4. Verify New Code in Bundle
```bash
# From server
grep -r "formatRecordDate" /var/www/orthodoxmetrics/prod/front-end/dist/assets/*.js
# Should find the function in the bundle
```

---

## Expected Results

After deployment:
1. ✅ `index.html` has no-cache headers (always fetches latest)
2. ✅ Assets have long cache headers (hashed filenames are immutable)
3. ✅ Build info page shows current git SHA and build time
4. ✅ Date columns show `YYYY-MM-DD` format (not ISO timestamps)
5. ✅ Users receive new assets immediately after deploy

---

**Status**: ✅ Complete
**Date**: 2025-01-XX
