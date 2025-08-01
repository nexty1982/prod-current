#!/bin/bash

# =====================================================
# OMAI-Spin: Production to Development Environment Mirroring
# 
# Comprehensive environment replication system that safely clones
# production codebase and databases for development use.
# 
# Features:
# - File system cloning with intelligent exclusions
# - Database dumping, sanitization, and restoration
# - Configuration replacement (URLs, domains, secrets)
# - Comprehensive tracking and logging
# - Safety checks and rollback capabilities
# 
# Usage:
#   ./omai-spin.sh [options]
#   ./omai-spin.sh --help
#   ./omai-spin.sh --dry-run
#   ./omai-spin.sh --force --skip-backup
# 
# Author: OMAI Development Team
# Version: 1.0.0
# Date: 2025-01-30
# =====================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =====================================================
# CONFIGURATION & CONSTANTS
# =====================================================

# Script metadata
readonly SCRIPT_NAME="omai-spin"
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_PATH="${SCRIPT_DIR}/$(basename "${BASH_SOURCE[0]}")"

# Default paths
readonly DEFAULT_PROD_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
readonly DEFAULT_DEV_PATH="/var/www/orthodmetrics/dev"
readonly LOG_FILE="${SCRIPT_DIR}/omai-spin.log"
readonly TEMP_DIR="${SCRIPT_DIR}/temp"

# Database configuration
readonly DB_USER="root"
readonly DB_PASS="Summerof1982@!"
readonly DB_HOST="localhost"
readonly TRACKING_DB="omai_spin_dev_db"

# Databases to mirror
readonly DATABASES=(
    "orthodoxmetrics_db:orthodoxmetrics_dev_db"
    "omai_db:omai_dev_db"
    "omai_error_tracking_db:omai_error_tracking_dev_db"
)

# Files and directories to exclude from copying
readonly EXCLUDE_PATTERNS=(
    "node_modules/"
    "dist/"
    "build/"
    "logs/"
    ".env.production"
    ".git/"
    "*.log"
    "*.tmp"
    "temp/"
    "cache/"
    ".DS_Store"
    "Thumbs.db"
    "*.swp"
    "*.swo"
    ".vscode/"
    ".idea/"
    "coverage/"
    ".nyc_output/"
    "uploads/"
    "backups/"
)

# Configuration replacements
declare -A CONFIG_REPLACEMENTS=(
    ["https://orthodoxmetrics.com"]="http://orthodmetrics.com"
    ["orthodoxmetrics.com"]="orthodmetrics.com"
    ["NODE_ENV=production"]="NODE_ENV=development"
    ["APP_ENV=production"]="APP_ENV=development"
    ["SSL_ENABLED=true"]="SSL_ENABLED=false"
    ["DEBUG=false"]="DEBUG=true"
)

# Global variables
PROD_PATH="${DEFAULT_PROD_PATH}"
DEV_PATH="${DEFAULT_DEV_PATH}"
SESSION_ID=""
SESSION_UUID=""
DRY_RUN=false
FORCE=false
SKIP_BACKUP=false
SKIP_DATABASE=false
SKIP_FILES=false
VERBOSE=false
TRIGGERED_BY="${USER:-manual}"

# Statistics tracking
declare -A STATS=(
    ["files_copied"]=0
    ["files_excluded"]=0
    ["files_modified"]=0
    ["config_replacements"]=0
    ["databases_processed"]=0
    ["errors"]=0
)

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

# Print colored output
print_color() {
    local color="$1"
    shift
    case "$color" in
        red)    echo -e "\033[0;31m$*\033[0m" ;;
        green)  echo -e "\033[0;32m$*\033[0m" ;;
        yellow) echo -e "\033[0;33m$*\033[0m" ;;
        blue)   echo -e "\033[0;34m$*\033[0m" ;;
        purple) echo -e "\033[0;35m$*\033[0m" ;;
        cyan)   echo -e "\033[0;36m$*\033[0m" ;;
        *)      echo "$*" ;;
    esac
}

