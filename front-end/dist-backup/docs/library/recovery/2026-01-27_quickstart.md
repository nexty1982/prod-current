# OCR DB Source of Truth - Quick Start Guide

## Overview

This guide provides quick commands to verify the OCR system is working correctly with DB as the single source of truth.

---

## Prerequisites

- Server running on port 3001 (or set `SERVER_URL` env var)
- PM2 process: `orthodox-backend`
- Migration executed (see `MIGRATION_EXECUTION_GUIDE.md`)
- Valid church ID and job ID for testing

---

## Quick Verification Steps

### 1. Run Automated Tests

```bash
cd /var/www/orthodoxmetrics/prod/server

# Test with bundle present
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001

# Backup bundle directory
mv /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs /tmp/jobs.backup

# Test WITHOUT bundle (should still pass)
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001

# Restore bundle
mv /tmp/jobs.backup /var/www/orthodoxmetrics/prod/server/uploads/om_church_46/jobs
```

### 2. Manual UI Testing

1. Navigate to `/devel/enhanced-ocr-uploader` in browser
2. Verify job list loads
3. Click on a job - verify details load
4. Open workbench - verify drafts load
5. Make changes to drafts - verify saves work
6. Mark ready for review - verify status updates
7. Finalize drafts - verify workflow_status updates
8. Commit to records - verify records created

### 3. Database Verification

```sql
-- Check canonical columns exist
SHOW COLUMNS FROM ocr_jobs LIKE 'filename';
SHOW COLUMNS FROM ocr_jobs LIKE 'ocr_text';
SHOW COLUMNS FROM ocr_jobs LIKE 'ocr_result_json';
SHOW COLUMNS FROM ocr_jobs LIKE 'status';

-- Check workflow_status exists in drafts
SHOW COLUMNS FROM ocr_fused_drafts LIKE 'workflow_status';

-- Verify data exists
SELECT id, filename, status, ocr_text IS NOT NULL as has_text 
FROM ocr_jobs 
WHERE church_id = 46 
LIMIT 5;
```

---

## Expected Results

### ✅ Success Indicators

- All automated tests pass (with and without bundle)
- Job list loads from DB (`status` field present)
- Job detail loads from DB (`ocr_text` from DB column)
- Drafts load from DB (`workflow_status` from DB column)
- UI pages load correctly without bundle files
- Status transitions work (draft → in_review → finalized → committed)

### ❌ Failure Indicators

- Tests fail when bundle is removed
- Endpoints return 500 errors without bundle
- Missing `status`, `ocr_text`, or `workflow_status` fields
- UI shows "file not found" errors

---

## Troubleshooting

### Tests Fail Without Bundle

**Problem:** Endpoints fail when bundle directory is removed.

**Solution:**
1. Verify migration was executed: `SHOW COLUMNS FROM ocr_jobs`
2. Check server logs for errors
3. Verify canonical columns exist in database
4. Check that `ocr_text` and `ocr_result_json` have data

### Missing Data in Responses

**Problem:** API responses missing expected fields.

**Solution:**
1. Check database has data: `SELECT * FROM ocr_jobs WHERE id = ?`
2. Verify column names match canonical schema
3. Check server logs for SQL errors

### Migration Not Run

**Problem:** Tests fail because schema isn't normalized.

**Solution:**
```bash
# Run migration for all churches
cd server
node scripts/migrate-all-church-ocr-schemas.js

# OR single church
cd server/scripts
./run-ocr-migration.sh 46
```

---

## Files Reference

- **Migration Script:** `server/database/migrations/normalize_ocr_schema.sql`
- **Batch Migration:** `server/scripts/migrate-all-church-ocr-schemas.js`
- **Single Church Migration:** `server/scripts/run-ocr-migration.sh`
- **Automated Tests:** `server/scripts/test-ocr-endpoints.js`
- **Verification Script:** `server/scripts/verify-ocr-db-source-of-truth.js`
- **Full Guide:** `docs/ocr/MIGRATION_EXECUTION_GUIDE.md`

---

## Support

For detailed migration steps, see `MIGRATION_EXECUTION_GUIDE.md`.  
For code changes documentation, see `VERIFICATION_RESULTS.md`.
