# Complete OCR Endpoints Source Code

All OCR-related endpoints from `server/src/index.ts`

## File Locations in index.ts

- **Lines 653-825**: GET `/api/church/:churchId/ocr/jobs` - List jobs
- **Lines 830-962**: GET `/api/church/:churchId/ocr/jobs/:jobId` - Get job detail  
- **Lines 1358-1563**: POST `/api/church/:churchId/ocr/test/create-test-job` - Test endpoint
- **Lines 1565-1768**: GET `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Get drafts
- **Lines 1770-1896**: POST `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Save drafts
- **Lines 1898-2006**: POST `/api/church/:churchId/ocr/jobs/:jobId/fusion/validate` - Validate
- **Lines 2008-2172**: POST `/api/church/:churchId/ocr/jobs/:jobId/fusion/commit` - Commit
- **Lines 2178-2234**: PUT `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:entryIndex` - Autosave
- **Lines 2236-2357**: POST `/api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review` - Ready for review
- **Lines 2359-2442**: POST `/api/church/:churchId/ocr/jobs/:jobId/review/finalize` - Finalize
- **Lines 2444-2560**: POST `/api/church/:churchId/ocr/jobs/:jobId/review/commit` - Commit to DB

## File Upload Paths

- **OCR Image Uploads**: `server/uploads/om_church_46/processed/`
- **NOT**: `prod/uploads/om_church_46/`
- Processed files are stored in the `server/uploads/` directory structure

## Key Database Tables

### ocr_jobs (in church database)
- Location: Church-specific DB (e.g., `om_church_46`)
- Columns: `id`, `church_id`, `filename`, `status`, `record_type`, etc.

### ocr_fused_drafts (in church database)  
- Location: Church-specific DB (e.g., `om_church_46`)
- Key columns:
  - `id`, `ocr_job_id`, `entry_index`, `record_type`
  - `payload_json` (LONGTEXT), `bbox_json` (LONGTEXT)
  - `status` ENUM('draft', 'committed') - **DOES NOT support 'in_review'**
  - `workflow_status` ENUM('draft','in_review','finalized','committed') - **USE THIS**
  - `church_id` INT NULL - **May be missing or NULL**

## Critical Issues

1. **Jobs in main DB, drafts in church DB** - Check both locations
2. **church_id column missing/NULL** - Query handles: `church_id = ? OR church_id IS NULL`
3. **workflow_status column missing** - Code detects and handles gracefully
4. **status ENUM doesn't support 'in_review'** - Use `workflow_status` instead
5. **Query filters too restrictive** - Check logs for debugging

## Quick Reference

See `OCR_CODE_REFERENCE.txt` for detailed endpoint documentation and `OCR_ENDPOINTS_REFERENCE.md` for endpoint summaries.

