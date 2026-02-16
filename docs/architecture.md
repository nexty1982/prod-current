# System Architecture

## Overview

OrthodoxMetrics is a multi-tenant church management platform for Orthodox Christian parishes. It handles sacramental records (baptism, marriage, funeral), OCR digitization of historical ledgers, and church administration.

```
Browser ──► Nginx (443/80) ──► Express backend (3001) ──► MariaDB
                                    │
                                    ├── orthodoxmetrics_db  (platform)
                                    └── om_church_##        (per-tenant)

OMAI service (7060) ──► orthodoxmetrics_db (omai_* tables)
```

## Backend

- **Runtime**: Node.js + Express, written in TypeScript
- **Source**: `server/src/` (TypeScript + JS)
- **Compiled**: `server/dist/` (JS only, what actually runs)
- **Entry point**: `server/dist/index.js` (compiled from `server/src/index.ts`)
- **Port**: 3001, bound to 0.0.0.0
- **Process manager**: systemd unit `orthodox-backend`

### Build Pipeline

1. `tsc` compiles `.ts` files from `src/` to `dist/`
2. `build-copy.js` copies `.js` files from `src/` to `dist/` (skips `.ts` files)
3. `server/src/tools/` is NOT copied to dist

### Route Loading

Routes use `safeRequire()` / `safeRequireProp()` wrappers that return a 503 stub router on failure, preventing one broken route from crashing the server. All routes are mounted in `server/src/index.ts`.

### Middleware Stack (order matters)

1. Morgan (logging)
2. Body parsers (JSON 50MB limit, URL-encoded)
3. `cookieParser(sessionSecret)` — **must** receive the session secret
4. Multer (file uploads, 100MB limit)
5. Session middleware (express-session + MySQL store)
6. `databaseRouter` (multi-tenant DB routing)
7. `dbRequestLogger` (API call logging to `system_logs`)
8. Request debugging logger

## Frontend

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite
- **UI libraries**: MUI (Material UI) + Tailwind CSS
- **Source**: `front-end/src/`
- **Build output**: `front-end/dist/`
- **Routing**: React Router v6 (`createBrowserRouter`) in `front-end/src/Router.tsx`
- **API client**: Axios instance at `@/api/utils/axiosInstance` — auto-prefixes `/api`

### Route Protection

- `<ProtectedRoute requiredRole={[...]}>` for role-based access
- `<ProtectedRoute requiredPermission="...">` for permission-based access
- Roles: `super_admin`, `admin`, `church_admin`, `priest`, `deacon`, `editor`

## Database Architecture

See [database.md](database.md) for full schema details.

- **Platform DB** (`orthodoxmetrics_db`): users, churches, sessions, OCR jobs, system_logs, omai_* tables
- **Church DBs** (`om_church_##`): baptism/marriage/funeral_records, audit_logs, calendar, ocr_feeder_*
- **Connection pools**: `getAppPool()` for platform, `getTenantPool(churchId)` for church DBs
- **Routing**: `databaseRouter` middleware sets `req.recordDatabase` for record paths

## OMAI (AI Assistant)

- **Standalone service** at `/var/www/omai/`, port 7060
- **systemd unit**: `omai`
- **Entry**: `_runtime/server/src/omai-only-server.ts`
- **DB tables**: 12+ `omai_*` tables in `orthodoxmetrics_db`
- **Frontend**: `GlobalOMAI.tsx` floating chat widget (super_admin only)

## Top-Level Directory Structure

```
prod/
├── front-end/          # React + Vite frontend
│   ├── src/            # TypeScript source
│   └── dist/           # Production build output
├── server/
│   ├── src/            # TypeScript + JS source
│   │   ├── api/        # API route handlers
│   │   ├── config/     # DB, session, centralized config
│   │   ├── middleware/  # Auth, logging, DB routing
│   │   ├── routes/     # Express routers (bulk of API)
│   │   ├── services/   # Business logic services
│   │   ├── workers/    # OCR feeder worker
│   │   └── ocr/        # OCR layouts, column mapper
│   ├── dist/           # Compiled output (runs in prod)
│   └── storage/        # OCR feeder job files on disk
├── scripts/            # Deployment, maintenance scripts
├── tools/              # CLI utilities (recovery, discovery)
├── docs/               # Project documentation (you are here)
├── uploads/            # User uploads, church images
├── misc/               # Legacy/misc files
└── CLAUDE.md           # AI assistant quick reference
```
