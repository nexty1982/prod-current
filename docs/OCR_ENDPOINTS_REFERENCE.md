# OCR Endpoints Reference

Complete source code for all OCR-related endpoints in `server/src/index.ts`

## Key Endpoints

1. **GET** `/api/church/:churchId/ocr/jobs` - List OCR jobs
2. **GET** `/api/church/:churchId/ocr/jobs/:jobId` - Get job detail
3. **GET** `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Get fusion drafts
4. **POST** `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Save fusion drafts
5. **POST** `/api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review` - Mark ready for review
6. **POST** `/api/church/:churchId/ocr/jobs/:jobId/review/finalize` - Finalize drafts
7. **POST** `/api/church/:churchId/ocr/jobs/:jobId/review/commit` - Commit to database

## Database Structure

### OCR Jobs Table (`ocr_jobs`)
- **Location**: Church-specific database (e.g., `om_church_46`)
- **Key Columns**: `id`, `church_id`, `filename`, `status`, `record_type`, `confidence_score`

### Fusion Drafts Table (`ocr_fused_drafts`)
- **Location**: Church-specific database (e.g., `om_church_46`)
- **Key Columns**: 
  - `id`, `ocr_job_id`, `entry_index`, `record_type`, `record_number`
  - `payload_json` (LONGTEXT), `bbox_json` (LONGTEXT)
  - `status` ENUM('draft', 'committed') - **NOTE: Does NOT support 'in_review'**
  - `workflow_status` ENUM('draft','in_review','finalized','committed') - **Use this for 'in_review'**
  - `church_id` INT NULL - **May not exist in older schemas**

## Critical Issues to Fix

1. **Jobs may be in main DB but drafts in church DB** - Check both locations
2. **`church_id` column may be missing or NULL** - Handle gracefully
3. **`workflow_status` column may not exist** - Add if missing
4. **`status` ENUM doesn't support 'in_review'** - Use `workflow_status` instead
5. **Query filters too restrictive** - Check `church_id IS NULL` for legacy drafts

## File Locations

All endpoints are in: `server/src/index.ts`
- Lines 653-825: GET `/api/church/:churchId/ocr/jobs`
- Lines 830-962: GET `/api/church/:churchId/ocr/jobs/:jobId`
- Lines 1565-1768: GET `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts`
- Lines 1770-1896: POST `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts`
- Lines 2236-2357: POST `/api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review`
- Lines 2359-2440: POST `/api/church/:churchId/ocr/jobs/:jobId/review/finalize`
- Lines 2442-2527: POST `/api/church/:churchId/ocr/jobs/:jobId/review/commit`

## Test Endpoint

**POST** `/api/church/:churchId/ocr/test/create-test-job`
- Creates test OCR job and fusion drafts
- Use this to generate test data for debugging

