# Admin User / Roles Control Panel - Discovery Report

**Date:** 2025-01-XX  
**Purpose:** Inventory existing user/role management infrastructure to inform SuperAdmin control panel design  
**Scope:** Frontend components, backend routes, database schemas, and authentication/authorization flows

---

## Executive Summary

- **Existing User Management UI:** `UserManagement.tsx` component exists at `/admin/users` route with full CRUD operations, password reset, and role assignment capabilities
- **Access Control Dashboard:** Tabbed interface (`AccessControlDashboard.tsx`) consolidates User Management, Role Management, Session Management, and Menu Management
- **Backend API:** `/api/admin/users` endpoints exist for all user operations (GET, POST, PUT, DELETE, PATCH for password reset, PUT for toggle status)
- **Role System:** Hierarchical role system with 8 canonical roles (super_admin > admin > church_admin > priest > deacon > editor > viewer > guest) defined in `utils/roles.ts`
- **Authentication:** Dual auth system - session-based (legacy) and JWT-based (new) with `requireAuth` middleware
- **Database:** Single `users` table in `orthodoxmetrics_db` with `is_active` flag for enable/disable, `is_locked` field for account locking
- **Password Reset:** Admin-triggered password reset exists via `PATCH /api/admin/users/:id/reset-password` endpoint
- **Role Assignment:** Role assignment/revocation handled through user update endpoint with permission checks via `canChangeRole` utility
- **Gaps:** No dedicated SuperAdmin-only control panel; existing UI is accessible to both `admin` and `super_admin` roles; no bulk operations; limited role management UI (mock data only)

---

## Frontend Inventory

### User Management Components

#### Active Components (Currently Used)

1. **`front-end/src/features/admin/admin/UserManagement.tsx`**
   - **Purpose:** Main user management interface with full CRUD operations
   - **Route:** `/admin/users` (via Router.tsx)
   - **Menu Location:** Site Management → User Management (MenuItems.ts line 227-230)
   - **Features:**
     - List all users with pagination, search, and filters (role, church, active status)
     - Create new users with role assignment and church assignment
     - Edit user details (email, name, role, church, language)
     - Delete users (with permission checks)
     - Reset user passwords (admin-triggered, auto-generates or accepts new password)
     - Toggle user active status (`is_active` field)
     - View user details in modal
   - **API Client:** Uses `userService` from `shared/lib/userService.ts`
   - **Permissions:** Uses `useAuth` hook with `canManageUser`, `canChangeRole`, `canPerformDestructiveOperation`
   - **Status:** ✅ **ACTIVELY USED**

2. **`front-end/src/features/admin/admin/AccessControlDashboard.tsx`**
   - **Purpose:** Tabbed dashboard consolidating access control features
   - **Route:** Not directly routed (appears to be wrapper component)
   - **Tabs:**
     - Role Management (tab 0)
     - User & Access Management (tab 1) - embeds UserManagement
     - Session Management (tab 2)
     - Menu Management (tab 3)
   - **Status:** ✅ **ACTIVELY USED** (wraps UserManagement)

3. **`front-end/src/features/admin/admin/tabs/RoleManagement.tsx`**
   - **Purpose:** Role management interface
   - **Features:** Displays roles with permissions, user counts, active/inactive status
   - **Data:** Currently uses **mock data** (mockRoles array)
   - **Status:** ⚠️ **PARTIALLY IMPLEMENTED** (UI exists but no backend integration)

4. **`front-end/src/components/UserFormModal.tsx`**
   - **Purpose:** Reusable modal for creating/editing users
   - **Used By:** UserManagement.tsx
   - **Status:** ✅ **ACTIVELY USED**

#### Legacy/Unused Components

- `front-end/src/legacy/features/admin/admin/UserManagement*.tsx` (multiple variants: Fixed, Enhanced, Broken)
- `front-end/src/features/admin/admin/UserManagement-Fixed.tsx`
- `front-end/src/features/admin/admin/UserManagement-Broken.tsx`
- `front-end/src/features/admin/admin/UserManagement_Enhanced.tsx`
- **Status:** ❌ **NOT USED** (legacy files)

