# Editable Menu System - Implementation Summary

**Date:** 2026-02-05  
**Status:** In Progress - Phase 1 Complete

---

## ✅ Completed

### Documentation
- ✅ `docs/DEVELOPMENT/editable-menu-system-implementation.md` - Complete system documentation
  - Current setup analysis
  - Database schema
  - Implementation plan
  - Validation rules
  - Testing checklist

### Backend - Database
- ✅ `server/database/migrations/add-editable-menu-columns.sql` - Schema migration
  - Adds required columns to `menus` table
  - Creates indexes for performance
  - Creates `menu_audit` table for change tracking

### Backend - Service Layer
- ✅ `server/src/services/menuService.ts` - Core business logic
  - `buildMenuTree()` - Hierarchical tree building
  - `detectCycles()` - Prevents infinite loops
  - `validateMenuItems()` - Field validation
  - `getMenusByRole()` - Fetch menus from DB
  - `upsertMenuItems()` - Bulk save
  - `resetMenusByRole()` - Reset to inactive
  - Icon whitelist: 28 allowed icons
  - Path validation: Strict regex allowlist
  - Meta validation: Only allowed keys

---

## 🔄 Next Steps

### Phase 2: Backend API Endpoints

Create `server/src/routes/menu.ts` with 5 endpoints:

1. **GET /api/ui/menu**
   - Returns DB menu for super_admin
   - Returns `{source: "static"}` for non-super_admin
   - Used by frontend menu loader

2. **GET /api/admin/menus**
   - Super_admin only
   - Returns all menus (including inactive)
   - Returns both flat list and tree structure

3. **PUT /api/admin/menus**
   - Super_admin only
   - Bulk update/insert menu items
   - Validates all fields
   - Returns validation errors if any

4. **POST /api/admin/menus/seed**
   - Super_admin only
   - Accepts menu items from frontend (converted from MenuItems.ts)
   - Preserves existing IDs via key_name matching
   - Sets parent_id relationships

5. **POST /api/admin/menus/reset**
   - Super_admin only
   - Sets all super_admin menus to inactive
   - Returns count of affected rows

### Phase 3: Frontend Menu Loader

Modify sidebar to check for DB menus:

**File:** `front-end/src/layouts/full/vertical/sidebar/Sidebar.tsx` (or parent)

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
          setMenuItems(getMenuItems(user)); // Fallback to static
        }
      })
      .catch(() => setMenuItems(getMenuItems(user)));
  } else {
    setMenuItems(getMenuItems(user)); // Always static for non-super_admin
  }
}, [user]);
```

### Phase 4: Menu Editor UI

Create new page under Devel Tools:

**Path:** `front-end/src/features/devel-tools/menu-editor/`

**Files:**
- `MenuEditorPage.tsx` - Main container
- `MenuTable.tsx` - Editable table with:
  - Label (text input)
  - Path (text input with validation)
  - Icon (dropdown from whitelist)
  - Parent (dropdown of other menu items)
  - Order Index (number input)
  - Is Active (toggle)
- `MenuSeedDialog.tsx` - Seed confirmation
- `MenuResetDialog.tsx` - Reset confirmation
- `iconWhitelist.ts` - Export ALLOWED_ICONS constant

**Add to Router:**
```typescript
{
  path: '/devel-tools/menu-editor',
  element: <MenuEditorPage />
}
```

**Add to MenuItems.ts** (under Developer Tools):
```typescript
{
  id: uniqueId(),
  title: 'Menu Editor',
  icon: IconLayout,
  href: '/devel-tools/menu-editor',
}
```

---

## 📋 Implementation Checklist

### Backend
- [x] Database migration
- [x] Menu service with validation
- [ ] API endpoints (5 total)
- [ ] Mount router in index.ts
- [ ] Test with curl/Postman

### Frontend
- [ ] Menu loader modification
- [ ] Menu Editor page
- [ ] Icon whitelist constant (shared)
- [ ] Seed transformer (MenuItems.ts → API format)
- [ ] Router.tsx update
- [ ] MenuItems.ts update

### Testing
- [ ] Backend unit tests
- [ ] Frontend smoke tests
- [ ] Role-based access verification
- [ ] Validation error handling
- [ ] Cycle detection

---

## 🔒 Security Checklist

- [x] Super admin role check in service layer
- [ ] Super admin role check in API middleware
- [x] SQL injection prevention (parameterized queries)
- [x] Path validation (regex allowlist)
- [x] Icon validation (whitelist)
- [x] Meta validation (key whitelist)
- [x] Cycle detection (prevents infinite loops)
- [x] Audit logging for all changes

---

## 📖 Key Design Decisions

1. **Flat Single-Table Approach**
   - Uses `parent_id` for hierarchy (not separate tables)
   - Simpler API, easier to maintain
   - Matches user's exact specification

2. **Super Admin Only (Phase 1)**
   - Only super_admin loads from DB
   - Other roles use static MenuItems.ts
   - No breaking changes for non-super_admin users

3. **Key-Based Upsert**
   - `key_name` is stable identifier
   - Allows seeding without losing data
   - Enables safe re-seeding

4. **No Deletion, Only Toggle**
   - Menu items set to `is_active=0` instead of deleted
   - Preserves history
   - Safer for production

---

## 🚀 Deployment Plan

1. **Run migration**
   ```sql
   mysql -u orthodoxapps -p orthodoxmetrics_db < server/database/migrations/add-editable-menu-columns.sql
   ```

2. **Deploy backend**
   ```bash
   cd server
   npm run build:verbose
   pm2 restart orthodox-backend
   ```

3. **Test endpoints** (before deploying frontend)
   ```bash
   # Test status endpoint
   curl http://127.0.0.1:3001/api/ui/menu
   
   # Should return {source: "static"} if no DB menus yet
   ```

4. **Deploy frontend**
   ```bash
   cd front-end
   npm run build
   # Deploy to nginx
   ```

5. **Initial seed**
   - Login as super_admin
   - Navigate to Menu Editor
   - Click "Seed from current static menu"
   - Verify menus appear correctly

---

## 📝 Notes

- Backend port is **always 3001**
- Database: `orthodoxmetrics_db` (main), `orthodoxmetrics_auth_db` (sessions)
- Auth check: `req.session.user.role === 'super_admin'`
- Frontend auth: `isSuperAdmin()` from `useAuth()` hook
- Icon whitelist has 28 icons currently
- Path regex allows 9 base paths

---

**Next Task:** Create API endpoints (`server/src/routes/menu.ts`)
