# Records System Map

**Generated**: January 25, 2026  
**Purpose**: Definitive mapping of the current Records system architecture (UI → Context → API → DB) for Baptism/Marriage/Funeral records

---

## What Matters Now

### Current Active System

The Records system uses a **specialized component approach** with three main page components, each handling one record type. All three pages follow the same pattern:

1. **Route**: `/apps/records/{baptism|marriage|funeral}?church_id={id}`
2. **Component**: `{Baptism|Marriage|Funeral}RecordsPage.tsx` in `front-end/src/features/records-centralized/components/{baptism|marriage|death}/`
3. **API**: Direct fetch to `/api/{baptism|marriage|funeral}-records`
4. **Database**: Church-specific database tables `{baptism|marriage|funeral}_records`

### Key Architectural Decisions

- **No unified API layer**: Each page component calls its endpoint directly
- **Church context resolution**: Uses URL query param `church_id`, falls back to `user.church_id`, auto-selects first church for superadmin/admin
- **State management**: Simple `useState` hooks (no complex context providers)
- **Database**: Multi-tenant architecture with church-specific databases (`om_church_{id}`)

---

## System Architecture: UI → Context → API → DB

### Baptism Records Flow

#### UI Layer

**Route**: `/apps/records/baptism?church_id={id}`  
**Component**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`  
**Lines**: 1-490 (approx. 490 lines)

**Key Features**:
- Reads `church_id` from URL query params (`useSearchParams`)
- Falls back to `user.church_id` from `AuthContext`
- Auto-selects first available church for superadmin/admin users
- Material-UI Table with pagination, sorting, search
- Record type switcher tabs (Baptism/Marriage/Funeral)
- Row actions: View, Edit, Delete (navigation only, no API calls yet)

**State Management**:
```typescript
const [churchId, setChurchId] = useState<number | null>(...);
const [records, setRecords] = useState<BaptismRecord[]>([]);
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [searchQuery, setSearchQuery] = useState('');
const [sortField, setSortField] = useState<string>('reception_date');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
```

**Context/Hooks Used**:
- `useAuth()` from `front-end/src/context/AuthContext.tsx` - User authentication and `church_id`
- `useSearchParams()` from `react-router-dom` - URL query parameter management
- `useNavigate()` from `react-router-dom` - Navigation for record actions

#### API Layer

**Endpoint**: `GET /api/baptism-records?church_id={id}&page={page}&limit={limit}&search={query}`  
**Handler**: `server/src/api/baptism.js`  
**Lines**: 1-820 (approx. 820 lines)

**Key Endpoints**:
- `GET /api/baptism-records` - List records with pagination, search, filtering
- `GET /api/baptism-records/:id` - Get single record
- `POST /api/baptism-records` - Create new record
- `PUT /api/baptism-records/:id` - Update record
- `DELETE /api/baptism-records/:id` - Delete record

**Request Headers**:
- `X-OM-Church-ID: {church_id}` (optional, also accepts `church_id` query param)
- `Content-Type: application/json`
- Session cookie for authentication

**Response Format**:
```json
{
  "success": true,
  "records": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "2020-01-01",
      "reception_date": "2020-01-15",
      "clergy": "Fr. Smith",
      "church_id": 46
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 592,
    "pages": 60
  }
}
```

#### Database Layer

**Table**: `baptism_records`  
**Database**: `om_church_{church_id}` (church-specific database)  
**Schema**: Defined in `server/src/api/admin.js` (lines 899-931)

**Key Columns**:
- `id` (PRIMARY KEY, AUTO_INCREMENT)
- `church_id` (INT, FK to `orthodoxmetrics_db.churches.id`)
- `first_name`, `last_name` (VARCHAR)
- `birth_date`, `reception_date` (DATE)
- `clergy` (VARCHAR)
- `parents_names`, `sponsor_name` (VARCHAR)
- `certificate_no`, `book_no`, `page_no`, `entry_no` (VARCHAR/INT)
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

**Database Connection**:
- Uses `getChurchDbConnection(churchId)` from `server/src/utils/dbSwitcher.js`
- Switches to church-specific database pool based on `church_id`
- Falls back to app pool if church database doesn't exist

---

### Marriage Records Flow

#### UI Layer

**Route**: `/apps/records/marriage?church_id={id}`  
**Component**: `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`  
**Lines**: 1-439 (approx. 439 lines)

**Key Features**: Same as Baptism, but with marriage-specific fields:
- `groom_first_name`, `groom_last_name`
- `bride_first_name`, `bride_last_name`
- `marriage_date`
- `witnesses`
- `marriage_place`

**State Management**: Same pattern as Baptism

**Context/Hooks Used**: Same as Baptism

#### API Layer

**Endpoint**: `GET /api/marriage-records?church_id={id}&page={page}&limit={limit}&search={query}`  
**Handler**: `server/src/api/marriage.js`  
**Lines**: 1-650 (approx. 650 lines)

**Key Endpoints**: Same pattern as Baptism:
- `GET /api/marriage-records` - List records
- `GET /api/marriage-records/:id` - Get single record
- `POST /api/marriage-records` - Create record
- `PUT /api/marriage-records/:id` - Update record
- `DELETE /api/marriage-records/:id` - Delete record

**Response Format**: Same structure as Baptism, with marriage-specific fields

#### Database Layer

**Table**: `marriage_records`  
**Database**: `om_church_{church_id}`  
**Schema**: Defined in `server/src/api/admin.js` (lines 932-966)

**Key Columns**:
- `id`, `church_id` (same as Baptism)
- `groom_first_name`, `groom_last_name`
- `bride_first_name`, `bride_last_name`
- `marriage_date` (DATE)
- `witnesses` (VARCHAR)
- `marriage_place` (VARCHAR)
- `certificate_no`, `book_no`, `page_no`, `entry_no`
- `notes`, `created_at`, `updated_at`

---

### Funeral Records Flow

#### UI Layer

**Route**: `/apps/records/funeral?church_id={id}`  
**Component**: `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`  
**Lines**: 1-435 (approx. 435 lines)

**Key Features**: Same pattern, with funeral-specific fields:
- `first_name`, `last_name` (or `name`, `lastname` - handles both)
- `death_date`, `burial_date`
- `burial_location`
- `age_at_death`

**State Management**: Same pattern as Baptism/Marriage

**Context/Hooks Used**: Same as Baptism/Marriage

#### API Layer

**Endpoint**: `GET /api/funeral-records?church_id={id}&page={page}&limit={limit}`  
**Handler**: `server/src/api/funeral.js`  
**Lines**: 1-570 (approx. 570 lines)

**Key Endpoints**: Same pattern:
- `GET /api/funeral-records` - List records
- `GET /api/funeral-records/:id` - Get single record
- `POST /api/funeral-records` - Create record
- `PUT /api/funeral-records/:id` - Update record
- `DELETE /api/funeral-records/:id` - Delete record

**Note**: Search functionality may not be fully implemented in backend

#### Database Layer

**Table**: `funeral_records`  
**Database**: `om_church_{church_id}`  
**Schema**: Defined in `server/src/api/admin.js` (lines 967-1000)

**Key Columns**:
- `id`, `church_id` (same as others)
- `first_name`, `last_name`
- `death_date`, `burial_date` (DATE)
- `burial_location` (VARCHAR)
- `age_at_death` (INT)
- `priest_name` (VARCHAR) - Note: field name differs from `clergy` in other tables
- `certificate_no`, `book_no`, `page_no`, `entry_no`
- `notes`, `created_at`, `updated_at`

---

## Shared Components & Utilities

### RecordsPageWrapper

**File**: `front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx`  
**Lines**: 1-77  
**Purpose**: Wrapper component for `/apps/records/centralized` route that provides tabs to switch between record types

**Usage**: Not currently the primary entry point (individual pages are preferred)

### ChurchRecordsContext

**File**: `front-end/src/context/ChurchRecordsContext.tsx`  
**Lines**: 1-514 (approx. 514 lines)  
**Purpose**: Context provider for unified records management (used by legacy/unified components)

**Status**: Not used by current `{Baptism|Marriage|Funeral}RecordsPage.tsx` components (they use direct `useAuth()` instead)

**Key Functions**:
- `loadRecords()` - Fetches records from all types using existing endpoints
- Supports filtering by type, parish, clergy, date ranges
- Provides pagination state management

### fetchWithChurchContext

**File**: `front-end/src/shared/lib/fetchWithChurchContext.ts`  
**Lines**: 1-111  
**Purpose**: Utility to automatically add `X-Church-Id` header to fetch requests

**Usage**: Not currently used by main Records pages (they use direct `fetch()` with query params)

---

## Additional API Routes

### Records Browse Routes

**File**: `server/src/routes/records/browse.ts`  
**Lines**: 1-172  
**Endpoints**:
- `GET /api/records/:type` - Unified browse endpoint (supports `baptisms`, `marriages`, `funerals`)
- `GET /api/records/:type/:id` - Get single record by type

**Status**: Alternative API structure, not used by current frontend components

### Records Dashboard Routes

**File**: `server/src/routes/records/dashboard.ts`  
**Lines**: 1-260  
**Endpoints**:
- `GET /api/records/dashboard` - Dashboard statistics (counts, trends, recent records, duplicates)
- `GET /api/records/dashboard/summary` - Quick summary statistics

**Status**: Available but not integrated into current UI

### Records Import Routes

**File**: `server/src/routes/records/import.ts`  
**Lines**: 1-428  
**Service**: `server/src/modules/records/importService.ts`  
**Endpoints**:
- `POST /api/records/import/upload` - Upload import file
- `POST /api/records/import/preview` - Preview import data
- `POST /api/records/import/commit` - Commit import with field mappings
- `GET /api/records/import/status/:jobId` - Get import job status
- `GET /api/records/import/recent` - Get recent import jobs

**Status**: Backend implemented, frontend import UI not integrated into main Records pages

---

## Church Context Resolution

### Backend: `/api/my/churches`

**File**: `server/src/api/churches.js`  
**Lines**: 99-102 (superadmin logic)

**Behavior**:
- For `super_admin`: Returns all active churches (no WHERE clause restriction)
- For other roles: Returns churches where user has access
- Never returns 400 for superadmin (ensures at least one church if any exist)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "churches": [
      {
        "id": 46,
        "name": "St. John's Orthodox Church",
        "is_default": true
      }
    ]
  }
}
```

