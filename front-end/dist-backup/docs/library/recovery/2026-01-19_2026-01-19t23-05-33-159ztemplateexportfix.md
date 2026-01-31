# Template Export Format Fix

## Problem

When exporting a template from Field Mapper, the template was stored with a versioned structure:
```json
{
  "version": 1,
  "source": {...},
  "columns": [...],
  "ui": {...}
}
```

But Live Table Builder expects `template.fields` to be a flat array:
```json
[
  {
    "column": "first_name",
    "label": "First Name",
    "type": "string",
    "required": false
  }
]
```

This caused the error: `TypeError: c.fields.map is not a function`

## Solution

### Backend Fix

**File:** `server/routes/admin/churches.js` (export-template endpoint)

**Change:** Convert the versioned structure to a flat array before storing:

```javascript
// Convert columns to Live Table Builder format (flat array)
const fieldsArray = templateFields.columns.map((col, index) => ({
  column: col.name || `col_${index}`,
  label: col.label || col.name,
  type: col.type || 'string',
  required: col.required || false
}));

// Store flat array as fields (Live Table Builder format)
fields: JSON.stringify(fieldsArray)
```

### Frontend Fix (Backward Compatibility)

**File:** `front-end/src/features/devel-tools/live-table-builder/LiveTableBuilderPage.tsx`

**Change:** Added format detection to handle both old and new formats:

```typescript
// Handle both formats:
// 1. Flat array format: [{ column, label, type, required }]
// 2. Versioned format: { version, columns: [...], ui: {...} }
let fieldsArray: any[] = [];

if (Array.isArray(template.fields)) {
  // Format 1: Already an array
  fieldsArray = template.fields;
} else if (template.fields && typeof template.fields === 'object') {
  // Format 2: Versioned structure - extract columns array
  if (template.fields.columns && Array.isArray(template.fields.columns)) {
    fieldsArray = template.fields.columns.map((col: any) => ({
      column: col.name || col.column || `col_${fieldsArray.length}`,
      label: col.label || col.name || col.column,
      type: col.type || 'string',
      required: col.required || false
    }));
  } else {
    throw new Error('Template fields format not recognized');
  }
} else {
  throw new Error('Template fields is missing or invalid');
}
```

**Applied to:**
- `handleLoadTemplate` (line ~684)
- `handleConfirmLoadTemplate` (line ~727)

## Testing

1. **Re-export the template:**
   - Go to `/apps/church-management/:id/field-mapper?table=baptism_records`
   - Click "Export to Template" with `overwrite: true`
   - This will update the existing template with the correct format

2. **Load in Live Table Builder:**
   - Go to `/devel-tools/live-table-builder`
   - Select "English Baptism Records (Global)" from dropdown
   - Should load without errors

## Files Changed

1. `server/routes/admin/churches.js` - Export endpoint now stores flat array format
2. `front-end/src/features/devel-tools/live-table-builder/LiveTableBuilderPage.tsx` - Added format detection for backward compatibility
