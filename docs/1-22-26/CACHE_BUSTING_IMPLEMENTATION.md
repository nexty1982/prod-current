# Frontend Cache Busting Implementation

## Summary

Fixed frontend deployment cache issues to ensure users always receive the latest build after deployment.

---

## Problems Identified

1. **Stale Assets**: `emptyOutDir: false` in Vite config was keeping old files in `dist/`, causing mixed old/new assets
2. **Cached index.html**: No cache headers meant browsers cached `index.html`, preventing new asset references from being fetched
3. **No Version Verification**: No way to verify which build is running in production

---

## Solutions Implemented

### 1. Fixed Vite Build Configuration

**File**: `front-end/vite.config.ts`
- **Change**: `emptyOutDir: false` → `emptyOutDir: true`
- **Impact**: `dist/` is now cleaned before each build, ensuring no stale assets

### 2. Added Cache Headers

**File**: `server/src/index.ts`

#### Index.html - No Cache
```javascript
// Set no-cache headers for index.html
if (req.path === '/' || req.path === '/index.html' || !req.path.includes('.')) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}
```

#### Assets - Long Cache (Immutable)
```javascript
app.use('/assets', express.static(path.resolve(__dirname, 'assets'), {
  maxAge: '1y',
  immutable: true,
  etag: true,
  lastModified: true
}));
```

#### Manifest.json - No Cache
```javascript
app.get('/manifest.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  // ...
});
```

#### Build-info.json - No Cache (NEW)
```javascript
app.get('/build-info.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  // ...
});
```

### 3. Build Info Injection

**File**: `front-end/scripts/inject-build-info.js` (NEW)
- Injects build info (git SHA + timestamp) into `index.html`
- Creates `build-info.json` file
- Runs automatically after Vite build

**Updated**: `front-end/package.json`
- Build script now includes: `node scripts/inject-build-info.js`

### 4. Version Stamp UI

**Files Created**:
- `front-end/src/shared/lib/buildInfo.ts` - Utility to access build info
- `front-end/src/features/devel-tools/build-info/BuildInfoPage.tsx` - UI page

**Route**: `/devel-tools/build-info`
- Accessible from Developer Tools → Development Console → Build Info
- Shows git SHA, build time, version
- Displays full JSON for verification

---

## Files Changed

### Frontend
1. `front-end/vite.config.ts` - `emptyOutDir: true`
2. `front-end/package.json` - Added build info injection
3. `front-end/scripts/inject-build-info.js` - NEW
4. `front-end/src/shared/lib/buildInfo.ts` - NEW
5. `front-end/src/features/devel-tools/build-info/BuildInfoPage.tsx` - NEW
6. `front-end/src/routes/Router.tsx` - Added build-info route
7. `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts` - Added Build Info menu item

### Backend
1. `server/src/index.ts` - Added cache headers for:
   - `index.html` (no-cache)
   - `/assets/*` (long cache, immutable)
   - `/manifest.json` (no-cache)
   - `/build-info.json` (no-cache, NEW endpoint)

---

## Deployment Steps

### 1. Rebuild Frontend
```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run build
```

**What happens**:
1. Vite cleans `dist/` directory
2. Vite builds with hashed filenames
3. Build info is injected into `index.html`
4. `build-info.json` is created
5. Build is verified

### 2. Restart Backend (if needed)
```bash
cd /var/www/orthodoxmetrics/prod/server
pm2 restart orthodox-backend
```

**Why**: Ensures new cache headers are active.

---

## Verification

### Proof 1: Cache Headers
```bash
# Index.html should have no-cache
curl -I http://127.0.0.1:3001/ | grep -i cache-control
# Expected: Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate

# Assets should have long cache
curl -I http://127.0.0.1:3001/assets/index-*.js 2>/dev/null | grep -i cache-control
# Expected: Cache-Control: public, max-age=31536000, immutable
```

### Proof 2: Build Info in Bundle
```bash
cd /var/www/orthodoxmetrics/prod/front-end/dist/assets
BUNDLE=$(ls index-*.js | head -1)
grep -c "formatRecordDate" "$BUNDLE"
# Expected: Number > 0 (confirms new code is in bundle)
```

### Proof 3: Version Stamp
1. Navigate to: `/devel-tools/build-info`
2. Verify:
   - Git SHA matches: `git rev-parse --short HEAD`
   - Build time is recent
   - Version displays correctly

### Proof 4: Date Formatting
1. Navigate to: `/apps/records/baptism?church=46`
2. Verify dates show `YYYY-MM-DD` format (not ISO timestamps)

---

## Nginx Configuration (If Applicable)

If nginx is in front of Express, add these rules:

```nginx
# No cache for index.html
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    proxy_pass http://localhost:3001;
}

# Long cache for hashed assets
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    proxy_pass http://localhost:3001;
}

# No cache for manifest.json and build-info.json
location ~ ^/(manifest|build-info)\.json$ {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    proxy_pass http://localhost:3001;
}
```

**Note**: If Express serves directly (no nginx), the Express headers are sufficient.

---

## Expected Results

After deployment:
- ✅ `index.html` always fetches latest (no-cache headers)
- ✅ Assets are cached long-term (hashed filenames are immutable)
- ✅ Build info page shows current git SHA and build time
- ✅ Date columns show `YYYY-MM-DD` format (not ISO timestamps)
- ✅ Users receive new assets immediately after deploy

---

**Status**: ✅ Complete
**Ready for**: Production deployment
