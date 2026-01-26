# Record Table Configuration Standardization

## Summary

Standardized Record Table Configuration behind ONE canonical endpoint (`/api/admin/churches/:churchId/record-table-config`) and made all legacy endpoints forward to it using centralized service helpers.

---

## Problem

Multiple legacy endpoints were returning 404/500:
- ❌ `GET /api/admin/church/:churchId/tables/:table/columns` → 404
- ❌ `GET /api/admin/churches/:churchId/tables/:table` → 404
- ❌ `GET /api/admin/churches/:churchId/tables/:table/columns` → 500

While these worked:
- ✅ `GET /api/admin/churches/:churchId/tables` → 200
- ✅ `GET /api/admin/churches/:churchId/schema?table=baptism_records` → 200
- ✅ `GET /api/admin/churches/:churchId/table-columns?table=baptism_records` → 200
- ✅ `GET /api/admin/churches/:churchId/columns?table=baptism_records` → 200

**Root Cause**: Code duplication and inconsistent database query patterns across endpoints.

---

## Solution

### 1. Created Centralized Service Module

**File**: `server/src/services/recordTableConfig.js` (NEW)

**Exports**:
- `getChurchSchemaName(churchId)` → Returns schema name like "om_church_46"
- `listChurchTables(churchId)` → Returns array of table names
- `getTableColumns(churchId, tableName)` → Returns array of column objects
- `inferDefaultsFromColumns(columns)` → Returns default configuration
- `validateTableName(tableName)` → Validates table name format

**Key Features**:
- All database queries use the same patterns
- Consistent error handling (returns `null` for not found)
- Smart defaults inference (visibleFields, displayNameMap, defaultSort)
- SQL injection protection via validation

### 2. Created Canonical Endpoint

**File**: `server/src/routes/admin/churches-compat.js` (line ~710)

**Endpoint**: `GET /api/admin/churches/:churchId/record-table-config?table=<table>`

**Response Format** (when `table` provided):
```json
{
  "success": true,
  "data": {
    "churchId": 46,
    "schemaName": "om_church_46",
    "table": "baptism_records",
    "tables": ["baptism_records", "marriage_records", "funeral_records"],
    "columns": [
      {
        "name": "id",
        "position": 1,
        "type": "int(11)",
        "nullable": false,
        "default": null,
        "key": "PRI",
        "extra": "auto_increment"
      },
      ...
    ],
    "schema": {
      "columns": [...]
    },
    "defaults": {
      "visibleFields": ["first_name", "last_name", "date_of_baptism", ...],
      "displayNameMap": {
        "first_name": "First Name",
        "last_name": "Last Name",
        ...
      },
      "defaultSortField": "reception_date",
      "defaultSortDirection": "desc"
    }
  }
}
```

**Response Format** (when `table` omitted):
```json
{
  "success": true,
  "data": {
    "churchId": 46,
    "schemaName": "om_church_46",
    "table": null,
    "tables": ["baptism_records", "marriage_records", "funeral_records"],
    "columns": [],
    "schema": { "columns": [] },
    "defaults": {
      "visibleFields": [],
      "displayNameMap": {},
      "defaultSortField": null,
      "defaultSortDirection": "asc"
    }
  }
}
```

### 3. Updated Legacy Endpoints to Use Service

All legacy endpoints now use `recordTableConfigService` helpers:

1. **`GET /api/admin/churches/:id/tables`**
   - Uses: `listChurchTables()`
   - Returns: `{ tables: [...], database: "..." }`

2. **`GET /api/admin/churches/:id/tables/:table`**
   - Uses: `getChurchSchemaName()`, `listChurchTables()`, `getTableColumns()`, `inferDefaultsFromColumns()`
   - Returns: Full canonical bundle

3. **`GET /api/admin/churches/:id/tables/:table/columns`**
   - Uses: `getChurchSchemaName()`, `validateTableName()`, `getTableColumns()`
   - Returns: `{ columns: [...], table: "...", database: "..." }`

4. **`GET /api/admin/church/:id/tables/:table/columns`** (singular path)
   - Same as above (mounted on `/api/admin/church`)

5. **`GET /api/admin/churches/:id/schema?table=...`**
   - Uses: `getChurchSchemaName()`, `listChurchTables()`, `getTableColumns()`
   - Returns: Schema info

6. **`GET /api/admin/churches/:id/table-columns?table=...`**
   - Uses: `getChurchSchemaName()`, `validateTableName()`, `getTableColumns()`
   - Returns: `{ columns: [...], table: "...", database: "..." }`

7. **`GET /api/admin/churches/:id/columns?table=...`**
   - Uses: Same as `table-columns`

8. **`GET /api/admin/churches/:id/_records/columns?table=...`**
   - Uses: Same as `table-columns`

### 4. Defaults Inference Logic

The `inferDefaultsFromColumns()` function implements smart heuristics:

