# Server Status - Current Setup Documentation

**Date:** 2026-01-23  
**Purpose:** Document existing infrastructure, monitoring capabilities, and data sources for Server Status implementation

## 1. OM-Ops Menu Wiring and UI Layer

### Menu Dispatch
- **Location:** `tools/om_recovery/om_recovery.py`
- **Pattern:** Menu items defined in `show_main_menu()` with action handlers in `handle_main_menu()`
- **Current menu items:** 20 items (0-20), with "OM Instance Information" as item (20)
- **New item:** Server Status will be added as item (21)

### UI Screen Renderer
- **Location:** `tools/om_recovery/ui_screen.py`
- **Functions available:**
  - `render_screen(title, breadcrumb, body_lines, footer_hint)` - Full screen rendering
  - `clear_screen()` - Clear terminal
  - `get_user_input(prompt)` - Get user input
  - `wait_for_enter(message)` - Wait for Enter key

## 2. Instance Information (Item 20) - What It Already Collects

**Location:** `tools/om_recovery/instance_info.py`

### Already Collected:
- **Identity & Paths:**
  - Hostname, timestamp, timezone, uname
  - Key directories (repo_root, backend, frontend, ops_hub, nginx, backups)
  - Config file locations and existence

- **Service Health:**
  - PM2 status (orthodox-backend, om-ops-hub)
  - Backend health endpoints (HTTP checks)
  - Nginx config validation (`nginx -t`)
  - Port listeners (3001, 3010, 80, 443, 3080) via `ss -lntp`

- **Database Info:**
  - Config file detection (no actual connection)
  - Database name hints from config files
  - FreeScout DB info (Docker-based)

- **System Resources:**
  - Disk usage (`df -h`)
  - Memory (`free -h`)
  - Load average (`uptime`)
  - Top processes (limited parsing)

- **Log Locations:**
  - PM2 logs path
  - Nginx logs path
  - System logs

### What Server Status Should NOT Duplicate:
- Static path/config discovery (Instance Info already covers this)
- Basic system info (hostname, uname, etc.)
- Config file existence checks

### What Server Status SHOULD Add:
- **Real-time performance metrics** (not just current state)
- **Network latency measurements** (ping, DNS, TCP connect)
- **External reachability** (curl with timing)
- **Historical trends** (time-windowed aggregates)
- **Codebase metrics** (LOC counts)
- **Speed tests** (optional)

## 3. Re-usable Helpers/Commands

### Available Utilities (`tools/om_recovery/utils.py`):
- `run_cmd(cmd, timeout, redact, cwd)` - Safe command execution
- `log_ops(message, level)` - Logging
- `require_confirmation(prompt, phrase)` - User confirmation
- `redact_secrets(text)` - Secret redaction

### PM2 Operations (`tools/om_recovery/pm2_ops.py`):
- `pm2_status()` - Get PM2 status dict
- `pm2_info(proc_name)` - Get detailed process info
- PM2 log paths available

### Nginx Operations (`tools/om_recovery/nginx_ops.py`):
- `nginx_validate_config()` - Validate config
- `nginx_status()` - Get status
- `find_orthodoxmetrics_site_config()` - Find site config
- `NGINX_ERROR_LOG` - Error log path

### Database Credentials (`tools/om_recovery/om_recovery.py`):
- `get_db_credentials()` - Extract DB credentials from .env files
- Returns: host, port, user, password, database, auth_database
- Defaults: localhost:3306, root user, orthodoxmetrics_db, orthodoxmetrics_auth_db

## 4. Monitoring/Data Sources Available

### Prometheus/node_exporter
- **Status:** Unknown (not found in codebase)
- **Recommendation:** Check at runtime, assume not available for initial implementation
- **Fallback:** Use snapshot-based telemetry

### Historical Metrics
- **PM2 Logs:** Available at `~/.pm2/logs/` (or configured path)
- **System Logs:** `/var/log/` (syslog, nginx, etc.)
- **OM-Ops Snapshots:** `/var/backups/OM/` (various subdirectories)
- **Instance Info Reports:** `/var/backups/OM/instance_info/runs/`

### sar/sysstat
- **Status:** Unknown (not found in codebase)
- **Recommendation:** Check at runtime, assume not available
- **Fallback:** Use snapshot-based telemetry + basic system commands

