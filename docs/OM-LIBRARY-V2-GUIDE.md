# OM-Library V2 Enhancement Guide

## Overview

OM-Library V2 introduces automated daily task ingestion, scheduled indexing, and intelligent file organization to keep the production environment clean and well-documented.

---

## New Features

### 1. **Daily Task Ingestion**

Automatically indexes markdown files from the prod root directory.

**Scan Source: `prod-root-daily`**
- **Root**: `/var/www/orthodoxmetrics/prod` (depth=1, root level only)
- **Category**: `daily_tasks`
- **Include Patterns**:
  - `*.md`
  - `task_*.md`
  - `*_SUMMARY.md`
  - `*_FIX*.md`
  - `*_STATUS.md`
  - `CHANGE_LOG*.md`
- **Exclude Patterns**:
  - `node_modules/**`
  - `.git/**`
  - `server/node_modules/**`
  - `front-end/node_modules/**`
  - `server/dist/**`
  - `front-end/dist/**`
  - `uploads/**`
  - `backups/**`
  - `temp-backups/**`
  - `*.zip`
  - `*.pdf`
  - `docs/**` (prevents recursion)

### 2. **Scheduled Daily Indexing**

Runs automatically every day at **02:30 local time** using node-cron.

**Features**:
- Clears processed files log
- Re-scans all configured sources
- Updates library index
- Logs execution time and results

**Manual Trigger**:
```bash
curl -X POST http://localhost:3001/api/library/reindex \
  -H "Cookie: orthodoxmetrics.sid=..."
```

### 3. **Automated File Cleanup**

Safely organizes loose files in prod root into structured archive areas.

**Safe File Types** (allowlist):
- `.md`, `.txt`, `.log`, `.sh`, `.sql`, `.json`, `.zip`
- `.pdf`, `.csv`, `.yaml`, `.yml`, `.env.example`

**Protected Files** (never moved):
- `package.json`, `package-lock.json`
- `tsconfig.json`, `vite.config.*`
- `.gitignore`, `.env*`
- `README.md`, `CHANGELOG.md`, `LICENSE`

**Destination Structure**:
```
/var/www/orthodoxmetrics/prod/docs/
├── daily/YYYY-MM-DD/          # Daily task markdowns
├── _inbox/YYYY-MM-DD/         # General documents
├── _artifacts/YYYY-MM-DD/     # Large files (zips, logs, backups)
└── _inbox/_moves-YYYY-MM-DD.json  # Manifest log
```

**Categorization Rules**:
- **daily**: Files matching `task_*`, `*_summary`, `*_status`, or `YYYY-MM-DD*.md`
- **artifacts**: `.zip`, `.sql`, `.log`, files with `backup` or `dump` in name
- **inbox**: Everything else

**Safety Features**:
- Dry-run mode (plan without executing)
- Collision avoidance (appends `-N` suffix)
- SHA256 checksums for all moves
- Manifest logging (from, to, size, mtime, sha256)
- Never deletes files, only moves
- Never touches `src/` directories

---

## API Endpoints

### Library Management

#### `GET /api/library/status`
Get librarian service status and statistics.

**Response**:
```json
{
  "running": true,
  "status": "online",
  "totalFiles": 150,
  "lastIndexUpdate": "2026-02-06T07:30:00.000Z",
  "categories": {
    "daily_tasks": 25,
    "technical": 50,
    "ops": 40,
    "recovery": 35
  }
}
```

#### `GET /api/library/files`
List all indexed library files.

**Query Parameters**:
- `category` - Filter by category (daily_tasks, technical, ops, recovery)
- `source` - Filter by source (prod-root-daily, docs-archive)

#### `GET /api/library/search?q=<query>&mode=<filename|content>`
Search library files.

#### `POST /api/library/reindex`
Trigger full reindex (super_admin/admin only).

**Response**:
```json
{
  "success": true,
  "message": "Reindex triggered. Librarian will process files on next scan.",
  "timestamp": "2026-02-06T07:30:00.000Z"
}
```

### Cleanup Management

#### `GET /api/library/cleanup/stats`
Get cleanup statistics (super_admin only).

**Response**:
```json
{
  "success": true,
  "stats": {
    "rootFiles": 15,
    "safeFiles": 12,
    "protectedFiles": 3,
    "unsafeFiles": 0
  }
}
```

#### `POST /api/library/cleanup/dry-run`
Plan cleanup without executing (super_admin only).

