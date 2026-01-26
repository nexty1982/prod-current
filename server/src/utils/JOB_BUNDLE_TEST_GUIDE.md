# Job Bundle Implementation - Test Guide

## Overview

The Job Bundle system provides file-backed storage for OCR job state, making it the source of truth. Database writes are best-effort and non-blocking.

## Directory Structure

Each job has its own bundle directory:
```
uploads/om_church_<churchId>/jobs/<jobId>/
├── manifest.json      # Authoritative job summary
├── drafts.json        # Fusion drafts + workflow statuses
├── header_ocr.json    # Page header OCR metadata (stub)
└── layout.json        # Table/row/column bboxes (stub)
```

## Manual Test Steps

### 1. Create a Test Job Bundle

```bash
# Create a dummy jobId directory
mkdir -p uploads/om_church_46/jobs/999

# The manifest and drafts will be auto-created on first read
```

### 2. Test GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts

```bash
# Should return empty drafts array initially
curl "http://localhost:3001/api/church/46/ocr/jobs/999/fusion/drafts"

# Expected response:
# {
#   "drafts": []
# }
```

### 3. Test POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts

```bash
curl -X POST "http://localhost:3001/api/church/46/ocr/jobs/999/fusion/drafts" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {
        "entry_index": 0,
        "record_type": "baptism",
        "record_number": "123",
        "payload_json": {
          "child_name": "John Doe",
          "date_of_baptism": "2024-01-15"
        },
        "bbox_json": {
          "entryBbox": { "x": 100, "y": 200, "w": 300, "h": 400 }
        }
      }
    ]
  }'

# Expected response:
# {
#   "success": true,
#   "drafts": [...]
# }
```

### 4. Verify Files Created

```bash
# Check manifest.json
cat uploads/om_church_46/jobs/999/manifest.json

# Should show:
# {
#   "jobId": "999",
#   "churchId": 46,
#   "recordType": "baptism",
#   "status": "pending",
#   "draftCounts": { "draft": 1, "in_review": 0, "finalized": 0, "committed": 0 },
#   ...
# }

# Check drafts.json
cat uploads/om_church_46/jobs/999/drafts.json

# Should show the entry with workflow_status: "draft"
```

### 5. Test GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts (Again)

```bash
# Should now return the draft we created
curl "http://localhost:3001/api/church/46/ocr/jobs/999/fusion/drafts"

# Expected: drafts array with 1 entry
```

### 6. Test POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize

```bash
curl -X POST "http://localhost:3001/api/church/46/ocr/jobs/999/review/finalize" \
  -H "Content-Type: application/json" \
  -d '{
    "entry_indexes": [0]
  }'

# Expected response:
# {
#   "success": true,
#   "finalized": [{ "entry_index": 0, "record_type": "baptism" }],
#   "count": 1
# }
```

### 7. Verify Finalize Updated Files

```bash
# Check drafts.json - entry should have workflow_status: "finalized"
cat uploads/om_church_46/jobs/999/drafts.json | grep workflow_status

# Check manifest.json - draftCounts should be updated
cat uploads/om_church_46/jobs/999/manifest.json | grep draftCounts
# Should show: "finalized": 1, "draft": 0
```

### 8. Test POST /api/church/:churchId/ocr/jobs/:jobId/review/commit

```bash
curl -X POST "http://localhost:3001/api/church/46/ocr/jobs/999/review/commit" \
  -H "Content-Type: application/json" \
  -d '{
    "entry_indexes": [0]
  }'

# Expected response (if DB available):
# {
#   "success": true,
#   "committed": [{ "entry_index": 0, "record_type": "baptism", "record_id": 123 }],
#   "errors": [],
#   "message": "Committed 1, 0 errors"
# }

# OR (if DB unavailable):
# {
#   "success": false,
#   "committed": [],
#   "errors": [{ "entry_index": 0, "error": "Database connection unavailable" }],
#   "message": "Committed 0, 1 errors"
# }
```

### 9. Verify Commit Updated Files (Even if DB Failed)

```bash
# Check drafts.json - entry should have workflow_status: "committed" (if DB succeeded)
# OR workflow_status: "finalized" with commit_error (if DB failed)
cat uploads/om_church_46/jobs/999/drafts.json

# The file should be updated regardless of DB success/failure
```

### 10. Test GET /api/ocr/jobs/:jobId?churchId=46

```bash
curl "http://localhost:3001/api/ocr/jobs/999?churchId=46"

# Should return job detail assembled from:
# - manifest.json (status, recordType, page_year, draftCounts)
# - DB (if available): filename, file_path, ocr_text, ocr_result_json, etc.
# - Merged response with bundle data taking precedence for state fields
```

## Key Behaviors to Verify

1. **File-backed is source of truth**: Even if DB is unavailable, file operations should succeed
2. **DB writes are best-effort**: Check server logs for "non-blocking" warnings when DB fails
3. **Atomic writes**: Files are written to temp then renamed (no partial writes)
4. **Manifest draftCounts**: Automatically updated when drafts.json changes
5. **Backward compatibility**: Existing routes still work, just read from bundle first

## Server Logs to Check

Look for these log messages:
- `[JobBundle] Read manifest for job...`
- `[JobBundle] Wrote drafts for job...`
- `[JobBundle] Updated manifest status...`
- `[Fusion Drafts GET] Reading drafts from Job Bundle...`
- `[Finalize] Reading drafts from Job Bundle...`
- `[Review Commit] Reading drafts from Job Bundle...`
- `[JobBundle] DB write skipped (non-blocking): ...` (when DB unavailable)

## Troubleshooting

1. **Bundle files not created**: Check directory permissions on `uploads/om_church_##/jobs/`
2. **TypeScript module not found**: Ensure `server/src/utils/jobBundle.ts` is compiled to `server/dist/utils/jobBundle.js`
3. **DB errors blocking**: Verify all DB operations are wrapped in try-catch with "non-blocking" logging

