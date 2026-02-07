# OM-Library Enhancement Implementation Script

This document outlines all changes needed to enhance OM-Library with sorting, pagination, grouping, batch operations, and configurable scan locations.

## CHANGES REQUIRED

### 1. DATABASE CHANGES
**File**: `server/database/migrations/create_library_sources_table.sql` (NEW)

### 2. BACKEND CHANGES
- `server/src/routes/library.js` - Add new endpoints, enhance existing
- `server/src/agents/omLibrarian.js` - Load sources from DB, add source tracking
- `server/src/index.ts` - No changes needed (route already mounted)

### 3. FRONTEND CHANGES
- `front-end/src/features/devel-tools/system-documentation/om-library/OMLibrary.tsx` - Major enhancements

### 4. DOCUMENTATION
- `docs/FEATURES/om-library-README.md` - Update with new features
- `docs/REFERENCE/om-library-api-endpoints.md` (NEW) - Complete API reference

---

## DECISION POINTS (USER INPUT REQUIRED)

Before proceeding, I need your decisions on:

### A) Index Storage Strategy
**Option 1**: Keep JSON file, add DB only for sources/relationships
- ✅ Faster (no DB queries for list)
- ✅ Less breaking changes
- ❌ Harder to query/filter server-side

**Option 2**: Move index to database
- ✅ Better querying, filtering, pagination
- ✅ Relationships easier to manage
- ❌ More migration work
- ❌ Performance hit on large libraries

**RECOMMENDATION**: Option 1 for now (JSON + DB hybrid)

### B) Related Groups Storage
**Option 1**: Compute on-the-fly from filenames
- ✅ No storage needed
- ❌ Can't manually override
- ❌ Re-computed every request

**Option 2**: Store in library_relationships table
- ✅ Persistent, editable
- ✅ Can include manual groupings
- ❌ Need migration for existing data

**RECOMMENDATION**: Option 2 (add table)

### C) Time Grouping
**Option 1**: Client-side (frontend groups the data)
- ✅ Simple backend
- ✅ Flexible grouping logic
- ❌ Frontend complexity

**Option 2**: Server-side (API returns pre-grouped)
- ✅ Cleaner frontend
- ❌ Less flexible
- ❌ More backend logic

**RECOMMENDATION**: Option 1 (client-side)

---

## FILE-BY-FILE CHANGE SUMMARY

### NEW FILES TO CREATE:

1. **server/database/migrations/2026-02-05_library_enhancements.sql**
   - CREATE TABLE library_sources
   - CREATE TABLE library_relationships (for related groups)
   - CREATE TABLE library_index (optional, for future DB migration)

2. **server/src/config/library-config.js** (NEW)
   - Centralized library configuration
   - Path validation whitelist
   - Default sources

3. **server/src/utils/library-helpers.js** (NEW)
   - Filename similarity scoring
   - Time grouping logic (for client)
   - File type detection

### FILES TO MODIFY:

1. **server/src/routes/library.js** (270 lines → ~600 lines)
   - Add GET /api/library/items (paginated, sorted)
   - Add GET /api/library/download/:idOrSlug (proper download)
   - Add GET /api/library/preview/:idOrSlug (inline view)
   - Add GET /api/library/sources
   - Add POST /api/library/sources (super_admin)
   - Add PUT /api/library/sources/:id (super_admin)
   - Add DELETE /api/library/sources/:id (super_admin)
   - Add POST /api/library/category/batch
   - Add POST /api/library/related/group
   - Enhance GET /api/library/files (keep for backward compat)

2. **server/src/agents/omLibrarian.js** (544 lines → ~700 lines)
   - Load watchDirs from database (library_sources table)
   - Add source_id to index entries
   - Compute related_group_id on index
   - Add source refresh interval
   - Add better relationship detection