### Frontend: Auto-Selection Logic

**Location**: All three Records page components (`BaptismRecordsPage.tsx`, `MarriageRecordsPage.tsx`, `FuneralRecordsPage.tsx`)

**Logic** (lines 84-120 in each):
1. If `churchId` is null and user is `super_admin` or `admin`:
   - Fetch `/api/my/churches`
   - If churches found, auto-select first one (`churches[0].id`)
   - Update component state: `setChurchId(effectiveChurchId)`
   - Update URL: `setSearchParams({ church_id: effectiveChurchId.toString() }, { replace: true })`
   - Return early to allow `useEffect` to re-run with new `churchId`
2. If no churches found:
   - Show error: "No churches found in the system. Please create a church first." (superadmin)
   - Or: "No church available. Please ensure you have access to at least one church." (other roles)

---

## Database Tables Summary

### Baptism Records

**Table**: `baptism_records`  
**Database**: `om_church_{church_id}`  
**Primary Key**: `id`  
**Foreign Key**: `church_id` → `orthodoxmetrics_db.churches.id`  
**Key Fields**: `first_name`, `last_name`, `birth_date`, `reception_date`, `clergy`, `parents_names`, `sponsor_name`

### Marriage Records

**Table**: `marriage_records`  
**Database**: `om_church_{church_id}`  
**Primary Key**: `id`  
**Foreign Key**: `church_id` → `orthodoxmetrics_db.churches.id`  
**Key Fields**: `groom_first_name`, `groom_last_name`, `bride_first_name`, `bride_last_name`, `marriage_date`, `witnesses`, `marriage_place`

