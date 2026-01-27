# OM-Library Quick Start Guide

**System:** OM-Library v1.0.0  
**Date:** January 27, 2026

---

## What is OM-Library?

OM-Library is an intelligent documentation management system that automatically discovers, archives, and indexes markdown files from your documentation directories. It features:

- 🤖 **Background Agent** - Auto-archives new files
- 🔍 **Dual Search** - Filename + full-text content search
- 🔗 **Smart Relations** - Automatically finds related documents
- 📊 **Live Status** - Real-time monitoring dashboard
- 🛡️ **Safe Operation** - Works even when agent is offline

---

## Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd /var/www/orthodoxmetrics/prod
bash scripts/install-om-library-deps.sh
```

**Installs:** slugify, fuse.js, chokidar, fs-extra

---

### Step 2: Start OM-Librarian

```bash
pm2 start ecosystem.config.js --only om-librarian
```

**Verify:**
```bash
pm2 list
# Should show: om-librarian | online
```

---

### Step 3: Check Logs

```bash
pm2 logs om-librarian --lines 20
```

**Expected:**
```
✅ OM-Librarian: Ready and watching
📄 OM-Librarian: New file detected: ...
✅ OM-Librarian: Processed ... → ops
```

---

### Step 4: Access UI

Navigate to: `http://yourdomain.com/church/om-library`

**You should see:**
- ✅ "Librarian Online" badge with file count
- ✅ Search bar with Filenames/Contents toggle
- ✅ Category filter dropdown
- ✅ List of indexed documents

---

### Step 5: Test Search

1. **Filename Search:**
   - Select "Filenames" mode
   - Type: `interactive`
   - Click "Search"
   - Results show files with "interactive" in the name

2. **Content Search:**
   - Select "Contents" mode
   - Type: `database`
   - Click "Search"
   - Results show files containing "database" with snippets

---

## Features Overview

### Auto-Discovery

**Monitored Directories:**
```
docs/01-27-2026/
docs/1-20-26/
docs/1-22-26/
docs/ARCHIVE/
docs/dev/
docs/ocr/
docs/records/
docs/ops/
```

**Process:**
1. Librarian detects new `.md` file
2. Extracts title from `# Header`
3. Generates `YYYY-MM-DD_title-slug.md`
4. Copies to `front-end/public/docs/library/{category}/`
5. Indexes in `.analysis/library-index.json`
6. Finds related files automatically

---

### Categories

Files are automatically categorized:

**Technical** - Development, features, references
- Folders: `dev`, `DEVELOPMENT`, `REFERENCE`, `FEATURES`

**Ops** - Operations, deployments, fixes
- Folders: `ops`, `OPERATIONS`, `01-27-2026`, `1-22-26`, `1-20-26`

**Recovery** - Archives, records, OCR
- Folders: `records`, `ocr`, `ARCHIVE`

---

### Search Modes

**Filename Search (Fast)**
- Fuzzy matching (typo-tolerant)
- Searches: filename, title, keywords
- Returns scored results
- < 50ms response time

**Content Search (Comprehensive)**
- Full-text search inside files
- Returns matching snippets with context
- Shows match position
- < 500ms for 250 files

---

### Related Files

The librarian automatically detects relationships:

**Algorithm:**
- Compares base filenames (without dates)
- Requires ≥2 common words (>3 chars)
- Example:
  ```
  interactive-report-fixes
  interactive-report-jobs
  → Related! (shared: interactive, report)
  ```

**UI:**
- "X related" chip in table/grid
- Click to filter view to related group
- Visual grouping of documentation clusters

---

## Troubleshooting

### Librarian Won't Start

```bash
# Check errors
pm2 logs om-librarian --err

# Common fixes:
npm install slugify fuse.js chokidar fs-extra  # Missing deps
chmod 755 front-end/public/docs/library         # Permissions
pm2 restart om-librarian                        # Restart
```

---

### Files Not Indexing

```bash
# Verify file is .md
ls docs/1-22-26/*.md

# Check if already processed
cat .analysis/library-processed.json | grep "filename"

# Trigger re-scan
touch docs/1-22-26

# Watch logs
pm2 logs om-librarian --lines 0
```

---

### Search Not Working

```bash
# Test API directly
curl "http://localhost:3000/api/library/search?q=test&mode=filename"

# Check index
cat .analysis/library-index.json | jq 'keys | length'

# Restart backend
pm2 restart om-backend
```

---

### UI Shows "Librarian Offline"

```bash
# Check status
pm2 list | grep librarian

# If not running:
pm2 start ecosystem.config.js --only om-librarian

# Refresh browser
```

---

## Commands Reference

### PM2 Management

```bash
# Start
pm2 start ecosystem.config.js --only om-librarian

# Stop
pm2 stop om-librarian

# Restart
pm2 restart om-librarian

# Delete
pm2 delete om-librarian

# Logs (follow)
pm2 logs om-librarian

# Logs (last 50 lines)
pm2 logs om-librarian --lines 50

# Status
pm2 list
```

