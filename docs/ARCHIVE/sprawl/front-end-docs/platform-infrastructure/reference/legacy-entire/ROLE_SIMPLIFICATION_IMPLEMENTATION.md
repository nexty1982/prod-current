# Orthodox Metrics - Role System Simplification Implementation Plan

## Overview
This document outlines the step-by-step implementation of the simplified role system for Orthodox Metrics, reducing complexity from 40+ roles to 8 canonical roles.

## Phase 1: Database Migration

### 1.1 Legacy Role Mapping
```sql
-- Legacy to Canonical Role Mapping
-- super_admin -> super_admin (no change)
-- admin -> admin (no change) 
-- manager -> church_admin
-- church_admin -> church_admin (no change)
-- priest -> priest (no change)
-- deacon -> deacon (no change)
-- user -> editor
-- secretary -> editor
-- treasurer -> editor
-- volunteer -> editor
-- member -> editor
-- moderator -> editor
-- viewer -> viewer (no change)
-- guest -> guest (no change)
-- owner -> church_admin
-- dev_admin -> admin
-- assistant -> editor
-- system -> admin (for system processes)
-- ai_agent -> admin (for AI processes)
-- omai -> admin (for OMAI processes)
```

### 1.2 Migration Script
**File:** `server/database/migrations/role_simplification_migration.sql`

```sql
-- Role Simplification Migration
-- Phase 1: Add temporary column for new roles

ALTER TABLE users ADD COLUMN new_role ENUM(
  'super_admin', 'admin', 'church_admin', 
  'priest', 'deacon', 'editor', 'viewer', 'guest'
) DEFAULT 'viewer';

-- Phase 2: Map legacy roles to canonical roles
UPDATE users SET new_role = 'super_admin' WHERE role IN ('super_admin');
UPDATE users SET new_role = 'admin' WHERE role IN ('admin', 'dev_admin', 'system', 'ai_agent', 'omai');
UPDATE users SET new_role = 'church_admin' WHERE role IN ('manager', 'church_admin', 'owner', 'administrator');
UPDATE users SET new_role = 'priest' WHERE role IN ('priest');
UPDATE users SET new_role = 'deacon' WHERE role IN ('deacon');
UPDATE users SET new_role = 'editor' WHERE role IN ('user', 'secretary', 'treasurer', 'volunteer', 'member', 'moderator', 'assistant', 'editor');
UPDATE users SET new_role = 'viewer' WHERE role IN ('viewer');
UPDATE users SET new_role = 'guest' WHERE role IN ('guest') OR role IS NULL;

-- Phase 3: Add user profile attributes for contextual titles
ALTER TABLE users ADD COLUMN profile_attributes JSON DEFAULT '{}';

-- Migrate contextual information to profile attributes
UPDATE users SET profile_attributes = JSON_OBJECT(
  'titles', JSON_ARRAY(),
  'ministries', JSON_ARRAY(),
  'isParishCouncilMember', false,
  'specializations', JSON_ARRAY()
) WHERE profile_attributes = '{}' OR profile_attributes IS NULL;

-- Phase 4: Drop old role column and rename new_role
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users CHANGE new_role role ENUM(
  'super_admin', 'admin', 'church_admin',
  'priest', 'deacon', 'editor', 'viewer', 'guest'
) NOT NULL DEFAULT 'viewer';

-- Phase 5: Update other tables with role references
-- Church admin panels
UPDATE church_admin_panel SET role = 'church_admin' WHERE role IN ('owner', 'manager');
UPDATE church_admin_panel SET role = 'viewer' WHERE role = 'viewer';

-- Kanban board members  
UPDATE kanban_board_members SET role = 'church_admin' WHERE role IN ('owner', 'admin');
UPDATE kanban_board_members SET role = 'editor' WHERE role = 'member';
UPDATE kanban_board_members SET role = 'viewer' WHERE role = 'viewer';

-- Any other role-dependent tables...
```

## Phase 2: Frontend Type System Update

### 2.1 Core Type Definitions
**File:** `front-end/src/types/orthodox-metrics.types.ts`

```typescript
// Updated UserRole type
export type UserRole = 
  | 'super_admin'      // Global system owner
  | 'admin'            // Platform admin (global config, backups)
  | 'church_admin'     // Church-specific admin
  | 'priest'           // Full clergy privileges
  | 'deacon'           // Partial clergy privileges  
  | 'editor'           // Can edit records/content
  | 'viewer'           // Read-only access
  | 'guest';           // Unauthenticated access

// New user profile attributes interface
export interface UserProfileAttributes {
  titles: string[];                    // ['Secretary', 'Treasurer', 'Parish Council Member']
  ministries: string[];               // ['Youth Group', 'Choir', 'Sunday School']
  isParishCouncilMember: boolean;     // true/false
  specializations: string[];          // ['Financial Management', 'Event Planning']
  certifications: string[];          // ['First Aid', 'SafeChurch Training']
}

// Updated User interface
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;                     // Simplified canonical role
  profile_attributes: UserProfileAttributes; // Contextual information
  church_id?: number;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}
```

