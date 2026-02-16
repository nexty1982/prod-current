# OCR Pipeline

## Overview

The OCR system digitizes historical church ledger pages into structured database records. It supports baptism, marriage, and funeral record types across multiple languages.

```
Upload → Feeder Queue → Preprocess → Google Vision API → Table Extraction → Column Mapping → Draft Records
```

## Pipeline Flow

### 1. Upload

User uploads scanned ledger page(s) via OCR Studio frontend (`/devel/ocr-studio/upload`).

- Frontend: `OmOcrStudioPage`, `EnhancedOCRUploader`, `OcrUploader`
- Backend: `/api/feeder/*` (`routes/feeder`) or `/api/church/:churchId/ocr/*` (`routes/ocr/index`)
- Files stored temporarily via multer (100MB limit)

### 2. Feeder Queue

Job record created in `ocr_jobs` table (platform DB or church DB). The OCR worker polls for pending jobs.

- Worker: `server/src/workers/ocrFeederWorker.js` (runs in-process, launched at server start)
- Job states: `pending` → `processing` → `completed` / `failed`

### 3. Vision API

Google Cloud Vision API processes the page image. Results are stored **on disk**, NOT in the `ocr_jobs.ocr_result` DB column.

- Storage path: `server/storage/feeder/job_{id}/page_0/vision_result.json`
- The `ocr_result` column in `ocr_jobs` is typically NULL for feeder pipeline jobs

### 4. Vision Result Structure

The feeder pipeline produces a different structure than raw Google Vision API:

```json
{
  "text": "full page text...",
  "pages": [
    {
      "width": 2480,
      "height": 3508,
      "blocks": [
        {
          "text": "block text",
          "confidence": 0.98,
          "boundingBox": { "x": 100, "y": 200, "width": 300, "height": 50 }
        }
      ]
    }
  ]
}
```

**Important**: Pages are at root level (`result.pages`), NOT under `result.fullTextAnnotation.pages`. The `visionParser.ts` handles both formats.

### 5. Table Extraction

Extracts structured rows from OCR text using layout templates that define column bands.

- Layout files: `server/src/ocr/layouts/`
  - `marriage_ledger_v1.js` — Marriage ledger layout
  - `generic_table.js` — Generic table layout
- Column bands: Fractional x-ranges of page width (e.g., `{ start: 0.0, end: 0.15 }`)
- Table extractor controller falls back to feeder disk file when `ocr_result` DB column is NULL

### 6. Column Mapping

Maps extracted table columns to database fields for the target record type.

- Mapper: `server/src/ocr/columnMapper.ts`
- Maps generic column positions to typed fields (e.g., column 0 → `first_name`, column 1 → `last_name`)

### 7. Draft Records

Extracted data becomes draft records that users review and approve via the OCR Workbench.

## Key Files

| File | Purpose |
|------|---------|
| `server/src/workers/ocrFeederWorker.js` | In-process worker that polls and processes OCR jobs |
| `server/src/routes/feeder.ts` | Feeder API endpoints |
| `server/src/routes/ocr/index.ts` | Church-scoped OCR route mounting |
| `server/src/routes/ocr/jobs.ts` | OCR job management endpoints |
| `server/src/routes/ocr/helpers.ts` | OCR helper utilities |
| `server/src/ocr/layouts/*.js` | Table extraction layout definitions |
| `server/src/ocr/columnMapper.ts` | Column-to-field mapping |
| `server/src/utils/visionParser.ts` | Parses Vision API results (handles both formats) |
| `server/src/utils/ocrClassifier.ts` | OCR document classification |
| `server/src/utils/ocrPaths.ts` | OCR storage path utilities |
| `server/storage/feeder/` | On-disk storage for vision results |

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `OCRStudioPage` | Main OCR studio interface |
| `OmOcrStudioPage` | Enhanced OCR upload studio |
| `OcrReviewPage` | Review OCR results for a job |
| `OcrActivityMonitor` | Monitor OCR job queue |
| `OcrTableExtractorPage` | Table extraction interface |
| `LayoutTemplateEditorPage` | Edit column band layouts |
| `FusionOverlay` | Visual overlay of OCR boxes on scanned image |
| `WorkbenchViewer` | Interactive record editing from OCR data |

## FusionOverlay Positioning

When rendering OCR bounding boxes over the scanned image:

- The overlay container is positioned at the image location
- Child box elements must subtract `metrics.left` / `metrics.top` (NOT `offsetX`/`offsetY`)
- Coordinates are image-relative, not page-relative

## Tenant Schema Requirements

Each church DB (`om_church_##`) needs these OCR tables:
- `ocr_jobs` — Job queue and results
- `ocr_feeder_pages` — Page-level data
- `ocr_feeder_artifacts` — Artifacts (preprocessed images, etc.)

The `assertTenantOcrTablesExist()` function in `db.js` verifies and auto-creates missing columns/indexes.