# Logging functions
log() {
    local level="$1"
    shift
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local message="[$timestamp] [$level] $*"
    
    echo "$message" >> "$LOG_FILE"
    
    case "$level" in
        ERROR)   print_color red "❌ $*" ;;
        WARN)    print_color yellow "⚠️  $*" ;;
        INFO)    print_color green "ℹ️  $*" ;;
        DEBUG)   [[ "$VERBOSE" == "true" ]] && print_color blue "🔍 $*" ;;
        SUCCESS) print_color green "✅ $*" ;;
        *)       echo "$*" ;;
    esac
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_debug() { log "DEBUG" "$@"; }
log_success() { log "SUCCESS" "$@"; }

# Database logging function
log_to_db() {
    local level="$1"
    local component="$2"
    local operation="$3"
    local message="$4"
    local details="${5:-null}"
    
    if [[ -n "$SESSION_ID" ]]; then
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
            CALL LogAgentOperation($SESSION_ID, '$level', '$component', '$operation', 
                                   '$(echo "$message" | sed "s/'/''/g")', 
                                   $([ "$details" != "null" ] && echo "'$details'" || echo "null"), 
                                   null);
        " 2>/dev/null || log_warn "Failed to log to database: $message"
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    
    STATS["errors"]=$((STATS["errors"] + 1))
    log_error "Script failed at line $line_number with exit code $exit_code"
    log_to_db "error" "main" "script_error" "Script failed at line $line_number" "{\"exit_code\": $exit_code}"
    
    if [[ -n "$SESSION_ID" ]]; then
        complete_session "failed" "Script failed at line $line_number with exit code $exit_code"
    fi
    
    cleanup
    exit $exit_code
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR" || log_warn "Failed to remove temp directory"
    fi
    log_info "Cleanup completed"
}

# Set exit trap
trap cleanup EXIT

# =====================================================
# DATABASE FUNCTIONS
# =====================================================

# Initialize tracking database
init_tracking_db() {
    log_info "Initializing tracking database..."
    
    # Create database if it doesn't exist
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "
        CREATE DATABASE IF NOT EXISTS $TRACKING_DB;
    " 2>/dev/null || {
        log_error "Failed to create tracking database"
        return 1
    }
    
    # Apply schema if tables don't exist
    local table_count=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = '$TRACKING_DB' AND table_name = 'spin_sessions';
    " -N 2>/dev/null || echo "0")
    
    if [[ "$table_count" == "0" ]]; then
        log_info "Creating tracking database schema..."
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" < "${SCRIPT_DIR}/../database/migrations/omai_spin_dev_tracking.sql" || {
            log_error "Failed to create tracking database schema"
            return 1
        }
    fi
    
    log_success "Tracking database initialized"
    return 0
}

# Start new session
start_session() {
    log_info "Starting new OMAI-Spin session..."
    
    local temp_file=$(mktemp)
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        CALL StartSpinSession('$PROD_PATH', '$DEV_PATH', '$TRIGGERED_BY', @session_id, @session_uuid);
        SELECT @session_id AS session_id, @session_uuid AS session_uuid;
    " -N > "$temp_file" 2>/dev/null || {
        log_error "Failed to start session"
        rm -f "$temp_file"
        return 1
    }
    
    read SESSION_ID SESSION_UUID < "$temp_file"
    rm -f "$temp_file"
    
    if [[ -z "$SESSION_ID" || "$SESSION_ID" == "NULL" ]]; then
        log_error "Failed to get session ID"
        return 1
    fi
    
    log_success "Session started: ID=$SESSION_ID, UUID=$SESSION_UUID"
    log_to_db "info" "session" "start" "OMAI-Spin session started" "{\"prod_path\": \"$PROD_PATH\", \"dev_path\": \"$DEV_PATH\"}"
    return 0
}

