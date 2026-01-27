# OCR Schema Migration Execution Guide

## Overview

This guide explains how to execute the OCR schema normalization migration to enforce DB as source of truth.

---

## Prerequisites

1. **Backup Databases**: Create backups of all church databases before running migration
2. **Verify Access**: Ensure you have MySQL access with ALTER TABLE permissions
3. **Check Environment**: Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD` environment variables

---

## Migration Steps

### Step 1: Backup Databases

```bash
# Backup all church databases
mysqldump -h localhost -u orthodoxapps -p orthodoxmetrics_db churches > churches_backup.sql

# For each church database (example for church 46)
mysqldump -h localhost -u orthodoxapps -p om_church_46 > om_church_46_backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration for Single Church

**Option A: Using SQL file directly**
```bash
mysql -h localhost -u orthodoxapps -p om_church_46 < server/database/migrations/normalize_ocr_schema.sql
```

**Option B: Using migration script**
```bash
cd server/scripts
chmod +x run-ocr-migration.sh
./run-ocr-migration.sh 46
```

**Option C: Using Node.js batch script**
```bash
cd server
node scripts/migrate-all-church-ocr-schemas.js
```

### Step 3: Verify Migration

```sql
-- Check ocr_jobs table has canonical columns
SHOW COLUMNS FROM ocr_jobs;

-- Verify canonical columns exist
SELECT 
  COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'om_church_46' 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME IN ('filename', 'ocr_text', 'ocr_result_json', 'status');

-- Check ocr_fused_drafts has workflow_status
SHOW COLUMNS FROM ocr_fused_drafts LIKE 'workflow_status';

-- Verify church_id is NOT NULL
SELECT COUNT(*) as null_church_ids 
FROM ocr_fused_drafts 
WHERE church_id IS NULL;
```

### Step 4: Restart Server (if needed)

```bash
# Restart PM2 process
pm2 restart orthodox-backend

# Check server is running
pm2 status orthodox-backend
```

### Step 5: Test Endpoints

**Option A: Automated Testing (Recommended)**
```bash
# Ensure server is running
# Then run automated test script
cd server
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
```

**Option B: Manual Testing**
1. **Start server**: Ensure backend is running on port 3001
2. **Test job list**: `GET /api/church/46/ocr/jobs`
3. **Test job detail**: `GET /api/church/46/ocr/jobs/1`
4. **Test drafts**: `GET /api/church/46/ocr/jobs/1/fusion/drafts`
5. **Verify**: All endpoints return data from DB (not bundle)

### Step 6: Test Without Bundle

**Option A: Automated Testing**
```bash
# Backup bundle directory
mv /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs /tmp/jobs.backup

# Run automated tests (should all pass)
cd server
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001

# Restore bundle
mv /tmp/jobs.backup /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs
```

**Option B: Manual Testing**
```bash
# Backup bundle directory
mv /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs.backup

# Test endpoints (should still work)
curl http://localhost:3001/api/church/46/ocr/jobs

# Restore bundle
mv /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs.backup /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs
```

---

## Migration Verification Checklist

- [ ] All church databases backed up
- [ ] Migration executed for all churches
- [ ] Canonical columns exist in `ocr_jobs`
- [ ] `workflow_status` column exists in `ocr_fused_drafts`
- [ ] `church_id` is NOT NULL in `ocr_fused_drafts`
- [ ] Server restarted (`pm2 restart orthodox-backend`)
- [ ] Job list endpoint returns data from DB
- [ ] Job detail endpoint returns data from DB
- [ ] Drafts endpoint returns data from DB
- [ ] Endpoints work with bundle directory removed
- [ ] No errors in server logs

---

## Rollback Procedure

If migration causes issues, restore from backup:

```bash
# Restore church database
mysql -h localhost -u orthodoxapps -p om_church_46 < om_church_46_backup_YYYYMMDD.sql
```

---

## Post-Migration Cleanup

After successful migration and verification:

1. **Remove Legacy Columns** (optional, after verification):
   ```sql
   ALTER TABLE ocr_jobs DROP COLUMN IF EXISTS file_name;
   ALTER TABLE ocr_jobs DROP COLUMN IF EXISTS result_json;
   ALTER TABLE ocr_jobs DROP COLUMN IF EXISTS ocr_result;
   ```

2. **Remove Dynamic Column Detection**: Code already updated, but verify no `SHOW COLUMNS` calls remain

3. **Update Documentation**: Mark migration as complete

---

## Troubleshooting

### Error: "Unknown column 'workflow_status'"
**Solution**: Migration didn't run. Execute migration script.

### Error: "Duplicate column name"
**Solution**: Migration already ran. This is OK - migration is idempotent.

### Error: "church_id cannot be NULL"
**Solution**: Migration will set NULL values from `ocr_jobs.church_id`. Check if job exists.

### Endpoints still reading from bundle
**Solution**: Verify code changes are deployed. Check server logs for bundle read attempts.

---

## Support

For issues, check:
- Server logs: `tail -f server/logs/app.log`
- Database logs: MySQL error log
- Migration script output: Check for warnings
