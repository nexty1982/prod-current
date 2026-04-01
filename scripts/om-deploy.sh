#!/bin/bash
set -Eeuo pipefail

# ============================================================================
# OrthodoxMetrics Production Deployment Script
# ============================================================================
# Usage:
#   om-deploy.sh        — Build backend + frontend (full deploy)
#   om-deploy.sh be     — Build backend only
#   om-deploy.sh fe     — Build frontend only
# ============================================================================

# ── Worktree Detection ──────────────────────────────────────────────────────
# If invoked from a linked worktree, git-common-dir ≠ git-dir.
# In the main worktree, they're identical.
PROD_ROOT="/var/www/orthodoxmetrics/prod"

_GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null || echo "")"
_GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || echo "")"

IS_WORKTREE=false
WORKTREE_ROOT=""
AGENT_NAME=""
AGENT_BRANCH=""

if [[ -n "$_GIT_COMMON_DIR" && -n "$_GIT_DIR" && "$_GIT_COMMON_DIR" != "$_GIT_DIR" ]]; then
  IS_WORKTREE=true
  WORKTREE_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
  AGENT_NAME="$(basename "$WORKTREE_ROOT")"
  AGENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")"
fi

# Build and deploy always happen from the production worktree
ROOT="$PROD_ROOT"
SERVER="$ROOT/server"
FRONT="$ROOT/front-end"

SERVICE_NAME="orthodox-backend"
HEALTH_URL="http://127.0.0.1:3001/api/system/health"

# ============================================================================
# Build Lock — prevent concurrent deployments
# ============================================================================
LOCK_FILE="/tmp/om-deploy.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  LOCK_OWNER=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
  echo -e "\033[0;31m✗ Another deployment is already running.\033[0m" >&2
  echo -e "  Lock holder: $LOCK_OWNER" >&2
  echo -e "  Lock file:   $LOCK_FILE" >&2
  echo -e "  If stale, remove it: rm $LOCK_FILE" >&2
  exit 1
fi
echo "user=$(whoami) pid=$$ started=$(date '+%Y-%m-%d %H:%M:%S')" >&9

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ============================================================================
# Build Telemetry
# ============================================================================
BUILD_EVENT_URL="http://127.0.0.1:3001/api/internal/build-events"
BUILD_TOKEN=$(grep '^OM_BUILD_EVENT_TOKEN=' "$SERVER/.env" 2>/dev/null | cut -d'=' -f2- | tr -d "\"'" || echo "")
RUN_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$(date +%s)-$$")
if $IS_WORKTREE; then
  GIT_BRANCH="$AGENT_BRANCH"
  GIT_COMMIT=$(cd "$WORKTREE_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
else
  GIT_BRANCH=$(cd "$ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  GIT_COMMIT=$(cd "$ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
fi
DEPLOY_HOST=$(hostname)
DEPLOY_PID=$$
HEARTBEAT_PID=""
CURRENT_STAGE=""
BUILD_SUCCESS=false

# Parse arguments — separate flags from positional args
_POSITIONAL=()
for _arg in "$@"; do
  case "$_arg" in
    --allow-main)       BE_ALLOW_MAIN=true ;;
    --skip-scope-check) BE_SKIP_SCOPE_CHECK=true ;;
    *)                  _POSITIONAL+=("$_arg") ;;
  esac
done
TARGET="${_POSITIONAL[0]:-all}"
CS_ARG="${_POSITIONAL[1]:-}"  # Change set code or ID for stage/promote/hotfix

# ── Change set helper: call backend API ────────────────────────────────────
cs_api_call() {
  local method="$1" path="$2" body="${3:-}"
  local url="http://127.0.0.1:3001${path}"
  # Use internal token auth — change-sets API checks session, so we use a
  # direct DB approach via node for script-initiated transitions
  if [[ -n "$body" ]]; then
    node -e "
      const svc = require('$SERVER/dist/services/changeSetService');
      (async () => {
        const result = await svc.${method}(${body});
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      })().catch(e => { console.error(e.message); process.exit(1); });
    " 2>&1
  fi
}

cs_get_by_ref() {
  # Resolve a change_set code (CS-0042) or numeric ID to full object
  local ref="$1"
  node -e "
    const svc = require('$SERVER/dist/services/changeSetService');
    (async () => {
      let cs;
      if (/^CS-/.test('$ref')) {
        cs = await svc.getByCode('$ref');
      } else if (/^\d+\$/.test('$ref')) {
        cs = await svc.getById(parseInt('$ref'));
      } else {
        console.error('Invalid change_set reference: $ref');
        process.exit(1);
      }
      if (!cs) { console.error('Change set not found: $ref'); process.exit(1); }
      console.log(JSON.stringify(cs));
      process.exit(0);
    })().catch(e => { console.error(e.message); process.exit(1); });
  " 2>&1
}