# Complete session
complete_session() {
    local status="$1"
    local error_message="${2:-}"
    
    if [[ -z "$SESSION_ID" ]]; then
        return 0
    fi
    
    log_info "Completing session with status: $status"
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        CALL CompleteSpinSession($SESSION_ID, '$status', 
                                 $([ -n "$error_message" ] && echo "'$(echo "$error_message" | sed "s/'/''/g")'" || echo "null"),
                                 ${STATS["files_copied"]}, ${STATS["files_excluded"]}, ${STATS["files_modified"]});
    " 2>/dev/null || log_warn "Failed to complete session in database"
    
    log_to_db "info" "session" "complete" "Session completed with status: $status" "$(printf '{
        "files_copied": %d,
        "files_excluded": %d,
        "files_modified": %d,
        "config_replacements": %d,
        "databases_processed": %d,
        "errors": %d
    }' "${STATS["files_copied"]}" "${STATS["files_excluded"]}" "${STATS["files_modified"]}" "${STATS["config_replacements"]}" "${STATS["databases_processed"]}" "${STATS["errors"]}")"
}

# Log file operation
log_file_operation() {
    local file_path="$1"
    local action="$2"
    local modification_type="${3:-}"
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        INSERT INTO file_changes (session_id, file_path, relative_path, action, modification_type)
        VALUES ($SESSION_ID, 
                '$(echo "$file_path" | sed "s/'/''/g")', 
                '$(echo "${file_path#$PROD_PATH/}" | sed "s/'/''/g")', 
                '$action', 
                $([ -n "$modification_type" ] && echo "'$modification_type'" || echo "null"));
    " 2>/dev/null || log_debug "Failed to log file operation: $file_path"
}

# =====================================================
# FILE SYSTEM FUNCTIONS
# =====================================================

# Check if path should be excluded
should_exclude() {
    local path="$1"
    local relative_path="${path#$PROD_PATH/}"
    
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        if [[ "$relative_path" == $pattern* ]]; then
            return 0  # Should exclude
        fi
    done
    
    return 1  # Should not exclude
}

# Copy file with logging
copy_file() {
    local src="$1"
    local dest="$2"
    local relative_path="${src#$PROD_PATH/}"
    
    if should_exclude "$src"; then
        log_debug "Excluding: $relative_path"
        STATS["files_excluded"]=$((STATS["files_excluded"] + 1))
        log_file_operation "$src" "excluded"
        return 0
    fi
    
    # Create destination directory
    local dest_dir=$(dirname "$dest")
    if [[ ! -d "$dest_dir" ]]; then
        mkdir -p "$dest_dir" || {
            log_error "Failed to create directory: $dest_dir"
            return 1
        }
    fi
    
    # Copy file
    if [[ "$DRY_RUN" == "true" ]]; then
        log_debug "[DRY RUN] Would copy: $relative_path"
    else
        cp "$src" "$dest" || {
            log_error "Failed to copy file: $relative_path"
            return 1
        }
        log_debug "Copied: $relative_path"
    fi
    
    STATS["files_copied"]=$((STATS["files_copied"] + 1))
    log_file_operation "$src" "copied"
    
    return 0
}

