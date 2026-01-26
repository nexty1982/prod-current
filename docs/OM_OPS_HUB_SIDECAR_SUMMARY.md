# OM-Ops Hub Sidecar Service - Implementation Summary

## Overview
Extracted OM-Ops Reports Hub into a standalone sidecar service that runs independently on port 3010, decoupled from main backend/frontend builds.

## Architecture

### Service Location
- **Path**: `/var/www/orthodoxmetrics/prod/ops-hub`
- **Port**: `3010` (fixed)
- **Runtime**: Node.js + Express (no build step required)

### Dependencies
- `express` - Web server
- `morgan` - Request logging
- Node.js >= 16.0.0

## Files Created

### Sidecar Service
1. **`ops-hub/package.json`** - Dependencies and scripts
2. **`ops-hub/src/server.js`** - Express server with routes
3. **`ops-hub/src/artifacts/indexer.js`** - Artifact discovery and indexing
4. **`ops-hub/src/ui/index.html`** - Simple HTML/vanilla JS UI (no React build)
5. **`ops-hub/README.md`** - Service documentation

### Main Backend Changes
1. **`server/src/routes/admin/auth-check.js`** (NEW) - Auth check endpoint for Nginx
2. **`server/src/index.ts`** (MODIFIED) - Mounted `/api/admin/auth/check` route

### PM2 Configuration
1. **`ecosystem.config.cjs`** (MODIFIED) - Added `om-ops-hub` process

## API Endpoints

### Sidecar Service (Port 3010)
- `GET /health` → `{ ok: true, service: 'om-ops-hub', port: 3010 }`
- `GET /api/artifacts` → List artifacts (filters: type, q, limit, offset, from, to)
- `GET /api/artifacts/:id` → Get artifact metadata
- `GET /api/artifacts/:id/file/:filename` → Stream file safely
- `GET /` → UI for browsing artifacts

### Main Backend (Port 3001)
- `GET /api/admin/auth/check` → Returns 204 if admin, 401/403 otherwise (for Nginx auth_request)

## Nginx Configuration

Add to your site config (e.g., `/etc/nginx/sites-available/orthodoxmetrics.com`):

See `ops-hub/nginx-config-snippet.conf` for the complete configuration snippet.

Key points:
- `/_admin_auth_check` - Internal location that calls main backend auth endpoint
- `/admin/ops/` - Public location protected by `auth_request`
- Proxies to `http://127.0.0.1:3010/` (sidecar service)

After adding, test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## PM2 Setup

### Start Service
```bash
cd /var/www/orthodoxmetrics/prod
pm2 start ecosystem.config.cjs --only om-ops-hub
```

### Save PM2 Config
```bash
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

### Verify
```bash
pm2 list
pm2 logs om-ops-hub
```

## Security Features

1. **Nginx auth_request**: All `/admin/ops/` requests go through auth check
2. **Path traversal protection**: `sanitizePath()` prevents `..`, absolute paths, symlinks
3. **Safe extensions only**: Whitelist (.html, .json, .txt, .log, .md, .csv)
4. **CSP headers**: HTML files served with Content-Security-Policy
5. **File validation**: Files must exist in artifact metadata before serving

## Artifact Discovery

Automatically scans `/var/backups/OM/` for:
- `analysis/report.html` and `analysis/runs/<ts>/`
- `changelog/sessions/<session>/`
- `summary/runs/<ts>/`
- `motivation/runs/<ts>/`
- `roadmap/report.html`
- `index.json` files for metadata

## UI Features

- Simple HTML + vanilla JavaScript (no build step)
- Filter by type and search
- Artifact list with metadata
- File viewer modal:
  - HTML preview in sandboxed iframe
  - Source code viewer for JSON/text/log/md
  - "Open in new tab" button

## Testing Checklist

- [ ] Service starts: `pm2 start om-ops-hub`
- [ ] Health check: `curl http://127.0.0.1:3010/health`
- [ ] UI loads: `curl http://127.0.0.1:3010/`
- [ ] Artifacts API: `curl http://127.0.0.1:3010/api/artifacts`
- [ ] Nginx config reloaded: `nginx -t && systemctl reload nginx`
- [ ] Admin access: `https://orthodoxmetrics.com/admin/ops` (when logged in as admin)
- [ ] Non-admin blocked: Returns 401/403
- [ ] Path traversal blocked: `/api/artifacts/../etc/passwd` denied
- [ ] Service survives main backend restart
- [ ] Service survives main frontend build failure

## Benefits

✅ **Decoupled**: Runs independently, doesn't break if main app fails  
✅ **Simple**: No build step, vanilla JS UI  
✅ **Fast**: Lightweight Express server  
✅ **Secure**: Nginx auth_request + defensive checks  
✅ **Reliable**: PM2 manages lifecycle, auto-restart on failure  

## Commands Summary

```bash
# Install dependencies
cd /var/www/orthodoxmetrics/prod/ops-hub
npm install

# Start with PM2
pm2 start ecosystem.config.cjs --only om-ops-hub
pm2 save

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Verify
pm2 list
curl http://127.0.0.1:3010/health
```

## Files Modified

1. **`ecosystem.config.cjs`** - Added `om-ops-hub` process
2. **`server/src/index.ts`** - Added `/api/admin/auth/check` route
3. **`server/src/routes/admin/ops.js`** - Commented out (legacy, now handled by sidecar)

## Next Steps

1. Test Nginx auth_request configuration
2. Verify PM2 auto-start on reboot
3. Monitor service logs for errors
4. Consider adding artifact caching for performance
5. Optional: Add artifact deletion endpoint (with confirmation)