cs_transition() {
  local cs_id="$1" target_status="$2"
  shift 2
  # Remaining args are key=value pairs for extra fields
  local extra_args=""
  for arg in "$@"; do
    extra_args="$extra_args, $arg"
  done
  node -e "
    const svc = require('$SERVER/dist/services/changeSetService');
    (async () => {
      const result = await svc.transition(${cs_id}, '${target_status}', 1 ${extra_args});
      console.log(JSON.stringify({ success: true, code: result.code, status: result.status }));
      process.exit(0);
    })().catch(e => { console.error(e.message); process.exit(1); });
  " 2>&1
}

case "$TARGET" in
  be)       BUILD_BE=true;  BUILD_FE=false; DEPLOY_ORIGIN="server"   ;;
  fe)       BUILD_BE=false; BUILD_FE=true;  DEPLOY_ORIGIN="frontend" ;;
  all|"")   BUILD_BE=true;  BUILD_FE=true;  DEPLOY_ORIGIN="server"   ;;
  stage)
    # ── STAGE: Build to staging for review ─────────────────────────────
    BUILD_BE=true; BUILD_FE=true; DEPLOY_ORIGIN="server"
    DEPLOY_MODE="stage"
    if [[ -z "$CS_ARG" ]]; then
      echo -e "${RED}✗ Usage: om-deploy.sh stage <CS-CODE or ID>${NC}" >&2
      exit 1
    fi
    ;;
  promote)
    # ── PROMOTE: Deploy approved staging to production ─────────────────
    BUILD_BE=true; BUILD_FE=true; DEPLOY_ORIGIN="server"
    DEPLOY_MODE="promote"
    if [[ -z "$CS_ARG" ]]; then
      echo -e "${RED}✗ Usage: om-deploy.sh promote <CS-CODE or ID>${NC}" >&2
      exit 1
    fi
    ;;
  hotfix)
    # ── HOTFIX: Direct-to-production bypass ────────────────────────────
    BUILD_BE=true; BUILD_FE=true; DEPLOY_ORIGIN="server"
    DEPLOY_MODE="hotfix"
    if [[ -z "$CS_ARG" ]]; then
      echo -e "${RED}✗ Usage: om-deploy.sh hotfix <CS-CODE or ID>${NC}" >&2
      exit 1
    fi
    ;;
  -h|--help)
    echo -e "${BOLD}OrthodoxMetrics Deployment Script${NC}"
    echo ""
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  om-deploy.sh              Build backend + frontend (full deploy)"
    echo -e "  om-deploy.sh ${GREEN}be${NC}           Build and deploy backend only"
    echo -e "  om-deploy.sh ${GREEN}fe${NC}           Build and deploy frontend only"
    echo -e ""
    echo -e "${BOLD}Change Set Workflow:${NC}"
    echo -e "  om-deploy.sh ${CYAN}stage${NC}   CS-0042   Build to staging for review"
    echo -e "  om-deploy.sh ${GREEN}promote${NC} CS-0042   Promote approved staging to production"
    echo -e "  om-deploy.sh ${YELLOW}hotfix${NC}  CS-0042   Direct-to-production (emergency only)"
    exit 0
    ;;
  *)
    echo -e "${RED}✗ Unknown target: $TARGET${NC}" >&2
    echo -e "  Usage: om-deploy.sh [be|fe|stage|promote|hotfix]" >&2
    exit 1
    ;;
esac
DEPLOY_MODE="${DEPLOY_MODE:-legacy}"

emit_build_event() {
  local event="$1" stage="${2:-}" message="${3:-}" duration_ms="${4:-}"
  [[ -z "$BUILD_TOKEN" ]] && return 0
  local stage_json="null" msg_json="null" dur_json="null"
  [[ -n "$stage" ]] && stage_json="\"$stage\""
  [[ -n "$message" ]] && msg_json="\"$message\""
  [[ -n "$duration_ms" ]] && dur_json="$duration_ms"
  curl -s -o /dev/null -X POST "$BUILD_EVENT_URL" \
    -H "Content-Type: application/json" \
    -H "X-OM-BUILD-TOKEN: $BUILD_TOKEN" \
    --max-time 3 \
    -d "{\"runId\":\"$RUN_ID\",\"event\":\"$event\",\"env\":\"prod\",\"origin\":\"$DEPLOY_ORIGIN\",\"command\":\"om-deploy.sh $TARGET\",\"host\":\"$DEPLOY_HOST\",\"pid\":$DEPLOY_PID,\"stage\":$stage_json,\"message\":$msg_json,\"durationMs\":$dur_json,\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"repo\":\"orthodoxmetrics\",\"branch\":\"$GIT_BRANCH\",\"commit\":\"$GIT_COMMIT\"}" \
    2>/dev/null || true
}

