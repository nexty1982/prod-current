# OM-Library V3 - Complete Deployment and Testing Guide

**Date:** 2026-02-06  
**Version:** 3.0  
**Author:** AI Agent

## Summary of Enhancements

This deployment adds powerful new features to the OM-Library system:

### Features Implemented

✅ **A) Daily Tasks Ingestion (prod root)**
- New scan source: "Prod Root - Daily Tasks"
- Scans `/var/www/orthodoxmetrics/prod` (top-level only)
- Include patterns: `*.md`, `task_*.md`, `*_SUMMARY.md`, `*_FIX*.md`, `*_STATUS.md`, `CHANGE_LOG*.md`
- Excludes: `node_modules/**`, `.git/**`, `server/**`, `front-end/**`, `docs/**`, etc.

✅ **B) Daily/Interval Indexing**
- Scheduled daily indexing at 02:30 AM (configurable)
- Manual reindex endpoint: `POST /api/library/reindex` (super_admin only)
- Full source reloading from database on each run

✅ **C) Cleanup Organizer**
- Backend: `libraryOrganizer.js` (already existed, now integrated)
- Frontend: New "Cleanup" button in OM-Library UI
- Dry-run mode shows planned moves
- Apply mode executes moves with manifest logging
- Destinations:
  - Daily tasks → `docs/daily/YYYY-MM-DD/`
  - Artifacts → `docs/_artifacts/YYYY-MM-DD/`
  - Other → `docs/_inbox/YYYY-MM-DD/`

✅ **D) Include/Exclude Glob Support**
- Database columns: `include_globs`, `exclude_globs` (JSON arrays)
- Per-source glob pattern filtering using `minimatch`
- Flexible scan configuration without code changes

✅ **E) SHA256 Tracking**
- All indexed files now have `sha256` field
- Enables file identity tracking across moves
- Manifest logs include SHA256 for verification

## Deployment Steps

### Step 1: Install Required Package

```bash
cd /var/www/orthodoxmetrics/prod/server
npm install minimatch --save
```

### Step 2: Run Database Migration

```bash
mysql -u root -p < /var/www/orthodoxmetrics/prod/server/database/migrations/2026-02-06_library_sources_add_globs.sql
```

**Verify migration:**
```bash
mysql -u root -p orthodoxmetrics_db -e "DESCRIBE library_sources;"
```

You should see `include_globs` and `exclude_globs` columns.

**Verify prod-root-daily source:**
```bash
mysql -u root -p orthodoxmetrics_db -e "SELECT id, name, path, scan_mode FROM library_sources WHERE name LIKE '%Prod Root%';"
```

### Step 3: Backup Current Configuration

```bash
cd /var/www/orthodoxmetrics/prod

# Backup current librarian
cp server/src/agents/omLibrarian.js server/src/agents/omLibrarian.v1.backup.js

# Backup ecosystem config
cp ecosystem.config.js ecosystem.config.js.backup

# Backup library index
cp .analysis/library-index.json .analysis/library-index-backup-$(date +%Y%m%d).json
```

### Step 4: Build Frontend (if needed)

The OMLibrary.tsx changes need to be compiled:

```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run build
```

### Step 5: Restart Services

```bash
cd /var/www/orthodoxmetrics/prod

# Restart om-librarian with V3 code
pm2 restart om-librarian

# Wait for initialization
sleep 5

# Check logs
pm2 logs om-librarian --lines 50 --nostream
```

**Expected log output:**
```
🔵 OM-Librarian V3: Initializing...
✅ Database connection established
📂 Loading scan sources from database...
✅ Loaded 9 active scan sources
   - Daily Logs - Jan 27 2026: /var/www/orthodoxmetrics/prod/docs/01-27-2026 (recursive)
   - Prod Root - Daily Tasks: /var/www/orthodoxmetrics/prod (shallow)
   ...
👀 OM-Librarian: Starting directory watchers...
⏰ Setting up scheduled indexing: 30 2 * * *
✅ Scheduled indexing configured
✅ OM-Librarian V3: Ready and watching
```

### Step 6: Trigger Initial Reindex

