# Menu Duplicates Fix - Deployment & Testing Guide

**Date:** 2026-02-07  
**Version:** 1.0  
**Goal:** Fix duplicate menu entries and make seeding idempotent

---

## Overview

This fix addresses the duplicate menu entries issue in the Menu Editor by:
1. Adding a `key_name` column to `router_menu_items`
2. Removing existing duplicates (one-time cleanup)
3. Adding UNIQUE constraint on `(menu_id, key_name)`
4. Creating `/api/admin/menus/seed` endpoint with UPSERT logic
5. Making "Seed from Static" button idempotent (no duplicates on repeated clicks)

---

## Pre-Deployment Checklist

### ✅ Files Created/Modified

**New Files:**
- `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql` ✅
- `server/src/routes/admin/menus.js` ✅
- `docs/_inbox/2026-02-07_menu-duplicates-analysis.md` ✅
- `docs/_inbox/2026-02-07_menu-duplicates-deployment.md` (this file) ✅

**Modified Files:**
- `server/src/api/admin.js` - Added menus route registration ✅

---

## Deployment Steps

### Step 1: Backup Current State

```bash
# SSH to server
cd /var/www/orthodoxmetrics/prod

# Backup current menu items table
mysql -u root -p orthodoxmetrics_db -e "
  CREATE TABLE router_menu_items_backup_before_dedupe AS 
  SELECT * FROM router_menu_items;
"

# Verify backup
mysql -u root -p orthodoxmetrics_db -e "
  SELECT COUNT(*) AS backup_count FROM router_menu_items_backup_before_dedupe;
"
```

### Step 2: Check for Existing Duplicates

```bash
# Count duplicates before migration
mysql -u root -p orthodoxmetrics_db -e "
  SELECT 
    menu_id, 
    label, 
    COALESCE(path, '<NULL>') AS path,
    COUNT(*) AS duplicate_count,
    GROUP_CONCAT(id ORDER BY id) AS duplicate_ids
  FROM router_menu_items
  GROUP BY menu_id, label, COALESCE(path, '')
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
"
```

**Expected Output:**
- If you see rows with `duplicate_count > 1`, those will be cleaned up
- Note the highest `duplicate_count` to track progress

### Step 3: Run Migration

```bash
# Run the migration script
mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql
```

**Expected Output:**
```
✅ Phase 1 complete: key_name column added/verified
✅ Phase 2 complete: key_name populated for existing rows
(Shows duplicate rows that will be removed)
✅ Phase 4 complete: Duplicates removed
✅ Phase 5 complete: Verified no duplicates remain
✅ Phase 6 complete: Unique constraint added
✅ Phase 7 complete: Performance index added
✅✅✅ MIGRATION COMPLETE ✅✅✅
```

### Step 4: Verify Migration

```bash
# Check if key_name column exists
mysql -u root -p orthodoxmetrics_db -e "DESCRIBE router_menu_items;"

# Expected: key_name VARCHAR(255) NOT NULL after menu_id

# Check if unique constraint exists
mysql -u root -p orthodoxmetrics_db -e "
  SHOW INDEXES FROM router_menu_items WHERE Key_name = 'uk_router_menu_items_key';
"

# Expected: 1 row with Non_unique = 0

# Verify no duplicates remain
mysql -u root -p orthodoxmetrics_db -e "
  SELECT 
    menu_id, key_name, COUNT(*) AS count
  FROM router_menu_items
  GROUP BY menu_id, key_name
  HAVING COUNT(*) > 1;
"

# Expected: Empty set (0 rows)
```

### Step 5: Restart Backend

```bash
# Restart PM2 processes
pm2 restart om-server

# Watch logs for errors
pm2 logs om-server --lines 50
```

**Expected:** No errors related to database or routes

### Step 6: Test Seed Endpoint

```bash
# Test 1: Get menu stats
curl -X GET http://localhost:3001/api/admin/menus/stats \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE"

# Expected: JSON with menu statistics

# Test 2: Verify uniqueness (should show no duplicates)
curl -X POST http://localhost:3001/api/admin/menus/verify-uniqueness \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE"

# Expected: {"success": true, "hasDuplicates": false, "duplicates": []}
```

---

## Frontend Testing (Menu Editor)

### Test Plan

1. **Log in as super_admin**
2. **Navigate to Menu Editor** (`/devel/menu-editor` or `/devel/router-menu-studio`)
3. **Note current item count** (bottom of table)
4. **Click "Seed from Static"** → Confirm
5. **Wait for success message** → Should say "duplicates updated, not created"
6. **Verify item count** → Should NOT increase (or only slightly if new items added)
7. **Click "Seed from Static" again** → Confirm
8. **Verify item count again** → Should stay the SAME (no duplicates!)
9. **Check for duplicate rows** → Should see NO identical label/path/icon rows

### Expected Results

| Action | Expected Result |
|--------|----------------|
| First seed | "Successfully seeded N menu items (duplicates updated, not created)" |
| Item count | Stays the same or only increases if new items added to static config |
| Second seed | Same message, same count (idempotent!) |
| UI display | No duplicate rows visible |
| Console log | "🌱 Seeding N menu items..." with success logs |

### Screenshots to Capture

1. Before first seed (count + any visible duplicates)
2. After first seed (new count)
3. After second seed (count should be identical)
4. No duplicate rows in table

---

