# Updates Available System - Current State Analysis

**Date:** 2026-02-07  
**Purpose:** Document current deployment/versioning before implementing update indicator

---

## Current Deployment Setup

### Git Repository
- **Remote:** `git@github.com:nexty1982/prod-current.git`
- **Current Branch:** `chore/2026-02-05-alias-normalization`
- **Root:** `/var/www/orthodoxmetrics/prod` (mounted as `Z:\`)

### Versioning
**Backend:**
- Package: `orthodoxmetrics-backend@1.0.0`
- Location: `server/package.json`
- No git SHA tracking currently

**Frontend:**
- Package: `orthodoxmetrics@1.0.0`
- Location: `front-end/package.json`
- No git SHA tracking currently

### Deployment Script
**Location:** `scripts/om-deploy.sh`

**Targets:**
- `backend` - Build and deploy backend only
- `frontend` - Build and deploy frontend only
- `all` - Build and deploy both (default)

**Backend Deploy Process:**
1. `npm install --legacy-peer-deps`
2. `npm run build:clean` - Clean dist folder
3. `npm run build:ts` - TypeScript compilation + router fix
4. `npm run build:copy` - Copy non-TS files
5. `npm run build:post-library` - Post-build library tasks
6. `npm run build:verify` - Verify build
7. `npm run build:verify:imports` - Verify imports
8. `npm run build:flush-sessions` - Flush sessions
9. `pm2 reload all --update-env` (or restart)
10. Health check on `http://127.0.0.1:3001/api/health`

**Frontend Deploy Process:**
1. `npm install --legacy-peer-deps`
2. `npm run clean` - Remove dist folder
3. `node --max-old-space-size=8096 node_modules/vite/bin/vite.js build` - Vite build with 8GB memory
4. Output: `front-end/dist`
5. PM2 reload (if all) or skip (if frontend-only)

### PM2 Services
- **Backend Process Name:** `orthodox-backend`
- **Port:** 3001

### Header Component
**Location:** `front-end/src/layouts/full/vertical/header/Header.tsx`

**Current Header Items (Right Side):**
- `LastLoggedIn` component
- `Language` selector
- `OrthodoxThemeToggle` (dark mode)
- `Notifications` bell
- `MobileRightSidebar` (on mobile)
- `Profile` dropdown

**Layout:** Stack with 1.5 spacing, aligned right

### Menu Structure
**Location:** `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`

**Devel Tools Section Exists:** Yes
- Contains items like Menu Editor, Build Console, etc.
- Uses `IconTool` for devel tools section

---

## Implementation Plan

### A) Version/Update Detection

**1. Backend Build Info Endpoint**
- Create `GET /api/system/build-info`
- Returns git SHA, branch, build time
- Use `simple-git` to get git info
- Store build time during compilation

**2. Update Status Endpoint**
- Create `GET /api/system/update-status`
- Compare local HEAD vs `origin/<branch>`
- Return `updatesAvailable` boolean
- Cache for 5 minutes to avoid excessive git calls

### B) Update Execution

**1. Update Service**
- Create `server/src/services/updateService.ts`
- Job queue with lock file at `/tmp/om-update.lock`
- Log output to `server/logs/updates/job-{jobId}.log`
- Use existing `scripts/om-deploy.sh` for actual deployment

**2. Update Endpoints**
- `POST /api/system/update/run` - Start update job
- `GET /api/system/update/jobs/:jobId` - Get job status/logs
- Super admin only via `requireRole(['super_admin'])`

### C) Frontend UI

**1. Header Indicator**
- Add `UpdatesIndicator` component after `Notifications`
- Show badge with count when updates available
- Hidden for non-super_admin users

**2. Updates Modal**
- Display current vs remote versions
- Show update buttons based on availability
- Stream logs during update
- Auto-refresh on success

### D) Menu Integration

**Add to Devel Tools (Required):**
- If creating dedicated updates page, add to MenuItems.ts under Devel Tools
- Route in Router.tsx
- For now, will only add header indicator (no separate page needed)

---

## Safety Guardrails

1. **Single job at a time** - Lock file prevents concurrent updates
2. **Build validation** - Use existing build:verify steps
3. **Health checks** - Verify backend responds after restart
4. **Rollback documentation** - Log all actions for manual rollback
5. **Error handling** - Fail gracefully, don't crash server
6. **PM2 integration** - Use `pm2 reload` for zero-downtime restarts

---

## Next Steps

1. Create update service with job management
2. Create system routes for build-info and update-status
3. Create update execution endpoint
4. Add UpdatesIndicator to Header.tsx
5. Create Updates modal component
6. Test with git fetch/pull simulation

---

**Status:** Ready to implement
