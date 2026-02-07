# OM-Library V3 - Quick Reference Card

## 🚀 What Was Implemented

✅ **Daily tasks auto-ingestion** from `/var/www/orthodoxmetrics/prod`  
✅ **Scheduled daily indexing** at 02:30 AM  
✅ **Cleanup UI** with dry-run and apply  
✅ **Database-driven sources** with glob patterns  
✅ **SHA256 tracking** for file identity  

---

## 📦 Deploy (Quick Version)

```bash
# 1. Install package
cd /var/www/orthodoxmetrics/prod/server && npm install minimatch --save

# 2. Run migration
mysql -u root -p < server/database/migrations/2026-02-06_library_sources_add_globs.sql

# 3. Build frontend
cd ../front-end && npm run build

# 4. Restart librarian
cd .. && pm2 restart om-librarian

# 5. Check logs
pm2 logs om-librarian --lines 50 --nostream | grep "V3"
```

---

## 🔍 Verify Deployment

**Expected in logs:**
```
🔵 OM-Librarian V3: Initializing...
✅ Database connection established
📂 Loading scan sources from database...
✅ Loaded 9 active scan sources
⏰ Setting up scheduled indexing: 30 2 * * *
✅ OM-Librarian V3: Ready and watching
```

**Test daily task ingestion:**
```bash
cd /var/www/orthodoxmetrics/prod
echo "# Test Task" > test_task_$(date +%Y-%m-%d).md
# Wait 3 seconds, then check:
grep "test_task" .analysis/library-index.json
```

**Test cleanup:**
1. Go to `/church/om-spec`
2. Click **Cleanup** button
3. Review dry-run plan
4. Click **Apply Cleanup** (or Cancel to skip)

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `server/src/agents/omLibrarianV3.js` | New librarian with all features |
| `server/database/migrations/2026-02-06_library_sources_add_globs.sql` | DB migration |
| `front-end/src/features/.../OMLibrary.tsx` | UI with cleanup buttons |
| `ecosystem.config.js` | Updated to use V3 |
| `docs/_inbox/2026-02-06_om-library-v3-deployment-guide.md` | Full deployment guide |

---

## 🎯 How to Use

### Manual Reindex
- **UI:** Click ⟳ (reindex) button in OM-Library
- **API:** `POST /api/library/reindex` (super_admin only)

### Cleanup
1. Click **Cleanup** button
2. Review dry-run plan
3. Click **Apply Cleanup** to organize files
4. Files moved to:
   - `docs/daily/YYYY-MM-DD/` (daily tasks)
   - `docs/_artifacts/YYYY-MM-DD/` (logs, zips)
   - `docs/_inbox/YYYY-MM-DD/` (other)

### Check Status
- **Librarian status:** Badge in OM-Library header
- **PM2:** `pm2 status | grep om-librarian`
- **Logs:** `pm2 logs om-librarian`

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Sources not loading | Check DB connection, verify migration |
| Files not indexed | Check include/exclude globs, verify path |
| Scheduled job not running | Check cron syntax, verify server timezone |
| Cleanup shows 0 files | Check prod root has loose files with safe extensions |

---

## 📊 Database Queries

**Check sources:**
```sql
SELECT id, name, path, scan_mode, is_active 
FROM orthodoxmetrics_db.library_sources;
```

**Check globs:**
```sql
SELECT name, include_globs, exclude_globs 
FROM orthodoxmetrics_db.library_sources 
WHERE name LIKE '%Prod Root%';
```

**Check last scan:**
```sql
SELECT name, last_scan, file_count 
FROM orthodoxmetrics_db.library_sources 
ORDER BY last_scan DESC;
```

---

## 🔄 Rollback

If issues occur:

```bash
cd /var/www/orthodoxmetrics/prod
pm2 stop om-librarian
cp ecosystem.config.js.backup ecosystem.config.js
pm2 restart om-librarian
```

---

## 📚 Full Documentation

1. **Deployment Guide:** `docs/_inbox/2026-02-06_om-library-v3-deployment-guide.md`
2. **Implementation Summary:** `docs/_inbox/2026-02-06_om-library-v3-implementation-summary.md`
3. **Current State Analysis:** `docs/_inbox/2026-02-06_om-library-enhancement-current-state.md`

---

## ✅ Success Criteria

All features working:
- [x] Prod root files auto-indexed
- [x] Daily indexing at 02:30 AM
- [x] Cleanup UI functional
- [x] Globs control file selection
- [x] SHA256 in index
- [x] No files deleted (only moved)
- [x] Manifests log all moves

---

**Ready to deploy!** 🚀  
Start with the Quick Deploy steps above.
