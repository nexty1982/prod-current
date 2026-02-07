# Records Row Selection & Highlighting Guide

## Overview

This document describes the row selection persistence and "new within 24 hours" highlighting features for the Records system.

## Features Implemented

### 1. **Persistent Row Selection**
- Last selected record row persists across page refreshes
- Automatically re-highlights and scrolls to last selected row
- Works across all record types (baptism, marriage, funeral)
- Global implementation - works for any church

### 2. **New Record Highlighting (24h)**
- Records created within last 24 hours automatically highlighted
- Green border and subtle background color
- Updates every 60 seconds (no constant re-renders)
- Performance optimized - O(1) per row

### 3. **Visual Feedback**
- Legend chips showing "New (24h)" and "Selected" indicators
- Clear Selection button
- Combined highlighting when record is both new AND selected

---

## Storage Keys

### `om.lastSelectedRecord`
```json
{
  "churchId": 46,
  "recordType": "marriage",
  "recordId": "261",
  "selectedAt": "2026-02-06T19:35:00.000Z"
}
```

---

## Architecture

### Files Created

1. **`/features/records/common/recordsSelection.ts`**
   - localStorage persistence for last selected record
   - Functions: `getLastSelectedRecord()`, `setLastSelectedRecord()`, `clearLastSelectedRecord()`

2. **`/features/records/common/recordsHighlighting.ts`**
   - Utilities for determining if record is new (within 24h)
   - Row styling functions for Material-UI and AG Grid
   - `useNowReference()` hook for stable timestamp (updates every 60s)

3. **`/features/records/common/usePersistedRowSelection.ts`**
   - React hook for managing row selection persistence
   - Automatic restore on mount
   - Scroll-to-selected functionality for AG Grid

4. **`/features/records/common/recordsHighlighting.css`**
   - CSS classes: `.row-last-selected`, `.row-new-24h`
   - Dark mode support
   - Hover states

### Files Modified

1. **`BaptismRecordsPage.tsx`**
   - Integrated `usePersistedRowSelection` hook
   - Added `useNowReference` for 24h highlighting
   - Material-UI table rows: `getRecordRowStyle()` for styling
   - AG Grid: `rowClassRules` and `getRowId` configuration
   - Create mutation: sets newly created record as selected
   - Visual legend with chips

---

## Row Highlighting Rules

### CSS Classes

**`.row-last-selected`** - Blue highlight
- Background: `rgba(33, 150, 243, 0.15)`
- Border-left: `3px solid #2196f3`
- Font-weight: `500`

**`.row-new-24h`** - Green highlight
- Background: `rgba(76, 175, 80, 0.08)`
- Border-left: `3px solid #4caf50`

**`.row-last-selected.row-new-24h`** - Combined (selected wins)
- Background: `rgba(33, 150, 243, 0.15)` (blue)
- Border-left: `4px solid #4caf50` (green)
- Box-shadow: `inset 0 0 0 1px rgba(76, 175, 80, 0.3)`

### Material-UI Styling

```typescript
const rowStyle = getRecordRowStyle(
  record,
  isRecordSelected(record.id),
  nowReference
);

<TableRow sx={{ ...rowStyle }} />
```

### AG Grid Configuration

```typescript
<AgGridReact
  getRowId={(params) => String(params.data.id)}
  rowClassRules={getAgGridRowClassRules(isRecordSelected, nowReference)}
  onRowClicked={(event) => handleRowSelect(event.data.id)}
/>
```

---

## Created Timestamp Detection

The system checks multiple field names to find the creation timestamp:

1. `record.created_at` (preferred)
2. `record.createdAt` (camelCase variant)
3. `record.entry_date` (fallback, less accurate)

```typescript
const createdAt = getRecordCreatedAt(record);
const isNew = isRecordNewWithin24Hours(record, nowReference);
```

---

## Usage Examples

### Basic Integration

```typescript
import { usePersistedRowSelection } from '@/features/records/common/usePersistedRowSelection';
import { useNowReference, getRecordRowStyle } from '@/features/records/common/recordsHighlighting';
import '@/features/records/common/recordsHighlighting.css';

const MyRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [selectedChurch, setSelectedChurch] = useState(46);
  const [selectedRecordType, setSelectedRecordType] = useState('marriage');
  
  // Row selection persistence
  const {
    handleRowSelect,
    clearSelection,
    isRecordSelected,
  } = usePersistedRowSelection({
    churchId: selectedChurch,
    recordType: selectedRecordType,
    records,
    onRecordNotFound: () => {
      console.log('Last selected record not on this page');
    },
  });
  
  // Stable "now" reference (updates every 60s)
  const nowReference = useNowReference();
  
  return (
    <Table>
      <TableBody>
        {records.map(record => (
          <TableRow
            key={record.id}
            onClick={() => handleRowSelect(record.id)}
            sx={getRecordRowStyle(record, isRecordSelected(record.id), nowReference)}
          >
            {/* cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

### After Create Mutation

```typescript
const response = await apiService.createRecord(recordType, newRecord);

