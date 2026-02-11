#!/usr/bin/env bash
#
# om-backup-v2.sh — OrthodoxMetrics backup with database integration
#
# Usage:
#   om-backup-v2.sh incremental [user_id] [--verbose] [--timeout=SECONDS]  — Fast incremental backup
#   om-backup-v2.sh full [user_id] [--verbose] [--timeout=SECONDS]          — Full backup with verification
#   om-backup-v2.sh status                  — Show repo stats
#   om-backup-v2.sh list                    — List all archives
#   om-backup-v2.sh restore <archive> <target-dir>  — Extract an archive
#
# Options:
#   --verbose         Enable verbose logging (shows borg output)
#   --timeout=SECONDS Maximum backup duration in seconds (default: 3600 for incremental, 7200 for full)
#
set -euo pipefail
umask 077

# ── Parse Options ───────────────────────────────────────────────────
VERBOSE=0
TIMEOUT=""
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=1
      shift
      ;;
    --timeout=*)
      TIMEOUT="${1#*=}"
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# Restore positional parameters
set -- "${POSITIONAL_ARGS[@]}"

# ── Load DB Integration Library ────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/backup-db-integration.sh"

# ── Locking & Error Handling ───────────────────────────────────────
LOCK_FILE="/var/backups/OM/om-backup.lock"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "ERROR: backup already running (lock: $LOCK_FILE)" >&2; exit 1; }

# Global job tracking
JOB_ID=""
JOB_START_MS=""
JOB_START_TIME=""
MAX_DURATION=""

on_err() {
  local ec=$?
  local error_msg="[$(date '+%Y-%m-%d %H:%M:%S')] FATAL: backup failed (exit=$ec) at line ${BASH_LINENO[0]}: ${BASH_COMMAND}"
  echo "$error_msg" | tee -a "$LOG_FILE" >&2
  
  # Update job status in database if job was created
  if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "0" ]; then
    local now_ms=$(date +%s%3N)
    local duration=$((now_ms - JOB_START_MS))
    fail_backup_job "$JOB_ID" "$error_msg" "$duration"
  fi
  
  exit "$ec"
}
trap on_err ERR

# ── Config ──────────────────────────────────────────────────────────
BORG_REPO="/var/backups/OM/repo"
PROD_DIR="/var/www/orthodoxmetrics/prod"
SERVER_DIR="$PROD_DIR/server"
FRONTEND_DIR="$PROD_DIR/front-end"
LOG_DIR="/var/backups/OM/logs"
DB_DUMP_DIR="/var/backups/OM/db-dumps"

# Load DB credentials
get_db_credentials "$SERVER_DIR/.env"

# Databases to back up
DATABASES=(
  orthodoxmetrics_db
  orthodoxmetrics_ocr_db
  omai_db
  omui
  om_logging_db
  om_church_46
  om_church_51
  record_template1
)

# No passphrase (local-only repo)
export BORG_PASSPHRASE=""
export BORG_REPO

# ── Borg Repo Init Guard ───────────────────────────────────────────
if [ ! -d "$BORG_REPO" ]; then
  mkdir -p "$BORG_REPO"
fi

if ! borg info >/dev/null 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: borg repo not initialized; initializing..."
  borg init --encryption=none 2>&1
fi

# Load retention settings from database (with fallbacks)
KEEP_HOURLY=$(get_backup_setting "keep_hourly" "48")
KEEP_DAILY=$(get_backup_setting "keep_daily" "30")
KEEP_WEEKLY=$(get_backup_setting "keep_weekly" "12")
KEEP_MONTHLY=$(get_backup_setting "keep_monthly" "12")

# ── Helpers ─────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR" "$DB_DUMP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H%M)
LOG_FILE="$LOG_DIR/backup-${TIMESTAMP}.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_verbose() {
  if [ "$VERBOSE" -eq 1 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [VERBOSE] $*" | tee -a "$LOG_FILE"
  fi
}

