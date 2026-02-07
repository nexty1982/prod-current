# Records Persistence & Auto-Refresh Implementation Guide

## Overview

This document describes the implementation of persistent church selection and records view state with automatic refresh after mutations.

## Goals

1. **Persistent Church Selection** - Selected church survives page refresh
2. **Persistent Last View** - Last visited records page (type, filters, pagination) survives refresh
3. **Auto-Refresh After Mutations** - Records list automatically updates after create/update/delete
4. **Global Solution** - Works for all churches, not hardcoded to church 46

## Architecture

### Components Created

1. **`/store/useSelectedChurchStore.ts`** - localStorage-backed church ID persistence
2. **`/store/useLastRecordsViewStore.ts`** - localStorage-backed last view persistence
3. **`/events/recordsEvents.ts`** - Global event emitter for records mutations
4. **`/hooks/useRecordsPersistence.ts`** - React hook for managing persistence

### Storage Keys

- `om.selectedChurchId` - Stores: `{ churchId: number, databaseName?: string }`
- `om.lastRecordsView` - Stores: `{ recordType, churchId, path, query, timestamp }`

### Event System

Global `recordsEvents` emitter:
- **Event**: `RecordsChangedEvent { churchId, recordType, mutationType, recordId?, timestamp }`
- **Mutations**: `create`, `update`, `delete`
- **Subscribers**: Records list components listen and refresh when their church/type matches

## Implementation Steps

### Step 1: Update BaptismRecordsPage.tsx

Add persistence and auto-refresh:

```typescript
import { useRecordsPersistence, getPersistedChurchId } from '@/hooks/useRecordsPersistence';
import { recordsEvents, useRecordsEvents } from '@/events/recordsEvents';

// In component:
const BaptismRecordsPage = () => {
  // Initialize with persisted church ID
  const [selectedChurch, setSelectedChurch] = useState<number>(() => {
    return getPersistedChurchId() || 0;
  });

  // Use persistence hook
  useRecordsPersistence(
    selectedChurch,
    selectedRecordType,
    setSelectedChurch, // Restore callback
    setSelectedRecordType // Restore callback
  );

  // Subscribe to records events for auto-refresh
  useRecordsEvents((event) => {
    if (event.churchId === selectedChurch && event.recordType === selectedRecordType) {
      console.log(`📡 Auto-refreshing ${selectedRecordType} records after ${event.mutationType}`);
      fetchRecords(selectedRecordType, selectedChurch);
    }
  }, [selectedChurch, selectedRecordType]);

  // ... rest of component
};
```

### Step 2: Update Mutation Handlers

Emit events after successful mutations:

```typescript
import { recordsEvents } from '@/events/recordsEvents';

// After create
const response = await apiService.createRecord(selectedRecordType, newRecord);
if (response.success) {
  recordsEvents.emit({
    churchId: selectedChurch,
    recordType: selectedRecordType,
    mutationType: 'create',
    recordId: response.data?.id
  });
  // No need to manually call fetchRecords - event listener will handle it
}

// After update
const response = await apiService.updateRecord(selectedRecordType, id, data);
if (response.success) {
  recordsEvents.emit({
    churchId: selectedChurch,
    recordType: selectedRecordType,
    mutationType: 'update',
    recordId: id
  });
}

// After delete
const response = await apiService.deleteRecord(selectedRecordType, id);
if (response.success) {
  recordsEvents.emit({
    churchId: selectedChurch,
    recordType: selectedRecordType,
    mutationType: 'delete',
    recordId: id
  });
}
```

### Step 3: Update Church Selection Handler

Persist when church changes:

```typescript
import { persistChurchId } from '@/hooks/useRecordsPersistence';

const handleChurchChange = (newChurchId: number) => {
  setSelectedChurch(newChurchId);
  persistChurchId(newChurchId); // Auto-persisted by hook, but can call directly
  fetchRecords(selectedRecordType, newChurchId);
};
```

### Step 4: Boot-Time Navigation Restore (Optional)

In App.tsx or Router.tsx, restore last view on app boot:

```typescript
import { getPersistedLastView, buildRecordsUrl } from '@/store/useLastRecordsViewStore';
import { getPersistedChurchId } from '@/hooks/useRecordsPersistence';

useEffect(() => {
  const churchId = getPersistedChurchId();
  const lastView = getPersistedLastView();
  
  if (churchId && lastView && location.pathname === '/') {
    // User has a saved view, redirect to it
    const url = buildRecordsUrl(lastView);
    navigate(url, { replace: true });
  }
}, []);
```

## Testing Checklist