# Apply configuration replacements to a file
apply_config_replacements() {
    local file_path="$1"
    local relative_path="${file_path#$DEV_PATH/}"
    local modified=false
    
    # Skip binary files
    if file "$file_path" | grep -q "binary"; then
        return 0
    fi
    
    # Skip files that are too large (>10MB)
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
    if [[ "$file_size" -gt 10485760 ]]; then
        log_debug "Skipping large file: $relative_path (${file_size} bytes)"
        return 0
    fi
    
    log_debug "Checking replacements in: $relative_path"
    
    for search_pattern in "${!CONFIG_REPLACEMENTS[@]}"; do
        local replace_pattern="${CONFIG_REPLACEMENTS[$search_pattern]}"
        
        if grep -q "$search_pattern" "$file_path" 2>/dev/null; then
            if [[ "$DRY_RUN" == "true" ]]; then
                log_debug "[DRY RUN] Would replace '$search_pattern' with '$replace_pattern' in $relative_path"
            else
                # Create backup
                cp "$file_path" "$file_path.bak" || {
                    log_warn "Failed to create backup for: $relative_path"
                    continue
                }
                
                # Apply replacement
                if sed -i.tmp "s|$search_pattern|$replace_pattern|g" "$file_path" 2>/dev/null; then
                    rm -f "$file_path.tmp" "$file_path.bak"
                    modified=true
                    STATS["config_replacements"]=$((STATS["config_replacements"] + 1))
                    log_debug "Replaced '$search_pattern' with '$replace_pattern' in $relative_path"
                    
                    # Log to database
                    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
                        INSERT INTO config_replacements (session_id, file_path, replacement_type, pattern_matched, old_value, new_value)
                        VALUES ($SESSION_ID, 
                                '$(echo "$file_path" | sed "s/'/''/g")', 
                                'url_domain', 
                                '$(echo "$search_pattern" | sed "s/'/''/g")', 
                                '$(echo "$search_pattern" | sed "s/'/''/g")', 
                                '$(echo "$replace_pattern" | sed "s/'/''/g")');
                    " 2>/dev/null || log_debug "Failed to log replacement to database"
                else
                    # Restore backup on failure
                    if [[ -f "$file_path.bak" ]]; then
                        mv "$file_path.bak" "$file_path"
                    fi
                    rm -f "$file_path.tmp"
                    log_warn "Failed to apply replacement in: $relative_path"
                fi
            fi
        fi
    done
    
    if [[ "$modified" == "true" ]]; then
        STATS["files_modified"]=$((STATS["files_modified"] + 1))
        log_file_operation "$file_path" "modified" "config_replace"
    fi
    
    return 0
}

# Sync files from production to development
sync_files() {
    log_info "Starting file synchronization..."
    log_to_db "info" "file_sync" "start" "File synchronization started"
    
    if [[ ! -d "$PROD_PATH" ]]; then
        log_error "Production path does not exist: $PROD_PATH"
        return 1
    fi
    
    # Create development directory
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create development directory: $DEV_PATH"
    else
        mkdir -p "$DEV_PATH" || {
            log_error "Failed to create development directory: $DEV_PATH"
            return 1
        }
    fi
    
    # Copy files recursively
    local file_count=0
    while IFS= read -r -d '' file; do
        local relative_file="${file#$PROD_PATH/}"
        local dest_file="$DEV_PATH/$relative_file"
        
        copy_file "$file" "$dest_file" || {
            log_error "Failed to copy file: $relative_file"
            STATS["errors"]=$((STATS["errors"] + 1))
            continue
        }
        
        file_count=$((file_count + 1))
        
        # Progress update every 1000 files
        if [[ $((file_count % 1000)) -eq 0 ]]; then
            log_info "Progress: $file_count files processed"
        fi
    done < <(find "$PROD_PATH" -type f -print0)
    
    log_success "File synchronization completed: $file_count files processed"
    log_to_db "info" "file_sync" "complete" "File synchronization completed" "{\"files_processed\": $file_count}"
    
    return 0
}

# Apply configuration replacements to all files
apply_all_replacements() {
    log_info "Applying configuration replacements..."
    log_to_db "info" "config_replace" "start" "Configuration replacement started"
    
    if [[ ! -d "$DEV_PATH" ]]; then
        log_error "Development path does not exist: $DEV_PATH"
        return 1
    fi
    
    local file_count=0
    while IFS= read -r -d '' file; do
        apply_config_replacements "$file" || {
            log_warn "Failed to apply replacements to: ${file#$DEV_PATH/}"
            continue
        }
        
        file_count=$((file_count + 1))
        
        # Progress update every 500 files
        if [[ $((file_count % 500)) -eq 0 ]]; then
            log_info "Progress: $file_count files checked for replacements"
        fi
    done < <(find "$DEV_PATH" -type f -print0)
    
    log_success "Configuration replacements completed: ${STATS["config_replacements"]} replacements in $file_count files"
    log_to_db "info" "config_replace" "complete" "Configuration replacement completed" "{\"files_checked\": $file_count, \"replacements_made\": ${STATS["config_replacements"]}}"
    
    return 0
}

# =====================================================
# ENVIRONMENT FILE GENERATION
# =====================================================

# Generate .env.development file
generate_env_file() {
    log_info "Generating .env.development file..."
    
    local env_template="${SCRIPT_DIR}/env.development.template"
    local env_output="$DEV_PATH/.env.development"
    
    if [[ ! -f "$env_template" ]]; then
        log_error "Environment template not found: $env_template"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would generate .env.development file"
        return 0
    fi
    
    # Get system information
    local generation_date=$(date '+%Y-%m-%d %H:%M:%S %Z')
    local os_platform=$(uname -s)
    local node_version=$(node --version 2>/dev/null || echo "unknown")
    local npm_version=$(npm --version 2>/dev/null || echo "unknown")
    local source_commit=$(cd "$PROD_PATH" && git rev-parse HEAD 2>/dev/null || echo "unknown")
    local build_number=$(date +%Y%m%d%H%M%S)
    
    # Replace template variables
    sed -e "s/{{GENERATION_DATE}}/$generation_date/g" \
        -e "s/{{SESSION_ID}}/$SESSION_ID/g" \
        -e "s/{{OS_PLATFORM}}/$os_platform/g" \
        -e "s/{{NODE_VERSION}}/$node_version/g" \
        -e "s/{{NPM_VERSION}}/$npm_version/g" \
        -e "s/{{SOURCE_COMMIT_HASH}}/$source_commit/g" \
        -e "s/{{BUILD_NUMBER}}/$build_number/g" \
        "$env_template" > "$env_output" || {
        log_error "Failed to generate .env.development file"
        return 1
    }
    
    # Log environment modifications
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        INSERT INTO env_modifications (session_id, file_name, key_name, new_value, modification_reason)
        VALUES ($SESSION_ID, '.env.development', 'GENERATED_FILE', 'true', 'Generated from template');
    " 2>/dev/null || log_debug "Failed to log env file generation"
    
    log_success ".env.development file generated successfully"
    log_file_operation "$env_output" "created" "env_generation"
    
    return 0
}

# =====================================================
# DATABASE FUNCTIONS
# =====================================================

# Dump database
dump_database() {
    local source_db="$1"
    local dump_file="$2"
    
    log_info "Dumping database: $source_db"
    log_to_db "info" "db_dump" "start" "Database dump started: $source_db"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would dump database $source_db to $dump_file"
        return 0
    fi
    
    # Create dump directory
    local dump_dir=$(dirname "$dump_file")
    mkdir -p "$dump_dir" || {
        log_error "Failed to create dump directory: $dump_dir"
        return 1
    }
    
    # Create database dump
    mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" \
              --routines --triggers --single-transaction \
              --add-drop-database --create-options \
              "$source_db" > "$dump_file" 2>/dev/null || {
        log_error "Failed to dump database: $source_db"
        rm -f "$dump_file"
        return 1
    }
    
    # Verify dump file
    if [[ ! -s "$dump_file" ]]; then
        log_error "Database dump is empty: $dump_file"
        return 1
    fi
    
    local dump_size=$(stat -f%z "$dump_file" 2>/dev/null || stat -c%s "$dump_file" 2>/dev/null || echo "0")
    log_success "Database dumped successfully: $source_db (${dump_size} bytes)"
    
    # Log to database
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        INSERT INTO database_operations (session_id, operation_type, source_database, target_database, 
                                         dump_file_path, dump_size_bytes, operation_status)
        VALUES ($SESSION_ID, 'dump', '$source_db', '$source_db', 
                '$(echo "$dump_file" | sed "s/'/''/g")', $dump_size, 'completed');
    " 2>/dev/null || log_debug "Failed to log database dump"
    
    return 0
}

# Restore database
restore_database() {
    local target_db="$1"
    local dump_file="$2"
    
    log_info "Restoring database: $target_db"
    log_to_db "info" "db_restore" "start" "Database restore started: $target_db"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would restore database $target_db from $dump_file"
        return 0
    fi
    
    if [[ ! -f "$dump_file" ]]; then
        log_error "Dump file not found: $dump_file"
        return 1
    fi
    
    # Create target database
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "
        DROP DATABASE IF EXISTS $target_db;
        CREATE DATABASE $target_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    " 2>/dev/null || {
        log_error "Failed to create target database: $target_db"
        return 1
    }
    
    # Restore database
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$target_db" < "$dump_file" 2>/dev/null || {
        log_error "Failed to restore database: $target_db"
        return 1
    }
    
    # Get record count
    local record_count=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$target_db" -e "
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$target_db';
    " -N 2>/dev/null || echo "0")
    
    log_success "Database restored successfully: $target_db ($record_count tables)"
    
    # Log to database
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$TRACKING_DB" -e "
        INSERT INTO database_operations (session_id, operation_type, source_database, target_database, 
                                         dump_file_path, records_affected, operation_status)
        VALUES ($SESSION_ID, 'restore', '$target_db', '$target_db', 
                '$(echo "$dump_file" | sed "s/'/''/g")', $record_count, 'completed');
    " 2>/dev/null || log_debug "Failed to log database restore"
    
    return 0
}