# Check if backup has exceeded timeout
check_timeout() {
  if [ -z "$MAX_DURATION" ]; then
    return 0
  fi
  
  local current_time=$(date +%s)
  local elapsed=$((current_time - JOB_START_TIME))
  
  if [ "$elapsed" -gt "$MAX_DURATION" ]; then
    local error_msg="Backup exceeded timeout of ${MAX_DURATION}s (elapsed: ${elapsed}s)"
    log "ERROR: $error_msg"
    
    # Update job status in database
    if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "0" ]; then
      local now_ms=$(date +%s%3N)
      local duration=$((now_ms - JOB_START_MS))
      fail_backup_job "$JOB_ID" "$error_msg" "$duration"
    fi
    
    die "$error_msg"
  fi
}

die() {
  log "FATAL: $*"
  exit 1
}

# ── Dynamic Filter Loading ──────────────────────────────────────────
load_file_filters() {
  local filter_file="/tmp/borg-excludes-dynamic-$$.txt"
  
  # Start with base excludes
  cat > "$filter_file" <<'EOF'
*/node_modules
*/dist-backup
*/front-end/dist
*/.git/objects/pack
*.log
*/backups/prod-current-main
*/__pycache__
*.pyc
*/front-end/.vite
EOF

  # Add database filters if any
  local db_filters=$(get_backup_filters "files")
  if [ -n "$db_filters" ]; then
    echo "$db_filters" >> "$filter_file"
  fi
  
  # Return just the filename (no log output mixed in)
  echo "$filter_file"
}

# ── DB Dump ─────────────────────────────────────────────────────────
dump_databases() {
  log "Dumping databases..."
  check_timeout
  local failed=0
  local dump_artifacts=()

  for db in "${DATABASES[@]}"; do
    check_timeout
    local dump_file="$DB_DUMP_DIR/${db}.sql.gz"
    log "  Dumping $db..."
    log_verbose "  Output: $dump_file"
    
    (mysqldump \
      --host="$DB_HOST" \
      --port="$DB_PORT" \
      --user="$DB_USER" \
      --password="$DB_PASS" \
      --single-transaction \
      --routines \
      --triggers \
      --events \
      --quick \
      --hex-blob \
      --default-character-set=utf8mb4 \
      --set-gtid-purged=OFF \
      --column-statistics=0 \
      --force \
      "$db" 2>>"$LOG_FILE" | gzip -c > "$dump_file") || true

    if gzip -t "$dump_file" >/dev/null 2>&1; then
      local size=$(get_file_size "$dump_file")
      local sha256=$(calculate_sha256 "$dump_file")
      local size_human=$(du -sh "$dump_file" | cut -f1)
      log "  OK: $db ($size_human, sha256: ${sha256:0:16}...)"
      
      # Track for artifact creation
      dump_artifacts+=("$dump_file|$size|$sha256")
    else
      log "  FAIL: $db (gzip corrupt)"
      rm -f "$dump_file"
      ((failed++)) || true
    fi
  done

  # Dump grants/users
  log "  Dumping user grants..."
  mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASS" \
    --set-gtid-purged=OFF \
    --column-statistics=0 \
    --system=users \
    2>>"$LOG_FILE" | gzip -c > "$DB_DUMP_DIR/_grants.sql.gz" || true

  if gzip -t "$DB_DUMP_DIR/_grants.sql.gz" >/dev/null 2>&1; then
    local size=$(get_file_size "$DB_DUMP_DIR/_grants.sql.gz")
    local sha256=$(calculate_sha256 "$DB_DUMP_DIR/_grants.sql.gz")
    dump_artifacts+=("$DB_DUMP_DIR/_grants.sql.gz|$size|$sha256")
  else
    rm -f "$DB_DUMP_DIR/_grants.sql.gz"
  fi

  log "Database dumps complete ($failed failures)"
  
  # Return artifact list for later recording
  printf '%s\n' "${dump_artifacts[@]}"
}