start_heartbeat() {
  [[ -z "$BUILD_TOKEN" ]] && return 0
  ( set +e; while true; do sleep 25; emit_build_event "heartbeat"; done ) &
  HEARTBEAT_PID=$!
}

stop_heartbeat() {
  if [[ -n "${HEARTBEAT_PID:-}" ]] && kill -0 "$HEARTBEAT_PID" 2>/dev/null; then
    kill "$HEARTBEAT_PID" 2>/dev/null || true
    wait "$HEARTBEAT_PID" 2>/dev/null || true
  fi
  HEARTBEAT_PID=""
}

STAGE_START_S=0
stage_begin() {
  CURRENT_STAGE="$1"
  STAGE_START_S=$(date +%s)
  emit_build_event "stage_started" "$1"
}

stage_done() {
  local dur_ms=$(( ($(date +%s) - STAGE_START_S) * 1000 ))
  emit_build_event "stage_completed" "$CURRENT_STAGE" "" "$dur_ms"
}

# Logging helpers
log_header() {
  echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

log_section() {
  echo -e "\n${BOLD}${CYAN}▶ $1${NC}"
  echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
}

log_step() {
  echo -e "  ${MAGENTA}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1" >&2
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================================================
# Branch Enforcement — shared library for task-scoped branch discipline
# ============================================================================
if $IS_WORKTREE; then
  cd "$WORKTREE_ROOT"
else
  cd "$ROOT"
fi

# Source shared enforcement library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/branch-enforce.sh"


# Initialize enforcement against the invoker's directory (worktree or production)
if $IS_WORKTREE; then
  be_init "$WORKTREE_ROOT" "orthodoxmetrics"
else
  be_init "$ROOT" "orthodoxmetrics"
fi

# Skip dirty check here — we handle it with an interactive commit prompt below
BE_SKIP_DIRTY_CHECK=true

# Allow deploying from main — branch enforcement is for task branches only
if [[ "$(be_branch)" == "main" ]]; then
  BE_ALLOW_MAIN=true
fi

# Run enforcement checks (exits on hard failure)
be_check_not_main      || exit 1
be_validate_branch_pattern || exit 1
be_check_has_unique_commits || exit 1
be_check_branch_scope  # warnings only

# Working tree must be clean — prompt to commit if dirty
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Uncommitted Changes Detected${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  if $IS_WORKTREE; then
    echo -e "Agent:  ${BOLD}${AGENT_NAME}${NC}"
  fi
  echo -e "Branch: ${BOLD}${GIT_BRANCH}${NC}"
  echo ""

  # Show a compact summary of changes
  ADDED=$(git status --porcelain 2>/dev/null | grep -c '^??' || true)
  MODIFIED=$(git status --porcelain 2>/dev/null | grep -c '^ M\|^M ' || true)
  DELETED=$(git status --porcelain 2>/dev/null | grep -c '^ D\|^D ' || true)
  echo -e "  ${GREEN}+${ADDED} added${NC}  ${CYAN}~${MODIFIED} modified${NC}  ${RED}-${DELETED} deleted${NC}"
  echo ""
  git status --short | head -20
  TOTAL_CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
  if [[ $TOTAL_CHANGES -gt 20 ]]; then
    echo -e "  ${BLUE}... and $((TOTAL_CHANGES - 20)) more${NC}"
  fi
  echo ""

  read -p "$(echo -e "${CYAN}Commit all changes and deploy? [y/N]: ${NC}")" DO_COMMIT

  if [[ "$DO_COMMIT" =~ ^[Yy]$ ]]; then
    read -p "$(echo -e "${CYAN}Commit message: ${NC}")" COMMIT_MSG

    if [[ -z "$COMMIT_MSG" ]]; then
      echo -e "${RED}✗ Commit message is required.${NC}" >&2
      exit 1
    fi

    echo ""
    echo -e "${CYAN}→${NC} Staging all changes..."
    git add -A
    echo -e "${CYAN}→${NC} Committing..."
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓${NC} Changes committed: ${BOLD}$(git rev-parse --short HEAD)${NC}"
    echo ""

    # Update commit hash for telemetry
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  else
    echo ""
    echo -e "${RED}✗ Deploy cancelled.${NC}" >&2
    echo -e "  Commit manually and re-run, or choose 'y' to commit inline." >&2
    exit 1
  fi
fi

# Print change summary
be_print_change_summary

log_info "Git branch: ${BOLD}$GIT_BRANCH${NC} (${GIT_COMMIT})"

# ============================================================================
# Worktree Merge — ff-merge agent's branch into main on the production worktree
# ============================================================================
if $IS_WORKTREE; then
  log_section "Worktree Merge: ${AGENT_NAME} → main"
  log_step "Agent branch: ${BOLD}${AGENT_BRANCH}${NC}"

  cd "$PROD_ROOT"

  PROD_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  if [[ "$PROD_BRANCH" != "main" ]]; then
    log_error "Production worktree ($PROD_ROOT) is on '${PROD_BRANCH}', expected 'main'."
    echo -e "  ${CYAN}→${NC} Fix: cd $PROD_ROOT && git checkout main" >&2
    exit 1
  fi

  PROD_DIRTY=$(git status --porcelain 2>/dev/null || true)
  if [[ -n "$PROD_DIRTY" ]]; then
    log_error "Production worktree has uncommitted changes — cannot merge."
    echo -e "  ${CYAN}→${NC} Fix: cd $PROD_ROOT && git stash (or commit/discard)" >&2
    exit 1
  fi

  log_step "Merging ${AGENT_BRANCH} into main (ff-only)..."
  if git merge --ff-only "$AGENT_BRANCH" 2>&1; then
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    log_success "Merged to main: ${BOLD}${GIT_COMMIT}${NC}"
  else
    log_error "Fast-forward merge failed — ${AGENT_BRANCH} has diverged from main."
    echo -e "  ${CYAN}→${NC} Rebase first: cd $WORKTREE_ROOT && git rebase main" >&2
    exit 1
  fi

  GIT_BRANCH="main (merged from ${AGENT_BRANCH} via ${AGENT_NAME})"
fi

# ============================================================================
# Change Set Validation (stage/promote/hotfix modes)
# ============================================================================
CS_ID=""
CS_CODE=""
CS_STATUS=""
FULL_GIT_COMMIT=$(cd "$ROOT" && git rev-parse HEAD 2>/dev/null || echo "unknown")

if [[ "$DEPLOY_MODE" == "stage" || "$DEPLOY_MODE" == "promote" || "$DEPLOY_MODE" == "hotfix" ]]; then
  log_section "Change Set Validation"
  log_step "Resolving change set: $CS_ARG..."

  CS_JSON=$(cs_get_by_ref "$CS_ARG" 2>&1)
  if [[ $? -ne 0 ]]; then
    log_error "$CS_JSON"
    exit 1
  fi

  CS_ID=$(echo "$CS_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).id)}catch(e){process.exit(1)}})")
  CS_CODE=$(echo "$CS_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).code)}catch(e){process.exit(1)}})")
  CS_STATUS=$(echo "$CS_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).status)}catch(e){process.exit(1)}})")
  CS_BRANCH=$(echo "$CS_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).git_branch||'')}catch(e){process.exit(1)}})")
  CS_STRATEGY=$(echo "$CS_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).deployment_strategy||'stage_then_promote')}catch(e){process.exit(1)}})")
  CS_APPROVED_SHA=$(echo "$CS_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).approved_commit_sha||'')}catch(e){process.exit(1)}})")

  log_success "Found: $CS_CODE (status: $CS_STATUS)"

  # Validate mode-specific preconditions
  case "$DEPLOY_MODE" in
    stage)
      if [[ "$CS_STATUS" != "ready_for_staging" ]]; then
        log_error "Change set $CS_CODE is '$CS_STATUS' — must be 'ready_for_staging' to stage"
        exit 1
      fi
      if [[ -n "$CS_BRANCH" && "$CS_BRANCH" != "$GIT_BRANCH" ]]; then
        log_error "Branch mismatch: change set expects '$CS_BRANCH' but current branch is '$GIT_BRANCH'"
        exit 1
      fi
      ;;
    promote)
      if [[ "$CS_STATUS" != "approved" ]]; then
        log_error "Change set $CS_CODE is '$CS_STATUS' — must be 'approved' to promote"
        exit 1
      fi
      if [[ -n "$CS_APPROVED_SHA" && "$CS_APPROVED_SHA" != "$FULL_GIT_COMMIT" ]]; then
        log_error "Commit SHA drift: approved '$CS_APPROVED_SHA' but HEAD is '$FULL_GIT_COMMIT'"
        log_error "The branch has changed since approval. Re-stage and re-approve required."
        exit 1
      fi
      ;;
    hotfix)
      if [[ "$CS_STRATEGY" != "hotfix_direct" ]]; then
        log_warning "Change set $CS_CODE uses 'stage_then_promote' strategy"
        read -p "$(echo -e "${YELLOW}Override and deploy as hotfix? [y/N]: ${NC}")" HOTFIX_CONFIRM
        if [[ ! "$HOTFIX_CONFIRM" =~ ^[Yy]$ ]]; then
          log_error "Hotfix cancelled"
          exit 1
        fi
      fi
      ;;
  esac

  log_success "Change set validation passed"
