# OM-Library Deployment Checklist

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Environment:** Production

---

## Pre-Deployment

### 1. Code Review
- [ ] Review `server/src/agents/omLibrarian.js`
- [ ] Review `server/routes/library.js`
- [ ] Review `front-end/src/.../om-library/OMLibrary.tsx`
- [ ] Verify all file paths are correct
- [ ] Check for hardcoded values

### 2. Dependency Check
- [ ] Verify `package.json` includes new dependencies
- [ ] Test `npm install` in clean environment
- [ ] Check for version conflicts

### 3. Configuration
- [ ] Verify `ecosystem.config.js` paths are correct
- [ ] Check log directory exists: `mkdir -p logs`
- [ ] Verify library directory: `mkdir -p front-end/public/docs/library/{technical,ops,recovery}`
- [ ] Verify analysis directory: `mkdir -p .analysis`

### 4. Backend Integration
- [ ] Verify library routes added to `server/index.js`
- [ ] Test route registration: `curl http://localhost:3000/api/library/status`
- [ ] Check CORS configuration
- [ ] Verify authentication middleware

### 5. Frontend Integration
- [ ] Update router to point to `/church/om-library`
- [ ] Verify import paths are correct
- [ ] Test build: `cd front-end && npm run build`
- [ ] Check for TypeScript errors

---

## Deployment Steps

### Step 1: Backup

```bash
# Backup existing docs
tar -czf backups/docs_$(date +%Y%m%d).tar.gz docs/

# Backup existing public/docs
tar -czf backups/public-docs_$(date +%Y%m%d).tar.gz front-end/public/docs/

# Backup PM2 ecosystem if exists
cp ecosystem.config.js ecosystem.config.js.backup
```

- [ ] Backup complete
- [ ] Backup location: _____________

---

### Step 2: Install Dependencies

```bash
cd /var/www/orthodoxmetrics/prod/server
npm install slugify@1.6.6 fuse.js@7.0.0 chokidar@3.6.0 fs-extra@11.2.0
```

- [ ] Dependencies installed
- [ ] No errors in output

---

### Step 3: Create Directories

```bash
cd /var/www/orthodoxmetrics/prod

# Library storage
mkdir -p front-end/public/docs/library/technical
mkdir -p front-end/public/docs/library/ops
mkdir -p front-end/public/docs/library/recovery

# Analysis files
mkdir -p .analysis

# Logs
mkdir -p logs

# Set permissions
chmod 755 front-end/public/docs/library
chmod 755 front-end/public/docs/library/*
chmod 755 .analysis
chmod 755 logs
```

- [ ] Directories created
- [ ] Permissions set

---

### Step 4: Deploy Code

```bash
# If using git
git pull origin main

# Or manually copy files
# - server/src/agents/omLibrarian.js
# - server/routes/library.js
# - front-end/src/features/.../om-library/*
# - ecosystem.config.js
# - scripts/install-om-library-deps.sh
```

- [ ] Code deployed
- [ ] Files verified

---

### Step 5: Restart Backend

```bash
pm2 restart om-backend
# Or if not using PM2:
# systemctl restart om-backend
```

- [ ] Backend restarted
- [ ] No errors in logs

---

### Step 6: Start OM-Librarian

```bash
pm2 start ecosystem.config.js --only om-librarian
```

**Verify:**
```bash
pm2 list
# Should show:
# om-librarian | online | 0%
```

- [ ] Librarian started
- [ ] Status: online
- [ ] No errors

---

### Step 7: Monitor Initial Indexing

```bash
pm2 logs om-librarian --lines 0
```

**Watch for:**
```
📄 OM-Librarian: New file detected: ...
✅ OM-Librarian: Processed ... → category
```

**Wait for:**
```
📊 OM-Librarian Status:
   Files Indexed: X
   Files Processed: X
```

- [ ] Indexing started
- [ ] Files being processed
- [ ] No errors

---

### Step 8: Verify Index

```bash
# Check index file exists
ls -la .analysis/library-index.json

# Count indexed files
cat .analysis/library-index.json | jq 'keys | length'

# View sample entries
cat .analysis/library-index.json | jq '. | to_entries | .[0:3]'
```

- [ ] Index file exists
- [ ] File count: _____________
- [ ] Sample entries look correct

---

### Step 9: Test Backend API

```bash
# Status endpoint
curl http://localhost:3000/api/library/status | jq .

# Expected: running: true

# Files endpoint
curl http://localhost:3000/api/library/files | jq '.total'

# Expected: Number of files

# Search endpoint (filename)
curl "http://localhost:3000/api/library/search?q=test&mode=filename" | jq .count

# Search endpoint (content)
curl "http://localhost:3000/api/library/search?q=database&mode=content" | jq .count
```

- [ ] Status endpoint: ✅
- [ ] Files endpoint: ✅
- [ ] Search (filename): ✅
- [ ] Search (content): ✅

---

### Step 10: Test Frontend

