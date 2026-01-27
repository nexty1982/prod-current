# Backend Crash Loop Fix - Summary

**Date**: January 23, 2026  
**Issue**: Backend server crash-looping (196+ restarts) due to canvas native module compatibility errors

## Root Cause

The backend was crashing because multiple certificate-related modules were trying to load the `canvas` native module, which was compiled for Node.js version with `NODE_MODULE_VERSION 127`, but the server is running Node.js version requiring `NODE_MODULE_VERSION 115`.

**Affected Modules**:
1. `server/dist/api/baptismCertificates.js` - requires canvas
2. `server/dist/api/marriageCertificates.js` - requires canvas  
3. `server/dist/api/funeralCertificates.js` - requires canvas
4. `server/dist/api/churchCertificates.js` - requires canvas

**Error Pattern**:
```
Error: The module '/var/www/orthodoxmetrics/prod/server/node_modules/canvas/build/Release/canvas.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires
NODE_MODULE_VERSION 115.
```

## Solution Applied

### 1. Fixed Module Resolution (Original Issue)

**Problem**: Bridge routes (`server/routes/*Certificates.js`) were trying to load modules from `../src/api/` in dist environment where that path doesn't exist.

**Fix**: Created `server/routes/_moduleLoader.js` helper that detects dist vs source environment and uses correct paths. Updated certificate route files to use stub routers that don't load native modules until canvas is rebuilt.

### 2. Stubbed Certificate Routes

**Files Modified**:
- `server/routes/baptismCertificates.js` - Returns stub router with 503 response
- `server/routes/marriageCertificates.js` - Returns stub router with 503 response
- `server/routes/funeralCertificates.js` - Returns stub router with 503 response
- `server/routes/certificates.js` - Returns stub router with 503 response

**Files Modified (Source)**:
- `server/src/index.ts` - Added try/catch around `churchCertificatesRouter` require

### 3. Error Handling in Main Server

Added try/catch blocks in `server/src/index.ts` for all certificate router requires to gracefully handle native module errors and create stub routers.

## Current State

✅ **Server is stable** - No more crash loops  
✅ **Certificate routes return 503** - Clear error message with fix instructions  
⚠️ **Certificate functionality disabled** - Until canvas module is rebuilt

## Next Steps (To Restore Certificate Functionality)

1. **Rebuild canvas native module**:
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   npm rebuild canvas
   ```

2. **Restore certificate routes** - After canvas rebuild succeeds:
   - Update `server/routes/baptismCertificates.js` to load actual module
   - Update `server/routes/marriageCertificates.js` to load actual module
   - Update `server/routes/funeralCertificates.js` to load actual module
   - Update `server/routes/certificates.js` to load actual module
   - Remove try/catch stubs from `server/src/index.ts` for `churchCertificatesRouter`

3. **Rebuild and restart**:
   ```bash
   npm run build
   pm2 restart orthodox-backend
   ```

## Verification

**Server Status**:
```bash
pm2 status orthodox-backend
# Should show: status: online, ↺: stable (no rapid restarts)
```

**Health Check**:
```bash
curl -I http://localhost:5174/api/health
# Should return: HTTP/1.1 200 OK
```

**Certificate Routes** (should return 503 with helpful message):
```bash
curl http://localhost:5174/api/baptismCertificates
# Should return JSON with error message and fix instructions
```

## Files Changed

### Source Files
- `server/routes/baptismCertificates.js`
- `server/routes/marriageCertificates.js`
- `server/routes/funeralCertificates.js`
- `server/routes/certificates.js`
- `server/routes/_moduleLoader.js` (new helper)
- `server/src/index.ts`

### Documentation
- `docs/dev/current-setup/2026-01-23_backend-crash-investigation.md`
- `docs/dev/current-setup/2026-01-23_backend-crash-fix-summary.md` (this file)