### Authentication & Authorization Components

1. **`front-end/src/context/AuthContext.tsx`**
   - **Purpose:** Global authentication context provider
   - **Key Functions:**
     - `hasRole(role)` - Check if user has required role
     - `canManageUser(targetUser)` - Check if current user can manage target user
     - `canChangeRole(targetUser, newRole)` - Check if user can assign role
     - `canPerformDestructiveOperation(targetUser)` - Check if user can delete/disable
     - `isSuperAdmin()` - Check if user is super_admin
     - `canManageAllUsers()` - Check if user can manage all users
   - **Status:** ✅ **ACTIVELY USED** (core auth system)

2. **`front-end/src/components/auth/ProtectedRoute.tsx`**
   - **Purpose:** Route guard component for role-based access control
   - **Features:** Checks `requiredRole` and `requiredPermission` props
   - **Status:** ✅ **ACTIVELY USED**

3. **`front-end/src/utils/roles.ts`**
   - **Purpose:** Canonical role hierarchy and permission utilities
   - **Key Functions:**
     - `hasRole(user, role)` - Role hierarchy check
     - `hasAnyRole(user, roles[])` - Multiple role check
     - `getAssignableRoles(currentRole)` - Get roles user can assign
     - `canAssignRole(currentRole, targetRole)` - Check assignment permission
     - `canManageUser(currentUser, targetUser)` - User management permission
     - `canChangeRole(currentUser, targetUser, newRole)` - Role change permission
   - **Role Hierarchy:** super_admin (7) > admin (6) > church_admin (5) > priest (4) > deacon (3) > editor (2) > viewer (1) > guest (0)
   - **Status:** ✅ **ACTIVELY USED** (source of truth for roles)

### API Client Services

1. **`front-end/src/shared/lib/userService.ts`**
   - **Purpose:** Frontend API client for user management operations
   - **Base URL:** `/api/admin`
   - **Methods:**
     - `getUsers()` - GET `/api/admin/users`
     - `createUser(userData)` - POST `/api/admin/users`
     - `updateUser(userId, userData)` - PUT `/api/admin/users/:id`
     - `deleteUser(userId)` - DELETE `/api/admin/users/:id`
     - `toggleUserStatus(userId)` - PUT `/api/admin/users/:id/toggle-status`
     - `resetPassword(userId, passwordData?)` - PATCH `/api/admin/users/:id/reset-password`
     - `getChurches()` - GET `/api/admin/churches`
   - **Status:** ✅ **ACTIVELY USED**

2. **`front-end/src/shared/lib/authService.ts`**
   - **Purpose:** Authentication service (login, logout, refresh)
   - **Endpoints:**
     - `login()` - POST `/api/auth/login`
     - `logout()` - POST `/api/auth/logout`
     - `checkAuth()` - GET `/api/auth/verify`
     - `refresh()` - POST `/api/auth/refresh`
   - **Status:** ✅ **ACTIVELY USED**

### Routing

- **Router File:** `front-end/src/routes/Router.tsx`
- **UserManagement Route:** Line 597-600
  ```tsx
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <UserManagement />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  }
  ```

- **Menu Items:** `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`
  - Line 227-230: User Management menu item under "Site Management" section
  - Accessible to `super_admin` and `admin` roles

---

## Backend Inventory

### API Routes

#### Admin User Management Routes