# Sanitize database
sanitize_database() {
    local source_db="$1"
    local target_db="$2"
    
    log_info "Sanitizing database: $target_db"
    log_to_db "info" "db_sanitize" "start" "Database sanitization started: $target_db"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would sanitize database $target_db"
        return 0
    fi
    
    # Check if sanitize script exists
    local sanitize_script="${SCRIPT_DIR}/sanitize-db.js"
    if [[ ! -f "$sanitize_script" ]]; then
        log_warn "Sanitization script not found: $sanitize_script"
        log_warn "Skipping database sanitization"
        return 0
    fi
    
    # Run sanitization
    if node "$sanitize_script" --session-id="$SESSION_ID" --source-db="$source_db" --target-db="$target_db" 2>&1 | while read line; do
        log_debug "Sanitizer: $line"
    done; then
        log_success "Database sanitization completed: $target_db"
        log_to_db "info" "db_sanitize" "complete" "Database sanitization completed: $target_db"
    else
        log_error "Database sanitization failed: $target_db"
        return 1
    fi
    
    return 0
}

# Process all databases
process_databases() {
    if [[ "$SKIP_DATABASE" == "true" ]]; then
        log_info "Skipping database processing (--skip-database)"
        return 0
    fi
    
    log_info "Starting database processing..."
    
    # Create temporary directory for dumps
    mkdir -p "$TEMP_DIR/dumps" || {
        log_error "Failed to create dump directory"
        return 1
    }
    
    for db_mapping in "${DATABASES[@]}"; do
        IFS=':' read -r source_db target_db <<< "$db_mapping"
        
        log_info "Processing database: $source_db → $target_db"
        
        # Check if source database exists
        local db_exists=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "
            SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$source_db';
        " -N 2>/dev/null | wc -l)
        
        if [[ "$db_exists" -eq 0 ]]; then
            log_warn "Source database does not exist: $source_db"
            continue
        fi
        
        local dump_file="$TEMP_DIR/dumps/${source_db}.sql"
        
        # Dump database
        dump_database "$source_db" "$dump_file" || {
            log_error "Failed to dump database: $source_db"
            STATS["errors"]=$((STATS["errors"] + 1))
            continue
        }
        
        # Restore database
        restore_database "$target_db" "$dump_file" || {
            log_error "Failed to restore database: $target_db"
            STATS["errors"]=$((STATS["errors"] + 1))
            continue
        }
        
        # Sanitize database
        sanitize_database "$source_db" "$target_db" || {
            log_warn "Database sanitization failed: $target_db"
            # Don't fail the entire process for sanitization issues
        }
        
        STATS["databases_processed"]=$((STATS["databases_processed"] + 1))
        log_success "Database processing completed: $source_db → $target_db"
    done
    
    log_success "Database processing completed: ${STATS["databases_processed"]} databases processed"
    return 0
}

