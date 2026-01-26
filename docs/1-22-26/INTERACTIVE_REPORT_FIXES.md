# Interactive Report Fixes

## Issues Fixed

### 1. Select All Button Toggle Fix

**Problem:** The "Select All" checkbox only selected all records/fields but didn't deselect when clicked again.

**Root Cause:** The checkbox logic relied on `e.target.checked` which doesn't properly handle the toggle state when all items are already selected.

**Fix Applied:**
- Changed the logic to check the current state rather than the event target
- If all items are selected, clicking deselects all
- If not all items are selected, clicking selects all

**Files Changed:**
- `front-end/src/features/records-centralized/components/interactiveReport/InteractiveReportWizard.tsx`
  - Line 215-234: Fixed "Select All" for records (Step 1)
  - Line 284-299: Fixed "Select All" for fields (Step 2)

**Code Change:**
```typescript
// Before:
onChange={(e) => {
  if (e.target.checked) {
    setSelectedRecordIds(new Set(...));
  } else {
    setSelectedRecordIds(new Set());
  }
}}

// After:
onChange={() => {
  // Toggle: if all are selected, deselect all; otherwise select all
  if (selectedRecordIds.size === incompleteRecords.length) {
    setSelectedRecordIds(new Set());
  } else {
    setSelectedRecordIds(new Set(...));
  }
}}
```

### 2. API 404 Error Handling

**Problem:** Getting 404 error when creating interactive report: `/api/records/interactive-reports` not found.

**Root Cause:** The backend routes may not be mounted in the Express app, or authentication headers are missing.

**Fix Applied:**
- Added `credentials: 'include'` to fetch request for session-based auth
- Improved error handling with specific messages for 404, 401, 403
- Added user-friendly error alert with guidance

**Files Changed:**
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
  - Line 2264-2289: Enhanced `handleInteractiveReportComplete` function

**Important:** The 404 error indicates the backend route is not mounted. You need to:

1. **Mount the routes in your Express app:**
   ```typescript
   import interactiveReportsRouter from './routes/interactiveReports';
   
   app.use('/api/records/interactive-reports', interactiveReportsRouter);
   app.use('/r/interactive', interactiveReportsRouter);
   ```

2. **Run the database migration:**
   ```bash
   psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql
   ```

3. **Verify authentication middleware exists:**
   - Ensure `backend/middleware/auth.ts` exports `authenticateToken` and `requireRole`
   - Or update the import path in `backend/routes/interactiveReports.ts`

See `backend/INTEGRATION_GUIDE.md` and `RUN_INTEGRATION.md` for complete setup instructions.

## Testing

1. **Select All Toggle:**
   - Open Interactive Report wizard
   - Step 1: Click "Select All" - should select all records
   - Click "Select All" again - should deselect all
   - Step 2: Same behavior for fields

2. **API Error Handling:**
   - If routes not mounted: Should show helpful error message
   - If unauthorized: Should show permission error
   - If other error: Should show specific error message

## Next Steps

1. Mount backend routes (see integration guides)
2. Test the full workflow after routes are mounted
3. Verify authentication is working correctly
