# Menu Template System - Current State Analysis

**Date:** 2026-02-07  
**Goal:** Add template support for seeding super_admin menus from static files

---

## Current State

### 1. Static Menu Structure

**File:** `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`

**Structure:**
```typescript
interface MenuitemsType {
  id?: string;                    // uniqueId() generated
  navlabel?: boolean;             // Section header flag
  subheader?: string;             // Section header text
  title?: string;                 // Menu item title
  icon?: any;                     // React component (IconShield, etc.)
  href?: string;                  // Route path or "#" for parents
  children?: MenuitemsType[];     // Nested menu items
  chip?: string;                  // Badge text
  chipColor?: string;             // Badge color
  variant?: string;
  external?: boolean;
}
```

**Key Characteristics:**
- Uses `lodash.uniqueId()` for IDs (non-stable, changes each render)
- Nested tree structure with `children` arrays
- Section headers marked with `navlabel: true` and `subheader`
- Parent items use `href: "#"` and have `children`
- Icons are React components (not string names)
- Exported as `Menuitems` array
- `getMenuItems(user)` function filters by role

**Sample Structure:**
```typescript
const Menuitems: MenuitemsType[] = [
  // Section header
  {
    navlabel: true,
    subheader: '📊 Dashboards',
  },
  // Simple item
  {
    id: uniqueId(),
    title: 'User Dashboard',
    icon: IconLayoutDashboard,
    href: '/dashboards/user',
  },
  // Parent with children
  {
    id: uniqueId(),
    title: 'Site Management',
    icon: IconSettings,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'User Management',
        icon: IconUsers,
        href: '/admin/users',
      },
    ],
  },
];
```

### 2. Database Schema

**Table:** `orthodoxmetrics_db.router_menu_items`

```sql
CREATE TABLE router_menu_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT NOT NULL,                      -- FK to menus table
  key_name VARCHAR(255) NOT NULL,               -- ✅ STABLE IDENTIFIER (NEW)
  label VARCHAR(256) NOT NULL,
  path VARCHAR(512) NULL,
  icon VARCHAR(128) NULL,
  parent_id BIGINT NULL,                        -- FK to self
  sort_order INT NOT NULL DEFAULT 0,
  is_devel_tool TINYINT(1) NOT NULL DEFAULT 0,
  visible_roles JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES router_menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu_id (menu_id), 
  INDEX idx_parent_id (parent_id), 
  INDEX idx_sort_order (sort_order),
  INDEX idx_devel_tool (is_devel_tool),
  INDEX idx_key_name (key_name),
  UNIQUE KEY uk_router_menu_items_key (menu_id, key_name)  -- ✅ ENFORCES UNIQUENESS
);
```

**Table:** `orthodoxmetrics_db.menus`

```sql
CREATE TABLE menus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  role ENUM('super_admin','default') NOT NULL DEFAULT 'default',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  created_by VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);
```

**Current Rows:**
```sql
-- Super Admin Menu (id: 1)
INSERT INTO menus (name, role, is_active, version, created_by) 
VALUES ('Super Admin Menu', 'super_admin', 1, 1, 'system');

-- Default Menu (id: 2)
INSERT INTO menus (name, role, is_active, version, created_by) 
VALUES ('Default Menu', 'default', 1, 1, 'system');
```

### 3. Existing Seed Endpoint

**File:** `server/src/routes/admin/menus.js`  
**Endpoint:** `POST /api/admin/menus/seed`

**Current Payload:**
```json
{
  "items": [
    {
      "key_name": "admin.menu-editor",
      "label": "Menu Editor",
      "path": "/admin/menu-management",
      "icon": "IconPoint",
      "order_index": 10,
      "is_active": 1,
      "parent_id": null,
      "meta": null
    }
  ]
}
```

**Key Features:**
- ✅ Uses UPSERT (`INSERT ... ON DUPLICATE KEY UPDATE`)
- ✅ Based on `UNIQUE(menu_id, key_name)`
- ✅ Two-pass parent resolution:
  1. First pass: Upsert all items with `parent_id = NULL`
  2. Second pass: Resolve `parent_id` by looking up `parent_key_name`