---

### Manual Operations

```bash
# View index
cat .analysis/library-index.json | jq .

# Count indexed files
cat .analysis/library-index.json | jq 'keys | length'

# View processed log
cat .analysis/library-processed.json

# Clear processed log (re-index all)
echo '{}' > .analysis/library-processed.json
pm2 restart om-librarian

# View library files
ls -lh front-end/public/docs/library/*/*.md
```

---

### API Testing

```bash
# Status
curl http://localhost:3000/api/library/status

# List files
curl http://localhost:3000/api/library/files | jq .

# Search (filename)
curl "http://localhost:3000/api/library/search?q=interactive&mode=filename" | jq .

# Search (content)
curl "http://localhost:3000/api/library/search?q=database&mode=content" | jq .

# Categories
curl http://localhost:3000/api/library/categories | jq .

# Single file
curl http://localhost:3000/api/library/file/2026-01-22_interactive-report-fixes | jq .
```

---

## File Structure

```
Project Root
├── server/
│   ├── src/
│   │   └── agents/
│   │       └── omLibrarian.js              # Background agent
│   └── routes/
│       └── library.js                      # API routes
├── front-end/
│   ├── src/features/.../om-library/
│   │   ├── OMLibrary.tsx                   # UI component
│   │   └── index.ts
│   └── public/docs/library/
│       ├── technical/                      # Technical docs
│       ├── ops/                            # Operations docs
│       └── recovery/                       # Recovery docs
├── .analysis/
│   ├── library-index.json                  # Main index
│   └── library-processed.json              # Processed files log
├── ecosystem.config.js                     # PM2 config
├── scripts/
│   └── install-om-library-deps.sh          # Dependency installer
└── docs/
    ├── 01-27-2026/                         # Watched
    ├── 1-22-26/                            # Watched
    ├── 1-20-26/                            # Watched
    ├── dev/                                # Watched
    └── ...
```

---

## Configuration

### Watch More Directories

**Edit:** `server/src/agents/omLibrarian.js`

```javascript
watchDirs: [
  path.join(__dirname, '../../../docs/01-27-2026'),
  path.join(__dirname, '../../../docs/1-20-26'),
  path.join(__dirname, '../../../docs/1-22-26'),
  // Add more:
  path.join(__dirname, '../../../docs/your-folder'),
],
```

**Restart:**
```bash
pm2 restart om-librarian
```

---

### Change Categories

**Edit:** `server/src/agents/omLibrarian.js`

```javascript
categories: {
  technical: ['dev', 'DEVELOPMENT', 'REFERENCE', 'FEATURES'],
  ops: ['ops', 'OPERATIONS', '1-22-26', '01-27-2026'],
  recovery: ['records', 'ocr', 'ARCHIVE'],
  // Add custom:
  custom: ['my-docs', 'custom-folder'],
},
```

**Create directory:**
```bash
mkdir -p front-end/public/docs/library/custom
```

**Restart:**
```bash
pm2 restart om-librarian
```

---

## Best Practices

### 1. File Naming

**Good:**
```
INTERACTIVE_REPORT_FIXES.md
DATABASE_IMPORT_FIX.md
PRODUCTION_DEPLOYMENT_STEPS.md
```

**Result:**
```
2026-01-22_interactive-report-fixes.md
2026-01-22_database-import-fix.md
2026-01-22_production-deployment-steps.md
```

---

### 2. Document Structure

**Start with clear title:**
```markdown
# Interactive Report Fixes

This document describes...
```

**Librarian extracts:**
- Title: "Interactive Report Fixes"
- Preview: "This document describes..."

---

### 3. Related Files

**Use similar naming for related docs:**
```
INTERACTIVE_REPORT_FIXES.md
INTERACTIVE_REPORT_JOBS_IMPLEMENTATION.md
INTERACTIVE_REPORT_SUMMARY.md
```

**Result:** Automatically detected as related group

---

### 4. Monitoring

**Check status daily:**
```bash
pm2 list
pm2 logs om-librarian --lines 10
```

**Expected:**
- Status: `online`
- Uptime: > 0
- No recent errors

---

## Support

### Documentation

- **Full Guide:** `docs/FEATURES/om-library-transformation.md`
- **API Reference:** Included in transformation guide
- **Architecture:** Component diagrams in transformation guide

### Getting Help

1. Check logs: `pm2 logs om-librarian`
2. Test API: `curl http://localhost:3000/api/library/status`
3. Verify files: `ls front-end/public/docs/library/*/*.md`
4. Restart: `pm2 restart om-librarian`

---

## What's Next?

### Immediate

1. ✅ Start librarian
2. ✅ Verify indexing
3. ✅ Test search
4. ✅ Explore related groups

### Short-term

- Add more watched directories
- Customize categories
- Monitor performance
- Back up index regularly

### Long-term

- File deletion UI
- Advanced relationships
- Content preview
- Version history
- Tags & labels

---

**OM-Library Quick Start** | v1.0.0 | January 27, 2026
