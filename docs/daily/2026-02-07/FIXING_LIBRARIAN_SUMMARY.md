# OM-Librarian "Offline" Fix Summary

## Problem

The `/church/om-spec` page showed "Librarian offline" even though PM2 showed the `om-librarian` service was running.

---

## Root Cause

The `om-librarian` service is a **background file watcher** that indexes markdown documentation files, but it **doesn't expose an HTTP API**. The frontend was trying to call `/api/library/status` to check librarian status, but there was **no API endpoint** in the backend to serve this data.

---

## Solution

Created a new backend API router (`server/src/routes/library.js`) with 5 endpoints to serve the library index data:

- `GET /api/library/status` - Check librarian status
- `GET /api/library/files` - Get all indexed files
- `GET /api/library/search` - Search by filename or content
- `GET /api/library/file/:id` - Get specific file
- `POST /api/library/reindex` - Trigger reindex (admin only)

---

## ⚠️ ACTION REQUIRED: Restart Backend

The backend server needs to be restarted to load the new API router.

### On Linux Server:

```bash
# Method 1: Restart just the backend
pm2 restart orthodox-backend

# Method 2: Restart all PM2 processes
pm2 restart all

# Verify status
pm2 status

# Check logs
pm2 logs orthodox-backend --lines 20
```

**Look for in logs:**
```
✅ [Server] Mounted /api/library routes (OM-Library documentation)
```

---

## Verification Steps

### Step 1: Test API Endpoints

Run the test script:

```bash
sudo /var/www/orthodoxmetrics/prod/scripts/test-library-api.sh
```

Or manually test:

```bash
# Test status endpoint
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

### Step 2: Test Frontend

1. Log in to https://orthodoxmetrics.com (as admin)
2. Go to: `/church/om-spec`
3. **Expected**: Green "Librarian online" badge with file count
4. **Before fix**: Red "Librarian offline" message

---

## Files Created/Modified

### Created:

1. **`server/src/routes/library.js`**
   - New API router with 5 endpoints
   - Reads `.analysis/library-index.json`
   - Serves library data to frontend

2. **`docs/OPERATIONS/om-librarian-api-fix.md`**
   - Complete documentation
   - Troubleshooting guide
   - Monitoring instructions

3. **`scripts/test-library-api.sh`**
   - Test script for API endpoints
   - Verifies index file and library directory

4. **`FIXING_LIBRARIAN_SUMMARY.md`**
   - This file

### Modified:

1. **`server/src/index.ts`**
   - Added: `const libraryRouter = require('./routes/library');`
   - Added: `app.use('/api/library', libraryRouter);`

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Flow                                │
└─────────────────────────────────────────────────────────────────┘

1. om-librarian (PM2 service)
   │
   ├─ Monitors docs/ directories for .md files
   ├─ Processes and normalizes filenames
   ├─ Categorizes (Technical, Ops, Recovery)
   ├─ Creates relationships between files
   │
   ├─► Writes: .analysis/library-index.json
   └─► Copies: front-end/public/docs/library/*.md

2. Backend API (/api/library/*)
   │
   ├─ Reads: .analysis/library-index.json
   ├─ Serves data via REST endpoints
   └─ No direct communication with om-librarian process

3. Frontend (/church/om-spec)
   │
   ├─ Calls: GET /api/library/status
   ├─ Calls: GET /api/library/files
   ├─ Displays: File list in grid/table
   └─ Provides: Search functionality
```

---

## Troubleshooting

### Issue: Still shows "Librarian offline"

**Cause**: Backend not restarted

**Fix**:
```bash
pm2 restart orthodox-backend
pm2 logs orthodox-backend --lines 20
```

### Issue: "Library index not found"

**Cause**: om-librarian hasn't created index yet

**Fix**:
```bash
# Check librarian status
pm2 status om-librarian
pm2 logs om-librarian --lines 50

# Restart librarian to trigger indexing
pm2 restart om-librarian

# Wait 30 seconds, then check
ls -lh /var/www/orthodoxmetrics/prod/.analysis/library-index.json
```

### Issue: Empty library (0 files)

**Cause**: No markdown files processed

**Fix**:
```bash
# Check if docs exist
ls -lh /var/www/orthodoxmetrics/prod/docs/

# Force reindex
rm /var/www/orthodoxmetrics/prod/.analysis/library-processed.json
pm2 restart om-librarian

# Monitor logs
pm2 logs om-librarian --follow
```

### Issue: API returns 500 error

**Cause**: Permissions or corrupted index

**Fix**:
```bash
# Fix permissions
sudo chown -R next:next /var/www/orthodoxmetrics/prod/.analysis/

# Verify index is valid JSON
cat /var/www/orthodoxmetrics/prod/.analysis/library-index.json | jq .

# If corrupted, delete and recreate
rm /var/www/orthodoxmetrics/prod/.analysis/library-index.json
pm2 restart om-librarian
```

---

## Quick Reference

### Check Services:

```bash
# PM2 status
pm2 status

# Backend logs
pm2 logs orthodox-backend --lines 50

# Librarian logs
pm2 logs om-librarian --lines 50
```

### Check Files:

```bash
# Index file
cat /var/www/orthodoxmetrics/prod/.analysis/library-index.json | jq '.files | length'

# Library directory
find /var/www/orthodoxmetrics/prod/front-end/public/docs/library/ -name "*.md" | wc -l
```

### Test API:

```bash
# Status
curl http://localhost:3001/api/library/status | jq

# Files
curl http://localhost:3001/api/library/files | jq '.totalCount'

# Search
curl "http://localhost:3001/api/library/search?q=deployment&mode=filename" | jq '.totalResults'
```

---

## Documentation

- **Complete Guide**: `docs/OPERATIONS/om-librarian-api-fix.md`
- **Test Script**: `scripts/test-library-api.sh`
- **This Summary**: `FIXING_LIBRARIAN_SUMMARY.md`

---

## Summary

**Problem**: Frontend couldn't detect running librarian service

**Solution**: Created backend API to serve library index data

**Status**: 
- ✅ API router created and mounted
- ⏳ **NEED TO RESTART**: `pm2 restart orthodox-backend`
- ⏳ **THEN TEST**: Visit `/church/om-spec`

**Result**: Page will show "Librarian online" and display documentation library.

---

## Next Steps

1. ✅ **Restart backend**: `pm2 restart orthodox-backend`
2. ✅ **Test API**: `sudo /var/www/orthodoxmetrics/prod/scripts/test-library-api.sh`
3. ✅ **Test frontend**: Visit https://orthodoxmetrics.com/church/om-spec
4. ✅ **Verify**: Should show green "Librarian online" badge

---

**TL;DR**: Run `pm2 restart orthodox-backend` then check `/church/om-spec` - it should now show "Librarian online" ✅
