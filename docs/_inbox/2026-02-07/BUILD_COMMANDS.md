# Backend Build Commands Reference

## New Verbose Build Command ✨

You now have a **verbose build** that shows detailed progress like the deployment scripts!

---

## Build Commands

### 1. Verbose Build (Recommended)
```bash
npm run build:verbose
```

**Shows:**
- ✓ Step-by-step progress (1/7, 2/7, etc.)
- ✓ What each step is doing
- ✓ Success/failure indicators
- ✓ Verification of critical files
- ✓ Next steps after build

**Output Example:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OrthodoxMetrics Backend - Verbose Build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1/7 Cleaning previous build...
✓ Build directory cleaned

2/7 Compiling TypeScript...
✓ TypeScript compiled successfully

3/7 Copying assets and resources...
✓ Assets copied

... (and so on)

✓ Main entry point (dist/index.js)
✓ Config module (dist/config/index.js)
✓ Library routes (dist/routes/library.js)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Build Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. Restart backend: pm2 restart orthodox-backend
  2. Check logs: pm2 logs orthodox-backend --lines 30
```

---

### 2. Verbose Build + Deploy (One Command!)
```bash
npm run build:deploy:verbose
```

**Does:**
- Runs verbose build
- Automatically restarts PM2
- Shows all progress

**Perfect for:** Quick deployments

---

### 3. Standard Build (Silent)
```bash
npm run build
```

**Shows:** Only errors/warnings (original behavior)

---

## Quick Deployment Guide

### From Windows (Your Machine)

**SSH to Linux server first:**
```bash
ssh user@192.168.1.239
```

**Then run:**
```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build:deploy:verbose
```

That's it! One command builds and deploys.

---

### Deployment Verification

After running the build, verify with:

```bash
# Check PM2 status
pm2 status

# Check recent logs
pm2 logs orthodox-backend --lines 30

# Test the fixes
curl http://127.0.0.1:3001/api/system/health
curl http://127.0.0.1:3001/api/library/files | grep -c '"id"'
```

---

## Build Steps Explained

The verbose build runs these 7 steps:

1. **Clean** - Removes old `dist/` folder
2. **Compile TypeScript** - Converts `.ts` to `.js`
3. **Copy Assets** - Copies SQL, config files, etc.
4. **Library Tasks** - Sets up library infrastructure
5. **Verify Build** - Checks all files compiled
6. **Import Checks** - Validates all imports work
7. **Flush Sessions** - Clears stale sessions

Plus verification of critical files after build.

---

## Comparison

| Command | Output | Speed | Restarts PM2? |
|---------|--------|-------|---------------|
| `npm run build` | Minimal | Fast | No |
| `npm run build:verbose` | **Detailed** | Same | No |
| `npm run build:deploy:verbose` | **Detailed** | Same | **Yes** |

---

## When to Use Which

- **`npm run build:verbose`** - When you want to see what's happening during build
- **`npm run build:deploy:verbose`** - When you want to build AND restart in one command
- **`npm run build`** - When running in CI/CD or scripts (silent mode)

---

## Troubleshooting

### Build Fails at a Specific Step

The verbose output will show exactly which step failed:
```
2/7 Compiling TypeScript...
✗ TypeScript compilation failed
```

Check the error output above that line.

### Files Missing After Build

The verbose build checks these critical files:
- `dist/index.js` - Main entry
- `dist/config/index.js` - Config system
- `dist/routes/library.js` - Library API

If any are missing, the verbose output will show ✗.

---

## File Location

**Script:** `server/scripts/build-verbose.js`

To modify what the verbose build shows, edit that file.

---

**Recommended:** Use `npm run build:deploy:verbose` for all manual deployments! 🚀