- ✅ Transaction-based (rollback on error)
- ✅ Requires `super_admin` role

**Limitations:**
- No `templateId` parameter (seeds for current user's role only)
- No explicit template selection
- Frontend must manually transform `MenuItems.ts` tree → flat array

### 4. Frontend Menu Editor

**File:** `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx`

**Existing Seed Logic (line 194-284):**
```typescript
const handleSeed = async () => {
  // Get current static menu items
  const staticMenuItems = getMenuItems(user);
  
  // Transform to backend format
  const transformedItems: MenuItem[] = [];
  let orderIndex = 0;

  const processItem = (item: any, parentId?: number) => {
    // Skip nav labels (section headers)
    if (item.navlabel || item.subheader) return;

    const keyName = item.id || `menu-${orderIndex}`;  // ❌ NOT STABLE (uniqueId changes)
    const iconName = getIconName(item.icon);
    
    const menuItem: MenuItem = {
      key_name: keyName,
      label: item.title || 'Untitled',
      icon: iconName,
      path: item.href || null,
      parent_id: parentId || null,
      order_index: orderIndex++,
      is_active: 1,
      meta: item.chip ? JSON.stringify({ chip: item.chip, chipColor: item.chipColor }) : null,
    };

    transformedItems.push(menuItem);

    // Process children recursively
    if (item.children && item.children.length > 0) {
      const parentKeyName = keyName;
      item.children.forEach((child: any) => {
        processItem(child, transformedItems.findIndex(i => i.key_name === parentKeyName));
      });
    }
  };

  staticMenuItems.forEach((item: any) => processItem(item));

  // Send to backend
  await fetch('/api/admin/menus/seed', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: transformedItems }),
  });
};
```

**Issues with Current Approach:**
1. ❌ `key_name` uses `item.id` which is `uniqueId()` → NOT STABLE
2. ❌ `parent_id` is array index (numeric) → Not reliable
3. ❌ No way to specify template source
4. ❌ Always seeds for current user's role
5. ❌ Icon mapping done in frontend (duplicated logic)

---

## What Needs to Change

### 1. Create Dedicated Template File

**New File:** `front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts`

- Export super_admin menu only (no role filtering)
- Use stable, deterministic key names (not `uniqueId()`)
- Clearly document the template structure

### 2. Create Template Transformer

**New File:** `front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts`

**Responsibilities:**
- Flatten tree structure → flat array
- Generate stable `key_name` values:
  - Prefer explicit `id` if present and stable
  - Else derive from namespace + slugified label (e.g., `devel.menu-editor`)
- Map icon components → string names
- Generate `parent_key_name` references (not array indices)
- Skip `navlabel` sections
- Preserve `order_index` based on tree traversal order

### 3. Update Backend Seed Endpoint

**Changes to `POST /api/admin/menus/seed`:**

**New Payload Shape:**
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
      "parent_key_name": "devel",  // ✅ STABLE REFERENCE
      "meta": { "systemRequired": true }
    }
  ]
}
```

**New Features:**
- Accept `templateId` parameter
- Accept `role` parameter (validate against allowed roles)
- Use `parent_key_name` instead of numeric `parent_id`
- Validate `templateId` against whitelist
- Return template metadata in response

### 4. Add Reset Endpoint

**New Endpoint:** `POST /api/admin/menus/reset-to-template`

**Payload:**
```json
{
  "templateId": "default-superadmins",
  "role": "super_admin",
  "items": [...]
}
```

**Behavior:**
- Delete all `router_menu_items` where `menu_id` matches role
- Then call seed logic (same as `/seed`)
- Return counts: `{ deleted, inserted, updated }`

### 5. Update Menu Editor UI

**Add Template Selector:**
- Dropdown: "Template" with option "Default Super Admins"
- Button: "Seed from Template"
- Button: "Reset to Template" (with confirmation dialog)

**Workflow:**
1. User selects template from dropdown
2. User clicks "Seed from Template"
3. Frontend imports template file
4. Frontend transforms tree → flat array
5. Frontend sends payload to `/api/admin/menus/seed`
6. UI refreshes table

---

## Key Design Decisions

### 1. Why NOT Read TS File on Backend?

**Problem:** Backend can't directly import TypeScript files from frontend
**Solution:** Frontend imports TS, transforms to JSON, sends to backend

### 2. Why Stable `key_name` Values?

**Problem:** `uniqueId()` changes each render → can't detect duplicates
**Solution:** Use namespace + slugified label (e.g., `devel.menu-editor`)

### 3. Why `parent_key_name` Instead of Numeric `parent_id`?

**Problem:** Array indices change when items are reordered
**Solution:** Use stable string references that can be looked up in DB

### 4. Why Template IDs?

**Problem:** Need to track which template was used for seeding
**Solution:** Explicit `templateId` parameter (e.g., `"default-superadmins"`)

### 5. Why Separate Reset Endpoint?

**Problem:** Seed is additive/update; sometimes need full replacement
**Solution:** Reset deletes all items first, then seeds from scratch

---

## Validation Rules

### Path Validation
```javascript
// Allow "#" for non-clickable parents
if (path === "#") return true;

