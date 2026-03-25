#!/usr/bin/env bash
# om-hook-prewrite.sh — Claude Code PreToolUse hook
# Auto-creates an OM Daily work item on the first Edit/Write of a session.
# Reads JSON from stdin. Always exits 0 (never blocks user work).

set -euo pipefail

API_BASE="http://127.0.0.1:3001/api"
SVC_EMAIL="nickeypain@gmail.com"
SVC_PASS="OmSvc2026!"

# ── Read hook input from stdin ────────────────────────────────────────
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null || true)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || true)

if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi

SESSION_FILE="/tmp/claude-om-session-${SESSION_ID}"

# ── Fast path: session already has an item ────────────────────────────
if [[ -f "$SESSION_FILE" ]]; then
  exit 0
fi

# ── Detect repo from file path or cwd ────────────────────────────────
REPO_TARGET="orthodoxmetrics"
REPO_DIR="/var/www/orthodoxmetrics/prod"
if [[ "$FILE_PATH" == */omai/* ]] || [[ "${PWD:-}" == */omai/* ]]; then
  REPO_TARGET="omai"
  REPO_DIR="/var/www/omai"
fi

# ── Check if current branch is already tied to a work item ───────────
BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
if [[ "$BRANCH" =~ ^(EF|NF|BF|PA)_.*_([0-9]+)$ ]]; then
  # Branch name ends with _itemId — reuse that item
  EXISTING_ID="${BASH_REMATCH[2]}"
  echo "$EXISTING_ID" > "$SESSION_FILE"
  exit 0
fi

# ── Authenticate ─────────────────────────────────────────────────────
TOKEN=$(curl -sf -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SVC_EMAIL\",\"password\":\"$SVC_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)

if [[ -z "$TOKEN" ]]; then
  exit 0  # Auth failed — don't block
fi

# ── If on a tracked branch without item ID suffix, look it up ────────
if [[ "$BRANCH" =~ ^(EF|NF|BF|PA)_ ]]; then
  LOOKUP=$(curl -sf "$API_BASE/om-daily/items?search=${BRANCH}&sort=created_at&direction=desc" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "{}")
  FOUND_ID=$(echo "$LOOKUP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
branch = '$BRANCH'
for item in items:
    if item.get('github_branch') == branch:
        print(item['id'])
        sys.exit(0)
print('')
" 2>/dev/null || true)
  if [[ -n "$FOUND_ID" ]]; then
    echo "$FOUND_ID" > "$SESSION_FILE"
    exit 0
  fi
fi

# ── Auto-detect category from file path ──────────────────────────────
CATEGORY="backend"
if [[ "$FILE_PATH" == *front-end/* ]] || [[ "$FILE_PATH" == */berry/* ]]; then
  CATEGORY="frontend"
elif [[ "$FILE_PATH" == *server/src/ocr/* ]]; then
  CATEGORY="ocr"
elif [[ "$FILE_PATH" == *server/src/routes/auth* ]] || [[ "$FILE_PATH" == *middleware/auth* ]]; then
  CATEGORY="auth"
elif [[ "$FILE_PATH" == *scripts/* ]]; then
  CATEGORY="deployment"
elif [[ "$FILE_PATH" == *docs/* ]]; then
  CATEGORY="admin"
elif [[ "$FILE_PATH" == *database/* ]] || [[ "$FILE_PATH" == *migrations/* ]]; then
  CATEGORY="database"
fi

# ── Create work item ─────────────────────────────────────────────────
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
TITLE="Claude CLI ad-hoc — $TIMESTAMP"

RESULT=$(curl -sf -X POST "$API_BASE/om-daily/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"$TITLE\",
    \"task_type\": \"task\",
    \"status\": \"in_progress\",
    \"source\": \"agent\",
    \"agent_tool\": \"claude_cli\",
    \"priority\": \"medium\",
    \"horizon\": \"7\",
    \"category\": \"$CATEGORY\",
    \"repo_target\": \"$REPO_TARGET\",
    \"description\": \"Auto-created by Claude Code hook on first file modification\"
  }" 2>/dev/null || echo "{}")

ITEM_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('id',''))" 2>/dev/null || true)

if [[ -n "$ITEM_ID" ]]; then
  echo "$ITEM_ID" > "$SESSION_FILE"
fi

exit 0
