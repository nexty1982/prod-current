# FieldMapperPage Component - Documentation

**Date:** December 10, 2025  
**Component:** `front-end/src/features/church/FieldMapperPage.tsx`  
**Status:** Production Ready

---

## Overview

`FieldMapperPage` is a configuration interface that allows administrators to customize how database columns are displayed in record tables. It provides functionality to:

- Rename columns with custom display names
- Control column visibility
- Configure column sortability
- Set default sort field and direction

The component integrates with `BaptismRecordsPage` (and other record pages) to apply these settings dynamically.

---

## Key Features

### 1. Column Management

- View all columns from a database table
- Rename columns with custom display names
- Show/hide columns
- Enable/disable column sorting

### 2. Table Selection

The component supports multiple record tables:
- `baptism_records`
- `marriage_records`
- `funeral_records`

### 3. URL Parameter Support

The component reads the `table` parameter from the URL to automatically load the correct table:

```typescript
const [searchParams] = useSearchParams();
const urlTableName = searchParams.get('table') || 'baptism_records';
const [tableName, setTableName] = useState<string>(urlTableName);
```

---

## Architecture

### Component Structure

```
FieldMapperPage
├── State Management
│   ├── tableName (selected table)
│   ├── rows (column definitions)
│   ├── mappings (custom display names)
│   ├── field_settings (visibility, sortable)
│   └── defaultSortField/Direction
├── API Integration
│   ├── loadColumns() - Fetch columns from database
│   └── saveSettings() - Save field mapper settings
└── UI Components
    ├── Table Selector
    ├── Column Configuration Table
    └── Save/Refresh Buttons
```

### File Location

```
front-end/src/features/church/FieldMapperPage.tsx
```

---

## State Management

### Primary State Variables

