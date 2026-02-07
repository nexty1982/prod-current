# OM-Librarian API Fix

## Problem

The `/church/om-spec` page showed "Librarian offline" even though PM2 showed the `om-librarian` service was running.

---

## Root Cause

The `om-librarian` service is a background file watcher that indexes markdown documentation files, but it doesn't expose an HTTP API. The frontend was trying to call `/api/library/status` to check librarian status, but there was no API endpoint in the backend to serve this data.

**What om-librarian does:**
- Monitors documentation directories for markdown files
- Normalizes filenames (e.g., `YYYY-MM-DD_title-slug.md`)
- Categorizes files (Technical, Ops, Recovery)
- Creates relationships between files
- Writes index to: `.analysis/library-index.json`
- Copies files to: `front-end/public/docs/library/`

**What was missing:**
- Backend API endpoints to serve the library index data to the frontend

---

## Solution

Created a new API router (`server/src/routes/library.js`) that provides endpoints to access the library index data:

### API Endpoints Created:

1. **GET `/api/library/status`**
   - Returns librarian service status
   - Shows total files, last update time, category counts
   - Used by frontend to show "Librarian online" status

2. **GET `/api/library/files`**
   - Returns all indexed library files
   - Reads from `.analysis/library-index.json`

3. **GET `/api/library/search`**
   - Search library by filename or content
   - Query parameters: `q`, `mode` (filename/content), `category`

4. **GET `/api/library/file/:fileId`**
   - Get specific file details
   - Returns file metadata and content

5. **POST `/api/library/reindex`**
   - Trigger librarian to reindex files (admin only)
   - Clears processed files log to force re-processing

---

## Files Created/Modified

### Created:
1. **`server/src/routes/library.js`** - Library API router with 5 endpoints
2. **`docs/OPERATIONS/om-librarian-api-fix.md`** - This documentation

### Modified:
1. **`server/src/index.ts`**
   - Added library router import: `const libraryRouter = require('./routes/library');`
   - Mounted router: `app.use('/api/library', libraryRouter);`

---

## Deployment Steps

### Step 1: Restart Backend Server

The backend needs to be restarted to load the new API router:

```bash
# On the Linux server
pm2 restart orthodox-backend

# Or restart all
pm2 restart all

# Check status
pm2 status
```

### Step 2: Verify API is Working

Test the library status endpoint:

```bash
# Check librarian status
curl http://localhost:3001/api/library/status

# Expected response:
{
  "running": true,
  "status": "online",
  "totalFiles": 123,
  "lastIndexUpdate": "2026-02-05T12:34:56.789Z",
  "categories": {
    "technical": 45,
    "ops": 56,
    "recovery": 22
  }
}
```

### Step 3: Test Frontend

1. Log in to https://orthodoxmetrics.com (as admin)
2. Go to: `/church/om-spec`
3. **Expected**: Should show "Librarian online" with green status
4. **Before fix**: Showed "Librarian offline" in red

---

## How It Works

### Data Flow:

1. **om-librarian service** (PM2 process):
   - Monitors docs directories for changes
   - Processes markdown files
   - Writes index to: `.analysis/library-index.json`
   - Copies files to: `front-end/public/docs/library/`

2. **Backend API** (`/api/library/*`):
   - Reads `.analysis/library-index.json`
   - Serves data via REST endpoints
   - No direct communication with om-librarian process

3. **Frontend** (`OMLibrary.tsx`):
   - Calls `/api/library/status` to check if librarian is running
   - Calls `/api/library/files` to get list of documentation
   - Displays files in grid/table view
   - Provides search functionality

### Index File Structure:

```json
{
  "version": "1.0.0",
  "lastUpdate": "2026-02-05T12:34:56.789Z",
  "files": [
    {
      "id": "abc123",
      "filename": "2026-02-05_deployment-guide.md",
      "title": "Deployment Guide",
      "category": "ops",
      "size": 12345,
      "created": "2026-02-05T10:00:00.000Z",
      "modified": "2026-02-05T12:00:00.000Z",
      "sourceFolder": "OPERATIONS",
      "libraryPath": "/var/www/orthodoxmetrics/prod/front-end/public/docs/library/ops/2026-02-05_deployment-guide.md",
      "relatedFiles": ["def456", "ghi789"],
      "keywords": ["deployment", "production", "guide"],
      "firstParagraph": "This guide explains how to deploy..."
    }
  ]
}
```

---

## Troubleshooting

### Issue: Still Shows "Librarian offline"

**Cause**: Backend not restarted or API not mounted correctly

