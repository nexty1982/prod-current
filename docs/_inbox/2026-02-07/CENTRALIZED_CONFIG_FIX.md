# Centralized Config - Deployment Script Fix

**Date:** 2026-02-05  
**Issue:** Deployment script was checking wrong path for compiled config files

---

## Problem

The deployment script (`scripts/deploy-config-updates.sh`) was checking for config files at:
```
dist/src/config/index.js  ❌ WRONG
```

But TypeScript compiles them to:
```
dist/config/index.js  ✅ CORRECT
```

This caused the verification step to fail even though the build succeeded.

---

## Fix Applied

Updated `scripts/deploy-config-updates.sh` to check the correct paths:

```bash
# Before (WRONG):
if [ ! -f "dist/src/config/index.js" ]; then

# After (CORRECT):
if [ ! -f "dist/config/index.js" ]; then
```

---

## File Structure

The correct structure after `npm run build`:

```
server/
├── src/
│   └── config/
│       ├── index.ts      ← TypeScript source
│       ├── schema.ts     ← TypeScript source
│       └── redact.ts     ← TypeScript source
└── dist/
    └── config/
        ├── index.js      ← Compiled output ✅
        ├── schema.js     ← Compiled output ✅
        └── redact.js     ← Compiled output ✅
```

**Note:** TypeScript strips the `src/` directory from the output path.

---

## Verification

All three config files are compiled and in the correct location:

```bash
✓ dist/config/index.js exists
✓ dist/config/schema.js exists
✓ dist/config/redact.js exists
```

---

## Updated Scripts

### 1. `scripts/deploy-config-updates.sh`
- ✅ Fixed path checking
- ✅ Now correctly verifies compiled files

### 2. `scripts/verify-config-loaded.sh` (NEW)
- ✅ Comprehensive verification script
- Checks compiled files
- Checks PM2 status
- Checks logs for config loading message
- Tests health endpoint for enhanced fields

---

## Next Steps

Run the deployment script again (it should now pass all checks):

```bash
cd /var/www/orthodoxmetrics/prod
chmod +x scripts/deploy-config-updates.sh
./scripts/deploy-config-updates.sh
```

Or verify the current deployment:

```bash
chmod +x scripts/verify-config-loaded.sh
./scripts/verify-config-loaded.sh
```

---

## Expected Output

After successful deployment, you should see:

```
2/4 Verifying compiled config files...
✓ All config modules compiled successfully
-rw-r--r-- 1 user user  5.2K Feb  5 12:00 dist/config/index.js
-rw-r--r-- 1 user user  2.8K Feb  5 12:00 dist/config/redact.js
-rw-r--r-- 1 user user  3.1K Feb  5 12:00 dist/config/schema.js

3/4 Restarting backend service...
✓ Backend restarted

4/4 Verifying configuration loaded...
✓ Configuration loaded successfully
```

---

**Status:** ✅ FIXED - Deployment script now checks correct paths
