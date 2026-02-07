# Menu Seeding Meta Crash Fix

**Date:** 2026-02-07  
**Issue:** TypeError: item.meta.trim is not a function  
**Status:** ✅ FIXED

---

## Problem

When calling `POST /api/admin/menus/seed`, the server crashed with:
```
TypeError: item.meta.trim is not a function
```

**Root Cause:**
- `MenuService.validateMenuItems()` assumed `item.meta` is always a string
- Called `item.meta.trim()` on line 216
- But frontend/template sends `meta` as an **object** (or null)
- TypeScript interface said `meta?: string | null` but actual data was object

---

## Solution

### 1. Created `normalizeMeta()` Helper

**File:** `server/src/services/menuService.ts`

**Function:**
```typescript
export function normalizeMeta(meta: any): Record<string, any> | null {
  // Handle null/undefined → return null
  if (meta === null || meta === undefined) {
    return null;
  }

  // Handle string (JSON)
  if (typeof meta === 'string') {
    const trimmed = meta.trim();
    
    // Empty string → null
    if (trimmed === '') {
      return null;
    }
    
    // Parse JSON
    try {
      const parsed = JSON.parse(trimmed);
      
      // Ensure it's an object (not array or primitive)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('meta must be a JSON object, not array or primitive');
      }
      
      return parsed;
    } catch (e) {
      throw new Error(`meta must be valid JSON: ${e.message}`);
    }
  }

  // Handle object (already parsed)
  if (typeof meta === 'object' && !Array.isArray(meta)) {
    return meta;
  }

  // Invalid type
  throw new Error('meta must be a JSON string or object');
}
```

### 2. Updated `validateMenuItems()`

**Changes:**
- Replaced `item.meta.trim()` with `normalizeMeta(item.meta)`
- Stores normalized result in `item.metaNormalized`
- Catches normalization errors and returns validation error instead of crashing
- Returns 400 with clear error message for bad meta

**Before:**
```typescript
// Line 216 (CRASHED)
if (item.meta && item.meta.trim() !== '') {
  const metaObj = JSON.parse(item.meta);
  // ...validate keys
}
```

**After:**
```typescript
if (item.meta !== null && item.meta !== undefined) {
  try {
    // Normalize meta (handles string, object, null)
    const metaObj = normalizeMeta(item.meta);
    
    // Validate meta keys if meta is not null
    if (metaObj !== null) {
      const metaKeys = Object.keys(metaObj);
      const invalidKeys = metaKeys.filter(key => !ALLOWED_META_KEYS.includes(key));
      
      if (invalidKeys.length > 0) {
        errors.push({
          field: `items[${index}].meta`,
          message: `Invalid meta keys: ${invalidKeys.join(', ')}. Allowed keys: ${ALLOWED_META_KEYS.join(', ')}`,
          value: invalidKeys,
        });
      }
    }
    
    // Store normalized meta for downstream handling
    (item as any).metaNormalized = metaObj;
    
  } catch (e) {
    errors.push({
      field: `items[${index}].meta`,
      message: e instanceof Error ? e.message : 'meta validation failed',
      value: item.meta,
    });
  }
}
```

### 3. Updated `upsertMenuItems()`

**Changes:**
- Uses `normalizeMeta()` before storing in DB
- Converts normalized object to JSON string for storage
- Gracefully handles invalid meta (logs warning, sets to null)

**Before:**
```typescript
item.meta || null  // Passed raw meta to DB
```

**After:**
```typescript
// Normalize meta to ensure it's stored correctly
let metaValue: string | null = null;
if (item.meta !== null && item.meta !== undefined) {
  try {
    const metaObj = normalizeMeta(item.meta);
    metaValue = metaObj ? JSON.stringify(metaObj) : null;
  } catch (e) {
    console.warn(`Warning: Invalid meta for item ${item.key_name}, setting to null:`, e);
    metaValue = null;
  }
}
```

### 4. Enhanced Error Handling in Routes

**File:** `server/src/routes/menu.ts`

**Changes:**
- Validation errors now return **400** with `code: "VALIDATION_ERROR"`
- Unexpected errors return **500** with `code: "INTERNAL_ERROR"`
- Added specific check for meta-related errors
- Better error messages with structured response

