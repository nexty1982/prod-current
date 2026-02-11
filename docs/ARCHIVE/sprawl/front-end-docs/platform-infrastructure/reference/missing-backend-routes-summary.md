# Missing Backend Routes Summary

**Date:** December 17, 2025  
**Based on:** Documentation in `front-end/docs/12-9-25/`

## ✅ Routes That ARE Registered

1. **`/api/docs`** - ✅ Registered in `server/src/index.ts` (line 380)
   - `GET /api/docs/files` - List documentation files
   - `POST /api/docs/upload` - Upload documentation files
   - **Status:** Implemented and registered

2. **`/api/gallery`** - ✅ Registered in `server/src/index.ts` (line 371)
   - `GET /api/gallery/images` - List gallery images
   - `POST /api/gallery/upload` - Upload gallery images
   - **Status:** Implemented and registered (but currently failing with 500 errors)

3. **`/api/admin/churches/:id/record-images`** - ✅ Registered in `server/src/index.ts` (line 242)
   - `POST /api/admin/churches/:id/record-images` - Upload record images
   - **Status:** Implemented and registered (but requests not reaching Express)

## ❌ Routes That Are MISSING

### 1. Images List API Route

**File:** `front-end/docs/12-9-25/backend-api-images-list-routes.js`  
**Expected Endpoint:** `GET /api/images/list?directory=<path>`

**Purpose:** List images from public directories (e.g., `orthodox/avatars`, `orthodox/banners`)

**Implementation Status:** ❌ **NOT REGISTERED**

**What's Missing:**
- Route file exists in docs but not implemented in `server/routes/`
- Not registered in `server/src/index.ts`

**Required Action:**
1. Copy `backend-api-images-list-routes.js` to `server/routes/images.js` (or create new file)
2. Register in `server/src/index.ts`:
   ```typescript
   const imagesRouter = require('./routes/images');
   app.use('/api/images', imagesRouter);
   ```

### 2. User Files API Routes

**Documentation:** `front-end/docs/12-9-25/urgent-task.md`  
**Expected Endpoints:**
- `GET /api/user-files/:id` - Stream user files (avatar, banner, profile images)
- `POST /api/user-files/upload` - Upload user files

**Purpose:** 
- Manage user profile files (avatar, banner, images)
- Church-specific storage: `/var/www/orthodoxmetrics/data/church_<id>/user-files/`
- Super admin storage: `/var/www/orthodoxmetrics/data/church/007/super_admins/next/`
- Regular user storage: `/var/www/orthodoxmetrics/data/church/<id>/users/<username>/`

**Security Requirements:**
- Files should NOT be in `front-end/public/` (security risk)
- Should be in `/var/www/orthodoxmetrics/data/` (outside web root)
- Routes must be authenticated
- Must verify user/church access before serving files

**Implementation Status:** ❌ **NOT IMPLEMENTED**

**What's Missing:**
- No route file exists
- No registration in `server/src/index.ts`
- Storage directory structure may not exist

**Required Action:**
1. Create `server/routes/user-files.js` with:
   - `GET /api/user-files/:id` - Stream file with auth check
   - `POST /api/user-files/upload` - Upload with auth check
   - Directory structure: `/var/www/orthodoxmetrics/data/church_<id>/user-files/`
2. Register in `server/src/index.ts`
3. Ensure directories exist and have proper permissions
4. Add authentication middleware

### 3. Dynamic Records API Routes

**Documentation:** `front-end/src/features/records-centralized/components/api.ts` and `dynamicRecordsApi.ts`  
**Expected Endpoints:**

1. **`GET /api/records/tables?db=<churchDb>`**
   - Get list of all `*_records` tables in a church database
   - Used by: `getRecordsTables()` in `dynamicRecordsApi.ts`
   - **Status:** ❌ **NOT IMPLEMENTED**

2. **`GET /api/records/:table?db=<churchDb>&limit=<n>&offset=<n>&orderByPos=<n>&orderDir=<asc|desc>&format=array`**
   - Get data from a specific records table using ordinal positions
   - Returns: `{ columns, rows, totalRows, hasMore, nextOffset }`
   - Used by: `getTableData()` in `dynamicRecordsApi.ts`
   - **Status:** ❌ **NOT IMPLEMENTED**

3. **`GET /api/records/discover?db=<churchDb>&limit=<n>`**
   - Discover all records tables with sample data
   - Returns: `{ churchDb, tables: [{ table, columns, orderBy, rows }] }`
   - Used by: `discoverTables()` in `dynamicRecordsApi.ts`
   - **Status:** ❌ **NOT IMPLEMENTED**

4. **`GET /api/records/enhanced?db=<churchDb>&table=<table>&churchId=<id>`**
   - Enhanced records endpoint with column mapping
   - Returns: `{ success, data: { columns, mapping, rows } }`
   - Used by: `fetchRecordsEnhanced()` in `api.ts`
   - **Status:** ❌ **NOT IMPLEMENTED**