```typescript
const [tableName, setTableName] = useState<string>('baptism_records');
const [rows, setRows] = useState<Column[]>([]);
const [defaultSortField, setDefaultSortField] = useState<string>('');
const [defaultSortDirection, setDefaultSortDirection] = useState<'asc' | 'desc'>('asc');
const [saving, setSaving] = useState<boolean>(false);
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

### Column Interface

```typescript
interface Column {
  column_name: string;
  ordinal_position: number;
  new_name: string;
  is_visible: boolean;
  is_sortable: boolean;
}
```

---

## API Integration

### Loading Columns

```typescript
const loadColumns = async () => {
  if (!churchId) return;

  try {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Get column names from database
    const { columns: normalizedColumns } = await adminAPI.churches.getTableColumns(churchId, tableName);

    // Fetch existing mappings/settings
    const response = await fetch(
      `/api/admin/churches/${churchId}/field-mapper?table=${encodeURIComponent(tableName)}`,
      { credentials: 'include' }
    );

    if (response.ok) {
      const data: ApiResponse = await response.json();
      const mappings = data.mappings || {};
      const field_settings = data.field_settings || {};

      // Build rows with existing settings
      const newRows: Column[] = normalizedColumns.map((col) => ({
        column_name: col.column_name,
        ordinal_position: col.ordinal_position,
        new_name: mappings[col.column_name] || col.column_name,
        is_visible: field_settings.visibility?.[col.column_name] !== false,
        is_sortable: field_settings.sortable?.[col.column_name] !== false,
      }));

      setRows(newRows);
      setDefaultSortField(field_settings.default_sort_field || '');
      setDefaultSortDirection(field_settings.default_sort_direction || 'asc');
    }
  } catch (err) {
    setError('Failed to load columns');
  } finally {
    setLoading(false);
  }
};
```

### Saving Settings

```typescript
const saveSettings = async () => {
  if (!churchId) return;

  try {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Build mappings and field_settings objects
    const mappings: Record<string, string> = {};
    const visibility: Record<string, boolean> = {};
    const sortable: Record<string, boolean> = {};

    rows.forEach((row) => {
      if (row.new_name !== row.column_name) {
        mappings[row.column_name] = row.new_name;
      }
      visibility[row.column_name] = row.is_visible;
      sortable[row.column_name] = row.is_sortable;
    });

    const field_settings = {
      visibility,
      sortable,
      default_sort_field: defaultSortField,
      default_sort_direction: defaultSortDirection,
    };

    // Save to backend
    const response = await fetch(
      `/api/admin/churches/${churchId}/field-mapper`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          table: tableName,
          mappings,
          field_settings,
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to save settings');

    setSuccess('Field mapping saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  } catch (err) {
    setError('Failed to save field mapping settings');
  } finally {
    setSaving(false);
  }
};
```

---

## URL Parameter Integration

### Reading Table Parameter

The component automatically reads the `table` parameter from the URL:

```typescript
const [searchParams] = useSearchParams();
const urlTableName = searchParams.get('table') || 'baptism_records';
const [tableName, setTableName] = useState<string>(urlTableName);
```

### Updating Table Name from URL

```typescript
// Update tableName when URL parameter changes
useEffect(() => {
  const urlTable = searchParams.get('table');
  if (urlTable && urlTable !== tableName) {
    setTableName(urlTable);
  }
}, [searchParams, tableName]);
```

### Navigation from Records Page

When navigating from `BaptismRecordsPage`, the URL includes the table parameter:

```typescript
// From BaptismRecordsPage
const tableMap: Record<string, string> = {
  'baptism': 'baptism_records',
  'marriage': 'marriage_records',
  'funeral': 'funeral_records',
};
const tableName = tableMap[selectedRecordType] || 'baptism_records';
navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=${encodeURIComponent(tableName)}`);
```

---

## UI Components

### Table Selector

```typescript
<FormControl fullWidth sx={{ mb: 3 }}>
  <InputLabel>Select Table</InputLabel>
  <Select
    value={tableName}
    onChange={(e) => setTableName(e.target.value as string)}
  >
    <MenuItem value="baptism_records">Baptism Records</MenuItem>
    <MenuItem value="marriage_records">Marriage Records</MenuItem>
    <MenuItem value="funeral_records">Funeral Records</MenuItem>
  </Select>
</FormControl>
```

### Column Configuration Table

```typescript
<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Column Name</TableCell>
        <TableCell>Display Name</TableCell>
        <TableCell>Visible</TableCell>
        <TableCell>Sortable</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.column_name}>
          <TableCell>{row.column_name}</TableCell>
          <TableCell>
            <TextField
              value={row.new_name}
              onChange={(e) => {
                setRows((prev) =>
                  prev.map((r) =>
                    r.column_name === row.column_name
                      ? { ...r, new_name: e.target.value }
                      : r
                  )
                );
              }}
            />
          </TableCell>
          <TableCell>
            <Checkbox
              checked={row.is_visible}
              onChange={() => toggleColumnVisibility(row.column_name)}
            />
          </TableCell>
          <TableCell>
            <Checkbox
              checked={row.is_sortable}
              onChange={() => toggleColumnSortable(row.column_name)}
            />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

---

## Backend Integration

### API Endpoints

**GET** `/api/admin/churches/:id/field-mapper?table={tableName}`
- Fetches column definitions and existing field mapper settings
- Returns: `{ columns, mappings, field_settings }`

**POST** `/api/admin/churches/:id/field-mapper`
- Saves field mapper settings
- Body: `{ table, mappings, field_settings }`

### Database Storage

Settings are stored in `orthodoxmetrics_db.field_mapper_settings`:

```sql
CREATE TABLE field_mapper_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  church_id INT NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  settings_json JSON NOT NULL,
  UNIQUE KEY unique_church_table (church_id, table_name)
);
```

---

## Recent Changes (December 10, 2025)

### URL Parameter Support

**Problem:** FieldMapperPage always defaulted to `baptism_records`, even when navigating from Marriage or Funeral Records pages.

**Solution:** 
1. Added `useSearchParams` to read URL parameters
2. Initialize `tableName` state from URL parameter
3. Added `useEffect` to update `tableName` when URL changes

**Code Changes:**

```typescript
// Added import
import { useParams, useSearchParams } from 'react-router-dom';

// Read table from URL
const [searchParams] = useSearchParams();
const urlTableName = searchParams.get('table') || 'baptism_records';
const [tableName, setTableName] = useState<string>(urlTableName);

// Sync with URL changes
useEffect(() => {
  const urlTable = searchParams.get('table');
  if (urlTable && urlTable !== tableName) {
    setTableName(urlTable);
  }
}, [searchParams, tableName]);
```

**Files Modified:**
- `front-end/src/features/church/FieldMapperPage.tsx`

---

## Usage Examples

### Navigating from Baptism Records

```typescript
// In BaptismRecordsPage
navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=baptism_records`);
```

### Navigating from Marriage Records

```typescript
// In BaptismRecordsPage (when selectedRecordType === 'marriage')
navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=marriage_records`);
```

### Navigating from Funeral Records

```typescript
// In BaptismRecordsPage (when selectedRecordType === 'funeral')
navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=funeral_records`);
```

---

## Testing Checklist

- [ ] Load Field Mapper page with `?table=baptism_records`
- [ ] Load Field Mapper page with `?table=marriage_records`
- [ ] Load Field Mapper page with `?table=funeral_records`
- [ ] Verify correct table loads from URL parameter
- [ ] Change table using dropdown
- [ ] Rename a column
- [ ] Toggle column visibility
- [ ] Toggle column sortability
- [ ] Save settings
- [ ] Verify settings persist after refresh
- [ ] Navigate from Records page and verify correct table loads

---

## Related Documentation

- [BaptismRecordsPage Documentation](./BaptismRecordsPage-Documentation.md)
- [Backend API Routes](../12-9-25/backend-api-docs-routes-instructions.md)

---

**Last Updated:** December 10, 2025  
**Version:** 1.0.0

