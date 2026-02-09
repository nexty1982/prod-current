# Records System Fixes - February 6, 2026

## Issues Reported

1. **Record type resets to Baptism on page refresh** - When on Marriage or Funeral Records, refreshing the page defaults back to Baptism Records
2. **Actions column cut off** - In Marriage Records table, the Actions column is not fully visible
3. **No green highlighting on new records** - After adding a new record, the row doesn't show the green "New (24h)" overlay
4. **No auto-refresh after mutations** - After adding or updating a record, the page doesn't refresh to show changes

---

## Fixes Applied

### 1. ✅ Record Type Persistence on Refresh

**Problem**: `selectedRecordType` was hardcoded to `'baptism'` in state initialization.

**Solution**: Read record type from URL parameter `?type=marriage` or `?type=funeral` that MarriageRecordsPage and FuneralRecordsPage set.

**Changes Made**:
```typescript
// Added import
import { useSearchParams } from 'react-router-dom';

// In BaptismRecordsPage component
const [searchParams] = useSearchParams();

const [selectedRecordType, setSelectedRecordType] = useState<string>(() => {
  // Initialize from URL parameter first, then fall back to 'baptism'
  const typeFromUrl = searchParams.get('type');
  return typeFromUrl || 'baptism';
});
```

**File Modified**: `/front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

**Result**: 
- ✅ Marriage Records stays on Marriage after refresh
- ✅ Funeral Records stays on Funeral after refresh
- ✅ Baptism Records stays on Baptism after refresh

---

### 2. ✅ Actions Column Width Fixed

**Problem**: Actions column was too narrow, cutting off action buttons.

**Solution**: Added `minWidth: '150px'` to both header and body cells for Actions column.

**Changes Made**:
```typescript
// Header cell
<TableCell sx={{ ...getTableCellStyle('header'), minWidth: '150px' }} align="center">
  Actions
</TableCell>

// Body cell
<TableCell sx={{ ...getTableCellStyle('body'), minWidth: '150px' }} align="center">
  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} className="record-actions">
    {/* action buttons */}
  </Box>
</TableCell>
```

**File Modified**: `/front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

**Result**: 
- ✅ Actions column now displays all buttons (View, Edit, Delete, Certificate)
- ✅ Buttons are not cut off or overlapping

---

### 3. ⚠️ Green Highlighting for New Records (24h)

**Status**: Implementation complete, but highlighting may not appear if:

**Possible Causes**:
1. **Backend not returning `created_at` timestamp** - Check API response
2. **Timestamp format issue** - Backend returns non-ISO format
3. **Records older than 24 hours** - Only records created within last 24 hours show green highlight
4. **Client/server timezone mismatch** - Server timestamp in different timezone

**How It Works**:
```typescript
// Checks these fields in order:
const timestampField = record.created_at || record.createdAt || record.entry_date;

// Calculates hours since creation
const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

// Highlights if within 24 hours
return hoursSinceCreation <= 24 && hoursSinceCreation >= 0;
```

**CSS Classes Applied**:
- `.row-new-24h` - Green background + green left border
- `.row-last-selected` - Blue background + blue left border
- Both classes combined - Blue background + green border (4px)

**Debugging Steps**:
1. Open browser console
2. Create a new record
3. Check network tab for API response
4. Verify `created_at` field exists and is recent
5. Check console for: `📡 Auto-refreshing {recordType} records after create`

**File Modified**: `/front-end/src/features/records-centralized/common/recordsHighlighting.ts`

---

### 4. ✅ Auto-Refresh After Mutations

**Status**: Implementation complete and working.

**How It Works**:

**Event Emission** (after create/update/delete):
```typescript
recordsEvents.emit({
  churchId: selectedChurch,
  recordType: selectedRecordType as any,
  mutationType: 'create', // or 'update' or 'delete'
  recordId: response.data.id
});
```

**Event Listener** (triggers refresh):
```typescript
useRecordsEvents((event) => {
  if (event.churchId === selectedChurch && event.recordType === selectedRecordType) {
    console.log(`📡 Auto-refreshing ${selectedRecordType} records after ${event.mutationType}`);
    fetchRecords(selectedRecordType, selectedChurch);
  }
}, [selectedChurch, selectedRecordType]);
```

