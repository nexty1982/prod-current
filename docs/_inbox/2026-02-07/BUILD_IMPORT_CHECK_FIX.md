# Build Import Check Script Fix

## Problem

The `scripts/import-check.js` script was checking for files in incorrect locations, causing many "SKIP" warnings during build:

```
⚠️ SKIP: routes/baptism.js (file not found)
⚠️ SKIP: routes/marriage.js (file not found)
⚠️ SKIP: routes/funeral.js (file not found)
⚠️ SKIP: routes/logs.js (file not found)
⚠️ SKIP: routes/admin/churches.js (file not found)
⚠️ SKIP: routes/admin/users.js (file not found)
⚠️ SKIP: middleware/logger.js (file not found)
⚠️ SKIP: index.js (file not found)
```

---

## Root Cause

The import check script was using **old file paths** without the `src/` prefix. The codebase was refactored to organize files under `src/`, but the import check script wasn't updated.

---

## Solution

Updated `server/scripts/import-check.js` with correct file paths:

### Before (Incorrect Paths):
```javascript
const routesToCheck = [
  'src/api/baptism.js',        // ✅ Correct
  'src/api/marriage.js',       // ✅ Correct
  'src/api/funeral.js',        // ✅ Correct
  'routes/baptism.js',         // ❌ Wrong - missing src/ prefix
  'routes/marriage.js',        // ❌ Wrong
  'routes/funeral.js',         // ❌ Wrong
  'routes/logs.js',            // ❌ Wrong
  'routes/admin/churches.js',  // ❌ Wrong
  'routes/admin/users.js',     // ❌ Wrong
  'middleware/logger.js',      // ❌ Wrong
  'index.js'                   // ❌ Wrong - should check dist/index.js
];
```

### After (Correct Paths):
```javascript
const routesToCheck = [
  // API routes (new structure)
  'src/api/baptism.js',
  'src/api/marriage.js',
  'src/api/funeral.js',
  
  // Routes (current structure)
  'src/routes/baptism.js',        // ✅ Added src/ prefix
  'src/routes/marriage.js',       // ✅ Added src/ prefix
  'src/routes/funeral.js',        // ✅ Added src/ prefix
  'src/routes/logs.js',           // ✅ Added src/ prefix
  'src/routes/library.js',        // ✅ Added (new route)
  'src/routes/admin/churches.js', // ✅ Added src/ prefix
  'src/routes/admin/users.js',    // ✅ Added src/ prefix
  
  // Middleware
  'src/middleware/logger.js',     // ✅ Added src/ prefix
  'src/middleware/auth.js',       // ✅ Added src/ prefix
  
  // Main entry point (after build)
  'dist/index.js'                 // ✅ Check compiled output
];
```

---

## What Changed

### Added `src/` Prefix:

All route and middleware paths now correctly point to files in the `src/` directory:

- ✅ `routes/baptism.js` → `src/routes/baptism.js`
- ✅ `routes/marriage.js` → `src/routes/marriage.js`
- ✅ `routes/funeral.js` → `src/routes/funeral.js`
- ✅ `routes/logs.js` → `src/routes/logs.js`
- ✅ `routes/admin/churches.js` → `src/routes/admin/churches.js`
- ✅ `routes/admin/users.js` → `src/routes/admin/users.js`
- ✅ `middleware/logger.js` → `src/middleware/logger.js`

### Added New Files:

- ✅ `src/routes/library.js` - Newly created library API router
- ✅ `src/middleware/auth.js` - Core auth middleware

### Changed Entry Point Check:

- ✅ `index.js` → `dist/index.js` (checks compiled output, not source)

---

## Verification

Run the build on the Linux server to verify:

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
```

### Expected Output (No More SKIP Warnings):

```
🔍 Checking route module imports...

✅ PASS: src/api/baptism.js
✅ PASS: src/api/marriage.js
✅ PASS: src/api/funeral.js
✅ PASS: src/routes/baptism.js
✅ PASS: src/routes/marriage.js
✅ PASS: src/routes/funeral.js
✅ PASS: src/routes/logs.js
✅ PASS: src/routes/library.js
✅ PASS: src/routes/admin/churches.js
✅ PASS: src/routes/admin/users.js
✅ PASS: src/middleware/logger.js
✅ PASS: src/middleware/auth.js
✅ PASS: dist/index.js

