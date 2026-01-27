# Router Export Fix

## Problem

The TypeScript compiler (`tsc`) compiles `export default router;` to `exports.default = router;` but does NOT add `module.exports = router;` for CommonJS compatibility.

When `require('./routes/churchOcrRoutes')` is called:
- **Without fix:** Returns `{ default: router }` (object)
- **With fix:** Returns `router` directly (function)

The code in `dist/index.js` does `churchOcrRouter.default || churchOcrRouter`, which works, but having `module.exports = router` ensures direct compatibility.

## Solution

1. **Automatic Fix (Recommended):**
   The build process now automatically fixes exports:
   ```bash
   npm run build:ts  # Automatically runs fix-router-exports.js
   ```

2. **Manual Fix:**
   ```bash
   node scripts/fix-router-exports.js
   ```

3. **Verify Fix:**
   ```bash
   grep -A 2 "exports.default" dist/routes/churchOcrRoutes.js
   ```
   Should show:
   ```javascript
   exports.default = router;
   // CommonJS compatibility: make require() return router directly
   module.exports = router;
   module.exports.default = router;
   ```

## Files Modified

- `server/scripts/fix-router-exports.js` - Post-build script to add CommonJS exports
- `server/package.json` - Updated `build:ts` to run fix script automatically
- `server/dist/routes/churchOcrRoutes.js` - Fixed exports (will be overwritten on next build)

## Next Steps

After fixing exports:
1. Restart server: `pm2 restart orthodox-backend`
2. Check logs for router loading messages
3. Test endpoints: `node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001`
