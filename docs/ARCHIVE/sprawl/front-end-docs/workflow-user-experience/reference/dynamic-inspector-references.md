# Files That Reference `om.dynamicInspector` localStorage Key

## Summary

The localStorage key `om.dynamicInspector` is defined and used in the following files:

---

## Primary Definition

### `front-end/src/store/enhancedTableStore.ts`
- **Line 105**: `const STORAGE_KEY = 'om.dynamicInspector';`
- **Usage**:
  - **Line 117**: `localStorage.getItem(STORAGE_KEY)` - Loads state from localStorage
  - **Line 141**: `localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))` - Saves state to localStorage

This is the **only file** that directly references the `om.dynamicInspector` localStorage key string.

---

## Files That Use `enhancedTableStore` (Indirect References)

These files import and use `enhancedTableStore`, which internally uses the `om.dynamicInspector` key:

### 1. `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
- **Line 78**: `import { enhancedTableStore } from '../../../../store/enhancedTableStore';`
- **Usage**:
  - Line 452: `const [enhancedTableState, setEnhancedTableState] = useState(enhancedTableStore.getState());`
  - Line 456: Subscribes to store changes
  - Line 1220: Updates store via bridge effect (`enhancedTableStore.setState()`)
  - Line 2861: Uses `enhancedTableState.tokens.headerBg` for AG Grid theming
  - Reads `enhancedTableState.tokens` throughout for styling

### 2. `front-end/src/features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx`
- **Line 51**: `import { enhancedTableStore, THEME_MAP, LiturgicalThemeKey, ThemeTokens, FieldStyleRule, Branding } from '../../../../store/enhancedTableStore';`
- **Usage**:
  - Line 519: `const [state, setState] = useState(enhancedTableStore.getState());`
  - Line 527: Subscribes to store for theme configuration
  - Line 534: Exports configuration (`enhancedTableStore.exportConfig()`)
  - Line 561: Updates branding (`enhancedTableStore.setBranding()`)
  - Line 650: Sets liturgical theme (`enhancedTableStore.setLiturgicalTheme()`)
  - Line 651: Updates field rules (`enhancedTableStore.setFieldRules()`)
  - Line 653: Imports configuration (`enhancedTableStore.importConfig()`)

---

## How It Works

1. **Storage Key Definition**: `enhancedTableStore.ts` defines `STORAGE_KEY = 'om.dynamicInspector'`

2. **Loading**: On initialization, `EnhancedTableStore` loads state from localStorage using this key:
   ```typescript
   const stored = localStorage.getItem(STORAGE_KEY);
   ```

3. **Saving**: Whenever state changes, it saves to localStorage:
   ```typescript
   localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
   ```

4. **Indirect Usage**: Other components import `enhancedTableStore` and use its methods, but don't directly reference the localStorage key string.

---

## Data Structure

The `om.dynamicInspector` localStorage entry stores:

```typescript
{
  liturgicalTheme: 'orthodox_traditional' | 'great_lent' | 'pascha' | 'nativity' | 'palm_sunday' | 'theotokos_feasts',
  tokens: {
    headerBg: string,
    headerText: string,
    rowOddBg: string,
    rowEvenBg: string,
    border: string,
    accent: string,
    cellText: string,
  },
  fieldRules: FieldStyleRule[],
  branding: {
    churchName?: string,
    logoUrl?: string,
    logoPreview?: string,
    logoAlign?: 'left' | 'center' | 'right',
    showBrandHeader?: boolean,
  }
}
```

---

## Notes

- Only **one file** (`enhancedTableStore.ts`) directly references the string `'om.dynamicInspector'`
- All other files use the store indirectly through imports
- The key is stored as a constant `STORAGE_KEY` to avoid typos and enable easy refactoring
- The store automatically loads from localStorage on initialization and saves on every state change