**File:** `server/src/api/admin.js`  
**Base Path:** `/api/admin` (mounted in `server/src/index.ts` line 325)

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|---------------|-------------|
| GET | `/api/admin/users` | `router.get('/users', requireAdmin, ...)` | `admin` or `super_admin` | List all users |
| POST | `/api/admin/users` | `router.post('/users', requireAdmin, requireRolePermission, ...)` | `admin` or `super_admin` | Create new user |
| PUT | `/api/admin/users/:id` | `router.put('/users/:id', requireAdmin, ...)` | `admin` or `super_admin` | Update user |
| DELETE | `/api/admin/users/:id` | `router.delete('/users/:id', requireAdmin, ...)` | `admin` or `super_admin` | Delete user |
| PUT | `/api/admin/users/:id/toggle-status` | `router.put('/users/:id/toggle-status', requireAdmin, ...)` | `admin` or `super_admin` | Toggle `is_active` flag |
| PATCH | `/api/admin/users/:id/reset-password` | `router.patch('/users/:id/reset-password', requireAdmin, ...)` | `admin` or `super_admin` | Reset user password |

**Note:** There is also a separate route file at `server/src/routes/admin/users.js` (referenced in index.ts line 274) that may handle some user operations.

#### Authentication Routes

**File:** `server/src/routes/auth.ts`  
**Base Path:** `/api/auth` (mounted in `server/src/index.ts`)

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|---------------|-------------|
| POST | `/api/auth/login` | `router.post('/api/auth/login', ...)` | None | User login |
| POST | `/api/auth/logout` | `router.post('/api/auth/logout', requireAuth, ...)` | Yes | User logout |
| POST | `/api/auth/refresh` | `router.post('/api/auth/refresh', ...)` | None | Refresh access token |
| GET | `/api/auth/verify` | `router.get('/api/auth/verify', requireAuth, ...)` | Yes | Verify token validity |

### Middleware

1. **`server/src/middleware/requireAuth.ts`** (TypeScript)
   - **Purpose:** JWT-based authentication middleware (new system)
   - **Checks:** Authorization header with Bearer token
   - **Sets:** `req.user` with `{ userId, email, role, churchId }`
   - **Status:** ✅ **USED** for new JWT routes

2. **`server/src/middleware/auth.js`** (JavaScript)
   - **Purpose:** Session-based authentication middleware (legacy system)
   - **Functions:**
     - `requireAuth` - Check session exists
     - `requireRole(roles[])` - Check user has one of specified roles
   - **Status:** ✅ **USED** for legacy session-based routes

3. **`server/src/middleware/userAuthorization.js`**
   - **Purpose:** User management permission checks
   - **Functions:**
     - `canManageUser(currentUser, targetUser)`
     - `canPerformDestructiveOperation(currentUser, targetUser)`
     - `canChangeRole(currentUser, targetUser, newRole)`
     - `isRootSuperAdmin(user)`
   - **Status:** ✅ **USED** in admin.js routes

4. **`server/src/api/admin.js` - Custom Middleware:**
   - `requireAdmin` - Checks `req.session.user.role` is `admin` or `super_admin`
   - `requireSuperAdmin` - Checks role is `super_admin` only
   - `requireRolePermission` - Validates user can assign target role
   - **Status:** ✅ **USED** in admin routes

### Service Layer

1. **`server/src/modules/auth/service.ts`**
   - **Purpose:** Authentication service (JWT-based)
   - **Methods:**
     - `login(credentials, ipAddress, userAgent)` - Authenticate user
     - `refresh(refreshToken, ipAddress, userAgent)` - Refresh tokens
     - `logout(userId)` - Revoke all user tokens
     - `verifyAccessToken(token)` - Verify JWT token
   - **Status:** ✅ **USED** for JWT auth routes

2. **`server/src/modules/auth/repo.ts`**
   - **Purpose:** Database repository for auth operations
   - **Methods:**
     - `findUserByEmail(email)` - Query users table
     - `findUserById(id)` - Query users table
     - `updateLastLogin(userId)` - Update users.last_login
     - `saveRefreshToken(...)` - Insert into refresh_tokens
     - `findRefreshToken(tokenHash)` - Query refresh_tokens
     - `revokeRefreshToken(tokenId)` - Update refresh_tokens
     - `revokeAllUserTokens(userId)` - Bulk revoke tokens
   - **Status:** ✅ **USED** by AuthService

---

## Database / Schema Inventory

### Tables Referenced in Code

