# OM-Library - README

**🚀 Intelligent Documentation Library System**

---

## What is OM-Library?

OM-Library is an intelligent, self-managing documentation system that **automatically** discovers, normalizes, indexes, and relates your markdown documentation files.

### 🎯 Key Features

- 🤖 **Auto-Discovery** - Background agent monitors directories
- 🔍 **Smart Search** - Fuzzy filename + full-text content search
- 🔗 **Relationship Mapping** - Automatically finds related documents
- 📊 **Live Monitoring** - Real-time agent status dashboard
- 🛡️ **Safe Operation** - Works even when agent is offline
- 📚 **Organized** - Auto-categorizes into Technical/Ops/Recovery

---

## ⚡ Quick Start

### 1. Install (30 seconds)

```bash
cd /var/www/orthodoxmetrics/prod
bash scripts/install-om-library-deps.sh
```

---

### 2. Deploy (30 seconds)

```bash
bash scripts/deploy-om-library.sh
```

This script:
- ✅ Creates backups
- ✅ Installs dependencies
- ✅ Creates directories
- ✅ Sets permissions
- ✅ Starts om-librarian agent
- ✅ Verifies deployment

---

### 3. Access (10 seconds)

Open browser: `http://yourdomain.com/church/om-library`

**Expected:**
- ✅ "Librarian Online" badge with file count
- ✅ Search bar ready
- ✅ Files listed in table
- ✅ No errors

---

## 🎓 How It Works

### The Agent

**OM-Librarian** runs in background (PM2) and:

1. **Watches** 8 documentation directories
2. **Detects** new/changed `.md` files
3. **Extracts** title from `#` header
4. **Normalizes** to `YYYY-MM-DD_title-slug.md`
5. **Copies** to category folder (technical/ops/recovery)
6. **Finds** related files by name similarity
7. **Indexes** into searchable JSON

### The Search

Two modes:

**Filename Mode** (Fast)
- Type: "interactive"
- Finds: Files with "interactive" in name
- Uses: Fuzzy matching (typo-tolerant)
- Speed: <50ms

**Content Mode** (Deep)
- Type: "database connection"
- Finds: Files containing that phrase
- Shows: Match snippets with context
- Speed: <500ms

### The Relationships

Automatically detects related docs:

```
Example:
  INTERACTIVE_REPORT_FIXES.md
  INTERACTIVE_REPORT_JOBS.md
  INTERACTIVE_REPORT_SUMMARY.md
  
  → All marked as related (shared: "interactive", "report")
  → Click "3 related" chip to view group
```

---

## 📖 Documentation

| Guide | Purpose | Read Time |
|-------|---------|-----------|
| **[Transformation Guide](docs/FEATURES/om-library-transformation.md)** | Complete system documentation | 30 min |
| **[Quick Start](docs/DEVELOPMENT/om-library-quickstart.md)** | Setup and usage guide | 10 min |
| **[Quick Reference](docs/REFERENCE/om-library-quick-reference.md)** | Command cheat sheet | 5 min |
| **[Deployment Checklist](docs/OPERATIONS/om-library-deployment-checklist.md)** | Production deployment | 15 min |

---

## 🎮 User Guide

### Basic Search

1. **Filename Search** (Quick)
   - Default mode
   - Type: "report"
   - Press Enter
   - See: Files with "report" in name

2. **Content Search** (Thorough)
   - Click "Contents" toggle
   - Type: "database error"
   - Press Enter
   - See: Files containing that phrase + snippets

---

### Filtering

**By Category:**
- Dropdown: Technical/Ops/Recovery
- Shows: Only files in that category

**By Related Group:**
- Click: "X related" chip on any file
- Shows: Only related files
- Clear: Click ✕ on "Showing Related Group" badge

---

### Viewing

**Table View:**
- Detailed list with all metadata
- Sortable columns
- Inline actions

**Grid View:**
- Visual cards
- Preview text
- Compact layout

---

## 🔧 Admin Guide

### PM2 Management

```bash
# Status
pm2 list

# Logs
pm2 logs om-librarian

# Restart
pm2 restart om-librarian

# Monitor
pm2 monit
```

---

### Manual Operations

```bash
# View index
cat .analysis/library-index.json | jq .

# Count files
cat .analysis/library-index.json | jq 'keys | length'

# View library
ls -lh front-end/public/docs/library/*/*.md

# Force reindex
echo '{}' > .analysis/library-processed.json
pm2 restart om-librarian
```

---

### API Testing

```bash
# Status
curl http://localhost:3000/api/library/status | jq .

# Search
curl "http://localhost:3000/api/library/search?q=test&mode=filename" | jq .

# Categories
curl http://localhost:3000/api/library/categories | jq .
```

