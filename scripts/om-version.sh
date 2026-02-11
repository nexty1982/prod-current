#!/usr/bin/env bash
#
# om-version.sh — Check if backend, frontend, and database builds are in sync
#
set -euo pipefail

PROD_DIR="/var/www/orthodoxmetrics/prod"
SERVER_DIR="$PROD_DIR/server"
FRONTEND_DIR="$PROD_DIR/front-end"
FRONTEND_DIST="$FRONTEND_DIR/dist"

# Source credentials from .env files (if they exist)
# Priority: server/.env > prod/.env > ~/.env
for envfile in "$SERVER_DIR/.env" "$PROD_DIR/.env" "$HOME/.env"; do
  if [ -f "$envfile" ]; then
    set -a
    source "$envfile" 2>/dev/null || true
    set +a
    break
  fi
done

# Also check for DB_ prefixed vars commonly used in Node apps
DB_USER="${DB_USER:-${DB_USERNAME:-orthodoxapps}}"
DB_PASS="${DB_PASS:-${DB_PASSWORD:-}}"
DB_NAME="${DB_NAME:-${DB_DATABASE:-orthodoxmetrics_db}}"
PORT="${PORT:-3001}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# --- Database version ---
db_ver="unknown"
if [ -n "$DB_PASS" ]; then
  db_ver=$(mariadb -u "$DB_USER" -p"$DB_PASS" -N -s -e "SELECT version_string FROM system_info WHERE id=1;" "$DB_NAME" 2>/dev/null || echo "query failed")
elif command -v mariadb &>/dev/null; then
  # Try without password (socket auth)
  db_ver=$(mariadb -u "$DB_USER" -N -s -e "SELECT version_string FROM system_info WHERE id=1;" "$DB_NAME" 2>/dev/null || echo "auth required")
fi

# --- Git (source of truth) ---
git_sha="unknown"
git_branch="unknown"
if command -v git &>/dev/null && [ -d "$PROD_DIR/.git" ]; then
  git_sha=$(git -C "$PROD_DIR" rev-parse --short=7 HEAD 2>/dev/null || echo "unknown")
  git_branch=$(git -C "$PROD_DIR" branch --show-current 2>/dev/null || echo "unknown")
fi

# --- Frontend (baked into dist at build time) ---
fe_sha="not built"
fe_version="unknown"
fe_build_time="unknown"

buildinfo_file=$(ls "$FRONTEND_DIST"/assets/buildInfo-*.js 2>/dev/null | head -1)
if [ -n "$buildinfo_file" ]; then
  # Extract from the minified JS: version:"5.0.0", gitSha is derived from full sha
  fe_sha=$(grep -oP '(?<=i=")[a-f0-9]+' "$buildinfo_file" 2>/dev/null | head -1)
  [ ${#fe_sha} -gt 7 ] && fe_sha="${fe_sha:0:7}"
  fe_version=$(grep -oP '(?<=n=")[^"]+' "$buildinfo_file" 2>/dev/null | head -1)
  fe_build_time=$(grep -oP '(?<=buildTime:")[^"]+' "$buildinfo_file" 2>/dev/null | head -1)
fi

# --- Server (from package.json + env) ---
srv_version=$(python3 -c "import json; print(json.load(open('$SERVER_DIR/package.json'))['version'])" 2>/dev/null || echo "unknown")

srv_sha="unknown"
srv_running=false
# Try the API first
api_response=$(curl -sf "http://localhost:$PORT/api/system/version" 2>/dev/null || echo "")
if [ -n "$api_response" ] && echo "$api_response" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  srv_sha=$(echo "$api_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('server',{}).get('gitSha','unknown'))" 2>/dev/null || echo "unknown")
  srv_running=true
else
  # API not mounted — check if server is at least running
  health=$(curl -sf "http://localhost:$PORT/api/system/health" 2>/dev/null || echo "")
  if [ -n "$health" ]; then
    srv_running=true
    # Server doesn't expose its SHA via API; check GIT_SHA from pm2 env
    srv_sha=$(pm2 env 0 2>/dev/null | grep -oP '(?<=GIT_SHA=)[^\s]+' || echo "not set")
    if [ "$srv_sha" = "not set" ] || [ -z "$srv_sha" ]; then
      srv_sha="not set (env GIT_SHA missing)"
    fi
  fi
fi

# --- Server process status ---
proc_status="not running"
srv_pid=$(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
if [ -n "$srv_pid" ]; then
  proc_etime=$(ps -p "$srv_pid" -o etime= 2>/dev/null | xargs)
  proc_cmd=$(ps -p "$srv_pid" -o args= 2>/dev/null | xargs)
  # Check if managed by PM2
  pm2_name=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    procs = json.load(sys.stdin)
    for p in procs:
        if p.get('pid') == $srv_pid:
            print(p.get('name','pm2'))
            break
except: pass
" 2>/dev/null)
  if [ -n "$pm2_name" ]; then
    proc_status="pm2:$pm2_name (pid $srv_pid, up $proc_etime)"
  else
    proc_status="node (pid $srv_pid, up $proc_etime)"
  fi
fi

# --- Compare ---
fe_short="${fe_sha:0:7}"
git_short="${git_sha:0:7}"

echo ""
echo -e "${BOLD}OrthodoxMetrics Version Check${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Git HEAD:${RESET}        $git_short ($git_branch)"
echo -e "${CYAN}MariaDB Ver:${RESET}     $db_ver"
echo ""
echo -e "${BOLD}Frontend${RESET}"
echo -e "  Version:     $fe_version"
echo -e "  Git SHA:     $fe_short"
echo -e "  Built:       $fe_build_time"
echo ""
echo -e "${BOLD}Server${RESET}"
echo -e "  Version:     $srv_version"
echo -e "  Git SHA:     $srv_sha"
echo -e "  Process:     $proc_status"
echo ""

# --- Verdict ---
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$fe_short" = "$git_short" ] && [ "$srv_running" = true ]; then
  if echo "$srv_sha" | grep -q "$git_short"; then
    echo -e "${GREEN}${BOLD}MATCH${RESET} — Frontend and server are on the same commit ($git_short)"
  elif echo "$srv_sha" | grep -q "not set"; then
    echo -e "${YELLOW}${BOLD}PARTIAL${RESET} — Frontend matches git HEAD ($git_short)"
    echo -e "  Server GIT_SHA env var is not set. To fix:"
    echo -e "  ${CYAN}GIT_SHA=$git_sha pm2 restart all${RESET}"
  else
    echo -e "${RED}${BOLD}MISMATCH${RESET} — Server SHA ($srv_sha) differs from git HEAD ($git_short)"
    echo -e "  Rebuild the server or restart with: ${CYAN}GIT_SHA=$git_sha pm2 restart all${RESET}"
  fi
elif [ "$fe_short" != "$git_short" ]; then
  echo -e "${RED}${BOLD}MISMATCH${RESET} — Frontend was built from $fe_short but git HEAD is $git_short"
  echo -e "  Rebuild frontend: ${CYAN}cd $FRONTEND_DIR && npm run build${RESET}"
elif [ "$srv_running" = false ]; then
  echo -e "${RED}${BOLD}SERVER DOWN${RESET} — Cannot reach server on port $PORT"
  echo -e "  Start it: ${CYAN}pm2 start ecosystem.config.js${RESET}"
fi

echo ""
