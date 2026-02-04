#!/usr/bin/env bash
#
# check-church-status.sh — Quick health check for the ChurchHeader indicator
#
# Tests the same endpoints the browser UI uses:
#   - /api/admin/churches (ChurchHeader component)
#   - /api/my/churches (churchService.fetchChurches)
#   - /api/admin/session-stats (SessionPulseIndicator)
#   - /api/baptism-records (BaptismRecordsPage)
#
# Uses JWT Bearer token auth (works over localhost even with Secure cookies)
#
# Usage:
#   check-church-status.sh              # Uses superadmin
#   check-church-status.sh user@email   # Uses specific user
#
set -euo pipefail

PORT="${PORT:-3001}"
BASE="http://localhost:$PORT"
EMAIL="${1:-superadmin@orthodoxmetrics.com}"
PASS="${2:-Summerof16!}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Check if server is reachable
if ! curl -sf "$BASE/api/system/health" > /dev/null 2>&1; then
  echo -e "${RED}${BOLD}SERVER DOWN${RESET} — Cannot reach $BASE"
  exit 1
fi

# Build JSON payload safely (avoid bash ! escaping issues)
LOGIN_JSON=$(python3 -c "import json; print(json.dumps({'email':'$EMAIL','password':'$PASS'}))")

# Login to get JWT access token
login_response=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$LOGIN_JSON" 2>&1)

login_ok=$(echo "$login_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "False")

if [ "$login_ok" != "True" ]; then
  echo -e "${RED}${BOLD}LOGIN FAILED${RESET} — $login_response"
  exit 1
fi

# Extract JWT token for Bearer auth
TOKEN=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo -e "${BOLD}Church & Session Status Check${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "User: ${CYAN}$EMAIL${RESET}"
echo ""

# 1. ChurchHeader endpoint: /api/admin/churches
church_resp=$(curl -s "$BASE/api/admin/churches" -H "$AUTH_HEADER" 2>&1)
church_count=$(echo "$church_resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if isinstance(d, list):
        print(len(d))
    elif isinstance(d.get('data'), list):
        print(len(d['data']))
    elif d.get('data',{}).get('churches'):
        print(len(d['data']['churches']))
    elif d.get('error'):
        print('ERROR:' + d['error'])
    else:
        print('0')
except:
    print('ERROR:parse')
" 2>/dev/null || echo "ERROR:fetch")

if [[ "$church_count" == ERROR* ]]; then
  echo -e "  ChurchHeader (/api/admin/churches):  ${RED}${BOLD}RED${RESET} — $church_count"
else
  echo -e "  ChurchHeader (/api/admin/churches):  ${GREEN}${BOLD}GREEN${RESET} — $church_count churches"
fi

# 2. churchService endpoint: /api/my/churches
my_resp=$(curl -s "$BASE/api/my/churches" -H "$AUTH_HEADER" 2>&1)
my_count=$(echo "$my_resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if isinstance(d, list):
        print(len(d))
    elif d.get('data',{}).get('churches'):
        print(len(d['data']['churches']))
    elif d.get('churches'):
        print(len(d['churches']))
    elif d.get('error'):
        print('ERROR:' + d['error'])
    else:
        print('0')
except:
    print('ERROR:parse')
" 2>/dev/null || echo "ERROR:fetch")

if [[ "$my_count" == ERROR* ]]; then
  echo -e "  Church Service (/api/my/churches):    ${RED}${BOLD}RED${RESET} — $my_count"
else
  echo -e "  Church Service (/api/my/churches):    ${GREEN}${BOLD}GREEN${RESET} — $my_count churches"
fi

# 3. SessionPulseIndicator: /api/admin/session-stats
session_resp=$(curl -s "$BASE/api/admin/session-stats" -H "$AUTH_HEADER" 2>&1)
session_status=$(echo "$session_resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ratio = d.get('ratio', 0)
    active = d.get('activeSessions', '?')
    if ratio > 1.1:
        print(f'LEAK:ratio={ratio},active={active}')
    else:
        print(f'OK:ratio={ratio},active={active}')
except:
    print('ERROR')
" 2>/dev/null || echo "ERROR:fetch")

if [[ "$session_status" == OK* ]]; then
  echo -e "  Session Pulse (/api/admin/session-stats): ${GREEN}${BOLD}GREEN${RESET} — $session_status"
elif [[ "$session_status" == LEAK* ]]; then
  echo -e "  Session Pulse (/api/admin/session-stats): ${RED}${BOLD}RED${RESET} — $session_status"
else
  echo -e "  Session Pulse (/api/admin/session-stats): ${YELLOW}${BOLD}WARN${RESET} — $session_status"
fi

# 4. Baptism records: /api/baptism-records
baptism_resp=$(curl -s "$BASE/api/baptism-records" -H "$AUTH_HEADER" 2>&1)
baptism_status=$(echo "$baptism_resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if d.get('records') is not None:
        print(f'OK:{len(d[\"records\"])} records')
    elif d.get('error'):
        print(f'ERROR:{d[\"error\"]}')
    else:
        print('OK:response received')
except:
    print('ERROR:parse')
" 2>/dev/null || echo "ERROR:fetch")

if [[ "$baptism_status" == OK* ]]; then
  echo -e "  Baptism Records (/api/baptism-records):   ${GREEN}${BOLD}GREEN${RESET} — $baptism_status"
else
  echo -e "  Baptism Records (/api/baptism-records):   ${RED}${BOLD}RED${RESET} — $baptism_status"
fi

# 5. System health
health_resp=$(curl -s "$BASE/api/system/health" 2>&1)
health_status=$(echo "$health_resp" | python3 -c "
import sys, json
d = json.load(sys.stdin)
db = d.get('database',{}).get('success', False)
print(f'OK:db={db}' if d.get('status') == 'ok' else f'ERROR:{d}')
" 2>/dev/null || echo "ERROR:unreachable")

if [[ "$health_status" == OK* ]]; then
  echo -e "  System Health (/api/system/health):       ${GREEN}${BOLD}GREEN${RESET} — $health_status"
else
  echo -e "  System Health (/api/system/health):       ${RED}${BOLD}RED${RESET} — $health_status"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
