# OM-Library Current State Documentation

**Date**: February 5, 2026  
**Purpose**: Document current implementation before enhancement

---

## 📁 FRONTEND

### Component Location
- **Path**: `Z:\front-end\src\features\devel-tools\system-documentation\om-library\OMLibrary.tsx`
- **Lines**: 658 lines
- **Type**: React functional component with Material-UI

### Current Features
1. **Search**
   - Toggle between filename/content search
   - Search API call to `/api/library/search`
   - Real-time filtering of results

2. **Filters**
   - Category filter: all, technical, ops, recovery
   - Related group filter (shows files related to clicked file)

3. **Views**
   - Table view (default) - 7 columns
   - Grid view - Card-based layout

4. **Table Columns** (NOT sortable currently)
   - Title (with icon and first paragraph preview)
   - Category (chip)
   - Source (source folder name)
   - Related (chip with count, clickable)
   - Size (formatted bytes)
   - Modified (formatted date)
   - Actions (download button only)

5. **Related Files**
   - Clicking "X related" pill filters view to show related group
   - Shows "Showing Related Group" chip with X to clear
   - **LIMITATION**: Does NOT highlight rows, just filters

6. **Librarian Status**
   - Badge showing online/offline status
   - Total files count
   - Refreshes every 30 seconds

### Current Limitations
- ❌ No sorting (headers not clickable)
- ❌ No pagination (shows ALL files)
- ❌ No time-based grouping (Today/Yesterday/etc)
- ❌ No batch selection (no checkboxes)
- ❌ No preview functionality
- ❌ Download may not work properly (just calls window.open)
- ❌ No row highlighting for related files

### API Calls Made
```typescript
GET /api/library/status          // Librarian status
GET /api/library/files?category= // List files
GET /api/library/search?q=&mode=&category= // Search
GET /api/library/download/:id    // Download (window.open)
```

---

## 🔧 BACKEND

### Router Location
- **Path**: `Z:\server\src\routes\library.js`
- **Lines**: 270 lines
- **Mounted at**: `/api/library` in `server/src/index.ts:677`

### Current Endpoints

#### 1. GET /api/library/status
- **Purpose**: Returns librarian service status
- **Response**:
```json
{
  "running": true,
  "status": "online",
  "totalFiles": 123,
  "lastIndexUpdate": "ISO date",
  "indexVersion": "1.0.0",
  "categories": { "technical": 50, "ops": 40, "recovery": 33 }
}
```

#### 2. GET /api/library/files
- **Query params**: `category` (optional)
- **Response**:
```json
{
  "success": true,
  "files": [...],
  "totalCount": 123,
  "lastUpdate": "ISO date"
}
```
- **LIMITATION**: No pagination, sorting, or grouping

#### 3. GET /api/library/search
- **Query params**: `q`, `mode` (filename|content), `category`
- **Features**:
  - Filename search: matches filename + title
  - Content search: matches firstParagraph + keywords, returns snippets
- **LIMITATION**: No pagination

#### 4. GET /api/library/file/:fileId
- **Purpose**: Get single file details + content
- **Response**: File metadata + content field

#### 5. POST /api/library/reindex (admin only)
- **Purpose**: Clear processed log to force re-indexing