### 2.2 Role Utilities Update
**File:** `front-end/src/utils/roles.ts`

```typescript
/**
 * 🔄 Simplified Unified Role System for OrthodMetrics
 * 
 * Canonical role hierarchy with inheritance:
 * super_admin > admin > church_admin > priest > deacon > editor > viewer > guest
 */

export type UserRole =
  | 'super_admin'      // Level 7 - Global system owner
  | 'admin'            // Level 6 - Platform admin
  | 'church_admin'     // Level 5 - Church-specific admin
  | 'priest'           // Level 4 - Full clergy privileges
  | 'deacon'           // Level 3 - Partial clergy privileges
  | 'editor'           // Level 2 - Can edit records/content
  | 'viewer'           // Level 1 - Read-only access
  | 'guest';           // Level 0 - Unauthenticated access

// Simplified role hierarchy
const roleHierarchy: Record<UserRole, number> = {
  super_admin: 7,
  admin: 6,
  church_admin: 5,
  priest: 4,
  deacon: 3,
  editor: 2,
  viewer: 1,
  guest: 0,
};

// Legacy role mapping for migration compatibility
const legacyRoleMap: Record<string, UserRole> = {
  // Administrative roles
  'super_admin': 'super_admin',
  'admin': 'admin',
  'dev_admin': 'admin',
  'manager': 'church_admin',
  'church_admin': 'church_admin',
  'owner': 'church_admin',
  'administrator': 'church_admin',
  
  // Clergy roles
  'priest': 'priest',
  'deacon': 'deacon',
  
  // Editor roles (consolidated)
  'user': 'editor',
  'secretary': 'editor',
  'treasurer': 'editor',
  'volunteer': 'editor',
  'member': 'editor',
  'moderator': 'editor',
  'assistant': 'editor',
  'editor': 'editor',
  
  // System/AI roles -> admin
  'system': 'admin',
  'ai_agent': 'admin',
  'omai': 'admin',
  
  // View-only roles
  'viewer': 'viewer',
  'guest': 'guest',
};

/**
 * Normalize legacy role to canonical role
 */
export const normalizeLegacyRole = (legacyRole: string): UserRole => {
  return legacyRoleMap[legacyRole] || 'viewer';
};

/**
 * Check if user has required role or higher
 */
export const hasRole = (user: User | null | undefined, requiredRole: UserRole): boolean => {
  if (!user?.role) return requiredRole === 'guest';
  
  const normalizedUserRole = normalizeLegacyRole(user.role);
  const userLevel = roleHierarchy[normalizedUserRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user: User | null | undefined, roles: UserRole[]): boolean => {
  return roles.some(role => hasRole(user, role));
};

/**
 * Check if user has exact role (no inheritance)
 */
export const hasExactRole = (user: User | null | undefined, exactRole: UserRole): boolean => {
  if (!user?.role) return exactRole === 'guest';
  const normalizedUserRole = normalizeLegacyRole(user.role);
  return normalizedUserRole === exactRole;
};

/**
 * Get all roles that can be assigned by current user
 */
export const getAssignableRoles = (currentUserRole: UserRole): UserRole[] => {
  const currentLevel = roleHierarchy[currentUserRole] || 0;
  
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level < currentLevel)
    .map(([role, _]) => role as UserRole)
    .sort((a, b) => roleHierarchy[b] - roleHierarchy[a]);
};

/**
 * Check if user can assign a specific role
 */
export const canAssignRole = (currentUserRole: UserRole, targetRole: UserRole): boolean => {
  const currentLevel = roleHierarchy[currentUserRole] || 0;
  const targetLevel = roleHierarchy[targetRole] || 0;
  
  return currentLevel > targetLevel;
};

/**
 * Get role display information
 */
export const getRoleInfo = (role: UserRole) => {
  const roleInfo = {
    super_admin: { 
      label: 'Super Administrator', 
      description: 'Global system owner with unrestricted access',
      scope: 'Global'
    },
    admin: { 
      label: 'Administrator', 
      description: 'Platform admin for global configuration and backups',
      scope: 'Global'
    },
    church_admin: { 
      label: 'Church Administrator', 
      description: 'Controls all records and users for a church',
      scope: 'Per-church'
    },
    priest: { 
      label: 'Priest', 
      description: 'Full record lifecycle authority',
      scope: 'Per-church'
    },
    deacon: { 
      label: 'Deacon', 
      description: 'Limited sacrament authority',
      scope: 'Per-church'
    },
    editor: { 
      label: 'Editor', 
      description: 'Can edit content and records, no admin authority',
      scope: 'Per-church'
    },
    viewer: { 
      label: 'Viewer', 
      description: 'Read-only access to records and views',
      scope: 'Per-church'
    },
    guest: { 
      label: 'Guest', 
      description: 'Unauthenticated access to public content only',
      scope: 'Public'
    }
  };
  
  return roleInfo[role] || roleInfo.guest;
};
```

## Phase 3: Component Updates

### 3.1 Role Arrays Cleanup
**Files to Update:**