fi

# ============================================================================
# Start
# ============================================================================
LABEL="all"
$BUILD_BE && ! $BUILD_FE && LABEL="backend"
! $BUILD_BE && $BUILD_FE && LABEL="frontend"

if [[ "$DEPLOY_MODE" == "stage" ]]; then
  DEPLOY_LABEL="STAGING ($CS_CODE)"
elif [[ "$DEPLOY_MODE" == "promote" ]]; then
  DEPLOY_LABEL="PROMOTE ($CS_CODE)"
elif [[ "$DEPLOY_MODE" == "hotfix" ]]; then
  DEPLOY_LABEL="HOTFIX ($CS_CODE)"
else
  DEPLOY_LABEL="Production"
fi

log_header "OrthodoxMetrics Deployment — $DEPLOY_LABEL"
log_info "Target: ${BOLD}$LABEL${NC}"
log_info "Mode: ${BOLD}$DEPLOY_MODE${NC}"
log_info "Started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
log_info "Root: $ROOT"

emit_build_event "build_started"
start_heartbeat
on_exit() {
  stop_heartbeat
  if [[ "$BUILD_SUCCESS" != "true" ]]; then
    sleep 1
    emit_build_event "build_failed" "${CURRENT_STAGE:-unknown}" "Build failed at stage: ${CURRENT_STAGE:-unknown}"
  fi
}
trap on_exit EXIT