if (response.success && response.data) {
  // Set newly created record as selected
  handleRowSelect(response.data.id);
  
  // Emit event for auto-refresh
  recordsEvents.emit({
    churchId: selectedChurch,
    recordType: selectedRecordType,
    mutationType: 'create',
    recordId: response.data.id
  });
}
```

---

## Performance Considerations

### 1. **Stable Now Reference**
- `useNowReference()` updates every 60 seconds
- Prevents constant re-renders from timestamp comparisons
- Memoized based on minute boundary

### 2. **O(1) Row Evaluation**
- Each row styling is independent
- No full-table scans
- Only evaluates visible rows

### 3. **AG Grid Optimization**
- `getRowId` enables efficient row updates
- `rowClassRules` evaluated per row, not per render
- Class-based styling (CSS) vs inline styles

### 4. **localStorage Writes**
- Only on row selection (user action)
- Not on every render
- Automatic cleanup via React hooks

---

## Testing Checklist

### Test 1: Row Selection Persistence
1. Select church 46, Marriage records
2. Click on a record row
3. Refresh browser (F5)
4. **Expected**: 
   - Church 46 and Marriage records persist
   - Same row is highlighted (blue)
   - Row is visible (scrolled into view if AG Grid)

### Test 2: New Record Highlighting
1. Create a new record
2. **Expected**:
   - New record appears in list
   - Highlighted with green border (new 24h)
   - Also highlighted with blue (selected)
   - Both highlights visible (blue background + green border)

### Test 3: Existing New Records
1. Navigate to records page
2. **Expected**:
   - Any records with `created_at` within last 24 hours show green highlight
   - Older records have no highlight

### Test 4: Clear Selection
1. Select a record
2. Click "Clear Selection" button
3. **Expected**:
   - Blue highlight removed
   - localStorage cleared
   - Green highlight (if new) remains

### Test 5: Record Not on Current Page
1. Select a record on page 2
2. Navigate to page 1
3. Refresh browser
4. **Expected**:
   - Toast message: "Last selected record is not on this page"
   - No row highlighted
   - No errors

### Test 6: Cross-Record-Type
1. Select a record in Marriage
2. Navigate to Baptism
3. **Expected**:
   - No row highlighted (different record type)
4. Navigate back to Marriage
5. **Expected**:
   - Same row highlighted again

---

## Troubleshooting

### Issue: Row not highlighting after refresh
**Cause**: `created_at` field missing or null
**Fix**: Ensure backend returns `created_at` timestamp in ISO format

### Issue: All rows highlighted as new
**Cause**: `nowReference` not updating or timezone issue
**Fix**: Check `useNowReference()` hook, verify server/client timezone alignment

### Issue: Selection not persisting
**Cause**: localStorage blocked or quota exceeded
**Fix**: Check browser console for localStorage errors

### Issue: Performance degradation
**Cause**: Too many rows rendering at once
**Fix**: Ensure pagination is enabled (default 25 rows per page)

### Issue: Highlighting flickers
**Cause**: `nowReference` changing too frequently
**Fix**: Verify `useNowReference()` memoization (should update every 60s, not every render)

---

## Browser Compatibility

- ✅ Chrome/Edge (tested)
- ✅ Firefox (tested)
- ✅ Safari (tested)
- ✅ localStorage required (no fallback)

---

## Future Enhancements

1. **Multi-Select**: Allow selecting multiple rows
2. **Keyboard Navigation**: Arrow keys to move selection
3. **Custom Highlight Duration**: User preference for "new" threshold (12h, 24h, 48h)
4. **Highlight Animation**: Subtle pulse on newly created records
5. **Cross-Tab Sync**: Update selection when changed in another tab

---

## API Reference

### recordsSelection.ts

```typescript
// Get last selected record
const lastSelected = getLastSelectedRecord();
// Returns: { churchId, recordType, recordId, selectedAt } | null

// Set last selected record
setLastSelectedRecord({
  churchId: 46,
  recordType: 'marriage',
  recordId: '261'
});

// Clear selection
clearLastSelectedRecord();

// Check if record is selected
const isSelected = isLastSelectedRecord(recordId, churchId, recordType);
```

### recordsHighlighting.ts

```typescript
// Get created timestamp
const createdAt = getRecordCreatedAt(record);
// Returns: Date | null

// Check if new within 24h
const isNew = isRecordNewWithin24Hours(record, nowReference);
// Returns: boolean

// Get CSS class string
const className = getRecordRowClass(record, isSelected, nowReference);
// Returns: "row-last-selected row-new-24h" | "row-new-24h" | "row-last-selected" | ""

// Get Material-UI style object
const style = getRecordRowStyle(record, isSelected, nowReference);
// Returns: React.CSSProperties

// Get AG Grid row class rules
const rules = getAgGridRowClassRules(isRecordSelected, nowReference);
// Returns: { 'row-last-selected': Function, 'row-new-24h': Function }
```

### usePersistedRowSelection.ts

```typescript
const {
  selectedRecordId,      // Current selected ID
  handleRowSelect,       // (recordId) => void
  clearSelection,        // () => void
  isRecordSelected,      // (recordId) => boolean
  scrollToSelectedRecord // (gridApi?) => void - AG Grid only
} = usePersistedRowSelection({
  churchId: number,
  recordType: 'baptism' | 'marriage' | 'funeral',
  records: any[],
  onRecordNotFound?: () => void
});
```

---

## Summary

- ✅ **Persistent row selection** across refreshes
- ✅ **24-hour new record highlighting** with green border
- ✅ **Visual legend** with chips and clear button
- ✅ **Performance optimized** - O(1) per row, 60s update cycle
- ✅ **Global implementation** - works for all churches and record types
- ✅ **AG Grid and Material-UI** support
- ✅ **Automatic selection** of newly created records
- ✅ **Cross-component coordination** via events system

**Version**: 1.0  
**Last Updated**: 2026-02-06  
**Author**: Orthodox Metrics Development Team
