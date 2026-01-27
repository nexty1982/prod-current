# OCR Record Uploader + Inspection Panel - Repo Discovery Report

## 1) Frontend Entrypoints

### OCR Uploader Page Component
- **Path**: `front-end/src/features/devel-tools/om-ocr/EnhancedOCRUploader.tsx`
- **Exported**: Default export `EnhancedOCRUploader`
- **Role**: Main uploader page with batch file upload, progress tracking, church selector
- **Key State**: 
  - `files: UploadFile[]` - Upload queue
  - `settings: OCRSettings` - OCR processing settings
  - `docSettings: DocumentProcessingSettings` - Document processing settings (Phase 1)
  - `extractionAction: ExtractionAction` - Action selector state

### OCR Inspection/Detail Components
- **Path**: `front-end/src/features/devel-tools/om-ocr/components/InspectionPanel.tsx`
- **Exported**: Default export `InspectionPanel`
- **Role**: Side-by-side image viewer with tabbed OCR results (Text, Structured, Mapping, Fusion, Review)
- **Tabs**: 
  - Tab 0: "Text" - Shows `jobOcrText` in monospace with search
  - Tab 1: "Structured" - Shows raw JSON dump of `jobOcrResult`
  - Tab 2: "Mapping" - Field mapping interface
  - Tab 3: "Fusion" - Lazy-loaded FusionTab component
  - Tab 4: "Review & Finalize" - ReviewFinalizeTab component

### OCR Workbench (Current Primary UI)
- **Path**: `front-end/src/features/devel-tools/om-ocr/components/workbench/OcrWorkbench.tsx`
- **Exported**: Default export `OcrWorkbench`
- **Role**: Two-phase UI: (1) UnifiedJobsList, (2) Workbench for selected job
- **Components**:
  - `UnifiedJobsList` - Jobs list view
  - `WorkbenchHeader` - Job metadata header
  - `WorkbenchViewer` - Image viewer (left 50%)
  - `TranscriptionPanel` - Transcription display (right 50%, Phase 1 implementation)
  - `WorkbenchStepper` - Multi-step workflow (currently hidden, replaced by TranscriptionPanel)

### Where OCR "Preview Text" is Computed/Rendered

**Current Implementation:**
1. **InspectionPanel Text Tab** (Tab 0):
   - Renders `jobOcrText` directly from `JobDetail.ocr_text`
   - Location: `InspectionPanel.tsx` lines 648-701
   - Display: Monospace font, searchable, copy button
   - **This is the current "unreadable" preview** - shows raw OCR text without normalization

2. **Workbench TranscriptionPanel** (Phase 1):
   - Path: `front-end/src/features/devel-tools/om-ocr/components/TranscriptionPanel.tsx`
   - Uses `extractTextFromVisionResponse()` from `textNormalizer.ts`
   - Applies `enhanceOcrTextStructure()` for formatting
   - **This is the new transcription-first display**

3. **Text Extraction Utilities**:
   - `front-end/src/features/devel-tools/om-ocr/utils/textNormalizer.ts`
     - `extractTextFromVisionResponse(visionResponse)` - Extracts from Vision API structure
     - `extractStructuredTextFromVision(visionResponse)` - Uses blocks/paragraphs
     - `enhanceOcrTextStructure(text)` - Pattern-based formatting
   - `front-end/src/features/devel-tools/om-ocr/utils/visionParser.ts`
     - `parseVisionResponse(vision)` - Parses Vision response to FusionLine[] with bboxes

## 2) Frontend API Client Calls

### API Client
- **Path**: `front-end/src/shared/lib/axiosInstance.ts`
- **Export**: `apiClient: ApiClient` (axios instance wrapper)
- **Base URL**: From `API_CONFIG.BASE_URL`
- **Features**: Auto `/api` prefix, FormData handling, error interceptors

### OCR Endpoints Called

**Upload Images:**
- **Endpoint**: `POST /api/ocr/jobs/upload`
- **Location**: `EnhancedOCRUploader.tsx` line 676
- **Payload**: FormData with `files`, `churchId`, `recordType`, `language`, `settings` (JSON string)

**Fetch OCR Jobs List:**
- **Endpoint**: `GET /api/church/:churchId/ocr/jobs?limit=200`
- **Location**: `useOcrJobs.ts` line 59
- **Returns**: `{ jobs: OCRJobRow[] }`

**Fetch OCR Job Detail:**
- **Endpoint**: `GET /api/church/:churchId/ocr/jobs/:jobId`
- **Location**: `useOcrJobs.ts` line 123
- **Returns**: `OCRJobDetail` (see types below)