# ============================================================================
# Backend Build & Deployment
# ============================================================================
if $BUILD_BE; then
  log_section "Backend Build Pipeline"
  cd "$SERVER"

  stage_begin "Backend Dependencies"
  log_step "Installing dependencies (legacy-peer-deps mode)..."
  if npm install --legacy-peer-deps 2>&1 | grep -q "added\|removed\|changed"; then
    log_success "Dependencies updated"
  else
    log_info "Dependencies up to date"
  fi
  stage_done

  stage_begin "Backend Clean"
  log_step "Cleaning previous build artifacts..."
  npm run build:clean 2>&1
  log_success "Build directory cleaned"
  stage_done

  stage_begin "Backend TypeScript"
  log_step "Compiling TypeScript + fixing router imports..."
  TSC_LOG=$(mktemp)
  if npm run build:ts >"$TSC_LOG" 2>&1; then
    TS_COUNT=$(find "$SERVER/dist" -name '*.js' -newer "$SERVER/dist/.tsbuildinfo" 2>/dev/null | wc -l || echo "?")
    log_success "TypeScript compilation complete ($TS_COUNT files emitted)"
  else
    log_error "TypeScript compilation failed"
    echo ""
    tail -n 40 "$TSC_LOG"
    rm -f "$TSC_LOG"
    exit 1
  fi
  rm -f "$TSC_LOG"
  stage_done

  stage_begin "Backend Copy"
  log_step "Copying non-TypeScript assets to dist/..."
  COPY_LOG=$(mktemp)
  if npm run build:copy >"$COPY_LOG" 2>&1; then
    COPY_COUNT=$(grep -c '\[build-copy\] Copied' "$COPY_LOG" || echo "0")
    log_success "Assets copied ($COPY_COUNT directories)"
  else
    log_error "Asset copy failed"
    cat "$COPY_LOG"
    rm -f "$COPY_LOG"
    exit 1
  fi
  rm -f "$COPY_LOG"
  stage_done

  stage_begin "Backend Post-Library"
  log_step "Processing post-build library tasks..."
  npm run build:post-library 2>&1
  log_success "Library processing complete"
  stage_done

  stage_begin "Backend Verify"
  log_step "Verifying build integrity..."
  VERIFY_LOG=$(mktemp)
  if npm run build:verify >"$VERIFY_LOG" 2>&1; then
    log_success "Build verification passed"
  else
    log_error "Build verification FAILED"
    cat "$VERIFY_LOG"
    rm -f "$VERIFY_LOG"
    exit 1
  fi
  rm -f "$VERIFY_LOG"
  stage_done

  stage_begin "Backend Verify Imports"
  log_step "Validating import statements..."
  if ! npm run build:verify:imports 2>&1; then
    log_error "Import validation failed — check for broken require/import statements"
    exit 1
  fi
  log_success "Import validation passed"
  stage_done

  stage_begin "Backend Flush Sessions"
  log_step "Flushing expired sessions..."
  npm run build:flush-sessions 2>&1
  log_success "Session cleanup complete"
  stage_done

  # ── Dist Completeness Check ──────────────────────────────────────────────
  stage_begin "Backend Dist Integrity"
  log_step "Checking dist/ completeness against src/..."

  DIST_ERRORS=0
  DIST_CHECKED=0
  DIST_OK=0

  # For every .ts file in src/, verify a .js file exists in dist/
  # (Excludes files listed in tsconfig.json "exclude" and .d.ts declarations)
  while IFS= read -r tsfile; do
    relpath="${tsfile#$SERVER/src/}"                    # e.g. workers/ocrFeederWorker.ts
    jsfile="$SERVER/dist/${relpath%.ts}.js"             # e.g. dist/workers/ocrFeederWorker.js
    ((DIST_CHECKED++)) || true
    if [[ ! -f "$jsfile" ]]; then
      log_warning "Missing in dist: ${relpath%.ts}.js  (from $relpath)"
      ((DIST_ERRORS++)) || true
    else
      ((DIST_OK++)) || true
    fi
  done < <(find "$SERVER/src" -name '*.ts' \
    -not -path '*/node_modules/*' \
    -not -name '*.d.ts' \
    -not -path '*/modules/records/importService.ts' \
    -not -path '*/routes/records/import.ts' \
    -not -path '*/ocr-endpoints-reference.ts' \
    2>/dev/null)

  # For every .js file in src/, verify it was copied to dist/
  while IFS= read -r jsfile; do
    relpath="${jsfile#$SERVER/src/}"                    # e.g. ocr/layouts/generic_table.js
    distfile="$SERVER/dist/$relpath"
    ((DIST_CHECKED++)) || true
    if [[ ! -f "$distfile" ]]; then
      log_warning "Missing in dist: $relpath  (JS copy)"
      ((DIST_ERRORS++)) || true
    else
      ((DIST_OK++)) || true
    fi
  done < <(find "$SERVER/src" -name '*.js' \
    -not -path '*/node_modules/*' \
    -not -path '*/tools/*' \
    -not -path '*/tests/*' \
    -not -path '*/scripts/*' \
    2>/dev/null)

  # Critical file spot-check (high-value files that MUST exist)
  CRITICAL_DIST_FILES=(
    "index.js"
    "config/db.js"
    "config/session.js"
    "routes/ocr/jobs.js"
    "routes/ocr/helpers.js"
    "workers/ocrFeederWorker.js"
    "ocr/layouts/generic_table.js"
    "ocr/layouts/marriage_ledger_v1.js"
    "middleware/databaseRouter.js"
    "utils/ocrClassifier.js"
  )
  for crit in "${CRITICAL_DIST_FILES[@]}"; do
    if [[ ! -f "$SERVER/dist/$crit" ]]; then
      log_error "CRITICAL file missing in dist: $crit"
      ((DIST_ERRORS++)) || true
    fi
  done

  if [[ $DIST_ERRORS -gt 0 ]]; then
    log_error "Dist integrity check: $DIST_ERRORS missing file(s) out of $DIST_CHECKED checked"
    log_error "Build may be incomplete — aborting deploy"
    exit 1
  else
    log_success "Dist integrity: $DIST_OK/$DIST_CHECKED files verified present"
  fi
  stage_done

  log_success "${BOLD}Backend build pipeline complete${NC}"
