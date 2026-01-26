# Process.env Fix for Vite Frontend

## Problem

Dev server showed blank page with error:
```
Uncaught ReferenceError: process is not defined
at featureFlags.ts:15
```

**Root Cause**: Vite doesn't provide `process.env` in browser code. It uses `import.meta.env` instead.

## Solution

### 1. Fixed `featureFlags.ts`

**File**: `front-end/src/config/featureFlags.ts`

**Before** (line 15):
```typescript
enableRecipientPages: process.env.VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS === 'true',
```

**After**:
```typescript
import { getEnvBool } from '@/utils/env';

// ...
enableRecipientPages: getEnvBool('ENABLE_INTERACTIVE_REPORT_RECIPIENTS', false),
```

### 2. Created Environment Utility Helper

**File**: `front-end/src/utils/env.ts` (NEW)

Provides safe, type-aware access to Vite environment variables:

- `getEnvBool(key, defaultValue)`: Normalizes "true/1/yes/on" to boolean
- `getEnvString(key, defaultValue)`: Returns string value
- `getEnvNumber(key, defaultValue)`: Returns number value
- `isDev()`: Check if in development mode
- `isProd()`: Check if in production mode
- `getMode()`: Get current mode

**Example Usage**:
```typescript
import { getEnvBool } from '@/utils/env';

const enabled = getEnvBool('ENABLE_FEATURE', false);
```

### 3. Verified Other Files

Checked and confirmed:
- ✅ `main.tsx`: Already uses `import.meta.env` correctly
- ✅ `vite.config.ts`: Uses `process.env` (correct - runs in Node.js)
- ✅ No other browser code uses `process.env`

### 4. Documentation

Created `front-end/VITE_ENV_VARS.md` with:
- Usage guidelines
- Available environment variables
- Migration guide from `process.env`
- Helper function documentation

## Files Changed

1. **`front-end/src/config/featureFlags.ts`**
   - Replaced `process.env.VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS` with `getEnvBool('ENABLE_INTERACTIVE_REPORT_RECIPIENTS', false)`
   - Added import for `getEnvBool` helper

2. **`front-end/src/utils/env.ts`** (NEW)
   - Environment variable utility functions
   - Type-safe access to `import.meta.env`

3. **`front-end/vite.config.ts`**
   - Added comment clarifying that `process.env` is OK here (runs in Node.js)

4. **`front-end/VITE_ENV_VARS.md`** (NEW)
   - Documentation for environment variables
   - Usage examples
   - Migration guide

## VITE_ Environment Variables Used

1. **`VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS`** (boolean)
   - Default: `false`
   - Used in: `src/config/featureFlags.ts`
   - Purpose: Enables interactive report recipient pages

2. **`VITE_DEBUG_BUILD`** (boolean)
   - Default: `false`
   - Used in: `vite.config.ts` (Node.js context)
   - Purpose: Enables debug builds with sourcemaps

3. **`VITE_ENABLE_MOCKS`** (boolean)
   - Default: `false`
   - Used in: `src/main.tsx`
   - Purpose: Enables mock service worker in development

## Testing

### Before Fix
- ❌ Blank page in dev
- ❌ Console error: "process is not defined"

### After Fix
- ✅ Dev server renders UI correctly
- ✅ No "process is not defined" errors
- ✅ Feature flags work with safe defaults

## Verification Steps

1. Start dev server:
   ```bash
   cd front-end
   npm run dev
   ```

2. Check browser console:
   - Should see no "process is not defined" errors
   - App should render normally

3. Test feature flag:
   - Set `VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS=true` in `.env`
   - Restart dev server
   - Feature flag should be enabled

## Prevention

To prevent this from recurring:

1. **Use helper functions**: Always use `getEnvBool`, `getEnvString`, `getEnvNumber` from `@/utils/env`
2. **Never use `process.env` in browser code**: Use `import.meta.env` or helpers
3. **Lint rule** (optional): Add ESLint rule to catch `process.env` in browser code:
   ```json
   {
     "rules": {
       "no-restricted-globals": ["error", {
         "name": "process",
         "message": "Use import.meta.env or @/utils/env helpers instead of process.env in browser code"
       }]
     }
   }
   ```

## Status

✅ **Complete**
- Fixed `featureFlags.ts`
- Created environment utility helpers
- Verified no other `process.env` usage in browser code
- Documented environment variables

---

**Date**: 2025-01-XX
