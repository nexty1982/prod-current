# BaptismRecordsPage Component - Complete Documentation

**Date:** December 10, 2025  
**Component:** `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Field Mapper Integration](#field-mapper-integration)
7. [Record Type Switching](#record-type-switching)
8. [CRUD Operations](#crud-operations)
9. [UI Components](#ui-components)
10. [Routing & Navigation](#routing--navigation)
11. [Error Handling](#error-handling)
12. [Performance Optimizations](#performance-optimizations)
13. [Recent Fixes & Improvements](#recent-fixes--improvements)

---

## Overview

`BaptismRecordsPage` is a comprehensive, multi-purpose records management component that handles three types of church records:
- **Baptism Records** (`baptism_records`)
- **Marriage Records** (`marriage_records`)
- **Funeral Records** (`funeral_records`)

The component dynamically adapts its UI, form fields, and API calls based on the selected record type, providing a unified interface for managing all church records.

### Key Capabilities

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Bulk delete functionality
- ✅ Dynamic column display based on Field Mapper settings
- ✅ Real-time search and filtering
- ✅ Pagination and sorting
- ✅ Toast notifications for user feedback
- ✅ Duplicate record prevention
- ✅ Visual highlighting for newly added records
- ✅ Field Settings integration
- ✅ Advanced Grid view (AG Grid)
- ✅ Theme customization support

---

## Architecture

### Component Structure

```
BaptismRecordsPage
├── State Management (useState, useEffect)
├── API Integration Layer
│   ├── fetchRecords()
│   ├── fetchFieldMappings()
│   ├── fetchChurchInfo()
│   └── handleSaveRecord()
├── UI Components
│   ├── DynamicRecordsDisplay
│   ├── AdvancedGridDialog
│   ├── BrandButtons (Add, Import, Advanced Grid)
│   └── Form Dialog
└── Utilities
    ├── Data Normalization
    ├── Column Generation
    └── Field Mapping
```

### File Location

```
front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx
```

### Dependencies

```typescript
// Core React
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Material-UI Components
import { Box, Paper, Table, Dialog, Snackbar, Alert, ... } from '@mui/material';

// Internal Components
import DynamicRecordsDisplay from '../dynamic/DynamicRecordsDisplay';
import AdvancedGridDialog from '@/features/tables/AdvancedGridDialog';
import { AddRecordButton, ImportRecordsButton, AdvancedGridButton } from '@/features/records/BrandButtons';

// APIs & Utilities
import { listRecords } from '@/shared/lib/recordsApi';
import adminAPI from '@/api/admin.api';
```

---

## Core Features

### 1. Multi-Record Type Support

The component automatically detects and handles three record types:

```typescript
const getRecordTypeFromPath = () => {
  if (location.pathname.includes('/marriage')) return 'marriage';
  if (location.pathname.includes('/funeral')) return 'funeral';
  return 'baptism';
};
```

**Record Type Mapping:**
- `baptism` → `baptism_records` table
- `marriage` → `marriage_records` table
- `funeral` → `funeral_records` table

### 2. Dynamic Form Fields

Form fields change based on the selected record type:

**Baptism Records:**
- First Name, Last Name
- Date of Birth, Date of Baptism
- Place of Birth
- Entry Type (Baptism/Chrismation)
- Parents, Godparents, Priest

**Marriage Records:**
- Groom: First Name, Last Name, Parents
- Bride: First Name, Last Name, Parents
- Marriage Date
- Witnesses, Marriage License, Clergy

**Funeral Records:**
- Name, Last Name
- Date of Death, Date of Burial
- Age, Burial Location, Clergy

### 3. Field Mapper Integration

The component integrates with the Field Mapper system to:
- Display custom column names
- Control column visibility
- Configure sortable columns
- Apply field-specific settings

---

## State Management

### Primary State Variables

```typescript
// Records & Data
const [records, setRecords] = useState<BaptismRecord[]>([]);
const [churches, setChurches] = useState<Church[]>([]);
const [selectedChurch, setSelectedChurch] = useState<number>(46);
const [selectedRecordType, setSelectedRecordType] = useState<string>('baptism');

// UI State
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [dialogOpen, setDialogOpen] = useState<boolean>(false);
const [editingRecord, setEditingRecord] = useState<BaptismRecord | null>(null);

