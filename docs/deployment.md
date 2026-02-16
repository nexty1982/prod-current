# Build, Deploy, Operations

## Quick Deploy Commands

```bash
# Full deploy (backend + frontend)
./scripts/om-deploy.sh

# Backend only
./scripts/om-deploy.sh be

# Frontend only
./scripts/om-deploy.sh fe
```

The deploy script uses a lock file (`/tmp/om-deploy.lock`) to prevent concurrent deployments.

## Build Pipeline

### Backend Build

1. `npm install --legacy-peer-deps` (in `server/`)
2. `npm run build:clean` — remove old dist artifacts
3. `npm run build:ts` — compile TypeScript with `tsc`
4. `npm run build:copy` — `build-copy.js` copies `.js` files from `src/` to `dist/` (skips `.ts` files)
5. Post-library processing
6. Dist integrity checks:
   - All `.ts` files have corresponding `.js` in dist
   - Critical files present: `index.js`, `config/db.js`, `config/session.js`, `workers/ocrFeederWorker.js`, `middleware/databaseRouter.js`, OCR layouts, etc.

### Frontend Build

1. `npm install --legacy-peer-deps` (in `front-end/`)
2. Icon import validation (Records scope)
3. Clean artifacts
4. `NODE_OPTIONS='--max-old-space-size=8192' npx vite build` — production build with 8GB memory

**Note**: `server/src/tools/` is NOT copied to dist (dev-only tools).

## Service Management

```bash
# Restart backend
sudo systemctl restart orthodox-backend

# Check status
sudo systemctl status orthodox-backend

# View logs (live)
sudo journalctl -u orthodox-backend -f

# View recent logs
sudo journalctl -u orthodox-backend --since "10 minutes ago"

# Restart OMAI service
sudo systemctl restart omai
sudo systemctl status omai
```

## Health Checks

```bash
# Backend health (no auth required)
curl http://127.0.0.1:3001/api/system/health

# Maintenance status
curl http://127.0.0.1:3001/api/maintenance/status

# Route health (requires admin session)
# GET /api/admin/_routes
```

The deploy script polls the health endpoint up to 60 times (2 second intervals, 120s total) after restart.

## Nginx

Nginx terminates SSL and proxies to Express on port 3001. Configuration files:

- `/etc/nginx/sites-available/` — site configs
- Static assets (`/images/*`, `/assets/*`) can be served directly by Nginx in production

### Maintenance Mode

Touch file to enable: `touch /var/www/orthodoxmetrics/maintenance.on`
Remove to disable: `rm /var/www/orthodoxmetrics/maintenance.on`

The `/api/maintenance/status` endpoint checks for this file. Frontend polls it and shows maintenance UI.

## Critical Gotchas

### cookieParser Must Receive Session Secret

```js
// CORRECT — sessions work
app.use(cookieParser(serverConfig.session.secret));

// WRONG — every request gets a new session, auth breaks
app.use(cookieParser());
```

This caused a production outage on 2026-02-02. The secret is verified at startup with a console log.

### Changes Must Apply to Both src/ and dist/

For immediate effect without a full rebuild, changes to `.js` files must be made in BOTH `server/src/` and `server/dist/`. TypeScript files only need `src/` changes followed by a build.

### src/tools/ Not Copied to dist

The `server/src/tools/` directory is excluded from the build copy step. These are development-only utilities.

## Environment

- **Node.js**: Check with `node --version`
- **MariaDB**: Check with `mariadb --version`
- **Config**: Centralized in `server/src/config/index.ts`, falls back to `.env` and `process.env`
- **Ports**: Backend 3001, OMAI 7060, MariaDB 3306
