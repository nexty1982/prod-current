# Menu Template System - Implementation Summary

**Date:** 2026-02-07  
**Status:** ✅ Backend + Utils Complete | Frontend UI Pending  
**Goal:** Add template support for seeding super_admin menus from static files

---

## ✅ What's Been Implemented

### 1. Template File ✅
**File:** `front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts`

**Key Features:**
- Stable IDs using `namespace.slug` pattern (e.g., `devel.menu-editor`)
- Super admin menu only (no role filtering needed)
- Hierarchical structure preserved
- Section headers marked with `navlabel: true`
- Icon components (will be transformed to strings)
- Metadata export: `SuperAdminMenuMetadata`

**Namespace Conventions:**
- `dashboards.*` = Dashboard items
- `admin.*` = Admin/site management
- `church.*` = Church-related features
- `devel.*` = Developer tools
- `social.*` = Social features
- `testing.*` = Testing/QA tools
- `broken.*` = Broken links (temporary tracking)

### 2. Transformer Utility ✅
**File:** `front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts`

**Exported Functions:**
- `transformMenuTemplate(template, options?)` - Flattens tree → flat array
- `validateMenuItems(items)` - Validates normalized items
- `createTemplatePayload(templateId, role, items)` - Creates API payload

**Key Features:**
- Icon component → string mapping
- `parent_key_name` generation (not array indices)
- Section header skipping
- Order preservation via `order_index`
- Path and icon validation

**Example Usage:**
```typescript
import { SuperAdminMenuTemplate, SuperAdminMenuMetadata } from '@/layouts/full/vertical/sidebar/MenuItems-default-superadmin';
import { transformMenuTemplate, createTemplatePayload } from './transformMenuTemplate';

const normalized = transformMenuTemplate(SuperAdminMenuTemplate);
const validation = validateMenuItems(normalized);

if (validation.valid) {
  const payload = createTemplatePayload(
    SuperAdminMenuMetadata.id,  // "default-superadmins"
    SuperAdminMenuMetadata.role, // "super_admin"
    normalized
  );
  
  await fetch('/api/admin/menus/seed', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

### 3. Updated Seed Endpoint ✅
**Endpoint:** `POST /api/admin/menus/seed`  
**File:** `server/src/routes/admin/menus.js`

**New Request Body:**
```json
{
  "templateId": "default-superadmins",
  "role": "super_admin",
  "items": [
    {
      "key_name": "devel.menu-editor",
      "label": "Menu Editor",
      "path": "/admin/menu-management",
      "icon": "IconPoint",
      "order_index": 10,
      "is_active": 1,
      "parent_key_name": "devel.console",
      "meta": null
    }
  ]
}
```

**New Features:**
- ✅ Accepts `templateId` parameter (validated against whitelist)
- ✅ Accepts `role` parameter (validated: `super_admin`, `default`)
- ✅ Uses `parent_key_name` instead of numeric `parent_id`
- ✅ Tracks insert vs update counts separately
- ✅ Validates `key_name`, `path`, `icon` values
- ✅ Returns template metadata in response

**Response:**
```json
{
  "success": true,
  "message": "Successfully seeded menu from template \"default-superadmins\"",
  "templateId": "default-superadmins",
  "role": "super_admin",
  "stats": {
    "totalProcessed": 85,
    "inserted": 5,
    "updated": 80,
    "parentsResolved": 42
  }
}
```

### 4. New Reset Endpoint ✅
**Endpoint:** `POST /api/admin/menus/reset-to-template`  
**File:** `server/src/routes/admin/menus.js`

**Request Body:** (same as seed)
```json
{
  "templateId": "default-superadmins",
  "role": "super_admin",
  "items": [...]
}
```

**Behavior:**
1. Deletes all `router_menu_items` for specified role
2. Inserts all items from template (fresh start)
3. Resolves parent relationships
4. Returns delete + insert counts

**Response:**
```json
{
  "success": true,
  "message": "Successfully reset menu to template \"default-superadmins\"",
  "templateId": "default-superadmins",
  "role": "super_admin",
  "stats": {
    "deleted": 85,
    "inserted": 85,
    "parentsResolved": 42
  }
}
```

---

## ⏳ Pending: Frontend UI Updates

### What Needs to Be Done

**File to Modify:** `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx`

**UI Components to Add:**

1. **Template Selector Dropdown**
   - Location: Above the menu table
   - Options: "Default Super Admin Menu", (more templates in future)
   - State: `selectedTemplate`

2. **Seed from Template Button**
   - Label: "Seed from Template"
   - Tooltip: "Update menu items from selected template (idempotent)"
   - Action: Transform template → Call `/api/admin/menus/seed`

3. **Reset to Template Button**
   - Label: "Reset to Template"
   - Tooltip: "Delete all items and reload from template"
   - Action: Show confirm dialog → Transform template → Call `/api/admin/menus/reset-to-template`

4. **Confirmation Dialog** (for Reset)
   - Title: "Reset Menu to Template?"
   - Message: "This will DELETE all existing menu items and reload from the template. This action cannot be undone."
   - Buttons: "Cancel", "Reset"

### Implementation Steps

#### Step 1: Add State and Imports

```typescript
// Add imports
import { SuperAdminMenuTemplate, SuperAdminMenuMetadata } from '@/layouts/full/vertical/sidebar/MenuItems-default-superadmin';
import { transformMenuTemplate, validateMenuItems, createTemplatePayload } from './templates/transformMenuTemplate';