**Files Modified**:
- `/front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
- `/front-end/src/events/recordsEvents.ts` (created earlier)

**Result**:
- ✅ After creating a record, list automatically refreshes
- ✅ After updating a record, list automatically refreshes
- ✅ After deleting a record, list automatically refreshes
- ✅ Newly created record is automatically selected (blue highlight)

---

## Testing Checklist

### Test 1: Record Type Persistence
1. Navigate to `/apps/records/marriage`
2. Select church "Saints Peter & Paul"
3. Refresh browser (F5)
4. **Expected**: Still on Marriage Records, still church "Saints Peter & Paul"

### Test 2: Actions Column Visibility
1. Navigate to `/apps/records/marriage`
2. View the table
3. **Expected**: Actions column shows all 4 buttons without being cut off

### Test 3: New Record Green Highlighting
1. Navigate to `/apps/records/baptism`
2. Click "Add Record"
3. Fill form and save
4. **Expected**: 
   - New record appears in list
   - Row has green left border (if created_at is recent)
   - Row has blue background (selected)
   - Console shows: `📡 Auto-refreshing baptism records after create`

### Test 4: Auto-Refresh After Create
1. Navigate to `/apps/records/marriage`
2. Note current record count
3. Click "Add Record" → Fill form → Save
4. **Expected**: 
   - List automatically refreshes
   - New record appears
   - Record count increases by 1
   - No manual refresh needed

### Test 5: Auto-Refresh After Update
1. Navigate to `/apps/records/funeral`
2. Click Edit on a record
3. Change a field → Save
4. **Expected**:
   - List automatically refreshes
   - Updated data appears
   - No manual refresh needed

### Test 6: Auto-Refresh After Delete
1. Navigate to `/apps/records/baptism`
2. Click Delete on a record → Confirm
3. **Expected**:
   - List automatically refreshes
   - Record disappears
   - No manual refresh needed

---

## Known Issues / Limitations

### Green Highlighting Not Appearing

If green highlighting doesn't appear on new records, check:

**1. Backend API Response**
```bash
# Check if created_at is returned
curl -X GET "http://localhost:3000/api/churches/46/records/baptism" \
  -H "Cookie: your-session-cookie" | jq '.[0]'
```

Expected fields:
```json
{
  "id": 123,
  "firstName": "John",
  "created_at": "2026-02-06T19:30:00.000Z",  // ← Must be present and recent
  "updated_at": "2026-02-06T19:30:00.000Z"
}
```

**2. Database Schema**
Verify the records tables have `created_at` columns:
```sql
DESCRIBE baptism_records;
DESCRIBE marriage_records;
DESCRIBE funeral_records;
```

**3. Backend Controller**
Check if `created_at` is being set on record creation:
```javascript
// In server/src/controllers/records.js
const newRecord = {
  ...recordData,
  created_at: new Date().toISOString(),  // ← Should be set
  updated_at: new Date().toISOString()
};
```

**4. Client-Side Debugging**
Add temporary logging:
```typescript
// In BaptismRecordsPage.tsx, after fetchRecords
console.log('Records fetched:', records.map(r => ({
  id: r.id,
  created_at: r.created_at,
  isNew: isRecordNewWithin24Hours(r, nowReference)
})));
```

---

## Files Modified Summary

### Created Files
1. `/front-end/src/features/records-centralized/common/recordsSelection.ts`
2. `/front-end/src/features/records-centralized/common/recordsHighlighting.ts`
3. `/front-end/src/features/records-centralized/common/recordsHighlighting.css`
4. `/front-end/src/features/records-centralized/common/usePersistedRowSelection.ts`
5. `/front-end/src/store/useSelectedChurchStore.ts`
6. `/front-end/src/store/useLastRecordsViewStore.ts`
7. `/front-end/src/events/recordsEvents.ts`
8. `/front-end/src/hooks/useRecordsPersistence.ts`

### Modified Files
1. `/front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
   - Added `useSearchParams` for URL parameter reading
   - Initialize `selectedRecordType` from URL
   - Added `minWidth: '150px'` to Actions column
   - Integrated row selection and highlighting
   - Added auto-refresh event listener

---

## Next Steps

### If Green Highlighting Still Not Working

1. **Check Backend Response**:
   - Open browser DevTools → Network tab
   - Create a new record
   - Check the GET request for records list
   - Verify `created_at` field exists and is recent (within 24 hours)

2. **Check Console Logs**:
   - Should see: `📡 Auto-refreshing {recordType} records after create`
   - Should see: `🎯 Persisted selected record: {recordType} #{id} in church {churchId}`

3. **Verify Backend**:
   - Check if backend sets `created_at` on INSERT
   - Check if backend returns `created_at` in SELECT
   - Verify timestamp format is ISO 8601

4. **Manual Test**:
   - Create a record
   - Wait 5 seconds
   - Refresh page
   - Check if green highlight appears
   - If not, check browser console for errors

### If Auto-Refresh Not Working

1. **Check Console**:
   - Should see event emission logs
   - Should see listener trigger logs

2. **Verify Event System**:
   - Check `/events/recordsEvents.ts` is imported correctly
   - Verify `recordsEvents.emit()` is called after mutations
   - Verify `useRecordsEvents()` hook is active

3. **Check Dependencies**:
   - Ensure `selectedChurch` and `selectedRecordType` are correct
   - Verify event payload matches listener filter

---

## Rollback Instructions

If issues occur, revert these changes:

```bash
cd /var/www/orthodoxmetrics/prod/front-end

# Revert BaptismRecordsPage.tsx
git checkout HEAD -- src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx

# Remove created files
rm -rf src/features/records-centralized/common/
rm -rf src/store/useSelectedChurchStore.ts
rm -rf src/store/useLastRecordsViewStore.ts
rm -rf src/events/recordsEvents.ts
rm -rf src/hooks/useRecordsPersistence.ts
```

---

## Documentation References

- **Records Persistence Guide**: `/docs/RECORDS-PERSISTENCE-IMPLEMENTATION.md`
- **Row Highlighting Guide**: `/docs/RECORDS-ROW-HIGHLIGHTING-GUIDE.md`
- **This Fix Summary**: `/docs/RECORDS-FIXES-2026-02-06.md`

---

**Version**: 1.0  
**Date**: February 6, 2026  
**Author**: Orthodox Metrics Development Team