1. `front-end/src/views/admin/MenuManagement.tsx`
2. `front-end/src/components/UserFormModal.tsx`
3. `front-end/src/views/apps/church-management/ChurchSetupWizard.tsx`
4. `server/routes/menuPermissions.js`
5. `server/routes/importRecords.js`
6. `server/routes/records.js`
7. `server/middleware/maintenanceMiddleware.js`
8. `server/services/omaiCommandService.js`

### 3.2 Backend Middleware Update
**File:** `server/middleware/auth.js`

```javascript
// Simplified canonical roles
const CANONICAL_ROLES = [
  'super_admin', 'admin', 'church_admin',
  'priest', 'deacon', 'editor', 'viewer', 'guest'
];

// Legacy role mapping
const legacyRoleMap = {
  'super_admin': 'super_admin',
  'admin': 'admin',
  'dev_admin': 'admin',
  'manager': 'church_admin',
  'church_admin': 'church_admin',
  'owner': 'church_admin',
  'administrator': 'church_admin',
  'priest': 'priest',
  'deacon': 'deacon',
  'user': 'editor',
  'secretary': 'editor',
  'treasurer': 'editor',
  'volunteer': 'editor',
  'member': 'editor',
  'moderator': 'editor',
  'assistant': 'editor',
  'editor': 'editor',
  'system': 'admin',
  'ai_agent': 'admin',
  'omai': 'admin',
  'viewer': 'viewer',
  'guest': 'guest'
};

const normalizeLegacyRole = (role) => {
  return legacyRoleMap[role] || 'viewer';
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = normalizeLegacyRole(req.session.user.role);
    const normalizedAllowedRoles = allowedRoles.map(role => normalizeLegacyRole(role));

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

## Phase 4: Testing & Validation

### 4.1 Migration Testing Script
**File:** `server/scripts/test_role_migration.js`

```javascript
// Test script to validate role migration
const mysql = require('mysql2/promise');

async function testRoleMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Test 1: Verify all roles are canonical
    const [users] = await connection.execute(
      'SELECT DISTINCT role FROM users ORDER BY role'
    );
    
    const canonicalRoles = [
      'super_admin', 'admin', 'church_admin',
      'priest', 'deacon', 'editor', 'viewer', 'guest'
    ];
    
    const invalidRoles = users
      .map(u => u.role)
      .filter(role => !canonicalRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      console.error('❌ Invalid roles found:', invalidRoles);
    } else {
      console.log('✅ All user roles are canonical');
    }

    // Test 2: Verify role distribution
    const [roleStats] = await connection.execute(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY count DESC
    `);
    
    console.log('📊 Role Distribution:');
    roleStats.forEach(stat => {
      console.log(`  ${stat.role}: ${stat.count} users`);
    });

    // Test 3: Verify super_admin count
    const [superAdmins] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "super_admin"'
    );
    
    if (superAdmins[0].count > 2) {
      console.warn('⚠️  More than 2 super_admin accounts detected');
    } else {
      console.log('✅ Super admin count is appropriate');
    }

  } finally {
    await connection.end();
  }
}

module.exports = testRoleMigration;
```

## Phase 5: Rollout Plan

### 5.1 Staging Environment
1. Run migration on staging database
2. Update frontend/backend code
3. Test all role-dependent functionality
4. Verify user permissions work correctly

### 5.2 Production Rollout
1. **Backup:** Full database backup before migration
2. **Maintenance Mode:** Enable maintenance mode
3. **Migration:** Run role simplification migration
4. **Code Deploy:** Deploy updated frontend/backend
5. **Testing:** Verify critical functions work
6. **Monitoring:** Monitor for role-related errors
7. **Rollback Plan:** Be prepared to restore from backup if needed

### 5.3 Post-Migration Cleanup
1. Remove legacy role references from documentation
2. Update API documentation
3. Train administrators on new role system
4. Monitor for any missed legacy role usage

## Files Requiring Updates

### Frontend Files
- `front-end/src/types/orthodox-metrics.types.ts`
- `front-end/src/utils/roles.ts`
- `front-end/src/types/auth/auth.ts`
- `front-end/src/views/admin/MenuManagement.tsx`
- `front-end/src/components/UserFormModal.tsx`
- `front-end/src/views/apps/church-management/ChurchSetupWizard.tsx`
- All user management components
- All role-dependent UI components

### Backend Files
- `server/middleware/auth.js`
- `server/routes/admin.js`
- `server/routes/menuPermissions.js`
- `server/routes/importRecords.js`
- `server/routes/records.js`
- `server/services/omaiCommandService.js`
- All route files with role checking

### Database Files
- `server/database/migrations/role_simplification_migration.sql`
- Update all table schemas with role references

## Benefits Post-Implementation

1. **Simplified Maintenance:** 8 roles instead of 40+
2. **Consistent Security:** Unified role checking across all components
3. **Clear Hierarchy:** Obvious privilege inheritance
4. **Flexible Attributes:** Contextual titles without permission complexity
5. **Future-Proof:** Easy to extend with new features
6. **Better UX:** Clear role descriptions for administrators

---

*Implementation Timeline: 2-3 weeks*
*Risk Level: Medium (requires careful testing)*
*Rollback Strategy: Database restore + code revert*