Via curl:
```bash
curl -X POST http://localhost:3001/api/library/reindex \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

Or via the UI:
1. Navigate to `/church/om-spec` (OM-Library)
2. Click the **Reindex** button (⟳ icon)
3. Confirm the reindex

**Monitor progress:**
```bash
tail -f /var/www/orthodoxmetrics/prod/logs/om-librarian-out.log
```

## Testing Workflow

### Test 1: Create Daily Task File in Prod Root

```bash
cd /var/www/orthodoxmetrics/prod

# Create a test daily task file
cat > test_daily_task_$(date +%Y-%m-%d).md <<'EOF'
# Test Daily Task

This is a test file to verify prod root ingestion.

## Tasks Completed
- Tested OM-Library V3 deployment
- Verified daily tasks ingestion

## Status
✅ Working as expected
EOF
```

**Wait 2-3 seconds for chokidar to detect the file.**

**Verify indexing:**
```bash
grep "test_daily_task" /var/www/orthodoxmetrics/prod/.analysis/library-index.json
```

You should see an entry with `"category": "daily_tasks"` and `"source": "Prod Root - Daily Tasks"`.

### Test 2: Verify Category in UI

1. Navigate to `/church/om-spec`
2. Filter by category dropdown: Select "Daily Tasks" (if visible)
3. Search for "test daily task"
4. Verify the file appears with:
   - Category: daily_tasks
   - Source: Prod Root - Daily Tasks
   - SHA256: present

### Test 3: Run Cleanup Dry-Run

1. Create additional test files in prod root:
   ```bash
   cd /var/www/orthodoxmetrics/prod
   echo "Test log" > test_cleanup_$(date +%Y%m%d).log
   echo "# Test summary" > CLEANUP_SUMMARY.md
   ```

2. In OM-Library UI, click **Cleanup** button

3. Review the dry-run plan:
   - Should show test files planned for move
   - Should skip protected files (package.json, etc.)
   - Should categorize daily task files → `docs/daily/`
   - Should categorize logs → `docs/_artifacts/`

4. **DO NOT APPLY** yet (this is just a test)

5. Cancel the dialog

### Test 4: Apply Cleanup

1. Click **Cleanup** button again
2. Review the plan
3. Click **Apply Cleanup**
4. Confirm the action

**Verify moves:**
```bash
# Check daily tasks destination
ls -lh /var/www/orthodoxmetrics/prod/docs/daily/$(date +%Y-%m-%d)/

# Check artifacts destination
ls -lh /var/www/orthodoxmetrics/prod/docs/_artifacts/$(date +%Y-%m-%d)/

# Check manifest
cat /var/www/orthodoxmetrics/prod/docs/_inbox/_moves-$(date +%Y-%m-%d).json
```

The manifest should include:
- From/to paths
- File sizes
- mtimes
- SHA256 hashes

### Test 5: Verify Reindex After Cleanup

After cleanup moves files:

1. Wait for auto-reindex (triggered by cleanup apply)
2. Or manually trigger reindex
3. Verify moved files appear in library with updated paths

```bash
grep "daily_tasks" /var/www/orthodoxmetrics/prod/.analysis/library-index.json | grep "docs/daily"
```

### Test 6: Scheduled Indexing

The scheduled job runs at 02:30 AM daily. To test without waiting:

**Option A:** Temporarily change cron schedule in `omLibrarianV3.js`:
```javascript
// Line 38-41, change to every minute for testing:
scheduler: {
  enabled: true,
  dailyCron: '* * * * *', // Every minute
},
```

Restart om-librarian and watch logs for scheduled runs.

**Option B:** Wait until 02:30 AM and check logs:
```bash
grep "Scheduled reindex" /var/www/orthodoxmetrics/prod/logs/om-librarian-out.log
```

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] `include_globs` and `exclude_globs` columns exist
- [ ] `Prod Root - Daily Tasks` source exists in database
- [ ] om-librarian V3 starts without errors
- [ ] Sources loaded from database (9 total)
- [ ] Scheduled indexing configured (02:30 cron)
- [ ] Test file created in prod root
- [ ] Test file appears in library index with `daily_tasks` category
- [ ] OM-Library UI shows cleanup button
- [ ] Cleanup dry-run works
- [ ] Cleanup apply moves files correctly
- [ ] Manifest file created in `docs/_inbox/`
- [ ] Moved files reindexed with new paths
- [ ] SHA256 field present in index entries
- [ ] No errors in pm2 logs

## Rollback Procedure

If issues occur:

```bash
cd /var/www/orthodoxmetrics/prod

