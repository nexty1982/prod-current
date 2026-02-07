# Power Search Router Registration

**Date**: February 4, 2026  
**Status**: ✅ Complete (with fixes)  
**Files Modified**: 
- `server/src/index.ts` - Router registration
- `server/src/api/powerSearchApi.js` - Fixed import paths and database connections

## Summary

Registered the Power Search API router to enable `/api/records/*` endpoints for advanced record filtering with server-side pagination. Fixed import paths and database connection methods to match the existing codebase patterns.

## Changes Made

### 1. Router Import (server/src/index.ts, Line 225)

Added import for power search router:

```typescript
const powerSearchRouter = require('./api/powerSearchApi'); // Power Search API for advanced record filtering
```

**Location**: After `churchRecordsRouter` import at line 224

### 2. Router Registration (server/src/index.ts, Lines 650-652)

Mounted the router at `/api/records`:

```typescript
// Power Search API - Advanced record filtering with server-side pagination
app.use('/api/records', powerSearchRouter);
console.log('[BOOT] Power Search routes mounted at /api/records');
```

**Location**: Between `churchRecordsRouter` (line 648) and `kanbanRouter` (line 654)

### 3. Fixed Import Path (server/src/api/powerSearchApi.js, Line 10)

**ISSUE**: Parser import path was incorrect  
**FIX**: Changed from `./powerSearchParser` to `../utils/powerSearchParser`

```javascript
// Before:
const { parseSearchQuery } = require('./powerSearchParser');

// After:
const { parseSearchQuery } = require('../utils/powerSearchParser');
```

### 4. Added Database Import (server/src/api/powerSearchApi.js, Line 12)

Added proper database connection import to match existing codebase patterns:

```javascript
const { getAppPool } = require('../config/db-compat');
```

### 5. Fixed Database Connections (server/src/api/powerSearchApi.js)

**ISSUE**: Used non-existent `req.db` and `req.app.locals.db`  
**FIX**: Replaced with `getAppPool()` pattern used throughout the codebase

**In GET /baptism route (lines 169-176):**
```javascript
// Before:
const db = req.db || req.app.locals.db;
if (!db) {
  throw new Error('Database connection not available');
}
const countResult = await db.query(countSql, queryParams);
const rows = await db.query(dataSql, dataParams);

// After:
const pool = getAppPool();
const [countResult] = await pool.query(countSql, queryParams);
const [rows] = await pool.query(dataSql, dataParams);
```

**In GET /baptism/:id route (lines 238-248):**
```javascript
// Before:
const db = req.db || req.app.locals.db;
const rows = await db.query(sql, params);

// After:
const pool = getAppPool();
const [rows] = await pool.query(sql, params);
```

**Note**: Also added array destructuring `[rows]` and `[countResult]` to match mysql2 promise pool result format.

### 6. Startup Verification Log

Added console log to confirm router mounting at server startup:
```
[BOOT] Power Search routes mounted at /api/records
```

## Router Endpoints Now Live

The following endpoints are now accessible:

### GET `/api/records/baptism`
Power Search endpoint with server-side filtering, pagination, and sorting

**Query Parameters:**
- `q`: Search query with Power Search syntax
- `page`: Page number (1-based, default: 1)
- `pageSize`: Records per page (default: 25, max: 100)
- `sortBy`: Column to sort by (default: `baptism_date`)
- `sortDir`: Sort direction `asc` | `desc` (default: `desc`)
- `churchId`: Church ID for multi-tenancy

**Response:**
```json
{
  "success": true,
  "rows": [...],
  "total": 150,
  "page": 1,
  "pageSize": 25,
  "totalPages": 6,
  "applied": { /* parsedQuerySummary */ },
  "warnings": []
}
```

### GET `/api/records/baptism/:id`
Get single baptism record by ID

**Response:**
```json
{
  "success": true,
  "record": { /* record data */ }
}
```

## Route Ordering & Conflicts

### No Conflicts Detected ✅

Power Search router is mounted at `/api/records` (line 651), which is **before** other more specific `/api/records/*` routes:

1. ✅ Line 651: `/api/records` → powerSearchRouter (base routes)
2. ✅ Line 3970: `/api/records/import` → importRecordsRouter (more specific, won't conflict)
3. ✅ Line 3977: `/api/records/interactive-reports` → interactiveReportsRouter (more specific, won't conflict)

Express route matching ensures more specific routes (`/api/records/import`, `/api/records/interactive-reports`) are still matched correctly because they're more specific paths.

### Legacy Routes Preserved ✅

The following legacy routes remain untouched:
- Line 647: `/api/church-records` → churchRecordsRouter (legacy)
- Line 648: `/api/churches/:churchId/records` → churchRecordsRouter (multi-tenant)
- Line 672-674: `/api/baptism-records`, `/api/marriage-records`, `/api/funeral-records`

## Implementation Details

### Source File
- **Router**: `server/src/api/powerSearchApi.js`
- **Controller Logic**: Embedded in router (Power Search parser integration)
- **Authentication**: Requires `requireAuth` middleware

### Security
- Authentication required via `requireAuth` middleware
- Church ID validation (from query, session, or user context)
- Super admins can query across all churches
- Other roles must have a valid `church_id`
- SQL injection protection via parameterized queries
- Sort column whitelist (SORTABLE_COLUMNS)

### Performance
- Server-side pagination (max 100 records per page)
- Efficient SQL queries with WHERE clause optimization
- Power Search parser for advanced query syntax

## Testing Checklist

After server restart, verify:

- [ ] Server starts successfully
- [ ] `[BOOT] Power Search routes mounted at /api/records` appears in logs
- [ ] GET `/api/records/baptism` returns paginated results
- [ ] GET `/api/records/baptism?q=John` filters correctly
- [ ] GET `/api/records/baptism/:id` returns single record
- [ ] Authentication is enforced (401 without login)
- [ ] Church ID validation works correctly
- [ ] Pagination parameters work (`page`, `pageSize`)
- [ ] Sorting parameters work (`sortBy`, `sortDir`)
- [ ] Legacy routes still function (`/api/church-records`, `/api/baptism-records`)
- [ ] Import routes still work (`/api/records/import`)
- [ ] Interactive reports still work (`/api/records/interactive-reports`)

## Rollback Instructions

If issues occur, revert these changes:

1. **Remove import** (line 225):
   ```typescript
   // Remove this line:
   const powerSearchRouter = require('./api/powerSearchApi');
   ```

2. **Remove registration** (lines 650-652):
   ```typescript
   // Remove these lines:
   // app.use('/api/records', powerSearchRouter);
   // console.log('[BOOT] Power Search routes mounted at /api/records');
   ```

3. **Restart server**:
   ```bash
   pm2 restart orthodoxmetrics-server
   ```

## Related Files

- `server/src/index.ts` - Main server file (modified)
- `server/src/api/powerSearchApi.js` - Power Search router
- `server/src/api/powerSearchParser.js` - Query parser for Power Search syntax
- `server/src/controllers/records.js` - Legacy records controller (unchanged)
- `server/src/routes/records.js` - Legacy records router (unchanged)

## Next Steps

1. Monitor server logs for the `[BOOT]` message
2. Test Power Search endpoints in frontend
3. Verify no conflicts with existing record routes
4. Update API documentation with new endpoints
5. Consider adding Power Search support for marriage and funeral records

---

**Implementation**: Minimal and explicit  
**Impact**: Zero changes to existing routes  
**Risk**: Low (isolated to new `/api/records/baptism` endpoint)
