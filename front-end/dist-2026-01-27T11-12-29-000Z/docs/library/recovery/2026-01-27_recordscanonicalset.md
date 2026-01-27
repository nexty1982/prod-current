# Records Canonical Set

**Generated**: January 25, 2026  
**Purpose**: Definitive list of files that are actively used by the current Records system, as described in `RECORDS_SYSTEM_MAP.md`

**Rule**: Only files that are directly referenced and actively used by the current working system are included here. Files marked as "not used" or "alternative" in the system map are excluded.

---

## Canonical Frontend Pages

These are the three main page components that handle record display. They are the primary entry points for Records functionality.

1. **`front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`**
   - **Route**: `/apps/records/baptism?church_id={id}`
   - **Status**: ✅ Actively used
   - **Lines**: ~490
   - **Purpose**: Main baptism records display page with table, pagination, search, sorting

2. **`front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`**
   - **Route**: `/apps/records/marriage?church_id={id}`
   - **Status**: ✅ Actively used
   - **Lines**: ~439
   - **Purpose**: Main marriage records display page with table, pagination, search, sorting

3. **`front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`**
   - **Route**: `/apps/records/funeral?church_id={id}`
   - **Status**: ✅ Actively used
   - **Lines**: ~435
   - **Purpose**: Main funeral records display page with table, pagination, search, sorting

---

## Canonical Frontend Context/Utilities

These are utilities and context providers that are directly used by the canonical pages.

4. **`front-end/src/context/AuthContext.tsx`**
   - **Status**: ✅ Actively used
   - **Purpose**: Provides `useAuth()` hook used by all three Records pages for user authentication and `user.church_id`
   - **Usage**: All three Records pages call `useAuth()` to get user context

5. **`front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx`**
   - **Route**: `/apps/records/centralized`
   - **Status**: ✅ Actively used (alternative entry point)
   - **Lines**: 77
   - **Purpose**: Tabbed wrapper component that provides unified interface for all three record types
   - **Note**: Not the primary entry point, but is a valid route that wraps the three canonical pages

---

## Canonical Backend Routes

These are the API endpoints that the canonical frontend pages call directly.

6. **`server/src/api/baptism.js`**
   - **Status**: ✅ Actively used
   - **Lines**: ~820
   - **Endpoints**:
     - `GET /api/baptism-records` - List records (used by BaptismRecordsPage)
     - `GET /api/baptism-records/:id` - Get single record
     - `POST /api/baptism-records` - Create record
     - `PUT /api/baptism-records/:id` - Update record
     - `DELETE /api/baptism-records/:id` - Delete record

7. **`server/src/api/marriage.js`**
   - **Status**: ✅ Actively used
   - **Lines**: ~650
   - **Endpoints**:
     - `GET /api/marriage-records` - List records (used by MarriageRecordsPage)
     - `GET /api/marriage-records/:id` - Get single record
     - `POST /api/marriage-records` - Create record
     - `PUT /api/marriage-records/:id` - Update record
     - `DELETE /api/marriage-records/:id` - Delete record

8. **`server/src/api/funeral.js`**
   - **Status**: ✅ Actively used
   - **Lines**: ~570
   - **Endpoints**:
     - `GET /api/funeral-records` - List records (used by FuneralRecordsPage)
     - `GET /api/funeral-records/:id` - Get single record
     - `POST /api/funeral-records` - Create record
     - `PUT /api/funeral-records/:id` - Update record
     - `DELETE /api/funeral-records/:id` - Delete record

9. **`server/src/api/churches.js`**
   - **Status**: ✅ Actively used
   - **Lines**: 99-102 (superadmin logic section)
   - **Endpoint**: `GET /api/my/churches`
   - **Purpose**: Used by all three Records pages for church context resolution (auto-selection for superadmin/admin users)

---

## Canonical Database Tables

These are the database tables that store the actual record data.

10. **`baptism_records`**
    - **Database**: `om_church_{church_id}` (church-specific database)
    - **Status**: ✅ Actively used
    - **Schema Location**: `server/src/api/admin.js` (lines 899-931)
    - **Purpose**: Stores baptism record data
    - **Key Fields**: `id`, `church_id`, `first_name`, `last_name`, `birth_date`, `reception_date`, `clergy`, `parents_names`, `sponsor_name`, `certificate_no`, `book_no`, `page_no`, `entry_no`, `notes`, `created_at`, `updated_at`

11. **`marriage_records`**
    - **Database**: `om_church_{church_id}` (church-specific database)
    - **Status**: ✅ Actively used
    - **Schema Location**: `server/src/api/admin.js` (lines 932-966)
    - **Purpose**: Stores marriage record data
    - **Key Fields**: `id`, `church_id`, `groom_first_name`, `groom_last_name`, `bride_first_name`, `bride_last_name`, `marriage_date`, `witnesses`, `marriage_place`, `certificate_no`, `book_no`, `page_no`, `entry_no`, `notes`, `created_at`, `updated_at`

12. **`funeral_records`**
    - **Database**: `om_church_{church_id}` (church-specific database)
    - **Status**: ✅ Actively used
    - **Schema Location**: `server/src/api/admin.js` (lines 967-1000)
    - **Purpose**: Stores funeral record data
    - **Key Fields**: `id`, `church_id`, `first_name`, `last_name`, `death_date`, `burial_date`, `burial_location`, `age_at_death`, `priest_name`, `certificate_no`, `book_no`, `page_no`, `entry_no`, `notes`, `created_at`, `updated_at`

---

## Canonical Database Utilities

These are utilities used by the canonical backend routes to interact with the database.

13. **`server/src/utils/dbSwitcher.js`**
    - **Status**: ✅ Actively used
    - **Purpose**: Provides `getChurchDbConnection(churchId)` function used by all three canonical API routes to switch to church-specific database pools
    - **Usage**: Called by `baptism.js`, `marriage.js`, and `funeral.js` to get the correct database connection

14. **`server/src/api/admin.js`** (table creation section)
    - **Status**: ✅ Actively used (for table creation/schema)
    - **Lines**: 899-1000 (table schemas)
    - **Purpose**: Contains table creation scripts for `baptism_records`, `marriage_records`, and `funeral_records`
    - **Usage**: Used during church setup to create record tables in church-specific databases

---

## Summary

**Total Canonical Files**: 14

- **Frontend Pages**: 3
- **Frontend Context/Utilities**: 2
- **Backend Routes**: 4
- **Database Tables**: 3
- **Database Utilities**: 2

**Key Principle**: These are the only files that are directly used by the current working Records system. All other records-related files are either:
- Experimental (newer work not yet integrated)
- Legacy (old system replaced by current approach)
- Dead/Utility (examples, dummy data, unused helpers)

See `RECORDS_FILE_CLASSIFICATION.md` for classification of all other records-related files.
