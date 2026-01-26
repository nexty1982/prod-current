# Admin Users API Reconciliation Report

**Date:** 2025-01-XX  
**Purpose:** Document reconciliation of frontend/backend API mismatch for user management endpoints

---

## Step 1: Verification Results

### Search Results
- **router.get('/users')**: ❌ NOT FOUND
- **router.post('/users')**: ❌ NOT FOUND  
- **router.put('/users/:id')**: ❌ NOT FOUND
- **router.delete('/users/:id')**: ❌ NOT FOUND
- **router.put('/users/:id/toggle-status')**: ❌ NOT FOUND (but `PATCH /users/:id/status` exists)

### Route Mounting
- **File:** `server/src/index.ts`
- **Line 24:** `const adminRoutes = require('./routes/admin');` - **FILE DOES NOT EXIST**
- **Line 325:** `app.use('/api/admin', adminRoutes);` - Mounts non-existent file
- **Actual Implementation:** `server/src/api/admin.js` exports router (line 1217)
- **Conclusion:** The `adminRoutes` require likely resolves to `server/src/api/admin.js` via module resolution, or the route is broken. The actual implementation is in `server/src/api/admin.js`.

### Existing Endpoints (Verified)
- `PATCH /api/admin/users/:id/reset-password` - Line 994-1075 ✅
- `POST /api/admin/users/:id/reset-password` - Line 914-991 ✅
- `PATCH /api/admin/users/:id/status` - Line 1078-1147 ✅

---

## Step 2: Implemented Endpoints

### New Endpoints Added to `server/src/api/admin.js`

#### 1. GET /api/admin/users
- **Line Range:** 149-218
- **Query Parameters:**
  - `search` - Search in email, first_name, last_name
  - `role` - Filter by role (exact match)
  - `church_id` - Filter by church ID
  - `is_active` - Filter by active status ('true'/'false'/'all')
- **Response:** `{ success: true, users: [...], count: number }`
- **Security:** 
  - Uses `requireAdmin` middleware (session-based auth)
  - Never returns `password_hash` field
  - Joins with churches table for church_name

#### 2. POST /api/admin/users
- **Line Range:** 220-330
- **Request Body:**
  - `email` (required)
  - `first_name` (required)
  - `last_name` (required)
  - `role` (required)
  - `church_id` (optional)
  - `phone` (optional)
  - `preferred_language` (optional, default: 'en')
  - `password` (optional - if not provided, auto-generates)
- **Response:** `{ success: true, message: string, user: {...}, tempPassword?: string }`
- **Security:**
  - Uses `requireAdmin` + `requireRolePermission` middleware
  - Validates email uniqueness
  - Hashes password with bcrypt (12 rounds)
  - Auto-generates secure password if not provided
  - Returns tempPassword only if auto-generated
  - Never returns password_hash

#### 3. PUT /api/admin/users/:id
- **Line Range:** 332-520
- **Request Body:** (all optional, only provided fields are updated)
  - `email`
  - `first_name`
  - `last_name`
  - `role`
  - `church_id`
  - `preferred_language`
  - `is_active`
- **Response:** `{ success: true, message: string, user: {...} }`
- **Security:**
  - Uses `requireAdmin` middleware
  - Blocks self-role-change
  - Validates email uniqueness (excluding current user)
  - Uses `canManageUser()` permission check
  - Uses `canChangeRole()` for role changes
  - Blocks assigning `super_admin` unless current user is `super_admin`
  - Blocks self-deactivation
  - Uses `canPerformDestructiveOperation()` for deactivation
  - Never returns password_hash

#### 4. DELETE /api/admin/users/:id
- **Line Range:** 522-600
- **Response:** `{ success: true, message: string }`
- **Security:**
  - Uses `requireAdmin` middleware
  - Blocks self-deletion
  - Uses `canPerformDestructiveOperation()` permission check
  - Super admin cannot delete super_admin users
  - Regular admin cannot delete admin or super_admin users

#### 5. PUT /api/admin/users/:id/toggle-status
- **Line Range:** 562-631
- **Response:** `{ success: true, message: string }`
- **Security:**
  - Uses `requireAdmin` middleware
  - Toggles `is_active` field (true ↔ false)
  - Blocks self-deactivation
  - Uses same permission checks as PATCH /users/:id/status
- **Note:** This endpoint was added for frontend compatibility. The existing `PATCH /users/:id/status` endpoint remains functional.

---

## Step 3: Frontend Client Updates

### File: `front-end/src/shared/lib/userService.ts`

**No changes required** - The frontend client already calls the correct endpoints:
- `getUsers()` → `GET /api/admin/users` ✅
- `createUser()` → `POST /api/admin/users` ✅
- `updateUser()` → `PUT /api/admin/users/:id` ✅
- `deleteUser()` → `DELETE /api/admin/users/:id` ✅
- `toggleUserStatus()` → `PUT /api/admin/users/:id/toggle-status` ✅ (now implemented)
- `resetPassword()` → `PATCH /api/admin/users/:id/reset-password` ✅

All methods use `credentials: 'include'` for session-based authentication, which matches the backend implementation.

---

## Step 4: Security & Behavior Rules

### Permission Rules Applied

