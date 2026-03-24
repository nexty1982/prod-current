# OCR Pipeline

## Overview

The OCR system digitizes historical church ledger pages into structured database records. It supports baptism, marriage, and funeral record types across English, Greek, and Russian/Church Slavonic scripts.

```
Upload → Feeder Queue → Preprocess → Google Vision API → Token Extraction → Layout/Column Mapping → Draft Records → Review → Commit
```

## Architecture

### Services

| Service | Systemd Unit | Port | Purpose |
|---------|-------------|------|---------|
| Backend API | `orthodox-backend` | 3001 | API endpoints, job creation |
| OCR Worker | `om-ocr-worker` | — | Polls and processes OCR jobs |

The OCR worker runs as a **separate systemd service**, not in-process with the backend. Restart both when changing worker code:
```bash
sudo systemctl restart om-ocr-worker
sudo systemctl restart orthodox-backend   # if API routes changed
```

### Database Tables

**Platform DB (`orthodoxmetrics_db`):**
- `ocr_jobs` — Job queue (status, church_id, record_type, language, confidence)
- `ocr_job_history` — State change audit trail
- `ocr_global_settings` — Platform-wide OCR configuration
- `ocr_extractors` — Extractor definitions
- `ocr_extractor_fields` — Field definitions per extractor
- `ocr_correction_log` — Correction memory for accuracy improvement

**Tenant DB (`om_church_##`):**
- `ocr_feeder_pages` — Page-level data within jobs
- `ocr_feeder_artifacts` — Artifacts (preprocessed images, tokens, layout data)
- `ocr_fused_drafts` — Draft records pending review

### Indexes

Performance indexes on `ocr_jobs`:
- `idx_church_status (church_id, status)` — Worker polling, admin dashboards
- `idx_status_created (status, created_at)` — Stale detection, queue ordering
- `idx_created_by (created_by)` — User audit trail
- `idx_church_record_type (church_id, record_type)` — Type-filtered queries

## Pipeline Flow

### 1. Upload

User uploads scanned ledger page(s) via OCR Studio frontend (`/portal/ocr` or `/devel/ocr-studio/upload`).

- Frontend: `OmOcrStudioPage`, `EnhancedOCRUploader`, `OcrUploader`
- Backend: `POST /api/feeder/ingest` or `POST /api/church/:churchId/ocr/jobs`
- Files stored via multer (100MB limit) under `uploads/om_church_<id>/uploaded/`

### 2. Feeder Queue

Job record created in `ocr_jobs` table. The worker polls for pending jobs.

- Worker: `server/src/workers/ocrFeederWorker.ts` (compiled to `dist/workers/ocrFeederWorkerMain.js`)
- Entry point: `server/src/workers/ocrFeederWorkerMain.ts`
- Job states: `pending` → `processing` → `complete`/`completed` / `error`/`failed`
- Claiming: Atomic `UPDATE ... WHERE status = 'pending'` (race-resistant, MariaDB-compatible)
- Configurable: poll batch size, idle/busy intervals, heartbeat frequency (via `ocr_global_settings`)

### 3. Preprocessing

Image preprocessing via Sharp:
- Resize to max 4000px
- Convert to grayscale
- Normalize contrast
- Border trimming and deskew geometry detection
- Artifacts stored at `storage/feeder/job_<id>/page_<index>/`

### 4. Vision API

Google Cloud Vision API (documentTextDetection) processes the preprocessed image.

- Results stored **on disk** at `storage/feeder/job_<id>/page_<index>/vision_result.json`
- The `ocr_result` column in `ocr_jobs` is typically NULL for feeder pipeline jobs
- Language hints configurable via `ocr_global_settings`

### 5. Token Extraction

Vision JSON → structured tokens with bounding boxes, script detection, and line clustering.

- Module: `server/src/utils/visionParser.ts`
- Handles both feeder format (`result.pages`) and raw Vision format (`result.fullTextAnnotation.pages`)

### 6. Table Extraction & Column Mapping

Extracts structured rows using layout templates that define column bands.