5. **`GET /api/admin/churches/:id/records/tables`**
   - Get list of records tables for a specific church
   - Returns: `string[]` (array of table names)
   - Used by: `fetchTables()` in `api.ts`
   - **Status:** ❌ **NOT IMPLEMENTED**

6. **`GET /api/admin/churches/:id/records?table=<table>&page=<n>&pageSize=<n>&sort=<col>&dir=<asc|desc>`**
   - Get records with pagination, sorting, and column mapping
   - Returns: `{ success, columns, mapping, rows, total }`
   - Used by: `fetchRecords()` in `api.ts`
   - **Status:** ❌ **NOT IMPLEMENTED**

**Current Implementation:**
- `server/src/api/records.js` exists but only has routes for specific record types (`/api/records/:recordType`)
- Does NOT have the dynamic/ordinal-based routes needed by the records-centralized feature
- Does NOT have the church-specific routes (`/api/admin/churches/:id/records/*`)

**What's Missing:**
- Dynamic table discovery endpoint
- Ordinal-based record fetching (using column positions instead of names)
- Church-specific records endpoints
- Enhanced records endpoint with column mapping

**Required Action:**
1. Add new routes to `server/src/api/records.js` or create `server/src/api/dynamic-records.js`
2. Implement handlers for:
   - Table discovery
   - Ordinal-based record fetching
   - Enhanced records with mapping
3. Add routes to `server/routes/admin/churches.js` for church-specific endpoints
4. Register routes in `server/src/index.ts`

### 4. Church Storage Routes

**Documentation:** `front-end/docs/12-9-25/urgent-task.md`  
**Expected:** Church-specific storage paths

**Storage Structure:**
```
/var/www/orthodoxmetrics/data/
└── church
    ├── 007
    │   ├── banner
    │   ├── images
    │   ├── profile
    │   └── super_admins
    │       └── next
    │           ├── avatar
    │           ├── banner
    │           └── images
    └── 46
        ├── images
        └── users
            └── frjames
                ├── banner
                ├── images
                └── profile
```

**Implementation Status:** ❌ **NOT IMPLEMENTED**

**What's Missing:**
- No routes for church-specific file management
- No routes for user profile file management
- Storage directories may not exist

## Current Issues with Existing Routes

### `/api/gallery/upload` - 500 Error
- **Status:** Route exists and is registered
- **Issue:** Returning 500 errors, upload progress reaches 100% but then fails
- **Likely Cause:** Error in route handler after file upload completes
- **Fix Needed:** Check PM2 logs for specific error after upload

### `/api/admin/churches/:id/record-images` - Not Reaching Express
- **Status:** Route exists and is registered
- **Issue:** No logs appearing in PM2, request not reaching Express
- **Likely Cause:** Nginx blocking or middleware issue
- **Fix Needed:** Check Nginx error logs, verify request reaches Express

## Summary of Missing Routes

| Route | Status | Priority | File Location |
|-------|--------|----------|---------------|
| `GET /api/images/list` | ❌ Missing | Medium | `server/routes/images.js` (needs creation) |
| `GET /api/user-files/:id` | ❌ Missing | High | `server/routes/user-files.js` (needs creation) |
| `POST /api/user-files/upload` | ❌ Missing | High | `server/routes/user-files.js` (needs creation) |
| `GET /api/records/tables` | ❌ Missing | High | `server/src/api/records.js` (needs addition) |
| `GET /api/records/enhanced` | ❌ Missing | High | `server/src/api/records.js` (needs addition) |
| `GET /api/records/discover` | ❌ Missing | High | `server/src/api/records.js` (needs addition) |
| `GET /api/records/:table` | ❌ Missing | High | `server/src/api/records.js` (needs addition) |
| `GET /api/admin/churches/:id/records/tables` | ❌ Missing | High | `server/routes/admin/churches.js` (needs addition) |
| `GET /api/admin/churches/:id/records` | ❌ Missing | High | `server/routes/admin/churches.js` (needs addition) |
| Church storage routes | ❌ Missing | Medium | TBD based on requirements |

## Next Steps

1. **Immediate:** Fix existing routes (`/api/gallery/upload` and `/api/admin/churches/:id/record-images`)
2. **High Priority:** Implement user-files routes for profile management
3. **Medium Priority:** Implement images list route
4. **Medium Priority:** Implement church storage routes

## Files to Create/Modify

1. **Create:** `server/routes/images.js` (from `backend-api-images-list-routes.js`)
2. **Create:** `server/routes/user-files.js` (new implementation)
3. **Modify:** `server/src/index.ts` - Register new routes
4. **Create:** Storage directories in `/var/www/orthodoxmetrics/data/`

