# OCR Transcription Phase 1 - QA Checklist

## Feature Flag

The server-side normalization feature is gated behind a feature flag:
- **Flag**: `OCR_NORMALIZE_SERVER=1`
- **Location**: localStorage key `OCR_NORMALIZE_SERVER` or env var `VITE_OCR_NORMALIZE_SERVER=1`
- **Default**: Off (falls back to client-side normalization)

### Enable Feature Flag

**Option 1: Browser Console**
```javascript
localStorage.setItem('OCR_NORMALIZE_SERVER', '1');
location.reload();
```

**Option 2: Environment Variable**
Set `VITE_OCR_NORMALIZE_SERVER=1` in `.env` file before build.

**Disable:**
```javascript
localStorage.removeItem('OCR_NORMALIZE_SERVER');
location.reload();
```

## Testing Instructions

### Prerequisites

1. **Build frontend:**
   ```bash
   cd front-end
   npm run build
   npm run preview
   ```

2. **Start backend:**
   ```bash
   cd server
   npm run dev  # or your start command
   ```

3. **Enable feature flag** (see above)

### Smoke Test Checklist

#### 1. Access OCR Uploader Page
- [ ] Navigate to `/devel/enhanced-ocr-uploader`
- [ ] Page loads without console errors
- [ ] Workbench displays (jobs list or workbench view)

#### 2. Load Existing OCR Job
- [ ] Select a church from dropdown
- [ ] Find and click on an existing OCR job (e.g., job 1148)
- [ ] Job details load (image, transcription panel visible)
- [ ] Transcription panel shows text (either raw or client-normalized)

#### 3. Test Normalize Button (Feature Flag ON)
- [ ] "Normalize" button is visible in TranscriptionPanel header
- [ ] Click "Normalize" button
- [ ] Button shows "Normalizing..." with spinner
- [ ] No console errors appear
- [ ] Server returns 200 response (check Network tab)
- [ ] Normalized text appears in transcription panel
- [ ] Text is more readable than raw OCR output

#### 4. Test Fallback Behavior (Feature Flag OFF or API Error)
- [ ] Disable feature flag: `localStorage.removeItem('OCR_NORMALIZE_SERVER')`
- [ ] Reload page
- [ ] "Normalize" button is NOT visible
- [ ] Client-side normalization still works (text is formatted)
- [ ] No errors in console

#### 5. Test API Error Handling
- [ ] Enable feature flag
- [ ] Stop backend server
- [ ] Click "Normalize" button
- [ ] Warning toast appears: "Normalization failed, using client-side formatting"
- [ ] Client-side normalization still works
- [ ] No page crash

#### 6. Test Save Draft (if flag enabled)
- [ ] Enable feature flag
- [ ] Load an OCR job
- [ ] Click "Normalize"
- [ ] Wait for normalization to complete
- [ ] Navigate to "Save Draft" functionality (if available in workbench)
- [ ] Verify that normalized text is used instead of raw text
- [ ] Check database: `ocr_fused_drafts` table `payload_json` field contains normalized text

### Endpoint Testing

**Manual API Test:**
```bash
curl -X POST http://localhost:3001/api/church/1/ocr/jobs/1148/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "transcriptionMode": "exact",
      "textExtractionScope": "all",
      "formattingMode": "improve-formatting",
      "confidenceThreshold": 0.35
    }
  }'
```

**Expected Response:**
```json
{
  "transcription": {
    "text": "Normalized text with paragraphs...",
    "paragraphs": ["Paragraph 1", "Paragraph 2"],
    "diagnostics": {
      "droppedTokenCount": 5,
      "lineCount": 10,
      "paragraphCount": 3,
      "scriptsPresent": ["latin", "cyrillic"],
      "warnings": []
    }
  }
}
```

## Known Limitations

1. **Handwritten-only filtering**: Not yet supported - server will ignore this setting and show all text
2. **Spell correction**: "fix-spelling" mode is not implemented yet - only "exact" mode works
3. **Settings persistence**: Document processing settings are stored in localStorage only (UI-only)

## Troubleshooting

### Normalize button not appearing
- Check feature flag is enabled: `localStorage.getItem('OCR_NORMALIZE_SERVER')`
- Check console for errors

### Normalization always fails
- Check backend is running
- Check network tab for API errors
- Verify job ID exists and has OCR result

### Text doesn't change after normalization
- Check server response in Network tab
- Verify normalized text is being set in state
- Check console for errors

### Build errors
- Ensure TypeScript compiles: `cd server && npm run build:ts`
- Check all imports are updated (textNormalizer → displayNormalizer)

## Implementation Summary

### All Steps Completed ✓

1. **Step 1**: Repo discovery - File map created
2. **Step 2**: Server-side normalization module (`normalizeTranscription.ts`)
3. **Step 3**: Token extraction adapter (`extractTokensFromVision.ts`)
4. **Step 4**: API endpoint (`POST /api/church/:churchId/ocr/jobs/:jobId/normalize`)
5. **Step 5**: Frontend wiring with feature flag (`OCR_NORMALIZE_SERVER`)
6. **Step 6**: Document processing settings UI (with badges and persistence)
7. **Step 7**: Professional toasts (all required toasts implemented)
8. **Step 8**: QA checklist document

### Feature Flag

Enable server normalization:
```javascript
localStorage.setItem('OCR_NORMALIZE_SERVER', '1');
```

### Toast Messages

- **OCR Start**: "Extracting text..." (info)
- **OCR Success**: "OCR completed" (success)
- **OCR Fail**: "OCR processing failed: {reason}" (error)
- **Copy**: "Copied to clipboard" (success)
- **Settings Save**: "Settings saved" (success)
- **Handwritten Warning**: "Handwritten-only not supported for this engine yet." (warning)

All toasts auto-dismiss after 3.5 seconds and appear bottom-right.

## Before/After Expectations

**Before (Raw OCR):**
```
CHILD:Stepan
DATE:27Jan1939
PARENTS:JohnandMary
```

**After (Normalized):**
```
CHILD: Stepan
DATE: 27 Jan 1939
PARENTS: John and Mary
```

Or with better paragraph reconstruction:
```
CHILD: Stepan
DATE: 27 Jan 1939

PARENTS: John and Mary
```

## Database Verification

Check normalized text is saved:
```sql
SELECT 
  id,
  ocr_job_id,
  entry_index,
  JSON_EXTRACT(payload_json, '$.child_name') as child_name,
  JSON_EXTRACT(payload_json, '$.ocr_text_normalized') as normalized_text
FROM ocr_fused_drafts
WHERE ocr_job_id = 1148
ORDER BY entry_index;
```

## Files Changed

### Server
- `server/src/ocr/transcription/normalizeTranscription.ts` (NEW)
- `server/src/ocr/transcription/extractTokensFromVision.ts` (NEW)
- `server/src/index.ts` (NEW endpoint)

### Frontend
- `front-end/src/features/devel-tools/om-ocr/utils/displayNormalizer.ts` (renamed from textNormalizer.ts)
- `front-end/src/features/devel-tools/om-ocr/utils/useServerNormalization.ts` (NEW)
- `front-end/src/features/devel-tools/om-ocr/components/TranscriptionPanel.tsx` (updated)
- `front-end/src/features/devel-tools/om-ocr/components/workbench/OcrWorkbench.tsx` (updated)

