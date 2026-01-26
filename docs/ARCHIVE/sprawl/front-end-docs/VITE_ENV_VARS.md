# Vite Environment Variables

## Overview

This project uses Vite, which exposes environment variables via `import.meta.env`, **not** `process.env`.

Only environment variables prefixed with `VITE_` are exposed to the browser.

## Usage

### In Code

Use the helper utilities from `@/utils/env`:

```typescript
import { getEnvBool, getEnvString, getEnvNumber } from '@/utils/env';

// Boolean flag (defaults to false)
const enabled = getEnvBool('ENABLE_FEATURE', false);

// String value (defaults to '')
const apiUrl = getEnvString('API_URL', 'http://localhost:3001');

// Number value (defaults to 0)
const timeout = getEnvNumber('TIMEOUT_MS', 5000);
```

### Direct Access (Not Recommended)

You can also access directly, but helpers are preferred:

```typescript
// Boolean
const enabled = import.meta.env.VITE_ENABLE_FEATURE === 'true';

// String
const apiUrl = import.meta.env.VITE_API_URL || 'default';

// Number
const timeout = Number(import.meta.env.VITE_TIMEOUT_MS) || 5000;
```

## Available Environment Variables

### Feature Flags

- `VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS` (boolean)
  - Default: `false`
  - Enables interactive report recipient pages
  - Used in: `src/config/featureFlags.ts`

### Build Configuration

- `VITE_DEBUG_BUILD` (boolean)
  - Default: `false`
  - Enables debug builds with sourcemaps
  - Used in: `vite.config.ts` (Node.js context, can use `process.env`)

### Development

- `VITE_ENABLE_MOCKS` (boolean)
  - Default: `false`
  - Enables mock service worker in development
  - Used in: `src/main.tsx`

## Setting Environment Variables

### Local Development

Create a `.env` file in the `front-end/` directory:

```bash
# .env
VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS=true
VITE_DEBUG_BUILD=true
```

### Production

Set environment variables in your deployment environment:

```bash
export VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS=true
```

Or in your CI/CD pipeline:

```yaml
env:
  VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS: "true"
```

## Important Notes

1. **Always prefix with `VITE_`**: Only variables starting with `VITE_` are exposed to the browser
2. **No `process.env` in browser code**: Use `import.meta.env` or the helper utilities
3. **Type safety**: Environment variables are always strings, use helpers to convert
4. **Build-time only**: Environment variables are replaced at build time, not runtime

## Helper Functions

See `src/utils/env.ts` for:
- `getEnvBool(key, defaultValue)`: Normalizes "true/1/yes/on" to boolean
- `getEnvString(key, defaultValue)`: Returns string value
- `getEnvNumber(key, defaultValue)`: Returns number value
- `isDev()`: Check if in development mode
- `isProd()`: Check if in production mode
- `getMode()`: Get current mode

## Migration from process.env

If you see `process.env` in browser code, replace it:

```typescript
// ❌ Wrong (causes "process is not defined" error)
const value = process.env.VITE_FEATURE_FLAG;

// ✅ Correct
import { getEnvBool } from '@/utils/env';
const value = getEnvBool('FEATURE_FLAG', false);

// ✅ Also correct (direct access)
const value = import.meta.env.VITE_FEATURE_FLAG === 'true';
```
