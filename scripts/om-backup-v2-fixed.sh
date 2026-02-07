#!/bin/bash
# om-backup-v2.sh
# Orthodox Metrics Backup Script using Borg
# Fixed version - resolves unbound variable and repo initialization issues

set -euo pipefail  # Exit on error, undefined variables, pipe failures

#############################################
# CONFIGURATION
#############################################

# Backup repository location
REPO="/var/backups/OM/repo"

# Backup source directories
BACKUP_SOURCES=(
    "/var/www/orthodoxmetrics/prod"
)

# Log directory and file
LOG_DIR="/var/backups/OM/logs"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d-%H%M%S).log"

# Retention policy
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=6

# Borg passphrase (set via environment or prompt)
export BORG_PASSPHRASE="${BORG_PASSPHRASE:-}"

# Compression settings
COMPRESSION="lz4"  # Fast compression (zstd, lz4, or none)

#############################################
# HELPER FUNCTIONS
#############################################

# Create log directory if it doesn't exist
mkdir -p "${LOG_DIR}"

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${level}: $*" | tee -a "${LOG_FILE}"
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    exit 1
}

#############################################
# PRE-FLIGHT CHECKS
#############################################

log "INFO" "Starting Orthodox Metrics backup"
log "INFO" "Repository: ${REPO}"
log "INFO" "Log file: ${LOG_FILE}"

# Check if borg is installed
if ! command -v borg &> /dev/null; then
    error_exit "Borg backup is not installed. Install with: apt install borgbackup"
fi

# Check if running as root (recommended for full system backup)
if [[ $EUID -ne 0 ]]; then
    log "WARN" "Not running as root. Some files may be skipped."
fi

# Check if passphrase is set
if [[ -z "${BORG_PASSPHRASE}" ]]; then
    log "WARN" "BORG_PASSPHRASE not set. You will be prompted for passphrase."
    log "WARN" "Set BORG_PASSPHRASE environment variable to avoid prompts."
fi

# Verify backup sources exist
for source in "${BACKUP_SOURCES[@]}"; do
    if [[ ! -d "${source}" ]]; then
        error_exit "Backup source does not exist: ${source}"
    fi
done

#############################################
# REPOSITORY INITIALIZATION
#############################################

# Check if repository exists and is initialized
if [[ ! -d "${REPO}" ]]; then
    log "INFO" "Repository directory does not exist. Creating: ${REPO}"
    mkdir -p "${REPO}"
fi

# Check if borg repo is initialized by looking for config file
if [[ ! -f "${REPO}/config" ]]; then
    log "INFO" "Borg repository not initialized. Initializing..."
    
    if borg init --encryption=repokey "${REPO}" 2>&1 | tee -a "${LOG_FILE}"; then
        log "INFO" "Repository initialized successfully"
        log "WARN" "IMPORTANT: Save your repository key! Run: borg key export ${REPO} backup-key.txt"
    else
        error_exit "Failed to initialize repository"
    fi
else
    log "INFO" "Repository already initialized"
fi

#############################################
# CREATE BACKUP
#############################################

# Create backup name with timestamp
BACKUP_NAME="om-backup-$(date +%Y%m%d-%H%M%S)"

log "INFO" "Creating backup: ${BACKUP_NAME}"
log "INFO" "Sources: ${BACKUP_SOURCES[*]}"

# Borg create with progress and stats
if borg create \
    --verbose \
    --stats \
    --progress \
    --compression "${COMPRESSION}" \
    --exclude-caches \
    --exclude '**/node_modules' \
    --exclude '**/dist' \
    --exclude '**/.git' \
    --exclude '**/temp' \
    --exclude '**/tmp' \
    --exclude '**/*.log' \
    --exclude '**/logs/*.log' \
    "${REPO}::${BACKUP_NAME}" \
    "${BACKUP_SOURCES[@]}" \
    2>&1 | tee -a "${LOG_FILE}"; then
    
    log "INFO" "Backup created successfully: ${BACKUP_NAME}"
else
    error_exit "Backup creation failed"
fi

#############################################
# PRUNE OLD BACKUPS
#############################################

log "INFO" "Pruning old backups..."
log "INFO" "Retention: ${KEEP_DAILY} daily, ${KEEP_WEEKLY} weekly, ${KEEP_MONTHLY} monthly"

if borg prune \
    --verbose \
    --list \
    --stats \
    --keep-daily="${KEEP_DAILY}" \
    --keep-weekly="${KEEP_WEEKLY}" \
    --keep-monthly="${KEEP_MONTHLY}" \
    "${REPO}" \
    2>&1 | tee -a "${LOG_FILE}"; then
    
    log "INFO" "Pruning completed successfully"
else
    log "WARN" "Pruning completed with warnings (non-fatal)"
fi

#############################################
# COMPACT REPOSITORY
#############################################

log "INFO" "Compacting repository..."

if borg compact --verbose "${REPO}" 2>&1 | tee -a "${LOG_FILE}"; then
    log "INFO" "Repository compacted successfully"
else
    log "WARN" "Compacting completed with warnings (non-fatal)"
fi

#############################################
# VERIFICATION
#############################################

log "INFO" "Listing backups in repository:"

if borg list "${REPO}" 2>&1 | tee -a "${LOG_FILE}"; then
    log "INFO" "Repository listing successful"
else
    log "WARN" "Repository listing failed (non-fatal)"
fi

#############################################
# SUMMARY
#############################################

log "INFO" "Backup completed successfully"
log "INFO" "Backup name: ${BACKUP_NAME}"
log "INFO" "Repository: ${REPO}"
log "INFO" "Log file: ${LOG_FILE}"

# Calculate repository size
if command -v du &> /dev/null; then
    REPO_SIZE=$(du -sh "${REPO}" 2>/dev/null | cut -f1 || echo "unknown")
    log "INFO" "Repository size: ${REPO_SIZE}"
fi

log "INFO" "=== Backup Complete ==="

exit 0
