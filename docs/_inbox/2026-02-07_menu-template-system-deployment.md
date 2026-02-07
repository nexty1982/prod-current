# Menu Template System - Deployment Guide

**Date:** 2026-02-07  
**Status:** ✅ COMPLETE - Ready for testing  
**Version:** 1.0.0

---

## 🚀 Quick Deploy (10 minutes)

### Prerequisites

✅ Database migration completed: `2026-02-07_menu_items_dedupe_and_unique.sql`  
✅ Backend running on port 3001  
✅ User logged in as `super_admin`

### Step 1: Restart Backend

```bash
cd /var/www/orthodoxmetrics/prod

# Restart PM2
pm2 restart om-server

# Watch logs for errors
pm2 logs om-server --lines 50
```

**Expected:** No errors related to imports or routes

### Step 2: Rebuild Frontend

```bash
cd /var/www/orthodoxmetrics/prod/front-end

# Install dependencies (if needed)
npm install

# Build frontend
npm run build

# Or dev mode for testing
npm run dev
```

**Expected:** No TypeScript errors

### Step 3: Test Template System

1. Open browser → Navigate to Menu Editor
2. You should see new "Template Seeding" section
3. Template dropdown shows "Default Super Admin Menu"
4. Two buttons: "Seed from Template" and "Reset to Template"

---

## 🧪 Testing Checklist

### Test 1: Seed from Template (First Time)

**Steps:**
1. Click "Seed from Template" button
2. Confirm dialog appears
3. Review template info (name, role, version)
4. Click "Seed from Template" in dialog
5. Wait for success message

**Expected Results:**
- ✅ Success message: "Successfully seeded menu from template..." with stats
- ✅ Table refreshes with new items
- ✅ Page reloads after 2 seconds
- ✅ Menu in sidebar updates

**Verify in DB:**
```sql
SELECT COUNT(*) FROM router_menu_items WHERE menu_id = (SELECT id FROM menus WHERE role = 'super_admin');
-- Expected: ~85 items
```

### Test 2: Seed from Template (Second Time - Idempotency)

**Steps:**
1. Note current item count in table
2. Click "Seed from Template" again
3. Confirm
4. Wait for success message

**Expected Results:**
- ✅ Success message shows: "0 inserted, N updated"
- ✅ Item count stays THE SAME
- ✅ No duplicate rows appear

**Verify in DB:**
```sql
-- Check for duplicates (should return 0 rows)
SELECT menu_id, key_name, COUNT(*) 
FROM router_menu_items 
GROUP BY menu_id, key_name 
HAVING COUNT(*) > 1;
```

### Test 3: Label Update (Idempotency Test)

**Steps:**
1. In DB, manually update a label:
   ```sql
   UPDATE router_menu_items 
   SET label = 'Menu Editor MODIFIED' 
   WHERE key_name = 'devel.menu-editor';
   ```
2. Refresh Menu Editor table (should show "Menu Editor MODIFIED")
3. Click "Seed from Template"
4. Confirm

**Expected Results:**
- ✅ Label reverts to "Menu Editor" (from template)
- ✅ Success message shows "0 inserted, N updated"
- ✅ No new rows created

### Test 4: Reset to Template

**Steps:**
1. In Menu Editor, manually add a test item (or note count)
2. Click "Reset to Template" button
3. WARNING dialog appears
4. Read warning carefully
5. Click "Reset to Template" in dialog
6. Wait for success message

**Expected Results:**
- ✅ Success message shows deleted + inserted counts
- ✅ Any manual items are gone
- ✅ Table shows only template items
- ✅ Page reloads after 2 seconds

**Verify in DB:**
```sql
-- Count should match template exactly
SELECT COUNT(*) FROM router_menu_items WHERE menu_id = (SELECT id FROM menus WHERE role = 'super_admin');
-- Expected: ~85 items (exact count from template)
```

### Test 5: Parent Relationships

**Steps:**
1. After seeding, check parent-child structure

**Verify in DB:**
```sql
SELECT 
  child.key_name as child,
  parent.key_name as parent,
  child.label
FROM router_menu_items child
LEFT JOIN router_menu_items parent ON child.parent_id = parent.id
WHERE child.parent_id IS NOT NULL
ORDER BY parent.key_name, child.sort_order;
```

**Expected Results:**
- ✅ All children have valid parents
- ✅ Parent key matches expected `parent_key_name` from template
- ✅ No orphaned items (parent_id points to non-existent row)

### Test 6: Icon Validation

**Steps:**
1. Seed from template
2. Check browser console for warnings

**Expected Results:**
- ✅ No "unknown icon" warnings in console
- ✅ All icons are in allowed list

**Verify in DB:**
```sql
SELECT DISTINCT icon FROM router_menu_items ORDER BY icon;
-- All should be in allowed list
```

### Test 7: Path Validation

**Steps:**
1. Seed from template
2. Check browser console for warnings

