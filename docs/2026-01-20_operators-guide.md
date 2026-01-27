# OrthodoxMetrics Operators Guide

**Last Updated**: January 20, 2026  
**Purpose**: Complete reference for building and deploying the OrthodoxMetrics front-end and backend server

---

## Table of Contents

1. [Quick Start - Full Build & Deploy](#quick-start)
2. [Server Backend Build Commands](#server-backend-build-commands)
3. [Front-End Build Commands](#front-end-build-commands)
4. [Build Process Details](#build-process-details)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Smart Build & Deploy (Recommended for Daily Use)

This is the **recommended command** for day-to-day deployments. It analyzes changed files and only rebuilds what's necessary:

```bash
cd server
npm run build:deploy:smart
```

**What it does:**
- Analyzes changed files since last build (or from git)
- Classifies changes (backend/frontend/force-full)
- **Smart decisions:**
  - If ≤5 files changed: Uses fast paths (no clean, incremental builds)
  - Only rebuilds backend OR frontend when relevant
  - Skips expensive clean steps when safe
  - Forces full build only when necessary (dependencies, configs, build scripts)
- Restarts PM2 service only if backend was rebuilt
- Records build history with changed files
- Displays recent build history

**Location**: `server/package.json:15` → `build:deploy:smart` → calls `scripts/build-smart.js --restart`

**Example outputs:**
- 2 backend TS files changed → Incremental TS compile only (no clean, no copy)
- 3 frontend files changed → Frontend build only (no clean)
- package.json changed → Full clean build (both sides)
- Build scripts changed → Force full build (safety)

### Full Build & Deploy (Safe Rebuild - Use When Unsure)

For a **complete, safe rebuild** of everything (use when smart build seems incorrect or for major updates):

```bash
cd server
npm run build:deploy
```

**What it does:**
- Always builds backend server (clean + TypeScript + copy + verify)
- Always builds front-end (Vite production build)
- Runs both builds in parallel
- Always restarts PM2 service (`orthodox-backend`)
- Records build history with changed files
- Displays recent build history

**Location**: `server/package.json:14` → `build:deploy` → calls `scripts/build-all.js`

**Full command chain:**
```
npm run build:deploy
  → npm run build:all (server/package.json:13)
    → node scripts/build-all.js
      → npm run build (backend - parallel)
      → npm run build (front-end - parallel)
      → pm2 restart orthodox-backend
```

**When to use:**
- After major dependency updates
- When smart build classification seems incorrect
- For production deployments after large refactors
- When troubleshooting build issues

---

## Smart Build System

### How Smart Build Works

The smart build system analyzes changed files and makes intelligent decisions about what to rebuild:

#### Change Detection

1. **Primary method**: Compares current file state against last successful build (stored in `build-history.json`)
2. **Fallback method**: Uses `git diff HEAD~1..HEAD` if build history unavailable
3. **Classification**: Categorizes changes into:
   - **Backend-impacting**: Files in `server/**`
   - **Frontend-impacting**: Files in `front-end/**`
   - **Force-full**: Build scripts, configs, dependencies (always triggers full rebuild)

#### Decision Rules

**Threshold**: If ≤5 files changed, uses fast paths (no clean, incremental builds)

**Backend Build Strategies:**

1. **Incremental TS only** (fastest)
   - Condition: Only TypeScript files in `src/` changed, no runtime files
   - Command: `npm run build:ts && npm run build:verify`
   - Skips: Clean step, copy step

2. **Copy-only** (fast)
   - Condition: Only runtime files changed (routes/, middleware/, config/, etc.), no TS files
   - Command: `npm run build:copy && npm run build:verify`
   - Skips: Clean step, TypeScript compilation

3. **Full no-clean** (moderate)
   - Condition: Mixed changes (TS + runtime files)
   - Command: `npm run build:ts && npm run build:copy && npm run build:verify`
   - Skips: Clean step only

4. **Full clean** (slowest, but safe)
   - Condition: Dependencies changed (`package.json`, `package-lock.json`), `tsconfig.json` changed
   - Command: `npm run build` (clean + ts + copy + verify)
   - Skips: Nothing

**Frontend Build Strategies:**

1. **Incremental** (fast)
   - Condition: Source files changed, no dependency/config changes
   - Command: `npm run build` (Vite production build, no clean)
   - Skips: Clean step

2. **Full clean** (slower)
   - Condition: Dependencies changed, `vite.config.*` changed
   - Command: `npm run build:clean` (removes dist/ first)
   - Skips: Nothing

**Force-Full Triggers:**

These patterns always trigger a full rebuild of both backend and frontend:
- `server/scripts/**` - Build scripts changed
- `server/tsconfig.json` - TypeScript config changed
- `server/package*.json` - Backend dependencies changed
- `front-end/vite.config*` - Vite config changed
- `front-end/package*.json` - Frontend dependencies changed
- Root `package*.json` or `package-lock.json` - Root dependencies changed
- `.github/**` - CI/CD changes
- `tools/**` - Build tooling changes

#### PM2 Restart Logic

- **Only restarts if**: Backend was actually rebuilt AND `--restart` flag provided
- **Skips restart if**: Only frontend was rebuilt (no need to restart backend)
- **Always restarts in**: `build:deploy` (full build)

---

## Server Backend Build Commands

All commands should be run from the `server/` directory unless otherwise specified.

### Smart Build Commands (Recommended for Daily Use)

#### 1. **Smart Build** (Analyzes changes, builds only what's needed)
```bash
npm run build:smart
```

**What it does:**
- Analyzes changed files since last build
- Classifies changes (backend/frontend/force-full)
- Only rebuilds affected components
- Uses fast paths when ≤5 files changed (no clean, incremental builds)
- Skips expensive steps when safe

**Location**: `server/package.json:15` → `build:smart` → calls `scripts/build-smart.js`

**Build strategies:**
- **Backend only TS changes**: Incremental TypeScript compile (no clean, no copy)
- **Backend runtime changes**: Copy step only (no clean, no TS compile)
- **Backend dependencies**: Full clean build
- **Frontend changes**: Regular build (no clean) or clean build if dependencies changed
- **Force-full triggers**: Build scripts, tsconfig, vite config, package.json changes

#### 2. **Smart Build & Deploy** (Smart build + PM2 restart if backend rebuilt)
```bash
npm run build:deploy:smart
```

**What it does:**
- Same as `build:smart` above
- Automatically restarts PM2 service (`orthodox-backend`) **only if backend was rebuilt**
- If only frontend was rebuilt, PM2 is not restarted

**Location**: `server/package.json:16` → `build:deploy:smart` → calls `scripts/build-smart.js --restart`

### Primary Build Commands

#### 1. **Full Backend Build** (Always clean + compile + copy)
```bash
npm run build
```

**What it does:**
- Cleans `dist/` directory
- Compiles TypeScript to JavaScript (`tsc`)
- Copies non-TypeScript files (routes, middleware, configs, etc.)
- Verifies build output

**Location**: `server/package.json:10`  
**Steps**: `build:clean` → `build:ts` → `build:copy` → `build:verify`

#### 2. **Individual Build Steps**

```bash
# Clean dist directory only
npm run build:clean
# Output: Removes server/dist/

# TypeScript compilation only
npm run build:ts
# Output: Compiles server/src/** → server/dist/**

# Copy non-TS files only
npm run build:copy
# Output: Copies routes/, middleware/, controllers/, dal/, database/, config/, etc. to dist/

# Verify build output
npm run build:verify
# Output: Checks dist/ structure and key files
```

### Backend Build Process Details

**Step 1: Clean** (`build:clean`)
- Command: `rimraf dist`
- Removes entire `server/dist/` directory

**Step 2: TypeScript Compilation** (`build:ts`)
- Command: `tsc -p tsconfig.json`
- Compiles all TypeScript files from `server/src/**` to `server/dist/**`
- Uses TypeScript configuration from `server/tsconfig.json`

**Step 3: Copy Runtime Files** (`build:copy`)
- Script: `server/scripts/build-copy.js`
- Copies JavaScript files that live outside `src/`:
  - `routes/` → `dist/routes/`
  - `middleware/` → `dist/middleware/`
  - `controllers/` → `dist/controllers/`
  - `dal/` → `dist/dal/`
  - `database/` → `dist/database/`
  - `config/session.js`, `config/db.js`, `config/db-compat.js`
- Copies JS modules from `src/` that aren't emitted by TypeScript:
  - `src/api/` → `dist/api/`
  - `src/utils/` → `dist/utils/`
  - `src/services/` → `dist/services/`
  - `src/assets/` → `dist/assets/`

**Step 4: Verify** (`build:verify`)
- Script: `server/scripts/verify-build.js`
- Validates that essential files exist in `dist/`
- Checks for common build issues

---

## Front-End Build Commands

All commands should be run from the `front-end/` directory unless otherwise specified.

### Primary Build Commands

#### 1. **Production Build** (Recommended)
```bash
npm run build
```

**What it does:**
- Builds optimized production bundle using Vite
- Sets Node.js memory limit to 4GB (for large builds)
- Verifies build output

**Location**: `front-end/package.json:11`  
**Command**: `NODE_OPTIONS="--max-old-space-size=4096" vite build --mode production && node scripts/verify-build.js`

**Output**: `front-end/dist/` directory

#### 2. **Clean Production Build**
```bash
npm run build:clean
```

**What it does:**
- Removes `dist/` directory first
- Then performs full production build
- Useful when build artifacts may be stale

**Location**: `front-end/package.json:12`

#### 3. **Build with Watch Mode**
```bash
npm run build:watch
```

**What it does:**
- Builds in watch mode (rebuilds on file changes)
- Useful for continuous development builds

**Location**: `front-end/package.json:13`

### Alternative Build Targets

#### Development Build
```bash
npm run build:dev
# Output: front-end/dist/ (development mode)
```

#### Build Verification Only
```bash
npm run build:verify
# Verifies existing dist/ without rebuilding
```

#### Alternative Output Directories
```bash
npm run build:beta
# Output: front-end/dist-beta/

npm run build:staging
# Output: front-end/dist-staging/

npm run build:development
# Output: front-end/dist-dev/

npm run build:experimental
# Output: front-end/dist-experimental/
```

### Development Server

```bash
# Development server (default: port 5174)
npm run dev

# Development server with custom host
npm run dev:host

# Test development server (port 5177)
npm run dev:test

# Preview production build (port 5175)
npm run preview
```

---

## Build Process Details

### Full Build & Deploy Flow (`npm run build:deploy`)

**Script**: `server/scripts/build-all.js` (182 lines)

1. **Parallel Builds** (lines 143-146)
   - Backend: `cd server && npm run build`
   - Front-end: `cd front-end && npm run build`
   - Both run simultaneously for speed

2. **Build History Tracking** (lines 52-81, 93-122)
   - Records changed files before build
   - Tracks build time
   - Stores build metadata

3. **PM2 Service Restart** (line 151)
   - Automatically restarts `orthodox-backend` service
   - Command: `pm2 restart orthodox-backend`

4. **Build Summary** (lines 164-169)
   - Displays total build time
   - Shows recent build history (last 5 builds)

### Build Output Directories

**Backend:**
- `server/dist/` - Compiled JavaScript and copied runtime files

**Front-End:**
- `front-end/dist/` - Production build (default)
- `front-end/dist-beta/` - Beta build
- `front-end/dist-staging/` - Staging build
- `front-end/dist-dev/` - Development build
- `front-end/dist-experimental/` - Experimental build

---

## Verification & Testing

### Backend Verification

```bash
cd server

# Verify build output structure
npm run build:verify

# Test health endpoints
npm run test:health

# Full test suite
npm run test:full

# Smoke test routes
npm run smoke:routes
```

### Front-End Verification

```bash
cd front-end

# Verify build output
npm run build:verify

# Run tests
npm test

# Lint code
npm run lint
```

### Build History

```bash
cd server

# Show recent build history
npm run build:history:show

# View full build history
npm run build:history
```

**Location**: `server/build-history.json`

---

## Command Reference

### Root Directory (`/`)

No build commands defined here. Only utility scripts:
- `npm run fix:imports` - Fix import paths
- `npm run scan:nonascii` - Scan for non-ASCII characters
- `npm run build:hardened` - Hardened build harness

### Server Directory (`server/`)

**Build Commands:**
- `npm run build` - Full backend build (clean + compile + copy + verify)
- `npm run build:clean` - Clean dist directory
- `npm run build:ts` - TypeScript compilation only
- `npm run build:copy` - Copy non-TS files only
- `npm run build:verify` - Verify build output
- `npm run build:frontend` - Build front-end from server directory
- `npm run build:all` - Build both backend and front-end
- `npm run build:deploy` - Full build & deploy (recommended)

**Development:**
- `npm run dev` - Development server with watch mode (tsx)

**Testing:**
- `npm run test:health` - Basic health tests
- `npm run test:full` - Full test suite
- `npm run smoke:routes` - Smoke test API routes

### Front-End Directory (`front-end/`)

**Build Commands:**
- `npm run build` - Production build (recommended)
- `npm run build:clean` - Clean + production build
- `npm run build:watch` - Production build with watch mode
- `npm run build:verify` - Verify build output
- `npm run build:dev` - Development mode build
- `npm run build:beta` - Build to dist-beta/
- `npm run build:staging` - Build to dist-staging/
- `npm run build:development` - Build to dist-dev/
- `npm run build:experimental` - Build to dist-experimental/

**Development:**
- `npm run dev` - Development server (port 5174)
- `npm run dev:host` - Development server with host binding
- `npm run dev:test` - Test development server (port 5177)
- `npm run preview` - Preview production build (port 5175)

**Quality:**
- `npm run lint` - Lint codebase
- `npm test` - Run test suite

---

## Troubleshooting

### Common Issues

#### 1. **Out of Memory During Front-End Build**

**Error**: `JavaScript heap out of memory`

**Solution**: The build already sets `NODE_OPTIONS="--max-old-space-size=4096"` (4GB). If still failing:
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

#### 2. **TypeScript Compilation Errors**

**Check**:
```bash
cd server
npm run build:ts
```

**Common fixes**:
- Run `npm install` to ensure dependencies are up to date
- Check `server/tsconfig.json` configuration
- Verify TypeScript version: `npx tsc --version`

#### 3. **Missing Files After Build**

**Check build verification**:
```bash
cd server
npm run build:verify

cd front-end
npm run build:verify
```

**Common causes**:
- Build copy step failed
- TypeScript compilation errors
- File permissions issues

#### 4. **PM2 Service Not Restarting**

**Manual restart**:
```bash
pm2 restart orthodox-backend
pm2 status
```

**Check PM2 logs**:
```bash
pm2 logs orthodox-backend
```

#### 5. **Build History Not Recording**

**Check**:
```bash
cd server
ls -la build-history.json
npm run build:history:show
```

**Manual record**: Build history is automatically recorded by `build-all.js`

---

## File Locations

### Configuration Files

- `server/tsconfig.json` - TypeScript configuration for backend
- `server/package.json` - Backend npm scripts and dependencies
- `front-end/vite.config.*.ts` - Vite build configuration
- `front-end/package.json` - Front-end npm scripts and dependencies
- `front-end/tsconfig.json` - TypeScript configuration for front-end

### Build Scripts

- `server/scripts/build-all.js` - Full build orchestrator (182 lines)
- `server/scripts/build-smart.js` - Smart build orchestrator (analyzes changes, builds only what's needed)
- `server/scripts/build-copy.js` - Post-build file copy script (74 lines)
- `server/scripts/build-history.js` - Build history tracker (318 lines)
- `server/scripts/verify-build.js` - Build verification script
- `front-end/scripts/verify-build.js` - Front-end build verification

### Build Outputs

- `server/dist/` - Backend compiled output
- `front-end/dist/` - Front-end production build
- `server/build-history.json` - Build history log

---

## Best Practices

1. **Use `npm run build:deploy:smart` for daily deployments**
   - Analyzes changes and only rebuilds what's necessary
   - Faster builds when ≤5 files changed
   - Automatically restarts PM2 only if backend was rebuilt
   - Records build history

2. **Use `npm run build:deploy` for full safe rebuilds**
   - Always rebuilds everything (use when smart build seems incorrect)
   - Ensures both backend and front-end are rebuilt
   - Always restarts services
   - Records build history

2. **Check build history before troubleshooting**
   ```bash
   cd server
   npm run build:history:show
   ```

3. **Verify builds after completion**
   ```bash
   cd server && npm run build:verify
   cd ../front-end && npm run build:verify
   ```

4. **Test after build**
   ```bash
   cd server
   npm run test:health
   ```

5. **Monitor PM2 after deployment**
   ```bash
   pm2 status
   pm2 logs orthodox-backend --lines 50
   ```

---

## Quick Reference Card

```bash
# Smart rebuild (recommended for daily use)
cd server
npm run build:deploy:smart

# Full rebuild (safe rebuild - use when unsure)
cd server
npm run build:deploy

# Smart build only (no PM2 restart)
cd server
npm run build:smart

# Backend only (full clean build)
cd server
npm run build

# Front-end only
cd front-end
npm run build

# Development servers
cd server && npm run dev    # Backend dev server
cd front-end && npm run dev # Front-end dev server (port 5174)

# Verification
cd server && npm run build:verify && npm run test:health
cd front-end && npm run build:verify
```

---

**End of Operators Guide**