3. **front-end/src/features/devel-tools/system-documentation/om-library/OMLibrary.tsx** (658 lines → ~1200 lines)
   - Add sortable table headers
   - Add pagination controls
   - Add time-based grouping (client-side)
   - Add checkboxes + select all
   - Add batch action bar
   - Add related row highlighting
   - Add preview icon
   - Fix download button
   - Add source configuration UI (admin only)

---

## IMPLEMENTATION PHASES

### PHASE A: Backend - Pagination & Sorting (REQUIRED)
**Estimated Time**: 2-3 hours
**Files**: `library.js`
**Complexity**: Low

**Changes**:
- Add `/api/library/items` endpoint
- Accept query params: page, pageSize, sortBy, sortDir, q, mode, category
- Implement server-side pagination (LIMIT/OFFSET on JSON array)
- Implement server-side sorting
- Return: { items, total, page, pageSize, sortBy, sortDir }

### PHASE B: Backend - Download & Preview (CRITICAL FIX)
**Estimated Time**: 1-2 hours
**Files**: `library.js`
**Complexity**: Low

**Changes**:
- Implement `/api/library/download/:idOrSlug`
  - Resolve file path safely
  - Set Content-Disposition: attachment
  - Use res.download()
- Implement `/api/library/preview/:idOrSlug`
  - Set Content-Disposition: inline
  - For markdown: render or serve as text/markdown
  - For PDF/images: correct Content-Type

### PHASE C: Database - Sources & Relationships
**Estimated Time**: 3-4 hours
**Files**: Migration SQL, `library.js`, `omLibrarian.js`, `library-config.js` (new)
**Complexity**: Medium

**Changes**:
- Create migration SQL
- Create library-config.js with path whitelist
- Add sources CRUD endpoints
- Update omLibrarian to load from DB
- Add validation for paths

### PHASE D: Backend - Related Groups & Batch Operations
**Estimated Time**: 3-4 hours
**Files**: `library.js`, `library-helpers.js` (new)
**Complexity**: Medium

**Changes**:
- Create library-helpers.js
- Implement filename similarity (Levenshtein or Jaro-Winkler)
- Add related_group_id to index format
- Implement POST /category/batch
- Implement POST /related/group

### PHASE E: Frontend - UI Enhancements
**Estimated Time**: 6-8 hours
**Files**: `OMLibrary.tsx`
**Complexity**: High

**Changes**:
- Sortable headers (click to sort, show indicator)
- Pagination UI (MUI Pagination component)
- Time grouping (group items by date buckets)
- Checkboxes (useState for selections)
- Batch action bar (conditional render when selections > 0)
- Related highlighting (CSS classes on related rows)
- Preview button (window.open to /preview/:id)
- Fix download button (proper endpoint)

### PHASE F: Admin - Source Management UI (OPTIONAL)
**Estimated Time**: 4-5 hours
**Files**: New admin page or modal in OMLibrary.tsx
**Complexity**: Medium

**Changes**:
- Add "Manage Sources" button (admin only)
- Create modal/page with sources table
- Add/edit/delete sources
- Show active/inactive status
- Test connection button

---

## TOTAL IMPLEMENTATION TIME
**Conservative Estimate**: 20-26 hours
**Aggressive Estimate**: 15-20 hours (if no issues)

---

## NEXT STEPS

**USER: Please confirm:**

1. Do you want ALL phases (A-F) or a subset?
2. Which strategy for index storage (JSON hybrid or full DB)?
3. Which strategy for related groups (on-the-fly or persistent)?
4. Should I proceed with creating all files now, or do you want to review each phase individually?

**If you say "proceed with full implementation":**
- I will create all migration files
- I will modify all backend files
- I will enhance the frontend
- I will test locally (you'll need to run npm build and restart)
- I will provide testing checklist

**Alternatively:**
- I can do phase-by-phase (you test after each)
- I can create the script files for you to review first
- I can provide bash scripts to automate parts of it

**YOUR DECISION?**
