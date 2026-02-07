# Current State: Baptism Records Search Implementation

## Date: February 5, 2026
## Purpose: Document existing setup before implementing Power Search

---

## Frontend Component

**Primary Component Path:**
- `/var/www/orthodoxmetrics/prod/front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

**Route:**
- `/apps/records/baptism`
- Defined in `Router.tsx` line 1196
- Protected route requiring roles: `['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']`

**Grid Type:**
- **Dual Mode**: Component supports both AG Grid and MUI Table
- Toggle controlled by `useAgGrid` state (line 456)
- AG Grid: Uses `AgGridReact` component with client-side row model
- MUI Table: Custom implementation with `TableContainer`, `Table`, `TableHead`, `TableBody`

---

## Current Search Behavior

**Search Implementation (CLIENT-SIDE):**
- State: `searchTerm` (line 443)
- Type: Simple text input with `SearchIcon`
- Filter Logic (lines 722-730):
  ```typescript
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(record =>
      Object.values(record).some(value =>
        value?.toString().toLowerCase().includes(searchLower)
      )
    );
  }
  ```
- **Searches across ALL fields** in the record object
- **Case-insensitive** partial match
- **Client-side only** - filters after fetching all records

**Limitations:**
- No field-specific search
- No operators (exact match, date comparisons, ranges)
- No quoted phrase support
- Searches entire dataset in memory (not scalable)
- No URL sync for search state

---

## Backend API Endpoints

**Current Endpoint:**
- `GET /api/baptism-records`
- Called via `churchService.fetchChurchRecords()` (line 536)
- Service file: `/var/www/orthodoxmetrics/prod/front-end/src/shared/lib/churchService.ts`

**API Call Pattern:**
```typescript
const response = await fetch(`/api/${recordType}-records?${params}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
```

**Current Query Parameters:**
- `church_id`: number (required for multi-tenancy)
- `page`: number (1-based pagination)
- `limit`: number (default: 100)
- `sortField`: string (column to sort by)
- `sortDirection`: 'asc' | 'desc'
- `search`: string (basic search term - currently unused by backend for filtering)

**Backend Server:**
- Port: 3001
- Base URL: `http://localhost:3001`
- API Router mounted at: `/api`

**Response Format:**
```typescript
{
  records: any[],
  totalRecords: number,
  currentPage: number,
  totalPages: number
}
```

---

## Database Schema

**Table Name:** `baptism_records` (per church database: `om_church_{id}`)

**Key Columns (from BaptismRecord interface):**

### Person Fields
- `person_first` / `first_name` / `firstName`
- `person_middle`
- `person_last` / `last_name` / `lastName`
- `person_full`

### Date Fields
- `birth_date` / `dateOfBirth`
- `baptism_date` / `dateOfBaptism`
- `reception_date`

### Location Fields
- `place_name` / `placeOfBirth` / `birthplace`
- `placeOfBaptism`

### Parent Fields
- `father_name` / `fatherName`
- `mother_name` / `motherName`

### Officiant Fields
- `officiant_name` / `clergy` / `priest`

### Godparents
- `godparents` (JSON array or string)
- `godparentNames`
- `sponsors`

### Registry Fields
- `certificate_no`
- `book_no`
- `page_no`
- `entry_no`
- `registryNumber`

### Metadata
- `source_system`
- `source_row_id`
- `source_hash`
- `church_id` (foreign key)
- `notes`
- `created_at` / `createdAt`
- `updated_at` / `updatedAt`
- `createdBy`

**Multi-Tenancy:**
- Each church has its own database: `om_church_{church_id}`
- Church scoping enforced via `church_id` parameter
- Backend must route queries to correct church database

---

## Current Pagination & Sorting

**Pagination:**
- Client-side pagination using `useMemo` (line 753)
- State: `page` (0-based), `rowsPerPage` (default: 10)
- Slices filtered records: `filtered.slice(startIndex, startIndex + rowsPerPage)`

**Sorting:**
- Client-side sorting using `useMemo` (line 719)
- State: `sortConfig` with `key` and `direction`
- Sorts entire filtered dataset in memory

**Problem:**
- Both pagination and sorting happen AFTER fetching all records
- Not scalable for large datasets
- Backend pagination parameters are sent but not used for actual filtering

---

## Export Functionality

**Export Button:**
- Uses AG Grid's built-in export when in AG Grid mode
- Custom export implementation for MUI Table mode
- Exports currently filtered dataset (respects search/filters)

---

## Record Types Support

**Polymorphic Component:**
- Supports: `baptism`, `marriage`, `funeral`
- State: `selectedRecordType` (line 445)
- Uses `FIELD_DEFINITIONS` and `RECORD_TYPES` constants
- Different column definitions per record type

---

## Authentication & Authorization

**Church Scoping:**
- Super admins can select any church (dropdown)
- Other roles see only their assigned church
- Church selection stored in `selectedChurch` state
- Church ID passed to all API calls

**Role-Based Access:**
- Route protected by `ProtectedRoute` component
- Allowed roles: admin, super_admin, church_admin, priest, deacon, editor

---

## Dependencies

**Frontend:**
- AG Grid Community (`ag-grid-community`, `ag-grid-react`)
- MUI (`@mui/material`, `@mui/icons-material`)
- React Router (`react-router-dom`)
- Custom services: `churchService`, `RecordsApiService`

**Backend:**
- Express.js (assumed)
- MariaDB/MySQL (multi-tenant per-church databases)
- Session-based authentication

---

## Issues to Address with Power Search

1. **Client-side filtering** - Need server-side filtering
2. **No field-specific search** - Need column-scoped queries
3. **No operators** - Need =, ~, >, <, .. support
4. **No quoted phrases** - Need phrase matching
5. **Pagination inefficiency** - Need true server-side pagination
6. **Sorting inefficiency** - Need server-side sorting
7. **No URL sync** - Search state not in URL
8. **No search help** - Users don't know syntax
9. **No field aliases** - Need user-friendly field names
10. **No indexes** - Need DB indexes for performance

---

## Next Steps

1. Create backend query parser with operator support
2. Implement `/api/records/baptism` endpoint with Power Search
3. Add database indexes for searchable fields
4. Update frontend with Power Search UI
5. Add URL sync for search queries
6. Add help popover with examples
7. Write tests for parser and SQL builder
8. Document Power Search grammar

---

**End of Current State Documentation**
