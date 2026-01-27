# OCR Content Feeder Subsystem

## Overview

The OCR Content Feeder is a production-grade, idempotent subsystem for ingesting, processing, and routing OCR content. It provides a queue-based worker architecture with artifact storage and optional correction memory.

## Architecture

### Components

1. **Database Tables**
   - `ocr_feeder_jobs` - Main job container
   - `ocr_feeder_pages` - Individual pages within jobs
   - `ocr_feeder_artifacts` - Processing artifacts (text, tokens, layouts, etc.)
   - `ocr_correction_memory` - Optional learning from user corrections

2. **API Routes** (`/api/feeder/*`)
   - `POST /ingest` - Create job and pages from files
   - `GET /jobs/:jobId` - Get job status and statistics
   - `GET /pages/:pageId` - Get page details and artifacts
   - `POST /pages/:pageId/retry` - Retry failed page
   - `POST /pages/:pageId/correction` - Store user corrections

3. **Worker Process** (`ocrFeederWorker.ts`)
   - Claims pages from queue (SKIP LOCKED for concurrency)
   - Processes through state machine: preprocess → OCR → parse → score → route
   - Creates drafts in existing `ocr_fused_drafts` table
   - Idempotent state transitions (safe to restart)

## State Machine

### Page States

```
queued → preprocessing → ocr → parsing → scoring → [accepted | review | retry | failed]
                                                          ↓
                                                      (if retry_count < 2)
                                                          ↓
                                                      queued (retry)
```

### State Transitions (Idempotent)

- **queued**: Initial state, ready for processing
- **preprocessing**: Normalizing orientation/contrast
- **ocr**: Extracting text from image
- **parsing**: Extracting structured data
- **scoring**: Evaluating quality and confidence
- **accepted**: High confidence (≥0.85), draft created
- **review**: Medium confidence (0.6-0.85), draft created with `needs_review`
- **retry**: Low confidence (<0.6), will retry if count < 2
- **failed**: Maximum retries exceeded or fatal error

### Idempotency

All state transitions are idempotent:
- Worker can be restarted safely
- Multiple workers can run concurrently (SKIP LOCKED)
- State changes are atomic and validated

## Artifact Types

Artifacts are stored on disk with metadata in the database:

1. **raw_text** (`raw_text.txt`)
   - Plain text OCR output
   - Metadata: confidence score, extraction timestamp

2. **tokens** (`tokens.json`) - *Future*
   - Tokenized text with positions
   - JSON format

3. **layout** (`layout.json`) - *Future*
   - Document structure analysis
   - Regions, blocks, lines, words

4. **record_candidates** (`record_candidates.json`)
   - Structured data extraction
   - Array of candidate records with confidence
   - Format: `{ candidates: [{ recordType, confidence, fields }] }`

5. **correction** (`correction_*.json`)
   - User corrections for learning
   - Before/after comparison
   - Template key for memory lookup

## Storage Structure

```
server/storage/feeder/
  job_{jobId}/
    page_{pageIndex}/
      {original_filename}          # Input file
      preprocessed.jpg             # Preprocessed image
      raw_text.txt                 # OCR output
      record_candidates.json       # Parsed data
      correction_{timestamp}.json   # User corrections
```

## Scoring and Routing

### Combined Score Calculation

```
combinedScore = (ocrConfidence * 0.7) + (qualityScore * 0.3)
```

### Routing Logic

- **≥ 0.85**: `accepted` → Draft created with `status='draft'`
- **0.6 - 0.85**: `review` → Draft created with `status='needs_review'`
- **< 0.6**: `retry` (if retry_count < 2) or `failed`

### Draft Creation

Drafts are written to the existing `ocr_fused_drafts` table in the church-specific database:
- Schema-tolerant (handles missing columns gracefully)
- Supports `workflow_status` column if present
- Includes `church_id` if column exists
- Compatible with existing Review/Finalize UI

## API Usage

### Ingest Files

```bash
POST /api/feeder/ingest
Content-Type: multipart/form-data

{
  churchId: 46,
  sourceType: "upload",
  recordType: "baptism",  // optional
  files: [File, File, ...],
  options: { ... }  // optional
}
```

Or with file paths:

```bash
POST /api/feeder/ingest
Content-Type: application/json

{
  churchId: 46,
  sourceType: "import",
  filePaths: ["/path/to/file1.jpg", "/path/to/file2.jpg"],
  recordType: "marriage"
}
```

