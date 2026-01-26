# Date Formatting and Admin Endpoint Fix

## Summary

Fixed two critical issues:
1. **Date fields displaying ISO timestamps** instead of `YYYY-MM-DD` format
2. **Console spam from 403/404 admin endpoint errors**

---

## Part 1: Date Formatting Fix

### Problem
Date fields (Date Of Birth, Date Of Baptism, etc.) were displaying as ISO timestamps like `2005-01-03T05:00:00.000Z` instead of `2005-01-03`.

### Solution

#### 1. Updated `getCellValue` function
**File**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

**Changes**:
- Changed `formatDate` to return empty string instead of 'N/A' for empty dates
- Added date field detection by name pattern (fields containing 'date' or '_date')
- All date fields now use `formatRecordDate` from `@/utils/formatDate`

**Key changes**:
```typescript
// Before: returned 'N/A' for empty dates
const formatDate = (dateString: string | null | undefined) => {
  const formatted = formatRecordDate(dateString);
  return formatted || 'N/A';
};

// After: returns empty string for empty dates
const formatDate = (dateString: string | null | undefined) => {
  return formatRecordDate(dateString) || '';
};

// Added date field detection in default case
const isDateField = column.field && (
  column.field.includes('date') || 
  column.field.includes('Date') ||
  column.field.includes('_date')
);
if (isDateField) {
  return formatDate(record[column.field]);
}
```

#### 2. Updated detail view date rendering
**File**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` (line ~1613)

**Change**: Applied `formatRecordDate` to dateOfBaptism in detail view:
```typescript
{ key: 'dateOfBaptism', label: 'Date', value: formatRecordDate(originalRecord.dateOfBaptism) || '', ... }
```

#### 3. Existing formatters already in place
- **AG Grid**: Already uses `formatRecordDate` via `valueFormatter` (line ~1751)
- **DynamicRecordsDisplay**: Uses `renderCellValue` which calls `formatRecordDate` for date fields
- **generateColumnsFromFieldMapper**: Already uses `formatRecordDate` (line ~1400)

### Date Fields Covered
- `birth_date` / `dateOfBirth`
- `reception_date` / `dateOfBaptism`
- `mdate` / `marriageDate`
- `deceased_date` / `deathDate`
- `burial_date` / `burialDate`
- Any field containing 'date' or '_date' (automatic detection)

---

## Part 2: Admin Endpoint Spam Fix

### Problem
Console was flooded with 403/404 errors from admin endpoints:
- `/api/admin/churches/:id/tables`
- `/api/admin/churches/:id/field-mapper`
- `/api/admin/churches/:id/tables/:table/columns`

These endpoints are admin-only and fail for non-admin users, causing repeated errors.

### Solution

#### 1. Created admin endpoint cache utility
**File**: `front-end/src/features/records-centralized/utils/adminEndpointCache.ts` (NEW)

**Features**:
- In-memory cache with 5-minute TTL per churchId+recordType+endpoint
- `safeAdminFetch`: Handles 403/404 gracefully (returns null, doesn't throw)
- `hasAdminPermission`: Checks if user has admin role
- Single warning per endpoint per session (no spam)

**Key functions**:
```typescript
// Cache management
getCached<T>(churchId, recordType, endpoint): T | null
setCached<T>(churchId, recordType, endpoint, data): void
clearCache(churchId?, recordType?): void

// Safe fetch with error handling
safeAdminFetch(url, options): Promise<{ok, data, status} | null>

// Permission check
hasAdminPermission(user): boolean
```

#### 2. Updated `fetchFieldMappings` function
**File**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` (line ~1279)

**Changes**:
- Checks cache before making API calls
- Uses `safeAdminFetch` instead of direct `fetch` (handles 403/404 gracefully)
- Falls back to inferred columns from records if admin endpoint unavailable
- Falls back to default columns if no records available
- Only logs warnings once per session (not on every render)

**Fallback strategy**:
1. Try cached data (if available and fresh)
2. Try admin endpoint (if user has permission)
3. Infer columns from first record (if records loaded)
4. Use default columns based on record type (if no records)

**Default columns by type**:
- Baptism: `['id', 'first_name', 'last_name', 'birth_date', 'reception_date']`
- Marriage: `['id', 'fname_groom', 'lname_groom', 'fname_bride', 'lname_bride', 'mdate']`
- Funeral: `['id', 'name', 'lastname', 'deceased_date', 'burial_date']`

#### 3. Error handling improvements
- 403/404 responses: Silent (expected for non-admin users)
- Other errors: Single warning per endpoint per session
- Network errors: Single warning, graceful fallback
- No retry loops: Failed requests don't retry automatically

---

## Files Changed

### Frontend

1. **`front-end/src/features/records-centralized/utils/adminEndpointCache.ts`** (NEW)
   - Cache utility for admin endpoints
   - Safe fetch wrapper
   - Permission checking

2. **`front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`**
   - Updated `getCellValue`: Better date formatting, empty string for empty dates
   - Updated `fetchFieldMappings`: Cache, graceful fallback, no spam
   - Updated detail view: Uses `formatRecordDate` for dates

### Note on Marriage/Funeral Pages
- `MarriageRecordsPage.tsx` and `FuneralRecordsPage.tsx` are wrappers around `BaptismRecordsPage.tsx`
- All fixes automatically apply to all three record types

---

## Verification

### Date Formatting
1. Navigate to `/apps/records/baptism?church=46`
2. Check date columns (Date Of Birth, Date Of Baptism)
3. Should show: `2005-01-03` (not `2005-01-03T05:00:00.000Z`)
4. Works in both Normal and Advanced (AG Grid) views

### Admin Endpoint Spam
1. Open browser console
2. Navigate to records page as non-admin user
3. Should see:
   - At most ONE warning per endpoint per session
   - No repeated 403/404 errors
   - Page functions normally with inferred/default columns

### Console Output (Expected)
```
⚠️ Using inferred columns for baptism (admin endpoint unavailable)
```
(Only once, not repeated)

---

## Testing Checklist

- [x] Date fields show `YYYY-MM-DD` format in Normal view
- [x] Date fields show `YYYY-MM-DD` format in Advanced (AG Grid) view
- [x] Empty dates show empty string (not 'N/A' or '—')
- [x] No ISO timestamps visible in UI
- [x] Console has no repeated 403/404 errors
- [x] Page works for non-admin users (uses inferred/default columns)
- [x] Page works for admin users (uses admin endpoints when available)
- [x] Cache prevents repeated API calls
- [x] Graceful fallback when admin endpoints unavailable

---

## Impact

### Date Formatting
- ✅ All date fields consistently formatted as `YYYY-MM-DD`
- ✅ No timezone drift (uses string split, not Date object)
- ✅ Works across all record types (Baptism, Marriage, Funeral)
- ✅ Works in all views (Normal table, AG Grid, Detail view)

### Admin Endpoints
- ✅ No console spam (single warning per endpoint per session)
- ✅ Graceful degradation for non-admin users
- ✅ Caching reduces API calls
- ✅ Page remains functional even when admin endpoints fail

---

**Status**: ✅ Complete
**Date**: 2025-01-XX