// Field Mapper State
const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
const [fieldSortable, setFieldSortable] = useState<Record<string, boolean>>({});
const [tableColumns, setTableColumns] = useState<string[]>([]);

// Selection & Highlighting
const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
const [newlyAddedRecordIds, setNewlyAddedRecordIds] = useState<Set<string>>(new Set());

// Toast Notifications
const [toastOpen, setToastOpen] = useState<boolean>(false);
const [toastMessage, setToastMessage] = useState<string>('');
const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');
```

### State Synchronization

The component uses `useEffect` hooks to synchronize state with URL parameters:

```typescript
// Sync selectedRecordType with URL
useEffect(() => {
  const newType = searchParams.get('type') || getTypeFromPath();
  if (newType !== selectedRecordType) {
    setSelectedRecordType(newType);
  }
}, [location.pathname, location.search]);
```

---

## API Integration

### Fetching Records

```typescript
const fetchRecords = async (recordType: string, churchId?: number) => {
  const tableMap: Record<string, TableKey> = {
    'baptism': 'baptism',
    'marriage': 'marriage', 
    'funeral': 'funeral'
  };

  const { rows, count } = await listRecords({
    table: tableMap[recordType],
    churchId: Number(churchId ?? 46),
    page: 1,
    limit: 1000,
    search: searchTerm,
    sortField: 'baptismDate', // or 'marriageDate', 'funeralDate'
    sortDirection: 'desc',
  });

  // Data normalization happens here
  const processedRows = rows.map((row) => {
    // Normalize field names, handle nulls, format dates
  });
};
```

### Data Normalization

The component normalizes data from different sources:

```typescript
const processedRows = rows.map((row) => {
  const o = row.originalRecord ?? row;
  
  if (table === 'baptism') {
    return {
      id: row.id || o.id || row.ID || o.ID,
      firstName: firstNonEmpty(o.first_name, o.firstName, row.first_name, ''),
      lastName: firstNonEmpty(o.last_name, o.lastName, row.last_name, ''),
      dateOfBirth: firstNonEmpty(o.birth_date, o.birthDate, row.birth_date, ''),
      dateOfBaptism: firstNonEmpty(o.reception_date, o.baptismDate, row.reception_date, ''),
      entry_type: o.entry_type ?? o.entryType ?? row.entry_type ?? '',
      // ... more fields
    };
  }
  // Similar normalization for marriage and funeral records
});
```

### API Endpoints Used

**Records:**
- `GET /api/baptism-records?church_id={id}`
- `GET /api/marriage-records?church_id={id}`
- `GET /api/funeral-records?church_id={id}`

**CRUD Operations:**
- `POST /api/baptism-records` - Create record
- `PUT /api/baptism-records/:id` - Update record
- `DELETE /api/baptism-records/:id` - Delete record
- `POST /api/baptism-records/bulk-delete` - Bulk delete

**Field Mapper:**
- `GET /api/admin/churches/:id/field-mapper?table={tableName}`
- `POST /api/admin/churches/:id/field-mapper`

**Church Info:**
- `GET /api/churches/church-info`

---

## Field Mapper Integration

### Fetching Field Mappings

```typescript
const fetchFieldMappings = async (churchId: number, tableName: string) => {
  try {
    // Map record type to database table name
    const dbTableMap: Record<string, string> = {
      'baptism': 'baptism_records',
      'marriage': 'marriage_records',
      'funeral': 'funeral_records',
    };
    
    const dbTableName = dbTableMap[tableName] || 'baptism_records';
    
    // Fetch field mapper settings
    const response = await adminAPI.churches.getTableColumns(churchId, dbTableName);
    
    setTableColumns(response.columns.map(c => c.column_name));
    setFieldMappings(response.mappings || {});
    setFieldVisibility(response.field_settings?.visibility || {});
    setFieldSortable(response.field_settings?.sortable || {});
  } catch (err) {
    console.error('Error fetching field mappings:', err);
  }
};
```

### Generating Dynamic Columns

```typescript
const generateColumnsFromFieldMapper = useMemo(() => {
  if (tableColumns.length === 0) return [];

  // Field name mapping for different variations
  const fieldNameMap: Record<string, string[]> = {
    'id': ['id', 'ID'],
    'first_name': ['first_name', 'firstName'],
    'last_name': ['last_name', 'lastName'],
    'entry_type': ['entry_type', 'entryType'],
    // ... more mappings
  };

  return tableColumns
    .filter(col => fieldVisibility[col] !== false)
    .map(col => {
      const displayName = fieldMappings[col] || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const possibleFieldNames = fieldNameMap[col] || [col];

      return {
        field: col,
        headerName: displayName,
        sortable: fieldSortable[col] !== false,
        hide: false,
        valueGetter: (row: any) => {
          // Try multiple field name variations
          for (const fieldName of possibleFieldNames) {
            if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
              return row[fieldName];
            }
          }
          return '';
        },
      };
    });
}, [tableColumns, fieldMappings, fieldVisibility, fieldSortable]);
```

---

## Record Type Switching

### Dropdown Handler

```typescript
<Select
  value={selectedRecordType}
  label="Select Record Table"
  onChange={(e) => {
    const newType = e.target.value;
    // Update state immediately for responsive UI
    setSelectedRecordType(newType);
    // Navigate to the appropriate route
    if (newType === 'marriage') {
      navigate(`/apps/records/marriage?church=${selectedChurch}&type=marriage`);
    } else if (newType === 'funeral') {
      navigate(`/apps/records/funeral?church=${selectedChurch}&type=funeral`);
    } else {
      navigate(`/apps/records/baptism?church=${selectedChurch}&type=baptism`);
    }
  }}