# =====================================================
# MAIN FUNCTIONS
# =====================================================

# Show help
show_help() {
    cat << EOF
OMAI-Spin: Production to Development Environment Mirroring Tool

USAGE:
    $0 [OPTIONS]

DESCRIPTION:
    Safely clone production codebase and databases for development use.
    Includes file synchronization, configuration replacement, database
    dumping/restoration, and comprehensive tracking.

OPTIONS:
    --prod-path PATH        Production directory path (default: $DEFAULT_PROD_PATH)
    --dev-path PATH         Development directory path (default: $DEFAULT_DEV_PATH)
    --dry-run              Preview changes without applying them
    --force                Skip confirmation prompts
    --skip-backup          Skip backup creation (not recommended)
    --skip-database        Skip database processing
    --skip-files           Skip file synchronization
    --verbose              Enable verbose logging
    --triggered-by USER    Set the user who triggered the operation
    --help                 Show this help message

EXAMPLES:
    # Basic usage with default paths
    $0

    # Dry run to preview changes
    $0 --dry-run

    # Custom paths
    $0 --prod-path=/custom/prod --dev-path=/custom/dev

    # Skip database processing
    $0 --skip-database --verbose

    # Force operation without prompts
    $0 --force --skip-backup

DATABASES:
    The following databases will be mirrored:
$(for db in "${DATABASES[@]}"; do
    IFS=':' read -r src dst <<< "$db"
    echo "    $src → $dst"
done)

FILES EXCLUDED:
$(for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    echo "    $pattern"
done)

CONFIGURATION REPLACEMENTS:
$(for pattern in "${!CONFIG_REPLACEMENTS[@]}"; do
    echo "    '$pattern' → '${CONFIG_REPLACEMENTS[$pattern]}'"
done)

LOGS:
    Main log file: $LOG_FILE
    Database tracking: $TRACKING_DB

VERSION: $SCRIPT_VERSION
AUTHOR: OMAI Development Team

For more information, see the OMAI-Spin documentation.
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --prod-path=*)
                PROD_PATH="${1#*=}"
                shift
                ;;
            --prod-path)
                PROD_PATH="$2"
                shift 2
                ;;
            --dev-path=*)
                DEV_PATH="${1#*=}"
                shift
                ;;
            --dev-path)
                DEV_PATH="$2"
                shift 2
                ;;
            --triggered-by=*)
                TRIGGERED_BY="${1#*=}"
                shift
                ;;
            --triggered-by)
                TRIGGERED_BY="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-database)
                SKIP_DATABASE=true
                shift
                ;;
            --skip-files)
                SKIP_FILES=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information."
                exit 1
                ;;
        esac
    done
}

