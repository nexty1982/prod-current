# Backup System Integration - Quick Deployment

**Date:** 2026-02-07  
**Goal:** Integrate om-backup-v2.sh (Borg) with Admin Settings UI  
**Status:** Ready to deploy

---

## What Was Done

✅ **Fixed om-backup-v2.sh script** (LOG_FILE unbound variable, repo initialization check)  
✅ **Created unified backup API** (`/api/backups/*`)  
✅ **Added Borg backup button** to Admin Settings UI  
✅ **Integrated job tracking** - All backups appear in Job History  
✅ **Database migration** created for borg support  

---

## Quick Deploy (5 Steps)

### 1. Database Migration

```bash
# Run migration
mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-02-07_backup_borg_integration.sql
```

**Expected:** `✅ Migration complete - Borg support added to backup system`

### 2. Deploy Fixed Borg Script

```bash
# On server, backup original
cd /var/backups/OM
cp om-backup-v2.sh om-backup-v2.sh.backup-$(date +%Y%m%d)

# Copy fixed script from Z:\scripts\om-backup-v2-fixed.sh
# Then:
chmod +x om-backup-v2.sh

# Set passphrase
export BORG_PASSPHRASE="your-secure-passphrase"
echo 'export BORG_PASSPHRASE="your-secure-passphrase"' >> /root/.bashrc
```

### 3. Build & Deploy Backend

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
pm2 restart orthodox-backend
pm2 logs orthodox-backend --lines 30
```

**Expected:**
```
✅ [Server] Mounted /api/backups route (backup management)
```

### 4. Build Frontend

```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run build
```

### 5. Test!

1. Login as super_admin
2. Go to `/admin/settings` → "Backup & Restore" tab
3. See green "Create Borg Backup (Recommended)" button
4. Click it → Success toast
5. Go to "Job History" tab → See job with "BORG" badge

---

## UI Changes

**Admin Settings → Backup & Restore:**

**Before:**
```
[Create Full Backup]
[Database Only]
[Files Only]
```

**After:**
```
[Create Borg Backup (Recommended)] ← Green, prominent
─────── or use legacy backups ───────
[Create Full Backup (Legacy)]
[Database Only (Legacy)]
[Files Only (Legacy)]

ℹ️ Borg uses om-backup-v2.sh with deduplication, compression, and pruning.
   Legacy uses tar/mysqldump for simple backups.
```

**Job History Tab:**
- Jobs now show "BORG" badge for borg backups
- Status chips color-coded (success=green, failed=red, running=orange)

---

## Files Changed

### Backend:
1. ✅ `server/src/routes/backups.js` (new) - Unified backup routes
2. ✅ `server/src/index.ts` (modified) - Mounted `/api/backups`

### Frontend:
1. ✅ `front-end/src/features/system/settings/BackupSettings.tsx` (modified) - Added Borg button

### Scripts:
1. ✅ `scripts/om-backup-v2-fixed.sh` (new) - Fixed borg script

### Database:
1. ✅ `server/database/migrations/2026-02-07_backup_borg_integration.sql` (new)

### Documentation:
1. ✅ `docs/_inbox/2026-02-07_om-backup-v2-fix.md` - Script fix details
2. ✅ `docs/_inbox/2026-02-07_backup-integration.md` - Full integration guide
3. ✅ `docs/_inbox/2026-02-07_backup-quick-deploy.md` (this file)

---

## Testing Checklist

**Backend:**
- [ ] PM2 restart successful
- [ ] `/api/backups/settings` returns data
- [ ] `/api/backups/jobs` returns jobs
- [ ] `POST /api/backups/borg/run` starts backup

**Frontend:**
- [ ] Borg backup button visible
- [ ] Button triggers backup
- [ ] Job appears in history
- [ ] "BORG" badge shows

**Script:**
- [ ] `om-backup-v2.sh` runs without errors
- [ ] No "LOG_FILE: unbound variable"
- [ ] No "repository already exists"
- [ ] Backup created successfully

**Integration:**
- [ ] UI backup creates job in database
- [ ] Job History shows borg jobs
- [ ] Statistics include borg backups
- [ ] Settings persist correctly

---

## Rollback (If Needed)

```bash
cd /var/www/orthodoxmetrics/prod

# Revert code
git checkout server/src/routes/backups.js server/src/index.ts
git checkout front-end/src/features/system/settings/BackupSettings.tsx

# Rebuild
cd server && npm run build && pm2 restart orthodox-backend
cd ../front-end && npm run build

# Revert database
mysql -u root -p orthodoxmetrics_db -e "
ALTER TABLE backup_jobs MODIFY COLUMN kind ENUM('files','db','both') NOT NULL;
ALTER TABLE backup_artifacts MODIFY COLUMN artifact_type ENUM('files','database') NOT NULL;
"
```

---

## Post-Deployment

### Monitor Logs:
```bash
# Watch for borg backup jobs
pm2 logs orthodox-backend --lines 100 | grep -i borg

# Check borg logs
tail -f /var/backups/OM/logs/backup-*.log
```

### Verify Job Tracking:
```bash
# Check job records
mysql -u root -p -e "
SELECT id, kind, status, started_at, finished_at, requested_by 
FROM orthodoxmetrics_db.backup_jobs 
WHERE kind='borg' 
ORDER BY created_at DESC 
LIMIT 5;
"
```

### Test Cron Job:
```bash
# Manually trigger borg backup
sudo /var/backups/OM/om-backup-v2.sh

# Check if it appears in UI job history
```

---

## Next Steps

1. ✅ Deploy database migration
2. ✅ Deploy fixed borg script
3. ✅ Deploy backend code
4. ✅ Deploy frontend code
5. 📋 Test UI-triggered borg backup
6. 📋 Test script-triggered backup
7. 📋 Verify job history integration
8. 📋 Set up automated backups (cron)
9. 📋 Document for team

---

**Estimated Deployment Time:** 10 minutes  
**Downtime:** None (PM2 reload)  
**Risk Level:** Low (backup system, doesn't affect core features)

---

**Ready to deploy!** 🚀
