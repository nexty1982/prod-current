# CLAUDE.md — OrthodoxMetrics AI Assistant Reference

## Project Overview

Multi-tenant Orthodox church management platform. Sacramental records (baptism, marriage, funeral), OCR digitization of historical ledgers, church administration.

**Stack**: Express + TypeScript backend (port 3001) → MariaDB, React + Vite + MUI + Tailwind frontend.

## Quick Commands

```bash
# Deploy
./scripts/om-deploy.sh          # Full (backend + frontend)
./scripts/om-deploy.sh be       # Backend only
./scripts/om-deploy.sh fe       # Frontend only

# Service management
sudo systemctl restart orthodox-backend
sudo systemctl status orthodox-backend
sudo journalctl -u orthodox-backend -f    # Live logs

# Health check
curl http://127.0.0.1:3001/api/system/health

# OMAI service
sudo systemctl restart omai               # Port 7060
```

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

### Database Access

```js
// Platform DB
const { getAppPool } = require('./config/db');
const [rows] = await getAppPool().query('SELECT ...', [params]);

// Church-specific DB
const { getTenantPool } = require('./config/db');
const pool = getTenantPool(churchId);  // Returns cached pool for om_church_##
const [rows] = await pool.query('SELECT * FROM baptism_records WHERE ...', [params]);

// Cross-DB qualified name (when on platform pool)
await appPool.query('SELECT * FROM `om_church_46`.`baptism_records` WHERE ...');
```

### Logging

```js
// API calls auto-logged by dbRequestLogger middleware to system_logs table
// Manual logging: just use console.log/error (captured by journalctl)
```

## Developer Rules

### NEVER create files outside of these directories:

- **Backend code** → `server/src/` only. Never create files directly in `server/` root, `server/database/`, `server/data/`, `server/scripts/`, or `server/misc/`. The build pipeline compiles `server/src/` → `server/dist/`. Anything outside `src/` is invisible to the running application.
- **Frontend code** → `front-end/src/` only. Never create files directly in `front-end/` root or `front-end/misc/`. Vite builds from `front-end/src/`.
- **SQL migrations** → `server/database/migrations/` (the one exception outside `src/`).
- **Documentation** → `docs/` at project root. Never scatter `.md` files into `server/`, `front-end/`, or subdirectories.
- **Scripts** → `scripts/` at project root for deployment/ops scripts.

### Why this matters

The `server/` and `front-end/` directories have accumulated stale files in non-standard locations over time (`server/data/`, `server/database/*.js`, `server/misc/`, `front-end/misc/`). These are legacy artifacts. Do not add to them. All new work goes into `src/` subdirectories which are the only directories processed by the build pipeline.

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

## Database Architecture

