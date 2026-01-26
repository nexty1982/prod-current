# Priest Role OCR Workbench Fix

## Problem
Priest role users were getting 403 errors on `GET /api/churches` (requires admin/super_admin/manager), which broke the OCR workbench church selection UI.

## Solution

### Backend Changes

**New Endpoint: `GET /api/my/churches`**
- **File**: `server/src/api/churches.js`
- **Auth**: Required (all authenticated users)
- **Allowed Roles**: `priest`, `admin`, `manager`, `super_admin`, `church_admin`
- **Response**: Returns churches the user has access to based on their `church_id`
  - Super admins: All active churches
  - Admins/Managers/Priests: Their assigned church (from `user.church_id`)
  - Other roles: Empty array

**Query Logic**:
```sql
SELECT id, name, email, database_name, is_active
FROM churches
WHERE is_active = 1
  AND (id = ? OR user.role = 'super_admin')
ORDER BY name ASC
```

**Route Mounting**: 
- Mounted at both `/api/churches` and `/api/my` in `server/src/index.ts`
- Route handler: `router.get('/my/churches', ...)`
- Full path: `/api/my/churches`

### Frontend Changes

**File**: `front-end/src/features/devel-tools/om-ocr/EnhancedOCRUploader.tsx`

**Load Order**:
1. **First**: Try `GET /api/my/churches` (works for all roles including priest)
2. **Fallback**: If 404 or empty, and user is admin/manager/super_admin, try `GET /api/churches`
3. **403 Handling**: If `/api/churches` returns 403, use user's `church_id` directly
4. **Last Resort**: If user has `church_id`, create minimal church object and proceed

**Removed**: Static fallback that hardcoded church list (was masking the bug)

## Validation Checklist

- [x] Login as priest role
- [x] Confirm no 403 spam in console for `/api/churches`
- [x] Confirm `/api/my/churches` returns user's church
- [x] Confirm OCR jobs load via `/api/church/{id}/ocr/jobs`
- [x] Confirm workbench flow works end-to-end
- [x] Login as admin: ensure global church listing still works via `/api/churches`

## Files Changed

### Backend
1. `server/src/api/churches.js` - Added `GET /api/my/churches` endpoint
2. `server/src/index.ts` - Mounted churches router at `/api/my`

### Frontend
1. `front-end/src/features/devel-tools/om-ocr/EnhancedOCRUploader.tsx` - Updated church loading logic

## Testing

### As Priest User:
```bash
# Should return 200 with user's church
curl -X GET http://localhost:3001/api/my/churches \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"

# Should return 403 (expected)
curl -X GET http://localhost:3001/api/churches \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"
```

### As Admin User:
```bash
# Should return 200 with all churches
curl -X GET http://localhost:3001/api/churches \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"

# Should also work
curl -X GET http://localhost:3001/api/my/churches \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"
```

## Expected Console Output

**Priest User (Success)**:
```
✅ Loaded 1 churches from /api/my/churches
```

**Priest User (No 403 errors)**:
- No "Failed to load churches" errors
- No 403 errors in console
- Church dropdown populated with user's church

**Admin User (Still Works)**:
```
✅ Loaded X churches from /api/churches (admin fallback)
```

