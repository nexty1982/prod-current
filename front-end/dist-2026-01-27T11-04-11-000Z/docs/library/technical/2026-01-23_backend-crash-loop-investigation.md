# Backend Crash Loop Investigation

**Date**: January 23, 2026  
**Issue**: Backend server crash-looping (46+ restarts) due to MODULE_NOT_FOUND errors

## Step 0: Current Setup Documentation

### Crash Error

**Error**: `Cannot find module '../src/api/baptismCertificates'`

**Stack Trace**:
```
Error: Cannot find module '../src/api/baptismCertificates'
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    '/var/www/orthodoxmetrics/prod/server/dist/routes/baptismCertificates.js',
    '/var/www/orthodoxmetrics/prod/server/dist/index.js'
  ]
```

**Frequency**: Repeating every few seconds (crash loop)

### Module Resolution Pattern

**Bridge Route Pattern**: `server/routes/baptismCertificates.js` uses a try/catch pattern:
```javascript
try {
    certificatesModule = require('../api/baptismCertificates');
} catch (e) {
    certificatesModule = require('../src/api/baptismCertificates');
}
```

**Expected Behavior**:
- From `server/dist/routes/baptismCertificates.js`:
  - First try: `../api/baptismCertificates` → `server/dist/api/baptismCertificates.js` ✅ (exists)
  - Fallback: `../src/api/baptismCertificates` → `server/dist/src/api/baptismCertificates.js` ❌ (doesn't exist)

### File Structure

**Source Files**:
- `server/src/api/baptismCertificates.js` ✅ EXISTS
- `server/routes/baptismCertificates.js` ✅ EXISTS (bridge route)

**Dist Files** (compiled):
- `server/dist/api/baptismCertificates.js` ✅ EXISTS
- `server/dist/routes/baptismCertificates.js` ✅ EXISTS (bridge route)
- `server/dist/src/api/baptismCertificates.js` ❌ DOES NOT EXIST

### Build Process

**Entry Point**: `server/src/index.ts` (TypeScript) → compiled to `server/dist/index.js`

**Build Output Structure**:
- `server/dist/` - Compiled output
- `server/dist/api/` - Compiled API modules
- `server/dist/routes/` - Compiled route bridges
- `server/dist/src/` - ❌ NOT PRESENT (src files are compiled, not copied)

**Issue**: The bridge route tries `../src/api/baptismCertificates` as fallback, but in dist structure, there is no `src/` directory - files are compiled directly to `dist/api/`.

### Root Cause

The bridge route's fallback path `../src/api/baptismCertificates` is incorrect for the dist structure. When running from `dist/routes/`, it should only try `../api/baptismCertificates` (which exists), not fall back to a non-existent `../src/api/` path.

## Files Requiring Fix

1. `server/routes/baptismCertificates.js` - Incorrect fallback path
2. Other bridge routes may have the same issue (need to check)

## Solution

Update bridge routes to:
1. Try `../api/` first (production/dist)
2. Fallback to `../src/api/` only if running from source (not dist)
3. Or: Check if we're in dist and only try the dist path
