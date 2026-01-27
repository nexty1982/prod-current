# OM-Library Quick Reference

**Version:** 1.0.0 | **Date:** January 27, 2026

---

## 🚀 Quick Start (1 Minute)

```bash
# Install
bash scripts/install-om-library-deps.sh

# Start
pm2 start ecosystem.config.js --only om-librarian

# Verify
pm2 list | grep librarian

# Access
http://yourdomain.com/church/om-library
```

---

## 📋 Commands Cheat Sheet

### PM2 Management

```bash
# Start
pm2 start ecosystem.config.js --only om-librarian

# Stop
pm2 stop om-librarian

# Restart
pm2 restart om-librarian

# Logs (follow)
pm2 logs om-librarian

# Logs (last 50)
pm2 logs om-librarian --lines 50

# Status
pm2 list

# Monitor
pm2 monit

# Delete
pm2 delete om-librarian
```

---

### File Operations

```bash
# View index
cat .analysis/library-index.json | jq .

# Count files
cat .analysis/library-index.json | jq 'keys | length'

# View library files
ls -lh front-end/public/docs/library/*/*.md

# Count by category
ls front-end/public/docs/library/technical/*.md | wc -l
ls front-end/public/docs/library/ops/*.md | wc -l
ls front-end/public/docs/library/recovery/*.md | wc -l

# Clear processed log (reprocess all)
echo '{}' > .analysis/library-processed.json
pm2 restart om-librarian
```

---

### API Testing

```bash
# Status
curl http://localhost:3000/api/library/status | jq .

# List files
curl http://localhost:3000/api/library/files | jq '.total'

# Search filename
curl "http://localhost:3000/api/library/search?q=interactive&mode=filename" | jq .

# Search content
curl "http://localhost:3000/api/library/search?q=database&mode=content" | jq .

# Categories
curl http://localhost:3000/api/library/categories | jq .

# File details
curl http://localhost:3000/api/library/file/FILE_ID | jq .
```

---

## 🎯 Key Concepts

### File Naming Convention

```
Input:  INTERACTIVE_REPORT_FIXES.md
Output: 2026-01-22_interactive-report-fixes.md

Format: YYYY-MM-DD_title-slug.md
```

**Date Source Priority:**
1. Filename date prefix
2. Source folder name (1-22-26)
3. Current date (fallback)

---

### Categories

| Category | Directories | Use Case |
|----------|------------|----------|
| **technical** | dev, DEVELOPMENT, REFERENCE, FEATURES | Development docs |
| **ops** | ops, OPERATIONS, 1-22-26, 01-27-2026 | Operations, fixes |
| **recovery** | records, ocr, ARCHIVE | Recovery, archives |

---

### Relationship Detection

**Algorithm:**
- Compare base filenames (no date)
- Count common words (>3 chars)
- Related if ≥2 common words

**Example:**
```
✅ Related:
  interactive-report-fixes
  interactive-report-jobs
  (shared: "interactive", "report")

❌ Not Related:
  fix-bug
  setup-guide
  (only 0 common words)
```

---

### Search Modes

**Filename Search** (Fast)
- Fuzzy matching
- Searches: filename, title, keywords
- Typo-tolerant
- <50ms

**Content Search** (Comprehensive)
- Full-text inside files
- Returns snippets
- Match context
- <500ms

---

## 🎨 UI Quick Guide

### Header

```
📚 OM-Library    [🤖 Librarian Online (247)] [↻]
```

- **Badge Number** = Total indexed files
- **Green** = Online | **Gray** = Offline
- **Refresh Icon** = Check status now

---

### Search Bar

```
[Filenames|Contents] [Search box...] [Search] [Clear]
```

1. Select mode
2. Type query
3. Press Enter or click Search
4. Click Clear to reset

---

### Filters

```
[Category: All ▾] [Showing Related Group ✕]  [□|≣]
```

- **Category** = Filter by technical/ops/recovery
- **Related Badge** = Active group filter (click ✕ to clear)
- **View Icons** = Toggle table/grid view

---

### Table View

```
Title          │ Category │ Source  │ Related │ Size │ Date │ Actions
──────────────────────────────────────────────────────────────────────
Interactive... │ [Ops]    │ 1-22-26 │ [🔗 2]  │ 12KB │ 1/22 │ [↓]
```

