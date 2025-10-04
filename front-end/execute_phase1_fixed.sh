#!/usr/bin/env bash
set -Eeuo pipefail

# ===== Config =====
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-300}"   # 5 min per step
LOG_DIR="${LOG_DIR:-refactor_logs}"
PLAN_JSON="refactor_map.phase1.json"
APPLIED_JSON="refactor_map.phase1.applied.json"

# Debug tracing with timestamps: DEBUG=1 ./execute_phase1_fixed.sh
if [[ "${DEBUG:-0}" == "1" ]]; then
  export PS4='+ $(date "+%H:%M:%S") '
  set -x
fi

# ===== Locate FE root =====
ROOT="$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "/var/www/orthodoxmetrics")"
CANDIDATES=("$ROOT/prod/front-end" "$ROOT/front-end" "$PWD")
FE=""
for d in "${CANDIDATES[@]}"; do
  if [[ -f "$d/src/tools/omtrace/omtrace.ts" ]] || jq -e '.scripts.omtrace?' "$d/package.json" >/dev/null 2>&1; then
    FE="$d"; break
  fi
done
if [[ -z "$FE" ]]; then
  echo "ERROR: Could not locate front-end. Tried:" >&2
  printf '  - %s\n' "${CANDIDATES[@]}" >&2
  exit 1
fi
cd "$FE"
mkdir -p "$LOG_DIR"
echo "Front-end detected at: $FE"

# ===== Helpers =====
OMTRACE() { pnpm -C "$FE" run omtrace -- "$@"; }
run_with_timeout() {
  local label="$1"; shift
  echo "→ ${label}"
  if command -v timeout >/dev/null 2>&1; then
    timeout "${TIMEOUT_SECONDS}s" "$@" 2>&1 | tee -a "$LOG_DIR/${label// /_}.log"
  else
    "$@" 2>&1 | tee -a "$LOG_DIR/${label// /_}.log"
  fi
}

# ===== Conditional index (don’t rebuild if fresh in last 12h) =====
INDEX_PATH="$FE/.cache/omtrace/file-deps.json"
NEED_INDEX=1
if [[ -f "$INDEX_PATH" ]]; then
  # mtime < 12h -> reuse
  if [[ $(($(date +%s) - $(stat -c %Y "$INDEX_PATH" 2>/dev/null || stat -f %m "$INDEX_PATH"))) -lt 43200 ]]; then
    NEED_INDEX=0
  fi
fi

if [[ $NEED_INDEX -eq 1 ]]; then
  echo "Building omtrace index..."
  run_with_timeout "build_index" OMTRACE --build-index || {
    echo "ERROR: omtrace --build-index failed or timed out" >&2
    exit 1
  }
else
  echo "Using existing omtrace index: $INDEX_PATH"
fi

# ===== Phase-1 files (FE-relative) =====
FILES=(
  "src/views/admin/UserManagement.tsx"
  "src/views/admin/SessionManagement.tsx"
  "src/views/admin/RoleManagement.tsx"
  "src/views/admin/MenuManagement.tsx"
  "src/views/admin/MenuPermissions.tsx"
)

# ===== Ensure default export (fast pre-check) =====
missing=0
for f in "${FILES[@]}"; do
  if ! rg -n "export default" "$f" >/dev/null 2>&1; then
    echo "WARN: No default export in $f (lazy imports prefer default)."
    missing=$((missing+1))
  fi
done
if [[ $missing -gt 0 ]]; then
  echo "Proceeding, but consider adding default exports to the above files."
fi

# ===== Dry-run vs apply =====
if [[ "${1:-}" != "--execute" ]]; then
  echo "=== PHASE 1 DRY-RUN (planning) ==="
  : > "$PLAN_JSON"
  for f in "${FILES[@]}"; do
    run_with_timeout "plan_${f##*/}" OMTRACE "$f" --refactor --dry-run --pick-first --json | tee -a "$PLAN_JSON" >/dev/null
    echo
  done
  echo "Dry-run plan saved to: $PLAN_JSON"
  echo "Re-run with --execute to apply changes."
  exit 0
fi

echo "=== EXECUTING PHASE 1 (apply) ==="
: > "$APPLIED_JSON"
for f in "${FILES[@]}"; do
  run_with_timeout "apply_${f##*/}" OMTRACE "$f" --refactor --yes --pick-first --json | tee -a "$APPLIED_JSON" >/dev/null
  echo
done
echo "Applied results saved to: $APPLIED_JSON"
echo "Next: update registry, build, and smoke routes."