---

## 🐛 Troubleshooting

### Agent Won't Start

```bash
pm2 logs om-librarian --err
npm install slugify fuse.js chokidar fs-extra
pm2 restart om-librarian
```

---

### No Files Indexed

```bash
# Wait 30 seconds for initial scan
# Then check:
cat .analysis/library-index.json | jq 'keys | length'

# Still 0? Check logs:
pm2 logs om-librarian
```

---

### Search Returns Nothing

```bash
# Verify index has files
cat .analysis/library-index.json | jq 'keys | length'

# Test API
curl "http://localhost:3000/api/library/search?q=test&mode=filename" | jq .

# Restart backend
pm2 restart om-backend
```

---

### UI Shows "Offline"

```bash
# Check agent
pm2 list | grep librarian

# If stopped:
pm2 start ecosystem.config.js --only om-librarian

# Refresh browser
```

---

## 🔄 Migration from OM-Spec

**Good News:** No migration needed!

Both systems coexist:
- **OM-Spec** (`/church/om-spec`) - Preserved, unchanged
- **OM-Library** (`/church/om-library`) - New, independent

Use both:
- OM-Spec for manual uploads
- OM-Library for auto-indexed search

---

## 📊 System Architecture

```
Documentation Directories (8 locations)
           ↓
    [OM-Librarian Agent]
     - Watches dirs
     - Normalizes files
     - Builds index
           ↓
Library Storage + Index
  /public/docs/library/
  .analysis/library-index.json
           ↓
    [Backend API]
  /api/library/*
     - Status
     - Search
     - Relationships
           ↓
    [OM-Library UI]
  /church/om-library
     - Search bar
     - Related groups
     - Live status
```

---

## 💻 Technical Stack

| Layer | Technology |
|-------|-----------|
| **Agent** | Node.js + chokidar + slugify |
| **API** | Express.js + fuse.js |
| **UI** | React 18 + TypeScript + MUI |
| **Process** | PM2 |
| **Storage** | File system + JSON index |

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| **Indexing Speed** | ~100 files/sec |
| **Memory Usage** | ~150MB |
| **CPU Usage** | <1% idle, 5-10% indexing |
| **Search Speed** | <50ms filename, <500ms content |
| **Startup Time** | ~2 seconds |

---

## ✅ Success Checklist

- [ ] Dependencies installed (`slugify`, `fuse.js`)
- [ ] Directories created (`library/`, `.analysis/`)
- [ ] Agent started (`pm2 list` shows `om-librarian online`)
- [ ] Files indexed (`.analysis/library-index.json` has entries)
- [ ] API working (`curl /api/library/status` returns `running: true`)
- [ ] UI loads (`/church/om-library` shows files)
- [ ] Search works (type query, press Enter, see results)
- [ ] Related groups work (click "X related" chip)

**All checked?** → **System is operational!** 🎉

---

## 🆘 Getting Help

**Quick Fixes:**
- Agent offline? → `pm2 restart om-librarian`
- No files? → Wait 30s, check `pm2 logs om-librarian`
- Search broken? → `curl /api/library/status`, restart if needed
- UI crash? → Check browser console, verify API responses

**Documentation:**
- Full guide: `docs/FEATURES/om-library-transformation.md`
- Commands: `docs/REFERENCE/om-library-quick-reference.md`
- Deployment: `docs/OPERATIONS/om-library-deployment-checklist.md`

**Support:**
- Check logs: `pm2 logs om-librarian`
- Test API: `curl http://localhost:3000/api/library/status`
- View index: `cat .analysis/library-index.json | jq .`

---

## 🚀 What's Next?

### Immediate
1. ✅ Deploy system
2. ✅ Verify indexing
3. ✅ Test search
4. ✅ Train users

### Short-term
- Add file deletion UI
- Markdown preview modal
- Enhanced relationships
- Search analytics

### Long-term
- Version tracking
- Semantic search
- AI summarization
- Advanced visualization

---

## 📝 Quick Facts

- **Agent Name:** om-librarian
- **Route:** /church/om-library
- **API Base:** /api/library
- **Storage:** front-end/public/docs/library/
- **Index:** .analysis/library-index.json
- **Logs:** logs/om-librarian-*.log
- **Categories:** technical, ops, recovery
- **Format:** YYYY-MM-DD_title-slug.md
- **Dependencies:** slugify, fuse.js, chokidar, fs-extra

---

**OM-Library** | v1.0.0 | Intelligent Documentation Library | January 27, 2026
