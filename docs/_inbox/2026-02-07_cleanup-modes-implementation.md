# Cleanup Modes Implementation

**Date:** 2026-02-07  
**Feature:** Mode-specific cleanup for different file types

## Overview

The library organizer now supports different **cleanup modes** to handle different types of files. This allows different UI pages to focus on specific file types without interfering with each other.

## Cleanup Modes

### 1. Documentation Mode (default for OM-Library)

**Files:** `.md`, `.txt`, `.docx`, `.xlsx`, `.pdf`  
**Purpose:** Clean up documentation and reference files  
**Used by:** `/church/om-spec` (OM-Library page)

### 2. Artifacts Mode (future page)

**Files:** `.zip`, `.sql`, `.log`, `.csv`, `.json`, `.yaml`, `.yml`  
**Purpose:** Clean up large artifacts and data files  
**Used by:** Future artifact management page

### 3. Scripts Mode (future page)

**Files:** `.sh`, `.py`, `.js`  
**Purpose:** Clean up script files  
**Used by:** Future script management page

### 4. All Mode (admin only)

**Files:** All safe file types combined  
**Purpose:** Comprehensive cleanup  
**Used by:** Admin/super-admin only via API

## API Changes

### POST /api/library/cleanup/dry-run

**Request body:**
```json
{
  "mode": "documentation"
}
```

**Response includes:**
```json
{
  "success": true,
  "plan": {
    "mode": "documentation",
    "modeDescription": "Documentation and reference files",
    "safeExtensions": [".md", ".txt", ".docx", ".xlsx", ".pdf"],
    "plannedMoves": [...],
    "skipped": [...]
  },
  "summary": {
    "mode": "documentation",
    "modeDescription": "Documentation and reference files",
    "toMove": 5,
    "skipped": 10
  }
}
```

### POST /api/library/cleanup/apply

**Request body:**
```json
{
  "mode": "documentation"
}
```

**Response includes mode information**

### GET /api/library/cleanup/stats

**Query parameter:**
```
?mode=documentation
```

**Response includes:**
```json
{
  "success": true,
  "stats": {
    "mode": "documentation",
    "modeDescription": "Documentation and reference files",
    "safeExtensions": [".md", ".txt", ".docx", ".xlsx", ".pdf"],
    "rootFiles": 20,
    "safeFiles": 8,
    "protectedFiles": 5,
    "unsafeFiles": 7
  }
}
```

## OM-Library UI

The OM-Library page (`/church/om-spec`) now:

1. **Cleanup button** uses `mode: 'documentation'`
2. **Dialog shows mode description**: "Documentation and reference files"
3. **Only shows files matching documentation extensions**
4. **Skips .zip, .sql, .log files** (those will be handled by future page)

## Future Pages

You can create additional cleanup pages for:

### Artifacts Page

```typescript
const handleCleanupDryRun = async () => {
  const response = await fetch('/api/library/cleanup/dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'artifacts' }),
  });
  // ...
};
```

### Scripts Page

```typescript
const handleCleanupDryRun = async () => {
  const response = await fetch('/api/library/cleanup/dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'scripts' }),
  });
  // ...
};
```

## Code Changes

### Modified Files

1. **server/src/services/libraryOrganizer.js**
   - Added `cleanupModes` config
   - Constructor now accepts `mode` parameter
   - Added `validateMode()` and `getSafeExtensions()` methods
   - All methods now respect the selected mode

2. **server/src/routes/library.js**
   - Updated cleanup endpoints to accept `mode` in request body/query
   - Default mode: `'documentation'`

3. **front-end/src/features/.../OMLibrary.tsx**
   - Cleanup requests now include `mode: 'documentation'`
   - Dialog shows mode description

## Example Cleanup Plan (Documentation Mode)

**Files to Move (5):**
- `gshort.md` → `docs/_inbox/2026-02-07/`
- `identify_conflicts.md` → `docs/_inbox/2026-02-07/`
- `README.docx` → `docs/_inbox/2026-02-07/`

**Files Skipped (24):**
- `.gitignore.bak.*` (unsafe extension)
- `.gitignore.parent` (unsafe extension)
- `omtrace-ui.zip` (wrong mode - use artifacts mode)
- `omtrace.zip` (wrong mode - use artifacts mode)
- `tools.zip` (wrong mode - use artifacts mode)

## Testing

1. **Test documentation mode** in OM-Library:
   ```bash
   # Create test files
   echo "# Test Doc" > /var/www/orthodoxmetrics/prod/test_doc.md
   echo "test" > /var/www/orthodoxmetrics/prod/test_artifact.zip
   ```

2. **Trigger cleanup dry-run** in OM-Library UI

3. **Verify**:
   - ✅ `test_doc.md` should be in "Files to Move"
   - ✅ `test_artifact.zip` should be in "Skipped" (wrong mode)

4. **Apply cleanup** and verify files moved correctly

## Benefits

✅ **Separation of concerns**: Different pages handle different file types  
✅ **No conflicts**: Documentation cleanup won't move artifacts  
✅ **Extensible**: Easy to add new modes for new pages  
✅ **Safe**: Mode validation prevents invalid configurations  
✅ **Clear UX**: Users see what type of files will be moved  

---

**Implementation Complete:** 2026-02-07  
**Status:** ✅ Ready for use
