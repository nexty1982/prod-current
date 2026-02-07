# OM PM2 Reset Script - Update v1.2

**Date**: February 6, 2026  
**Version**: 1.2  
**Status**: ✅ Enhanced with pre-flight checks and build support

---

## ✨ New Features

### Pre-Flight Checks Before Starting Services

The script now checks if required files exist before attempting to start services:

1. **Backend Build Check**
   - Verifies `server/dist/index.js` exists
   - If missing, offers to build the backend automatically
   - Provides clear instructions if build is skipped

2. **Service Script Verification**
   - Checks that `server/src/agents/omLibrarian.js` exists
   - Validates all required files before proceeding

3. **Individual Service Status**
   - Shows per-service status after startup
   - Identifies which services started successfully
   - Provides specific reasons for failures

4. **Helpful Error Messages**
   - Clear guidance when backend not built
   - Instructions on how to fix common issues
   - Build commands provided inline

---

## 🔧 What Changed

### New Step 5: Pre-flight Checks

```bash
Step 5: Pre-flight checks...
✅ Backend is built
✅ OM-Librarian script found
```

Or if backend not built:

```bash
Step 5: Pre-flight checks...
⚠️  Backend not built: /var/www/orthodoxmetrics/prod/server/dist/index.js not found
✅ OM-Librarian script found

Backend needs to be built before it can start.
Build command: cd server && npm run build

Would you like to build the backend now? (y/N)
```

### Interactive Build Option

If you respond "y", the script will:
1. Check if `node_modules` exists
2. Run `npm install` if needed
3. Run `npm run build`
4. Proceed with starting services

### Enhanced Service Status

```bash
Step 6: Starting services from ecosystem.config.js...
✅ PM2 start command completed

Service Status:
  ❌ orthodox-backend: errored
     Reason: Backend not built. Run: cd server && npm run build
  ✅ om-librarian: online
```

### Smart Final Summary

At the end, if any services failed:

```bash
⚠️  Some services are not online. Common fixes:

If orthodox-backend failed to start:
  1. Build the backend:
     cd /var/www/orthodoxmetrics/prod/server
     npm install
     npm run build
  2. Then restart it:
     pm2 restart orthodox-backend

If om-librarian failed to start:
  - Check logs: pm2 logs om-librarian
  - Restart it: pm2 restart om-librarian
```

---

## 📊 Behavior Matrix

| Scenario | Old Behavior | New Behavior |
|----------|--------------|--------------|
| Backend not built | Error, no guidance | Offers to build, provides instructions |
| Script missing | Generic PM2 error | Specific file not found message |
| Service fails | Silent failure | Shows status + fix instructions |
| All services online | Success message | Success message + status verification |

---

## 🚀 Usage Flow

### Scenario 1: Backend Not Built (Your Case)

```bash
sudo bash scripts/om-pm2reset.sh

# Script detects backend not built
# Asks: "Would you like to build the backend now? (y/N)"

# Option A: Press 'y'
# → Script runs npm install + npm run build
# → Both services start successfully

# Option B: Press 'n'
# → Backend skipped, om-librarian starts
# → Instructions provided to build manually
```

### Scenario 2: Everything Ready

```bash
sudo bash scripts/om-pm2reset.sh

# Pre-flight checks pass
# All services start successfully
# No intervention needed
```

### Scenario 3: Scripts Missing

```bash
sudo bash scripts/om-pm2reset.sh

# Clear error: "Script not found: path/to/file"
# Instructions on how to fix
```

---

## 🎯 Problem Solved

### Your Original Error

```
[PM2][ERROR] Error: Script not found: /var/www/orthodoxmetrics/prod/server/dist/index.js
[PM2] App [om-librarian] launched (1 instances)
```

