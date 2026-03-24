# OCR Deployment Runbook

## Prerequisites

- MariaDB 10.6+ with `orthodoxmetrics_db` and tenant databases
- Node.js 18+ on the application server
- Google Cloud Vision API service account (for production OCR)
- systemd access for service management

## Environment Variables

Add to `/var/www/orthodoxmetrics/prod/server/.env`:

```env
# Google Vision API (required for production OCR)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# OCR Worker Configuration (optional — defaults in ocr_global_settings)
OCR_WORKER_POLL_BATCH=5
OCR_WORKER_POLL_IDLE_MS=5000
OCR_WORKER_POLL_BUSY_MS=1000
```

## Storage Setup

```bash
# Create feeder storage directory
mkdir -p /var/www/orthodoxmetrics/prod/storage/feeder
chown next:next /var/www/orthodoxmetrics/prod/storage/feeder

# Create upload directories (per-church created dynamically)
mkdir -p /var/www/orthodoxmetrics/prod/uploads
chown next:next /var/www/orthodoxmetrics/prod/uploads
```

## Database Schema

OCR tables in the platform database are created during initial setup. Tenant OCR tables are auto-created when `getTenantPool(churchId)` is first called (via `assertTenantOcrTablesExist()`).

To manually verify:
```bash
node -e "
const db = require('./server/dist/config/db');
(async () => {
  const pool = db.getAppPool();
  const [rows] = await pool.query(\"SHOW TABLES LIKE 'ocr%'\");
  console.log(rows.map(r => Object.values(r)[0]));
  process.exit(0);
})();
"
```

Expected tables: `ocr_jobs`, `ocr_job_history`, `ocr_global_settings`, `ocr_extractors`, `ocr_extractor_fields`, `ocr_correction_log`.

## Service Management

### Start OCR Worker
```bash
sudo systemctl start om-ocr-worker
sudo systemctl enable om-ocr-worker   # auto-start on boot
```

### Restart
```bash
sudo systemctl restart om-ocr-worker
```

### Check Status
```bash
sudo systemctl status om-ocr-worker
sudo journalctl -u om-ocr-worker -f     # live logs
```

### Worker Configuration

Runtime settings stored in `ocr_global_settings` table:
- `ocr.worker.pollBatchSize` — Jobs per poll cycle (default: 5)
- `ocr.worker.pollIdleMs` — Idle poll interval ms (default: 5000)
- `ocr.worker.pollBusyMs` — Busy poll interval ms (default: 1000)
- `ocr.worker.heartbeatEvery` — Log heartbeat every N idle cycles (default: 6)
- `ocr.visionApi.timeoutMs` — Vision API timeout (default: 60000)
- `ocr.visionApi.languageHints` — JSON array of language hints (default: `["el","ru","en"]`)
- `ocr.scoring.confidenceWeight` — Weight for OCR confidence (default: 0.7)
- `ocr.scoring.qualityWeight` — Weight for image quality (default: 0.3)
- `ocr.scoring.acceptThreshold` — Auto-accept threshold (default: 0.85)

## Health Verification

### Quick Check
```bash
curl http://127.0.0.1:3001/api/system/health | python3 -m json.tool
# Should show "ocr": {"worker": "running", "pending_jobs": 0}
```

### Detailed OCR Health
```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin_email>","password":"<password>"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s http://127.0.0.1:3001/api/system/ocr/health \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected response:
```json
{
  "status": "healthy",
  "worker_status": "running",
  "pending_jobs": 0,
  "processing_jobs": 0,
  "failed_jobs": 0,
  "stale_jobs": 0,
  "storage_writable": true
}
```

### Recover Stale Jobs
```bash
curl -s -X POST http://127.0.0.1:3001/api/system/ocr/recover-stale \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"threshold_minutes": 10}'
```

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| Worker not running | `systemctl status om-ocr-worker` | `sudo systemctl restart om-ocr-worker` |
| Jobs stuck in processing | `/api/system/ocr/health` → stale_jobs | POST `/api/system/ocr/recover-stale` |
| Vision API errors | Check `GOOGLE_APPLICATION_CREDENTIALS` | Verify service account JSON path |
| Storage not writable | Health shows `storage_writable: false` | `chown next:next storage/feeder` |
| No OCR tables in tenant DB | Query fails on `ocr_feeder_pages` | Call any tenant endpoint to trigger auto-create |

## Related Services

| Service | Unit | Port | Restart Command |
|---------|------|------|-----------------|
| Backend API | `orthodox-backend` | 3001 | `sudo systemctl restart orthodox-backend` |
| OCR Worker | `om-ocr-worker` | — | `sudo systemctl restart om-ocr-worker` |
| OMAI | `omai` | 7060 | `sudo systemctl restart omai` |

When changing OCR worker code, restart **both** `om-ocr-worker` and `orthodox-backend` (if API routes changed).