### Test 1: Church Persistence
1. Select church 46
2. Navigate to Marriage records
3. Refresh browser (F5)
4. ✅ Should stay on church 46
5. ✅ Should stay on Marriage records (not default to Baptism)

### Test 2: Create Record Auto-Refresh
1. Select church 46, Marriage records
2. Click "Add Record"
3. Fill form and save
4. ✅ List should automatically refresh and show new record
5. ✅ Should stay on same church/type/page

### Test 3: Update Record Auto-Refresh
1. Select church 46, Marriage records
2. Click edit on a record
3. Change data and save
4. ✅ List should automatically refresh and show updated data
5. ✅ Should stay on same church/type/page

### Test 4: Delete Record Auto-Refresh
1. Select church 46, Marriage records
2. Click delete on a record
3. Confirm deletion
4. ✅ List should automatically refresh and record should be gone
5. ✅ Should stay on same church/type/page

### Test 5: Cross-Tab Sync (Optional)
1. Open two tabs with records page
2. In tab 1: change church to 46
3. In tab 2: check if church updates
4. ✅ Should sync via storage events (if implemented)

## Troubleshooting

### Issue: Church resets to 0 on refresh
**Cause**: localStorage not being read on mount
**Fix**: Ensure `useState` initializer calls `getPersistedChurchId()`

### Issue: Records don't auto-refresh after mutation
**Cause**: Event not being emitted or listener not subscribed
**Fix**: Check console for event emission logs, verify listener is active

### Issue: Wrong record type loads on refresh
**Cause**: Last view not being persisted correctly
**Fix**: Check `useRecordsPersistence` hook is called with correct params

### Issue: Filters/pagination lost on refresh
**Cause**: URL params not being persisted in lastRecordsView
**Fix**: Ensure search params are included in view state

## Performance Considerations

1. **Event Listeners**: Automatically cleaned up via useEffect return
2. **localStorage Writes**: Debounced via useEffect dependencies
3. **Refresh Calls**: Only triggered when church/type matches event
4. **Memory**: Event emitter uses Set for O(1) add/remove

## Future Enhancements

1. **Cross-Tab Sync**: Listen to storage events for real-time sync
2. **Optimistic Updates**: Update UI before API response
3. **Undo/Redo**: Store mutation history for rollback
4. **Conflict Resolution**: Handle concurrent edits from multiple users
5. **Offline Support**: Queue mutations when offline, sync when online

## Migration Notes

### From Old System
- Old: Church selection in component state only
- New: Church selection in localStorage + component state
- Migration: Automatic - first selection will persist

### Breaking Changes
- None - fully backward compatible
- Existing code continues to work
- New features opt-in via hooks

## API Reference

### useRecordsPersistence

```typescript
const { 
  getPersistedChurchId,
  persistChurchId,
  getPersistedLastView,
  persistLastView 
} = useRecordsPersistence(
  currentChurchId: number | null,
  currentRecordType: string,
  onChurchRestore?: (churchId: number) => void,
  onRecordTypeRestore?: (recordType: string) => void
);
```

### recordsEvents

```typescript
// Emit event
recordsEvents.emit({
  churchId: number,
  recordType: 'baptism' | 'marriage' | 'funeral',
  mutationType: 'create' | 'update' | 'delete',
  recordId?: string | number
});

// Subscribe (in component)
useRecordsEvents((event: RecordsChangedEvent) => {
  // Handle event
}, [dependencies]);

// Subscribe (manual)
const unsubscribe = recordsEvents.subscribe((event) => {
  // Handle event
});
// Later: unsubscribe();
```

## Files Modified

1. ✅ `/store/useSelectedChurchStore.ts` - Created
2. ✅ `/store/useLastRecordsViewStore.ts` - Created
3. ✅ `/events/recordsEvents.ts` - Created
4. ✅ `/hooks/useRecordsPersistence.ts` - Created
5. ⏳ `/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` - To update
6. ⏳ `/features/records-centralized/components/marriage/MarriageRecordsPage.tsx` - To update
7. ⏳ `/features/records-centralized/components/death/FuneralRecordsPage.tsx` - To update

## Status

- [x] Storage utilities created
- [x] Event system created
- [x] Persistence hook created
- [ ] BaptismRecordsPage updated
- [ ] Mutation handlers emit events
- [ ] Auto-refresh listeners added
- [ ] Testing completed

## Next Steps

1. Update BaptismRecordsPage with persistence hooks
2. Add event emissions to create/update/delete handlers
3. Add event listeners for auto-refresh
4. Test all 4 scenarios
5. Replicate to MarriageRecordsPage and FuneralRecordsPage
6. Document any edge cases discovered during testing
