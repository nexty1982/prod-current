# Editable Menu System Implementation Documentation

**Date:** 2026-02-05  
**Feature:** Super Admin Editable Navigation Menus

---

## 1. CURRENT SETUP DOCUMENTATION

### 1.1 MenuItems.ts Location & Structure

**Path:** `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`

**Structure:**
```typescript
interface MenuitemsType {
  id?: string;
  navlabel?: boolean;      // Section header
  subheader?: string;      // Header text
  title?: string;          // Menu item title
  icon?: any;              // Icon component
  href?: string;           // Route path
  children?: MenuitemsType[];  // Nested items
  chip?: string;           // Badge text
  chipColor?: string;      // Badge color
  variant?: string;
  external?: boolean;
}
```

**Key Function:**
```typescript
export const getMenuItems = (user: any) => MenuitemsType[]
```

- Returns different menu structures based on user role
- Filters "Developer Tools" section for non-super_admin users
- Makes church-aware URL substitutions
- Currently returns static array defined in file

### 1.2 Sidebar Rendering Components

**Main Files:**
- `front-end/src/layouts/full/vertical/sidebar/Sidebar.tsx` - Main sidebar container
- `front-end/src/layouts/full/vertical/sidebar/SidebarItems.tsx` - Renders menu items

**Menu Loading:**
```typescript
// In Sidebar or parent component
import { getMenuItems } from './MenuItems';
const menuItems = getMenuItems(user);
```

### 1.3 Role Detection & Auth System

**Auth Context:** `front-end/src/context/AuthContext.tsx`

**Key Functions:**
```typescript
interface AuthContextType {
  user: User | null;
  isSuperAdmin: () => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  // ... other methods
}
```

**Role Check Implementation:**
```typescript
const isSuperAdmin = () => {
  return user?.role === 'super_admin';
};
```

**User Object Structure:**
```typescript
interface User {
  id: number;
  email: string;
  role: 'super_admin' | 'admin' | 'priest' | 'user';
  church_id: number | null;
  // ... other fields
}
```

**Session Storage:**
- Backend: `req.session.user` (Express session via MySQL store)
- Frontend: `localStorage.auth_user` + AuthContext state

### 1.4 Backend Configuration

**Base URL & Port:**
- Backend always runs on port **3001**
- Development: `http://localhost:3001` or `http://192.168.1.239:3001`
- Production: `https://orthodoxmetrics.com` (nginx proxy to :3001)

**Database:** 
- Primary: `orthodoxmetrics_db`
- Auth/Sessions: `orthodoxmetrics_auth_db` (separate)

---

## 2. DATABASE SCHEMA

### 2.1 Existing Schema (Router Menu Studio)

**Current Tables:**
```sql
-- Menu sets (one per role)
CREATE TABLE menus (
  id BIGINT PRIMARY KEY,
  name VARCHAR(128),
  role ENUM('super_admin','default'),
  is_active TINYINT(1),
  version INT,
  created_by VARCHAR(128),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Individual menu items
CREATE TABLE router_menu_items (
  id BIGINT PRIMARY KEY,
  menu_id BIGINT,
  label VARCHAR(256),
  path VARCHAR(512),
  icon VARCHAR(128),
  parent_id BIGINT,
  sort_order INT,
  is_devel_tool TINYINT(1),
  visible_roles JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**⚠️ Issue:** User spec describes a different schema with columns like `key_name`, `order_index`, `meta`, `roles` (longtext).

### 2.2 Required Schema (Per User Spec)

The user specifies the table should have:
```
id, parent_id, key_name, label, icon, path, 
roles (longtext), role enum('super_admin','default'), 
is_active, order_index, meta (longtext), version, 
created_by, created_at, updated_by, updated_at
```

**Decision:** Create migration to add missing columns to existing `menus` table OR use `router_menu_items` table adapted.

**Recommendation:** Use a **flattened single-table approach** for super_admin menus with the columns the user specified. This simplifies the API and matches the user's requirements exactly.

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Backend API (Priority 1)

#### 3.1 Database Schema Update
Create migration: `server/database/migrations/add-menu-columns.sql`

```sql
ALTER TABLE menus ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS key_name VARCHAR(128) UNIQUE NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS label VARCHAR(256) NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS icon VARCHAR(128) NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS path VARCHAR(512) NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS roles LONGTEXT NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS meta LONGTEXT NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS updated_by VARCHAR(128) NULL;

