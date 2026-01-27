# OrthodoxMetrics Build Commands Reference

Complete list of all `npm run build` commands across the project.

## 📁 Root Directory (`/var/www/orthodoxmetrics/prod`)

**Location:** `/var/www/orthodoxmetrics/prod/package.json`

```bash
npm run build:hardened
```
- **Purpose:** Hardened build harness script
- **Note:** Not a standard build, uses `scripts/build-harness.mjs`

---

## 🖥️ Backend Server (`/server`)

**Location:** `/var/www/orthodoxmetrics/prod/server/package.json`

### Standard Build Commands

```bash
# Full build (recommended)
npm run build
```
- **Steps:** `build:clean` → `build:ts` → `build:copy` → `build:verify`
- **Output:** `server/dist/`

```bash
# Individual build steps
npm run build:clean      # Remove dist directory
npm run build:ts         # TypeScript compilation
npm run build:copy       # Copy non-TS files to dist
npm run build:verify     # Verify build integrity
```

### Deploy Build Commands

```bash
# Full deploy build (builds backend + frontend, restarts PM2)
npm run build:deploy
```
- **Alias:** `build:all`
- **Script:** `scripts/build-all.js`
- **Does:** Builds backend, builds frontend (parallel), restarts PM2

```bash
# Smart deploy build (with restart)
npm run build:deploy:smart
```
- **Script:** `scripts/build-smart.js --restart`
- **Does:** Incremental build based on changes

```bash
# Smart build (no restart)
npm run build:smart
```
- **Script:** `scripts/build-smart.js`
- **Does:** Incremental build without PM2 restart

### Frontend Build (from server directory)

```bash
# Build frontend from server directory
npm run build:frontend
```
- **Does:** `cd ../front-end && npm run build`

### Build Verification

```bash
npm run build:verify:interactive  # Verify interactive reports build
npm run build:verify:db-imports   # Verify database imports
```

### Build History

```bash
npm run build:history        # Record build history
npm run build:history:show   # Show last 20 builds
```

---

## 🎨 Frontend (`/front-end`)

**Location:** `/var/www/orthodoxmetrics/prod/front-end/package.json`

### Production Build

```bash
# Standard production build
npm run build
```
- **Steps:** Vite build + inject build info + verify
- **Output:** `front-end/dist/`
- **Memory:** Uses `--max-old-space-size=4096`

```bash
# Clean production build (removes dist first)
npm run build:clean
```
- **Does:** `rm -rf dist` then build + verify

```bash
# Build verification only
npm run build:verify
```

### Environment-Specific Builds

```bash
npm run build:dev          # Development mode build
npm run build:beta         # Beta build → `dist-beta/`
npm run build:staging      # Staging build → `dist-staging/`
npm run build:experimental # Experimental build → `dist-experimental/`
```

### Watch Mode

```bash
npm run build:watch
```
- **Does:** Production build in watch mode (rebuilds on changes)

---

## 🔧 Ops Hub (`/ops-hub`)

**Location:** `/var/www/orthodoxmetrics/prod/ops-hub/package.json`

**No build command** - This is a simple Node.js service with no build step.

```bash
npm start    # Start the service
npm run dev  # Start with watch mode
```

---

## 📋 Quick Reference: Standard Rebuild Sequence

For a complete rebuild of everything:

```bash
cd /var/www/orthodoxmetrics/prod

# Option 1: Use server's deploy script (recommended)
cd server
npm run build:deploy
# This builds backend + frontend and restarts PM2

# Option 2: Manual step-by-step
cd server
npm run build              # Build backend

cd ../front-end
npm run build              # Build frontend

# Then restart PM2 manually
pm2 restart orthodox-backend
```

---

## 🎯 Most Common Build Commands

### Daily Development
```bash
# Backend only
cd /var/www/orthodoxmetrics/prod/server
npm run build

# Frontend only
cd /var/www/orthodoxmetrics/prod/front-end
npm run build

# Both (from server directory)
cd /var/www/orthodoxmetrics/prod/server
npm run build:deploy
```

### Full Production Rebuild
```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build:deploy
```

### Quick Incremental Build
```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build:smart
```

---

## 📝 Notes

- **Backend builds** output to `server/dist/`
- **Frontend builds** output to `front-end/dist/`
- **Ops Hub** has no build step (runs directly from source)
- **Memory:** Frontend builds use `--max-old-space-size=4096` to handle large builds
- **PM2 Restart:** `build:deploy` automatically restarts PM2, other builds do not