**Response**:
```json
{
  "success": true,
  "plan": {
    "timestamp": "2026-02-06T07:30:00.000Z",
    "rootPath": "/var/www/orthodoxmetrics/prod",
    "plannedMoves": [
      {
        "from": "/var/www/orthodoxmetrics/prod/task_2026-02-05.md",
        "to": "/var/www/orthodoxmetrics/prod/docs/daily/2026-02-06/task_2026-02-05.md",
        "size": 1024,
        "sha256": "abc123...",
        "category": "daily",
        "reason": "categorized as daily"
      }
    ],
    "skipped": [],
    "errors": []
  },
  "summary": {
    "totalFiles": 15,
    "toMove": 12,
    "skipped": 3,
    "errors": 0
  }
}
```

#### `POST /api/library/cleanup/apply`
Execute cleanup (move files) (super_admin only).

**Response**:
```json
{
  "success": true,
  "result": {
    "timestamp": "2026-02-06T07:30:00.000Z",
    "moved": [...],
    "failed": [],
    "manifest": "/var/www/orthodoxmetrics/prod/docs/_inbox/_moves-2026-02-06.json"
  },
  "summary": {
    "moved": 12,
    "failed": 0,
    "manifest": "/var/www/orthodoxmetrics/prod/docs/_inbox/_moves-2026-02-06.json"
  }
}
```

---

## Deployment

### Prerequisites
- Node.js 20+
- PM2 process manager
- Dependencies: `node-cron`, `minimatch` (already installed)

### Deploy V2

```bash
# Run deployment script
sudo /var/www/orthodoxmetrics/prod/server/scripts/deploy-librarian-v2.sh
```

This will:
1. Check dependencies
2. Create destination directories
3. Backup current librarian (V1)
4. Stop current librarian
5. Start OM-Librarian V2 with PM2
6. Verify deployment

### Manual Deployment

```bash
# Stop current librarian
pm2 stop om-librarian
pm2 delete om-librarian

# Start V2
pm2 start /var/www/orthodoxmetrics/prod/server/src/agents/omLibrarianV2.js \
  --name om-librarian \
  --cwd /var/www/orthodoxmetrics/prod \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z" \
  --time

# Save PM2 configuration
pm2 save

# Check status
pm2 logs om-librarian
```

### Rollback to V1

```bash
pm2 stop om-librarian
pm2 delete om-librarian

pm2 start /var/www/orthodoxmetrics/prod/server/src/agents/omLibrarian.js \
  --name om-librarian \
  --cwd /var/www/orthodoxmetrics/prod

pm2 save
```

---

## Testing

### 1. Test Daily Task Ingestion

```bash
# Create test file in prod root
echo "# Test Daily Task $(date +%Y-%m-%d)

This is a test daily task file.

## Tasks
- Task 1
- Task 2
" > /var/www/orthodoxmetrics/prod/test_daily_task_$(date +%Y%m%d).md

# Wait 5 seconds for librarian to detect
sleep 5

# Check if indexed
curl http://localhost:3001/api/library/files | jq '.files[] | select(.source=="prod-root-daily")'

# Should show the test file with category "daily_tasks"
```

### 2. Test Cleanup Dry-Run

```bash
# Check what would be moved
curl -X POST http://localhost:3001/api/library/cleanup/dry-run \
  -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_COOKIE" | jq

# Review the planned moves
```

### 3. Test Cleanup Apply

```bash
# Execute cleanup
curl -X POST http://localhost:3001/api/library/cleanup/apply \
  -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_COOKIE" | jq

# Check manifest
cat /var/www/orthodoxmetrics/prod/docs/_inbox/_moves-$(date +%Y-%m-%d).json | jq

# Verify files moved
ls -la /var/www/orthodoxmetrics/prod/docs/daily/$(date +%Y-%m-%d)/
```

### 4. Test Scheduled Indexing

```bash
# Check logs for scheduled run (after 02:30)
pm2 logs om-librarian | grep "Scheduled indexing triggered"

# Or trigger manual reindex
curl -X POST http://localhost:3001/api/library/reindex \
  -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_COOKIE"
```

---

## Monitoring

### PM2 Logs
```bash
# View live logs
pm2 logs om-librarian

# View last 100 lines
pm2 logs om-librarian --lines 100

# View errors only
pm2 logs om-librarian --err
```

### Status Check
```bash
# PM2 status
pm2 describe om-librarian

# API status
curl http://localhost:3001/api/library/status | jq
```

### Statistics
```bash
# Library stats
curl http://localhost:3001/api/library/status | jq '.categories'

# Cleanup stats
curl http://localhost:3001/api/library/cleanup/stats \
  -H "Cookie: orthodoxmetrics.sid=..." | jq
```

---

## Troubleshooting

### Librarian Not Starting

```bash
# Check PM2 logs
pm2 logs om-librarian --err

# Common issues:
# - Missing dependencies: npm install node-cron minimatch
# - Permission issues: Check file permissions on /var/www/orthodoxmetrics/prod
# - Port conflicts: Check if another process is using resources
```

