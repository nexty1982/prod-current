# OCR Troubleshooting Guide

## Quick Diagnostics

### 1. Check System Health
```bash
curl http://127.0.0.1:3001/api/system/health | python3 -m json.tool
```
Look for `"ocr"` section: `worker` should be `"running"`, `pending_jobs` should be 0 when idle.

### 2. Check Detailed OCR Health (admin only)
```bash
curl -s http://127.0.0.1:3001/api/system/ocr/health \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```
Returns: `worker_status`, `pending_jobs`, `processing_jobs`, `failed_jobs`, `stale_jobs`, `storage_writable`, `avg_processing_time_seconds`.

---

## Common Issues

### Worker Not Running

**Symptoms**: Jobs stay in `pending` indefinitely, health shows `worker: "stopped"`.

```bash
# Check worker status
sudo systemctl status om-ocr-worker

# Check logs for crash reason
sudo journalctl -u om-ocr-worker -n 50

# Restart worker
sudo systemctl restart om-ocr-worker
```

**Common causes**:
- Missing `GOOGLE_APPLICATION_CREDENTIALS` env var
- Database connection failure (check MariaDB is running)
- Node.js crash from uncaught exception (check journalctl logs)

---

### Jobs Stuck in "processing"

**Symptoms**: Jobs show `status = 'processing'` for >10 minutes, `stale_jobs > 0` in health.

```bash
# Recover stale jobs (resets to pending for re-processing)
curl -s -X POST http://127.0.0.1:3001/api/system/ocr/recover-stale \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"threshold_minutes": 10}'
```

**Common causes**:
- Worker crashed mid-processing (stale job left behind)
- Vision API timeout (default 60s — configurable in `ocr_global_settings`)
- Very large image causing Sharp memory issues

---

### Vision API Errors

**Symptoms**: Jobs fail with Vision API errors in logs, `error_regions` populated.

```bash
# Verify credentials
echo $GOOGLE_APPLICATION_CREDENTIALS
cat $GOOGLE_APPLICATION_CREDENTIALS | python3 -c "import sys,json; print(json.load(sys.stdin).get('project_id','NOT FOUND'))"

# Check worker logs for Vision errors
sudo journalctl -u om-ocr-worker --since "1 hour ago" | grep -i "vision\|google\|api"
```

**Common causes**:
- Service account JSON file missing or wrong path
- API not enabled in Google Cloud project
- Quota exceeded (check Google Cloud Console)
- Network connectivity to Google APIs

---

### Storage Not Writable

**Symptoms**: Health shows `storage_writable: false`, uploads fail.

```bash
# Fix permissions
chown -R next:next /var/www/orthodoxmetrics/prod/storage/feeder
chmod -R 755 /var/www/orthodoxmetrics/prod/storage/feeder

# Also check uploads directory
chown -R next:next /var/www/orthodoxmetrics/prod/uploads
```

---

### Missing OCR Tables in Tenant DB

**Symptoms**: Queries to `ocr_feeder_pages` fail with "Table doesn't exist".

Tenant OCR tables are auto-created by `assertTenantOcrTablesExist()` when a tenant pool is first accessed. To trigger:

```bash
# Hit any tenant endpoint to trigger auto-creation
curl http://127.0.0.1:3001/api/church/<churchId>/ocr/jobs \
  -H "Authorization: Bearer $TOKEN"
```

Or manually verify:
```bash
node -e "
const db = require('./server/dist/config/db');
(async () => {
  const pool = db.getTenantPool(<churchId>);
  const [rows] = await pool.query(\"SHOW TABLES LIKE 'ocr%'\");
  console.log(rows.map(r => Object.values(r)[0]));
  process.exit(0);
})();
"
```

Expected tables: `ocr_feeder_pages`, `ocr_feeder_artifacts`, `ocr_fused_drafts`.

---

### Low OCR Confidence / Poor Extraction Quality

**Symptoms**: Confidence scores below 0.70, many fields flagged for review.

**Image quality checklist**:
- Minimum 300 DPI recommended
- Grayscale or color (not bitonal/B&W)
- Minimal skew (< 5 degrees)
- Good contrast between text and background
- No heavy shadows or folds

**Tuning options** (via `ocr_global_settings`):
- `ocr.scoring.acceptThreshold` — Lower from 0.85 for more auto-accepts
- `ocr.scoring.confidenceWeight` — Adjust OCR vs quality weight balance
- `ocr.visionApi.languageHints` — Set correct language hints for source material

**Per-field issues**:
- Check scoring in `/api/church/:churchId/ocr/jobs/:jobId` response → `field_scores`
- Low `cell_confidence` = Vision API struggled with text recognition
- Low `validity_score` = extracted value didn't pass format validation
- `needs_review: true` fields have `reasons` array explaining why

---

### Preprocessing Failures

**Symptoms**: Jobs fail at `preprocessing` stage.

```bash
# Check worker logs
sudo journalctl -u om-ocr-worker --since "1 hour ago" | grep -i "preprocess\|sharp\|image"
```

**Common causes**:
- Corrupt image file (try re-uploading)
- Unsupported image format (supported: JPEG, PNG, TIFF, WebP, PDF)
- Image too large (>100MB upload limit, >4000px preprocessing target)
- Insufficient memory for Sharp processing

---

### Jobs Not Appearing After Upload

**Symptoms**: Upload succeeds but no job appears in job list.

**Check**:
1. Verify upload endpoint responded with `job_id`
2. Check if job exists: `SELECT * FROM ocr_jobs WHERE id = <jobId>`
3. Verify `church_id` matches the expected church
4. Check `source_pipeline` column — should be `studio` or `uploader`

---

## Service Management

| Action | Command |
|--------|---------|
| Start worker | `sudo systemctl start om-ocr-worker` |
| Stop worker | `sudo systemctl stop om-ocr-worker` |
| Restart worker | `sudo systemctl restart om-ocr-worker` |
| Worker logs | `sudo journalctl -u om-ocr-worker -f` |
| Restart backend | `sudo systemctl restart orthodox-backend` |
| Backend logs | `sudo journalctl -u orthodox-backend -f` |

**Important**: When changing OCR worker code, restart **both** `om-ocr-worker` and `orthodox-backend` (if API routes changed).

## Useful Queries

```sql
-- Count jobs by status
SELECT status, COUNT(*) FROM ocr_jobs GROUP BY status;

-- Find stale processing jobs (>10 min old)
SELECT id, church_id, filename, status,
       TIMESTAMPDIFF(MINUTE, COALESCE(last_activity_at, started_at, created_at), NOW()) AS minutes_stuck
FROM ocr_jobs
WHERE status = 'processing'
  AND COALESCE(last_activity_at, started_at, created_at) < DATE_SUB(NOW(), INTERVAL 10 MINUTE);

-- Recent failures with errors
SELECT id, church_id, filename, current_stage, error_regions, completed_at
FROM ocr_jobs
WHERE status IN ('failed', 'error')
ORDER BY created_at DESC LIMIT 20;

-- Per-church job counts
SELECT church_id, status, COUNT(*) AS cnt
FROM ocr_jobs
GROUP BY church_id, status
ORDER BY church_id, status;
```