- **Platform DB** (`orthodoxmetrics_db`): users, churches, sessions, system_logs, omai_* tables
- **Church DBs** (`om_church_##`): baptism/marriage/funeral_records, audit_logs, calendar, ocr_*
- **Tenant pool cache**: In-memory Map in `db.js`, keyed by churchId
- **DB user**: `orthodoxapps` (shell mysql client can't auth — use `node -e` with mysql2)

## Feature Lifecycle

Every user-facing feature follows a 5-stage lifecycle managed by a central registry at `front-end/src/config/featureRegistry.ts`. Stages 1-4 are only visible to `super_admin` users; stage 5 is visible to all. See [docs/sdlc.md](docs/sdlc.md) for full details.

| Stage | Label | Banner | Visibility |
|-------|-------|--------|------------|
| 1 | Prototype | Red | super_admin only |
| 2 | Development | Red | super_admin only |
| 3 | Review | Orange | super_admin only |
| 4 | Stabilizing | Orange | super_admin only |
| 5 | Production | Green/none | All users |

To register a new feature, add it to `FEATURE_REGISTRY` in `featureRegistry.ts` and wrap its route with `<EnvironmentAwarePage featureId="...">`. To promote, change the `stage` value.

## Roles

`super_admin` > `admin` > `church_admin` > `priest` > `deacon` > `editor`

## AI Agent Work Tracking (REQUIRED)

**Every change you make MUST be tracked as an OM Daily item with branch lifecycle management.** This is mandatory, not optional.

### Quick Reference — Branch Lifecycle

```bash
# 1. Create item (BEFORE starting work)
curl -X POST http://127.0.0.1:3001/api/om-daily/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"...","task_type":"chore","status":"todo","source":"agent","agent_tool":"claude_cli","priority":"medium","horizon":"7","category":"om-frontend","description":"..."}'

# 2. Start work — creates branch from main, checks it out locally
curl -X POST http://127.0.0.1:3001/api/om-daily/items/:id/start-work \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch_type":"enhancement","agent_tool":"claude_cli"}'

# 3. Do your work, commit changes to the branch

# 4. Signal work complete — moves item to Self Review
curl -X POST http://127.0.0.1:3001/api/om-daily/items/:id/agent-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent_tool":"claude_cli","summary":"Brief description of what was done"}'

# 5. (Optional) Full merge — ff-only merge to main, delete branch
curl -X POST http://127.0.0.1:3001/api/om-daily/items/:id/complete-work \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### Workflow

1. **Create item** → `POST /api/om-daily/items` with `status: "todo"`, `source: "agent"`, `agent_tool: "claude_cli"`
2. **Start work** → `POST /api/om-daily/items/:id/start-work` with `branch_type` — creates and checks out a branch from `main`
3. **During work** → Commit changes to the branch. Update `progress` (0-100) if the task is large
4. **Signal complete** → `POST /api/om-daily/items/:id/agent-complete` — moves item from In Progress → Self Review. **ALWAYS call this when you finish work on a task.** Idempotent and safe to call multiple times.
5. **Full merge** (optional) → `POST /api/om-daily/items/:id/complete-work` — fast-forward merges branch to `main`, deletes branch, closes item
6. **If abandoned** → Set `status: "cancelled"` with reason in description

### Task Types

`feature` | `enhancement` | `bugfix` | `refactor` | `migration` | `chore` | `spike` | `docs`

### Branch Types & Naming

| branch_type | Prefix | Example |
|-------------|--------|---------|
| `feature` | `feat` | `feat/42-add-parish-wizard` |
| `enhancement` | `enh` | `enh/43-improve-ocr-accuracy` |
| `bugfix` | `fix` | `fix/44-session-cookie-issue` |
| `refactor` | `ref` | `ref/45-extract-db-helpers` |
| `migration` | `mig` | `mig/46-move-crm-to-omai` |
| `chore` | `chore` | `chore/47-update-deps` |
| `spike` | `spike` | `spike/48-evaluate-ocr-engine` |
| `docs` | `docs` | `docs/49-api-reference` |

### Categories

**OM (prod-current):** `om-frontend` | `om-backend` | `om-database` | `om-ocr` | `om-records` | `om-admin` | `om-portal` | `om-auth` | `om-devops`
**OMAI:** `omai-frontend` | `omai-backend` | `omai-sdlc` | `omai-ai`
**Shared:** `docs`

### SDLC Status Ownership

Each status has a defined owner and required exit action. The backend enforces this — agents cannot approve their own work, and admins cannot skip agent-owned steps.

| Status | Owner | Exit Action | Exit By |
|--------|-------|-------------|---------|
| Backlog | Admin | Triage: review priority, assign category | Admin |
| Triaged | Admin | Plan: define approach, set repo_target | Admin |
| Planned | Admin | Schedule: set dates, assign to agent | Admin |
| Scheduled | Admin | Start work: agent creates branch | **Agent** |
| In Progress | **Agent** | Complete implementation, commit all | **Agent** |
| Self Review | **Agent** | Self-check: build, lint, push to remote | **Agent** |
| Testing | **Agent** | Verify tests pass, mark ready for review | **Agent** |
| Review Ready | Admin | Review changes, approve or reject | Admin |
| Approved | Admin | Deploy, merge to main, close item | Admin |
| Done | — | Reopen if needed | Admin |

**Key enforcement:**
- Agents pass `actor_type: "agent"` in PATCH /status calls to identify themselves
- Agents CANNOT exit admin-owned statuses (e.g., cannot self-approve)
- Admins CANNOT exit agent-owned statuses (e.g., cannot skip testing)
- `blocked` and `cancelled` transitions are always allowed by any actor

### Key Rules

- **ALWAYS signal completion** — Call `POST /items/:id/agent-complete` when you finish work. This moves the item to Self Review so the board reflects your progress. Without this call, items stay stuck in In Progress.
- **Agent transitions use actor_type** — When calling PATCH /status directly, include `"actor_type": "agent"` in the body. The `agent-complete` and `start-work` endpoints handle this automatically.
- **Fast-forward only** — `complete-work` uses `git merge --ff-only`. If main has diverged, rebase first.
- **Clean tree required** — All changes must be committed before calling `complete-work`.
- **Explicit actions** — Branches are NOT auto-merged on status change. You must call the endpoints.
- **One branch per item** — Each OM Daily item gets its own isolated branch.

### Priorities: `critical`, `high`, `medium` (default), `low`
### Categories: `om-frontend`, `om-backend`, `om-database`, `om-ocr`, `om-records`, `om-admin`, `om-portal`, `om-auth`, `om-devops`, `omai-frontend`, `omai-backend`, `omai-sdlc`, `omai-ai`, `docs`

### Agent Plans (Assigned Work Plans)

Check for assigned plans at conversation start:
```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/prompt-plans/agent/claude_cli
```
If an active plan is returned, read the `next_step.prompt_text` and execute that stage. Work items are auto-linked to the plan's Change Set. See [docs/ai-agent-workflow.md](docs/ai-agent-workflow.md) for full details.

**Full workflow documentation:** [docs/ai-agent-workflow.md](docs/ai-agent-workflow.md)

## Documentation

Detailed docs in `docs/`:
- [architecture.md](docs/architecture.md) — System overview
- [api-reference.md](docs/api-reference.md) — All backend routes
- [ocr-pipeline.md](docs/ocr-pipeline.md) — OCR system
- [deployment.md](docs/deployment.md) — Build & deploy
- [database.md](docs/database.md) — Schema & access patterns
- [frontend.md](docs/frontend.md) — Frontend architecture
- [sdlc.md](docs/sdlc.md) — Feature lifecycle stages
- [ai-agent-workflow.md](docs/ai-agent-workflow.md) — AI agent work tracking workflow