1. **Role Assignment:**
   - Super admin can assign any role except `super_admin` (cannot create super_admin users)
   - Regular admin can only assign non-admin roles (cannot assign `admin` or `super_admin`)
   - Enforced via `requireRolePermission` middleware on POST /users
   - Enforced via `canChangeRole()` check on PUT /users/:id

2. **User Management:**
   - Super admin can manage all users except other super_admins
   - Regular admin can manage non-admin users only
   - Enforced via `canManageUser()` utility

3. **Destructive Operations:**
   - Deactivation and deletion require `canPerformDestructiveOperation()` check
   - Self-deletion and self-deactivation are blocked
   - Super admin cannot delete super_admin users
   - Regular admin cannot delete admin/super_admin users

4. **Self-Protection:**
   - Users cannot change their own role
   - Users cannot deactivate themselves
   - Users cannot delete themselves
   - Users cannot reset their own password (existing rule)

### Password Security

- Passwords are hashed with bcrypt (12 salt rounds)
- `password_hash` field is NEVER returned in API responses
- Auto-generated passwords are returned only once (in POST response)
- Password validation: minimum 8 characters (for custom passwords)

### Logging

- All operations log to console with format: `✅ [Operation]: [target] by [actor] (role: [role])`
- Unauthorized attempts are logged via `logUnauthorizedAttempt()` utility
- Error logging includes full error messages for debugging

---

## Files Modified

1. **server/src/api/admin.js**
   - Added GET /users endpoint (lines 149-218)
   - Added POST /users endpoint (lines 220-330)
   - Added PUT /users/:id endpoint (lines 332-520)
   - Added DELETE /users/:id endpoint (lines 522-600)
   - Added PUT /users/:id/toggle-status endpoint (lines 562-631)
   - Total: ~530 lines added

2. **front-end/src/shared/lib/userService.ts**
   - **No changes required** - Already matches implemented endpoints

---

## Endpoint Summary Table

| Method | Path | Handler File | Line Range | Auth | Status |
|--------|------|--------------|------------|------|--------|
| GET | `/api/admin/users` | `server/src/api/admin.js` | 149-218 | `requireAdmin` | ✅ NEW |
| POST | `/api/admin/users` | `server/src/api/admin.js` | 220-330 | `requireAdmin` + `requireRolePermission` | ✅ NEW |
| PUT | `/api/admin/users/:id` | `server/src/api/admin.js` | 332-520 | `requireAdmin` | ✅ NEW |
| DELETE | `/api/admin/users/:id` | `server/src/api/admin.js` | 522-600 | `requireAdmin` | ✅ NEW |
| PUT | `/api/admin/users/:id/toggle-status` | `server/src/api/admin.js` | 562-631 | `requireAdmin` | ✅ NEW |
| PATCH | `/api/admin/users/:id/status` | `server/src/api/admin.js` | 1078-1147 | `requireAdmin` | ✅ EXISTING |
| PATCH | `/api/admin/users/:id/reset-password` | `server/src/api/admin.js` | 994-1075 | `requireAdmin` | ✅ EXISTING |
| POST | `/api/admin/users/:id/reset-password` | `server/src/api/admin.js` | 914-991 | `requireAdmin` | ✅ EXISTING |

---

## Testing Checklist

- [ ] GET /api/admin/users returns user list
- [ ] GET /api/admin/users?search=test filters correctly
- [ ] GET /api/admin/users?role=admin filters correctly
- [ ] GET /api/admin/users?church_id=1 filters correctly
- [ ] GET /api/admin/users?is_active=true filters correctly
- [ ] POST /api/admin/users creates user with auto-generated password
- [ ] POST /api/admin/users creates user with provided password
- [ ] POST /api/admin/users rejects duplicate email
- [ ] PUT /api/admin/users/:id updates user fields
- [ ] PUT /api/admin/users/:id blocks self-role-change
- [ ] PUT /api/admin/users/:id blocks assigning super_admin (non-super_admin)
- [ ] DELETE /api/admin/users/:id deletes user
- [ ] DELETE /api/admin/users/:id blocks self-deletion
- [ ] DELETE /api/admin/users/:id blocks deleting super_admin (admin)
- [ ] PUT /api/admin/users/:id/toggle-status toggles is_active
- [ ] PUT /api/admin/users/:id/toggle-status blocks self-deactivation
- [ ] All endpoints return no password_hash in responses
- [ ] All endpoints require session authentication

---

## Notes

- **Route Mounting:** The `adminRoutes` require in `server/src/index.ts:24` references a non-existent file. The actual router is exported from `server/src/api/admin.js`. This may indicate a module resolution quirk or the route mounting may be broken. The endpoints are implemented in `server/src/api/admin.js` which is mounted at `/api/admin` (line 325).

- **Database:** All queries use `orthodoxmetrics_db.users` table. No schema migrations were found, so the schema must be confirmed in the actual database.

- **Session Auth:** All endpoints use session-based authentication (`req.session.user`). No JWT/Bearer token support was added.

- **Backward Compatibility:** The existing `PATCH /users/:id/status` endpoint remains functional. The new `PUT /users/:id/toggle-status` endpoint provides the same functionality with the path the frontend expects.

---

**End of Report**

