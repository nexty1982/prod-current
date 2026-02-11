# Orthodox Metrics - Complete Role Reference

## Overview

This document provides a comprehensive reference of all roles used throughout the Orthodox Metrics platform. The system implements a hierarchical role-based access control (RBAC) system with multiple context-specific role sets.

## Primary Role Hierarchy

### Canonical Role System
**Source:** `front-end/src/utils/roles.ts`

```typescript
export type UserRole =
  | 'super_admin'    // Level 7 - Highest privilege
  | 'admin'          // Level 6 - Administrative access
  | 'manager'        // Level 5 - Church management access
  | 'priest'         // Level 4 - Clergy access
  | 'deacon'         // Level 3 - Clergy access (lower than priest)
  | 'editor'         // Level 2 - Content editing access
  | 'viewer'         // Level 1 - Read-only access
  | 'guest';         // Level 0 - Lowest privilege
```

**Privilege Inheritance:** Higher roles automatically inherit permissions from lower roles.

## Database Schema Role Definitions

### Main User Roles (Most Comprehensive)
```sql
`role` enum('super_admin','admin','manager','user','viewer','priest','deacon')
```

### Standard Hierarchy
```sql
`role` enum('super_admin','admin','manager','user','viewer')
```

### Extended Admin System
```sql
`role` enum('super_admin','admin','church_admin','user')
```

### Basic System
```sql
`role` enum('admin','super_admin','user')
```

## Context-Specific Role Sets

### Church Ministry Roles
```sql
`role` enum('priest','deacon','administrator','treasurer','secretary','other')
```

### Board/Group Management
```sql
-- Kanban Boards
`role` enum('owner','admin','member','viewer')

-- Church Admin Panels  
`role` enum('owner','manager','viewer')
```

### Community/Forum System
```sql
`role` enum('member','admin','moderator')
```

### AI/System Roles
```sql
`role` enum('user','assistant','system')
```

## Role Categories

### Administrative Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `super_admin` | System-wide administrative access | Highest |
| `admin` | General administrative access | High |
| `dev_admin` | Development/maintenance access | High |
| `church_admin` | Church-specific administrative access | High |

### Management Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `manager` | Church management and coordination | Medium-High |
| `supervisor` | Oversight and supervision duties | Medium |
| `owner` | Resource/content ownership | Medium |

### Clergy Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `priest` | Ordained priest with full liturgical access | Medium-High |
| `deacon` | Ordained deacon with limited liturgical access | Medium |

### Standard User Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `user` | Standard authenticated user | Medium |
| `editor` | Content creation and editing | Medium-Low |
| `viewer` | Read-only access to content | Low |
| `member` | General community membership | Low |
| `guest` | Unauthenticated or limited access | Lowest |

### Church-Specific Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `treasurer` | Financial management and oversight | Medium |
| `secretary` | Administrative and record-keeping duties | Medium-Low |
| `volunteer` | Volunteer worker access | Low |

### System/Technical Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `ai_agent` | AI system agent | System |
| `omai` | OMAI AI system access | System |
| `assistant` | AI assistant role | System |
| `system` | System-level automated processes | System |

### Community Roles
| Role | Description | Privilege Level |
|------|-------------|-----------------|
| `moderator` | Content moderation capabilities | Medium |

## Role Arrays by Component

### Menu Management
**Source:** `front-end/src/views/admin/MenuManagement.tsx`
```javascript
const roles = ['admin', 'manager', 'user', 'viewer', 'priest', 'deacon'];
```

### Church Setup Wizard
**Source:** `front-end/src/views/apps/church-management/ChurchSetupWizard.tsx`

**User Roles:**
```javascript
const USER_ROLES = [
  { value: 'admin', label: 'Administrator', description: 'Full access to all church functions' },
  { value: 'manager', label: 'Manager', description: 'Manage records and view reports' },
  { value: 'user', label: 'User', description: 'Add and edit records' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access' }
];
```

**Clergy Roles:**
```javascript
const CLERGY_ROLES = [
  'Priest', 'Deacon', 'Reader', 'Chanter',
  'Parish Council President', 'Parish Council Member',
  'Treasurer', 'Secretary', 'Other'
];
```

### Import Records Access
**Source:** `server/routes/importRecords.js`
```javascript
const allowedRoles = ['admin', 'super_admin', 'priest', 'deacon'];
```

### Menu Permissions
**Source:** `server/routes/menuPermissions.js`
```javascript
const roles = ['admin', 'manager', 'user', 'priest', 'deacon', 'viewer'];
```

### System Components Access
**Source:** `server/routes/admin/components.js`
```javascript
const allowedRoles = ['admin', 'super_admin'];
```

### Records Management
**Source:** `server/routes/records.js`
```javascript
const allowedRoles = ['super_admin', 'admin', 'priest', 'deacon'];
```

## Maintenance & Special Access

### Maintenance Mode Exempt Roles
**Source:** `server/middleware/maintenanceMiddleware.js`
```javascript
exemptRoles: ['super_admin', 'dev_admin']
```

### OMAI Command Service
**Source:** `server/services/omaiCommandService.js`
```javascript
allowedRoles: ['super_admin']
```

## Implementation Notes

### Role Inheritance
- **Hierarchical:** Higher privilege roles inherit permissions from lower roles
- **Context-Specific:** Some subsystems use their own role sets (forums, kanban, etc.)
- **Fallback:** Most systems fall back to the canonical role hierarchy

### Legacy Role Mapping
The system includes legacy role mapping in `front-end/src/utils/roles.ts` to handle older role names:
```javascript
const legacyRoleMap: Record<string, UserRole> = {
  // Legacy mappings for backward compatibility
};
```

### Role Validation
- **Frontend:** Uses `hasRole()`, `hasAnyRole()`, `hasExactRole()` utility functions
- **Backend:** Uses `requireRole()` middleware for route protection
- **Database:** Enforced through ENUM constraints in table schemas

## Security Considerations

1. **Principle of Least Privilege:** Users should be assigned the minimum role necessary
2. **Role Escalation:** Only `super_admin` can modify other `super_admin` accounts
3. **Church Isolation:** `church_admin` roles are scoped to specific churches
4. **System Roles:** AI and system roles have restricted access patterns

## File Locations

- **Primary Types:** `front-end/src/types/orthodox-metrics.types.ts`
- **Role Utilities:** `front-end/src/utils/roles.ts`
- **Auth Types:** `front-end/src/types/auth/auth.ts`
- **Backend Middleware:** `server/middleware/auth.js`
- **Database Schemas:** `server/database/*.sql`

---

*Last Updated: August 2025*
*Generated from codebase analysis*