# Superadmin Church Context Resolution

## Problem Statement

Superadmin users cannot view Records pages (`/apps/records/baptism`, `/apps/records/marriage`, `/apps/records/funeral`) because they receive "No church available" errors. This occurs because:

1. Superadmin users don't have a `church_id` in their user object (they can access all churches)
2. Records pages require a `church_id` to fetch records
3. The `/api/my/churches` endpoint may return empty array or 400 error for superadmin
4. Frontend doesn't auto-select a default church for superadmin

## Current Implementation

### Backend: `/api/my/churches` (server/src/api/churches.js)

**Location**: Lines 63-162

**Current Behavior**:
- For `super_admin`: Returns all active churches (no WHERE clause restriction)
- For `admin`/`manager`/`priest`: Returns only their assigned church
- Returns empty array if user has no church assignment (non-superadmin)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "churches": [
      {
        "id": 46,
        "name": "Church Name",
        "email": "church@example.com",
        "database_name": "om_church_46",
        "is_active": 1
      }
    ]
  },
  "meta": {
    "total": 1,
    "user_role": "super_admin"
  }
}
```

### Frontend: Records Pages

**Locations**:
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` (lines 84-107)
- `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx` (lines 88-107)
- Similar logic in funeral records page

**Current Behavior**:
1. Gets `churchId` from URL params or `user.church_id`
2. If no `churchId` and user is `super_admin` or `admin`:
   - Calls `/api/my/churches`
   - Tries to use first church from response
   - If no churches found, shows error: "No church available. Please ensure you have access to at least one church."
3. If no `effectiveChurchId` after all attempts, shows error and stops loading

**Issue**: The error message is shown even for superadmin when churches exist but aren't auto-selected properly.

## Solution

### Phase 1: Backend Fix

Ensure `/api/my/churches` always returns churches for superadmin:
- If superadmin role: Return all active churches (already implemented)
- Never return 400 for superadmin
- Ensure response format is consistent

### Phase 2: Frontend Auto-Resolution

1. **Auto-select first church for superadmin**:
   - When superadmin has no `church_id` selected
   - Fetch churches from `/api/my/churches`
   - Auto-select first church if available
   - Update URL params with selected church
   - Re-fetch records automatically

2. **Improved error handling**:
   - For superadmin: Show "Select a church to view records" instead of hard error
   - Only show hard error for non-superadmin users with zero churches
   - Add church picker modal for superadmin if needed

### Phase 3: Records Page Gating

Replace hard error with:
- **Superadmin**: "Select a church to view records" (with church picker)
- **Non-superadmin with zero churches**: "No church available" (hard error)

## Files Modified

1. `server/src/api/churches.js` - Ensure superadmin always gets churches
2. `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` - Auto-resolve church
3. `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx` - Auto-resolve church
4. `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx` - Auto-resolve church

## Testing

1. Log in as superadmin
2. Visit `/apps/records/baptism` (without `church_id` param)
3. Verify:
   - No "No church available" error
   - Records load automatically after church auto-selection
   - URL updates with `church_id` param
4. Test other record types (marriage, funeral)
5. Verify OCR and other tools still accept explicit `church_id` param