# Validate configuration
validate_config() {
    log_info "Validating configuration..."
    
    # Check production path
    if [[ ! -d "$PROD_PATH" ]]; then
        log_error "Production path does not exist: $PROD_PATH"
        return 1
    fi
    
    # Check if production path looks like a valid project
    if [[ ! -f "$PROD_PATH/package.json" && ! -f "$PROD_PATH/server/package.json" ]]; then
        log_warn "Production path does not appear to contain a Node.js project"
        if [[ "$FORCE" != "true" ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Operation cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Check development path
    if [[ -d "$DEV_PATH" ]]; then
        log_warn "Development path already exists: $DEV_PATH"
        if [[ "$FORCE" != "true" ]]; then
            read -p "This will overwrite existing files. Continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Operation cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Check database connectivity
    if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" &>/dev/null; then
        log_error "Cannot connect to database server"
        return 1
    fi
    
    # Check available disk space
    local available_space=$(df "$DEV_PATH" 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
    local required_space=$(du -s "$PROD_PATH" 2>/dev/null | awk '{print $1}' || echo "0")
    
    if [[ "$available_space" -lt "$required_space" ]]; then
        log_warn "Insufficient disk space (available: ${available_space}KB, required: ${required_space}KB)"
        if [[ "$FORCE" != "true" ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Operation cancelled by user"
                exit 0
            fi
        fi
    fi
    
    log_success "Configuration validation completed"
    return 0
}

# Show summary
show_summary() {
    log_info "OMAI-Spin Operation Summary"
    log_info "=========================="
    log_info "Session ID: $SESSION_ID"
    log_info "Session UUID: $SESSION_UUID"
    log_info "Production Path: $PROD_PATH"
    log_info "Development Path: $DEV_PATH"
    log_info "Triggered By: $TRIGGERED_BY"
    log_info "Dry Run: $DRY_RUN"
    log_info ""
    log_info "File Statistics:"
    log_info "  Files Copied: ${STATS["files_copied"]}"
    log_info "  Files Excluded: ${STATS["files_excluded"]}"
    log_info "  Files Modified: ${STATS["files_modified"]}"
    log_info "  Config Replacements: ${STATS["config_replacements"]}"
    log_info ""
    log_info "Database Statistics:"
    log_info "  Databases Processed: ${STATS["databases_processed"]}"
    log_info ""
    log_info "Errors: ${STATS["errors"]}"
    log_info ""
    log_info "Log Files:"
    log_info "  Main Log: $LOG_FILE"
    log_info "  Tracking Database: $TRACKING_DB"
    
    if [[ "${STATS["errors"]}" -gt 0 ]]; then
        log_warn "Operation completed with ${STATS["errors"]} errors. Check logs for details."
    else
        log_success "Operation completed successfully!"
    fi
}

# Main function
main() {
    # Initialize
    echo "OMAI-Spin v$SCRIPT_VERSION - Production to Development Environment Mirroring"
    echo "============================================================================"
    echo ""
    
    # Parse arguments
    parse_args "$@"
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log_info "OMAI-Spin operation started"
    log_info "Script: $SCRIPT_PATH"
    log_info "Version: $SCRIPT_VERSION"
    log_info "User: ${USER:-unknown}"
    log_info "Triggered by: $TRIGGERED_BY"
    log_info "Arguments: $*"
    
    # Validate configuration
    validate_config || exit 1
    
    # Initialize tracking database
    init_tracking_db || exit 1
    
    # Start session
    start_session || exit 1
    
    # Show configuration
    log_info "Configuration:"
    log_info "  Production Path: $PROD_PATH"
    log_info "  Development Path: $DEV_PATH"
    log_info "  Dry Run: $DRY_RUN"
    log_info "  Skip Database: $SKIP_DATABASE"
    log_info "  Skip Files: $SKIP_FILES"
    log_info "  Verbose: $VERBOSE"
    
    # Confirm operation
    if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        echo ""
        read -p "Proceed with OMAI-Spin operation? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Operation cancelled by user"
            complete_session "cancelled" "Operation cancelled by user"
            exit 0
        fi
    fi
    
    echo ""
    log_info "Starting OMAI-Spin operation..."
    echo ""
    
    # File synchronization
    if [[ "$SKIP_FILES" != "true" ]]; then
        sync_files || {
            complete_session "failed" "File synchronization failed"
            exit 1
        }
        
        apply_all_replacements || {
            complete_session "failed" "Configuration replacement failed"
            exit 1
        }
        
        generate_env_file || {
            complete_session "failed" "Environment file generation failed"
            exit 1
        }
    else
        log_info "Skipping file synchronization (--skip-files)"
    fi
    
    # Database processing
    process_databases || {
        complete_session "failed" "Database processing failed"
        exit 1
    }
    
    # Complete session
    complete_session "completed"
    
    # Show summary
    echo ""
    show_summary
    
    log_success "OMAI-Spin operation completed successfully!"
    
    return 0
}

# =====================================================
# SCRIPT EXECUTION
# =====================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed directly
    main "$@"
else
    # Script is being sourced
    log_info "OMAI-Spin script loaded (sourced)"
fi