### Missing Endpoints
- ❌ No download endpoint (frontend calls /download/:id but doesn't exist!)
- ❌ No preview endpoint
- ❌ No batch update category endpoint
- ❌ No batch mark as related endpoint
- ❌ No sources management endpoints

---

## 🤖 OM-LIBRARIAN AGENT

### Agent Location
- **Path**: `Z:\server\src\agents\omLibrarian.js`
- **Lines**: 544 lines
- **Type**: Standalone Node.js agent with chokidar file watcher

### How It Works
1. **Watches directories** (hardcoded in CONFIG.watchDirs):
   ```javascript
   [
     'docs/01-27-2026',
     'docs/1-20-26',
     'docs/1-22-26',
     'docs/ARCHIVE',
     'docs/dev',
     'docs/ocr',
     'docs/records',
     'docs/ops'
   ]
   ```

2. **On file add/change**:
   - Reads markdown file
   - Extracts metadata (title from `# Header`, keywords, preview)
   - Normalizes filename to `YYYY-MM-DD_title-slug.md`
   - Determines category from path patterns
   - Copies file to `front-end/public/docs/library/{category}/`
   - Finds related files (2+ common words in filename)
   - Updates index at `.analysis/library-index.json`
   - Tracks processed files in `.analysis/library-processed.json`

3. **Index Structure** (object format, not array):
```json
{
  "file-id": {
    "id": "string",
    "originalPath": "full path",
    "libraryPath": "library path",
    "filename": "normalized name",
    "title": "extracted title",
    "category": "technical|ops|recovery",
    "size": 12345,
    "created": "ISO date",
    "modified": "ISO date",
    "sourceFolder": "folder name",
    "relatedFiles": ["id1", "id2"],
    "keywords": ["api", "backend"],
    "firstParagraph": "preview text"
  }
}
```

### Category Determination
```javascript
technical: ['dev', 'DEVELOPMENT', 'REFERENCE', 'FEATURES']
ops: ['ops', 'OPERATIONS', '1-22-26', '01-27-2026', '1-20-26']
recovery: ['records', 'ocr', 'ARCHIVE']
```

### Related Files Algorithm (Basic)
- Extracts base name (without date prefix)
- Splits by hyphens into words
- Finds files with 2+ common words (length > 3)
- **LIMITATION**: Very simple, no content similarity

### Current Limitations
- ❌ Hardcoded watch directories (not configurable)
- ❌ No database storage (uses JSON file)
- ❌ No "source" field in index (can't distinguish scan locations)
- ❌ No related_group_id (just array of IDs)
- ❌ No content similarity (only filename-based)

---

## 💾 DATABASE

### Current Tables
**NONE** - Library uses flat JSON files:
- `.analysis/library-index.json` - main index
- `.analysis/library-processed.json` - tracking processed files

### Files Stored At
- **Library copies**: `front-end/public/docs/library/{category}/`
- **Original locations**: Various docs/ subdirectories

---

## 🎯 KEY GAPS TO ADDRESS

### Critical Missing Features
1. **Download endpoint doesn't exist** - frontend calls it but returns 404
2. **No pagination** - loads ALL files (performance issue at scale)
3. **No sorting** - table headers not interactive
4. **No time grouping** - doesn't group by Today/Yesterday/etc
5. **No batch operations** - no checkboxes or bulk actions
6. **No preview** - can't open docs in new tab
7. **No configurable scan locations** - hardcoded paths
8. **No related group highlighting** - just filters, doesn't highlight rows
9. **No database backing** - all JSON file based

### Required New Endpoints
```
GET  /api/library/items           // Replace /files with pagination
GET  /api/library/download/:id    // NEW - actual download
GET  /api/library/preview/:id     // NEW - preview in tab
GET  /api/library/sources          // NEW - list scan locations
POST /api/library/sources          // NEW - add scan location
PUT  /api/library/sources/:id      // NEW - update scan location
DELETE /api/library/sources/:id    // NEW - remove scan location
POST /api/library/category/batch   // NEW - batch update category
POST /api/library/related/group    // NEW - batch mark as related
```

### Required Database Tables
```sql
CREATE TABLE library_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  scan_mode ENUM('recursive', 'shallow', 'single') DEFAULT 'recursive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Option 1: Add to existing index (if moved to DB)
ALTER TABLE library_index ADD COLUMN related_group_id VARCHAR(50);
ALTER TABLE library_index ADD COLUMN source_id INT;

-- Option 2: Keep JSON but compute groups on-the-fly
```

---

## 📊 IMPLEMENTATION COMPLEXITY

### Easy (1-2 hours each)
- Add download endpoint (set proper headers, res.download())
- Add preview endpoint (inline disposition)
- Add sorting query params to /items
- Add pagination (LIMIT/OFFSET)

### Medium (2-4 hours each)
- Add library_sources table + CRUD endpoints
- Update om-librarian to load sources from DB
- Add batch category update endpoint
- Time-based grouping (compute from timestamps)
- Add checkboxes + select all UI

### Hard (4-8 hours each)
- Related grouping with content similarity
- Batch related marking (create group IDs)
- Row highlighting for related groups (complex UI state)
- Server-side group-by-time with metadata

---

## 🚀 RECOMMENDED IMPLEMENTATION ORDER

1. **Phase A**: Backend list normalization (2-3 hours)
   - Add `/api/library/items` with pagination/sorting
   - Keep `/api/library/files` for backwards compat

2. **Phase B**: Fix download + add preview (1-2 hours)
   - Implement proper download endpoint
   - Add preview endpoint

3. **Phase C**: Configurable scan locations (3-4 hours)
   - Create library_sources table
   - Add sources CRUD endpoints
   - Update om-librarian to use DB sources

4. **Phase D**: Related grouping (4-5 hours)
   - Add related_group_id field
   - Implement grouping endpoint
   - Add batch endpoints

5. **Phase E**: Frontend enhancements (5-6 hours)
   - Sortable headers
   - Pagination UI
   - Time grouping
   - Checkboxes + batch actions
   - Related highlighting

**TOTAL ESTIMATE**: 15-20 hours for full implementation

---

## ⚠️ RISKS & CONSTRAINTS

### Breaking Changes
- Changing index format from object to array (mitigate: support both)
- Moving from JSON to DB (mitigate: keep JSON as cache)

### Performance
- Loading all files without pagination (FIXED in Phase A)
- Scanning large directories (add scan throttling)

### Data Loss
- Ensure om-librarian doesn't lose index on crash
- Keep JSON backups when moving to DB

---

**END OF CURRENT STATE DOCUMENT**