CREATE INDEX idx_key_name ON menus(key_name);
CREATE INDEX idx_parent_id ON menus(parent_id);
CREATE INDEX idx_order_index ON menus(order_index);
```

#### 3.2 Create DAL/Service Module
**Path:** `server/src/services/menuService.ts`

**Functions:**
- `buildMenuTree(rows)` - Converts flat rows to nested tree
- `validateMenuItems(payload)` - Validates fields
- `detectCycles(rows)` - Prevents parent_id loops
- `getAllowedIcons()` - Returns icon whitelist
- `getAllowedPathPattern()` - Returns path regex

#### 3.3 Create API Endpoints
**Path:** `server/src/routes/menu.ts`

**Endpoints:**
1. `GET /api/ui/menu` - Frontend menu loader (super_admin only)
2. `GET /api/admin/menus` - Admin editor data
3. `PUT /api/admin/menus` - Bulk update
4. `POST /api/admin/menus/seed` - Seed from MenuItems.ts
5. `POST /api/admin/menus/reset` - Reset to static

### Phase 2: Frontend Menu Loader (Priority 2)

#### 3.4 Modify Menu Loading Logic
**Path:** Update `Sidebar.tsx` or `FullLayout.tsx`

```typescript
const [menuItems, setMenuItems] = useState<MenuitemsType[]>([]);
const { user, isSuperAdmin } = useAuth();

useEffect(() => {
  if (isSuperAdmin()) {
    // Try loading from DB
    fetch('/api/ui/menu')
      .then(res => res.json())
      .then(data => {
        if (data.source === 'db' && data.items) {
          setMenuItems(data.items);
        } else {
          setMenuItems(getMenuItems(user)); // Fallback
        }
      })
      .catch(() => setMenuItems(getMenuItems(user)));
  } else {
    setMenuItems(getMenuItems(user)); // Static for non-super_admin
  }
}, [user]);
```

### Phase 3: Menu Editor UI (Priority 3)

#### 3.5 Create Menu Editor Page
**Path:** `front-end/src/features/devel-tools/menu-editor/`

**Files:**
- `MenuEditorPage.tsx` - Main page component
- `MenuTable.tsx` - Editable table of menu items
- `MenuSeedDialog.tsx` - Seed confirmation dialog
- `MenuResetDialog.tsx` - Reset confirmation dialog
- `iconWhitelist.ts` - Shared icon constants

#### 3.6 Update Router & MenuItems
**Update:** `front-end/src/routes/Router.tsx`
```typescript
{
  path: '/devel-tools/menu-editor',
  element: <MenuEditorPage />
}
```

**Update:** `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`
```typescript
{
  id: uniqueId(),
  title: 'Menu Editor',
  icon: IconLayout,
  href: '/devel-tools/menu-editor',
}
```
Place under "Developer Tools" section.

---

## 4. VALIDATION RULES

### 4.1 Path Validation
```typescript
const PATH_ALLOWLIST = /^\/(?:apps|dev|admin|devel|devel-tools|church|dashboards|tools|sandbox|social|frontend-pages)(?:\/|$)/;
```

### 4.2 Icon Whitelist
Export from `iconWhitelist.ts`:
```typescript
export const ALLOWED_ICONS = [
  'IconLayoutDashboard', 'IconShield', 'IconUsers',
  'IconFileDescription', 'IconSettings', 'IconTerminal',
  // ... complete list
];
```

### 4.3 Meta Keys Whitelist
```typescript
const ALLOWED_META_KEYS = ['systemRequired', 'badge', 'note'];
```

---

## 5. SECURITY CONSIDERATIONS

1. **Super Admin Only:** All DB menu operations require `req.session.user.role === 'super_admin'`
2. **SQL Injection:** Always use parameterized queries
3. **Cycle Detection:** Prevent infinite loops in parent_id relationships
4. **Path Validation:** Strict regex allowlist
5. **Icon Validation:** Enum/whitelist only
6. **Audit Logging:** Log all changes with user ID

---

## 6. TESTING CHECKLIST

### Backend Tests
- [ ] `buildMenuTree` creates correct hierarchy
- [ ] `detectCycles` rejects parent loops
- [ ] Path validation rejects invalid paths
- [ ] Icon validation rejects unknown icons
- [ ] Meta validation rejects unknown keys

### Frontend Tests
- [ ] super_admin sees DB menu when seeded
- [ ] non-super_admin unchanged (static menu)
- [ ] Edits persist after page refresh
- [ ] Invalid path shows error message
- [ ] Reset returns to static behavior
- [ ] Seed from MenuItems.ts works correctly

---

## 7. MIGRATION PATH

1. **Deploy backend** with new endpoints (backward compatible)
2. **Test endpoints** via curl/Postman
3. **Deploy frontend** menu loader changes
4. **Verify** super_admin sees static menu (no DB data yet)
5. **Use Menu Editor** to seed initial data
6. **Verify** super_admin sees DB menu
7. **Test editing** and verify changes reflect

---

## 8. ROLLBACK PLAN

If issues occur:
1. Backend flag: `ENABLE_DB_MENU=false` → force static menu
2. Database: `UPDATE menus SET is_active=0 WHERE role='super_admin'`
3. Frontend localStorage clear: `localStorage.removeItem('menu_cache')`

---

**Status:** Ready for implementation  
**Next Step:** Create backend endpoints and service layer
