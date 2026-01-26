# Step 1: Repo Discovery - Findings Summary

## Database Architecture

### Main Database (`orthodoxmetrics_db`)
- **Location**: `server/src/config/db.js` / `server/src/config/db-compat.js`
- **Purpose**: System-wide tables (churches, auth, etc.)
- **Connection**: `promisePool` from `require('./config/db')`

### Church-Specific Databases (`om_church_XX`)
- **Location**: `server/src/utils/dbSwitcher.js`
- **Function**: `getChurchDbConnection(dbName)` returns MySQL pool
- **Purpose**: Per-church data isolation
- **Tables**: `ocr_jobs`, `ocr_fused_drafts`, `ocr_mappings`, record tables

### OCR Tables (in church DBs)

#### `ocr_jobs`
- **Columns**:
  - `id`, `church_id`, `filename`, `original_filename`, `file_path`
  - `status` (enum: 'pending','processing','complete','error','cancelled')
  - `record_type` (enum: 'baptism','marriage','funeral','custom')
  - `confidence_score`, `language`
  - `ocr_result` (LONGTEXT) - legacy JSON string
  - `ocr_result_json` (LONGTEXT) - JSON string (preferred)
  - `ocr_text` (TEXT) - extracted text
  - `created_at`, `updated_at`
- **Location**: `front-end/orthodoxmetrics_schema.sql:3112-3124`
- **API**: `GET /api/church/:churchId/ocr/jobs` (lines 660-900 in `server/src/index.ts`)

#### `ocr_fused_drafts`
- **Columns**:
  - `id`, `ocr_job_id`, `entry_index`, `record_type`, `record_number`
  - `payload_json` (LONGTEXT) - structured field data
  - `bbox_json` (LONGTEXT) - bounding box metadata
  - `workflow_status` (enum: 'draft','in_review','finalized','committed')
  - `church_id`, `created_by`, `created_at`, `updated_at`
- **Purpose**: Stores extracted/structured records for Review/Finalize
- **API**: 
  - `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` (lines 1565-1768)
  - `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` (lines 1770-1896)

## OCR Data Flow

### Vision Response Storage
1. **Primary**: Files in `server/uploads/om_church_XX/processed/`
   - `{filename}_ocr.json` - Full Vision API response
   - `{filename}_ocr.txt` - Extracted text
2. **Fallback**: Database columns
   - `ocr_result_json` (preferred)
   - `ocr_result` (legacy)
   - `ocr_text`

### Token Extraction
- **File**: `front-end/src/features/devel-tools/om-ocr/utils/visionParser.ts`
- **Function**: `parseVisionResponse(vision: VisionResponse | null)`
- **Output**: Array of `FusionLine` with nested `FusionToken[]`
- **Token Structure**:
  ```typescript
  {
    id: string;           // Stable ID: "token_{pageIndex}_{index}"
    text: string;          // Token text
    bbox: BBox;           // {x, y, w, h} in image coordinates
    confidence?: number;  // Vision API confidence
  }
  ```
- **BBox Format**: `{x: number, y: number, w: number, h: number}` (absolute pixels)

### Vision Response Type
- **File**: `front-end/src/features/devel-tools/om-ocr/types/fusion.ts`
- **Structure**: `VisionResponse` with `fullTextAnnotation.pages[]`
- **Hierarchy**: Page → Block → Paragraph → Word → Symbol

## API Endpoints (Current)

### OCR Job Management
- `GET /api/church/:churchId/ocr/jobs` - List jobs (lines 660-900)
- `GET /api/church/:churchId/ocr/jobs/:jobId` - Job detail (lines 1020-1166)
- `GET /api/church/:churchId/ocr/jobs/:jobId/image` - Serve image (lines 1171-1220)

### Fusion/Drafts
- `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Get drafts
- `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Save drafts

### Settings
- `GET /api/church/:churchId/ocr/settings` - Get OCR settings
- `PUT /api/church/:churchId/ocr/settings` - Update settings

## Frontend Architecture

### Workbench System
- **Location**: `front-end/src/features/devel-tools/om-ocr/`
- **Context**: `WorkbenchContext.tsx` - Global state management
- **Components**:
  - `OcrWorkbench.tsx` - Main container
  - `WorkbenchViewer.tsx` - Image + overlay viewer
  - `InspectionPanel.tsx` - Token inspection
- **State Shape**: `WorkbenchState` with job metadata, OCR data, entries, drafts

### Routing
- **Router**: `front-end/src/routes/Router.tsx`
- **Menu**: `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`
- **Pattern**: Routes under `/devel/` or `/devel-tools/` for dev tools
- **Example**: `/devel/enhanced-ocr-uploader` → `EnhancedOCRUploader`

### UI Framework
- **Library**: Material-UI (MUI)
- **Pattern**: React + TypeScript (strict)
- **State**: React Context + useReducer

## Key Files for Implementation

### Backend
- `server/src/index.ts` - Main Express app, OCR routes (monolithic)
- `server/src/config/db.js` - Main DB connection
- `server/src/utils/dbSwitcher.js` - Church DB connection utility
- `server/src/middleware/logger.js` - Logging utility

### Frontend
- `front-end/src/features/devel-tools/om-ocr/utils/visionParser.ts` - Token extraction
- `front-end/src/features/devel-tools/om-ocr/types/fusion.ts` - Type definitions
- `front-end/src/features/devel-tools/om-ocr/context/WorkbenchContext.tsx` - State
- `front-end/src/routes/Router.tsx` - Route definitions
- `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts` - Menu items

## Migration Strategy

### Database Migrations
- **Pattern**: No dedicated migrations folder found
- **Approach**: Create SQL migration files in `server/database/migrations/` (or similar)
- **Idempotency**: Use `IF NOT EXISTS` or check table existence before CREATE
- **Target DB**: `orthodoxmetrics_db` (main DB, NOT church DBs) for extractor definitions

### New Tables Needed
1. `ocr_extractors` - Extractor definitions
2. `ocr_extractor_fields` - Field definitions (nested via `parent_field_id`)

## Integration Points

### Where to Store Extractor Association
- **Option 1**: Add `extractor_id` column to `ocr_jobs` table
- **Option 2**: Store in `ocr_fused_drafts.bbox_json` metadata
- **Recommendation**: Option 1 (cleaner, queryable)

### Where to Store Extraction Results
- **Option 1**: Extend `ocr_fused_drafts.payload_json` with extractor results
- **Option 2**: New table `ocr_extractions` (job_id, extractor_id, result_json)
- **Recommendation**: Option 1 (reuse existing draft system)

### Token Access for Extraction Engine
- **Source**: `parseVisionResponse()` already provides tokens
- **Adapter Needed**: Create `tokenizeVisionResponse()` that returns flat `OcrToken[]`
- **Format**: `{text: string, confidence: number, bbox: BBox}`

## Next Steps

1. **DB Migration**: Create `ocr_extractors` and `ocr_extractor_fields` tables
2. **Backend Routes**: Add extractor CRUD + test + extract endpoints
3. **Extraction Engine**: Implement `runExtractor()` with token clustering
4. **Frontend Builder**: Create Extractor Builder UI
5. **Workbench Integration**: Add extractor selection + run extraction

## Notes

- Server uses CommonJS (`require/module.exports`)
- Frontend uses ES modules (`import/export`)
- No TypeScript in server (yet) - will need to add types or use JSDoc
- Church DBs are dynamically connected via `dbSwitcher`
- OCR results can be in files OR database (prefer files, fallback to DB)