- Layout files: `server/src/ocr/layouts/` (e.g., `marriage_ledger_v1.js`, `generic_table.js`)
- Column bands: Fractional x-ranges (e.g., `{ start: 0.0, end: 0.15 }`)
- Mapper: `server/src/ocr/columnMapper.ts`
- Classifier: `server/src/utils/ocrClassifier.ts` (auto-detects record type: baptism/marriage/funeral)
- Header hints for each type enable dynamic column inference

### 7. Scoring & Quality

Each extracted record receives a composite quality score:
- OCR confidence (from Vision API word-level confidence)
- Quality metrics (from preprocessing: sharpness, contrast)
- Configurable weights and thresholds via `ocr_global_settings`
- Jobs above accept threshold → auto-accepted; below → queued for review

### 8. Draft Records & Review

Extracted data becomes draft records (`ocr_fused_drafts`) reviewed via the OCR Workbench.

- Frontend: `WorkbenchViewer`, `FusionOverlay`
- Workflow: `draft` → `in_review` → `approved` → committed to record tables
- Corrections recorded in `ocr_correction_log` for future accuracy improvement

## Key Files

| File | Purpose |
|------|---------|
| `server/src/workers/ocrFeederWorker.ts` | Main worker — preprocessing, OCR, parsing, scoring |
| `server/src/workers/ocrFeederWorkerMain.ts` | Worker entry point |
| `server/src/routes/feeder.js` | Feeder ingest API |
| `server/src/routes/ocr/index.ts` | OCR route mounting (admin + church-scoped) |
| `server/src/routes/ocr/jobs.ts` | Job CRUD endpoints |
| `server/src/routes/ocr/adminMonitor.ts` | Admin OCR monitoring dashboard API |
| `server/src/routes/ocr/fusion.ts` | Fusion draft workflow endpoints |
| `server/src/routes/ocr/review.ts` | Review and commit endpoints |
| `server/src/routes/ocr/settings.ts` | Church-level OCR settings |
| `server/src/routes/ocr/mapping.ts` | Field mapping configuration |
| `server/src/ocr/layouts/*.js` | Table extraction layout definitions |
| `server/src/ocr/columnMapper.ts` | Column-to-field mapping engine |
| `server/src/utils/visionParser.ts` | Vision API result parser |
| `server/src/utils/ocrClassifier.ts` | Record type auto-classification |
| `server/src/utils/ocrPaths.ts` | Storage path utilities |
| `server/src/services/fieldConfigService.ts` | Field configuration versioning |

## Health Monitoring

### Endpoints

- `GET /api/system/health` — Public health check, includes OCR worker status and pending job count
- `GET /api/system/ocr/health` — Detailed OCR health (admin only): worker status, pending/processing/failed counts, stale job detection, storage status, average processing time
- `POST /api/system/ocr/recover-stale` — Reset stuck jobs to pending (super_admin only)

### Stale Job Detection

Jobs stuck in `processing` for >10 minutes are flagged as stale. The health endpoint reports stale job IDs. Recovery resets them to `pending` for re-processing.

## FusionOverlay Positioning

When rendering OCR bounding boxes over the scanned image:
- The overlay container is positioned at the image location
- Child box elements must subtract `metrics.left` / `metrics.top` (NOT `offsetX`/`offsetY`)
- Coordinates are image-relative, not page-relative

## Tenant Schema Requirements

Each church DB (`om_church_##`) needs OCR tables. The `assertTenantOcrTablesExist()` function in `db.js` verifies and auto-creates missing tables/columns/indexes when a tenant pool is first accessed.

## Feature Lifecycle

OCR features are tracked in `featureRegistry.ts`:
- `ocr-studio` (Stage 5 — Production)
- `upload-records` (Stage 5 — Production)
- `ocr-workbench` (Stage 2 — Development)
- `ocr-admin-dashboard` (Stage 2 — Development)
- `ocr-backend-infra` (Stage 2 — Development)

Stage progression controls visibility: stages 1-4 are super_admin only, stage 5 is all users.