**Open browser:** `http://yourdomain.com/church/om-library`

**Verify:**
- [ ] Page loads without errors
- [ ] "Librarian Online" badge shows green
- [ ] File count displayed correctly
- [ ] Files listed in table/grid
- [ ] Search bar functional
- [ ] Category filter works
- [ ] Related groups clickable
- [ ] Download buttons work

---

### Step 11: Integration Tests

**Test Case 1: Auto-Discovery**
```bash
# Add a new test file
echo "# Test Document" > docs/01-27-2026/TEST_FILE.md

# Watch logs
pm2 logs om-librarian --lines 0

# Expected:
# 📄 OM-Librarian: New file detected: TEST_FILE.md
# ✅ OM-Librarian: Processed 2026-01-27_test-document.md → ops

# Verify in UI
# Refresh browser, should see new file
```

- [ ] New file detected
- [ ] File processed
- [ ] Appears in UI

---

**Test Case 2: Filename Search**
```
1. Navigate to /church/om-library
2. Ensure "Filenames" mode selected
3. Type: "interactive"
4. Click "Search"
5. Verify results appear
```

- [ ] Search executed
- [ ] Results displayed
- [ ] Correct matches

---

**Test Case 3: Content Search**
```
1. Select "Contents" mode
2. Type: "database"
3. Click "Search"
4. Verify results with snippets
```

- [ ] Content search works
- [ ] Snippets displayed
- [ ] Match context shown

---

**Test Case 4: Related Groups**
```
1. Find file with "X related" indicator
2. Click the chip
3. Verify filter applied
4. Verify only related files shown
5. Click X to clear filter
```

- [ ] Related group filtering works
- [ ] Filter badge shows
- [ ] Clear filter works

---

**Test Case 5: Safe Loading (Agent Offline)**
```bash
# Stop librarian
pm2 stop om-librarian

# Refresh browser
# Should see: "Librarian Offline" badge
# Should show: Warning message
# Should NOT crash

# Restart
pm2 start om-librarian
```

- [ ] Offline state handled gracefully
- [ ] Warning message displayed
- [ ] No UI crash
- [ ] Recovers when restarted

---

## Post-Deployment

### 1. Monitor Performance

```bash
# Watch for 5 minutes
pm2 monit

# Check:
# - Memory usage < 200MB
# - CPU usage < 5%
# - No restarts
# - No errors in logs
```

- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] No CPU spikes

---

### 2. User Acceptance Testing

**Assign to:** _____________

**Tasks:**
- [ ] Search for known documents
- [ ] Verify search results accurate
- [ ] Test related group filtering
- [ ] Download files
- [ ] Check categorization correct
- [ ] Verify UI is responsive

**Feedback:** _____________

---

### 3. Documentation

- [ ] Update internal wiki/docs
- [ ] Notify team of new system
- [ ] Share quick start guide
- [ ] Schedule training session (if needed)

---

### 4. Monitoring Setup

**Add to monitoring system:**

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Add alerts (optional)
pm2 install pm2-discord
# Or pm2-slack, pm2-email, etc.
```

- [ ] Log rotation configured
- [ ] Alerts configured (optional)

---

### 5. Backup Strategy

**Set up automated backups:**

```bash
# Add to crontab
crontab -e

# Daily index backup
0 2 * * * tar -czf /backups/library-index-$(date +\%Y\%m\%d).tar.gz /var/www/orthodoxmetrics/prod/.analysis/library-index.json

# Weekly library backup
0 3 * * 0 tar -czf /backups/library-full-$(date +\%Y\%m\%d).tar.gz /var/www/orthodoxmetrics/prod/front-end/public/docs/library/
```

- [ ] Backup cron configured
- [ ] Test backup manually
- [ ] Verify restore procedure

---

## Rollback Plan

If issues occur:

### Step 1: Stop New System

```bash
pm2 stop om-librarian
```

### Step 2: Restore Backend Route

**Edit:** `server/index.js`

```javascript
// Comment out library routes
// app.use('/api/library', libraryRouter);
```

### Step 3: Restart Backend

```bash
pm2 restart om-backend
```

### Step 4: Restore Old Frontend (if needed)

```bash
# Revert to om-spec route
# Update router configuration
```

### Step 5: Restore from Backup

```bash
tar -xzf backups/docs_YYYYMMDD.tar.gz
tar -xzf backups/public-docs_YYYYMMDD.tar.gz
```

---

## Success Criteria

✅ **All checkboxes complete**  
✅ **No errors in PM2 logs**  
✅ **Librarian status: online**  
✅ **Files indexed: > 0**  
✅ **Search functional**  
✅ **UI loads without errors**  
✅ **User acceptance passed**

---

## Sign-off

**Deployed By:** _____________ **Date:** _____________

**Verified By:** _____________ **Date:** _____________

**Approved By:** _____________ **Date:** _____________

---

**Deployment Checklist Complete** | OM-Library v1.0.0 | January 27, 2026
