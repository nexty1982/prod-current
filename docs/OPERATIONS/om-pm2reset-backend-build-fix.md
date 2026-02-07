# Quick Fix: Backend Not Built Error

**Issue**: `[PM2][ERROR] Error: Script not found: /var/www/orthodoxmetrics/prod/server/dist/index.js`

---

## 🔴 The Problem

The backend hasn't been built yet. PM2 is looking for the compiled JavaScript file at `server/dist/index.js`, but it doesn't exist because the TypeScript hasn't been compiled.

---

## ✅ Solution 1: Use Updated Script (Recommended)

The updated `om-pm2reset.sh` (v1.2) now handles this automatically!

```bash
# Run the updated script
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh

# When prompted: "Would you like to build the backend now? (y/N)"
# Press: y

# Script will:
# 1. Run npm install (if needed)
# 2. Run npm run build
# 3. Start both services successfully
```

---

## ✅ Solution 2: Manual Build

If you prefer to build manually:

```bash
# 1. Navigate to server directory
cd /var/www/orthodoxmetrics/prod/server

# 2. Install dependencies (if not already done)
npm install

# 3. Build the backend
npm run build

# 4. Verify build succeeded
ls -la dist/index.js
# Should see: -rw-r--r-- 1 user group [size] [date] dist/index.js

# 5. Start/restart services
pm2 restart orthodox-backend
# Or use the reset script
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

---

## 🧪 Verify It's Fixed

```bash
# 1. Check PM2 status
pm2 list

# Should show:
# orthodox-backend | online
# om-librarian     | online

# 2. Check backend is responding
curl http://localhost:3001/health
# Should return JSON response

# 3. Check logs for errors
pm2 logs orthodox-backend --lines 20
```

---

## 📋 Build Process Explained

### What `npm run build` Does

1. **Compiles TypeScript** → JavaScript
   - Source: `server/src/**/*.ts`
   - Output: `server/dist/**/*.js`

2. **Validates Types** - Catches type errors

3. **Optimizes Code** - Production-ready output

### Build Time
- First build: ~30-60 seconds
- Subsequent builds: ~10-30 seconds

### Disk Space
- `node_modules`: ~200-300 MB
- `dist`: ~5-10 MB

---

## 🐛 Troubleshooting

### Build Fails with "Cannot find module"

```bash
# Clean install
cd /var/www/orthodoxmetrics/prod/server
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Build Fails with TypeScript Errors

```bash
# Check TypeScript version
npx tsc --version

# View detailed errors
npm run build 2>&1 | less
```

### No Space Left on Device

```bash
# Check disk space
df -h

# Clean npm cache if needed
npm cache clean --force

# Remove old logs
pm2 flush
```

### Permission Denied

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/orthodoxmetrics/prod/server

# Or run with sudo
sudo npm run build
```

---

## 🎯 One-Command Fix

For the impatient:

```bash
cd /var/www/orthodoxmetrics/prod/server && npm install && npm run build && pm2 restart orthodox-backend && pm2 list
```

---

## 📚 Related Commands

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Type checking only (no build)
npm run type-check

# Clean build
rm -rf dist && npm run build

# Production build with optimizations
NODE_ENV=production npm run build
```

---

## ✅ Checklist

After building, verify:
- [ ] `server/dist/index.js` exists
- [ ] `pm2 list` shows backend as "online"
- [ ] `curl http://localhost:3001/health` returns response
- [ ] No errors in `pm2 logs orthodox-backend`

---

**Quick Fix**: Run the updated script and let it build for you!

```bash
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```