## Verification Queries

### Check Seeded Items

```sql
-- See all menu items for super_admin menu
SELECT 
  rmi.id, 
  rmi.key_name, 
  rmi.label, 
  rmi.path, 
  rmi.icon,
  rmi.sort_order,
  rmi.parent_id
FROM router_menu_items rmi
JOIN menus m ON rmi.menu_id = m.id
WHERE m.role = 'super_admin'
ORDER BY rmi.sort_order, rmi.label;
```

### Check for Orphaned Parent References

```sql
-- Find items with invalid parent_id (should be empty)
SELECT 
  rmi.id, 
  rmi.key_name, 
  rmi.label, 
  rmi.parent_id
FROM router_menu_items rmi
LEFT JOIN router_menu_items parent ON rmi.parent_id = parent.id
WHERE rmi.parent_id IS NOT NULL 
  AND parent.id IS NULL;
```

### Check Unique Constraint

```sql
-- Try to insert a duplicate (should fail with unique constraint error)
INSERT INTO router_menu_items (menu_id, key_name, label, path, sort_order)
SELECT menu_id, key_name, 'Duplicate Test', path, sort_order
FROM router_menu_items
LIMIT 1;

-- Expected: ERROR 1062 (23000): Duplicate entry '...' for key 'uk_router_menu_items_key'
```

---

## Troubleshooting

### Issue: Migration fails with "Duplicate entry"

**Cause:** Existing duplicates with same `key_name` after auto-generation  
**Fix:**
```sql
-- Manually dedupe before running full migration
DELETE rm1
FROM router_menu_items rm1
INNER JOIN router_menu_items rm2
  ON rm1.menu_id = rm2.menu_id
 AND rm1.label = rm2.label
 AND COALESCE(rm1.path,'') = COALESCE(rm2.path,'')
 AND rm1.id > rm2.id;

-- Then run Phase 6 of migration again
```

### Issue: Seed endpoint returns 404

**Cause:** Route not registered or wrong URL  
**Fix:**
- Verify route registration in `server/src/api/admin.js` (line ~17)
- Correct URL is: `/api/admin/menus/seed` (not `/api/menus/seed`)
- Check PM2 logs: `pm2 logs om-server`

### Issue: Seed endpoint returns "Items array is required"

**Cause:** Frontend sending wrong payload format  
**Fix:**
- Frontend should send: `{ items: [...] }`
- Check browser console Network tab → Request payload
- Verify `MenuEditor.tsx` line 267 has correct format

### Issue: Parent relationships broken after seed

**Cause:** Frontend sending array index as `parent_id` instead of `key_name`  
**Fix:** Seed endpoint handles both formats (checks in lines 212-223 of `menus.js`)

---

## Rollback Plan

If something goes wrong:

### Rollback Step 1: Restore Data

```sql
-- Restore from backup
DELETE FROM router_menu_items;
INSERT INTO router_menu_items 
SELECT * FROM router_menu_items_backup_before_dedupe;
```

### Rollback Step 2: Remove Unique Constraint

```sql
ALTER TABLE router_menu_items DROP INDEX uk_router_menu_items_key;
```

### Rollback Step 3: Remove key_name Column

```sql
ALTER TABLE router_menu_items DROP COLUMN key_name;
```

### Rollback Step 4: Remove Seed Endpoint

```javascript
// In server/src/api/admin.js, comment out:
// const menusRouter = require('../routes/admin/menus');
// router.use('/menus', menusRouter);
```

### Rollback Step 5: Restart Server

```bash
pm2 restart om-server
```

---

## Success Criteria

✅ Migration runs without errors  
✅ `key_name` column added to `router_menu_items`  
✅ All existing menu items have `key_name` populated  
✅ Unique constraint `uk_router_menu_items_key` exists  
✅ No duplicate rows remain in `router_menu_items`  
✅ `/api/admin/menus/seed` endpoint responds successfully  
✅ Clicking "Seed from Static" twice does NOT create duplicates  
✅ Menu item count stays stable after repeated seeding  
✅ No errors in browser console or PM2 logs  
✅ Parent-child menu relationships preserved  

---

## Post-Deployment

### Update Frontend Tooltip (Optional)

In `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx`, add a tooltip near the "Seed from Static" button:

```tsx
<Tooltip title="Seeding updates existing items; it will not create duplicates.">
  <Button onClick={() => setSeedDialogOpen(true)}>
    Seed from Static
  </Button>
</Tooltip>
```

### Clean Up Old Backup Table (After Verification)

```sql
-- After confirming everything works for 1-2 weeks:
DROP TABLE IF EXISTS router_menu_items_backup_before_dedupe;
DROP TABLE IF EXISTS router_menu_items_dupes_backup_20260207;
```

---

## Additional Notes

- **Idempotency:** The seed endpoint uses `INSERT ... ON DUPLICATE KEY UPDATE` based on `(menu_id, key_name)`.
- **key_name Format:** Frontend sends stable key names like `"admin.menu-editor"` or `"menu-dashboards"`.
- **Parent Resolution:** Seed endpoint resolves `parent_id` after all items are upserted (two-pass approach).
- **Backward Compatibility:** Seed endpoint handles both numeric array index and string key_name for parent_id.

---

**Deployed By:** ________________________  
**Date:** ________________________  
**Verified By:** ________________________  
**Sign-off:** ________________________
