# AGENTS.md — OrthodoxMetrics Repo Reference

> **Last Updated:** 2026-04-07
> **Repo:** `/var/www/orthodoxmetrics/prod` (GitHub: nexty1982/prod-current)
> **Prerequisite:** Read `/var/www/shared/AGENT-WORKFLOW.md` first for process rules.

---

## Project Overview

Multi-tenant Orthodox church management platform. Sacramental records (baptism, marriage, funeral), OCR digitization of historical ledgers, church administration, CRM.

---

## Stack

- **Backend:** Express + TypeScript, port 3001
- **Frontend:** React + Vite + MUI + Tailwind
- **Database:** MariaDB (host: 192.168.1.241, user: orthodoxapps)
- **Service:** `orthodox-backend` (systemd)

---

## Quick Commands

```bash
# Deploy
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh          # Full (backend + frontend)
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh be       # Backend only
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh fe       # Frontend only

# Service management
sudo systemctl restart orthodox-backend
sudo systemctl status orthodox-backend
sudo journalctl -u orthodox-backend -f    # Live logs

# Health check
curl http://127.0.0.1:3001/api/system/health
```

**Never manually build/copy/restart. Always use the deploy script.**

---

## Key File Locations

| File | Purpose |
|------|---------|
| `server/src/index.ts` | Backend entry — ALL route mounts (~100 routes) |
| `server/src/config/db.js` | DB pools: `getAppPool()`, `getTenantPool(churchId)` |
| `server/src/config/session.js` | Session config (MySQL store) |
| `server/src/config/index.ts` | Centralized config (loads .env) |
| `server/src/middleware/databaseRouter.js` | Multi-tenant DB routing middleware |
| `server/src/middleware/auth.js` | Auth middleware |
| `server/src/middleware/requestLogger.js` | API call logging to system_logs |
| `server/src/routes/records.js` | Church records controller |
| `server/src/routes/ocr/index.ts` | OCR route mounting |
| `server/src/workers/ocrFeederWorker.js` | OCR job processor (in-process) |
| `server/src/ocr/layouts/*.js` | Table extraction column bands |
| `server/src/ocr/columnMapper.ts` | OCR column → DB field mapping |
| `front-end/src/Router.tsx` | All frontend route definitions |
| `front-end/src/api/utils/axiosInstance.ts` | API client (auto-prefixes `/api`) |
| `scripts/om-deploy.sh` | Deployment script |
| `scripts/build-copy.js` | Copies .js files from src/ to dist/ |

---

## Patterns

### Adding a Backend Route

1. Create router file in `server/src/routes/` or `server/src/api/`
2. Mount it in `server/src/index.ts`: `app.use('/api/my-route', myRouter);`
3. For immediate effect: apply changes to BOTH `src/` and `dist/`
4. Use `mergeParams: true` if router is mounted under a path with params

### Adding a Frontend Page

1. Create page component in `front-end/src/features/` or `front-end/src/pages/`
2. Add lazy-loaded import in `front-end/src/Router.tsx`
3. Wrap with `<ProtectedRoute requiredRole={[...]}>` for auth
4. API calls use `apiClient` which auto-prefixes `/api`

### src/ and dist/ Rules

- **TypeScript** (`.ts`): Edit `server/src/`, then rebuild. The build compiles to `server/dist/`.
- **JavaScript** (`.js`): Edit `server/src/` AND manually copy to `server/dist/` for immediate effect. The TypeScript compiler does NOT copy `.js` files.
- Common `.js` files requiring manual copy:
  ```bash
  cp server/src/routes/ocr.js server/dist/routes/ocr.js
  cp server/src/config/db.js server/dist/config/db.js
  cp server/src/routes/gallery.js server/dist/routes/gallery.js
  ```
- The running server loads from `dist/`. Stale `dist/` files will cause errors even if `src/` is correct.

---

## Database Architecture

### Platform DB (`orthodoxmetrics_db`)

Users, churches, sessions, system_logs, image_registry, image_bindings, ocr_jobs, church_dynamic_records_config, canonical_locations.

```js
const { getAppPool } = require('./config/db');
const [rows] = await getAppPool().query('SELECT ...', [params]);
```

### Church Tenant DBs (`om_church_##`)

Per-church: baptism/marriage/funeral_records, audit_logs, calendar, ocr_feeder_pages, ocr_feeder_artifacts.

```js
const { getTenantPool } = require('./config/db');
const pool = getTenantPool(churchId);  // Cached pool for om_church_##
const [rows] = await pool.query('SELECT * FROM baptism_records WHERE ...', [params]);
```

