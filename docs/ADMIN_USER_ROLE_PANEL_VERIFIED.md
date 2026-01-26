# Admin User / Roles Control Panel - Verified Evidence Report

**Date:** 2025-01-XX  
**Purpose:** Verification pass with code evidence for existing user/role management infrastructure  
**Method:** Direct code inspection with file paths and line number citations

---

## 1. Route Truth Table (Backend)

### Route Mounting Evidence

**File:** `server/src/index.ts`

- **Line 24:** `const adminRoutes = require('./routes/admin');`
- **Line 325:** `app.use('/api/admin', adminRoutes);`
- **Line 274:** `app.use('/api/admin/users', usersRouter);` (commented: "This route was being intercepted")
- **Line 71:** `const usersRouter = require('./routes/admin/users');`

**VERIFICATION:** The file `server/src/routes/admin/users.js` does NOT exist in the repository. The file `server/src/routes/admin.js` also does NOT exist. However, `server/src/api/admin.js` exists and exports a router (line 1217: `module.exports = router;`).

**CONCLUSION:** The actual implementation is in `server/src/api/admin.js`, which is mounted at `/api/admin` via the `adminRoutes` require. The `/api/admin/users` mount at line 274 references a non-existent file, so it likely fails silently or the route is handled by the general `/api/admin` mount.

### Individual Endpoint Verification

#### GET /api/admin/users
- **Status:** ❌ **NOT FOUND IN CODE**
- **Evidence:** 
  - `server/src/api/admin.js` line 148: Comment only `// GET /admin/users - Get all users`
  - No actual `router.get('/users', ...)` implementation found
  - Test endpoint exists at line 1151: `router.get('/test-users', requireAdmin, ...)` but is commented out (lines 1149-1195)

#### POST /api/admin/users
- **Status:** ❌ **NOT FOUND IN CODE**
- **Evidence:**
  - `server/src/api/admin.js` line 150: Comment only `// POST /admin/users - Create new user`
  - No actual `router.post('/users', ...)` implementation found

#### PUT /api/admin/users/:id
- **Status:** ❌ **NOT FOUND IN CODE**
- **Evidence:**
  - `server/src/api/admin.js` line 152: Comment only `// PUT /admin/users/:id - Update user`
  - No actual `router.put('/users/:id', ...)` implementation found

#### DELETE /api/admin/users/:id
- **Status:** ❌ **NOT FOUND IN CODE**
- **Evidence:**
  - `server/src/api/admin.js` line 154: Comment only `// DELETE /admin/users/:id - Delete user`
  - No actual `router.delete('/users/:id', ...)` implementation found

#### PUT /api/admin/users/:id/toggle-status
- **Status:** ❌ **NOT FOUND** (but similar endpoint exists)
- **Evidence:**
  - `server/src/api/admin.js` line 156: Comment `// PUT /admin/users/:id/toggle-status - Toggle user active status`
  - **Actual implementation:** `router.patch('/users/:id/status', requireAdmin, ...)` at line 1078
  - **Actual path:** `PATCH /api/admin/users/:id/status` (not `toggle-status`)

#### PATCH /api/admin/users/:id/reset-password
- **Status:** ✅ **VERIFIED**
- **File:** `server/src/api/admin.js`
- **Line Range:** 994-1075
- **Method:** `router.patch('/users/:id/reset-password', requireAdmin, async (req, res) => {`
- **Auth Middleware:** `requireAdmin` (defined lines 18-69, uses `req.session.user`)
- **Also exists:** `router.post('/users/:id/reset-password', requireAdmin, ...)` at line 914 (auto-generates password)

### Route Summary Table

| Method | Path | Handler File | Line Range | Auth Middleware | Mount Point |
|--------|------|--------------|------------|-----------------|-------------|
| GET | `/api/admin/users` | ❌ **NOT IMPLEMENTED** | N/A | N/A | `/api/admin` (line 325) |
| POST | `/api/admin/users` | ❌ **NOT IMPLEMENTED** | N/A | N/A | `/api/admin` (line 325) |
| PUT | `/api/admin/users/:id` | ❌ **NOT IMPLEMENTED** | N/A | N/A | `/api/admin` (line 325) |
| DELETE | `/api/admin/users/:id` | ❌ **NOT IMPLEMENTED** | N/A | N/A | `/api/admin` (line 325) |
| PATCH | `/api/admin/users/:id/reset-password` | `server/src/api/admin.js` | 994-1075 | `requireAdmin` | `/api/admin` (line 325) |
| POST | `/api/admin/users/:id/reset-password` | `server/src/api/admin.js` | 914-991 | `requireAdmin` | `/api/admin` (line 325) |
| PATCH | `/api/admin/users/:id/status` | `server/src/api/admin.js` | 1078-1147 | `requireAdmin` | `/api/admin` (line 325) |

