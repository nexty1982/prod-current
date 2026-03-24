# OMAI — OrthodoxMetrics AI & Administration Platform

## Overview

OMAI is a separate service that acts as the administrative, AI, and backup control plane for OrthodoxMetrics. It runs independently on port 7060 and uses the Berry v4.1.0 React admin template for its frontend.

```
OrthodoxMetrics (port 3001)          OMAI (port 7060)
┌─────────────────────┐              ┌─────────────────────┐
│  React + Modernize  │              │  React + Berry v4.1 │
│  Frontend           │──auth bridge─►  Frontend           │
│                     │              │                     │
│  Express backend    │◄─api proxy───│  Express server     │
│  MariaDB            │              │  OMAI routes        │
└─────────────────────┘              └─────────────────────┘
```

## Architecture

| Component | Path | Description |
|-----------|------|-------------|
| OMAI server | `/var/www/omai/_runtime/server/src/omai-only-server.ts` | Express server, API proxy, route mounting |
| OMAI routes | `/var/www/omai/_runtime/server/src/omai-routes/` | Auto-mounted `.ts`/`.js` route files |
| Berry frontend | `/var/www/omai/berry/` | React + Vite + MUI admin template |
| Berry dist | `/var/www/omai/berry/dist/` | Built frontend served by OMAI |
| systemd service | `omai.service` | `sudo systemctl restart omai` |

### Server Flow

1. **API Proxy** (`/api/*`) — Forwards all `/api` requests to the OM backend at `127.0.0.1:3001`. Placed BEFORE `express.json()` to avoid consuming the request body.
2. **OMAI Routes** (`/omai/*`) — Custom OMAI endpoints auto-mounted from the routes directory.
3. **Berry SPA** (`/*`) — Static file serving from Berry's `dist/` with SPA fallback for client-side routing.

### Port & Service

- **Port**: 7060 (configurable via `PORT` env var)
- **Service**: `sudo systemctl restart omai`
- **Health**: `curl http://127.0.0.1:7060/omai/health`
- **Logs**: `sudo journalctl -u omai -f`

## Authentication — Auth Bridge (SSO)

Users authenticate once in OrthodoxMetrics and can seamlessly access OMAI without re-entering credentials. Both platforms share the same JWT tokens issued by the OM backend.

### Flow

```
1. User clicks "OMAI" in OM sidebar (/admin/omai)
2. OmaiBridge.tsx reads JWT from localStorage('access_token')
3. Redirects to: http://<host>:7060/auth/bridge?token=<jwt>
4. Berry's AuthBridge.tsx validates token expiry via jwtDecode
5. Stores token as 'serviceToken' in localStorage
6. Redirects to /dashboard/default — user is logged in
```

### Key Files

| File | Location | Purpose |
|------|----------|---------|
| `OmaiBridge.tsx` | `prod/front-end/src/features/admin/OmaiBridge.tsx` | OM side — reads JWT, redirects to Berry |
| `AuthBridge.tsx` | `/var/www/omai/berry/src/views/pages/authentication/AuthBridge.tsx` | Berry side — receives token, stores it, redirects to dashboard |
| `JWTContext.tsx` | `/var/www/omai/berry/src/contexts/JWTContext.tsx` | Berry auth context — wired to OM backend's `POST /api/auth/login` |
| `axios.ts` | `/var/www/omai/berry/src/utils/axios.ts` | Berry HTTP client — baseURL `/`, token in Authorization header |

### Token Mapping

| Platform | localStorage Key | Source |
|----------|-----------------|--------|
| OrthodoxMetrics | `access_token` | `POST /api/auth/login` → `response.data.access_token` |
| Berry (OMAI) | `serviceToken` | Received via auth bridge query param or direct login |

Both tokens are the same JWT — just stored under different keys by each frontend.

### Routes

- **OM route**: `/admin/omai` — Protected, requires role `super_admin`, `admin`, `church_admin`, or `priest`
- **Berry route**: `/auth/bridge?token=<jwt>` — Public (no guard), validates token client-side
- **Berry login**: `/login` — Direct login form, hits `POST /api/auth/login` via OMAI proxy

## CORS Configuration

The OM backend must allow origins for both platforms. These are set in `server/.env`:

```
CORS_ORIGINS=...,http://127.0.0.1:3001,http://127.0.0.1:7060,http://localhost:3001,http://localhost:7060
```

Both `http://127.0.0.1:<port>` (with port) must be listed — browsers include the port in the `Origin` header.

## Berry Frontend

Berry v4.1.0 — React 19, MUI 7, Vite, TypeScript.

### Building

```bash
cd /var/www/omai/berry
npm run build          # Output: /var/www/omai/berry/dist/
```

After building, restart OMAI to serve the new dist:
```bash
sudo systemctl restart omai
```

### Vite Dev Proxy

For development (`npm run dev` on port 3000), `vite.config.mts` proxies:
- `/api` → `http://127.0.0.1:3001` (OM backend)
- `/omai` → `http://127.0.0.1:7060` (OMAI server)

### Route Structure

| Route Group | Guard | Layout | Purpose |
|-------------|-------|--------|---------|
| LoginRoutes | GuestGuard | MinimalLayout | `/login`, `/register`, `/forgot-password` |
| MainRoutes | AuthGuard | MainLayout (sidebar) | Dashboard, apps, protected pages |
| SimpleRoutes | None | SimpleLayout | `/pages/contact-us`, `/pages/faqs` |
| AuthBridge | None | None | `/auth/bridge` — token handoff |

### Key Config

- `src/config.ts` — `DASHBOARD_PATH = '/dashboard/default'`, `APP_AUTH = AuthProvider.JWT`
- `.env` — `VITE_APP_API_URL=/`, `VITE_APP_BASE_NAME=/`

## Deployment Checklist

### OMAI Changes
```bash
cd /var/www/omai/berry && npm run build   # Build Berry frontend
sudo systemctl restart omai               # Restart OMAI to serve new dist
```

### OM Frontend Changes (that affect auth bridge)
Use the deploy script as always:
```bash
cd /var/www/orthodoxmetrics/prod
./scripts/om-deploy.sh fe
```

**Important**: After `om-deploy.sh fe`, ensure `server/front-end/dist/` is synced with `front-end/dist/`. The deploy script handles this, but manual builds require:
```bash
rm -rf server/front-end/dist && cp -r front-end/dist server/front-end/dist
```

## Future Plans

OMAI is intended to grow into the central hub for:
- AI agent work pipelines (creating OM Daily items, change sets, branches)
- Backup and snapshot management
- Platform monitoring and administration
- Service health dashboards