#### 1. `users` Table
**Database:** `orthodoxmetrics_db` (main application database)  
**Referenced In:**
- `server/src/modules/auth/repo.ts` (lines 7-19)
- `server/src/api/admin.js` (user CRUD operations)
- `server/src/api/users.js` (line 12: `SELECT * FROM orthodoxmetrics_db.users`)

**Inferred Schema (from code usage):**
```sql
users (
  id INT PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  role ENUM('super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor', 'viewer', 'guest'),
  church_id INT NULL,
  password_hash VARCHAR,
  is_active BOOLEAN DEFAULT 1,
  is_locked BOOLEAN DEFAULT 0,  -- Account lock status (from auth/service.ts line 34)
  preferred_language VARCHAR,
  phone VARCHAR,
  timezone VARCHAR,
  last_login DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  email_verified BOOLEAN
)
```

**Key Fields:**
- `is_active` - Used for enable/disable user (toggle via `/api/admin/users/:id/toggle-status`)
- `is_locked` - Used for account locking (checked in login flow, prevents login)
- `role` - Canonical role from hierarchy
- `church_id` - Church assignment (NULL for super_admin, required for others)

#### 2. `refresh_tokens` Table
**Database:** `orthodoxmetrics_db`  
**Referenced In:** `server/src/modules/auth/repo.ts`

**Inferred Schema:**
```sql
refresh_tokens (
  id INT PRIMARY KEY,
  user_id INT FOREIGN KEY REFERENCES users(id),
  token_hash VARCHAR,
  expires_at DATETIME,
  ip_address VARCHAR,
  user_agent VARCHAR,
  revoked_at DATETIME NULL,
  created_at DATETIME
)
```

#### 3. `churches` Table
**Database:** `orthodoxmetrics_db`  
**Referenced In:**
- `server/src/routes/admin/churches.js`
- `server/src/api/admin.js` (line 173-183)

**Key Fields:**
- `id`, `name`, `email`, `is_active`, `database_name`

### Database Architecture

- **Single Database:** `orthodoxmetrics_db` (main application database)
- **Multi-Tenant:** Each church has separate database (`orthodoxmetrics_ch_{churchId}`) for records, but user/role data lives in main DB
- **User Data Location:** All user and role data stored in main `orthodoxmetrics_db.users` table
- **No Separate Roles Table:** Roles are stored as ENUM/string in `users.role` column (no `user_roles` junction table)

---

## UI -> API -> Handler -> DB Map

| Operation | UI Component | Frontend Service | API Endpoint | Backend Handler | Database Table | Key Fields |
|-----------|--------------|------------------|--------------|-----------------|----------------|------------|
| **List Users** | `UserManagement.tsx` (loadData) | `userService.getUsers()` | `GET /api/admin/users` | `server/src/api/admin.js` (router.get('/users')) | `users` | SELECT * FROM users |
| **Create User** | `UserManagement.tsx` (handleCreateUser) | `userService.createUser()` | `POST /api/admin/users` | `server/src/api/admin.js` (router.post('/users')) | `users` | INSERT INTO users (email, first_name, last_name, role, church_id, password_hash, is_active) |
| **Update User** | `UserManagement.tsx` (handleUpdateUser) | `userService.updateUser()` | `PUT /api/admin/users/:id` | `server/src/api/admin.js` (router.put('/users/:id')) | `users` | UPDATE users SET email=?, first_name=?, last_name=?, role=?, church_id=?, is_active=? WHERE id=? |
| **Delete User** | `UserManagement.tsx` (handleDeleteUser) | `userService.deleteUser()` | `DELETE /api/admin/users/:id` | `server/src/api/admin.js` (router.delete('/users/:id')) | `users` | DELETE FROM users WHERE id=? |
| **Toggle User Status** | `UserManagement.tsx` (handleToggleStatus) | `userService.toggleUserStatus()` | `PUT /api/admin/users/:id/toggle-status` | `server/src/api/admin.js` (router.put('/users/:id/toggle-status')) | `users` | UPDATE users SET is_active = NOT is_active WHERE id=? |
| **Reset Password** | `UserManagement.tsx` (handleResetPassword) | `userService.resetPassword()` | `PATCH /api/admin/users/:id/reset-password` | `server/src/api/admin.js` (router.patch('/users/:id/reset-password')) | `users` | UPDATE users SET password_hash=? WHERE id=? |
| **Assign Role** | `UserManagement.tsx` (via updateUser) | `userService.updateUser({role})` | `PUT /api/admin/users/:id` | `server/src/api/admin.js` (router.put('/users/:id')) | `users` | UPDATE users SET role=? WHERE id=? |
| **Lock User** | ❌ **NOT IMPLEMENTED** | N/A | N/A | N/A | `users` | UPDATE users SET is_locked=1 WHERE id=? |