>
```

### URL Synchronization

The component automatically syncs with URL parameters:

```typescript
useEffect(() => {
  const getTypeFromPath = () => {
    if (location.pathname.includes('/marriage')) return 'marriage';
    if (location.pathname.includes('/funeral')) return 'funeral';
    return 'baptism';
  };
  
  const newType = searchParams.get('type') || getTypeFromPath();
  if (newType !== selectedRecordType) {
    setSelectedRecordType(newType);
  }
}, [location.pathname, location.search]);
```

### Routes

- `/apps/records/baptism?church={id}&type=baptism`
- `/apps/records/marriage?church={id}&type=marriage`
- `/apps/records/funeral?church={id}&type=funeral`

---

## CRUD Operations

### Create Record

```typescript
const handleSaveRecord = async () => {
  try {
    setLoading(true);

    // Validation
    if (selectedRecordType === 'baptism') {
      if (!formData.firstName || !formData.lastName || !formData.dateOfBaptism) {
        showToast('Please fill in required fields', 'error');
        return;
      }
    }
    // ... validation for other record types

    // Duplicate check
    if (!editingRecord) {
      const isDuplicate = records.some(record => {
        // Check for duplicate based on key fields
      });
      if (isDuplicate) {
        showToast('A record with the same details already exists', 'error');
        return;
      }
    }

    // API call
    const endpoint = selectedRecordType === 'baptism'
      ? '/api/baptism-records'
      : selectedRecordType === 'marriage'
      ? '/api/marriage-records'
      : '/api/funeral-records';

    const response = await fetch(endpoint, {
      method: editingRecord ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Failed to ${editingRecord ? 'update' : 'create'} record`);

    const result = await response.json();
    showToast(`Record ${editingRecord ? 'updated' : 'created'} successfully!`, 'success');

    // Highlight new record
    if (!editingRecord && result.record?.id) {
      setNewlyAddedRecordIds(prev => new Set(prev).add(String(result.record.id)));
      setTimeout(() => {
        setNewlyAddedRecordIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(result.record.id));
          return newSet;
        });
      }, 5000);
    }

    // Refresh records
    await fetchRecords(selectedRecordType, selectedChurch);
    setDialogOpen(false);
  } catch (err) {
    showToast('Failed to save record', 'error');
  } finally {
    setLoading(false);
  }
};
```

### Update Record

The same `handleSaveRecord` function handles both create and update operations. When `editingRecord` is set, it performs a PUT request instead of POST.

### Delete Record

```typescript
const handleDeleteRecord = async (recordId: string) => {
  if (!window.confirm('Are you sure you want to delete this record?')) return;

  try {
    setLoading(true);
    const endpoint = selectedRecordType === 'baptism'
      ? '/api/baptism-records'
      : selectedRecordType === 'marriage'
      ? '/api/marriage-records'
      : '/api/funeral-records';

    const response = await fetch(`${endpoint}/${recordId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to delete record');

    showToast('Record deleted successfully', 'success');
    await fetchRecords(selectedRecordType, selectedChurch);
  } catch (err) {
    showToast('Failed to delete record', 'error');
  } finally {
    setLoading(false);
  }
};
```

### Bulk Delete

```typescript
const handleBulkDelete = async () => {
  if (selectedRecords.size === 0) {
    showToast('Please select records to delete', 'info');
    return;
  }

  if (!window.confirm(`Are you sure you want to delete ${selectedRecords.size} record(s)?`)) return;

  try {
    setLoading(true);
    const endpoint = selectedRecordType === 'baptism'
      ? '/api/baptism-records'
      : selectedRecordType === 'marriage'
      ? '/api/marriage-records'
      : '/api/funeral-records';

    const deletePromises = Array.from(selectedRecords).map(recordId =>
      fetch(`${endpoint}/${recordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    );

    await Promise.all(deletePromises);
    showToast(`${selectedRecords.size} record(s) deleted successfully`, 'success');
    setSelectedRecords(new Set());
    await fetchRecords(selectedRecordType, selectedChurch);
  } catch (err) {
    showToast('Failed to delete records', 'error');
  } finally {
    setLoading(false);
  }
};
```

---

## UI Components

### DynamicRecordsDisplay

The main table component that displays records:

```typescript
<DynamicRecordsDisplay
  records={paginatedRecords}
  columns={generateColumnsFromFieldMapper}
  loading={loading}
  showCheckboxes={true}
  selectedRecords={Array.from(selectedRecords)}
  onRecordSelect={(recordId, isSelected) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(recordId);
      } else {
        newSet.delete(recordId);
      }
      return newSet;
    });
  }}
  onSelectAll={(isSelected) => {
    if (isSelected) {
      setSelectedRecords(new Set(paginatedRecords.map(r => String(r.id || r._id))));
    } else {
      setSelectedRecords(new Set());
    }
  }}
  showActions={true}
  onView={(record) => setViewingRecord(record)}
  onEdit={(record) => {
    setEditingRecord(record);
    // Populate form with record data
    setFormData({...});
    setDialogOpen(true);
  }}
  onDelete={handleDeleteRecord}
  rowStyle={(row) => {
    const rowId = String(row.id || row._id);
    if (newlyAddedRecordIds.has(rowId)) {
      return {
        backgroundColor: '#e8f5e9',
        borderLeft: '4px solid #4caf50',
      };
    }
    return {};
  }}
/>
```

### Brand Buttons

Styled buttons for consistent branding:

```typescript
<Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
  <Button
    variant="contained"
    startIcon={<SettingsIcon />}
    onClick={() => {
      const tableMap: Record<string, string> = {
        'baptism': 'baptism_records',
        'marriage': 'marriage_records',
        'funeral': 'funeral_records',
      };
      const tableName = tableMap[selectedRecordType] || 'baptism_records';
      navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=${encodeURIComponent(tableName)}`);
    }}
  >
    Field Settings
  </Button>
  <AddRecordButton onClick={handleAddRecord} disabled={loading} />
  <BrandImportButton onClick={() => {/* TODO */}} disabled={loading} />
  <AdvancedGridButton onClick={() => setAdvancedGridOpen(true)} disabled={loading} />
</Stack>
```

### Toast Notifications

```typescript
<Snackbar
  open={toastOpen}
  autoHideDuration={6000}
  onClose={() => setToastOpen(false)}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
>
  <Alert
    onClose={() => setToastOpen(false)}
    severity={toastSeverity}
    sx={{ width: '100%' }}
  >
    {toastMessage}
  </Alert>
</Snackbar>
```

---

## Routing & Navigation

### Route Configuration

Routes are defined in `front-end/src/routes/Router.tsx`:

```typescript
{
  path: '/apps/records/baptism',
  element: (
    <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
      <BaptismRecordsPage />
    </ProtectedRoute>
  )
},
{
  path: '/apps/records/marriage',
  element: (
    <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
      <MarriageRecordsPage />
    </ProtectedRoute>
  )
},
{
  path: '/apps/records/funeral',
  element: (
    <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
      <FuneralRecordsPage />
    </ProtectedRoute>
  )
},
```

### Field Settings Navigation

The Field Settings button navigates to the Field Mapper page with the correct table pre-selected:

```typescript
onClick={() => {
  const tableMap: Record<string, string> = {
    'baptism': 'baptism_records',
    'marriage': 'marriage_records',
    'funeral': 'funeral_records',
  };
  const tableName = tableMap[selectedRecordType] || 'baptism_records';
  navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=${encodeURIComponent(tableName)}`);
}}
```

---

## Error Handling

### API Error Handling

```typescript
try {
  const response = await fetch(endpoint, { ... });
  if (!response.ok) {
    throw new Error(`Failed to ${operation}: ${response.status}`);
  }
  // Success handling
} catch (err) {
  console.error('Error:', err);
  showToast(`Failed to ${operation}`, 'error');
  setError(err instanceof Error ? err.message : 'An error occurred');
} finally {
  setLoading(false);
}
```

### Validation Errors

```typescript
// Required field validation
if (selectedRecordType === 'baptism') {
  if (!formData.firstName || !formData.lastName || !formData.dateOfBaptism) {
    showToast('Please fill in required fields', 'error');
    setLoading(false);
    return;
  }
}

// Duplicate record validation
const isDuplicate = records.some(record => {
  // Check for duplicate based on key fields
});
if (isDuplicate) {
  showToast('A record with the same details already exists', 'error');
  setLoading(false);
  return;
}
```

---

## Performance Optimizations

### useMemo for Column Generation

```typescript
const generateColumnsFromFieldMapper = useMemo(() => {
  // Expensive column generation logic
  return tableColumns
    .filter(col => fieldVisibility[col] !== false)
    .map(col => {
      // Column mapping logic
    });
}, [tableColumns, fieldMappings, fieldVisibility, fieldSortable]);
```

### useCallback for Event Handlers

```typescript
const handleRecordSelect = useCallback((recordId: string, isSelected: boolean) => {
  setSelectedRecords(prev => {
    const newSet = new Set(prev);
    if (isSelected) {
      newSet.add(recordId);
    } else {
      newSet.delete(recordId);
    }
    return newSet;
  });
}, []);
```

### Debounced Search

Search is handled by the API, but client-side filtering can be optimized with debouncing if needed.

---

## Recent Fixes & Improvements

### December 10, 2025

#### 1. Field Settings Navigation Fix

**Problem:** Field Settings button always navigated to `baptism_records` table, regardless of current record type.

**Solution:** Updated the Field Settings button to pass the correct table name based on `selectedRecordType`:

```typescript
const tableMap: Record<string, string> = {
  'baptism': 'baptism_records',
  'marriage': 'marriage_records',
  'funeral': 'funeral_records',
};
const tableName = tableMap[selectedRecordType] || 'baptism_records';
navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=${encodeURIComponent(tableName)}`);
```

**Files Modified:**
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

#### 2. FieldMapperPage URL Parameter Support

**Problem:** FieldMapperPage didn't read the `table` parameter from URL, always defaulting to `baptism_records`.

**Solution:** Added `useSearchParams` to read and initialize `tableName` from URL:

```typescript
const [searchParams] = useSearchParams();
const urlTableName = searchParams.get('table') || 'baptism_records';
const [tableName, setTableName] = useState<string>(urlTableName);

// Update tableName when URL parameter changes
useEffect(() => {
  const urlTable = searchParams.get('table');
  if (urlTable && urlTable !== tableName) {
    setTableName(urlTable);
  }
}, [searchParams, tableName]);
```

**Files Modified:**
- `front-end/src/features/church/FieldMapperPage.tsx`

#### 3. Record Type Dropdown Double-Click Fix

**Problem:** Users had to select the dropdown option twice when switching between record types.

**Solution:** 
- Updated dropdown `onChange` to immediately update state before navigation
- Fixed `useEffect` dependencies to prevent loops
- Ensured navigation includes explicit `type` parameter

```typescript
onChange={(e) => {
  const newType = e.target.value;
  // Update state immediately for responsive UI
  setSelectedRecordType(newType);
  // Navigate with explicit type parameter
  if (newType === 'marriage') {
    navigate(`/apps/records/marriage?church=${selectedChurch}&type=marriage`);
  } else if (newType === 'funeral') {
    navigate(`/apps/records/funeral?church=${selectedChurch}&type=funeral`);
  } else {
    navigate(`/apps/records/baptism?church=${selectedChurch}&type=baptism`);
  }
}}
```

**Files Modified:**
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

### Previous Fixes (Earlier Today)

#### 4. Entry Type and ID Column Display

**Problem:** `entry_type` values not displaying, `id` column missing.

**Solution:**
- Enhanced data normalization to handle multiple field name variations
- Updated `valueGetter` in column generation to check multiple field names
- Removed `id` from `hiddenFields`

#### 5. Duplicate Record Prevention

**Problem:** Users could create duplicate records.

**Solution:** Added duplicate checking before record creation:

```typescript
if (!editingRecord) {
  const isDuplicate = records.some(record => {
    // Check for duplicate based on key fields
  });
  if (isDuplicate) {
    showToast('A record with the same details already exists', 'error');
    return;
  }
}
```

#### 6. Toast Notifications

**Problem:** Toast messages not appearing.

**Solution:** Implemented proper toast system with `Snackbar` and `Alert` components, positioned at top-center.

#### 7. Action Buttons

**Problem:** Action buttons (View, Edit, Delete) missing from table rows.

**Solution:** Ensured `showActions={true}` is passed to `DynamicRecordsDisplay` and made Actions column sticky.

---

## Testing Checklist

### Functional Testing

- [ ] Create new baptism record
- [ ] Create new marriage record
- [ ] Create new funeral record
- [ ] Update existing record
- [ ] Delete single record
- [ ] Delete multiple records (bulk delete)
- [ ] Search records
- [ ] Filter by church
- [ ] Switch between record types
- [ ] Navigate to Field Settings from each record type
- [ ] Verify Field Settings loads correct table
- [ ] Test duplicate record prevention
- [ ] Verify toast notifications appear
- [ ] Check newly added record highlighting

### UI/UX Testing

- [ ] Verify dropdown updates immediately on selection
- [ ] Check column visibility based on Field Mapper
- [ ] Verify custom column names display correctly
- [ ] Test pagination
- [ ] Test sorting
- [ ] Verify responsive design on mobile
- [ ] Check action buttons are visible and functional

### Error Handling Testing

- [ ] Test with invalid church ID
- [ ] Test with network errors
- [ ] Test with missing required fields
- [ ] Test with duplicate records
- [ ] Verify error messages display correctly

---

## Future Enhancements

### Planned Features

1. **Import/Export Functionality**
   - CSV import
   - Excel export
   - Bulk import validation

2. **Advanced Filtering**
   - Date range filters
   - Multi-field filters
   - Saved filter presets

3. **Audit Trail**
   - Track record changes
   - User activity logging
   - Change history display

4. **Print Functionality**
   - Print individual records
   - Print batch records
   - Custom print templates

5. **Advanced Search**
   - Full-text search
   - Fuzzy matching
   - Search history

---

## Troubleshooting

### Common Issues

**Issue:** Records not loading
- Check network tab for API errors
- Verify church ID is valid
- Check backend logs for database errors

**Issue:** Field Settings not loading correct table
- Verify URL includes `?table={tableName}` parameter
- Check FieldMapperPage is reading URL parameters correctly

**Issue:** Dropdown requires double-click
- Verify `selectedRecordType` state updates immediately
- Check `useEffect` dependencies aren't causing loops
- Ensure navigation includes `type` parameter

**Issue:** Columns not displaying
- Verify Field Mapper settings are saved
- Check `fieldVisibility` state
- Verify column names match database columns

---

## Related Documentation

- [FieldMapperPage Documentation](./FieldMapperPage-Documentation.md)
- [DynamicRecordsDisplay Documentation](./DynamicRecordsDisplay-Documentation.md)
- [Records API Documentation](../12-9-25/records-centralized.md)
- [Backend API Routes](../12-9-25/backend-api-docs-routes-instructions.md)

---

## Contact & Support

For issues or questions regarding this component, please refer to:
- Component file: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
- Related components in: `front-end/src/features/records-centralized/components/`

---

**Last Updated:** December 10, 2025  
**Version:** 1.0.0  
**Author:** AI Assistant (Cursor)