### Cross-DB Query

```js
await appPool.query('SELECT * FROM `om_church_46`.`baptism_records` WHERE ...');
```

### DB Access Notes

- Tenant pool cache: In-memory Map in `db.js`, keyed by churchId
- DB user: `orthodoxapps` (shell mysql client can't auth — use `node -e` with mysql2)
- DB host: `192.168.1.241` (not localhost)
- OMAI-specific tables (`om_daily_items`, `omai_work_sessions`, etc.) are in `omai_db` — do NOT create OMAI tables in `orthodoxmetrics_db`

---

## Logging

```js
// API calls auto-logged by dbRequestLogger middleware to system_logs table
// Manual logging: just use console.log/error (captured by journalctl)
```

---

## Feature Lifecycle

Every user-facing feature follows a 5-stage lifecycle managed by `front-end/src/config/featureRegistry.ts`. Stages 1-4 are only visible to `super_admin` users; stage 5 is visible to all.

| Stage | Label | Banner | Visibility |
|-------|-------|--------|------------|
| 1 | Prototype | Red | super_admin only |
| 2 | Development | Red | super_admin only |
| 3 | Review | Orange | super_admin only |
| 4 | Stabilizing | Orange | super_admin only |
| 5 | Production | Green/none | All users |

To register a new feature, add it to `FEATURE_REGISTRY` in `featureRegistry.ts` and wrap its route with `<EnvironmentAwarePage featureId="...">`.

---

## Roles

`super_admin` > `admin` > `church_admin` > `priest` > `deacon` > `editor`

---

## Developer Rules — File Placement

### NEVER create files outside of these directories:

- **Backend code** → `server/src/` only. Never create files directly in `server/` root, `server/database/`, `server/data/`, `server/scripts/`, or `server/misc/`. The build pipeline compiles `server/src/` → `server/dist/`. Anything outside `src/` is invisible to the running application.
- **Frontend code** → `front-end/src/` only. Never create files directly in `front-end/` root or `front-end/misc/`. Vite builds from `front-end/src/`.
- **SQL migrations** → `server/database/migrations/` (the one exception outside `src/`).
- **Documentation** → `docs/` at project root.
- **Scripts** → `scripts/` at project root for deployment/ops scripts.

### Why this matters

The `server/` and `front-end/` directories have accumulated stale files in non-standard locations over time. These are legacy artifacts. Do not add to them. All new work goes into `src/` subdirectories.

---

## Gotchas

1. **cookieParser MUST receive session secret** — `app.use(cookieParser(secret))`. Without it, every request gets a new session. Caused prod outage 2026-02-02.
2. **mergeParams: true** — Required on Express routers mounted under paths with params (e.g., `/api/churches/:churchId/records`).
3. **src/ AND dist/** — JS changes need both for immediate effect. TS changes need src/ + rebuild.
4. **tools/ not in dist** — `server/src/tools/` is excluded from build copy.
5. **getChurchRecordConnection is BROKEN** — Uses undefined `process.env.DB_PASS`. Use `getTenantPool(churchId)` instead.
6. **OCR vision results on disk** — Stored at `server/storage/feeder/job_{id}/page_0/vision_result.json`, NOT in DB column.
7. **safeRequire** — Route loading uses `safeRequire()` which returns a 503 stub on failure. Check startup logs for "Failed to load" warnings.
8. **Vite chunk warnings** — Large chunk warnings during frontend build are expected.
9. **FusionOverlay positioning** — Child boxes subtract `metrics.left`/`.top`, not `offsetX`/`offsetY`.
10. **Legacy OCR routes disabled** — `/api/ocr/*` disabled by default. Church-scoped routes at `/api/church/:churchId/ocr/*`.
11. **Auth redirect path** — Router defines auth at `/auth/login`. Never use `/auth/sign-in` (it doesn't exist and causes 404s).
12. **Backend ApiResponse wrapper** — Backend routes use `ApiResponse()` which nests data under `.data`. Many frontend components read directly from top level. Always check for both: `data.data?.field || data.field`.

---

## Documentation

Detailed docs in `docs/`:

- `architecture.md` — System overview
- `api-reference.md` — All backend routes
- `ocr-pipeline.md` — OCR system
- `deployment.md` — Build & deploy
- `database.md` — Schema & access patterns
- `frontend.md` — Frontend architecture
- `sdlc.md` — Feature lifecycle stages