// Validate route prefix
const validPrefixes = [
  '/apps/',
  '/admin/',
  '/devel/',
  '/dashboards/',
  '/tools/',
  '/sandbox/',
  '/social/',
  '/church/',
  '/frontend-pages/'
];

return validPrefixes.some(prefix => path.startsWith(prefix));
```

### Icon Validation
```javascript
const ALLOWED_ICONS = [
  'IconPoint', 'IconShield', 'IconUsers', 'IconLayoutDashboard',
  'IconSettings', 'IconLayout', 'IconSitemap', 'IconTerminal',
  'IconFileDescription', 'IconDatabase', 'IconEdit', 'IconBug',
  'IconRocket', 'IconActivity', 'IconBell', 'IconMessage',
  'IconUserPlus', 'IconComponents', 'IconPalette', 'IconTool',
  'IconCheckbox', 'IconBorderAll', 'IconGitBranch', 'IconNotes',
  'IconCalendar', 'IconForms', 'IconWriting', 'OrthodoxChurchIcon'
];
```

### key_name Validation
```javascript
// Must be non-empty, <= 255 chars
if (!key_name || key_name.length > 255) return false;

// Must match namespace.slug pattern
const pattern = /^[a-z0-9-]+\.[a-z0-9-]+$/;
return pattern.test(key_name);
```

---

## Implementation Checklist

### Phase 1: Template File
- [ ] Create `MenuItems-default-superadmin.ts`
- [ ] Add stable IDs (namespace + slug)
- [ ] Document template structure
- [ ] Export super_admin menu only

### Phase 2: Transformer
- [ ] Create `transformMenuTemplate.ts`
- [ ] Flatten tree → flat array
- [ ] Generate stable `key_name` values
- [ ] Map icon components → strings
- [ ] Generate `parent_key_name` references
- [ ] Preserve sort order

### Phase 3: Backend Updates
- [ ] Update `/seed` to accept `templateId` and `role`
- [ ] Validate `templateId` against whitelist
- [ ] Use `parent_key_name` for resolution
- [ ] Create `/reset-to-template` endpoint
- [ ] Add validation rules

### Phase 4: Frontend UI
- [ ] Add template dropdown
- [ ] Add "Seed from Template" button
- [ ] Add "Reset to Template" button (with confirm)
- [ ] Integrate transformer
- [ ] Handle success/error states

### Phase 5: Testing
- [ ] Seed twice with same template → no duplicates
- [ ] Modify label → updates on re-seed
- [ ] Parent hierarchy preserved
- [ ] Reset deletes old + seeds new

---

## Next Steps

1. **Create template file** with super_admin menu
2. **Create transformer** utility
3. **Update backend endpoints** to accept template metadata
4. **Add UI controls** for template selection
5. **Test idempotency** and parent resolution

---

**Status:** ✅ Analysis complete, ready for implementation
