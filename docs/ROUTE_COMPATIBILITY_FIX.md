# Route Compatibility Fix for Record Table Configuration

## Summary

Restored backward-compatible routes for admin endpoints to fix 404 errors in Record Table Configuration UI.

---

## Problem

Some legacy endpoints were returning 404:
- ❌ `GET /api/admin/church/46/tables/baptism_records/columns` → 404
- ❌ `GET /api/admin/churches/46/tables/baptism_records` → 404

While these worked:
- ✅ `GET /api/admin/churches/46/tables` → 200
- ✅ `GET /api/admin/churches/46/table-columns?table=baptism_records` → 200
- ✅ `GET /api/admin/churches/46/schema?table=baptism_records` → 200

---

## Solution

### 1. Added Route for `/api/admin/churches/:id/tables/:table`

**File**: `server/src/routes/admin/churches-compat.js`

**New Route**: `GET /:id/tables/:table` (line ~580)

**Returns**: Table information including schema and columns:
```json
{
  "success": true,
  "data": {
    "table": "baptism_records",
    "schema": "om_church_46",
    "columns": [...],
    "database": "om_church_46"
  }
}
```

**Implementation**: Reuses same logic as `/tables/:table/columns` but returns full table info.

### 2. Added Support for Singular `/api/admin/church` Path

**File**: `server/src/index.ts` (line ~357)

**Change**: Mounted compatibility router on both paths:
```javascript
app.use('/api/admin/churches', churchesCompatRouter);
app.use('/api/admin/church', churchesCompatRouter); // Legacy singular path support
```

**Result**: Both `/api/admin/churches/:id/...` and `/api/admin/church/:id/...` now work.

### 3. Fixed Bug in Existing Route

**File**: `server/src/routes/admin/churches-compat.js` (line ~232)

**Bug**: Referenced undefined `churchDb.databaseName` instead of `schemaName`

**Fix**: Changed to use `schemaName` and fixed column mapping to use `SHOW COLUMNS` format:
```javascript
// Before (buggy)
columns: columns.map(c => ({
  name: c.column_name,  // Wrong - SHOW COLUMNS returns Field, not column_name
  ...
})),
database: churchDb.databaseName  // Wrong - churchDb not defined

// After (fixed)
columns: columns.map((c, idx) => ({
  name: c.Field,  // Correct - SHOW COLUMNS format
  position: idx + 1,
  type: c.Type,
  nullable: c.Null === 'YES',
  default: c.Default,
  key: c.Key,
  extra: c.Extra
})),
database: schemaName  // Correct
```

---

## Routes Now Supported

### Working Endpoints (All Return 200 JSON)

1. **List Tables**
   - `GET /api/admin/churches/:id/tables`
   - Returns: `{ tables: [...], database: "..." }`

2. **Table Info (NEW)**
   - `GET /api/admin/churches/:id/tables/:table`
   - Returns: `{ table, schema, columns: [...], database }`

3. **Table Columns (Path Param)**
   - `GET /api/admin/churches/:id/tables/:table/columns`
   - `GET /api/admin/church/:id/tables/:table/columns` (singular - NEW)
   - Returns: `{ columns: [...], table, database }`

4. **Table Columns (Query Param)**
   - `GET /api/admin/churches/:id/table-columns?table=:table`
   - Returns: `{ columns: [...], table, database }`

5. **Schema Info**
   - `GET /api/admin/churches/:id/schema?table=:table`
   - Returns: `{ table, columns: [...], database }`

6. **Legacy Aliases**
   - `GET /api/admin/churches/:id/_records/columns?table=:table`
   - Returns: `{ columns: [...], table, database }`

---

## Files Changed

1. **`server/src/routes/admin/churches-compat.js`**
   - Added `GET /:id/tables/:table` route (line ~580)
   - Fixed bug in `GET /:id/tables/:table/columns` (line ~232)
   - Updated documentation header

2. **`server/src/index.ts`**
   - Added mount for `/api/admin/church` (singular path) (line ~357)

---

## Verification

### Test Commands

```bash
# Test existing endpoints (should still work)
curl -i http://127.0.0.1:3001/api/admin/churches/46/tables
curl -i "http://127.0.0.1:3001/api/admin/churches/46/table-columns?table=baptism_records"
curl -i "http://127.0.0.1:3001/api/admin/churches/46/schema?table=baptism_records"

# Test new/restored endpoints (should now work)
curl -i http://127.0.0.1:3001/api/admin/churches/46/tables/baptism_records
curl -i http://127.0.0.1:3001/api/admin/churches/46/tables/baptism_records/columns
curl -i http://127.0.0.1:3001/api/admin/church/46/tables/baptism_records/columns
```

### Expected Results

All endpoints should return:
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body**: JSON with `success: true` and data object

---

## Implementation Details

### Route Order

Routes are mounted in this order:
1. Compatibility router (`/api/admin/churches` and `/api/admin/church`)
2. Main churches management router (`/api/admin/churches`)

This ensures legacy paths are caught first, but existing routes still work.

### Authentication

All routes use:
- `requireAuth` middleware
- `requireChurchAccess` (requires admin/super_admin/church_admin role)
- `validateChurchAccess` function for church-specific access checks

### Error Handling

All routes return consistent JSON error responses:
- `400`: Invalid parameters
- `403`: Access denied
- `404`: Church/table not found
- `500`: Database error

---

## Status

✅ **Complete**
- All legacy endpoints restored
- Bug in existing route fixed
- Singular `/api/admin/church` path supported
- All routes return consistent JSON
- Authentication applied consistently

---

**Date**: 2025-01-XX
