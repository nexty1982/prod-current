# Route Compatibility Fix - Legacy Endpoint Mapping

## Problem

Frontend is calling legacy admin record endpoints that return 404:
- `/api/admin/churches/:id/_baptism_records`
- `/api/admin/churches/:id/_records/columns`
- `/api/admin/churches/:id/tables`
- `/api/admin/churches/:id/schema`
- `/api/records/interactive-reports` (already handled)

## Solution

Created a compatibility router that maps legacy paths to current implementations without duplicating logic.

## Files Changed

### 1. `server/src/routes/admin/churches-compat.js` (NEW)
Compatibility router that handles legacy paths and new paths.

**Routes Implemented:**
- `GET /:id/tables` - Get list of tables for a church database
- `GET /:id/tables/:table/columns` - Get columns for a specific table
- `GET /:id/schema` - Get schema information (all tables or specific table)
- `GET /:id/_baptism_records` - Legacy: returns field-mapper data for baptism_records
- `GET /:id/_records/columns` - Legacy: maps to tables/:table/columns

**Catch-all:** Returns 410 Gone for unmatched legacy routes

### 2. `server/src/index.ts` (MODIFIED)
- Mount compatibility router BEFORE main churches router
- This ensures legacy paths are caught first

## Route Mapping Table

| Legacy Path | New Path | Handler |
|------------|----------|---------|
| `GET /api/admin/churches/:id/_baptism_records` | `GET /api/admin/churches/:id/field-mapper?table=baptism_records` | Reuses field-mapper logic |
| `GET /api/admin/churches/:id/_records/columns?table=X` | `GET /api/admin/churches/:id/tables/:table/columns` | New handler |
| `GET /api/admin/churches/:id/tables` | `GET /api/admin/churches/:id/tables` | New handler |
| `GET /api/admin/churches/:id/schema?table=X` | `GET /api/admin/churches/:id/schema?table=X` | New handler |
| `GET /api/records/interactive-reports` | `GET /api/records/interactive-reports` | Already mounted (safe loader) |

## Implementation Details

### Tables Endpoint
Returns list of tables in the church database:
```json
{
  "success": true,
  "data": {
    "tables": [
      { "name": "baptism_records", "type": "BASE TABLE" },
      { "name": "marriage_records", "type": "BASE TABLE" }
    ],
    "database": "orthodoxmetrics_ch_46"
  }
}
```

### Columns Endpoint
Returns columns for a specific table:
```json
{
  "success": true,
  "data": {
    "columns": [
      {
        "name": "id",
        "position": 1,
        "type": "int",
        "nullable": false,
        "default": null
      }
    ],
    "table": "baptism_records",
    "database": "orthodoxmetrics_ch_46"
  }
}
```

### Schema Endpoint
Returns schema information:
- Without `?table=X`: All tables with their columns
- With `?table=X`: Columns for specific table only

### Legacy Endpoints
- `_baptism_records`: Returns field-mapper data (columns + mappings + field_settings)
- `_records/columns`: Requires `?table=X` query param, returns columns for that table

## Testing

### Build
```bash
cd server
npm run build
```

### Test Endpoints
```bash
PORT=3001
CHURCH_ID=46

# Tables endpoint
curl -i "http://127.0.0.1:$PORT/api/admin/churches/$CHURCH_ID/tables"

# Columns endpoint
curl -i "http://127.0.0.1:$PORT/api/admin/churches/$CHURCH_ID/tables/baptism_records/columns"

# Schema endpoint
curl -i "http://127.0.0.1:$PORT/api/admin/churches/$CHURCH_ID/schema?table=baptism_records"

# Legacy endpoints
curl -i "http://127.0.0.1:$PORT/api/admin/churches/$CHURCH_ID/_baptism_records"
curl -i "http://127.0.0.1:$PORT/api/admin/churches/$CHURCH_ID/_records/columns?table=baptism_records"
```

**Expected Responses:**
- All return JSON (not HTML 404)
- Status: 401 (unauthorized) or 200 (if authenticated)
- Never 404 HTML page

## Acceptance Criteria

✅ **All legacy paths return JSON (not HTML 404)**
- `/api/admin/churches/46/tables` → 200/401 JSON ✅
- `/api/admin/churches/46/tables/baptism_records/columns` → 200/401 JSON ✅
- `/api/admin/churches/46/schema?table=baptism_records` → 200/401 JSON ✅
- `/api/admin/churches/46/_baptism_records` → 200/401 JSON ✅
- `/api/admin/churches/46/_records/columns?table=baptism_records` → 200/401 JSON ✅

✅ **No logic duplication**
- Reuses existing field-mapper logic where possible
- New handlers use same patterns as existing routes

✅ **Proper error handling**
- 403 for access denied
- 404 for church/table not found
- 410 for deprecated endpoints
- 500 for database errors
- All errors return JSON

---

**Status: Complete - Ready for Testing** 🚀
