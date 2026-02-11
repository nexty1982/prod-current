# OCR Buckets Implementation Plan

**Date:** 2025-12-08  
**Status:** Planning Phase  
**Based on:** `important.md.txt`

## Current State

✅ **Completed:**
- OCR components refactored from `src/legacy/features/ocr` to `src/features/ocr`
- OCR Studio routes configured (`/apps/ocr-upload`, `/devel/ocr-studio`)
- OCR Studio accessible via Apps menu and Developer Tools menu
- All components use MUI theme-aware styling (dark mode compatible)

## Implementation Tasks

### Phase 1: Backend - Multi-Bucket OCR Uploads

#### Task 1.1: Locate OCR Backend Code
- [ ] Find OCR upload route handler
- [ ] Find `ocr_jobs` database model/schema
- [ ] Identify multer storage configuration
- [ ] Document current upload directory structure

#### Task 1.2: Add Bucket Support to Database
- [ ] Add `bucket` column to `ocr_jobs` table:
  - Type: `VARCHAR(32) NOT NULL DEFAULT 'records'`
  - Values: `'records'`, `'test'`, `'benchmark'`
- [ ] Update TypeScript/JavaScript types for `OcrJob` interface
- [ ] Create migration script if needed

#### Task 1.3: Environment Configuration
- [ ] Add `OCR_UPLOAD_ROOT` environment variable
- [ ] Add `OCR_BUCKETS` environment variable (comma-separated)
- [ ] Create `resolveBucket()` helper function
- [ ] Validate bucket values against `OCR_BUCKETS`

#### Task 1.4: Update Upload Storage
- [ ] Modify multer destination to use bucket-based paths
- [ ] Path structure: `${OCR_UPLOAD_ROOT}/${bucket}/`
- [ ] Ensure directory creation before upload
- [ ] Update filename generation (keep existing logic)

#### Task 1.5: Update API Endpoints
- [ ] Update `POST /api/church/:churchId/ocr/upload` to accept `bucket` parameter
- [ ] Update `GET /api/church/:churchId/ocr/jobs` to filter by `bucket` (optional query param)
- [ ] Ensure backwards compatibility (default to 'records' if bucket not provided)

#### Task 1.6: Update OCR Processing Worker
- [ ] Verify worker can handle `bucket` field in job records
- [ ] Ensure worker reads from correct bucket directory
- [ ] Test end-to-end flow with different buckets

---

### Phase 2: Front-End - Bucket Selection UI

#### Task 2.1: Update OCR API Service
- [ ] Update `uploadFiles()` in `src/features/ocr/lib/ocrApi.ts`:
  - Add optional `bucket` parameter
  - Pass bucket as query param or form data
- [ ] Update `fetchJobs()` in `src/features/ocr/lib/ocrApi.ts`:
  - Add optional `bucket` parameter
  - Append `?bucket=${bucket}` to API call when provided
- [ ] Update `OCRJob` interface to include `bucket` field

#### Task 2.2: Add Bucket Selector to UploadZone
- [ ] Add bucket state: `const [bucket, setBucket] = useState<'records' | 'test' | 'benchmark'>('records')`
- [ ] Add Select/RadioGroup component for bucket selection
- [ ] Labels:
  - "Production Records" → `records`
  - "Test Images" → `test`
  - "Benchmark Set" → `benchmark`
- [ ] Pass bucket to `uploadFiles()` call
- [ ] Update component props interface

#### Task 2.3: Add Bucket Filter to JobList
- [ ] Add bucket state (sync with UploadZone)
- [ ] Pass bucket to `fetchJobs()` call
- [ ] Show active bucket indicator in UI
- [ ] Display bucket tag/pill for each job in the list

#### Task 2.4: Update OCRStudioPage
- [ ] Add bucket state at page level
- [ ] Pass bucket to both `UploadZone` and `JobList` components
- [ ] Ensure bucket persists across component interactions
- [ ] Add visual indicator of current bucket selection

#### Task 2.5: Update ChurchOCRPage
- [ ] Apply same bucket selector changes as OCRStudioPage
- [ ] Ensure church-specific context works with buckets

---

### Phase 3: Batch OCR Benchmark Runner

#### Task 3.1: Create Benchmark Script
- [ ] Create `server/scripts/runOcrBenchmark.ts` (or `.js`)
- [ ] Set up command-line argument parsing:
  - Required: folder path
  - Optional: `--churchId=<id>`, `--bucket=benchmark`
- [ ] Add file discovery logic (find all image files)

#### Task 3.2: Implement OCR Processing Loop
- [ ] For each image file:
  - Call OCR processing (prefer internal function, fallback to HTTP)
  - Look for ground-truth files:
    - `img001.txt` (plain text)
    - `img001.json` (structured fields)
  - Store OCR result and ground-truth comparison

#### Task 3.3: Implement Accuracy Metrics
- [ ] Character-level Levenshtein distance
- [ ] Word-level accuracy (tokenization)
- [ ] Field-level accuracy (for JSON ground truth)
- [ ] Calculate percentages and aggregate statistics

#### Task 3.4: Generate Output Files
- [ ] Create `benchmark_results.json`:
  - Per-image results
  - Summary statistics
  - Timestamps and metadata
- [ ] Create `benchmark_results.html`:
  - Summary section (total files, avg accuracy, etc.)
  - Table with per-image results
  - Links to OCR outputs
  - Missing ground-truth indicators

#### Task 3.5: Error Handling & Logging
- [ ] Add comprehensive logging
- [ ] Handle individual image failures gracefully
- [ ] Exit with proper error codes
- [ ] Progress indicators for long runs

---

### Phase 4: Documentation & Testing

#### Task 4.1: Create Documentation
- [ ] Create `docs/OCR_BUCKETS_AND_BENCHMARKS.md`
- [ ] Document bucket system:
  - What buckets exist
  - Where files are stored
  - How to use bucket selection
- [ ] Document benchmark runner:
  - Usage examples
  - Command-line options
  - Output format
  - Ground-truth file formats

#### Task 4.2: Testing Checklist
- [ ] Test existing `records` bucket (backwards compatibility)
- [ ] Test `test` bucket uploads
- [ ] Test `benchmark` bucket uploads
- [ ] Test bucket filtering in job list
- [ ] Test bucket selector in UI
- [ ] Test benchmark runner script
- [ ] Test with and without ground-truth files
- [ ] Verify file storage locations
- [ ] Verify database bucket column

---

## File Locations

### Backend (to be located)
- OCR upload route handler
- `ocr_jobs` model/schema
- Multer configuration
- OCR processing worker

### Frontend (known)
- `src/features/ocr/pages/OCRStudioPage.tsx` - Main page
- `src/features/ocr/pages/ChurchOCRPage.tsx` - Church page
- `src/features/ocr/components/UploadZone.tsx` - Upload component
- `src/features/ocr/components/JobList.tsx` - Jobs list
- `src/features/ocr/lib/ocrApi.ts` - API service

### Scripts (to be created)
- `server/scripts/runOcrBenchmark.ts` - Benchmark runner

---

## Next Steps

1. **Locate backend OCR code** - Find the actual upload route and database model
2. **Start with Phase 1** - Implement bucket support in backend first
3. **Then Phase 2** - Add UI components for bucket selection
4. **Finally Phase 3** - Create benchmark runner script

---

## Notes

- All changes must be backwards-compatible
- Keep TypeScript types updated
- Use small, focused changes
- Test each phase before moving to the next

