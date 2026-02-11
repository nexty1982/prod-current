# Blue Color Source Analysis for AG Grid Headers

## Problem
The AG Grid header is showing blue color (`#1976d2`) even though `--ag-header-background-color` is defined on line 2861 of `BaptismRecordsPage.tsx`.

## Source of Blue Color

### 1. Default Theme in `enhancedTableStore.ts`

**File**: `front-end/src/store/enhancedTableStore.ts`  
**Line**: 50

```typescript
orthodox_traditional: {
  headerBg: '#1976d2',  // ← This is the blue color!
  headerText: '#ffffff',
  rowOddBg: '#fafafa',
  rowEvenBg: '#ffffff',
  border: '#e0e0e0',
  accent: '#1976d2',
  cellText: '#212121',
},
```

**Why it's blue:**
- The default `liturgicalTheme` is `'orthodox_traditional'` (line 132)
- When the store initializes, it loads this theme (line 122)
- `enhancedTableState.tokens.headerBg` will be `'#1976d2'` unless changed

### 2. CSS Variable on Line 2861

**File**: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`  
**Line**: 2861

```typescript
{`#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine{
  --ag-header-background-color:${enhancedTableState.tokens.headerBg}!important;
  ...
}`}
```

**What's happening:**
- The CSS variable is correctly set to `${enhancedTableState.tokens.headerBg}`
- If `enhancedTableState.tokens.headerBg` is `'#1976d2'`, then the header will be blue
- The `!important` flag should override other styles, but the value itself is blue

## Flow of Color Assignment

```
1. enhancedTableStore.ts initializes
   ↓
2. Default theme: 'orthodox_traditional'
   ↓
3. tokens.headerBg = '#1976d2' (blue)
   ↓
4. BaptismRecordsPage.tsx subscribes to store (line 452)
   ↓
5. enhancedTableState.tokens.headerBg = '#1976d2'
   ↓
6. Line 2861: --ag-header-background-color: #1976d2 !important
   ↓
7. AG Grid header displays blue
```

## Potential Issues

### Issue 1: Theme Not Being Updated
If you've changed the theme but it's still blue, check:
- Is `enhancedTableStore.setLiturgicalTheme()` being called?
- Is the store state being persisted in localStorage and not reloading?
- Is the bridge effect (lines 1211-1243) correctly syncing `useTableStyleStore` → `enhancedTableStore`?

### Issue 2: CSS Specificity
Even with `!important`, AG Grid might have more specific selectors. Check:
- Are there inline styles on AG Grid elements?
- Does the AG Grid Alpine theme CSS have hardcoded blue colors?
- Is the dynamic `<style>` tag being applied after AG Grid initializes?

### Issue 3: Store State Not Updating
The component subscribes to the store (line 456), but:
- Is the store actually updating when you change themes?
- Is there a timing issue where the style tag is created before the store updates?

## How to Debug

### Step 1: Check Current Store Value
Add a console log to see what value is actually being used:

```typescript
// Add after line 2861
console.log('Current headerBg:', enhancedTableState.tokens.headerBg);
console.log('Current theme:', enhancedTableState.liturgicalTheme);
```

### Step 2: Check Browser DevTools
1. Open DevTools → Elements
2. Find the AG Grid header element
3. Check computed styles for `background-color`
4. See which CSS rule is actually being applied
5. Check if `--ag-header-background-color` is set correctly

### Step 3: Check Store State
In browser console:
```javascript
// Check localStorage
localStorage.getItem('om.dynamicInspector')

// Check if store is updating
// (You'd need to expose the store or add debugging)
```

## Solutions

### Solution 1: Change the Default Theme
If you want a different default color, change line 50 in `enhancedTableStore.ts`:

```typescript
orthodox_traditional: {
  headerBg: '#your-color-here',  // Change from #1976d2
  ...
}
```

### Solution 2: Ensure Theme is Being Set
Make sure when you select a theme, it's actually calling:

```typescript
enhancedTableStore.setLiturgicalTheme('your-theme-key');
```

### Solution 3: Check the Bridge Effect
The bridge effect (lines 1211-1243) syncs `useTableStyleStore` → `enhancedTableStore`. Make sure:
- `getTableHeaderStyle()` is returning the correct color
- The bridge effect is running when you change themes
- The store is actually updating

### Solution 4: Force Re-render
The `key` prop on `AgGridReact` (line 2872) includes `enhancedTableState.tokens.headerBg`, which should force a re-render when it changes. But you might need to also update the style tag's key:

```typescript
<style key={`ag-grid-theme-${selectedRecordType}-${selectedChurch}-${enhancedTableState.tokens.headerBg}`} id={...}>
```

## Summary

**The blue color `#1976d2` is coming from:**
1. The default `orthodox_traditional` theme in `enhancedTableStore.ts` (line 50)
2. This value flows through to `enhancedTableState.tokens.headerBg`
3. Which is then used in the CSS variable on line 2861

**To fix:**
- Change the theme using `enhancedTableStore.setLiturgicalTheme()`
- Or change the default theme color in `enhancedTableStore.ts`
- Or ensure the bridge effect is correctly syncing your theme changes

