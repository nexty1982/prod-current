# OM Instance Information - Current Setup Documentation

**Date:** 2026-01-23  
**Purpose:** Document current system configuration for OM Instance Information dashboard

## OM-Ops Entrypoint and Menu Wiring

### Entry Point
- **Main File:** `tools/om_recovery/om_recovery.py`
- **Menu Rendering:** `show_main_menu()` function (line ~848)
- **Menu Dispatch:** `main_menu()` function returns action strings, handled in main loop (line ~2391)
- **UI Screen:** `tools/om_recovery/ui_screen.py` provides `render_screen()`, `get_user_input()`, `wait_for_enter()`, `clear_screen()`

### Current Menu Structure
- Menu items are tuples: `(number, description, action, available_flag)`
- Actions are handled in main loop with `elif action == "action_name":`
- Checkmarks (✓) shown for items where `available_flag` is True

## Existing Modules That Collect System Info

### system_summary.py
- Generates system summary reports
- Uses `REPORT_FILE` constant for output location
- Available via menu item (6) "System Summary"

### build_ops.py
- Collects build state information
- Checks git status, build artifacts
- Logs to `/var/backups/OM/build_ops/runs/<timestamp>/`
- Defines: `REPO_ROOT`, `BACKEND_DIR`, `FRONTEND_DIR`, `BACKEND_PORT = 3001`

### nginx_ops.py
- Nginx status and configuration validation
- Finds orthodoxmetrics.com site config
- Parses proxy settings
- Uses `NGINX_ERROR_LOG` constant

### pm2_ops.py
- PM2 process management
- Status checks, restart, logs
- Process name: `orthodox-backend` (and `om-ops-hub`)

### utils.py
- Shared utilities: `log_ops()`, `run_cmd()`, `require_confirmation()`
- Logs to `/var/backups/OM/om-ops.log`

## Canonical Install Paths and Services

### Repository Structure
- **Repo Root:** `/var/www/orthodoxmetrics/prod`
- **Backend:** `/var/www/orthodoxmetrics/prod/server`
- **Front-end:** `/var/www/orthodoxmetrics/prod/front-end`
- **Ops Hub:** `/var/www/orthodoxmetrics/prod/ops-hub`

