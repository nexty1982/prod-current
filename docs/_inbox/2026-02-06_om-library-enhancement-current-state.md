# OM-Library Enhancement - Current State Analysis
**Date:** 2026-02-06  
**Analysis for:** Daily task ingestion and automated cleanup implementation

## CURRENT STATE DOCUMENTATION

### 1. OM-Librarian Agent Configuration

**File Location:** `Z:\server\src\agents\omLibrarian.js`

**Current Scan Roots (Hardcoded in CONFIG.watchDirs):**
```javascript
watchDirs: [
  path.join(__dirname, '../../../docs/01-27-2026'),
  path.join(__dirname, '../../../docs/1-20-26'),
  path.join(__dirname, '../../../docs/1-22-26'),
  path.join(__dirname, '../../../docs/ARCHIVE'),
  path.join(__dirname, '../../../docs/dev'),
  path.join(__dirname, '../../../docs/ocr'),
  path.join(__dirname, '../../../docs/records'),
  path.join(__dirname, '../../../docs/ops'),
]
```

**Absolute Paths (resolved):**
- `/var/www/orthodoxmetrics/prod/docs/01-27-2026`
- `/var/www/orthodoxmetrics/prod/docs/1-20-26`
- `/var/www/orthodoxmetrics/prod/docs/1-22-26`
- `/var/www/orthodoxmetrics/prod/docs/ARCHIVE`
- `/var/www/orthodoxmetrics/prod/docs/dev`
- `/var/www/orthodoxmetrics/prod/docs/ocr`
- `/var/www/orthodoxmetrics/prod/docs/records`
- `/var/www/orthodoxmetrics/prod/docs/ops`

**IMPORTANT:** Prod root `/var/www/orthodoxmetrics/prod` is **NOT** currently scanned.

### 2. Index Storage

**Index Type:** Filesystem-based (JSON file)  
**Index Location:** `/var/www/orthodoxmetrics/prod/.analysis/library-index.json`  
**Processed Log:** `/var/www/orthodoxmetrics/prod/.analysis/library-processed.json`  
**Library Copies:** `/var/www/orthodoxmetrics/prod/front-end/public/docs/library/`

**Categories:**
- `technical/` - Development docs
- `ops/` - Operations docs
- `recovery/` - Records/OCR docs

### 3. PM2 Process Status

**File:** `Z:\ecosystem.config.js`

**Process Name:** `om-librarian`  
**Script:** `server/src/agents/omLibrarian.js`  
**Working Dir:** `/var/www/orthodoxmetrics/prod`  
**Mode:** `fork` (single instance)  
**Autorestart:** `true`  
**Logs:**
- Out: `/var/www/orthodoxmetrics/prod/logs/om-librarian-out.log`
- Error: `/var/www/orthodoxmetrics/prod/logs/om-librarian-err.log`

**Scheduling:** Currently runs continuously with `chokidar` file watcher (no cron/scheduled reindex).

### 4. Database Schema

**Database:** `orthodoxmetrics_db`  
**Migration:** `Z:\server\database\migrations\2026-02-05_library_enhancements.sql`

**Tables:**

#### `library_sources`
- Columns: `id`, `name`, `path`, `is_active`, `scan_mode`, `description`, `last_scan`, `file_count`, `created_at`, `updated_at`
- Purpose: Configurable scan locations (already created)
- Current entries: 8 predefined sources (matching hardcoded watchDirs)

#### `library_relationships`
- Columns: `id`, `group_id`, `file_id`, `relationship_type`, `score`, `created_by`, `created_at`
- Purpose: Document relationship tracking

**Status:** Tables exist, but om-librarian does NOT yet read from `library_sources` table.

### 5. API Endpoints

**File:** `Z:\server\src\routes\library.js`