**Fix**:
```bash
# Restart backend
pm2 restart orthodox-backend

# Check logs
pm2 logs orthodox-backend --lines 50

# Look for:
# ✅ [Server] Mounted /api/library routes (OM-Library documentation)
```

### Issue: "Library index not found"

**Cause**: om-librarian hasn't created the index file yet

**Fix**:
```bash
# Check if librarian is running
pm2 status

# Check librarian logs
pm2 logs om-librarian --lines 50

# Check if index file exists
ls -lh /var/www/orthodoxmetrics/prod/.analysis/library-index.json

# If missing, restart librarian to trigger indexing
pm2 restart om-librarian
```

### Issue: Empty library (no files)

**Cause**: No markdown files processed yet

**Fix**:
```bash
# Check librarian logs for errors
pm2 logs om-librarian --lines 100

# Verify watch directories exist
ls -lh /var/www/orthodoxmetrics/prod/docs/

# Force reindex by clearing processed log
rm /var/www/orthodoxmetrics/prod/.analysis/library-processed.json
pm2 restart om-librarian
```

### Issue: API returns 500 error

**Cause**: Permissions issue or corrupted index file

**Fix**:
```bash
# Check file permissions
ls -lh /var/www/orthodoxmetrics/prod/.analysis/

# Fix permissions if needed
sudo chown -R next:next /var/www/orthodoxmetrics/prod/.analysis/

# Check if index file is valid JSON
cat /var/www/orthodoxmetrics/prod/.analysis/library-index.json | jq .

# If corrupted, delete and let librarian recreate
rm /var/www/orthodoxmetrics/prod/.analysis/library-index.json
pm2 restart om-librarian
```

---

## Monitoring

### Check Librarian Status:

```bash
# PM2 status
pm2 status om-librarian

# Recent logs
pm2 logs om-librarian --lines 50 --nostream

# Look for messages like:
# ✅ OM-Librarian: Ready and watching
# 📄 OM-Librarian: New file detected: deployment-guide.md
# 🔄 OM-Librarian: File changed: troubleshooting.md
```

### Check API Status:

```bash
# Test status endpoint
curl http://localhost:3001/api/library/status | jq

# Test files endpoint
curl http://localhost:3001/api/library/files | jq '.totalCount'

# Test search
curl "http://localhost:3001/api/library/search?q=deployment&mode=filename" | jq '.totalResults'
```

### Monitor File Indexing:

```bash
# Watch index file changes
watch -n 5 'jq ".files | length" /var/www/orthodoxmetrics/prod/.analysis/library-index.json'

# Count files in library
find /var/www/orthodoxmetrics/prod/front-end/public/docs/library/ -name "*.md" | wc -l
```

---

## om-librarian Service Details

### Configuration (in omLibrarian.js):

```javascript
{
  // Directories monitored:
  watchDirs: [
    'docs/01-27-2026',
    'docs/1-20-26',
    'docs/1-22-26',
    'docs/ARCHIVE',
    'docs/dev',
    'docs/ocr',
    'docs/records',
    'docs/ops',
  ],
  
  // Output locations:
  libraryDir: 'front-end/public/docs/library',
  indexFile: '.analysis/library-index.json',
  processedLog: '.analysis/library-processed.json',
  
  // Categories:
  categories: {
    technical: ['dev', 'DEVELOPMENT', 'REFERENCE', 'FEATURES'],
    ops: ['ops', 'OPERATIONS', '1-22-26', '01-27-2026', '1-20-26'],
    recovery: ['records', 'ocr', 'ARCHIVE'],
  }
}
```

### PM2 Configuration (in ecosystem.config.js):

```javascript
{
  name: "om-librarian",
  cwd: "/var/www/orthodoxmetrics/prod",
  script: "server/src/agents/omLibrarian.js",
  instances: 1,
  exec_mode: "fork",
  autorestart: true,
  watch: false,
  max_memory_restart: "600M",
  env: {
    NODE_ENV: "production",
    OML_LOG_LEVEL: "info"
  },
  out_file: "logs/om-librarian-out.log",
  error_file: "logs/om-librarian-err.log",
}
```

---

## Summary

**Problem**: Frontend couldn't communicate with om-librarian service

**Solution**: Created backend API router to serve library index data

**Status**: 
- ✅ API router created (`/api/library/*`)
- ✅ Router mounted in backend
- ⏳ **Need to restart backend**: `pm2 restart orthodox-backend`

**Result**: `/church/om-spec` page will show "Librarian online" and display documentation library correctly.