**Fetch OCR Job Image:**
- **Endpoint**: `GET /api/church/:churchId/ocr/jobs/:jobId/image`
- **Location**: `OcrWorkbench.tsx` line 114
- **Returns**: Image file (binary)

**Update Record Type:**
- **Endpoint**: `PATCH /api/church/:churchId/ocr/jobs/:jobId`
- **Location**: `useOcrJobs.ts` line 169
- **Payload**: `{ record_type: string }`

**Retry Failed Job:**
- **Endpoint**: `POST /api/church/:churchId/ocr/jobs/:jobId/retry`
- **Location**: `useOcrJobs.ts` line 201

**Delete Jobs:**
- **Endpoint**: `DELETE /api/church/:churchId/ocr/jobs`
- **Location**: `useOcrJobs.ts` line 231
- **Payload**: `{ jobIds: number[] }`

### TypeScript Types/Interfaces

**OCRJobRow** (`types/ocrJob.ts`):
```typescript
{
  id: number;
  church_id: number;
  original_filename: string;
  filename?: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  record_type: 'baptism' | 'marriage' | 'funeral';
  confidence_score?: number | null;
  language?: string | null;
  created_at?: string;
  updated_at?: string;
  ocr_text_preview?: string | null;
  has_ocr_text?: boolean;
  error_message?: string | null;
}
```

**OCRJobDetail** (`types/ocrJob.ts`):
```typescript
extends OCRJobRow {
  ocr_text: string | null;
  ocr_result: any | null;  // Vision API response
  file_path?: string;
  mapping?: any | null;
}
```

**JobDetail** (`types/inspection.ts`):
```typescript
{
  id: string;
  filename?: string;
  original_filename?: string;
  file_path?: string;
  status: string;
  record_type?: string;
  ocr_text?: string | null;
  ocr_result?: OCRResult | null;  // Vision API response
  // ... other fields
}
```

**VisionResponse** (`types/fusion.ts`):
- Matches Google Vision API `fullTextAnnotation` structure
- Contains `pages[]` → `blocks[]` → `paragraphs[]` → `words[]` → `symbols[]`

## 3) Backend Routes/Services

### Express Route File
- **Path**: `server/src/index.ts`
- **Routes Defined**:
  - `GET /api/church/:churchId/ocr/jobs` (line 742)
  - `POST /api/ocr/jobs/upload` (line 967)
  - `GET /api/church/:churchId/ocr/jobs/:jobId` (line 1116)
  - `GET /api/church/:churchId/ocr/jobs/:jobId/image` (line 1253)
  - `PATCH /api/church/:churchId/ocr/jobs/:jobId` (implied, not shown in read)
  - `POST /api/church/:churchId/ocr/jobs/:jobId/retry` (implied, not shown in read)
  - `DELETE /api/church/:churchId/ocr/jobs` (implied, not shown in read)

### Handler Functions

**GET Job Detail Handler** (`server/src/index.ts` lines 1116-1248):
- Queries `ocr_jobs` table
- Reads OCR text from:
  1. DB column `ocr_text` (if exists)
  2. File: `{filenameWithoutExt}_ocr.txt` (extracts text after "=== Extracted Text ===")
- Reads OCR JSON from:
  1. File: `{filenameWithoutExt}_ocr.json`
  2. DB column `ocr_result_json` (fallback)
  3. DB column `ocr_result` (fallback, if JSON string)
- Returns: `{ id, original_filename, filename, file_path, status, record_type, language, confidence_score, created_at, updated_at, ocr_text, ocr_result, error, mapping, has_ocr_text }`

### Existing Parse Utilities

**Frontend:**
- `front-end/src/features/devel-tools/om-ocr/utils/visionParser.ts`
  - `parseVisionResponse(vision: VisionResponse): FusionLine[]` - Extracts lines with bboxes
  - `getVisionPageSize(vision: VisionResponse): { width, height }`
  - `detectEntries(lines, pageSize): FusionEntry[]` - Multi-record segmentation

**Backend:**
- No dedicated transcription normalization module found
- OCR processing happens in upload handler (line 967+)
- Vision API response stored as-is in `ocr_result_json` column or file

## 4) Data Model

### Database Tables

**Table: `ocr_jobs`** (church-specific database)
- **Columns** (dynamic, checked at runtime):
  - Base: `id`, `filename`, `original_filename`, `file_path`, `status`, `record_type`, `language`, `confidence_score`, `file_size`, `mime_type`, `created_at`, `updated_at`, `church_id`
  - Optional: `ocr_text` (TEXT), `ocr_result` (TEXT/JSON), `ocr_result_json` (JSON), `error` (TEXT)
- **Location**: Church database (e.g., `om_church_46`)
- **Creation**: Auto-created if not exists (line 1007)