# ── Incremental Backup ──────────────────────────────────────────────
do_incremental() {
  local requested_by="${1:-1}"
  
  log "=== INCREMENTAL BACKUP START ==="
  
  # Set timeout (default 1 hour for incremental)
  if [ -z "$TIMEOUT" ]; then
    MAX_DURATION=3600
  else
    MAX_DURATION="$TIMEOUT"
  fi
  JOB_START_TIME=$(date +%s)
  log "Timeout set to ${MAX_DURATION}s ($(format_duration $((MAX_DURATION * 1000)))))"
  
  local archive_name="incr-${TIMESTAMP}"
  
  # Create job in database
  JOB_ID=$(create_backup_job "both" "$requested_by")
  JOB_START_MS=$(date +%s%3N)
  log "Created backup job ID: $JOB_ID"
  
  # Mark job as running
  start_backup_job "$JOB_ID"

  # 1. Dump databases first
  local db_artifacts=$(dump_databases)

  # 2. Create backup manifest
  local MANIFEST="$DB_DUMP_DIR/_backup_manifest.json"
  printf '{"timestamp":"%s","host":"%s","mode":"%s","job_id":%s,"databases":%s}\n' \
    "$(date -Is)" "$(hostname -f 2>/dev/null || hostname)" "incremental" "$JOB_ID" \
    "$(printf '%s\n' "${DATABASES[@]}" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')" \
    > "$MANIFEST"

  # 3. Load dynamic filters
  check_timeout
  local filter_file=$(load_file_filters)
  log_verbose "Using filter file: $filter_file"

  # 4. Borg create — deduplicating incremental
  check_timeout
  log "Creating borg archive: $archive_name"
  
  local borg_opts="--stats --show-rc --compression zstd,3"
  if [ "$VERBOSE" -eq 1 ]; then
    borg_opts="$borg_opts --progress --list"
    log_verbose "Borg options: $borg_opts"
  fi
  
  borg create \
    $borg_opts \
    --exclude-from "$filter_file" \
    "::${archive_name}" \
    "$SERVER_DIR/src" \
    "$SERVER_DIR/src/config" \
    "$SERVER_DIR/src/scripts" \
    "$SERVER_DIR/uploads" \
    "$SERVER_DIR/src/certificates" \
    "$SERVER_DIR/package.json" \
    "$SERVER_DIR/tsconfig.json" \
    "$FRONTEND_DIR/src" \
    "$FRONTEND_DIR/public" \
    "$FRONTEND_DIR/package.json" \
    "$FRONTEND_DIR/vite.config.ts" \
    "$FRONTEND_DIR/tsconfig.json" \
    "$PROD_DIR/package.json" \
    "$PROD_DIR/uploads" \
    "$PROD_DIR/misc" \
    "$PROD_DIR/ops-hub" \
    "$PROD_DIR/misc" \
    "$PROD_DIR/logs" \
    "$PROD_DIR/docs" \
    "$PROD_DIR/services" \
    "$PROD_DIR/config" \
    "$PROD_DIR/docs" \
    "$PROD_DIR/scripts" \
    "$PROD_DIR/tools" \
    "$DB_DUMP_DIR" \
    2>&1 | tee -a "$LOG_FILE"

  rm -f "$filter_file"

  # 5. Record artifacts in database
  check_timeout
  log "Recording backup artifacts..."
  
  # Record borg archive
  local borg_archive_path="$BORG_REPO/data"
  local borg_size=$(du -sb "$borg_archive_path" 2>/dev/null | cut -f1 || echo "0")
  create_backup_artifact "$JOB_ID" "files" "$BORG_REPO::$archive_name" "$borg_size" "" "$MANIFEST" ""
  
  # Record DB dumps
  while IFS='|' read -r path size sha256; do
    [ -z "$path" ] && continue
    create_backup_artifact "$JOB_ID" "db" "$path" "$size" "$sha256" "" ""
  done <<< "$db_artifacts"

  # 6. Weekly maintenance
  check_timeout
  if [ "$(date +%u)" = "7" ]; then
    log "Weekly maintenance: pruning and compacting..."
    log_verbose "Retention: hourly=$KEEP_HOURLY, daily=$KEEP_DAILY, weekly=$KEEP_WEEKLY, monthly=$KEEP_MONTHLY"
    borg prune \
      --stats \
      --show-rc \
      --keep-hourly="$KEEP_HOURLY" \
      --keep-daily="$KEEP_DAILY" \
      --keep-weekly="$KEEP_WEEKLY" \
      --keep-monthly="$KEEP_MONTHLY" \
      2>&1 | tee -a "$LOG_FILE"
    borg compact 2>&1 | tee -a "$LOG_FILE" || true
  fi

  # 7. Mark job as complete
  local now_ms=$(date +%s%3N)
  local duration=$((now_ms - JOB_START_MS))
  complete_backup_job "$JOB_ID" "$duration"
  
  log "=== INCREMENTAL BACKUP COMPLETE ($(format_duration $duration)) ==="
}

