# Advanced Grid Crash and 403 Spam Fix

## Summary

Fixed three critical issues:
1. **Runtime crash**: `filteredRecords is not defined` in Advanced Grid view
2. **403 spam**: Repeated 403 errors from admin endpoints flooding console
3. **Missing asset**: 404 for `bgtile1.png` causing network errors

---

## Part A: Fixed `filteredRecords is not defined`

### Problem
`fetchFieldMappings` function referenced `filteredRecords` which doesn't exist in that scope. `filteredRecords` is computed later as `filteredAndSortedRecords` via `useMemo`.

### Root Cause
`filteredRecords` was used in `fetchFieldMappings` (called early in component lifecycle) but it's not defined until `filteredAndSortedRecords` is computed (line 1706). The function tried to use a variable that doesn't exist.

### Solution

**File**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

**Changes**:
1. Replaced `filteredRecords` with `records` directly in `fetchFieldMappings` (lines 1309, 1332, 1386)
2. `records` is always available and contains the unfiltered data, which is sufficient for inferring columns

**Before**:
```typescript
const currentRecords = filteredRecords.length > 0 ? filteredRecords : records;
```

**After**:
```typescript
// Use records directly (filteredRecords is computed later, not available here)
const currentRecords = records;
```

**Why this works**:
- `records` is available from the start (state variable)
- For column inference, we don't need filtered data - any record will do
- `filteredAndSortedRecords` is computed later and used for display, not for column inference

---

## Part B: Fixed 403 Spam for Admin Endpoints

### Problem
Console was flooded with 403 errors from:
- `/api/admin/churches/:id/record-settings`
- `/api/admin/churches/:id/themes`
- `/api/admin/churches/.../_records/columns`

These endpoints are admin-only and fail for non-admin users, causing repeated errors.

### Solution

**File**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`

#### 1. Updated `loadRecordSettings` (line ~627)
- Replaced direct `fetch` with `safeAdminFetch` from `adminEndpointCache`
- Removed `console.error` spam
- Graceful fallback to default settings on 403/404

**Before**:
```typescript
const response = await fetch(`/api/admin/churches/${selectedChurch}/record-settings`, {
  credentials: 'include',
});
if (response.ok) { ... }
```

**After**:
```typescript
const result = await safeAdminFetch(`/api/admin/churches/${selectedChurch}/record-settings`);
if (result?.ok && result.data?.settings) {
  setRecordSettings(result.data.settings);
} else {
  // Use default settings (no console spam)
  setRecordSettings({ ...defaults });
}
```

#### 2. Updated `loadCustomThemes` (line ~684)
- Replaced direct `fetch` with `safeAdminFetch`
- Removed `console.error` spam
- Silent fallback (no logging for expected 403s)

**Before**:
```typescript
const response = await fetch(`/api/admin/churches/${selectedChurch}/themes`, {
  credentials: 'include',
});
if (response.ok) { ... }
catch (err) {
  console.error('Error loading custom themes:', err);
}
```

**After**:
```typescript
const result = await safeAdminFetch(`/api/admin/churches/${selectedChurch}/themes`);
if (result?.ok && result.data?.themes && Object.keys(result.data.themes).length > 0) {
  enhancedTableStore.setCustomThemes(result.data.themes);
}
// If 403/404 or no themes, silently use defaults (no console spam)
```

**Note**: The `_records/columns` endpoint is already handled by `fetchFieldMappings` which uses `safeAdminFetch`.

---

## Part C: Fixed Missing `bgtile1.png` Asset

### Problem
404 error for `/images/bgtile1.png` (or `/images/bgtiled1.png`).

### Root Cause
Header component was looking for `/images/bgtiled${headerBackground}.png` but the actual files are in `/images/backgrounds/bgtiled{number}.png`.

### Solution

**File**: `front-end/src/layouts/full/vertical/header/Header.tsx`

**Changes**:
1. Updated path to use `/images/backgrounds/bgtiled${headerBackground}.png`
2. Changed default authenticated background from `bgtiled.png` to gradient (file may not exist)

**Before**:
```typescript
if (headerBackground) {
  return `url(/images/bgtiled${headerBackground}.png) repeat`;
}
if (authenticated) {
  return `url(/images/bgtiled.png) repeat`;
}
```

**After**:
```typescript
if (headerBackground) {
  // Files are at /images/backgrounds/bgtiled{number}.png
  return `url(/images/backgrounds/bgtiled${headerBackground}.png) repeat`;
}
if (authenticated) {
  // Use gradient as default instead of potentially missing bgtiled.png
  return 'linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%)';
}
```

**File locations**:
- Actual files: `front-end/public/images/backgrounds/bgtiled1.png`, `bgtiled2.png`, etc.
- Code now references: `/images/backgrounds/bgtiled${headerBackground}.png`

---

## Files Changed

1. **`front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`**
   - Fixed `filteredRecords` references (3 locations: lines ~1309, 1332, 1386)
   - Updated `loadRecordSettings` to use `safeAdminFetch` (line ~627)
   - Updated `loadCustomThemes` to use `safeAdminFetch` (line ~684)

2. **`front-end/src/layouts/full/vertical/header/Header.tsx`**
   - Fixed `bgtiled` image path to use `/images/backgrounds/` (line ~30)
   - Changed default authenticated background to gradient (line ~34)

---

## Verification

### Before Fix
- ❌ Advanced Grid crashes with "filteredRecords is not defined"
- ❌ Console flooded with 403 errors
- ❌ 404 for `bgtile1.png`

### After Fix
- ✅ Advanced Grid renders without crash
- ✅ Console has no 403 spam (single warning per endpoint per session)
- ✅ No 404 for background images (correct path or gradient fallback)

### Testing Steps

1. **Test Advanced Grid**:
   - Navigate to: `/apps/records/baptism?church=46&view=advanced`
   - Should render without crash
   - Search/filter should work

2. **Test Console**:
   - Open DevTools Console
   - Should see at most ONE warning per admin endpoint per session
   - No repeated 403 errors

3. **Test Background Images**:
   - Check Network tab
   - Should see no 404 for `bgtile1.png` or `bgtiled1.png`
   - If `headerBackground=1`, should load `/images/backgrounds/bgtiled1.png`

---

## Impact

### Runtime Stability
- ✅ Advanced Grid no longer crashes
- ✅ Page loads successfully for all users (admin and non-admin)

### Console Cleanliness
- ✅ No 403 spam (single warning per endpoint per session)
- ✅ No 404 spam for missing images
- ✅ Easier to spot real errors

### User Experience
- ✅ Non-admin users see page with defaults (no broken UI)
- ✅ Background images load correctly or fallback to gradient
- ✅ All features work even when admin endpoints are unavailable

---

**Status**: ✅ Complete
**Date**: 2025-01-XX