**Existing Endpoints:**
- `GET /api/library/status` - Librarian status
- `GET /api/library/files` - All indexed files
- `GET /api/library/items` - Paginated files
- `GET /api/library/search` - Search library
- `GET /api/library/file/:fileId` - Single file details
- `GET /api/library/download/:idOrSlug` - Download file
- `GET /api/library/preview/:idOrSlug` - Preview file
- `POST /api/library/reindex` - Trigger reindex (admin only) **EXISTS**
- `GET /api/library/sources` - List scan sources (admin only) **EXISTS**
- `POST /api/library/sources` - Add scan source (super_admin) **EXISTS**
- `PUT /api/library/sources/:id` - Update source **EXISTS**
- `DELETE /api/library/sources/:id` - Delete source **EXISTS**
- `POST /api/library/cleanup/dry-run` - Plan cleanup **EXISTS**
- `POST /api/library/cleanup/apply` - Execute cleanup **EXISTS**
- `GET /api/library/cleanup/stats` - Cleanup stats **EXISTS**

### 6. Library Organizer Service

**File:** `Z:\server\src\services\libraryOrganizer.js`

**Status:** Fully implemented  
**Features:**
- Dry-run mode ✅
- Safe file type allowlist ✅
- Collision avoidance ✅
- Manifest logging ✅
- Categories: `daily`, `inbox`, `artifacts`

**Destination Structure:**
- Daily tasks → `docs/daily/YYYY-MM-DD/`
- Large artifacts → `docs/_artifacts/YYYY-MM-DD/`
- Other files → `docs/_inbox/YYYY-MM-DD/`

**Protected Files:** package.json, tsconfig.json, README.md, etc.  
**Safe Extensions:** .md, .txt, .log, .sh, .sql, .json, .zip, .pdf, .csv

### 7. OM-Library Frontend

**File:** `Z:\front-end\src\features\devel-tools\system-documentation\om-library\OMLibrary.tsx`

**Features:**
- Search (filename + content modes)
- Category filtering
- Related file detection
- Grid/table views
- Librarian status monitoring

**Missing:** UI for cleanup (dry-run/apply buttons)

## GAPS TO IMPLEMENT

### A) Daily Tasks Ingestion (prod root)

**Status:** ❌ NOT IMPLEMENTED  
**Required:**
1. Add prod root to scan sources
2. Implement include/exclude glob patterns (not in current code)
3. Update om-librarian to read from `library_sources` DB table instead of hardcoded CONFIG

### B) Daily/Interval Indexing

**Status:** ❌ NOT IMPLEMENTED  
**Current:** Continuous chokidar watcher (not scheduled)  
**Required:**
1. Add cron/schedule logic (daily at 02:30 or every 6 hours)
2. Make `/api/library/reindex` actually trigger a full rescan

### C) Cleanup Organizer

**Status:** ✅ BACKEND IMPLEMENTED, ❌ UI NOT IMPLEMENTED  
**Backend:** Fully functional  
**API:** Endpoints exist  
**Frontend:** Missing cleanup UI buttons

### D) Include/Exclude Glob Support

**Status:** ❌ NOT IMPLEMENTED  
**Current:** om-librarian has hardcoded ignore patterns in chokidar config  
**Required:**
1. Add `include_globs` and `exclude_globs` JSON columns to `library_sources`
2. Update om-librarian to respect per-source globs

### E) SHA256 Tracking for Moved Files

**Status:** ⚠️ PARTIAL  
**Organizer:** Calculates SHA256 in manifest  
**Librarian:** Does NOT track SHA256 in index  
**Required:** Add `sha256` field to library index

## CONFIGURATION FILES

### Library Config
**File:** `Z:\server\src\config\library-config.js`  
**Allowlist:** Hardcoded paths under `/var/www/orthodoxmetrics/prod/docs`

### Ecosystem Config
**File:** `Z:\ecosystem.config.js`  
**om-librarian process:** Already configured

## NEXT STEPS

1. ✅ Document current state (THIS FILE)
2. Add glob columns to `library_sources` table
3. Update om-librarian to read from DB
4. Add prod-root-daily source with globs
5. Implement scheduled indexing
6. Add cleanup UI to OMLibrary.tsx
7. Test full workflow

---

**Analysis Complete:** 2026-02-06  
**Analyst:** AI Agent  
**Next:** Implement features A-E per user requirements
