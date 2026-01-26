# Dark Mode Display Issues - Analysis & Fixes

## Date: December 8, 2024

## Issues Found and Fixed

### 1. ✅ SessionManagement Component (`front-end/src/features/auth/admin/SessionManagement.tsx`)
**Issue:** Hardcoded light background colors in table that don't work in dark mode
- Table header: `#f5f5f5` (light gray)
- Table rows: `#ffffff` (white) and `#f9f9f9` (light gray)
- Hover state: `#f0f0f0` (light gray)

**Fix Applied:**
- Added `useTheme` hook
- Made table backgrounds theme-aware:
  - Dark mode: `theme.palette.grey[800]` (header), `theme.palette.grey[900]` and `theme.palette.grey[800]` (rows)
  - Light mode: Original colors preserved
  - Hover: `theme.palette.grey[700]` in dark mode

### 2. ✅ DashboardCard Component (`front-end/src/shared/ui/DashboardCard.tsx`)
**Issue:** Border color uses `theme.palette.grey[100]` which is too light for dark mode

**Fix Applied:**
- Made border color theme-aware:
  - Dark mode: `theme.palette.grey[700]`
  - Light mode: `theme.palette.grey[100]` (original)

### 3. ⚠️ CircularMenu Component (`front-end/src/features/pages/frontend-pages/CircularMenu.tsx`)
**Issue:** Hardcoded white text color (`#FFFFFF`) in MenuLabel
**Status:** Identified but not fixed (intentional design - floating menu with golden glow)
**Note:** This component appears to be a special floating menu with intentional white text and golden glow effects. May need design review to determine if dark mode variant is needed.

### 4. ⚠️ OrthodoxLogin Component (`front-end/src/features/auth/authentication/auth1/OrthodoxLogin.tsx`)
**Issue:** Multiple hardcoded colors (purple, gold gradients)
**Status:** Intentional - Login page has specific branding colors
**Note:** Login pages often have fixed branding that doesn't change with theme

## Pages to Review for Dark Mode

### High Priority
1. **SessionManagement** - ✅ Fixed
2. **DashboardCard** - ✅ Fixed
3. **Any tables with hardcoded backgrounds** - Need to scan

### Medium Priority
1. **CircularMenu** - May need design decision
2. **Forms with hardcoded input colors** - Check form components
3. **Cards with hardcoded backgrounds** - Check card components

### Low Priority
1. **Login/Auth pages** - Usually have fixed branding
2. **Landing pages** - May have intentional color schemes

## Recommendations

1. **Use Theme-Aware Colors:**
   - Always use `theme.palette.mode` to check current theme
   - Use `theme.palette.grey[xxx]` instead of hardcoded grays
   - Use `theme.palette.text.primary` and `theme.palette.text.secondary` for text

2. **Common Patterns:**
   ```typescript
   // Background colors
   backgroundColor: theme.palette.mode === 'dark' 
     ? theme.palette.grey[800] 
     : '#f5f5f5'
   
   // Text colors
   color: theme.palette.text.primary
   
   // Borders
   borderColor: theme.palette.mode === 'dark'
     ? theme.palette.grey[700]
     : theme.palette.grey[100]
   ```

3. **Testing:**
   - Test all admin pages in dark mode
   - Test all data tables
   - Test all forms
   - Test all cards and containers

## Next Steps

1. Scan all feature pages for hardcoded colors
2. Create a dark mode testing checklist
3. Update component library documentation with dark mode guidelines
4. Review CircularMenu design for dark mode compatibility