fi

# ============================================================================
# Frontend Build & Deployment
# ============================================================================
if $BUILD_FE; then
  log_section "Frontend Build Pipeline"
  cd "$FRONT"

  stage_begin "Frontend Dependencies"
  log_step "Installing dependencies (legacy-peer-deps mode)..."
  if ! npm install --legacy-peer-deps 2>&1; then
    log_warning "Initial npm install failed — performing clean reinstall..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps 2>&1
    log_success "Clean reinstall complete"
  else
    log_success "Dependencies installed"
  fi
  stage_done

  stage_begin "Frontend Icon Check"
  log_step "Validating icon imports (Records scope)..."
  if npm run check-icons 2>&1; then
    log_success "Icon import validation passed"
  else
    log_error "Icon import validation failed"
    log_error "Records pages must use canonical icon module: @/shared/ui/icons"
    exit 1
  fi
  stage_done

  stage_begin "Frontend Clean"
  log_step "Cleaning previous build artifacts..."
  npm run clean 2>&1
  log_success "Build directory cleaned"
  stage_done

  stage_begin "Frontend Build"
  log_step "Running Vite production build (8GB memory allocation)..."
  if node --max-old-space-size=8096 node_modules/vite/bin/vite.js build 2>&1 | tee /tmp/vite-build.log; then
    BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "unknown")
    log_success "Vite build complete (dist size: $BUILD_SIZE)"
  else
    log_error "Vite build failed"
    tail -n 50 /tmp/vite-build.log
    exit 1
  fi
  stage_done

  # For staging mode: copy dist → dist-staging so version switcher can serve it
  if [[ "$DEPLOY_MODE" == "stage" ]]; then
    stage_begin "Staging Copy"
    log_step "Copying build to dist-staging for version switcher..."
    rm -rf "$FRONT/dist-staging"
    cp -r "$FRONT/dist" "$FRONT/dist-staging"
    STAGING_SIZE=$(du -sh "$FRONT/dist-staging" 2>/dev/null | cut -f1 || echo "unknown")
    log_success "Staging copy complete (dist-staging size: $STAGING_SIZE)"
    stage_done
  fi

  log_success "${BOLD}Frontend build pipeline complete${NC}"