- **Related Chip** = Click to filter
- **Download Icon** = Download file

---

### Grid View

```
┌─────────────────────┐  ┌─────────────────────┐
│ 📄 File Title       │  │ 📄 File Title       │
│ [Category Badge]    │  │ [Category Badge]    │
│ Preview text...     │  │ Preview text...     │
│ ─────────────────── │  │ ─────────────────── │
│ 12KB    [🔗 2]  [↓] │  │ 8KB     [🔗 1]  [↓] │
└─────────────────────┘  └─────────────────────┘
```

---

## 🔧 Troubleshooting Quick Fixes

### Librarian Offline

```bash
pm2 start ecosystem.config.js --only om-librarian
```

### No Files Showing

```bash
pm2 logs om-librarian
# Check for "Processed X files"
```

### Search Not Working

```bash
curl http://localhost:3000/api/library/status
# Check: running: true
```

### Files Not Auto-Indexing

```bash
# Verify file is .md
# Check logs:
pm2 logs om-librarian --lines 20

# Force reindex:
echo '{}' > .analysis/library-processed.json
pm2 restart om-librarian
```

---

## 📊 Monitored Directories

From `tree-docs.txt`:

```
1. docs/01-27-2026/     → ops
2. docs/1-20-26/        → ops
3. docs/1-22-26/        → ops
4. docs/ARCHIVE/        → recovery
5. docs/dev/            → technical
6. docs/ocr/            → recovery
7. docs/records/        → recovery
8. docs/ops/            → ops
```

---

## 🔗 Related Systems

### OM-Spec (Original)

- **Route:** `/church/om-spec`
- **Purpose:** Manual uploads, OMAI tasks
- **Status:** ✅ Active (preserved)

### OM-Library (New)

- **Route:** `/church/om-library`
- **Purpose:** Auto-indexed docs, search
- **Status:** ✅ Active

### Integration

Both systems complement each other:
- Upload to OM-Spec for manual control
- Let OM-Library auto-index technical docs

---

## 📦 Dependencies

```json
{
  "slugify": "^1.6.6",    // Filename slugs
  "fuse.js": "^7.0.0",    // Fuzzy search
  "chokidar": "^4.0.3",   // File watching ✅ Pre-installed
  "fs-extra": "^11.1.1"   // File operations ✅ Pre-installed
}
```

---

## ⚡ Performance Tips

### For Large Repos (>1000 files)

```javascript
// ecosystem.config.js
max_memory_restart: '1G'  // Increase memory

// Add pagination in UI
// Cache search results
// Limit watch directories
```

### For Slow Searches

```bash
# Pre-build search index
# Add Redis caching
# Limit result count
```

---

## 🎯 Quick Wins

### Test Everything Works

```bash
# 1. Agent running?
pm2 list | grep librarian
# Expected: online

# 2. Files indexed?
cat .analysis/library-index.json | jq 'keys | length'
# Expected: > 0

# 3. API working?
curl http://localhost:3000/api/library/status | jq .running
# Expected: true

# 4. UI loads?
# Open: http://yourdomain.com/church/om-library
# Expected: No errors, files listed

# 5. Search works?
# Type: "test" → Click Search
# Expected: Results appear
```

✅ All checks pass → **System is operational!**

---

## 📚 Documentation Links

- 📖 [Full Documentation](../docs/FEATURES/om-library-transformation.md)
- 🚀 [Quick Start](../docs/DEVELOPMENT/om-library-quickstart.md)
- ✅ [Deployment Checklist](../docs/OPERATIONS/om-library-deployment-checklist.md)
- 📋 [Component README](../front-end/src/features/devel-tools/system-documentation/om-library/README.md)

---

## 💡 Pro Tips

1. **Monitor logs during initial indexing:**
   ```bash
   pm2 logs om-librarian --lines 0
   ```

2. **Check file count matches:**
   ```bash
   ls docs/**/*.md | wc -l  # Source
   ls front-end/public/docs/library/**/*.md | wc -l  # Library
   ```

3. **Search tip:** Use content mode for deep search, filename mode for quick finds

4. **Related groups:** Click "X related" to explore documentation clusters

5. **Refresh status:** Click refresh icon to update librarian status immediately

---

**OM-Library Quick Reference** | v1.0.0 | January 27, 2026
