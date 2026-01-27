# OCR DB Source of Truth - Verification Results
**Date:** January 25, 2026

---

## Summary

Successfully refactored OCR system to enforce Database as single source of truth. Job Bundle files are now optional artifacts only.

---

## Code Changes Completed

### 1. Documentation
- ✅ Created `docs/ocr/OCR_REVAMP_PLAN.md` with DB source of truth contract
- ✅ Documented canonical tables and Job Bundle policy
- ✅ Established requirement: DB must render without bundle files

### 2. Migration Scripts
- ✅ Created `server/database/migrations/normalize_ocr_schema.sql`
  - Standardizes `ocr_jobs` columns (filename, ocr_result_json, ocr_text, status)
  - Migrates legacy columns (file_name → filename, result_json → ocr_result_json)
  - Normalizes `ocr_fused_drafts` (ensures workflow_status, church_id NOT NULL)
  - Adds missing indexes
- ✅ Created `server/scripts/migrate-all-church-ocr-schemas.js`
  - Batch migration script for all church databases
  - Idempotent (safe to run multiple times)

### 3. Read Path Refactoring (DB-Only)

#### `GET /api/church/:churchId/ocr/jobs` (L1012-1232)
**Before:** Read from DB, then merged with Job Bundle manifests to get "authoritative status"  
**After:** DB-only reads, bundle existence checked as optional metadata (`has_bundle` field)

**Changes:**
- Removed `tryReadManifest()` calls
- Removed `manifestMap` merge logic
- Status now comes from DB: `job.status` (not `manifest?.status`)
- `updated_at` now from DB: `job.updated_at` (not `manifest?.updatedAt`)
- `record_type` now from DB: `job.record_type` (not `manifest?.recordType`)
- Added optional `has_bundle` metadata field

**File:** `server/src/index.ts` L1012-1232

#### `GET /api/church/:churchId/ocr/jobs/:jobId` (L1543-1675)
**Before:** Read from DB, then fell back to files for OCR text/JSON  
**After:** DB-only reads, no file fallback

**Changes:**
- Removed dynamic column detection (`SHOW COLUMNS`)
- Uses canonical columns: `ocr_text`, `ocr_result_json`
- Removed file reading logic (`_ocr.txt`, `_ocr.json` files)
- OCR text from DB: `job.ocr_text`
- OCR result from DB: parsed from `job.ocr_result_json`
- Added optional `has_bundle` metadata field

**File:** `server/src/index.ts` L1543-1675

#### `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` (L2430-2531)
**Before:** Read from Job Bundle (`readDrafts()`)  
**After:** Read from DB (`ocr_fused_drafts` table)

**Changes:**
- Removed `readDrafts()` call
- Query from `ocr_fused_drafts` table with `workflow_status` filter
- Parse `payload_json` and `bbox_json` from DB columns
- Return format unchanged (for API compatibility)

**File:** `server/src/index.ts` L2430-2531

### 4. Write Path Refactoring (DB-First)

#### `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` (L2534-2681)
**Before:** Write to Job Bundle first, then "best-effort" DB write  
**After:** Write to DB first (canonical), then optional bundle write

**Changes:**
- Removed `upsertDraftEntries()` call (was primary write)
- INSERT/UPDATE to `ocr_fused_drafts` table first
- Bundle write moved to optional/non-blocking section
- Bundle write failures don't affect response

**File:** `server/src/index.ts` L2534-2681

#### `POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize` (L3250-3440)
**Before:** Read from Job Bundle, update bundle, then "best-effort" DB update  
**After:** Read from DB, update DB, then optional bundle update

**Changes:**
- Removed `readDrafts()` and `readManifest()` calls
- Query `ocr_fused_drafts` with `workflow_status IN ('draft', 'in_review')`
- UPDATE `workflow_status = 'finalized'` in DB
- Bundle update moved to optional/non-blocking section

**File:** `server/src/index.ts` L3250-3440

#### `POST /api/church/:churchId/ocr/jobs/:jobId/review/commit` (L3443-3637)
**Before:** Read from Job Bundle, commit to DB, then update bundle  
**After:** Read from DB, commit to DB, then optional bundle update

**Changes:**
- Removed `readDrafts()` call
- Query `ocr_fused_drafts` with `workflow_status = 'finalized'`
- INSERT into record tables (baptism/marriage/funeral)
- UPDATE `workflow_status = 'committed'` in DB
- Bundle update moved to optional/non-blocking section

