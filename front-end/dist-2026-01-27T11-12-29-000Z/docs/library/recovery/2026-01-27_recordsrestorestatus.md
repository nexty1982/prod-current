# Records Restore Status

## Phase 1: Current-State Mapping

### Current Route → Component → Data Hook

| Route | Component | Data Hook | Status |
|-------|-----------|-----------|--------|
| `/apps/records/baptism?church_id=46` | `BaptismRecordsPage.tsx` | Direct fetch to `/api/baptism-records` | ✅ Working but bare-minimum |
| `/apps/records/marriage?church_id=46` | `MarriageRecordsPage.tsx` | Direct fetch to `/api/marriage-records` | ✅ Working but bare-minimum |
| `/apps/records/funeral?church_id=46` | `FuneralRecordsPage.tsx` | Direct fetch to `/api/funeral-records` | ✅ Working but bare-minimum |

**Component Locations:**
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
- `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`
- `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`

### Why It's "Bare Minimum"

**Issues Identified:**

1. **No `church_id` Query Param Support**: 
   - Components use `user?.church_id` from auth context
   - For super_admin/admin, they fetch first available church
   - **Does NOT read `church_id` from URL query params** (`?church_id=46`)

2. **Minimal Features**:
   - Basic Material-UI Table only
   - No search functionality
   - No advanced filters
   - No sorting (except pagination)
   - No row actions (view/edit/delete)
   - No record type switcher/navigation
   - Limited columns (6 columns max)
   - No "Quick Facts" widgets
   - No header statistics

3. **No Advanced Grid Mode**:
   - `AdvancedGridPage.tsx` exists but doesn't load data
   - `AdvancedGridDialog.tsx` is a placeholder
   - No AG Grid integration visible

### Record Types Current State

| Record Type | Route | Component | Backend Endpoint | Data Loading | UI Features | Status |
|-------------|-------|-----------|------------------|--------------|-------------|--------|
| Baptism | `/apps/records/baptism` | `BaptismRecordsPage` | `/api/baptism-records` | ✅ Working | ❌ Bare minimum | ⚠️ Needs restore |
| Marriage | `/apps/records/marriage` | `MarriageRecordsPage` | `/api/marriage-records` | ✅ Working | ❌ Bare minimum | ⚠️ Needs restore |
| Funeral | `/apps/records/funeral` | `FuneralRecordsPage` | `/api/funeral-records` | ✅ Working | ❌ Bare minimum | ⚠️ Needs restore |

### What the "Full UI" Should Be

Based on codebase analysis:

1. **Full Column Sets**: All relevant fields displayed (not truncated to 6 columns)
2. **Search & Filters**: Quick search + advanced filter panel
3. **Sorting**: Column-level sorting
4. **Pagination**: Already present but needs verification
5. **Row Actions**: View/Edit/Delete buttons per row
6. **Record Type Switcher**: Tabs or dropdown to switch between Baptism/Marriage/Funeral
7. **Quick Facts Widgets**: Header statistics (total records, recent additions, etc.)
8. **Advanced Grid Mode**: Optional AG Grid toggle for power users
9. **Church Context**: Proper `church_id` query param support

### Implementation Strategy

**Restore Target**: Enhance existing `records-centralized` components (not create new ones)

**Key Changes Needed**:
1. Add `useSearchParams` to read `church_id` from URL
2. Add search input component
3. Add filter panel component
4. Add sorting to table columns
5. Add row action buttons
6. Add record type switcher/tabs
7. Add header statistics/widgets
8. Optionally integrate AG Grid for advanced mode

### Files to Modify

1. `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
2. `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`
3. `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`
4. Potentially create shared components:
   - `RecordTypeSwitcher.tsx`
   - `RecordSearchBar.tsx`
   - `RecordFilters.tsx`
   - `RecordTable.tsx` (enhanced)

### Next Steps

- [x] Phase 1: Document current state ✅
- [x] Phase 2: Restore multi record-type routing with `church_id` support ✅
- [x] Phase 3: Restore full display table features ✅
- [ ] Phase 4: Verify backend data contracts
- [ ] Phase 5: Regression testing

## Phase 2 & 3: Restorations Completed

### Changes Made

#### All Record Type Pages Enhanced:
1. **`BaptismRecordsPage.tsx`** - Fully restored
2. **`MarriageRecordsPage.tsx`** - Fully restored  
3. **`FuneralRecordsPage.tsx`** - Fully restored

#### Features Added:

✅ **`church_id` Query Param Support**:
- Reads `church_id` from URL query params (`?church_id=46`)
- Falls back to `user.church_id` if not in URL
- Updates URL when church context changes
- Preserves `church_id` when switching record types

✅ **Record Type Switcher**:
- Tabs at top of page to switch between Baptism/Marriage/Funeral
- Maintains `church_id` when switching
- Active tab highlighted

✅ **Search Functionality**:
- Search bar with icon
- Searches across relevant fields (name, clergy, etc.)
- Resets to page 1 on search
- Backend supports `search` query param

✅ **Enhanced Columns**:
- **Baptism**: ID, First Name, Last Name, Birth Date, Baptism Date, Clergy, Parents, Sponsors, Actions
- **Marriage**: ID, Groom, Bride, Marriage Date, Location, Clergy, Witnesses, Actions
- **Funeral**: ID, Name, Death Date, Burial Date, Clergy, Burial Location, Actions

✅ **Sorting**:
- Click column headers to sort
- Visual indicators (↑/↓) show sort direction
- Client-side sorting (backend should handle this ideally)

✅ **Row Actions**:
- View button (navigates to detail page)
- Edit button (navigates to edit page)
- Delete button (with confirmation)

✅ **Quick Facts Widgets**:
- Total records count chip
- Showing count chip
- Church ID chip (when available)

✅ **Additional Features**:
- Refresh button
- New Record button (navigates to create page)
- Enhanced pagination (10, 25, 50, 100 rows per page)
- Loading states
- Error handling with dismissible alerts
- Hover effects on table rows

### Backend Data Contract Notes

**Current Backend Endpoints**:
- `/api/baptism-records` - Supports `page`, `limit`, `search` params
- `/api/marriage-records` - Supports `page`, `limit`, `search` params
- `/api/funeral-records` - Supports `page`, `limit` params (no search yet)

**Response Format**:
```json
{
  "records": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

**Note**: Backend endpoints don't currently filter by `church_id` query param. They use client database context from middleware. If church-specific filtering is needed, backend endpoints should be updated to:
1. Accept `church_id` query param
2. Filter records by `church_id` column (if table has it)
3. Or use church-specific database connection

### Testing

Run regression test:
```bash
node server/scripts/test-records-endpoints.js http://localhost:3001 46
```

### Remaining Work

- [ ] Backend: Add `church_id` filtering to endpoints (if needed)
- [ ] Backend: Add search support to funeral-records endpoint
- [ ] Frontend: Implement actual View/Edit/Delete functionality (currently navigates but pages may not exist)
- [ ] Frontend: Add advanced filters panel (date ranges, etc.)
- [ ] Frontend: Consider AG Grid integration for advanced mode
- [ ] Frontend: Add export functionality
