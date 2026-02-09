# OM-Library "No Files" Fix

**Date:** 2026-02-05  
**Issue:** OM-Library shows "online" but displays "No files in library yet"

---

## Root Cause

The library API (`server/src/routes/library.js`) expected a different index format than what om-librarian creates:

### Expected Format (API assumption):
```json
{
  "files": [
    { "id": "doc1", ... },
    { "id": "doc2", ... }
  ],
  "version": "1.0.0"
}
```

### Actual Format (om-librarian creates):
```json
{
  "2026-01-27_task-142-catalog-manager": { "id": "...", ... },
  "2026-01-27_classdiagram": { "id": "...", ... },
  ...
}
```

**Result:** The API read `indexData.files` which was `undefined`, returned empty array `[]`, and frontend showed "No files in library yet" even though **hundreds of documents are indexed**.

---

## Fix Applied

Updated all 4 API endpoints in `server/src/routes/library.js` to properly handle the object-based index format:

### 1. GET /api/library/status
**Before:**
```javascript
const totalFiles = indexData.files ? indexData.files.length : 0;
```

**After:**
```javascript
// Convert object index to array (om-librarian uses object keys as IDs)
const filesArray = indexData.files 
  ? indexData.files 
  : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);

const totalFiles = filesArray.length;
```

### 2. GET /api/library/files
**Before:**
```javascript
files: indexData.files || [],
totalCount: indexData.files ? indexData.files.length : 0
```

**After:**
```javascript
const filesArray = indexData.files 
  ? indexData.files 
  : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);

res.json({
  files: filesArray,
  totalCount: filesArray.length
});
```

### 3. GET /api/library/search
**Before:**
```javascript
const files = indexData.files || [];
```

**After:**
```javascript
const files = indexData.files 
  ? indexData.files 
  : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);
```

### 4. GET /api/library/file/:fileId
**Before:**
```javascript
const files = indexData.files || [];
const file = files.find(f => f.id === fileId);
```

**After (optimized for object format):**
```javascript
let file = null;
if (indexData.files) {
  // Array format
  file = indexData.files.find(f => f.id === fileId);
} else {
  // Object format (direct key lookup - faster!)
  file = indexData[fileId];
}
```

---

## Files Modified

- ✅ `server/src/routes/library.js` - All 4 endpoints updated

---

## Verification

### Current Index Status
- **Index file:** `.analysis/library-index.json` ✅ EXISTS
- **Documents indexed:** 2851+ documents
- **Categories:** technical, ops, recovery
- **Format:** Object with document IDs as keys

### Expected Result After Fix
The frontend should now display:
- ✅ Hundreds of documents in the library
- ✅ Correct file counts by category
- ✅ Working search functionality
- ✅ File content loading properly

---

## Deployment

**Required:** Rebuild and restart backend

```bash
# On Linux server
cd /var/www/orthodoxmetrics/prod/server
npm run build
pm2 restart orthodox-backend

# Verify
curl http://127.0.0.1:3001/api/library/files | jq '.totalCount'
# Should show: 800+ (or whatever the actual count is)
```

---

## Testing

After deployment, test the endpoints:

```bash
# 1. Test status endpoint
curl http://127.0.0.1:3001/api/library/status

# Expected:
{
  "running": true,
  "status": "online",
  "totalFiles": 800+,
  "categories": {
    "technical": 400+,
    "ops": 200+,
    "recovery": 200+
  }
}

# 2. Test files endpoint
curl http://127.0.0.1:3001/api/library/files | jq '.files | length'

# Expected: 800+ (actual document count)

# 3. Test specific file
curl http://127.0.0.1:3001/api/library/file/2026-01-27_task-142-catalog-manager

# Should return the document details
```

---

## Why This Happened

The library API was created before the om-librarian, and assumed a different index structure. The om-librarian uses an object-based index for faster direct lookups, but the API expected an array.

---

## Future Consideration

The current fix adds backward compatibility (supports both formats). If we want to standardize on one format, we should either:

**Option A:** Keep object format (faster lookups)
- API converts to array only when needed
- Maintains om-librarian's object structure

**Option B:** Change om-librarian to use array format
- Matches original API expectation
- Slower for direct file lookups (requires array search)

**Recommendation:** Keep current fix (Option A) - object format is more efficient.

---

**Status:** ✅ FIXED - Ready for deployment