fi

# ============================================================================
# Service Management (only when backend was built)
# ============================================================================
if $BUILD_BE; then
  stage_begin "Service Restart"
  log_section "Backend Service Restart"
  log_step "Restarting systemd service: $SERVICE_NAME..."

  if sudo systemctl restart "$SERVICE_NAME" 2>&1; then
    log_success "Service restarted successfully"
  else
    log_error "Failed to restart service: $SERVICE_NAME"
    echo ""
    log_info "Service Status:"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
    echo ""
    log_info "Recent Logs:"
    sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager || true
    exit 1
  fi
  stage_done
else
  log_info "Frontend-only deployment — skipping backend service restart"
fi

# ============================================================================
# Health Check (only when backend was built)
# ============================================================================
if $BUILD_BE; then
  stage_begin "Health Check"
  log_section "Backend Health Check"
  log_step "Waiting for backend to become healthy..."

  for i in {1..60}; do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      log_success "Backend is healthy and responding (${i}s elapsed)"
      log_info "Health endpoint: $HEALTH_URL"
      break
    fi

    if [[ $i -eq 60 ]]; then
      log_error "Backend health check failed after 120 seconds"
      echo ""
      log_info "Service Status:"
      sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
      echo ""
      log_info "Recent Logs:"
      sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager || true
      exit 1
    fi

    if [[ $((i % 5)) -eq 0 ]]; then
      echo -n "."
    fi
    sleep 2
  done
  echo ""
  stage_done
fi

# ============================================================================
# Mark build as successful & increment build number
# ============================================================================
BUILD_SUCCESS=true
stop_heartbeat
emit_build_event "build_completed"