# ── Full Backup ─────────────────────────────────────────────────────
do_full() {
  local requested_by="${1:-1}"
  
  log "=== FULL BACKUP START ==="
  
  # Set timeout (default 2 hours for full backup)
  if [ -z "$TIMEOUT" ]; then
    MAX_DURATION=7200
  else
    MAX_DURATION="$TIMEOUT"
  fi
  JOB_START_TIME=$(date +%s)
  log "Timeout set to ${MAX_DURATION}s ($(format_duration $((MAX_DURATION * 1000)))))"
  
  local archive_name="full-${TIMESTAMP}"

  # Create job in database
  JOB_ID=$(create_backup_job "both" "$requested_by")
  JOB_START_MS=$(date +%s%3N)
  log "Created backup job ID: $JOB_ID"
  
  start_backup_job "$JOB_ID"

  # 1. Dump databases
  local db_artifacts=$(dump_databases)

  # 2. Create backup manifest
  local MANIFEST="$DB_DUMP_DIR/_backup_manifest.json"
  printf '{"timestamp":"%s","host":"%s","mode":"%s","job_id":%s,"databases":%s}\n' \
    "$(date -Is)" "$(hostname -f 2>/dev/null || hostname)" "full" "$JOB_ID" \
    "$(printf '%s\n' "${DATABASES[@]}" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')" \
    > "$MANIFEST"

  # 3. Load dynamic filters
  check_timeout
  local filter_file=$(load_file_filters)
  log_verbose "Using filter file: $filter_file"

  # 4. Full borg archive
  check_timeout
  log "Creating full borg archive: $archive_name"
  
  local borg_opts="--stats --show-rc --compression zstd,6"
  if [ "$VERBOSE" -eq 1 ]; then
    borg_opts="$borg_opts --progress --list"
    log_verbose "Borg options: $borg_opts"
  fi
  
  borg create \
    $borg_opts \
    --exclude-from "$filter_file" \
    "::${archive_name}" \
    "$PROD_DIR" \
    "$DB_DUMP_DIR" \
    2>&1 | tee -a "$LOG_FILE"

  rm -f "$filter_file"

  # 5. Verify the archive
  check_timeout
  log "Verifying archive integrity..."
  borg check --archives-only --last 1 2>&1 | tee -a "$LOG_FILE"

  # 6. Record artifacts
  check_timeout
  log "Recording backup artifacts..."
  
  local borg_archive_path="$BORG_REPO/data"
  local borg_size=$(du -sb "$borg_archive_path" 2>/dev/null | cut -f1 || echo "0")
  create_backup_artifact "$JOB_ID" "files" "$BORG_REPO::$archive_name" "$borg_size" "" "$MANIFEST" ""
  
  while IFS='|' read -r path size sha256; do
    [ -z "$path" ] && continue
    create_backup_artifact "$JOB_ID" "db" "$path" "$size" "$sha256" "" ""
  done <<< "$db_artifacts"

  # 7. Prune old archives
  check_timeout
  log "Pruning old archives..."
  log_verbose "Retention: hourly=$KEEP_HOURLY, daily=$KEEP_DAILY, weekly=$KEEP_WEEKLY, monthly=$KEEP_MONTHLY"
  borg prune \
    --stats \
    --show-rc \
    --keep-hourly="$KEEP_HOURLY" \
    --keep-daily="$KEEP_DAILY" \
    --keep-weekly="$KEEP_WEEKLY" \
    --keep-monthly="$KEEP_MONTHLY" \
    2>&1 | tee -a "$LOG_FILE"

  # 8. Compact freed space
  borg compact 2>&1 | tee -a "$LOG_FILE" || true

  # 9. Mark job as complete
  local now_ms=$(date +%s%3N)
  local duration=$((now_ms - JOB_START_MS))
  complete_backup_job "$JOB_ID" "$duration"

  log "=== FULL BACKUP COMPLETE ($(format_duration $duration)) ==="
}