### Funeral Records

**Table**: `funeral_records`  
**Database**: `om_church_{church_id}`  
**Primary Key**: `id`  
**Foreign Key**: `church_id` → `orthodoxmetrics_db.churches.id`  
**Key Fields**: `first_name`, `last_name`, `death_date`, `burial_date`, `burial_location`, `age_at_death`, `priest_name`

---

## File Manifest

### Frontend Entry Points

1. **BaptismRecordsPage.tsx**
   - Path: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
   - Lines: ~490
   - Route: `/apps/records/baptism`

2. **MarriageRecordsPage.tsx**
   - Path: `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`
   - Lines: ~439
   - Route: `/apps/records/marriage`

3. **FuneralRecordsPage.tsx**
   - Path: `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`
   - Lines: ~435
   - Route: `/apps/records/funeral`

### Frontend Context/Utilities

4. **AuthContext.tsx**
   - Path: `front-end/src/context/AuthContext.tsx`
   - Purpose: User authentication, provides `user.church_id`

5. **ChurchRecordsContext.tsx**
   - Path: `front-end/src/context/ChurchRecordsContext.tsx`
   - Lines: ~514
   - Purpose: Unified records context (legacy, not used by main pages)

6. **fetchWithChurchContext.ts**
   - Path: `front-end/src/shared/lib/fetchWithChurchContext.ts`
   - Lines: 111
   - Purpose: Utility for adding church context headers