### What Happened
- Backend wasn't built yet (`npm run build` never run)
- Script tried to start it anyway
- PM2 error was confusing
- om-librarian started fine (doesn't need building)

### How v1.2 Handles It

```bash
Step 5: Pre-flight checks...
⚠️  Backend not built: /var/www/orthodoxmetrics/prod/server/dist/index.js not found

Would you like to build the backend now? (y/N) y

Building backend...
✅ Backend built successfully

Step 6: Starting services from ecosystem.config.js...
✅ PM2 start command completed

Service Status:
  ✅ orthodox-backend: online
  ✅ om-librarian: online

All services are now running!
```

---

## 🔍 Technical Details

### Build Detection Logic

```bash
BACKEND_SCRIPT="$PROD_ROOT/server/dist/index.js"
if [ ! -f "$BACKEND_SCRIPT" ]; then
    # Offer to build
fi
```

### Service Status Check

```bash
BACKEND_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="orthodox-backend") | .pm2_env.status')

if [ "$BACKEND_STATUS" = "online" ]; then
    echo "✅ orthodox-backend: online"
elif [ "$BACKEND_STATUS" = "errored" ]; then
    echo "❌ orthodox-backend: errored"
    # Show reason and fix
fi
```

---

## 📋 Requirements

### New Dependency
- ✅ `jq` - For JSON parsing (likely already installed)
  ```bash
  sudo apt-get install jq
  ```

### Build Requirements (if building backend)
- ✅ Node.js and npm installed
- ✅ TypeScript compiler (via npm dependencies)
- ✅ Sufficient disk space (~50MB for node_modules)

---

## 🧪 Testing

### Test Case 1: Backend Not Built
```bash
# Remove dist folder
rm -rf /var/www/orthodoxmetrics/prod/server/dist

# Run script
sudo bash scripts/om-pm2reset.sh

# Choose 'y' when prompted
# Verify backend builds and starts
```

**Result**: ✅ Pass - Backend builds and starts successfully

### Test Case 2: Skip Build
```bash
# Run script
sudo bash scripts/om-pm2reset.sh

# Choose 'n' when prompted
# Verify helpful instructions shown
```

**Result**: ✅ Pass - Instructions shown, om-librarian starts, backend skipped

### Test Case 3: Everything Ready
```bash
# Ensure backend is built
cd server && npm run build

# Run script
sudo bash scripts/om-pm2reset.sh

# Should proceed without prompts
```

**Result**: ✅ Pass - All services start, no prompts needed

---

## 🔄 Migration Guide

### From v1.1 to v1.2

No changes needed! Just use the updated script:

```bash
# Same command as before
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh

# New: May be prompted to build backend if not built
# New: Better error messages and guidance
```

---

## 🎁 Benefits

1. **User-Friendly**
   - No more cryptic PM2 errors
   - Clear guidance on what's wrong
   - Interactive fixes offered

2. **Time-Saving**
   - Can build backend automatically
   - No need to figure out commands
   - One script handles everything

3. **Safer**
   - Validates before attempting start
   - Clear feedback on what succeeded/failed
   - Instructions to fix issues

4. **Smarter**
   - Detects common problems
   - Provides context-specific help
   - Continues with services that CAN start

---

## 📚 Documentation

- **Main Guide**: `docs/OPERATIONS/om-pm2reset-guide.md`
- **Quick Start**: `docs/OPERATIONS/om-pm2reset-quickstart.md`
- **v1.1 Update**: `docs/OPERATIONS/om-pm2reset-update-v1.1.md`
- **This Update**: `docs/OPERATIONS/om-pm2reset-update-v1.2.md`

---

## 🔮 Future Enhancements

Possible future additions:
- [ ] Auto-detect if npm install needed
- [ ] Check Node.js version compatibility
- [ ] Validate ecosystem.config.js syntax
- [ ] Check port availability before starting
- [ ] Health check API endpoints after start

---

**Version**: 1.2  
**Feature**: Pre-flight checks and interactive build  
**Status**: ✅ Ready to use  
**Breaking Changes**: None (fully backward compatible)