# ── Status ──────────────────────────────────────────────────────────
do_status() {
  echo ""
  echo "OrthodoxMetrics Backup Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "Repository: $BORG_REPO"
  echo ""

  echo "Repo size:"
  borg info 2>/dev/null | grep -E "All archives|Unique chunks|Total"
  echo ""

  echo "Recent archives (last 10):"
  borg list --last 10 --format '{archive:<40} {time} {size:>12}' 2>/dev/null
  echo ""

  echo "Recent backup jobs from database:"
  get_db_credentials "$SERVER_DIR/.env"
  mysql_query "
    SELECT 
      id,
      kind,
      status,
      DATE_FORMAT(started_at, '%Y-%m-%d %H:%i') as started,
      CONCAT(ROUND(duration_ms/1000, 1), 's') as duration
    FROM backup_jobs 
    ORDER BY created_at DESC 
    LIMIT 10;
  " | column -t -s $'\t'
  echo ""

  echo "Disk usage:"
  du -sh "$BORG_REPO" 2>/dev/null
  df -h /var/backups | tail -1
  echo ""
}

# ── List ────────────────────────────────────────────────────────────
do_list() {
  borg list --format '{archive:<40} {time} {size:>12}' 2>/dev/null
}

# ── Restore ─────────────────────────────────────────────────────────
do_restore() {
  local archive="${1:-}"
  local target="${2:-}"

  if [ -z "$archive" ] || [ -z "$target" ]; then
    echo "Usage: om-backup-v2.sh restore <archive-name> <target-dir>"
    echo ""
    echo "Available archives:"
    borg list --format '{archive:<40} {time}' 2>/dev/null
    exit 1
  fi

  mkdir -p "$target"
  log "Restoring archive '$archive' to '$target'..."
  cd "$target" && borg extract "::${archive}"
  log "Restore complete: $target"
}

# ── Cleanup ─────────────────────────────────────────────────────────
cleanup_logs() {
  find "$LOG_DIR" -name "backup-*.log" -mtime +30 -delete 2>/dev/null || true
  find "$DB_DUMP_DIR" -name "*.sql.gz" -mtime +2 -delete 2>/dev/null || true
}

# ── Main ────────────────────────────────────────────────────────────
ACTION="${1:-}"
USER_ID="${2:-1}"

case "$ACTION" in
  incremental|incr)
    do_incremental "$USER_ID"
    cleanup_logs
    ;;
  full)
    do_full "$USER_ID"
    cleanup_logs
    ;;
  status|info)
    do_status
    ;;
  list)
    do_list
    ;;
  restore)
    do_restore "${2:-}" "${3:-}"
    ;;
  *)
    echo "Usage: om-backup-v2.sh {incremental|full|status|list|restore} [user_id]"
    echo ""
    echo "  incremental [user_id]  Fast deduplicating backup (default user_id=1)"
    echo "  full [user_id]         Full backup with verification"
    echo "  status                 Show repo stats and recent jobs"
    echo "  list                   List all archives"
    echo "  restore <archive> <target>  Extract an archive"
    exit 1
    ;;
esac
