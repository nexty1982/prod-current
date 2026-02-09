# Menu Meta Crash Fix - Quick Reference

**Date:** 2026-02-07  
**Issue:** `TypeError: item.meta.trim is not a function`  
**Status:** ✅ FIXED

---

## What Was Fixed

The menu seeding endpoint crashed when `meta` was sent as an **object** because the code expected a **string** and called `.trim()` on it.

---

## Changes Made

### 1. New Function: `normalizeMeta()`
- **Location:** `server/src/services/menuService.ts`
- **Purpose:** Converts meta from any format (string, object, null) to a normalized object or null
- **Handles:**
  - `null`/`undefined` → `null`
  - Empty string → `null`
  - JSON string → parsed object
  - Object → returns as-is
  - Invalid types → throws validation error

### 2. Updated `validateMenuItems()`
- **Before:** `if (item.meta && item.meta.trim() !== '')`
- **After:** Uses `normalizeMeta(item.meta)` to safely handle all meta types
- **Result:** No more crash on object meta

### 3. Updated `upsertMenuItems()`
- **Before:** Stored raw `item.meta`
- **After:** Normalizes meta, then stores as JSON string
- **Benefit:** Consistent DB storage format

### 4. Enhanced Error Handling
- **Validation errors:** Return **400** with `code: "VALIDATION_ERROR"`
- **Server errors:** Return **500** with `code: "INTERNAL_ERROR"`
- **Better messages:** Clear error descriptions

---

## Files Changed

1. ✅ `server/src/services/menuService.ts` - Added normalizeMeta, updated validation and upsert
2. ✅ `server/src/routes/menu.ts` - Enhanced error responses
3. ✅ `server/src/tests/test-meta-normalization.js` - Test script
4. ✅ `docs/_inbox/2026-02-07_menu-meta-crash-fix.md` - Full documentation

---

## Deployment Steps

```bash
# 1. Rebuild backend
cd /var/www/orthodoxmetrics/prod/server
npm run build

# 2. Restart server
pm2 restart orthodox-backend

# 3. Check logs
pm2 logs orthodox-backend --lines 20

# 4. Test seed endpoint
# Open Menu Editor → "Seed from Template" → Should work now!
```

---

## Valid Meta Formats

✅ **Object:** `{ "meta": { "chip": "NEW" } }`  
✅ **JSON string:** `{ "meta": "{\"chip\":\"NEW\"}" }`  
✅ **null:** `{ "meta": null }`  
✅ **Empty string:** `{ "meta": "" }`  

❌ **Array:** `{ "meta": ["invalid"] }` → 400 error  
❌ **Number:** `{ "meta": 123 }` → 400 error

---

## Testing

### Quick Test:
1. Open Menu Editor (`/admin/menu-management`)
2. Click "Seed from Template"
3. Should succeed (no crash!)

### curl Test:
```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION" \
  -d '{
    "items": [{
      "key_name": "test.item",
      "label": "Test",
      "path": "/admin/test",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "meta": {"chip": "TEST"}
    }]
  }'
```

**Expected:** `200 OK` with success message

---

## Rollback

If issues occur:

```bash
# Revert changes
git checkout server/src/services/menuService.ts
git checkout server/src/routes/menu.ts

# Rebuild
cd server && npm run build

# Restart
pm2 restart om-server
```

---

## Success Criteria

- [x] ✅ Code fixed (normalizeMeta created)
- [x] ✅ Validation updated (no more .trim())
- [x] ✅ Upsert updated (normalizes before DB)
- [x] ✅ Error handling improved (400 vs 500)
- [ ] ⏳ Backend rebuilt
- [ ] ⏳ Server restarted
- [ ] ⏳ Seed endpoint tested

---

**Next:** Run `npm run build` and `pm2 restart orthodox-backend`