### Service Ports
- **Backend:** `3001` (http://127.0.0.1:3001)
- **Ops Hub:** `3010` (http://127.0.0.1:3010)
- **Nginx:** `80` (HTTP), `443` (HTTPS)
- **FreeScout:** `3080` (internal, proxied via Nginx at /helpdesk/)

### PM2 Processes
- **orthodox-backend** - Main backend service
- **om-ops-hub** - Ops hub service

### Nginx Configuration
- **Site Configs:** `/etc/nginx/sites-enabled/orthodoxmetrics.com`
- **Snippets:** `/etc/nginx/snippets/` (if any)
- **Error Log:** `/var/log/nginx/error.log`
- **Access Log:** `/var/log/nginx/access.log`

### Artifacts and Backups
- **Backup Root:** `/var/backups/OM/`
- **Build Ops:** `/var/backups/OM/build_ops/runs/`
- **Analysis:** `/var/backups/OM/analysis/runs/`
- **Changelog:** `/var/backups/OM/changelog/`
- **System Summary:** Defined in `system_summary.py` `REPORT_FILE`
- **OM-Ops Log:** `/var/backups/OM/om-ops.log`

## Config File Locations

### Backend Configuration
- **Environment Files:** 
  - `/var/www/orthodoxmetrics/prod/server/.env` (if exists)
  - Config modules in `server/config/` directory
- **Database Config:** Likely in `server/config/db.js` or similar

### Nginx Configuration
- **Main Config:** `/etc/nginx/nginx.conf`
- **Site Config:** `/etc/nginx/sites-enabled/orthodoxmetrics.com`
- **Snippets:** `/etc/nginx/snippets/*.conf` (if any)

### PM2 Configuration
- PM2 ecosystem file (if exists): Check `server/ecosystem.config.js` or similar
- PM2 stores config in `~/.pm2/` directory

### OM-Ops Configuration
- **Exclusions:** Defined in `exclusions.py` module (if available)
- **FreeScout:** `/opt/freescout/.env` (contains DB credentials, API key location)
- **Zammad:** `/opt/zammad/.secrets.env` (if still configured)

### Docker Services
- **FreeScout:** `/opt/freescout/docker-compose.yml`
- **Zammad:** `/opt/zammad/docker-compose.yml` (frozen/abandoned)

## Database Configuration

### Database Access
- Database credentials stored in:
  - Backend `.env` files (not to be printed)
  - FreeScout `.env` (MySQL)
  - Zammad `.secrets.env` (PostgreSQL, if still active)

### Database Types
- **Application DB:** Likely MySQL/MariaDB (check backend config)
- **FreeScout:** MySQL (via Docker)
- **Zammad:** PostgreSQL (via Docker, if still active)

## Log Locations

### PM2 Logs
- PM2 log location: `~/.pm2/logs/` or configured path
- Per-process logs: `orthodox-backend-out.log`, `orthodox-backend-error.log`
- Retrieve via: `pm2 logs orthodox-backend`

### Backend Logs
- Application logs: Check `server/logs/` or `server/dist/logs/`
- Error logs: May be in PM2 logs or separate file

### Nginx Logs
- **Access:** `/var/log/nginx/access.log`
- **Error:** `/var/log/nginx/error.log`
- **Site-specific:** May have separate logs per site

### OM-Ops Logs
- **Main Log:** `/var/backups/OM/om-ops.log`
- **Build Runs:** `/var/backups/OM/build_ops/runs/<timestamp>/`
- **Analysis Runs:** `/var/backups/OM/analysis/runs/<timestamp>/`

### Docker Logs
- **FreeScout:** `docker logs freescout-app` (from `/opt/freescout/`)
- **Zammad:** `docker logs zammad-app` (from `/opt/zammad/`, if still running)

## Health Endpoints

### Backend Health
- **Primary:** `http://127.0.0.1:3001/api/system/health`
- **Fallback:** `http://127.0.0.1:3001/health`

### Nginx Health
- **Config Test:** `nginx -t`
- **Status:** Check if service is running

## System Resources

### Disk Usage
- Key mounts to check:
  - `/` (root)
  - `/var/www` (application)
  - `/var/backups` (backups)
  - `/var/log` (logs)

### Memory
- Check via `free -h`
- Load average via `uptime`

### Network
- Check `/proc/net/dev` for interface stats
- Port listeners via `ss -lntp`

## Tomorrow's Refactor Risk Checklist

### Path Dependencies
1. **Backend Config Loader**
   - Depends on: `REPO_ROOT`, `BACKEND_DIR`
   - Must update: Config file path resolution

2. **Nginx Includes**
   - Depends on: `/etc/nginx/sites-enabled/orthodoxmetrics.com`
   - Must update: Include paths, snippet references

3. **OM-Ops Environment Roots**
   - Depends on: `REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")`
   - Must update: All modules using `REPO_ROOT`

4. **Build Ops**
   - Depends on: `BACKEND_DIR`, `FRONTEND_DIR`, `BACKEND_PORT`
   - Must update: Build script paths, port checks

5. **Backup Operations**
   - Depends on: `BACKUP_ROOT = Path("/var/backups/OM")`
   - Must update: Backup target paths

6. **PM2 Process Management**
   - Depends on: Process names (`orthodox-backend`, `om-ops-hub`)
   - Must update: If process names change

7. **Log Paths**
   - Depends on: Various log locations
   - Must update: Log rotation configs, log aggregation

### Order of Updates
1. Update constants in `om_recovery.py` and `build_ops.py`
2. Update backend config loader
3. Update Nginx configs
4. Update PM2 ecosystem (if used)
5. Update backup/artifact paths
6. Update log rotation configs
7. Test all operations
