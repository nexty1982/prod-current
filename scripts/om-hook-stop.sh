#!/usr/bin/env bash
# om-hook-stop.sh — Claude Code Stop hook
# Signals agent-complete on the OM Daily item tracked for this session.
# Reads JSON from stdin. Always exits 0.

set -euo pipefail

API_BASE="http://127.0.0.1:3001/api"
SVC_EMAIL="nickeypain@gmail.com"
SVC_PASS="OmSvc2026!"

# ── Read hook input from stdin ────────────────────────────────────────
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null || true)

if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi

SESSION_FILE="/tmp/claude-om-session-${SESSION_ID}"

if [[ ! -f "$SESSION_FILE" ]]; then
  exit 0  # No item tracked for this session
fi

ITEM_ID=$(head -1 "$SESSION_FILE" 2>/dev/null || true)

if [[ -z "$ITEM_ID" ]]; then
  rm -f "$SESSION_FILE"
  exit 0
fi

# ── Authenticate ─────────────────────────────────────────────────────
TOKEN=$(curl -sf -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SVC_EMAIL\",\"password\":\"$SVC_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)

if [[ -z "$TOKEN" ]]; then
  rm -f "$SESSION_FILE"
  exit 0
fi

# ── Signal completion ────────────────────────────────────────────────
curl -sf -X POST "$API_BASE/om-daily/items/$ITEM_ID/agent-complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent_tool":"claude_cli","summary":"Auto-completed by Claude Code stop hook"}' \
  >/dev/null 2>&1 || true

rm -f "$SESSION_FILE"
exit 0
