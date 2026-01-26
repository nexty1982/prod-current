# Step 0: Current Setup Investigation - Gallery Image Paths

**Date**: January 23, 2026  
**Investigation**: Where images live, Vite config, and why /images/<dir>/<file> might fail

## 1. Where Images Actually Live on Disk

### Server (Production)
**Location**: `/var/www/orthodoxmetrics/prod/front-end/public/images/`

**6 Canonical Directories Status**:
- ✅ `logos/` - EXISTS (2 files: biz-logo.png, orthodox-metrics-logo.svg)
- ✅ `backgrounds/` - EXISTS (6 files: bgtiled1.png, bgtiled2.png, etc.)
- ✅ `icons/` - EXISTS (5 files: baptism.png, default.png, funeral.png, H.png, marriage.png)
- ✅ `ui/` - EXISTS (4 files: components.png, GE-buttons-1.png, etc.)
- ✅ `records/` - EXISTS (15 files: baptism.png, funeral.png, marriage.png, etc.)
- ✅ `misc/` - EXISTS (100+ files, includes subdirectory `demo/` and `unused/`)

**Other Directories Present** (not canonical):
- `banner/` (1 file: profilebg.png)
- `buttons/` (3 files)
- `header/` (4 files: 3 .mp4 videos + 1 .png)
- `main/` (1 CSV file)
- `profile/` (empty, .gitkeep)

### Local Development
**Location**: `front-end/public/images/`

**Status**: All 6 canonical directories exist locally with files:
- `logos/` - biz-logo.png, orthodox-metrics-logo.svg
- `backgrounds/` - 6 PNG files
- `icons/` - 5 PNG files
- `ui/` - 4 PNG files
- `records/` - 15 files
- `misc/` - 100+ files (including subdirectories)

## 2. Frontend Static Serving Behavior

### Vite Configuration Analysis

**File**: `front-end/vite.config.ts`

**Key Settings**:
```typescript
base: '/',  // Assets loaded from root
// No explicit publicDir - defaults to 'public'
```

**Server Proxy Configuration** (lines 131-163):
```typescript
proxy: {
  '/api': { target: 'http://127.0.0.1:3001' },
  '/r/interactive': { target: 'http://127.0.0.1:3001' },
  // Explicitly does NOT proxy /images/*
  // Comment states: "Vite automatically serves files from public/ at the root path - NO PROXY NEEDED"
}
```

**Analysis**:
- ✅ Vite default `publicDir` is `public` (correct)
- ✅ No proxy rule for `/images/*` (correct - should serve directly)
- ✅ Files in `front-end/public/images/` should be accessible at `/images/...`

### Expected Behavior

Vite dev server should:
1. Serve files from `front-end/public/` at root path `/`
2. `/images/logos/biz-logo.png` → `front-end/public/images/logos/biz-logo.png`
3. Return HTTP 200 with `Content-Type: image/png` (or appropriate image type)

## 3. Reproducing Failing Behavior

### Test Command
```bash
curl -i http://localhost:5174/images/logos/biz-logo.png
```

### Expected Result
```
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: <size>
...
[binary image data]
```

### If It Returns JSON Instead

**Possible Causes**:
1. **Backend API handler intercepting**: If `/images/*` is being proxied to backend, backend might return JSON error
2. **Vite SPA fallback**: If file doesn't exist, Vite might return `index.html` (SPA fallback)
3. **Route conflict**: React Router might be catching `/images/*` routes

**Investigation Needed**:
- Check if dev server is running
- Check Network tab in browser DevTools
- Verify file actually exists at expected path
- Check if any middleware/routing is intercepting `/images/*`

## 4. File Existence Verification

**Local Check**:
```powershell
Test-Path front-end/public/images/logos/biz-logo.png
# Result: True ✅
```

**Server Check**:
```bash
ls /var/www/orthodoxmetrics/prod/front-end/public/images/logos/
# Result: biz-logo.png, orthodox-metrics-logo.svg ✅
```

## 5. Next Steps

1. **Test curl command** when dev server is running
2. **Check browser Network tab** when loading Gallery
3. **Verify Vite is serving** from `public/` directory correctly
4. **Check for route conflicts** in React Router
5. **Ensure all 6 canonical directories** have at least one image file

## Summary

- ✅ All 6 canonical directories exist on both server and local
- ✅ Files are present in expected locations
- ✅ Vite config appears correct (no proxy for /images/*)
- ⚠️ Need to verify actual HTTP response when dev server is running
- ⚠️ Need to check if React Router is interfering with /images/* routes