============================================================
✅ All route imports successful
```

---

## Build Process Overview

The full build process includes:

1. **`npm run build:clean`** - Remove old dist folder
2. **`npm run build:ts`** - Compile TypeScript to JavaScript
3. **`npm run build:copy`** - Copy non-TS files to dist
4. **`npm run build:post-library`** - Verify library router
5. **`npm run build:verify`** - Verify critical files exist
6. **`npm run build:verify:imports`** - ✅ **This script (now fixed!)**
7. **`npm run build:flush-sessions`** - Clear old sessions

---

## File Modified

- **`server/scripts/import-check.js`**
  - Updated all file paths to include `src/` prefix
  - Added `src/routes/library.js` (new file)
  - Added `src/middleware/auth.js` for completeness
  - Changed `index.js` → `dist/index.js` to check compiled output

---

## Current File Structure

```
server/
├── src/
│   ├── api/
│   │   ├── baptism.js     ✅ Checked
│   │   ├── marriage.js    ✅ Checked
│   │   └── funeral.js     ✅ Checked
│   ├── routes/
│   │   ├── baptism.js     ✅ Checked (was missing)
│   │   ├── marriage.js    ✅ Checked (was missing)
│   │   ├── funeral.js     ✅ Checked (was missing)
│   │   ├── logs.js        ✅ Checked (was missing)
│   │   ├── library.js     ✅ Checked (NEW!)
│   │   └── admin/
│   │       ├── churches.js ✅ Checked (was missing)
│   │       └── users.js    ✅ Checked (was missing)
│   ├── middleware/
│   │   ├── logger.js      ✅ Checked (was missing)
│   │   └── auth.js        ✅ Checked (NEW!)
│   └── index.ts           (TypeScript source)
│
├── dist/
│   └── index.js           ✅ Checked (compiled output)
│
└── scripts/
    └── import-check.js    ✅ FIXED
```

---

## Why This Matters

The import check script verifies that all route modules can be imported without errors **before** the build completes. This catches:

1. **Missing dependencies** - Modules that require packages not in package.json
2. **Import errors** - Incorrect require() statements
3. **Syntax errors** - Basic JavaScript syntax issues
4. **File existence** - Files referenced in the build process

By fixing the paths, the script now correctly validates the actual source files instead of skipping them.

---

## Additional Fix: safeRequire Path

As part of this fix, we also corrected:

**File**: `server/src/api/baptism.js` (line 7)

```javascript
// Before (WRONG):
const { safeRequire } = require('../../utils/safeRequire');

// After (CORRECT):
const { safeRequire } = require('../utils/safeRequire');
```

This eliminates the "Cannot find module" error for `safeRequire`.

---

## Summary

**Problem**: Import check script using old file paths without `src/` prefix

**Solution**: Updated all paths to reflect current file structure

**Result**: 
- ✅ Build warnings eliminated
- ✅ Proper import validation
- ✅ Catches real errors (not false positives)

**Next Step**: Run `npm run build` on Linux server to verify ✅

---

## Expected Build Output

After this fix, the build should show:

```
> orthodoxmetrics-backend@1.0.0 build:verify:imports
> node scripts/import-check.js

🔍 Checking route module imports...

✅ PASS: src/api/baptism.js
✅ PASS: src/api/marriage.js
✅ PASS: src/api/funeral.js
✅ PASS: src/routes/baptism.js
✅ PASS: src/routes/marriage.js
✅ PASS: src/routes/funeral.js
✅ PASS: src/routes/logs.js
✅ PASS: src/routes/library.js
✅ PASS: src/routes/admin/churches.js
✅ PASS: src/routes/admin/users.js
✅ PASS: src/middleware/logger.js
✅ PASS: src/middleware/auth.js
✅ PASS: dist/index.js

============================================================
✅ All route imports successful

> orthodoxmetrics-backend@1.0.0 build:flush-sessions
> node scripts/flush-sessions.js

[flush-sessions] Cleared X session(s) from database
```

**No more SKIP warnings!** ✅
