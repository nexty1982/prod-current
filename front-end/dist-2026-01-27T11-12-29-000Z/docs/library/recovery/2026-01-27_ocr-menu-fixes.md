# OCR Menu Fixes

**Date:** 2025-12-08

## Issues Found

### 1. ✅ FIXED: OCR Upload App Menu Link
**Problem:** The Apps menu (top navigation) had "OCR Upload" pointing to `/apps/ocr-upload`, but this route didn't exist, causing users to see a maintenance/404 page.

**Solution:** Added route for `/apps/ocr-upload` that renders `OCRStudioPage`.

**Location:** `src/routes/Router.tsx` (line ~762)

### 2. ⚠️ ISSUE: Broken "Church OCR" Link
**Problem:** In the sidebar menu under "🔗 Broken Links", there's a "Church OCR" item pointing to `/admin/church/:id/ocr` which doesn't exist.

**Current Status:** This route is not defined in Router.tsx.

**Options:**
- **Option A:** Remove from "Broken Links" menu (if not needed)
- **Option B:** Create route `/admin/church/:id/ocr` that redirects to `/devel/ocr-studio/church/:id`
- **Option C:** Update the link to point to `/devel/ocr-studio/church/:id` (but this requires dynamic church ID)

**Recommendation:** Remove from "Broken Links" menu since OCR Studio already has church selection functionality.

### 3. ✅ GOOD: OCR Studio in Developer Tools
**Status:** OCR Studio is correctly listed in the sidebar under "🛠️ Developer Tools" at `/devel/ocr-studio`.

**Note:** This is only visible to users with `super_admin`, `admin`, or `church_admin` roles.

---

## Current OCR Menu Items

### Apps Menu (Top Navigation)
- ✅ **OCR Upload** → `/apps/ocr-upload` (now working, points to OCR Studio)

### Sidebar Menu
- ✅ **OCR Studio** → `/devel/ocr-studio` (under Developer Tools)
- ⚠️ **Church OCR** → `/admin/church/:id/ocr` (broken link, in "Broken Links" section)

---

## Recommendations

1. ✅ **DONE:** Fixed `/apps/ocr-upload` route
2. 🔧 **TODO:** Remove or fix "Church OCR" broken link in MenuItems.ts
3. 💡 **SUGGESTION:** Consider adding OCR Studio to a more accessible location for church admins (not just Developer Tools)

---

## Files Modified

- `src/routes/Router.tsx` - Added `/apps/ocr-upload` route

## Files to Review

- `src/layouts/full/vertical/sidebar/MenuItems.ts` - Line ~562, "Church OCR" broken link