---

## Gaps & Recommendations

### Critical Gaps

1. **No Account Locking UI**
   - **Gap:** `is_locked` field exists in database and is checked during login, but no UI to lock/unlock users
   - **Impact:** Cannot disable user accounts without deactivating them (which may have other side effects)
   - **Recommendation:** Add `PUT /api/admin/users/:id/lock` and `PUT /api/admin/users/:id/unlock` endpoints, add lock/unlock buttons in UserManagement UI

2. **No SuperAdmin-Only Control Panel**
   - **Gap:** Current UserManagement is accessible to both `admin` and `super_admin` roles
   - **Impact:** Cannot create a dedicated SuperAdmin interface with enhanced features
   - **Recommendation:** Create new route `/admin/super/users` with `requiredRole: ['super_admin']` and enhanced UI

3. **Role Management Uses Mock Data**
   - **Gap:** `RoleManagement.tsx` component displays mock roles, no backend integration
   - **Impact:** Cannot view/manage role assignments, permissions, or role metadata
   - **Recommendation:** Since roles are stored as ENUM in users table (not separate table), consider if role management UI is needed or if current system is sufficient

4. **No Bulk Operations**
   - **Gap:** No endpoints or UI for bulk user operations (bulk delete, bulk role assignment, bulk status toggle)
   - **Impact:** Inefficient for managing large numbers of users
   - **Recommendation:** Add `POST /api/admin/users/bulk` endpoint with operations array

5. **No User Invitation System**
   - **Gap:** No invite token system or email invitation flow
   - **Impact:** Must manually create users and share passwords
   - **Recommendation:** Add `POST /api/admin/users/invite` endpoint, `invites` table, email sending

### Medium Priority Gaps

6. **Password Reset Flow Incomplete**
   - **Gap:** Admin can reset password, but no "forgot password" self-service flow for users
   - **Impact:** Users cannot self-reset passwords
   - **Recommendation:** Add `POST /api/auth/forgot-password` and `POST /api/auth/reset-password/:token` endpoints, `password_reset_tokens` table

7. **No User Activity Logging**
   - **Gap:** No audit trail for user management actions (who created/deleted/updated users)
   - **Impact:** Cannot track administrative actions
   - **Recommendation:** Add `user_management_logs` table, log all admin actions

8. **Limited Role Assignment Validation**
   - **Gap:** Role assignment checks exist but may not prevent all edge cases (e.g., super_admin creating super_admin)
   - **Impact:** Potential security risk
   - **Recommendation:** Strengthen `requireRolePermission` middleware, add explicit checks in update handler

### Low Priority / Nice-to-Have

9. **No User Search/Filtering Backend**
   - **Gap:** Frontend filters users client-side, no server-side search
   - **Impact:** Performance issues with large user lists
   - **Recommendation:** Add query parameters to `GET /api/admin/users?search=&role=&church_id=&is_active=`

10. **No User Export/Import**
    - **Gap:** Cannot export user list or bulk import users
    - **Impact:** Manual data entry required
    - **Recommendation:** Add `GET /api/admin/users/export` (CSV/JSON) and `POST /api/admin/users/import`