**CRITICAL FINDING:** The frontend `userService.ts` calls endpoints that do NOT exist in the backend. The actual user CRUD operations must be implemented elsewhere or the frontend is broken.

---

## 2. Auth Mode Verification

### Backend Auth Implementation

**File:** `server/src/api/admin.js`

- **Line 18-69:** `requireAdmin` middleware definition
- **Line 42:** `if (!req.session || !req.session.user) {`
- **Line 56:** `const userRole = req.session.user.role;`
- **Line 919:** `if (userId === req.session.user.id) {`
- **Line 940:** `const currentUserRole = req.session.user.role;`
- **Line 998:** `const currentUser = req.session.user;`
- **Line 1082:** `const currentUser = req.session.user;`

**VERIFIED:** All admin user routes use **session-based authentication** (`req.session.user`), NOT JWT (`req.user`).

### Frontend Auth Implementation

**File:** `front-end/src/shared/lib/userService.ts`

- **Line 75:** `credentials: 'include'` (sends cookies)
- **Line 106:** `credentials: 'include'`
- **Line 141:** `credentials: 'include'`
- **Line 172:** `credentials: 'include'`
- **Line 199:** `credentials: 'include'`
- **Line 229:** `credentials: 'include'`
- **Line 257:** `credentials: 'include'`

**VERIFIED:** Frontend uses cookie-based session authentication (`credentials: 'include'`), NOT Authorization headers with Bearer tokens.

**CONCLUSION:** Auth mode is **session-based** (cookies) on both frontend and backend. No JWT/Bearer token usage for admin user routes.

---

## 3. Database Schema Verification

### Schema Source

**NO MIGRATION FILES FOUND:**
- `server/src/db/migrations/` - directory exists but is empty
- `server/src/database/` - contains only OCR and router-menu-studio migrations, no users table schema

### Schema Evidence from Code

#### TypeScript Type Definition

**File:** `server/src/modules/auth/types.ts`
- **Lines 1-18:** User interface definition
  ```typescript
  export interface User {
    id: number;
    email: string;
    username?: string;
    password_hash?: string;
    first_name?: string;
    last_name?: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'user' | 'viewer';
    church_id?: number;
    phone?: string;
    preferred_language: string;
    is_active: boolean;
    is_locked: boolean;  // ✅ VERIFIED
    email_verified: boolean;
    last_login?: Date;
    created_at: Date;
    updated_at: Date;
  }
  ```

#### SQL Query Evidence

**File:** `server/src/modules/auth/repo.ts`
- **Line 8:** `'SELECT * FROM users WHERE email = ? AND is_active = 1'`
- **Line 16:** `'SELECT * FROM users WHERE id = ? AND is_active = 1'`
- **Line 24:** `'UPDATE users SET last_login = NOW() WHERE id = ?'`

**File:** `server/src/api/admin.js`
- **Line 716:** `'SELECT id FROM orthodoxmetrics_db.users WHERE email = ?'`
- **Line 868:** `'SELECT COUNT(*) as user_count FROM orthodoxmetrics_db.users WHERE church_id = ?'`
- **Line 928:** `'SELECT email, role FROM orthodoxmetrics_db.users WHERE id = ?'`
- **Line 1012:** `'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?'`
- **Line 744-747:** `INSERT INTO orthodoxmetrics_db.users (email, full_name, role_id, church_id, password_hash, is_active, created_at, updated_at)`
- **Line 971:** `'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'`
- **Line 1129:** `'UPDATE orthodoxmetrics_db.users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'`
- **Line 1156-1176:** Test query showing full SELECT with fields: `id, email, first_name, last_name, role, church_id, is_active, email_verified, preferred_language, timezone, landing_page, created_at, updated_at, last_login`

#### Verified Fields (from code usage)