**Expected Results:**
- ✅ No "unusual path" warnings (or only expected ones)
- ✅ All paths start with valid prefixes

**Verify in DB:**
```sql
SELECT key_name, label, path FROM router_menu_items WHERE path IS NOT NULL AND path != '#' ORDER BY path;
-- All should start with: /apps/, /admin/, /devel/, /dashboards/, etc.
```

---

## ✅ Success Criteria

- [x] ✅ Template file created with stable IDs
- [x] ✅ Transformer utility transforms tree → flat array
- [x] ✅ Seed endpoint accepts templateId and role
- [x] ✅ Seed endpoint uses parent_key_name (stable references)
- [x] ✅ Reset endpoint deletes old + seeds new
- [x] ✅ Frontend UI shows template selector
- [x] ✅ Frontend UI integrates transformer
- [ ] ⏳ Seeding twice doesn't create duplicates (test now!)
- [ ] ⏳ Parent hierarchy preserved (test now!)
- [ ] ⏳ Labels update on re-seed (test now!)

---

## 🐛 Troubleshooting

### Issue: Import Error (transformMenuTemplate not found)

**Cause:** Frontend hasn't been rebuilt  
**Fix:**
```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run build
```

### Issue: templateId validation error

**Cause:** Backend doesn't recognize template ID  
**Fix:** Check `allowedTemplates` array in `server/src/routes/admin/menus.js` (line ~39)

### Issue: Validation errors in console

**Cause:** Template has invalid data  
**Fix:** Check template file for:
- Missing `id` fields
- Invalid paths (not starting with allowed prefixes)
- Unknown icons

### Issue: Parent relationships broken

**Cause:** `parent_key_name` references don't match `key_name` values  
**Fix:** Verify template structure:
```typescript
{
  id: 'parent.item',
  title: 'Parent',
  children: [
    {
      id: 'child.item',
      title: 'Child',
      // parent_key_name will be auto-generated as 'parent.item'
    }
  ]
}
```

### Issue: Duplicates still appearing

**Cause:** Unique constraint not applied  
**Fix:** Run migration:
```bash
mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql
```

---

## 📊 Performance

**Expected Performance:**
- Template transformation: < 100ms (85 items)
- Seed endpoint: < 2 seconds (85 items)
- Reset endpoint: < 3 seconds (delete + insert 85 items)
- Frontend rendering: < 500ms

**If slower:**
- Check database indexes: `SHOW INDEXES FROM router_menu_items;`
- Check for slow queries in PM2 logs
- Verify unique constraint exists

---

## 🔄 Rollback Plan

If something goes wrong:

### Rollback Step 1: Revert Frontend

```bash
cd /var/www/orthodoxmetrics/prod/front-end
git checkout front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx
npm run build
```

### Rollback Step 2: Revert Backend

```bash
cd /var/www/orthodoxmetrics/prod
git checkout server/src/routes/admin/menus.js
pm2 restart om-server
```

### Rollback Step 3: Remove Template Files (optional)

```bash
rm front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts
rm front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts
```

---

## 📁 Files Changed

### New Files ✅
1. `front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts`
2. `front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts`
3. `docs/_inbox/2026-02-07_menu-template-system-current-state.md`
4. `docs/_inbox/2026-02-07_menu-template-system-implementation.md`
5. `docs/_inbox/2026-02-07_menu-template-system-deployment.md` (this file)

### Modified Files ✅
1. `server/src/routes/admin/menus.js` - Updated seed, added reset endpoint
2. `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx` - Added template UI

---

## 🎯 Next Steps After Deployment

1. **Run all tests** from the checklist above
2. **Document any issues** encountered
3. **Create more templates** (if needed):
   - Copy `MenuItems-default-superadmin.ts`
   - Rename to `MenuItems-{template-name}.ts`
   - Update metadata
   - Add to `allowedTemplates` array in backend
   - Add to dropdown in frontend

4. **Add template versioning** (future enhancement):
   - Track template version in DB
   - Show "Template outdated" warning
   - Allow version migrations

5. **Add template diff viewer** (future enhancement):
   - Show what will change before seeding
   - Preview insert/update/delete operations

---

## 📚 Documentation

**Reference Documents:**
- Analysis: `docs/_inbox/2026-02-07_menu-template-system-current-state.md`
- Implementation: `docs/_inbox/2026-02-07_menu-template-system-implementation.md`
- Deployment: `docs/_inbox/2026-02-07_menu-template-system-deployment.md`

**Code Files:**
- Template: `front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts`
- Transformer: `front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts`
- Backend: `server/src/routes/admin/menus.js`
- Frontend: `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx`

---

**Deployed By:** ________________________  
**Date:** ________________________  
**Tested By:** ________________________  
**Sign-off:** ________________________

---

**Status:** ✅ COMPLETE - Ready for production testing