**Response Format:**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "error": "Validation failed",
  "details": [
    {
      "field": "items[5].meta",
      "message": "meta must be valid JSON: Unexpected token",
      "value": "{invalid json}"
    }
  ]
}
```

---

## Supported Meta Formats

### ✅ Valid Inputs:

1. **null/undefined:**
   ```json
   { "meta": null }
   ```
   → Stored as: `NULL`

2. **Empty string:**
   ```json
   { "meta": "" }
   ```
   → Stored as: `NULL`

3. **JSON string:**
   ```json
   { "meta": "{\"chip\":\"NEW\",\"chipColor\":\"primary\"}" }
   ```
   → Stored as: `{"chip":"NEW","chipColor":"primary"}`

4. **Object:**
   ```json
   { "meta": { "chip": "NEW", "chipColor": "primary" } }
   ```
   → Stored as: `{"chip":"NEW","chipColor":"primary"}`

### ❌ Invalid Inputs (Return 400):

1. **Array:**
   ```json
   { "meta": ["item1", "item2"] }
   ```
   → Error: "meta must be a JSON string or object"

2. **Number:**
   ```json
   { "meta": 123 }
   ```
   → Error: "meta must be a JSON string or object"

3. **Invalid JSON string:**
   ```json
   { "meta": "{invalid json}" }
   ```
   → Error: "meta must be valid JSON: Unexpected token"

4. **JSON array string:**
   ```json
   { "meta": "[\"item1\",\"item2\"]" }
   ```
   → Error: "meta must be a JSON object, not array or primitive"

---

## Testing

### Manual Test 1: Seed with Object Meta

```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{
    "templateId": "default-superadmins",
    "role": "super_admin",
    "items": [{
      "key_name": "test.item",
      "label": "Test Item",
      "path": "/admin/test",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "parent_key_name": null,
      "meta": {"chip": "TEST", "chipColor": "info"}
    }]
  }'
```

**Expected:** 200 OK with success message

### Manual Test 2: Seed with Null Meta

```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{
    "items": [{
      "key_name": "test.item2",
      "label": "Test Item 2",
      "path": "/admin/test2",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "meta": null
    }]
  }'
```

**Expected:** 200 OK with success message

### Manual Test 3: Seed with Invalid Meta (Array)

```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{
    "items": [{
      "key_name": "test.item3",
      "label": "Test Item 3",
      "path": "/admin/test3",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "meta": ["invalid", "array"]
    }]
  }'
```

**Expected:** 400 with validation error

### Manual Test 4: Seed with Invalid JSON String

```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{
    "items": [{
      "key_name": "test.item4",
      "label": "Test Item 4",
      "path": "/admin/test4",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "meta": "{invalid json}"
    }]
  }'
```

**Expected:** 400 with validation error

---

## Automated Test Script

**File:** `server/src/tests/test-meta-normalization.js`

Run with:
```bash
node server/src/tests/test-meta-normalization.js
```

**Expected Output:**
```
✅ Test 1: null meta - PASSED
✅ Test 2: undefined meta - PASSED
✅ Test 3: empty string meta - PASSED
✅ Test 4: whitespace string meta - PASSED
✅ Test 5: valid JSON string meta - PASSED
✅ Test 6: valid object meta - PASSED
✅ Test 7: invalid JSON string meta - PASSED (error as expected)
✅ Test 8: array meta (invalid) - PASSED (error as expected)
✅ Test 9: number meta (invalid) - PASSED (error as expected)
✅ Test 10: JSON string with array (invalid) - PASSED (error as expected)

📊 Results: 10 passed, 0 failed out of 10 tests
✅ All tests passed!
```

---

## Files Changed

### Modified Files:
1. `server/src/services/menuService.ts` - Added normalizeMeta, updated validateMenuItems and upsertMenuItems
2. `server/src/routes/menu.ts` - Enhanced error handling with proper status codes

### New Files:
1. `server/src/tests/test-meta-normalization.js` - Test script
2. `docs/_inbox/2026-02-07_menu-meta-crash-fix.md` (this file)

---

## Deployment

### Step 1: Rebuild Backend

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
```

**Expected:** TypeScript compiles to `server/dist/`

### Step 2: Restart Backend

```bash
pm2 restart orthodox-backend
pm2 logs orthodox-backend --lines 50
```

**Expected:** No errors on startup

### Step 3: Test Seed Endpoint

**From Menu Editor UI:**
1. Click "Seed from Template"
2. Confirm
3. ✅ Success message (no crash!)

**From curl:**
```bash
# Test with object meta (should work now)
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION" \
  -d '{
    "templateId": "default-superadmins",
    "role": "super_admin",
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

---

## Success Criteria

- [x] ✅ `normalizeMeta()` function created
- [x] ✅ `validateMenuItems()` uses normalizeMeta (no more .trim() crash)
- [x] ✅ `upsertMenuItems()` normalizes meta before DB storage
- [x] ✅ Error handling returns 400 for validation errors (not 500)
- [x] ✅ Error handling returns 500 only for unexpected errors
- [x] ✅ Test script created
- [ ] ⏳ Backend rebuilt (npm run build)
- [ ] ⏳ PM2 restarted
- [ ] ⏳ Seed endpoint tested and working

---

## Rollback Plan

If issues arise:

```bash
# Revert menuService.ts
git checkout server/src/services/menuService.ts

# Revert menu.ts
git checkout server/src/routes/menu.ts

# Rebuild
cd server && npm run build

# Restart
pm2 restart orthodox-backend
```

---

## Next Steps

1. **Build backend:** `cd server && npm run build`
2. **Restart PM2:** `pm2 restart orthodox-backend`
3. **Test seed:** Open Menu Editor → "Seed from Template"
4. **Verify:** No crash, success message appears

---

**Status:** ✅ Code fixed, ready for rebuild and testing