**Visible Fields**:
- Excludes system fields: `created_at`, `updated_at`, `deleted_at`, `password`, `token`, `id`
- Excludes JSON/blob fields (type contains "json", "blob", "text")

**Display Name Map**:
- Converts snake_case to Title Case: `first_name` → `First Name`

**Default Sort**:
- Priority 1: `reception_date` (if exists)
- Priority 2: `date_of_baptism`, `marriage_date`, `burial_date`, `death_date` (if exists)
- Priority 3: `id` (if exists)
- Priority 4: First visible field (asc)
- Default direction: `desc` for date fields, `asc` for others

---

## Files Changed

1. **`server/src/services/recordTableConfig.js`** (NEW)
   - Centralized service module with all helper functions
   - ~210 lines

2. **`server/src/routes/admin/churches-compat.js`** (MODIFIED)
   - Added canonical endpoint: `GET /:id/record-table-config`
   - Updated all legacy endpoints to use service helpers
   - Removed duplicate database query code
   - ~714 lines (was ~609 lines)

3. **`server/src/index.ts`** (NO CHANGE)
   - Already mounts router on both `/api/admin/churches` and `/api/admin/church`

---

## Routes Now Supported

### Canonical Endpoint
- ✅ `GET /api/admin/churches/:churchId/record-table-config?table=<table>`
- ✅ `GET /api/admin/churches/:churchId/record-table-config` (tables list)

### Legacy Endpoints (All Forward to Canonical Logic)
- ✅ `GET /api/admin/churches/:id/tables`
- ✅ `GET /api/admin/churches/:id/tables/:table`
- ✅ `GET /api/admin/churches/:id/tables/:table/columns`
- ✅ `GET /api/admin/church/:id/tables/:table/columns` (singular path)
- ✅ `GET /api/admin/churches/:id/schema?table=...`
- ✅ `GET /api/admin/churches/:id/table-columns?table=...`
- ✅ `GET /api/admin/churches/:id/columns?table=...`
- ✅ `GET /api/admin/churches/:id/_records/columns?table=...`

---

## Verification

### Test Commands

```bash
# Canonical endpoint (with table)
curl -i "http://127.0.0.1:3001/api/admin/churches/46/record-table-config?table=baptism_records"

# Canonical endpoint (tables list)
curl -i "http://127.0.0.1:3001/api/admin/churches/46/record-table-config"

# Legacy endpoints (should all return 200)
curl -i "http://127.0.0.1:3001/api/admin/church/46/tables/baptism_records/columns"
curl -i "http://127.0.0.1:3001/api/admin/churches/46/tables/baptism_records/columns"
curl -i "http://127.0.0.1:3001/api/admin/churches/46/tables/baptism_records"

# Existing endpoints (should still work)
curl -i "http://127.0.0.1:3001/api/admin/churches/46/tables"
curl -i "http://127.0.0.1:3001/api/admin/churches/46/schema?table=baptism_records"
curl -i "http://127.0.0.1:3001/api/admin/churches/46/table-columns?table=baptism_records"
```

### Expected Results

All endpoints should return:
- **Status**: `200 OK` (or `404` for invalid table/church, `400` for invalid params, `403` for access denied)
- **Content-Type**: `application/json`
- **Body**: JSON with `success: true` and data object

---

## Benefits

1. **Single Source of Truth**: All endpoints use the same service helpers
2. **Consistent Responses**: Same data structure across all endpoints
3. **Easier Maintenance**: Database query logic in one place
4. **Better Defaults**: Smart inference for field visibility and sorting
5. **Backward Compatible**: All legacy endpoints still work
6. **Future-Proof**: New endpoints can use the canonical endpoint or service helpers

---

## Implementation Details

### Service Module Architecture

```
recordTableConfigService
├── getChurchSchemaName(churchId)
│   └── Queries churches table, returns "om_church_<id>"
├── listChurchTables(churchId)
│   └── SHOW TABLES FROM schema, filters to record tables
├── getTableColumns(churchId, tableName)
│   └── SHOW COLUMNS FROM schema.table, validates table exists
├── inferDefaultsFromColumns(columns)
│   ├── visibleFields: filters system/JSON fields
│   ├── displayNameMap: snake_case → Title Case
│   └── defaultSort: priority-based date/id field selection
└── validateTableName(tableName)
    └── Regex validation for SQL injection protection
```

### Error Handling

- Service functions return `null` for "not found" (church/table)
- Routes return appropriate HTTP status codes (400/403/404/500)
- All errors return JSON with `ApiResponse` format
- Development mode includes error details in responses

### Authentication

All endpoints use:
- `requireAuth` middleware
- `requireChurchAccess` (requires admin/super_admin/church_admin role)
- `validateChurchAccess()` function for church-specific checks

---

## Status

✅ **Complete**
- Canonical endpoint implemented
- All legacy endpoints updated to use service
- Service module created with all helpers
- Defaults inference implemented
- All routes return consistent JSON
- Authentication applied consistently

---

**Date**: 2025-01-XX