# Track build number (resets after push to origin)
BUILD_INFO_FILE="$ROOT/.build-info"
APP_VERSION=$(grep '"version"' "$ROOT/package.json" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
CURRENT_BUILD=0
if [[ -f "$BUILD_INFO_FILE" ]]; then
  CURRENT_BUILD=$(grep '^BUILD_NUMBER=' "$BUILD_INFO_FILE" | cut -d'=' -f2 || echo "0")
fi
NEW_BUILD=$((CURRENT_BUILD + 1))
cat > "$BUILD_INFO_FILE" << EOF
APP_VERSION=$APP_VERSION
BUILD_NUMBER=$NEW_BUILD
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_BRANCH=$GIT_BRANCH
GIT_COMMIT=$GIT_COMMIT
EOF
log_info "Build number: $APP_VERSION.$NEW_BUILD"

# ============================================================================
# Deploy Metadata — task-scoped change tracking
# ============================================================================
# Re-init against production root (we deployed from main after merge)
cd "$PROD_ROOT"
be_init "$PROD_ROOT" "orthodoxmetrics"
if $IS_WORKTREE; then
  be_save_deploy_metadata "$TARGET" "worktree:${AGENT_NAME}"
else
  be_save_deploy_metadata "$TARGET" "$DEPLOY_MODE"
fi

# ============================================================================
# Change Set Post-Deploy Finalization
# ============================================================================
if [[ -n "$CS_ID" ]]; then
  log_section "Change Set Finalization"

  case "$DEPLOY_MODE" in
    stage)
      log_step "Transitioning $CS_CODE to 'staged'..."
      CS_RESULT=$(cs_transition "$CS_ID" "staged" \
        "{ staging_build_run_id: '$RUN_ID', staging_commit_sha: '$FULL_GIT_COMMIT' }" 2>&1)
      if [[ $? -eq 0 ]]; then
        log_success "Change set $CS_CODE is now STAGED"
        log_info "Staging commit: $FULL_GIT_COMMIT"
        log_info "Review via version switcher: switch to 'staging' version"
        log_info "Next step: review in UI then run 'om-deploy.sh promote $CS_CODE'"
      else
        log_error "Failed to transition change set: $CS_RESULT"
      fi
      ;;
    promote)
      log_step "Transitioning $CS_CODE to 'promoted'..."
      CS_RESULT=$(cs_transition "$CS_ID" "promoted" \
        "{ prod_build_run_id: '$RUN_ID', prod_commit_sha: '$FULL_GIT_COMMIT' }" 2>&1)
      if [[ $? -eq 0 ]]; then
        log_success "Change set $CS_CODE is now PROMOTED to production"
        log_info "Production commit: $FULL_GIT_COMMIT"
      else
        log_error "Failed to transition change set: $CS_RESULT"
      fi
      ;;
    hotfix)
      log_step "Recording hotfix deployment for $CS_CODE..."
      # For hotfix: transition through the full chain rapidly
      # First ensure it's in the right state — try to fast-track it
      CS_RESULT=$(node -e "
        const svc = require('$SERVER/dist/services/changeSetService');
        (async () => {
          const cs = await svc.getById($CS_ID);

          // Guard: refuse to hotfix an empty change_set
          const items = await svc.getItems($CS_ID);
          if (!items.length) {
            console.error('Cannot hotfix an empty change_set — add at least one OM Daily item');
            process.exit(1);
          }

          // Fast-track: draft→active→ready_for_staging→staged→in_review→approved→promoted
          const chain = [];
          if (cs.status === 'draft') chain.push('active');
          if (cs.status === 'active' || chain.includes('active')) chain.push('ready_for_staging');

          for (const s of chain) {
            try { await svc.transition($CS_ID, s, 1); } catch(e) { /* skip if already past */ }
          }

          // Now do staged with build data
          try {
            await svc.transition($CS_ID, 'staged', 1, {
              staging_build_run_id: '$RUN_ID',
              staging_commit_sha: '$FULL_GIT_COMMIT'
            });
          } catch(e) { /* may already be past staged */ }

          try { await svc.transition($CS_ID, 'in_review', 1); } catch(e) {}
          try { await svc.transition($CS_ID, 'approved', 1, { review_notes: 'Hotfix auto-approved' }); } catch(e) {}
          try {
            await svc.transition($CS_ID, 'promoted', 1, {
              prod_build_run_id: '$RUN_ID',
              prod_commit_sha: '$FULL_GIT_COMMIT'
            });
          } catch(e) {}

          const final = await svc.getById($CS_ID);
          console.log(JSON.stringify({ status: final.status }));
          process.exit(0);
        })().catch(e => { console.error(e.message); process.exit(1); });
      " 2>&1)
      if [[ $? -eq 0 ]]; then
        log_success "Hotfix $CS_CODE fast-tracked to production"
        log_warning "Hotfix bypass recorded in event log"
      else
        log_error "Hotfix finalization error: $CS_RESULT"
      fi
      ;;
  esac
fi

# ============================================================================
# Deployment Complete
# ============================================================================
log_header "Deployment Complete"
log_success "Target: ${BOLD}$LABEL${NC}"
if $IS_WORKTREE; then
  log_success "Agent:  ${BOLD}$AGENT_NAME${NC} (branch: $AGENT_BRANCH → main)"
fi
log_success "Completed: $(date '+%Y-%m-%d %H:%M:%S %Z')"

if $BUILD_FE; then
  log_info "Frontend assets: $FRONT/dist"
fi

if $BUILD_BE; then
  log_info "Backend service: $SERVICE_NAME (active)"
  log_info "Health endpoint: $HEALTH_URL"
fi

echo ""
log_success "${BOLD}${GREEN}All deployment tasks completed successfully!${NC}"
echo ""