**File:** `server/src/index.ts` L3443-3637

### 5. Route Consolidation
- ✅ Created `server/src/routes/churchOcrRoutes.ts` with DB-only implementations
- ⚠️  Not yet integrated into main app (endpoints still in `server/src/index.ts`)
- ✅ Added deprecation warnings to `server/routes/ocr.js`

### 6. Dynamic Column Detection Removal
- ✅ Removed `fetchOcrJobsDynamic()` function (L1036-1094)
- ✅ Replaced with direct query using canonical columns
- ⚠️  Note: After migration runs, can remove all `SHOW COLUMNS` logic

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `server/src/index.ts` | ~500 lines | Refactored 6 endpoints to DB-only |
| `server/routes/ocr.js` | 3 lines | Added deprecation warnings |
| `server/src/routes/churchOcrRoutes.ts` | 400 lines | New consolidated routes file (not integrated) |
| `server/database/migrations/normalize_ocr_schema.sql` | 200 lines | Schema normalization migration |
| `server/scripts/migrate-all-church-ocr-schemas.js` | 100 lines | Batch migration script |
| `docs/ocr/OCR_REVAMP_PLAN.md` | 150 lines | Source of truth contract |
| `docs/ocr/VERIFICATION_RESULTS.md` | This file | Verification documentation |

---

## Testing Performed

### Code Review
- ✅ Verified all bundle reads removed from canonical paths
- ✅ Verified DB writes happen before bundle writes
- ✅ Verified bundle writes are non-blocking
- ✅ Verified error handling doesn't depend on bundle

### Manual Testing Required

**Test Procedure:**
1. Run migration: `node server/scripts/migrate-all-church-ocr-schemas.js`
2. Backup bundle directory: `mv om_church_46/jobs om_church_46/jobs.backup`
3. Test endpoints:
   - GET `/api/church/46/ocr/jobs` - Should return jobs from DB
   - GET `/api/church/46/ocr/jobs/1` - Should return job detail from DB
   - GET `/api/church/46/ocr/jobs/1/fusion/drafts` - Should return drafts from DB
   - POST `/api/church/46/ocr/jobs/1/fusion/drafts` - Should save to DB
   - POST `/api/church/46/ocr/jobs/1/review/finalize` - Should update DB
   - POST `/api/church/46/ocr/jobs/1/review/commit` - Should commit from DB
4. Restore bundle: `mv om_church_46/jobs.backup om_church_46/jobs`
5. Verify optional bundle attachment still works

**Status:** ⚠️  Manual testing not yet performed (requires running server)

---

## Known Issues

1. **Migration Not Run**: Schema normalization migration needs to be executed
2. **Dynamic Column Detection**: Some endpoints still use `SHOW COLUMNS` (will fail gracefully if columns missing)
3. **Route Consolidation**: New `churchOcrRoutes.ts` not integrated into main app
4. **Legacy Routes**: `/api/ocr/*` routes still active (should be deprecated)

---

## Next Steps

1. **Run Migration**: Execute `normalize_ocr_schema.sql` for all church databases
2. **Remove Dynamic Detection**: After migration, remove all `SHOW COLUMNS` logic
3. **Integrate Routes**: Mount `churchOcrRoutes.ts` in main app, remove endpoints from `index.ts`
4. **Deprecate Legacy**: Add 410 responses to `/api/ocr/*` routes
5. **Manual Testing**: Test all endpoints with bundle directory removed
6. **Frontend Verification**: Ensure frontend doesn't depend on bundle existence

---

## Verification Checklist

- [x] Documentation created
- [x] Migration scripts created
- [x] Read paths refactored (jobs list)
- [x] Read paths refactored (job detail)
- [x] Read paths refactored (drafts list)
- [x] Write paths refactored (save drafts)
- [x] Write paths refactored (finalize)
- [x] Write paths refactored (commit)
- [x] Dynamic column detection removed (jobs list)
- [ ] Migration executed (manual step)
- [ ] Manual endpoint testing (requires running server)
- [ ] Frontend testing (requires running frontend)
- [ ] Route consolidation completed
- [ ] Legacy routes deprecated

---

**Status:** Code refactoring complete. Ready for migration execution and manual testing.
