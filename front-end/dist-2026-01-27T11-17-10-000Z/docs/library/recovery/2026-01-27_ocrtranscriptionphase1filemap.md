# OCR Transcription Phase 1 - File Map

## Current State

### Backend (Server)
- **OCR Job Detail Endpoint**: `server/src/index.ts:1116` - `GET /api/church/:churchId/ocr/jobs/:jobId`
  - Returns: `{ ocr_text, ocr_result (Vision JSON), ... }`
  - Reads from files or DB fallback
  
- **Token Types**: `server/src/ocr/layoutExtractor.ts:10-19`
  - `Token` interface with `bboxNorm: { nx0, ny0, nx1, ny1 }` (0..1 normalized)
  - Has `text`, `confidence`, `langCodes`, `bboxPx`, `pageIndex`, `isRu`, `tokenId`

### Frontend (Client)
- **Text Normalizer**: `front-end/src/features/devel-tools/om-ocr/utils/textNormalizer.ts`
  - Currently does semantic normalization (will rename to `displayNormalizer.ts`)
  - Functions: `normalizeOcrText()`, `extractStructuredTextFromVision()`, `enhanceOcrTextStructure()`
  
- **TranscriptionPanel**: `front-end/src/features/devel-tools/om-ocr/components/TranscriptionPanel.tsx`
  - Uses textNormalizer for display
  - Has copy/download buttons
  
- **InspectionPanel**: `front-end/src/features/devel-tools/om-ocr/components/InspectionPanel.tsx`
  - Has tabs: Transcription, Fusion, Mapping, Review
  - Transcription is NOT default (needs to be made default)

- **OCR Job Hook**: `front-end/src/features/devel-tools/om-ocr/hooks/useOcrJobs.ts`
  - `fetchJobDetail()` calls `/api/church/:churchId/ocr/jobs/:jobId`

## Changes Needed

### New Files
1. `server/src/ocr/transcription/normalizeTranscription.ts` - Server-side canonical normalization
2. `server/src/ocr/transcription/extractTokensFromVision.ts` - Vision response → Token[] adapter
3. `front-end/docs/OCR_TRANSCRIPTION_PHASE1.md` - QA checklist

### Modified Files
1. `server/src/index.ts` - Add POST `/api/church/:churchId/ocr/jobs/:jobId/normalize` endpoint
2. `front-end/src/features/devel-tools/om-ocr/utils/textNormalizer.ts` → `displayNormalizer.ts`
   - Remove semantic normalization, keep only presentation formatting
3. `front-end/src/features/devel-tools/om-ocr/components/TranscriptionPanel.tsx`
   - Use server normalization API
   - Keep displayNormalizer for UI-only formatting
4. `front-end/src/features/devel-tools/om-ocr/components/InspectionPanel.tsx`
   - Make Transcription tab default
5. `front-end/src/features/devel-tools/om-ocr/EnhancedOCRUploader.tsx`
   - Add Document processing settings section
   - Add toasts