### Get Job Status

```bash
GET /api/feeder/jobs/:jobId?churchId=46
```

Returns:
```json
{
  "success": true,
  "job": {
    "id": 1,
    "church_id": 46,
    "status": "processing",
    "pageStats": {
      "queued": 2,
      "processing": 1,
      "accepted": 5,
      "review": 2
    },
    "totalPages": 10
  }
}
```

### Get Page Details

```bash
GET /api/feeder/pages/:pageId?churchId=46
```

### Retry Failed Page

```bash
POST /api/feeder/pages/:pageId/retry
Content-Type: application/json

{
  churchId: 46
}
```

### Store Correction

```bash
POST /api/feeder/pages/:pageId/correction
Content-Type: application/json

{
  churchId: 46,
  recordType: "baptism",
  before: { rawText: "...", fields: {...} },
  after: { fields: {...} },
  notes: "Fixed date format",
  templateKey: "baptism_date_field"  // optional
}
```

## Worker Configuration

### PM2 Process

The worker runs as a separate PM2 process:

```javascript
{
  name: "ocr-feeder-worker",
  script: "dist/workers/ocrFeederWorker.js",
  instances: 1,
  max_memory_restart: "512M",
  restart_delay: 5000
}
```

### Starting/Stopping

```bash
# Start worker
pm2 start ecosystem.config.cjs --only ocr-feeder-worker

# Stop worker
pm2 stop ocr-feeder-worker

# View logs
pm2 logs ocr-feeder-worker

# Restart worker
pm2 restart ocr-feeder-worker
```

## Integration with Existing System

### Drafts Table

The feeder integrates with existing `ocr_fused_drafts` table:
- Uses same schema as existing OCR jobs
- Compatible with Review/Finalize UI
- Supports `workflow_status` column if present
- Includes `church_id` for multi-tenant support

### OCR Service

The worker uses a stub OCR implementation. To integrate with existing OCR:
1. Replace `runOCR()` function in `ocrFeederWorker.ts`
2. Call existing OCR service/controller
3. Map response to artifact format

### Extractors

To integrate with existing extractors:
1. Replace `parsePage()` function
2. Use existing extractor services from `server/src/ocr/extractors/`
3. Map output to `record_candidates` format

## Error Handling

- **Fatal errors**: Page marked as `failed` with error message
- **Retry logic**: Automatic retry up to 2 times for low-confidence pages
- **Worker crashes**: PM2 auto-restarts worker
- **Database errors**: Logged, page remains in current state for retry

## Monitoring

### Job Statistics

Query job statistics:
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(ocr_confidence) as avg_confidence,
  AVG(quality_score) as avg_quality
FROM ocr_feeder_pages
WHERE job_id = ?
GROUP BY status;
```

### Worker Health

Check worker process:
```bash
pm2 status ocr-feeder-worker
pm2 logs ocr-feeder-worker --lines 50
```

## Future Enhancements

1. **Preprocessing**: Integrate image processing library (sharp, jimp)
2. **OCR**: Connect to existing OCR service
3. **Parsing**: Use existing extractors from `server/src/ocr/extractors/`
4. **Correction Memory**: Use stored corrections to improve parsing
5. **Batch Processing**: Process multiple pages in parallel
6. **Webhooks**: Notify on job completion
7. **Progress Tracking**: Real-time progress updates via WebSocket

## Migration

Run the migration to create tables:

```bash
mysql -u user -p database < server/database/migrations/add_ocr_feeder_tables.sql
```

Or via Node.js:
```javascript
const fs = require('fs');
const { promisePool } = require('./config/db');
const sql = fs.readFileSync('server/database/migrations/add_ocr_feeder_tables.sql', 'utf8');
await promisePool.query(sql);
```

## Security

- All endpoints require authentication (session-based)
- `churchId` inferred from session or validated against user access
- File uploads validated (type, size)
- Storage paths sanitized
- SQL injection prevented via parameterized queries

## Performance

- **Concurrent Workers**: Multiple workers can run (SKIP LOCKED)
- **Batch Inserts**: Pages inserted in batches
- **Artifact Storage**: Large files on disk, metadata in DB
- **Indexing**: Key indexes on status, job_id, church_id for fast queries