---

## Recommended Implementation Plan (Phased)

### Phase 1: Core SuperAdmin Panel (MVP)
**Goal:** Create SuperAdmin-only control panel with existing functionality

1. Create new route `/admin/super/users` with `requiredRole: ['super_admin']`
2. Create `SuperAdminUserPanel.tsx` component (copy/adapt from UserManagement.tsx)
3. Add lock/unlock functionality:
   - Backend: `PUT /api/admin/users/:id/lock` and `PUT /api/admin/users/:id/unlock`
   - Frontend: Lock/unlock buttons in UI
4. Add menu item "SuperAdmin Control Panel" (super_admin only)

**Estimated Effort:** 2-3 days

### Phase 2: Enhanced Features
**Goal:** Add missing critical features

1. Implement account locking UI (from Phase 1)
2. Add bulk operations:
   - Backend: `POST /api/admin/users/bulk`
   - Frontend: Multi-select checkboxes, bulk action dropdown
3. Add user activity logging:
   - Backend: Create `user_management_logs` table, log all admin actions
   - Frontend: Show audit trail in user detail modal

**Estimated Effort:** 3-4 days

### Phase 3: User Invitations
**Goal:** Enable email-based user invitations

1. Create `invites` table (email, token, role, church_id, expires_at, created_by)
2. Backend: `POST /api/admin/users/invite` endpoint
3. Backend: Email sending service integration
4. Frontend: "Invite User" button and form
5. Frontend: Accept invitation flow (`/auth/accept-invite/:token`)

**Estimated Effort:** 4-5 days

### Phase 4: Advanced Features
**Goal:** Polish and advanced capabilities

1. Server-side search/filtering for users
2. User export/import (CSV/JSON)
3. Enhanced role management UI (if needed)
4. User activity dashboard (login history, last actions)

**Estimated Effort:** 5-7 days

---

## Notes & Considerations

- **Dual Auth Systems:** Codebase uses both session-based (legacy) and JWT-based (new) authentication. Admin routes use session-based (`req.session.user`), while new auth routes use JWT (`req.user`). Ensure SuperAdmin panel uses consistent auth method.

- **Role System:** Roles are stored as ENUM in `users.role` column, not in separate `roles` or `user_roles` tables. This simplifies the system but limits role metadata management.

- **Permission Checks:** Permission utilities in `utils/roles.ts` and `middleware/userAuthorization.js` provide comprehensive checks. Reuse these in SuperAdmin panel.

- **Database:** All user data in single `orthodoxmetrics_db.users` table. No separate databases for user management.

- **Existing UI Quality:** `UserManagement.tsx` is well-implemented with good UX. Consider reusing patterns and components rather than rebuilding from scratch.

---

## File Reference Quick Index

### Frontend
- User Management: `front-end/src/features/admin/admin/UserManagement.tsx`
- Access Control Dashboard: `front-end/src/features/admin/admin/AccessControlDashboard.tsx`
- Role Management: `front-end/src/features/admin/admin/tabs/RoleManagement.tsx`
- Auth Context: `front-end/src/context/AuthContext.tsx`
- Role Utilities: `front-end/src/utils/roles.ts`
- Protected Route: `front-end/src/components/auth/ProtectedRoute.tsx`
- User Service: `front-end/src/shared/lib/userService.ts`
- Auth Service: `front-end/src/shared/lib/authService.ts`
- Router: `front-end/src/routes/Router.tsx`
- Menu Items: `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`

### Backend
- Admin API: `server/src/api/admin.js`
- Auth Routes: `server/src/routes/auth.ts`
- Auth Service: `server/src/modules/auth/service.ts`
- Auth Repository: `server/src/modules/auth/repo.ts`
- Require Auth Middleware: `server/src/middleware/requireAuth.ts`
- Auth Middleware (Legacy): `server/src/middleware/auth.js`
- User Authorization: `server/src/middleware/userAuthorization.js`
- Server Entry: `server/src/index.ts`

---

**End of Report**

