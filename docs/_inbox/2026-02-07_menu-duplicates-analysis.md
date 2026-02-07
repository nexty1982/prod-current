# Menu Duplicates Fix - Current State Analysis

**Date:** 2026-02-07  
**Issue:** Menu Editor shows duplicate rows after clicking "Seed from Static" multiple times

## Current State

### Database Schema

**Location:** `server/database/migrations/router_menu_studio.sql`

**Tables:**

1. **`menus`** - Menu sets (one per role)
   - Columns: `id`, `name`, `role`, `is_active`, `version`, `created_by`, `created_at`, `updated_at`
   - Has seed data: `ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP` (line 92)
   - ✅ Already has some duplicate prevention

2. **`router_menu_items`** - Individual menu items
   - Columns: `id`, `menu_id`, `label`, `path`, `icon`, `parent_id`, `sort_order`, `is_devel_tool`, `visible_roles`, `created_at`, `updated_at`
   - Foreign keys: `menu_id` → `menus(id)`, `parent_id` → `router_menu_items(id)`
   - ❌ **NO UNIQUE constraints** - allows duplicates!
   - Has sample seed data with `INSERT IGNORE` (lines 107-115, 120-126)

### Frontend Seed Logic

**Location:** `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx` (lines 194-284)

**Process:**
1. Gets static menu items from `getMenuItems(user)`
2. Transforms to backend format with:
   - `key_name`: from `item.id` or `menu-${orderIndex}`
   - `label`, `icon`, `path`, `parent_id`, `order_index`, `is_active`, `meta`
3. Sends POST to `/api/admin/menus/seed` with `{items: transformedItems}`

**Problem:**
- Frontend expects a `/api/admin/menus/seed` endpoint
- Endpoint does NOT exist in codebase (search found nothing)
- This means seed functionality is currently broken or handled differently

### Missing Backend Endpoint

**Expected:** `POST /api/admin/menus/seed`  
**Status:** ❌ NOT FOUND

Searched in:
- `server/src/routes/**/*.js` - no seed endpoint
- `server/src/api/**/*.js` - no seed endpoint

**Hypothesis:** Either:
1. Endpoint was never implemented (seed button doesn't work)
2. Endpoint is named differently
3. Seed happens via different mechanism

### Related Files Found

1. `server/src/routes/routerMenu.js` - Router Menu Studio API
   - Has CRUD for routes, menus, menu items
   - Has template system
   - ❌ NO seed endpoint

2. `server/src/api/menuManagement.js` - Different menu system
   - Uses `menu_items` and `role_menu_permissions` tables (different schema!)
   - Not related to Menu Editor

## Root Cause of Duplicates

**Issue:** `router_menu_items` table has NO UNIQUE constraint

**Current behavior:**
- Each INSERT creates a new row
- Same `label`/`path`/`menu_id` can exist multiple times
- Clicking "Seed from Static" repeatedly creates more duplicates

**What's missing:**
1. Unique constraint on `router_menu_items`
2. Backend seed endpoint that does UPSERT instead of INSERT
3. Proper identity key (currently uses auto-increment `id` only)

## Key Questions to Resolve

1. **What makes a menu item unique?**
   - Option A: `(menu_id, label)` - same label can't appear twice in same menu
   - Option B: `(menu_id, path)` - same path can't appear twice (but path can be NULL for parents)
   - Option C: `(menu_id, key_name)` - requires adding `key_name` column (currently doesn't exist!)
   - **Recommended:** Add `key_name` column + UNIQUE(menu_id, key_name)

2. **Where is key_name stored?**
   - Frontend sends `key_name` in seed payload
   - ❌ Database schema doesn't have `key_name` column in `router_menu_items`!
   - This is a schema mismatch issue!

3. **How to fix parent_id relationships?**
   - Frontend uses array index as parent_id
   - Backend needs to resolve after UPSERT (get real IDs)

## Implementation Plan

### Phase 1: Add Missing Column
```sql
ALTER TABLE router_menu_items ADD COLUMN key_name VARCHAR(255) AFTER menu_id;
```

### Phase 2: Dedupe Existing Data
```sql
-- Remove duplicates, keep lowest id
DELETE rm1
FROM router_menu_items rm1
JOIN router_menu_items rm2
  ON rm1.menu_id = rm2.menu_id
 AND rm1.label = rm2.label
 AND COALESCE(rm1.path,'') = COALESCE(rm2.path,'')
 AND rm1.id > rm2.id;
```

### Phase 3: Add Unique Constraint
```sql
ALTER TABLE router_menu_items
ADD UNIQUE KEY uk_router_menu_items_key (menu_id, key_name);
```

### Phase 4: Create Seed Endpoint
**Location:** `server/src/routes/admin/menus.js` (new file)

**Logic:**
```javascript
router.post('/seed', async (req, res) => {
  const { items } = req.body;
  
  // 1. Get menu_id for current user's role
  // 2. For each item:
  //    - INSERT ... ON DUPLICATE KEY UPDATE
  //    - Use (menu_id, key_name) as unique key
  // 3. Resolve parent_id relationships after all inserts
  // 4. Return success
});
```

### Phase 5: Update Frontend
- Verify `key_name` is sent correctly
- Add tooltip: "Seeding updates existing items"

## Files to Create/Modify

1. ✅ `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql` - NEW
2. ✅ `server/src/routes/admin/menus.js` - NEW (seed endpoint)
3. ✅ `server/src/index.ts` or app registration - register new route
4. ⚠️ `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx` - add tooltip

## Testing Plan

1. **Before migration:**
   ```sql
   SELECT menu_id, label, path, COUNT(*) 
   FROM router_menu_items 
   GROUP BY menu_id, label, path 
   HAVING COUNT(*) > 1;
   ```

2. **After migration:**
   - Same query should return 0 rows
   - Unique constraint should exist

3. **Seed testing:**
   - Click "Seed from Static" twice
   - Verify no duplicates created
   - Verify existing items updated

---

**Next Steps:** Implement migrations and seed endpoint
