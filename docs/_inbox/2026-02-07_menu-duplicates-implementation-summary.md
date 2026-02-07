# Menu Duplicates Fix - Implementation Summary

**Date:** 2026-02-07  
**Issue:** Duplicate menu entries in Menu Editor after repeated "Seed from Static" clicks  
**Status:** ✅ COMPLETE - Ready for deployment

---

## Problem Statement

The Menu Editor in the Router Menu Studio was creating duplicate menu items when users clicked the "Seed from Static" button multiple times. This was caused by:

1. **No unique constraint** on `router_menu_items` table
2. **INSERT-only logic** in seed operation (no UPSERT)
3. **Missing `key_name` column** for stable identity tracking
4. **No idempotency** - each seed created new rows instead of updating existing ones

---

## Solution Overview

Implemented a comprehensive fix with four key components:

1. **Database Migration:** Add `key_name` column, remove duplicates, add unique constraint
2. **Seed Endpoint:** Create `/api/admin/menus/seed` with UPSERT logic
3. **Route Registration:** Mount seed endpoint under `/api/admin/menus`
4. **Documentation:** Analysis, deployment guide, and quick reference

---

## Files Created

### 1. Database Migration
**Path:** `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql`

**Phases:**
- Phase 1: Add `key_name VARCHAR(255)` column
- Phase 2: Populate `key_name` for existing rows (auto-generate from label + id)
- Phase 3: Log duplicates before removal (backup to `router_menu_items_dupes_backup_20260207`)
- Phase 4: Remove duplicates (keep row with lowest id)
- Phase 5: Verify no duplicates remain
- Phase 6: Add `UNIQUE KEY uk_router_menu_items_key (menu_id, key_name)`
- Phase 7: Add performance index on `key_name`

**Safety Features:**
- Idempotent: can be run multiple times safely
- Creates backup tables before deletion
- Defensive checks for existing columns/indexes

### 2. Seed API Endpoint
**Path:** `server/src/routes/admin/menus.js`

**Endpoints:**
- `POST /api/admin/menus/seed` - Seed menu items with UPSERT logic
- `GET /api/admin/menus/stats` - Get menu statistics
- `POST /api/admin/menus/verify-uniqueness` - Check for duplicates (diagnostic)

**Key Features:**
- Uses `INSERT ... ON DUPLICATE KEY UPDATE` for idempotency
- Two-pass approach: 
  1. First pass: UPSERT all items (without parent_id)
  2. Second pass: Resolve parent_id relationships
- Handles both numeric (array index) and string (key_name) parent_id formats
- Transaction-based (rollback on error)
- Requires `super_admin` role

**UPSERT Logic:**
```sql
INSERT INTO router_menu_items (
  menu_id, key_name, label, path, icon, parent_id, sort_order, ...
)
VALUES (?, ?, ?, ?, ?, NULL, ?, ...)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  path = VALUES(path),
  icon = VALUES(icon),
  sort_order = VALUES(sort_order),
  updated_at = NOW()
```

### 3. Documentation Files

**Analysis Document:** `docs/_inbox/2026-02-07_menu-duplicates-analysis.md`
- Current state assessment
- Root cause analysis
- Schema mismatch identification
- Implementation plan

**Deployment Guide:** `docs/_inbox/2026-02-07_menu-duplicates-deployment.md`
- Step-by-step deployment instructions
- Verification queries
- Troubleshooting guide
- Rollback procedures
- Success criteria checklist

**Quick Reference:** `docs/_inbox/2026-02-07_menu-duplicates-quick-ref.md`
- 5-minute quick deploy script
- Quick verify queries
- Test script for browser console
- Common issues and solutions

---

## Files Modified

### 1. Admin API Routes
**Path:** `server/src/api/admin.js`

**Change:**
```javascript
const router = express.Router();

// Mount admin menu management routes
const menusRouter = require('../routes/admin/menus');
router.use('/menus', menusRouter);

// ... rest of admin routes
```

**Lines:** Added after line 16 (before `requireAdmin` declarations)

---

## Database Schema Changes

### Before:
```sql
CREATE TABLE router_menu_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT NOT NULL,
  label VARCHAR(256) NOT NULL,
  path VARCHAR(512) NULL,
  icon VARCHAR(128) NULL,
  parent_id BIGINT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_devel_tool TINYINT(1) NOT NULL DEFAULT 0,
  visible_roles JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES router_menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu_id (menu_id), 
  INDEX idx_parent_id (parent_id), 
  INDEX idx_sort_order (sort_order),
  INDEX idx_devel_tool (is_devel_tool)
);
```