// Add state
const [selectedTemplate, setSelectedTemplate] = useState<string>('default-superadmins');
const [resetDialogOpen, setResetDialogOpen] = useState(false);
const [templateLoading, setTemplateLoading] = useState(false);
```

#### Step 2: Add Template Handler Functions

```typescript
const handleSeedFromTemplate = async () => {
  setTemplateLoading(true);
  setError(null);
  setSuccess(null);

  try {
    // Transform template
    const normalized = transformMenuTemplate(SuperAdminMenuTemplate);
    
    // Validate
    const validation = validateMenuItems(normalized);
    if (!validation.valid) {
      setError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Template warnings:', validation.warnings);
    }
    
    // Create payload
    const payload = createTemplatePayload(
      SuperAdminMenuMetadata.id,
      SuperAdminMenuMetadata.role,
      normalized
    );
    
    // Send to backend
    const response = await fetch('/api/admin/menus/seed', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to seed from template');
    }
    
    const data = await response.json();
    setSuccess(`${data.message}: ${data.stats.inserted} inserted, ${data.stats.updated} updated`);
    
    // Reload menu items
    await loadMenuItems();
    
  } catch (error) {
    console.error('Error seeding from template:', error);
    setError(error.message);
  } finally {
    setTemplateLoading(false);
  }
};

