# OM-Ops Hub - Sidecar Service

Standalone service for serving OM-Ops artifacts independently of the main backend/frontend.

## Installation

```bash
cd /var/www/orthodoxmetrics/prod/ops-hub
npm install
```

## Configuration

Environment variables:
- `PORT` - Server port (default: 3010)
- `ARTIFACTS_ROOT` - Path to artifacts directory (default: /var/backups/OM)

## PM2 Management

Start:
```bash
pm2 start ecosystem.config.cjs --only om-ops-hub
```

Or use the main ecosystem:
```bash
pm2 start /var/www/orthodoxmetrics/prod/ecosystem.config.cjs --only om-ops-hub
```

Stop:
```bash
pm2 stop om-ops-hub
```

Restart:
```bash
pm2 restart om-ops-hub
```

Logs:
```bash
pm2 logs om-ops-hub
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/artifacts` - List artifacts (with filters)
- `GET /api/artifacts/:id` - Get artifact metadata
- `GET /api/artifacts/:id/file/:filename` - Stream file
- `GET /` - UI for browsing artifacts

## Security

- Admin access enforced via Nginx `auth_request`
- Path traversal protection
- Safe file extensions only (.html, .json, .txt, .log, .md, .csv)
- CSP headers for HTML files