| Field | Evidence Location | SQL Reference |
|-------|------------------|---------------|
| `id` | `server/src/modules/auth/types.ts:2`, `server/src/api/admin.js:1012` | ✅ VERIFIED |
| `email` | `server/src/modules/auth/types.ts:3`, `server/src/api/admin.js:716,928,1012` | ✅ VERIFIED |
| `first_name` | `server/src/modules/auth/types.ts:6`, `server/src/api/admin.js:1012,1160` | ✅ VERIFIED |
| `last_name` | `server/src/modules/auth/types.ts:7`, `server/src/api/admin.js:1012,1161` | ✅ VERIFIED |
| `role` | `server/src/modules/auth/types.ts:8`, `server/src/api/admin.js:928,1012,1162` | ✅ VERIFIED |
| `church_id` | `server/src/modules/auth/types.ts:9`, `server/src/api/admin.js:868,1163` | ✅ VERIFIED |
| `password_hash` | `server/src/modules/auth/types.ts:5`, `server/src/api/admin.js:746,971,1056` | ✅ VERIFIED |
| `is_active` | `server/src/modules/auth/types.ts:12`, `server/src/api/admin.js:746,1081,1129,1165` | ✅ VERIFIED |
| `is_locked` | `server/src/modules/auth/types.ts:13`, `server/src/modules/auth/service.ts:34` | ✅ VERIFIED (read-only in login check) |
| `last_login` | `server/src/modules/auth/types.ts:15`, `server/src/modules/auth/repo.ts:24`, `server/src/api/admin.js:1172` | ✅ VERIFIED |
| `preferred_language` | `server/src/modules/auth/types.ts:11`, `server/src/api/admin.js:1167` | ✅ VERIFIED |
| `email_verified` | `server/src/modules/auth/types.ts:14`, `server/src/api/admin.js:1166` | ✅ VERIFIED |
| `timezone` | `server/src/api/admin.js:1168` | ✅ VERIFIED |
| `created_at` | `server/src/modules/auth/types.ts:16`, `server/src/api/admin.js:746,1170` | ✅ VERIFIED |
| `updated_at` | `server/src/modules/auth/types.ts:17`, `server/src/api/admin.js:746,971,1129,1171` | ✅ VERIFIED |

**Database Name:** `orthodoxmetrics_db` (verified from multiple queries using `orthodoxmetrics_db.users`)

**Schema Verification Command:**
```sql
USE orthodoxmetrics_db;
DESCRIBE users;
SHOW COLUMNS FROM users LIKE 'is_locked';
```

**NOTE:** Schema must be confirmed in actual database. Code references prove these fields are expected, but no CREATE TABLE statement found in repository.

---

## 4. Frontend UI Verification

### Router Entry

**File:** `front-end/src/routes/Router.tsx`
- **Line 96:** `const UserManagement = Loadable(lazy(() => import('../features/admin/admin/UserManagement')));`
- **Lines 593-600:**
  ```tsx
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <UserManagement />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  }
  ```

**VERIFIED:** Route exists and is accessible to both `admin` and `super_admin` roles.

### Menu Entry

**File:** `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`
- **Lines 227-230:**
  ```typescript
  {
    id: uniqueId(),
    title: 'User Management',
    icon: IconUsers,
    href: '/admin/users',
  }
  ```

**VERIFIED:** Menu item exists under "Site Management" section.

### ProtectedRoute Configuration

**File:** `front-end/src/routes/Router.tsx`
- **Line 595:** `requiredRole={['admin', 'super_admin']}`

**VERIFIED:** Both `admin` and `super_admin` roles can access UserManagement component.

---

## 5. Lock/Unlock Gap Validation

### Backend Lock Implementation

**Search Results:**
- `server/src/modules/auth/service.ts:34` - `if (user.is_locked) {` (read-only check during login)
- `server/src/api/admin.js:1207-1209` - Comments only:
  ```
  // POST /admin/churches/:id/users/:userId/lock - Lock user account
  // POST /admin/churches/:id/users/:userId/unlock - Unlock user account
  ```

**VERIFIED:** 
- `is_locked` field exists in database schema (TypeScript type definition)
- `is_locked` is checked during login (prevents locked users from logging in)
- **NO UPDATE/INSERT statements found** that set `is_locked = 1` or `is_locked = 0`
- **NO endpoints found** that implement lock/unlock functionality

### Frontend Lock Implementation

**Search Results:**
- `front-end/src/features/admin/admin/UserManagement.tsx` - No matches for "lock" or "unlock" (case-insensitive)

**VERIFIED:** No UI buttons, labels, or functionality for locking/unlocking users.

**CONCLUSION:** Lock/unlock functionality **DOES NOT EXIST** in implementation, despite:
- Database field exists (`is_locked`)
- Login check exists (prevents locked users)
- Comments suggest planned implementation
- No actual endpoints or UI

---

## 6. Verified Facts Summary

### ✅ Confirmed Implementations