### Files Not Being Indexed

```bash
# Check if file matches include patterns
# Check if file is in excluded directories
# Check processed files log
cat /var/www/orthodoxmetrics/prod/.analysis/library-processed.json | jq

# Force reindex
curl -X POST http://localhost:3001/api/library/reindex \
  -H "Cookie: orthodoxmetrics.sid=..."
```

### Cleanup Not Working

```bash
# Check if files are protected
# Check if file extensions are in safe list
# Run dry-run to see what would happen
curl -X POST http://localhost:3001/api/library/cleanup/dry-run \
  -H "Cookie: orthodoxmetrics.sid=..." | jq '.plan.skipped'
```

---

## Configuration

### Modify Scan Sources

Edit `/var/www/orthodoxmetrics/prod/server/src/agents/omLibrarianV2.js`:

```javascript
sources: [
  {
    name: 'my-custom-source',
    root: path.join(__dirname, '../../../my-docs'),
    category: 'custom',
    includePatterns: ['*.md'],
    excludePatterns: ['node_modules/**'],
    depth: 5,
  },
]
```

### Modify Schedule

Edit cron expression in `omLibrarianV2.js`:

```javascript
scheduledIndexing: {
  enabled: true,
  cron: '0 */6 * * *', // Every 6 hours instead of daily
}
```

### Modify Safe File Types

Edit `/var/www/orthodoxmetrics/prod/server/src/services/libraryOrganizer.js`:

```javascript
safeExtensions: [
  '.md', '.txt', '.log', // ... add more
]
```

---

## Architecture

### Components

1. **OMLibrarianV2** (`/server/src/agents/omLibrarianV2.js`)
   - File watcher using chokidar
   - Multiple scan sources with include/exclude patterns
   - Scheduled indexing with node-cron
   - Category-based file organization

2. **LibraryOrganizer** (`/server/src/services/libraryOrganizer.js`)
   - Safe file cleanup with dry-run mode
   - Collision avoidance
   - Manifest logging
   - SHA256 checksumming

3. **Library API** (`/server/src/routes/library.js`)
   - Status, search, and file listing endpoints
   - Reindex trigger
   - Cleanup endpoints (dry-run, apply, stats)

### Data Flow

```
Prod Root Files
    ↓
OMLibrarianV2 (watcher)
    ↓
Include/Exclude Filter
    ↓
Process & Normalize
    ↓
Copy to Library Destination
    ↓
Update JSON Index
    ↓
API Endpoints
    ↓
Frontend UI
```

### Index Structure

```json
{
  "2026-02-06_test-daily-task": {
    "id": "2026-02-06_test-daily-task",
    "originalPath": "/var/www/orthodoxmetrics/prod/test_daily_task.md",
    "libraryPath": "/var/www/orthodoxmetrics/prod/front-end/public/docs/library/daily_tasks/2026-02-06_test-daily-task.md",
    "filename": "2026-02-06_test-daily-task.md",
    "title": "Test Daily Task",
    "category": "daily_tasks",
    "source": "prod-root-daily",
    "size": 1024,
    "created": "2026-02-06T07:30:00.000Z",
    "modified": "2026-02-06T07:30:00.000Z",
    "keywords": ["task", "daily"],
    "firstParagraph": "This is a test daily task file..."
  }
}
```

---

## Security

### Access Control
- Reindex: `super_admin`, `admin`
- Cleanup: `super_admin` only
- Status/Search: All authenticated users

### File Safety
- Hardcoded allowlisted roots
- Protected file list (never moved)
- Safe extension allowlist
- Never touches `src/` directories
- Never deletes files (only moves)

### Validation
- Path traversal prevention
- Extension validation
- Size limits (implicit via filesystem)
- SHA256 integrity checking

---

## Future Enhancements

1. **Database Integration**
   - Store index in `orthodoxmetrics_db.library_index` table
   - Track file history and versions
   - Enable advanced querying

2. **Web UI**
   - Browse library by category/source
   - Search interface
   - Cleanup dashboard with dry-run preview
   - Manual file organization

3. **Advanced Features**
   - Full-text search with Elasticsearch
   - PDF ingestion
   - Automatic tagging with AI
   - Related file suggestions
   - Version control integration

4. **Notifications**
   - Email alerts for failed indexing
   - Slack notifications for cleanup results
   - Daily summary reports

---

## Support

For issues or questions:
1. Check logs: `pm2 logs om-librarian`
2. Check API status: `curl http://localhost:3001/api/library/status`
3. Review manifest: `cat /var/www/orthodoxmetrics/prod/docs/_inbox/_moves-*.json`

**Version**: 2.0  
**Last Updated**: 2026-02-06  
**Author**: Orthodox Metrics Development Team