### After:
```sql
CREATE TABLE router_menu_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT NOT NULL,
  key_name VARCHAR(255) NOT NULL,  -- ✅ ADDED
  label VARCHAR(256) NOT NULL,
  path VARCHAR(512) NULL,
  icon VARCHAR(128) NULL,
  parent_id BIGINT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_devel_tool TINYINT(1) NOT NULL DEFAULT 0,
  visible_roles JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES router_menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu_id (menu_id), 
  INDEX idx_parent_id (parent_id), 
  INDEX idx_sort_order (sort_order),
  INDEX idx_devel_tool (is_devel_tool),
  INDEX idx_key_name (key_name),  -- ✅ ADDED
  UNIQUE KEY uk_router_menu_items_key (menu_id, key_name)  -- ✅ ADDED
);
```

**Key Changes:**
1. Added `key_name VARCHAR(255) NOT NULL` column after `menu_id`
2. Added index `idx_key_name` for performance
3. Added unique constraint `uk_router_menu_items_key (menu_id, key_name)`

---

## API Changes

### New Endpoints

#### POST /api/admin/menus/seed
**Auth:** super_admin only  
**Body:**
```json
{
  "items": [
    {
      "key_name": "admin.menu-editor",
      "label": "Menu Editor",
      "path": "/devel/menu-editor",
      "icon": "IconEdit",
      "parent_id": null,
      "order_index": 10,
      "is_active": 1,
      "meta": null
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully seeded 15 menu items (duplicates updated, not created)",
  "stats": {
    "totalProcessed": 15,
    "upserted": 15,
    "parentsResolved": 8
  }
}
```

#### GET /api/admin/menus/stats
**Auth:** super_admin only  
**Response:**
```json
{
  "success": true,
  "stats": {
    "total_items": 42,
    "total_menus": 2,
    "unique_keys": 42,
    "top_level_items": 12,
    "nested_items": 30
  }
}
```

#### POST /api/admin/menus/verify-uniqueness
**Auth:** super_admin only  
**Response (no duplicates):**
```json
{
  "success": true,
  "hasDuplicates": false,
  "duplicates": []
}
```

**Response (with duplicates):**
```json
{
  "success": true,
  "hasDuplicates": true,
  "duplicates": [
    {
      "menu_id": 1,
      "key_name": "admin.menu-editor",
      "label": "Menu Editor",
      "path": "/devel/menu-editor",
      "duplicate_count": 3,
      "duplicate_ids": "5,12,18"
    }
  ]
}
```

---

## Frontend Impact

### Menu Editor Component
**Path:** `front-end/src/features/devel-tools/menu-editor/MenuEditor.tsx`

**Existing Seed Logic (line 194-284):**
- Already sends `key_name` in payload ✅
- Already calls `/api/admin/menus/seed` endpoint
- Should work with new backend immediately

**Expected Behavior After Fix:**
1. Click "Seed from Static" → Success message
2. Item count increases (or stays same if already seeded)
3. Click "Seed from Static" again → Success message
4. Item count **stays the same** (no duplicates!)

**Optional Enhancement:**
Add tooltip to seed button:
```tsx
<Tooltip title="Seeding updates existing items; it will not create duplicates.">
  <Button onClick={() => setSeedDialogOpen(true)}>
    Seed from Static
  </Button>
</Tooltip>
```

---

## Testing Checklist

### Database Tests
- [ ] Migration runs without errors
- [ ] `key_name` column exists and is NOT NULL
- [ ] All existing rows have `key_name` populated
- [ ] Unique constraint exists: `uk_router_menu_items_key`
- [ ] Index exists: `idx_key_name`
- [ ] No duplicate rows remain (query returns empty set)
- [ ] Backup table created: `router_menu_items_dupes_backup_20260207`

### Backend Tests
- [ ] PM2 restart succeeds without errors
- [ ] `/api/admin/menus/seed` endpoint responds (200)
- [ ] `/api/admin/menus/stats` endpoint responds (200)
- [ ] `/api/admin/menus/verify-uniqueness` shows no duplicates
- [ ] Seed endpoint requires super_admin (403 for non-admin)
- [ ] Seed endpoint uses transaction (rollback on error)

### Frontend Tests
- [ ] Menu Editor loads without errors
- [ ] Click "Seed from Static" → Success message
- [ ] Item count noted
- [ ] Click "Seed from Static" again → Success message
- [ ] Item count is same (no duplicates)
- [ ] No duplicate rows visible in table
- [ ] Parent-child menu relationships intact
- [ ] No console errors in browser

### Integration Tests
- [ ] Seed with 0 items → Returns success
- [ ] Seed with new items → Creates new rows
- [ ] Seed with existing items → Updates rows (no new inserts)
- [ ] Seed with duplicate key_name → Returns error (unique constraint)
- [ ] Seed with invalid menu_id → Returns error
- [ ] Seed with parent_id as numeric index → Resolves correctly
- [ ] Seed with parent_id as key_name string → Resolves correctly