7. **RecordsPageWrapper.tsx**
   - Path: `front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx`
   - Lines: 77
   - Purpose: Tabbed wrapper for centralized route

### Backend API Routes

8. **baptism.js**
   - Path: `server/src/api/baptism.js`
   - Lines: ~820
   - Endpoints: `/api/baptism-records` (GET, POST, PUT, DELETE)

9. **marriage.js**
   - Path: `server/src/api/marriage.js`
   - Lines: ~650
   - Endpoints: `/api/marriage-records` (GET, POST, PUT, DELETE)

10. **funeral.js**
    - Path: `server/src/api/funeral.js`
    - Lines: ~570
    - Endpoints: `/api/funeral-records` (GET, POST, PUT, DELETE)

11. **churches.js**
    - Path: `server/src/api/churches.js`
    - Lines: 99-102 (superadmin logic)
    - Endpoint: `/api/my/churches` (GET)

### Backend Routes (Alternative/Additional)

12. **browse.ts**
    - Path: `server/src/routes/records/browse.ts`
    - Lines: 172
    - Endpoints: `/api/records/:type` (unified browse)

13. **dashboard.ts**
    - Path: `server/src/routes/records/dashboard.ts`
    - Lines: 260
    - Endpoints: `/api/records/dashboard`, `/api/records/dashboard/summary`

14. **import.ts**
    - Path: `server/src/routes/records/import.ts`
    - Lines: 428
    - Endpoints: `/api/records/import/*`

15. **importService.ts**
    - Path: `server/src/modules/records/importService.ts`
    - Lines: ~350
    - Purpose: Import service logic

### Database Utilities

16. **dbSwitcher.js**
    - Path: `server/src/utils/dbSwitcher.js`
    - Purpose: Church-specific database connection switching

17. **admin.js** (table creation)
    - Path: `server/src/api/admin.js`
    - Lines: 899-1000 (table schemas)
    - Purpose: Table creation scripts for `baptism_records`, `marriage_records`, `funeral_records`

---

## Restore Plan

### Current State Assessment

**What's Working**:
- ✅ All three record type pages display records correctly
- ✅ Church context resolution (URL params, auto-selection for superadmin)
- ✅ Pagination, sorting, search (frontend)
- ✅ Record type switcher tabs
- ✅ Basic table display with Material-UI

**What's Missing/Bare Minimum**:
- ❌ Edit/Delete functionality (buttons exist but no API calls)
- ❌ Create new record functionality (navigation exists but forms not implemented)
- ❌ Advanced filtering (date ranges, multiple criteria)
- ❌ Export functionality
- ❌ Import UI integration
- ❌ Dashboard integration
- ❌ Advanced Grid (AG Grid) integration (component exists but not connected)

### Target Files for Restoration

Based on the discovery outputs and legacy documentation:

1. **Enhanced UI Features** (from `RECORDS_RESTORE_STATUS.md`):
   - Add full column sets (not truncated)
   - Implement actual View/Edit/Delete API calls
   - Add advanced filters panel
   - Integrate AG Grid for advanced mode
   - Add export functionality

2. **Backend Enhancements**:
   - Ensure search works for funeral-records endpoint
   - Add `church_id` filtering to endpoints (if needed)
   - Verify pagination works correctly

3. **Integration**:
   - Connect import UI to main Records pages
   - Integrate dashboard statistics
   - Add record entry forms (currently just navigation)

### Files That Appear to Be "Newer Work" Not in prod-current

See `RECENT_RECORDS_FILES_MANIFEST.md` for detailed analysis of files modified in the last 180 days that may not be in git history.

### Restoration Priority

1. **High Priority** (Core Functionality):
   - Implement Edit/Delete API calls in page components
   - Add Create record forms
   - Verify and fix search functionality

2. **Medium Priority** (Enhanced Features):
   - Advanced filtering UI
   - Export functionality
   - AG Grid integration

3. **Low Priority** (Nice to Have):
   - Import UI integration
   - Dashboard statistics widgets
   - Advanced Grid mode toggle

---

## Notes

- The current system uses a **specialized component approach** rather than a unified/generic system
- Each record type has its own page component, API handler, and database table
- Church context is resolved via URL query params, with fallback to user context and auto-selection for superadmin
- The system is **multi-tenant** with church-specific databases (`om_church_{id}`)
- Backend uses `getChurchDbConnection()` to switch database contexts based on `church_id`
