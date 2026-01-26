# Deployment Verification Guide

## Quick Verification Steps

### 1. Verify Build Produces Fresh Assets
```bash
cd /var/www/orthodoxmetrics/prod/front-end
rm -rf dist
npm run build
ls -la dist/assets/ | head -5
# Should show new hashed filenames with recent timestamps
```

### 2. Verify Build Info Injection
```bash
cd /var/www/orthodoxmetrics/prod/front-end
grep "__BUILD_INFO__" dist/index.html
# Should find: <script> window.__BUILD_INFO__ = {...} </script>

cat dist/build-info.json
# Should show: {"gitSha":"...","buildTime":"...","version":"..."}
```

### 3. Verify Cache Headers (After Deploy)
```bash
# Check index.html headers (should show no-cache)
curl -I http://127.0.0.1:3001/ | grep -i cache
# Expected: Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate

# Check assets headers (should show long cache)
curl -I http://127.0.0.1:3001/assets/index-*.js 2>/dev/null | head -10 | grep -i cache
# Expected: Cache-Control: public, max-age=31536000, immutable
```

### 4. Verify New Code in Bundle
```bash
# Find the main bundle file
cd /var/www/orthodoxmetrics/prod/front-end/dist/assets
BUNDLE=$(ls index-*.js | head -1)

# Search for formatRecordDate function
grep -o "formatRecordDate" "$BUNDLE" | head -1
# Should find: formatRecordDate (confirms new code is in bundle)

# Search for date formatting logic
grep -o "split.*T.*0" "$BUNDLE" | head -1
# Should find date extraction logic
```

### 5. Verify Version Stamp in UI
1. Navigate to: `https://orthodoxmetrics.com/devel-tools/build-info`
2. Check that:
   - Git SHA matches: `git rev-parse --short HEAD`
   - Build time is recent (within last hour)
   - Version string displays correctly

### 6. Verify Date Formatting
1. Navigate to: `https://orthodoxmetrics.com/apps/records/baptism?church=46`
2. Check date columns:
   - Should show: `2005-01-03` (YYYY-MM-DD)
   - Should NOT show: `2005-01-03T05:00:00.000Z` (ISO timestamp)

---

## Full Deployment Process

### Step 1: Rebuild Frontend
```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run build
```

**Expected Output**:
- Vite build completes successfully
- Build info injection runs
- Build verification passes

### Step 2: Restart Backend (if needed)
```bash
cd /var/www/orthodoxmetrics/prod/server
pm2 restart orthodox-backend
```

**Why**: Ensures new cache headers are active.

### Step 3: Clear Browser Cache (for testing)
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or: Open DevTools → Network tab → Check "Disable cache"

### Step 4: Verify in Browser
1. Open DevTools → Network tab
2. Navigate to records page
3. Check:
   - `index.html` request shows `Cache-Control: no-store...`
   - Asset requests show `Cache-Control: public, max-age=31536000, immutable`
   - Date columns show `YYYY-MM-DD` format

---

## Troubleshooting

### Issue: Still seeing old dates
**Solution**:
1. Hard refresh browser (`Ctrl+Shift+R`)
2. Check Network tab - verify new bundle is loaded
3. Check Build Info page - verify git SHA matches latest commit

### Issue: Build info shows old timestamp
**Solution**:
1. Verify `inject-build-info.js` ran: `grep "__BUILD_INFO__" dist/index.html`
2. Rebuild: `npm run build`
3. Check git is available: `git rev-parse --short HEAD`

### Issue: Cache headers not working
**Solution**:
1. Check Express is serving files: `curl -I http://127.0.0.1:3001/`
2. If nginx is in front, check nginx config (see DEPLOYMENT_CACHE_FIX.md)
3. Verify backend restarted: `pm2 status orthodox-backend`

---

## Proof Commands

### Command 1: Verify index.html is not cached
```bash
curl -I http://127.0.0.1:3001/ 2>&1 | grep -i "cache-control"
# Expected: Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

### Command 2: Verify assets are cached (immutable)
```bash
curl -I http://127.0.0.1:3001/assets/index-*.js 2>&1 | head -5 | grep -i "cache-control"
# Expected: Cache-Control: public, max-age=31536000, immutable
```

### Command 3: Verify formatRecordDate exists in bundle
```bash
cd /var/www/orthodoxmetrics/prod/front-end/dist/assets
BUNDLE=$(ls index-*.js | head -1)
grep -c "formatRecordDate" "$BUNDLE"
# Expected: Number > 0 (function exists in bundle)
```

### Command 4: Verify build info JSON exists
```bash
cat /var/www/orthodoxmetrics/prod/front-end/dist/build-info.json
# Expected: Valid JSON with gitSha, buildTime, version
```

---

**Status**: Ready for deployment verification