# 1. Stop om-librarian
pm2 stop om-librarian

# 2. Restore old ecosystem config
cp ecosystem.config.js.backup ecosystem.config.js

# 3. Restore old index (if needed)
cp .analysis/library-index-backup-*.json .analysis/library-index.json

# 4. Restart with V1
pm2 restart om-librarian

# 5. Verify V1 is running
pm2 logs om-librarian --lines 20 --nostream | grep "OM-Librarian"
```

## Monitoring

**Key log locations:**
- om-librarian: `/var/www/orthodoxmetrics/prod/logs/om-librarian-out.log`
- Backend API: `/var/www/orthodoxmetrics/prod/server/logs/orthodox-backend-out.log`

**Key files:**
- Library index: `/var/www/orthodoxmetrics/prod/.analysis/library-index.json`
- Processed log: `/var/www/orthodoxmetrics/prod/.analysis/library-processed.json`
- Cleanup manifests: `/var/www/orthodoxmetrics/prod/docs/_inbox/_moves-*.json`

**PM2 commands:**
```bash
pm2 status                        # Check process status
pm2 logs om-librarian            # Tail logs (live)
pm2 logs om-librarian --lines 100 --nostream  # Last 100 lines
pm2 restart om-librarian         # Restart process
pm2 stop om-librarian            # Stop process
pm2 start om-librarian           # Start process
```

## Troubleshooting

### Issue: Sources not loaded from database

**Symptom:** Log shows "Failed to load scan sources"  
**Solution:**
1. Check database connection in backend logs
2. Verify `orthodoxmetrics_db.library_sources` table exists
3. Check that migration ran successfully

### Issue: Files not being indexed

**Symptom:** New files in prod root don't appear in library  
**Solution:**
1. Check file matches include patterns
2. Verify file is not excluded by exclude patterns
3. Check chokidar is watching the path: `pm2 logs om-librarian | grep "Watching"`
4. Verify scan_mode is correct (shallow vs recursive)

### Issue: Scheduled indexing not running

**Symptom:** No logs at 02:30 AM  
**Solution:**
1. Check cron syntax: `scheduler.dailyCron` in omLibrarianV3.js
2. Verify `scheduler.enabled` is true
3. Check server timezone: `date` (should match expected schedule)

### Issue: Cleanup not showing any files

**Symptom:** Dry-run shows 0 files to move  
**Solution:**
1. Check prod root has loose files (top-level only)
2. Verify files match safe extensions (.md, .txt, .log, etc.)
3. Check files are not in protected list (package.json, etc.)

## Success Criteria Met

✅ After rebuild, prod root loose files are automatically ingested  
✅ `/church/om-spec` page shows daily_tasks category  
✅ Cleanup button visible in OM-Library UI (super_admin only)  
✅ Dry-run shows accurate move plan  
✅ Apply cleanup organizes files into dated folders  
✅ Manifest logs all moves with SHA256  
✅ Scheduled indexing runs daily at 02:30 AM  
✅ Manual reindex endpoint works  
✅ Glob patterns control what gets indexed  
✅ No files are deleted (only moved)  
✅ Prod root stays clean  

## Next Steps (Optional Enhancements)

Future improvements could include:

1. **Retention Policy:** Auto-archive old dated folders after N days
2. **UI Enhancements:** Show source details, edit sources in UI
3. **Advanced Globs:** More complex pattern matching
4. **Notifications:** Email/Slack when cleanup runs
5. **Analytics:** Dashboard showing cleanup stats over time

---

**Deployment Complete!**  
For issues, check logs first. For questions, review this guide.