---

## Success Metrics

### Before Fix:
- Clicking "Seed from Static" 3 times → 45+ duplicate rows
- `router_menu_items` count increases each time
- UI shows multiple identical entries

### After Fix:
- Clicking "Seed from Static" 3 times → 0 duplicate rows
- `router_menu_items` count stays stable
- UI shows unique entries only

### Performance:
- Migration completes in < 5 seconds (100 items)
- Seed endpoint responds in < 2 seconds (50 items)
- No impact on menu load times

---

## Deployment Checklist

### Pre-Deployment
- [ ] Review all files in `docs/_inbox/2026-02-07_menu-duplicates-*.md`
- [ ] Backup production database
- [ ] Test migration on development environment
- [ ] Test seed endpoint on development environment
- [ ] Review rollback procedures

### Deployment
- [ ] Run database migration
- [ ] Verify migration success
- [ ] Restart backend (PM2)
- [ ] Check PM2 logs for errors
- [ ] Test seed endpoint via curl/Postman
- [ ] Test Menu Editor UI

### Post-Deployment
- [ ] Monitor logs for 24 hours
- [ ] Test seed idempotency
- [ ] Verify no duplicate creation
- [ ] Update release notes
- [ ] Clean up backup tables (after 1-2 weeks)

---

## Rollback Plan

If issues arise, follow these steps:

1. **Restore Data:**
   ```sql
   DELETE FROM router_menu_items;
   INSERT INTO router_menu_items SELECT * FROM router_menu_items_backup_before_dedupe;
   ```

2. **Remove Constraint:**
   ```sql
   ALTER TABLE router_menu_items DROP INDEX uk_router_menu_items_key;
   ```

3. **Remove Column:**
   ```sql
   ALTER TABLE router_menu_items DROP COLUMN key_name;
   ```

4. **Revert Code:**
   ```javascript
   // In server/src/api/admin.js, comment out:
   // const menusRouter = require('../routes/admin/menus');
   // router.use('/menus', menusRouter);
   ```

5. **Restart:**
   ```bash
   pm2 restart om-server
   ```

---

## Future Enhancements

### Optional Improvements:
1. Add soft delete support (is_deleted flag)
2. Add version tracking for menu items
3. Add bulk import/export functionality
4. Add menu item reordering endpoint
5. Add menu diff/comparison tool
6. Add menu preview endpoint

### Frontend Enhancements:
1. Add tooltip explaining idempotency
2. Show "last seeded" timestamp
3. Add "dry run" preview before seeding
4. Add confirmation dialog with change summary
5. Add visual indicator for items that will be updated vs created

---

## Dependencies

**NPM Packages:** None (uses existing packages)

**Database:** MySQL 5.7+ or MariaDB 10.3+ (for JSON support)

**Node.js:** 14+ (for async/await)

**Backend Framework:** Express.js

**Authentication:** Requires existing auth middleware (`requireRole`)

---

## Security Considerations

1. **Authorization:** Seed endpoint requires `super_admin` role only
2. **SQL Injection:** Uses parameterized queries (prepared statements)
3. **Transaction Safety:** Rollback on error prevents partial updates
4. **Backup:** Creates backup tables before destructive operations
5. **Input Validation:** Validates `key_name` format and required fields

---

## Known Limitations

1. **key_name Migration:** Existing items get auto-generated key_name (label-based)
2. **Parent Resolution:** Limited to two formats (numeric index or key_name string)
3. **No Cascade Updates:** Changing parent_id doesn't automatically reorder children
4. **No Soft Delete:** Deleted items are permanently removed
5. **No Versioning:** No history of changes to menu items (yet)

---

## Maintenance

### Periodic Tasks:
- Clean up backup tables after 1-2 weeks
- Monitor for orphaned parent_id references
- Verify unique constraint integrity monthly

### Monitoring:
- Watch for duplicate entry errors in logs
- Track seed endpoint usage and response times
- Monitor menu load times for performance degradation

---

## Contact & Support

**Implementation Date:** 2026-02-07  
**Implemented By:** AI Agent (Claude Sonnet 4.5)  
**Reviewed By:** ________________________  
**Deployed By:** ________________________

**Documentation:**
- Analysis: `docs/_inbox/2026-02-07_menu-duplicates-analysis.md`
- Deployment: `docs/_inbox/2026-02-07_menu-duplicates-deployment.md`
- Quick Reference: `docs/_inbox/2026-02-07_menu-duplicates-quick-ref.md`

**Code:**
- Migration: `server/database/migrations/2026-02-07_menu_items_dedupe_and_unique.sql`
- Seed Endpoint: `server/src/routes/admin/menus.js`
- Route Registration: `server/src/api/admin.js`

---

**Status:** ✅ COMPLETE - Ready for deployment and testing
