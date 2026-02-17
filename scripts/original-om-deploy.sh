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

ROOT="/var/www/orthodoxmetrics/prod"
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
GIT_BRANCH=$(cd "$ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT=$(cd "$ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DEPLOY_HOST=$(hostname)
DEPLOY_PID=$$
HEARTBEAT_PID=""
CURRENT_STAGE=""
BUILD_SUCCESS=false

# Parse target
TARGET="${1:-all}"
case "$TARGET" in
  be)       BUILD_BE=true;  BUILD_FE=false; DEPLOY_ORIGIN="server"   ;;
  fe)       BUILD_BE=false; BUILD_FE=true;  DEPLOY_ORIGIN="frontend" ;;
  all|"")   BUILD_BE=true;  BUILD_FE=true;  DEPLOY_ORIGIN="server"   ;;
  -h|--help)
    echo -e "${BOLD}OrthodoxMetrics Deployment Script${NC}"
    echo ""
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  om-deploy.sh        Build backend + frontend (full deploy)"
    echo -e "  om-deploy.sh ${GREEN}be${NC}     Build and deploy backend only"
    echo -e "  om-deploy.sh ${GREEN}fe${NC}     Build and deploy frontend only"
    exit 0
    ;;
  *)
    echo -e "${RED}✗ Unknown target: $TARGET${NC}" >&2
    echo -e "  Usage: om-deploy.sh [be|fe]" >&2
    exit 1
    ;;
esac

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
# Start
# ============================================================================
LABEL="all"
$BUILD_BE && ! $BUILD_FE && LABEL="backend"
! $BUILD_BE && $BUILD_FE && LABEL="frontend"

log_header "OrthodoxMetrics Production Deployment"
log_info "Target: ${BOLD}$LABEL${NC}"
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
# Mark build as successful
# ============================================================================
BUILD_SUCCESS=true
stop_heartbeat
emit_build_event "build_completed"

# ============================================================================
# Deployment Complete
# ============================================================================
log_header "Deployment Complete"
log_success "Target: ${BOLD}$LABEL${NC}"
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
