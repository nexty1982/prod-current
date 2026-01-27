# Backend Stability Fixes - Complete Documentation

**Session Date:** Current Working Session  
**Focus:** Critical Backend Stability Issues - Nginx 502 Errors  
**Status:** ✅ All Issues Resolved

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problems Identified](#problems-identified)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Solutions Implemented](#solutions-implemented)
5. [Files Changed](#files-changed)
6. [Code Changes Detail](#code-changes-detail)
7. [Architecture Decisions](#architecture-decisions)
8. [Verification Steps](#verification-steps)
9. [Patterns & Best Practices](#patterns--best-practices)
10. [Future Considerations](#future-considerations)

---

## Executive Summary

This session addressed **three critical backend stability issues** that were causing Nginx 502 errors across all `/api/*` routes. The backend process was crashing at startup or during execution, preventing all API endpoints from responding.

### Issues Fixed

1. ✅ **`clientApi` router module loading failure** - Missing `asyncHandler` middleware dependency
2. ✅ **`churches-compat` database helper missing** - `getChurchDbConnection` not exported from `db-compat.js`
3. ✅ **`interactiveReports` SQL column errors** - Hardcoded column names causing `ER_BAD_FIELD_ERROR`

### Impact

- **Before:** Backend crashed on startup, all `/api/*` routes returned 502
- **After:** Backend boots cleanly, all endpoints return proper HTTP responses (401/403/200)

### Acceptance Criteria Met

✅ Backend process boots and stays online under PM2  
✅ `curl` commands to localhost return HTTP responses (401/403/200), never 502  
✅ All fixes implemented in source code and survive rebuilds  
✅ No temporary "hot fixes" to `dist` files

---

## Problems Identified

### Problem 1: `clientApi` Router Module Loading Failure

**Error:**
```
❌ [Server] Failed to load client API router: Cannot find module '../middleware/errorHandler'
```

**Location:** `server/dist/routes/clientApi.js` (runtime)

**Symptoms:**
- Backend crashed during startup when loading `clientApi` router
- All `/api/churches/*` endpoints returned 502
- PM2 process entered crash loop

**Root Cause:**
- `clientApi.js` imported `asyncHandler` from `../middleware/errorHandler`
- This module path did not resolve correctly in the `dist` environment
- The `errorHandler` middleware was not available at the expected path

---

### Problem 2: `churches-compat` Database Helper Missing

**Error:**
```
TypeError: getChurchDbConnection is not a function
at dist/routes/admin/churches-compat.js:72
```

**Location:** `server/dist/routes/admin/churches-compat.js` (runtime)

**Symptoms:**
- Admin church endpoints (`/api/admin/churches/:id/tables`, `/api/admin/churches/:id/tables/:table/columns`) returned 500 errors
- Frontend could not load church database schema information
- Legacy compatibility routes failed

**Root Cause:**
- `churches-compat.js` called `getChurchDbConnection()` from `../../config/db-compat`
- `db-compat.js` did not export `getChurchDbConnection`
- The function existed in `../utils/dbSwitcher` but was not re-exported through the compatibility layer

---

### Problem 3: `interactiveReports` SQL Column Errors

**Error:**
```
ER_BAD_FIELD_ERROR: Unknown column 'name' in 'SELECT'
```

**Location:** `server/src/routes/interactiveReports.js` (runtime, during report creation)

**Symptoms:**
- Interactive report creation failed when fetching record context
- Error occurred when querying church-specific record tables (`om_church_{churchId}.baptism_records`, etc.)
- Different churches have different column schemas

**Root Cause:**
- Hardcoded `SELECT` statements assumed columns like `name`, `first_name`, `last_name` always exist
- Church databases have varying schemas (some have `name`, others have `first_name`/`last_name`, etc.)
- No schema introspection before constructing SQL queries

---

## Root Cause Analysis

### Common Patterns

All three issues shared common root causes:

1. **Module Resolution Mismatch:** Source code imports did not match `dist` runtime expectations
2. **Missing Exports:** Functions existed but were not exported through expected compatibility layers
3. **Schema Assumptions:** Code assumed fixed database schemas without runtime validation

### Build vs Runtime Environment

The backend uses a **TypeScript → JavaScript compilation** process:
- **Source:** `server/src/**/*.ts` and `server/src/**/*.js`
- **Build Output:** `server/dist/**/*.js`
- **Runtime:** Node.js executes `dist/**/*.js` using CommonJS (`require`)

**Key Insight:** Relative import paths in source must resolve correctly in `dist` after compilation/copying.

### Database Architecture

The system uses a **multi-tenant database architecture:**
- **Main Database:** `orthodoxmetrics_db` (church metadata, users, settings)
- **Church Databases:** `om_church_{churchId}` (per-church record tables)
- **Connection Pattern:** 
  - Main DB: `getAppPool()` from `config/db-compat`
  - Church DB: `getChurchDbConnection(databaseName)` from `config/db-compat`

**Key Insight:** Church databases have **varying schemas** - code must introspect columns before querying.

---

## Solutions Implemented

### Solution 1: Remove `asyncHandler` Dependency from `clientApi.js`

**Strategy:** Replace middleware-based error handling with direct `try/catch` blocks

**Rationale:**
- `asyncHandler` was causing module resolution issues
- Direct `try/catch` is more explicit and has no external dependencies
- Matches existing patterns in other route files

**Implementation:**
- Removed `const { asyncHandler } = require('../middleware/errorHandler');`
- Converted all route handlers from `asyncHandler(async (req, res) => { ... })` to `async (req, res) => { try { ... } catch (error) { ... } }`
- Added explicit error logging and JSON error responses

**Files Changed:**
- `server/src/routes/clientApi.js`

---

### Solution 2: Export `getChurchDbConnection` from `db-compat.js`

**Strategy:** Re-export the function through the compatibility layer

**Rationale:**
- `db-compat.js` is the canonical import path for database utilities in `dist`
- Other routes already use `getAppPool()` from `db-compat.js`
- Centralizing exports ensures consistency

**Implementation:**
- Added import: `const { getChurchDbConnection } = require('../utils/dbSwitcher');`
- Added to exports: `module.exports = { getAppPool, getAuthPool, pool, getChurchDbConnection };`

**Files Changed:**
- `server/config/db-compat.js`

---

### Solution 3: Dynamic Column Introspection in `interactiveReports.js`

**Strategy:** Query `information_schema.columns` before constructing `SELECT` statements

**Rationale:**
- Church databases have varying schemas
- Hardcoded column lists cause runtime errors
- Schema introspection is standard MySQL practice

**Implementation:**
1. Before querying a record table, introspect available columns:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_schema = ? AND table_name = ?
   ```

2. Build `SELECT` list dynamically from preferred fields:
   - **Name fields:** `['name', 'first_name', 'last_name']` (filtered against available columns)
   - **Date fields:** `['date_of_baptism', 'reception_date', 'mdate', 'marriage_date', 'death_date', 'burial_date', 'deceased_date']` (filtered against available columns)
   - **Fallback:** Use `id` if no preferred fields exist

3. Skip records if no usable fields found (log error, continue)

**Files Changed:**
- `server/src/routes/interactiveReports.js`

---

### Solution 4: Safe Router Loading in `index.ts`

**Strategy:** Wrap optional route loading in `try/catch` to prevent startup crashes

**Rationale:**
- Missing optional routes should not crash the entire server
- Provides graceful degradation (returns 501 for unavailable features)
- Allows server to boot even if some features are missing

**Implementation:**
- Added safe loader for `clientApiRouter` (lines 76-93)
- Added safe loader for `interactiveReportsRouter` (lines 3531-3550)
- Both return dummy routers that respond with 501 if module loading fails

**Files Changed:**
- `server/src/index.ts`

---

## Files Changed

### 1. `server/src/routes/clientApi.js`

**Changes:**
- Removed `asyncHandler` import
- Converted all route handlers to use direct `try/catch` blocks
- Added explicit error logging

**Lines Affected:** Entire file (318 lines)

**Key Pattern:**
```javascript
// Before:
router.get('/church-info', asyncHandler(async (req, res) => {
  // ...
}));

// After:
router.get('/church-info', async (req, res) => {
  try {
    // ... original logic ...
  } catch (error) {
    console.error('Error fetching church info:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### 2. `server/config/db-compat.js`

**Changes:**
- Added import: `const { getChurchDbConnection } = require('../utils/dbSwitcher');`
- Added `getChurchDbConnection` to module exports

**Lines Affected:** 2 lines added

**Before:**
```javascript
const { getAppPool, getAuthPool } = require('./db');
const pool = {
  query:   (...args) => getAppPool().query(...args),
  execute: (...args) => getAppPool().query(...args),
};
module.exports = { getAppPool, getAuthPool, pool };
```

**After:**
```javascript
const { getAppPool, getAuthPool } = require('./db');
const { getChurchDbConnection } = require('../utils/dbSwitcher'); // Added
const pool = {
  query:   (...args) => getAppPool().query(...args),
  execute: (...args) => getAppPool().query(...args),
};
module.exports = { getAppPool, getAuthPool, pool, getChurchDbConnection }; // Added
```

---

### 3. `server/src/routes/interactiveReports.js`

**Changes:**
- Added dynamic column introspection before querying record tables
- Built `SELECT` list from available columns
- Added fallback logic for missing columns

**Lines Affected:** Lines 128-202 (record context fetching logic)

**Key Pattern:**
```javascript
// Introspect available columns
let availableColumns = [];
try {
  const [columns] = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [schemaName, recordTable]
  );
  availableColumns = columns.map(c => c.column_name);
} catch (error) {
  console.error(`Failed to introspect columns:`, error);
  // Continue with empty list - will use fallback
}

// Build SELECT list from preferred fields
const preferredFields = {
  name: ['name', 'first_name', 'last_name'],
  date: ['date_of_baptism', 'reception_date', 'mdate', 'marriage_date', 'death_date', 'burial_date', 'deceased_date']
};

const selectFields = [];
const nameFields = preferredFields.name.filter(f => availableColumns.includes(f));
const dateFields = preferredFields.date.filter(f => availableColumns.includes(f));

if (nameFields.length > 0) {
  selectFields.push(...nameFields);
}
if (dateFields.length > 0) {
  selectFields.push(...dateFields);
}

// Fallback to id if no preferred fields
if (selectFields.length === 0 && availableColumns.includes('id')) {
  selectFields.push('id');
}

if (selectFields.length === 0) {
  console.error(`No usable fields found for ${schemaName}.${recordTable}`);
  continue; // Skip this record
}

// Use dynamic SELECT list
const [recordResult] = await db.query(
  `SELECT ${selectFields.join(', ')}
   FROM \`${schemaName}\`.\`${recordTable}\`
   WHERE id = ?`,
  [recordId]
);
```

---

### 4. `server/src/index.ts`

**Changes:**
- Added safe loader for `clientApiRouter` (lines 76-93)
- Added safe loader for `interactiveReportsRouter` (lines 3531-3550)

**Key Pattern:**
```typescript
// Safe loader for clientApiRouter
let clientApiRouter;
try {
  clientApiRouter = require('./routes/clientApi');
  console.log('✅ [Server] Client API router loaded successfully');
} catch (error) {
  console.error('❌ [Server] Failed to load client API router:', error.message);
  console.error('   This is non-fatal - server will continue without client API routes');
  // Create a dummy router that returns 501 (Not Implemented)
  const express = require('express');
  clientApiRouter = express.Router();
  clientApiRouter.use((req, res) => {
    res.status(501).json({ 
      error: 'Client API feature not available',
      message: 'Router module not found. Check build process.'
    });
  });
}
```

---

### 5. `server/src/routes/admin/churches-compat.js`

**Status:** Already correctly implemented (uses `getChurchDbConnection` from `db-compat.js`)

**Note:** This file was already correct; the fix was ensuring `db-compat.js` exports the function.

---

## Code Changes Detail

### Pattern 1: Direct Error Handling (Replacing `asyncHandler`)

**Location:** `server/src/routes/clientApi.js`

**Example Route Handler:**
```javascript
// GET /api/churches/church-info
router.get('/church-info', async (req, res) => {
    try {
        const churchId = req.session?.user?.church_id;
        if(!churchId) {
            return res.status(400).json({ error: 'Church ID not found in session' });
        }

        const [rows] = await getAppPool().query(`
            SELECT 
                id, church_name AS name, email, phone, address, city, state_province, postal_code, 
                country, website, preferred_language, timezone, currency, tax_id, 
                description_multilang, settings, is_active, database_name, created_at, updated_at
            FROM churches WHERE id = ?`, [churchId]);

        const churchInfo = rows[0] || {};

        if (req.client && req.client.branding_config) {
            const branding = JSON.parse(req.client.branding_config);
            churchInfo.branding = branding;
        }

        res.json(churchInfo);
    } catch (error) {
        console.error('Error fetching church info:', error);
        res.status(500).json({ error: error.message });
    }
});
```

**Benefits:**
- No external dependencies
- Explicit error handling
- Consistent error response format
- Works in both `src` and `dist` environments

---

### Pattern 2: Database Compatibility Layer

**Location:** `server/config/db-compat.js`

**Complete File:**
```javascript
const { getAppPool, getAuthPool } = require('./db');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const pool = {
  query:   (...args) => getAppPool().query(...args),
  execute: (...args) => getAppPool().query(...args),
};
module.exports = { getAppPool, getAuthPool, pool, getChurchDbConnection };
```

**Usage in Routes:**
```javascript
const { getAppPool, getChurchDbConnection } = require('../../config/db-compat');

// Main database
const db = getAppPool();

// Church-specific database
const churchDb = await getChurchDbConnection(`om_church_${churchId}`);
```

**Benefits:**
- Single import path for all database utilities
- Consistent API across routes
- Centralized connection management

---

### Pattern 3: Dynamic SQL Column Selection

**Location:** `server/src/routes/interactiveReports.js`

**Complete Implementation:**
```javascript
// Helper to introspect and build safe SELECT list
async function buildSafeSelectList(db, schemaName, recordTable, preferredFields) {
  // Introspect available columns
  let availableColumns = [];
  try {
    const [columns] = await db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?`,
      [schemaName, recordTable]
    );
    availableColumns = columns.map(c => c.column_name);
  } catch (error) {
    console.error(`Failed to introspect columns for ${schemaName}.${recordTable}:`, error);
    return []; // Return empty list on error
  }

  // Build SELECT list from preferred fields
  const selectFields = [];
  
  // Add name fields (if available)
  const nameFields = preferredFields.name.filter(f => availableColumns.includes(f));
  if (nameFields.length > 0) {
    selectFields.push(...nameFields);
  }
  
  // Add date fields (if available)
  const dateFields = preferredFields.date.filter(f => availableColumns.includes(f));
  if (dateFields.length > 0) {
    selectFields.push(...dateFields);
  }

  // Fallback to id if no preferred fields exist
  if (selectFields.length === 0 && availableColumns.includes('id')) {
    selectFields.push('id');
  }

  return selectFields;
}

// Usage in route handler
const recordTable = `${recordType}_records`;
const schemaName = `om_church_${churchId}`;

const preferredFields = {
  name: ['name', 'first_name', 'last_name'],
  date: ['date_of_baptism', 'reception_date', 'mdate', 'marriage_date', 'death_date', 'burial_date', 'deceased_date']
};

const selectFields = await buildSafeSelectList(db, schemaName, recordTable, preferredFields);

if (selectFields.length === 0) {
  console.error(`No usable fields found for ${schemaName}.${recordTable}`);
  continue; // Skip this record
}

// Use dynamic SELECT list
const [recordResult] = await db.query(
  `SELECT ${selectFields.join(', ')}
   FROM \`${schemaName}\`.\`${recordTable}\`
   WHERE id = ?`,
  [recordId]
);

// Build context from available fields
const record = recordResult[0] || {};
let name = 'Unknown';
if (record.name) {
  name = record.name;
} else if (record.first_name || record.last_name) {
  name = `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown';
}

let date = null;
for (const dateField of preferredFields.date) {
  if (record[dateField]) {
    date = record[dateField];
    break;
  }
}
```

**Benefits:**
- Works with any church database schema
- Prevents `ER_BAD_FIELD_ERROR` at runtime
- Graceful degradation (skips records with no usable fields)
- Maintainable (preferred fields list can be extended)

---

### Pattern 4: Safe Module Loading

**Location:** `server/src/index.ts`

**Implementation:**
```typescript
// Safe loader for optional routes
let clientApiRouter;
try {
  clientApiRouter = require('./routes/clientApi');
  console.log('✅ [Server] Client API router loaded successfully');
} catch (error) {
  console.error('❌ [Server] Failed to load client API router:', error.message);
  console.error('   This is non-fatal - server will continue without client API routes');
  // Create a dummy router that returns 501 (Not Implemented)
  const express = require('express');
  clientApiRouter = express.Router();
  clientApiRouter.use((req, res) => {
    res.status(501).json({ 
      error: 'Client API feature not available',
      message: 'Router module not found. Check build process.'
    });
  });
}

// Later in the file:
app.use('/client/:clientSlug/api', clientContext, clientApiRouter, clientContextCleanup);
```

**Benefits:**
- Server boots even if optional routes are missing
- Clear error messages (501 with explanation)
- No silent failures (logs error to console)
- Allows graceful degradation

---

## Architecture Decisions

### 1. Database Connection Pattern

**Decision:** Centralize database utilities in `db-compat.js`

**Rationale:**
- Single source of truth for database imports
- Consistent API across all routes
- Easier to maintain and refactor
- Works in both `src` and `dist` environments

**Implementation:**
- `getAppPool()` - Main database connection
- `getAuthPool()` - Authentication database connection
- `getChurchDbConnection(databaseName)` - Church-specific database connection
- `pool` - Legacy compatibility object

---

### 2. Error Handling Strategy

**Decision:** Use direct `try/catch` blocks instead of `asyncHandler` middleware

**Rationale:**
- No external dependencies
- Explicit error handling per route
- Consistent error response format
- Works in both `src` and `dist` environments

**Pattern:**
```javascript
router.get('/endpoint', async (req, res) => {
  try {
    // Route logic
    res.json(data);
  } catch (error) {
    console.error('Error description:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### 3. Schema Introspection Pattern

**Decision:** Query `information_schema.columns` before constructing dynamic SQL

**Rationale:**
- Church databases have varying schemas
- Prevents runtime SQL errors
- Standard MySQL practice
- Maintainable (preferred fields list can be extended)

**Pattern:**
1. Introspect available columns
2. Filter preferred fields against available columns
3. Build `SELECT` list dynamically
4. Fallback to `id` if no preferred fields exist
5. Skip record if no usable fields found

---

### 4. Safe Module Loading Pattern

**Decision:** Wrap optional route loading in `try/catch` with graceful degradation

**Rationale:**
- Missing optional routes should not crash the server
- Provides clear error messages (501)
- Allows server to boot with limited functionality
- Easier to debug (logs errors to console)

**Pattern:**
```typescript
let optionalRouter;
try {
  optionalRouter = require('./routes/optional');
  console.log('✅ Router loaded successfully');
} catch (error) {
  console.error('❌ Failed to load router:', error.message);
  // Create dummy router that returns 501
  const express = require('express');
  optionalRouter = express.Router();
  optionalRouter.use((req, res) => {
    res.status(501).json({ 
      error: 'Feature not available',
      message: 'Router module not found.'
    });
  });
}
```

---

## Verification Steps

### 1. Build Verification

**Command:**
```bash
cd server
npm run build
```

**Expected Output:**
- No compilation errors
- `dist/routes/clientApi.js` exists
- `dist/routes/interactiveReports.js` exists
- `dist/config/db-compat.js` exists

**Check:**
```bash
ls -la server/dist/routes/clientApi.js
ls -la server/dist/routes/interactiveReports.js
ls -la server/dist/config/db-compat.js
```

---

### 2. Syntax Verification

**Command:**
```bash
node -c server/dist/routes/clientApi.js
node -c server/dist/routes/interactiveReports.js
node -c server/dist/config/db-compat.js
```

**Expected Output:**
- No syntax errors
- All files parse successfully

---

### 3. Module Loading Verification

**Command:**
```bash
node -e "require('./server/dist/routes/clientApi.js')"
node -e "require('./server/dist/routes/interactiveReports.js')"
node -e "require('./server/dist/config/db-compat.js')"
```

**Expected Output:**
- No `MODULE_NOT_FOUND` errors
- All modules load successfully

---

### 4. PM2 Status Verification

**Command:**
```bash
pm2 status orthodox-backend
```

**Expected Output:**
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┬─────────┐
│ id  │ name                 │ mode    │ status  │ uptime   │ memory  │
├─────┼──────────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 0   │ orthodox-backend     │ cluster │ online  │ 5m       │ 45.2 MB │
└─────┴──────────────────────┴─────────┴─────────┴──────────┴─────────┘
```

**Status must be:** `online` (not `errored` or `stopped`)

---

### 5. Endpoint Verification

**Commands:**
```bash
# Client API endpoint
curl -i http://127.0.0.1:3001/api/churches/church-info

# Admin churches endpoint
curl -i http://127.0.0.1:3001/api/admin/churches/46/tables

# Interactive reports endpoint
curl -i http://127.0.0.1:3001/api/records/interactive-reports
```

**Expected Output:**
- Status code: `401` (Unauthorized) or `403` (Forbidden) or `200` (OK)
- **Never:** `502` (Bad Gateway) or connection errors
- Response body: JSON (even for errors)

**Example Successful Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Unauthorized"}
```

---

### 6. Production Verification

**Commands:**
```bash
# Through Nginx (public URL)
curl -i https://orthodoxmetrics.com/api/churches/church-info
curl -i https://orthodoxmetrics.com/api/admin/churches/46/tables
curl -i https://orthodoxmetrics.com/api/records/interactive-reports
```

**Expected Output:**
- Status code: `401`/`403`/`200` (never `502`)
- JSON response body

---

## Patterns & Best Practices

### 1. Database Import Pattern

**Always use:**
```javascript
const { getAppPool, getChurchDbConnection } = require('../../config/db-compat');
```

**Never use:**
```javascript
const { DatabaseManager } = require('../database'); // ❌ Wrong
const pool = require('../db'); // ❌ Inconsistent
```

---

### 2. Error Handling Pattern

**Always use:**
```javascript
router.get('/endpoint', async (req, res) => {
  try {
    // Route logic
    res.json(data);
  } catch (error) {
    console.error('Error description:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Never use:**
```javascript
router.get('/endpoint', asyncHandler(async (req, res) => { // ❌ External dependency
  // Route logic
}));
```

---

### 3. Dynamic SQL Pattern

**Always use:**
```javascript
// Introspect columns first
const [columns] = await db.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = ? AND table_name = ?`,
  [schemaName, tableName]
);

// Build SELECT list dynamically
const availableColumns = columns.map(c => c.column_name);
const selectFields = preferredFields.filter(f => availableColumns.includes(f));

// Use dynamic SELECT
const [rows] = await db.query(
  `SELECT ${selectFields.join(', ')} FROM \`${schemaName}\`.\`${tableName}\``
);
```

**Never use:**
```javascript
// ❌ Hardcoded columns
const [rows] = await db.query(
  `SELECT name, date FROM \`${schemaName}\`.\`${tableName}\``
);
```

---

### 4. Safe Module Loading Pattern

**Always use:**
```typescript
let optionalRouter;
try {
  optionalRouter = require('./routes/optional');
  console.log('✅ Router loaded');
} catch (error) {
  console.error('❌ Failed to load router:', error.message);
  // Create dummy router
  const express = require('express');
  optionalRouter = express.Router();
  optionalRouter.use((req, res) => {
    res.status(501).json({ error: 'Feature not available' });
  });
}
```

**Never use:**
```typescript
// ❌ Crashes server if module missing
const optionalRouter = require('./routes/optional');
```

---

### 5. Church Database Access Pattern

**Always use:**
```javascript
const { getChurchDbConnection } = require('../../config/db-compat');

// Get church database name
const [churches] = await getAppPool().query(
  'SELECT database_name FROM churches WHERE id = ?',
  [churchId]
);

const databaseName = churches[0].database_name || `om_church_${churchId}`;
const churchDb = await getChurchDbConnection(databaseName);

// Use church database
const [rows] = await churchDb.query('SELECT * FROM baptism_records');
```

**Never use:**
```javascript
// ❌ Direct connection without helper
const churchDb = await mysql.createConnection({
  host: '...',
  database: `om_church_${churchId}`
});
```

---

## Future Considerations

### 1. Build Process Improvements

**Recommendation:** Add build verification script

**Implementation:**
```javascript
// server/scripts/verify-build.js
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'dist/routes/clientApi.js',
  'dist/routes/interactiveReports.js',
  'dist/config/db-compat.js',
];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
});

console.log('✅ All required files present');
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "build:verify": "node scripts/verify-build.js"
  }
}
```

---

### 2. Database Schema Validation

**Recommendation:** Add schema validation utility

**Implementation:**
```javascript
// server/utils/schemaValidator.js
async function validateTableSchema(db, schemaName, tableName, requiredColumns) {
  const [columns] = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [schemaName, tableName]
  );
  
  const availableColumns = columns.map(c => c.column_name);
  const missingColumns = requiredColumns.filter(c => !availableColumns.includes(c));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  return availableColumns;
}
```

---

### 3. Error Response Standardization

**Recommendation:** Use `ApiResponse` utility consistently

**Implementation:**
```javascript
// server/utils/apiResponse.js
function ApiResponse(success, data = null, error = null) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString()
  };
}

// Usage
res.json(ApiResponse(true, { records }));
res.status(400).json(ApiResponse(false, null, { message: 'Invalid input' }));
```

---

### 4. Route Testing

**Recommendation:** Add integration tests for critical routes

**Implementation:**
```javascript
// server/tests/routes/clientApi.test.js
const request = require('supertest');
const app = require('../src/index');

describe('Client API Routes', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .get('/api/churches/church-info');
    expect(res.status).toBe(401);
  });
});
```

---

### 5. Monitoring & Alerting

**Recommendation:** Add health check endpoint

**Implementation:**
```javascript
// server/src/routes/health.js
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await getAppPool().query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Summary

This session successfully resolved **three critical backend stability issues** that were causing Nginx 502 errors. All fixes were implemented in **source code** and are designed to **survive rebuilds** and **deployments**.

### Key Achievements

✅ Backend boots cleanly and stays online under PM2  
✅ All API endpoints return proper HTTP responses (401/403/200)  
✅ No more 502 errors from Nginx  
✅ Schema-tolerant SQL queries (works with varying church database schemas)  
✅ Graceful degradation (server boots even if optional routes are missing)  
✅ Consistent error handling patterns  
✅ Centralized database connection management  

### Files Changed

1. `server/src/routes/clientApi.js` - Removed `asyncHandler` dependency, added direct error handling
2. `server/config/db-compat.js` - Added `getChurchDbConnection` export
3. `server/src/routes/interactiveReports.js` - Added dynamic column introspection
4. `server/src/index.ts` - Added safe router loading

### Patterns Established

- **Database imports:** Always use `db-compat.js`
- **Error handling:** Direct `try/catch` blocks (no middleware dependencies)
- **Dynamic SQL:** Introspect columns before querying
- **Safe module loading:** Wrap optional routes in `try/catch`
- **Church database access:** Use `getChurchDbConnection()` helper

### Next Steps

1. Run build verification script after each build
2. Add integration tests for critical routes
3. Implement health check endpoint
4. Standardize error responses with `ApiResponse` utility
5. Add schema validation utilities

---

**Documentation Version:** 1.0  
**Last Updated:** Current Session  
**Status:** ✅ Complete
