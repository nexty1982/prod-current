# Create PR for Editable Menu System

**Ready to create:** Backend implementation complete ✅

---

## Quick Start (Recommended)

**SSH to Linux server and run:**

```bash
cd /var/www/orthodoxmetrics/prod
chmod +x scripts/deploy-editable-menu-pr.sh
./scripts/deploy-editable-menu-pr.sh
```

This script will:
1. Check git status
2. Stage all changes
3. Create commit with detailed message
4. Push to remote
5. Create PR with full description

---

## Manual Method (Alternative)

If you prefer to create the PR manually:

### Step 1: SSH to Server

```bash
ssh user@192.168.1.239
cd /var/www/orthodoxmetrics/prod
```

### Step 2: Check Changes

```bash
git status
git diff --stat
```

### Step 3: Stage Files

```bash
git add server/database/migrations/add-editable-menu-columns.sql
git add server/src/services/menuService.ts
git add server/src/routes/menu.ts
git add server/src/index.ts
git add docs/DEVELOPMENT/editable-menu-system-implementation.md
git add EDITABLE_MENU_IMPLEMENTATION_SUMMARY.md
git add EDITABLE_MENU_STATUS.md
```

### Step 4: Create Commit

```bash
git commit -m "feat: Add super_admin editable navigation menus (backend)

Implements backend infrastructure for super_admin-only editable navigation menus.
Non-super_admin users continue using static MenuItems.ts without changes.

## Backend Changes

### Database Schema
- Add 9 columns to menus table for flat hierarchical menu structure
- Create menu_audit table for change tracking
- Add indexes and constraints for performance

### Service Layer (menuService.ts)
- buildMenuTree() - Converts flat rows to nested tree with sorting
- validateMenuItems() - Validates paths, icons, meta keys
- detectCycles() - Prevents infinite parent_id loops
- getMenusByRole() - Fetches menus from DB
- upsertMenuItems() - Bulk save with key_name matching
- resetMenusByRole() - Sets all to inactive
- logAudit() - Tracks all changes

### API Endpoints (menu.ts)
1. GET /api/ui/menu - Frontend menu loader
2. GET /api/admin/menus - Editor data (flat & tree)
3. PUT /api/admin/menus - Bulk update/insert
4. POST /api/admin/menus/seed - Seed from MenuItems.ts
5. POST /api/admin/menus/reset - Reset to static
6. GET /api/admin/menus/constants - Validation rules

### Validation & Security
- Path allowlist, icon whitelist, meta keys whitelist
- Super_admin only access on all endpoints
- Parameterized SQL queries, cycle detection
- Audit logging

## Testing
Backend endpoints testable via curl/Postman

## Deployment
1. Run migration: add-editable-menu-columns.sql
2. Build: npm run build:verbose
3. Restart: pm2 restart orthodox-backend

Closes #[ISSUE_NUMBER]"
```

### Step 5: Push to Remote

```bash
git push -u origin HEAD
```

### Step 6: Create PR

```bash
gh pr create --title "feat: Super Admin Editable Navigation Menus (Backend)" \
  --body "See commit message for full details.

## Summary
Backend infrastructure for super_admin editable menus. Non-super_admin unchanged.

## Files Changed
- Database migration (40 lines)
- menuService.ts (468 lines)
- menu.ts routes (227 lines)
- Documentation (1,300+ lines)

## Test Plan
- [ ] Migration runs successfully
- [ ] All 6 endpoints respond correctly
- [ ] Validation works
- [ ] Audit logging tracks changes

## Deployment
\`\`\`bash
mysql -u orthodoxapps -p orthodoxmetrics_db < server/database/migrations/add-editable-menu-columns.sql
cd server && npm run build:verbose && pm2 restart orthodox-backend
\`\`\`

## Breaking Changes
None - purely additive, backward compatible.

## Next Steps
Frontend PR to follow (~870 lines)"
```

---

## Files Included in PR

### Backend Code
1. `server/database/migrations/add-editable-menu-columns.sql` - Schema
2. `server/src/services/menuService.ts` - Service layer
3. `server/src/routes/menu.ts` - API endpoints
4. `server/src/index.ts` - Router mount (3 lines)

### Documentation
5. `docs/DEVELOPMENT/editable-menu-system-implementation.md` - System docs
6. `EDITABLE_MENU_IMPLEMENTATION_SUMMARY.md` - Summary
7. `EDITABLE_MENU_STATUS.md` - Status & deployment guide

**Total:** ~2,000 lines (backend infrastructure only)

---

## PR Title

```
feat: Super Admin Editable Navigation Menus (Backend)
```

---

## PR Labels (Add After Creation)

- `feature` - New feature
- `backend` - Backend changes
- `database` - Schema changes
- `super-admin` - Super admin functionality
- `ready-for-review` - Ready for review

---

## Reviewers to Request

- Backend lead
- Database reviewer
- Security reviewer
- Product owner

---

## Pre-Merge Checklist

Before merging:
- [ ] Code review approved
- [ ] Migration tested on dev database
- [ ] Backend builds without errors
- [ ] All 6 endpoints tested with curl
- [ ] Security audit passed
- [ ] Documentation reviewed
- [ ] Deployment plan approved

---

## After Merge

1. Deploy to staging
2. Run migration
3. Test all endpoints
4. Monitor logs
5. Deploy to production
6. Create frontend PR

---

## Notes

- **Backend only** - Frontend in separate PR
- **No breaking changes** - Purely additive
- **Super_admin only** - No effect on other roles
- **Backward compatible** - Static menu still works

---

**Status:** Ready to create PR ✅  
**Estimated Review Time:** 1-2 hours  
**Estimated Merge Time:** After testing, 1 day
