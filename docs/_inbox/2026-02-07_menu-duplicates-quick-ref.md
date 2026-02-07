# Menu Duplicates Fix - Quick Reference

**Version:** 1.0 | **Date:** 2026-02-07

---

## 🚀 Quick Deploy (5 minutes)

```bash
# 1. Backup
mysql -u root -p orthodoxmetrics_db -e "CREATE TABLE router_menu_items_backup_before_dedupe AS SELECT * FROM router_menu_items;"

# 2. Run migration
cd /var/www/orthodoxmetrics/prod
mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql

# 3. Restart backend
pm2 restart om-server

# 4. Test
# Open Menu Editor → Click "Seed from Static" twice → Verify no duplicates
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

## 🔧 What Changed

1. **DB Schema:** Added `key_name VARCHAR(255) NOT NULL` column
2. **DB Constraint:** `UNIQUE(menu_id, key_name)` prevents duplicates
3. **Backend Endpoint:** `/api/admin/menus/seed` uses UPSERT logic
4. **Seed Logic:** `INSERT ... ON DUPLICATE KEY UPDATE` (idempotent!)

---

## 🧪 Test Script

```javascript
// Browser console (as super_admin)
async function testSeed() {
  const stats1 = await fetch('/api/admin/menus/stats', {credentials: 'include'}).then(r => r.json());
  console.log('Before:', stats1.stats.total_items, 'items');
  
  // Seed once
  const seed1 = await fetch('/api/admin/menus/seed', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({items: []}) // Frontend will send real items
  }).then(r => r.json());
  console.log('Seed 1:', seed1.message);
  
  const stats2 = await fetch('/api/admin/menus/stats', {credentials: 'include'}).then(r => r.json());
  console.log('After Seed 1:', stats2.stats.total_items, 'items');
  
  // Seed again
  const seed2 = await fetch('/api/admin/menus/seed', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({items: []})
  }).then(r => r.json());
  console.log('Seed 2:', seed2.message);
  
  const stats3 = await fetch('/api/admin/menus/stats', {credentials: 'include'}).then(r => r.json());
  console.log('After Seed 2:', stats3.stats.total_items, 'items');
  
  if (stats2.stats.total_items === stats3.stats.total_items) {
    console.log('✅ SUCCESS: Idempotent seeding works!');
  } else {
    console.error('❌ FAIL: Item count changed after second seed');
  }
}

testSeed();
```

---

## 🔙 Quick Rollback

```sql
-- Restore data
DELETE FROM router_menu_items;
INSERT INTO router_menu_items SELECT * FROM router_menu_items_backup_before_dedupe;

-- Remove constraint
ALTER TABLE router_menu_items DROP INDEX uk_router_menu_items_key;

-- Remove column
ALTER TABLE router_menu_items DROP COLUMN key_name;
```

Then restart: `pm2 restart om-server`

---

## 📂 Files Changed

**New:**
- `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql`
- `server/src/routes/admin/menus.js`
- `docs/_inbox/2026-02-07_menu-duplicates-*.md`

**Modified:**
- `server/src/api/admin.js` (added menus route)

---

## 💡 Key Concepts

**Before (Problem):**
- `router_menu_items` had no unique constraint
- Seed used `INSERT` → created duplicates each time
- Clicking "Seed from Static" repeatedly → more and more duplicates

**After (Fixed):**
- `UNIQUE(menu_id, key_name)` constraint enforced
- Seed uses `INSERT ... ON DUPLICATE KEY UPDATE` → updates existing
- Clicking "Seed from Static" repeatedly → same items, no duplicates

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| 404 on /api/admin/menus/seed | Check route registration in admin.js |
| "Duplicate entry" error | Run dedupe phase of migration again |
| Parent relationships broken | Seed endpoint auto-resolves (two-pass) |
| Frontend shows duplicates | Clear browser cache + hard refresh |

---

## 📞 Support

- **Analysis Doc:** `docs/_inbox/2026-02-07_menu-duplicates-analysis.md`
- **Full Guide:** `docs/_inbox/2026-02-07_menu-duplicates-deployment.md`
- **Migration SQL:** `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql`
- **Seed Endpoint:** `server/src/routes/admin/menus.js`