const handleResetToTemplate = async () => {
  setTemplateLoading(true);
  setError(null);
  setSuccess(null);
  setResetDialogOpen(false);

  try {
    // Transform template
    const normalized = transformMenuTemplate(SuperAdminMenuTemplate);
    
    // Validate
    const validation = validateMenuItems(normalized);
    if (!validation.valid) {
      setError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    
    // Create payload
    const payload = createTemplatePayload(
      SuperAdminMenuMetadata.id,
      SuperAdminMenuMetadata.role,
      normalized
    );
    
    // Send to backend
    const response = await fetch('/api/admin/menus/reset-to-template', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to reset to template');
    }
    
    const data = await response.json();
    setSuccess(`${data.message}: ${data.stats.deleted} deleted, ${data.stats.inserted} inserted`);
    
    // Reload menu items
    await loadMenuItems();
    
    // Reload the page to refresh the menu
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Error resetting to template:', error);
    setError(error.message);
  } finally {
    setTemplateLoading(false);
  }
};
```

#### Step 3: Add UI Components

```tsx
{/* Template Controls - Add above the menu table */}
<Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
  <FormControl sx={{ minWidth: 300 }}>
    <InputLabel>Template</InputLabel>
    <Select
      value={selectedTemplate}
      label="Template"
      onChange={(e) => setSelectedTemplate(e.target.value)}
    >
      <MenuItem value="default-superadmins">Default Super Admin Menu</MenuItem>
      {/* Add more templates in future */}
    </Select>
  </FormControl>
  
  <Button
    variant="contained"
    color="primary"
    onClick={handleSeedFromTemplate}
    disabled={templateLoading}
    startIcon={templateLoading ? <CircularProgress size={20} /> : <IconSeeding />}
  >
    Seed from Template
  </Button>
  
  <Button
    variant="outlined"
    color="warning"
    onClick={() => setResetDialogOpen(true)}
    disabled={templateLoading}
    startIcon={<IconRefresh />}
  >
    Reset to Template
  </Button>
</Box>

{/* Reset Confirmation Dialog */}
<Dialog
  open={resetDialogOpen}
  onClose={() => setResetDialogOpen(false)}
>
  <DialogTitle>Reset Menu to Template?</DialogTitle>
  <DialogContent>
    <Alert severity="warning" sx={{ mb: 2 }}>
      This will <strong>DELETE all existing menu items</strong> and reload from the template.
    </Alert>
    <Typography>
      Template: <strong>{SuperAdminMenuMetadata.name}</strong><br />
      Role: <strong>{SuperAdminMenuMetadata.role}</strong><br />
      This action cannot be undone.
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
    <Button 
      onClick={handleResetToTemplate} 
      color="warning" 
      variant="contained"
      autoFocus
    >
      Reset
    </Button>
  </DialogActions>
</Dialog>
```

---

## 🧪 Testing Plan

### Test 1: Seed Idempotency
**Objective:** Verify seeding twice doesn't create duplicates

```bash
# Get count before
curl -X GET http://localhost:3001/api/admin/menus/stats \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION"

# Seed once
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{"templateId":"default-superadmins","role":"super_admin","items":[...]}'

# Get count after first seed
curl -X GET http://localhost:3001/api/admin/menus/stats \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION"

# Seed again (same payload)
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{"templateId":"default-superadmins","role":"super_admin","items":[...]}'

# Get count after second seed
# ✅ PASS if count is same as after first seed
```

### Test 2: Label Update
**Objective:** Verify re-seeding updates existing labels

```sql
-- Before: Check current label
SELECT id, key_name, label FROM router_menu_items WHERE key_name = 'devel.menu-editor';

-- Modify template (change label from "Menu Editor" to "Menu Editor v2")
-- Re-seed

-- After: Check updated label
SELECT id, key_name, label FROM router_menu_items WHERE key_name = 'devel.menu-editor';
-- ✅ PASS if label is "Menu Editor v2"
```

### Test 3: Parent Hierarchy
**Objective:** Verify parent-child relationships are correct

```sql
-- Check parent relationships
SELECT 
  child.id,
  child.key_name as child_key,
  child.label as child_label,
  parent.key_name as parent_key,
  parent.label as parent_label
FROM router_menu_items child
LEFT JOIN router_menu_items parent ON child.parent_id = parent.id
WHERE child.parent_id IS NOT NULL
ORDER BY parent.key_name, child.sort_order;

-- ✅ PASS if parent_key matches expected parent_key_name from template
```

### Test 4: Reset to Template
**Objective:** Verify reset deletes old and seeds new

```sql
-- Before: Count items
SELECT COUNT(*) FROM router_menu_items WHERE menu_id = (SELECT id FROM menus WHERE role = 'super_admin');

-- Add a manual test item
INSERT INTO router_menu_items (menu_id, key_name, label, path, sort_order)
VALUES ((SELECT id FROM menus WHERE role = 'super_admin'), 'test.manual', 'Manual Test Item', '/test', 999);

-- After insert: Count items (should be +1)
SELECT COUNT(*) FROM router_menu_items WHERE menu_id = (SELECT id FROM menus WHERE role = 'super_admin');

-- Reset to template
curl -X POST http://localhost:3001/api/admin/menus/reset-to-template \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{"templateId":"default-superadmins","role":"super_admin","items":[...]}'

-- After reset: Count items (should be back to original)
SELECT COUNT(*) FROM router_menu_items WHERE menu_id = (SELECT id FROM menus WHERE role = 'super_admin');

-- Check if manual item was deleted
SELECT * FROM router_menu_items WHERE key_name = 'test.manual';
-- ✅ PASS if manual item doesn't exist
```

### Test 5: Invalid TemplateId
**Objective:** Verify validation rejects unknown templates

```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{"templateId":"unknown-template","role":"super_admin","items":[]}'

# ✅ PASS if returns 400 error with message about invalid templateId
```

### Test 6: Frontend Integration
**Objective:** Verify UI works end-to-end

1. Open Menu Editor
2. Select "Default Super Admin Menu" from dropdown
3. Click "Seed from Template"
4. ✅ PASS if success message appears
5. ✅ PASS if menu table refreshes
6. ✅ PASS if no duplicate rows appear
7. Click "Seed from Template" again
8. ✅ PASS if success message says "0 inserted, N updated"
9. Click "Reset to Template"
10. Confirm dialog appears
11. ✅ PASS if confirmation dialog shows warning
12. Click "Reset"
13. ✅ PASS if success message appears
14. ✅ PASS if page reloads after 2 seconds

---

## 📊 Success Criteria

- [x] ✅ Template file created with stable IDs
- [x] ✅ Transformer utility created and exported
- [x] ✅ Seed endpoint accepts `templateId` and `role`
- [x] ✅ Seed endpoint uses `parent_key_name` (not array index)
- [x] ✅ Reset endpoint deletes old + seeds new
- [x] ✅ Validation enforces allowed templates/roles/paths/icons
- [ ] ⏳ Frontend UI adds template selector
- [ ] ⏳ Frontend UI integrates transformer
- [ ] ⏳ Seeding twice doesn't create duplicates (tested)
- [ ] ⏳ Parent hierarchy preserved (tested)

---

## 📁 Files Created/Modified

### New Files ✅
1. `front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts`
2. `front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts`
3. `docs/_inbox/2026-02-07_menu-template-system-current-state.md`
4. `docs/_inbox/2026-02-07_menu-template-system-implementation.md` (this file)

### Modified Files ✅
1. `server/src/routes/admin/menus.js` - Updated seed endpoint, added reset endpoint

### Files to Modify ⏳
1. `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx` - Add template UI

---

## 🚀 Next Steps

1. **Update MenuEditor.tsx** with template UI components
2. **Test seed idempotency** (run twice, verify no duplicates)
3. **Test reset functionality** (delete + re-seed)
4. **Verify parent relationships** after seeding
5. **Document template creation** for future templates

---

**Status:** Backend complete ✅ | Frontend UI pending ⏳ | Testing pending ⏳