**Table: `ocr_mappings`** (church-specific database)
- Stores field mappings for jobs
- Columns: `id`, `ocr_job_id`, `record_type`, `mapping_json`, `created_by`, `created_at`, `updated_at`

### OCR Result Storage

**Storage Methods:**
1. **Database**:
   - `ocr_text` column: Raw OCR text (if available)
   - `ocr_result_json` column: Full Vision API JSON response (if available)
   - `ocr_result` column: Legacy JSON string (if available)

2. **Filesystem**:
   - Base path: `/var/www/orthodoxmetrics/prod/server/uploads/om_church_{id}/processed/`
   - Text file: `{filenameWithoutExt}_ocr.txt`
     - Format: Contains "=== Extracted Text ===" marker, then raw text
   - JSON file: `{filenameWithoutExt}_ocr.json`
     - Format: Full Vision API response JSON

**Retrieval Priority** (from GET handler):
1. DB `ocr_text` column
2. File `{filenameWithoutExt}_ocr.txt` (extract text portion)
3. File `{filenameWithoutExt}_ocr.json` → parse JSON
4. DB `ocr_result_json` column → parse JSON
5. DB `ocr_result` column → parse JSON string

### Page Indexing
- **Current**: Single-page documents only
- **Multi-page**: Not explicitly handled in current implementation
- Vision API response contains `pages[]` array, but UI assumes single page

## 5) Minimal Change Plan

### Insertion Points

**A) extractTokensFromVision Adapter**
- **Location**: `server/src/ocr/transcription/extractTokensFromVision.ts` (NEW)
- **Input**: Vision API response (from `ocr_result_json` or file)
- **Output**: `{ tokens: OcrToken[], lines?: OcrLine[] }`
- **Reuse**: Can adapt existing `parseVisionResponse` logic from frontend `visionParser.ts`
- **Integration**: Called from normalization module

**B) normalizeTranscription Module**
- **Location**: `server/src/ocr/transcription/normalizeTranscription.ts` (NEW)
- **Dependencies**: 
  - `extractTokensFromVision.ts`
  - `scriptDetect.ts` (NEW) - Cyrillic/Latin detection
  - `clusterLines.ts` (NEW) - Y-coordinate line clustering
- **Function**: `normalizeTranscription(input: { tokens, lines? }): { text, paragraphs, diagnostics }`
- **Integration**: Called from GET job detail handler (line 1227) before returning response

**C) API Response Extension**
- **Location**: `server/src/index.ts` line 1227 (modify existing handler)
- **Change**: Add `transcription` field to response:
  ```typescript
  res.json({
    // ... existing fields
    transcription: {
      text: string,
      paragraphs: string[],
      diagnostics: {
        droppedTokenCount: number,
        lineCount: number,
        paragraphCount: number,
        scriptsPresent: string[],
        warnings: string[]
      }
    }
  });
  ```
- **Alternative**: New endpoint `GET /api/church/:churchId/ocr/jobs/:jobId/transcription` if risky to modify existing

### Avoid Schema Changes
- ✅ No DB schema changes needed
- ✅ Use existing `ocr_result_json` column/file as input
- ✅ Return transcription as computed field in API response
- ✅ Frontend can cache transcription in memory/context

### Frontend Integration Points

**Replace InspectionPanel Text Tab:**
- **File**: `front-end/src/features/devel-tools/om-ocr/components/InspectionPanel.tsx`
- **Location**: TabPanel index 0 (lines 648-701)
- **Change**: Replace raw `jobOcrText` display with `transcription.text` from API
- **Fallback**: If `transcription` not available, use existing `ocr_text`

**Workbench Already Updated:**
- `TranscriptionPanel` already uses frontend normalization
- Can switch to backend `transcription.text` when available

---

## Summary

**Current State:**
- Frontend has basic transcription display (TranscriptionPanel)
- Backend returns raw `ocr_text` and `ocr_result` (Vision API JSON)
- No server-side normalization exists
- InspectionPanel Text tab shows unnormalized raw text

**Required Changes:**
1. Create server-side normalization pipeline (Steps 2-3 from spec)
2. Extend GET job detail endpoint to include `transcription` field
3. Update InspectionPanel Text tab to use `transcription.text`
4. Keep Workbench TranscriptionPanel (can use backend transcription when available)

**Files to Create:**
- `server/src/ocr/transcription/` (new directory)
  - `types.ts`
  - `scriptDetect.ts`
  - `clusterLines.ts`
  - `extractTokensFromVision.ts`
  - `normalizeTranscription.ts`

**Files to Modify:**
- `server/src/index.ts` (line 1227) - Add transcription to response
- `front-end/src/features/devel-tools/om-ocr/components/InspectionPanel.tsx` (line 648) - Use transcription.text