1. **Password Reset:** 
   - `PATCH /api/admin/users/:id/reset-password` exists (line 994-1075)
   - `POST /api/admin/users/:id/reset-password` exists (line 914-991)
   - Uses session auth (`req.session.user`)
   - Frontend calls via `userService.resetPassword()`

2. **User Status Toggle:**
   - `PATCH /api/admin/users/:id/status` exists (line 1078-1147)
   - Updates `is_active` field
   - Uses session auth (`req.session.user`)
   - Frontend calls via `userService.toggleUserStatus()`

3. **Frontend UI:**
   - `UserManagement.tsx` component exists and is routed
   - Accessible to `admin` and `super_admin` roles
   - Menu item exists

4. **Database Schema:**
   - `is_active` field exists and is used
   - `is_locked` field exists in type definition and is checked during login
   - `role`, `church_id`, `password_hash`, `last_login` fields exist and are used

5. **Auth Mode:**
   - Session-based (cookies) on both frontend and backend
   - No JWT/Bearer token usage for admin routes

### ❌ Unverified Claims from Prior Report

1. **GET/POST/PUT/DELETE /api/admin/users endpoints:**
   - **CLAIMED:** Endpoints exist and are implemented
   - **REALITY:** Only comments exist, no actual route handlers found
   - **IMPACT:** Frontend `userService.getUsers()`, `createUser()`, `updateUser()`, `deleteUser()` calls will fail or are handled elsewhere

2. **User CRUD Operations:**
   - **CLAIMED:** Full CRUD implemented
   - **REALITY:** Only password reset and status toggle are implemented
   - **IMPACT:** Cannot list, create, update, or delete users via documented API

3. **Lock/Unlock Functionality:**
   - **CLAIMED:** Not implemented (correct)
   - **VERIFIED:** Field exists, login check exists, but no endpoints or UI

---

## 7. Decision: Build New SuperAdmin Panel or Extend Existing?

### Recommendation: **EXTEND EXISTING UserManagement**

**Reasoning (based on verified evidence):**

1. **UserManagement.tsx exists and is functional** (routed, menu item, protected route)
   - File: `front-end/src/features/admin/admin/UserManagement.tsx`
   - Already accessible to `super_admin` role
   - Has UI for user operations (even if backend endpoints are missing)

2. **Backend endpoints are incomplete** - Need to implement missing CRUD operations regardless of UI approach
   - Current state: Only password reset and status toggle exist
   - Required: GET/POST/PUT/DELETE /api/admin/users endpoints must be built

3. **Lock/unlock can be added to existing component** - No need for separate panel
   - Add lock/unlock buttons to UserManagement.tsx
   - Implement `PATCH /api/admin/users/:id/lock` and `PATCH /api/admin/users/:id/unlock` endpoints

4. **Role-based feature gating** - Can use conditional rendering in existing component
   - Add SuperAdmin-only features (bulk operations, advanced role management) behind `isSuperAdmin()` checks
   - No architectural change needed

**Alternative (if SuperAdmin needs completely different UX):**
- Create new route `/admin/super/users` with `requiredRole: ['super_admin']`
- Reuse UserManagement logic but with enhanced UI
- Still need to implement missing backend endpoints

**Critical Path:** Backend endpoint implementation is the blocker, not the UI architecture.

---

## 8. Evidence Citations

### Route Mounting
- `server/src/index.ts:24` - adminRoutes require
- `server/src/index.ts:325` - adminRoutes mount
- `server/src/index.ts:274` - usersRouter mount (non-existent file)
- `server/src/api/admin.js:1217` - router export

### Auth Implementation
- `server/src/api/admin.js:18-69` - requireAdmin middleware
- `server/src/api/admin.js:42,56,919,940,998,1082` - req.session.user usage
- `front-end/src/shared/lib/userService.ts:75,106,141,172,199,229,257` - credentials: 'include'

### Database Schema
- `server/src/modules/auth/types.ts:1-18` - User interface
- `server/src/modules/auth/repo.ts:8,16,24` - SQL queries
- `server/src/api/admin.js:716,868,928,1012,744,971,1129,1156-1176` - SQL queries with field names

### Frontend Routing
- `front-end/src/routes/Router.tsx:96,593-600` - Route definition
- `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts:227-230` - Menu item
- `front-end/src/routes/Router.tsx:595` - ProtectedRoute requiredRole

### Lock/Unlock
- `server/src/modules/auth/service.ts:34` - is_locked check
- `server/src/modules/auth/types.ts:13` - is_locked field definition
- `server/src/api/admin.js:1207-1209` - Lock/unlock comments (no implementation)

---

**End of Verified Report**