### Snapshot-Based Telemetry (To Be Implemented)
- **Location:** `/var/backups/OM/server_status/snapshots/`
- **Format:** JSON files with timestamp
- **Frequency:** On-demand + optional scheduled collection
- **Aggregation:** Compute aggregates for time windows (1h/3h/6h/12h/24h/7d/30d)

## 5. Service/Ports and URLs

### Backend
- **Port:** 3001
- **PM2 Name:** `orthodox-backend`
- **Health Endpoints:**
  - `http://127.0.0.1:3001/api/system/health`
  - `http://127.0.0.1:3001/health`
  - `http://127.0.0.1:3001/`

### Ops Hub
- **Port:** 3010
- **PM2 Name:** `om-ops-hub`

### Nginx
- **Ports:** 80 (HTTP), 443 (HTTPS)
- **Front Door:** Listens on 80/443
- **Site Config:** `/etc/nginx/sites-enabled/orthodoxmetrics.com`
- **Error Log:** `/var/log/nginx/error.log`

### External URL
- **Canonical:** `https://orthodoxmetrics.com`
- **Internal:** `http://localhost` (via nginx)

### Database
- **Type:** MariaDB/MySQL
- **Default Host:** localhost
- **Default Port:** 3306
- **Databases:**
  - `orthodoxmetrics_db` (main)
  - `orthodoxmetrics_auth_db` (auth)

## 6. Codebase Structure

### Repo Root
- **Path:** `/var/www/orthodoxmetrics/prod`
- **Backend:** `server/`
- **Frontend:** `front-end/`
- **Ops Hub:** `ops-hub/`

### Exclusions for LOC Counting
- **Directories to exclude:**
  - `template/` (Modernize template)
  - `vendor/`
  - `build/`
  - `node_modules/`
  - `dist/`
  - `.git/`
- **Approach:** Use git history or path filters to isolate app code

## 7. Implementation Notes

### Safety Constraints
- All probes must be bounded (timeouts)
- Never print DB passwords/tokens
- Avoid giant log dumps (show paths and tail last N lines only)
- Use `subprocess.run(..., timeout=...)` everywhere

### Performance Targets
- Full status probe: < 15s (excluding optional speed test)
- Snapshot save: < 1s
- History aggregation: < 5s for reasonable snapshot counts

### Data Persistence
- **Snapshots:** `/var/backups/OM/server_status/snapshots/<timestamp>.json`
- **Reports:** `/var/backups/OM/server_status/reports/` (optional)
- **Format:** JSON for snapshots, Markdown for reports

## 8. Historical Metrics Reality Check

### Currently Available:
- ✅ PM2 restart counts (from `pm2 info`)
- ✅ PM2 uptime (from `pm2 info`)
- ✅ System uptime (from `uptime`)
- ✅ Disk usage (from `df -h`)
- ✅ Memory usage (from `free -h`)
- ✅ Load average (from `uptime`)

### Not Available (Requires Snapshot Collection):
- ❌ Historical CPU trends
- ❌ Historical memory trends
- ❌ Historical disk trends
- ❌ Historical network latency
- ❌ Historical external reachability timing
- ❌ Historical backend restart deltas

### Solution:
Implement lightweight snapshot-based telemetry that saves key metrics on each status check. Aggregates can then be computed for requested time windows.

## 9. Speed Test Options

### Available Tools (To Check at Runtime):
- `speedtest-cli` (if installed)
- `fast-cli` (if installed)
- Custom curl-based bandwidth test (fallback)

### Recommendation:
- Make speed test optional (separate menu action)
- Guard with timeout (30-60s max)
- Show remediation instructions if tool not available

## 10. Summary

**What We Have:**
- ✅ Well-structured menu system
- ✅ UI screen renderer
- ✅ PM2, Nginx, DB helpers
- ✅ Instance info baseline (static config/inventory)

**What We Need to Add:**
- ✅ Real-time performance probes
- ✅ Network latency checks
- ✅ External reachability with timing
- ✅ Snapshot-based historical metrics
- ✅ Codebase LOC counting
- ✅ Optional speed test

**Historical Metrics Strategy:**
- Start collecting snapshots now
- Compute aggregates from snapshots
- Show "insufficient data" when appropriate
- Do NOT claim 30d metrics unless snapshots exist
