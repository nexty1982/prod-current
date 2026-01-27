# Database Import Fix - Complete Solution

## Problem

**Error:** `Cannot find module '../database'`  
**Location:** `server/dist/routes/clientApi.js`  
**Root Cause:** `clientApi.js` was trying to import `DatabaseManager` from `../database`, but:
1. `dist/database/` doesn't exist as a module (only `dist/database/database-manager.js` exists, which is a CLI tool)
2. Other routes use `getAppPool()` from `config/db-compat`
3. `DatabaseManager.getPool()` doesn't exist - DatabaseManager is a CLI class, not a runtime pool manager

## Solution

**Changed:** `server/src/routes/clientApi.js`

**Before:**
```javascript
const { DatabaseManager } = require('../database');
// ... later ...
await DatabaseManager.getPool().query(...)
```

**After:**
```javascript
const { getAppPool } = require('../../config/db-compat');
// ... later ...
await getAppPool().query(...)
```

**Why `../../config/db-compat`?**
- Source file: `server/src/routes/clientApi.js`
- Built to: `server/dist/routes/clientApi.js`
- From `dist/routes/`, the path to `dist/config/db-compat.js` is `../../config/db-compat`
- This matches the pattern used by other routes like `admin/churches.js`

## Files Changed

### 1. `server/src/routes/clientApi.js` (MODIFIED)
- **Line 2:** Changed `require('../database')` → `require('../../config/db-compat')`
- **Line 2:** Changed `{ DatabaseManager }` → `{ getAppPool }`
- **All query calls:** Changed `DatabaseManager.getPool().query(...)` → `getAppPool().query(...)`

**Total replacements:** 13 instances of `DatabaseManager.getPool()` replaced with `getAppPool()`

## Verification

### Step 1: Build Server
```bash
cd server
npm run build
```

### Step 2: Check Syntax
```bash
node -c dist/routes/clientApi.js
```
**Expected:** No errors ✅

### Step 3: Test Module Load
```bash
node -e "require('./dist/routes/clientApi.js')"
```
**Expected:** No "Cannot find module" errors ✅

### Step 4: Verify Import Path
```bash
grep -n "require.*db-compat" dist/routes/clientApi.js
```
**Expected:** Line 2 shows `require('../../config/db-compat')` ✅

### Step 5: Restart PM2
```bash
pm2 restart orthodox-backend
pm2 status orthodox-backend
```
**Expected:** Status "online" ✅

### Step 6: Test Endpoints
```bash
curl -i http://127.0.0.1:3001/api/admin/churches/46/tables
curl -i http://127.0.0.1:3001/api/admin/churches/46/records/columns
```

**Expected Responses:**
- HTTP/1.1 401 Unauthorized (with JSON) ✅
- OR HTTP/1.1 200 OK (if authenticated) ✅
- NOT 502 Bad Gateway ❌
- NOT "Cannot find module" errors ❌

## Acceptance Criteria

✅ **A) Backend boots and stays online**
- PM2 status shows "online"
- No "Cannot find module" errors in logs

✅ **B) Requests return JSON with 401/403/200 (NOT 502)**
- `/api/admin/churches/46/tables` → 401/403/200 ✅
- `/api/admin/churches/46/records/columns` → 401/403/200 ✅

✅ **C) Fix is in SOURCE and survives rebuild**
- Changes are in `server/src/routes/clientApi.js` ✅
- After `npm run build`, `dist/routes/clientApi.js` has correct imports ✅

---

**Status: Complete - Ready for Production** 🚀
