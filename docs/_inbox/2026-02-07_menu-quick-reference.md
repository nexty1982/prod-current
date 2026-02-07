# Menu Duplicate Fix + Template System - Quick Reference

**Version:** 1.0.0 | **Date:** 2026-02-07

---

## 🚀 Quick Deploy (5 minutes)

```bash
# 1. Run migration
cd /var/www/orthodoxmetrics/prod
mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql

# 2. Restart backend
pm2 restart om-server

# 3. Rebuild frontend
cd front-end && npm run build

# 4. Test: Open Menu Editor → Use template system
```

---

## ✅ Quick Verify

```sql
-- No duplicates?
SELECT menu_id, key_name, COUNT(*) FROM router_menu_items GROUP BY menu_id, key_name HAVING COUNT(*) > 1;
-- Expected: Empty set

-- Unique key exists?
SHOW INDEXES FROM router_menu_items WHERE Key_name = 'uk_router_menu_items_key';
-- Expected: 1 row
```

---

## 🎯 What's New

### Frontend (Menu Editor):
- **Template Seeding** section with dropdown
- **"Seed from Template"** button (idempotent)
- **"Reset to Template"** button (destructive)
- Confirmation dialogs with template info

### Backend API:
- `POST /api/admin/menus/seed` - Now accepts `templateId` and `role`
- `POST /api/admin/menus/reset-to-template` - NEW endpoint

### Template File:
- `MenuItems-default-superadmin.ts` - Super admin menu template
- Stable IDs: `namespace.slug` format
- 85+ menu items

---

## 🧪 Quick Test

```javascript
// Browser console test
async function testTemplateSystem() {
  // Get stats before
  const stats1 = await fetch('/api/admin/menus/stats', {credentials: 'include'}).then(r => r.json());
  console.log('Before:', stats1.stats.total_items, 'items');
  
  // Note: Actual seeding should be done via UI
  // This is just to verify the endpoint exists
  console.log('✅ Stats endpoint working');
  console.log('✅ Use Menu Editor UI to test seeding');
}

testTemplateSystem();
```

---

## 📋 UI Workflow

1. **Open** Menu Editor (`/devel-tools/menu-editor`)
2. **See** "Template Seeding" section
3. **Select** "Default Super Admin Menu" from dropdown
4. **Click** "Seed from Template" → Confirm
5. **Success** message appears
6. **Click** "Seed from Template" again
7. **Verify** "0 inserted, N updated" (no duplicates!)

---

## 🔧 What Changed

**Database:**
- Added `key_name` column (stable identifier)
- Added `UNIQUE(menu_id, key_name)` constraint
- Removed all duplicates

**Backend:**
- Seed endpoint uses UPSERT logic
- Accepts `templateId` and `role` parameters
- Uses `parent_key_name` for stable parent references
- New reset endpoint for clean slate

**Frontend:**
- Template selector UI
- Integration with transformer utility
- Confirmation dialogs

---

## 💡 Key Concepts

**Stable IDs:**
- Before: `uniqueId()` → changes each render
- After: `"devel.menu-editor"` → stable forever

**Parent References:**
- Before: Array index (numeric) → fragile
- After: `parent_key_name` (string) → stable

**Idempotency:**
- Before: INSERT → duplicates on repeat
- After: UPSERT → updates on repeat

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Import error | `cd front-end && npm run build` |
| Duplicates remain | Run migration again |
| templateId invalid | Check `allowedTemplates` in `server/src/routes/admin/menus.js` |
| Parent broken | Verify `parent_key_name` matches `key_name` |

---

## 📁 Key Files

**Template:** `front-end/src/layouts/full/vertical/sidebar/MenuItems-default-superadmin.ts`  
**Transformer:** `front-end/src/features/devel-tools/menu-editor/templates/transformMenuTemplate.ts`  
**Backend:** `server/src/routes/admin/menus.js`  
**Frontend:** `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx`  
**Migration:** `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql`

---

## 📚 Full Documentation

- **Complete Summary:** `docs/_inbox/2026-02-07_menu-complete-summary.md`
- **Deployment Guide:** `docs/_inbox/2026-02-07_menu-template-system-deployment.md`
- **Implementation:** `docs/_inbox/2026-02-07_menu-template-system-implementation.md`

---

## ✅ Success Checklist

- [ ] Migration run successfully
- [ ] Backend restarted without errors
- [ ] Frontend rebuilt successfully
- [ ] Template selector visible in UI
- [ ] Seed works (first time)
- [ ] Seed works (second time) - no duplicates
- [ ] Reset works
- [ ] Menu sidebar updates correctly

---

**Status:** ✅ COMPLETE - Ready for testing
