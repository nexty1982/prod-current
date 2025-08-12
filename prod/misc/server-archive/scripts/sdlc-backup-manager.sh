#!/bin/bash

# OrthodoxMetrics SDLC Backup Manager
# Handles automated backups for prod and dev environments with NFS integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_BASE_DIR="/var/backups/orthodoxmetrics"
NFS_MOUNT_POINT="/mnt/orthodox-nfs-backup"
LOG_FILE="/var/log/om-sdlc-backup.log"
CONFIG_FILE="/etc/orthodoxmetrics/sdlc-backup.conf"

# Backup targets
PROD_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
DEV_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/dev"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
    else
        # Default configuration
        BACKUP_ENABLED=true
        NFS_ENABLED=false
        NFS_SERVER_IP=""
        NFS_REMOTE_PATH=""
        RETENTION_DAYS=30
        COMPRESSION=true
        EMAIL_NOTIFICATIONS=false
        NOTIFICATION_EMAIL=""
    fi
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if backup directories exist
    if [[ ! -d "$BACKUP_BASE_DIR" ]]; then
        print_status "Creating backup base directory..."
        mkdir -p "$BACKUP_BASE_DIR"
        chmod 755 "$BACKUP_BASE_DIR"
    fi
    
    # Check if prod and dev directories exist
    if [[ ! -d "$PROD_PATH" ]]; then
        print_error "Production path not found: $PROD_PATH"
        exit 1
    fi
    
    if [[ ! -d "$DEV_PATH" ]]; then
        print_error "Development path not found: $DEV_PATH"
        exit 1
    fi
    
    # Check if zip is available
    if ! command -v zip >/dev/null 2>&1; then
        print_error "zip command not found. Please install: apt-get install zip"
        exit 1
    fi
    
    # Check if rsync is available
    if ! command -v rsync >/dev/null 2>&1; then
        print_error "rsync command not found. Please install: apt-get install rsync"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Check NFS mount status
check_nfs_mount() {
    if [[ "$NFS_ENABLED" == "true" ]]; then
        print_status "Checking NFS mount status..."
        
        if mount | grep -q "$NFS_MOUNT_POINT"; then
            print_success "NFS share is mounted at $NFS_MOUNT_POINT"
            return 0
        else
            print_warning "NFS share is not mounted. Attempting to mount..."
            
            if [[ -n "$NFS_SERVER_IP" && -n "$NFS_REMOTE_PATH" ]]; then
                # Create mount point if it doesn't exist
                mkdir -p "$NFS_MOUNT_POINT"
                
                # Attempt to mount
                if mount -t nfs "$NFS_SERVER_IP:$NFS_REMOTE_PATH" "$NFS_MOUNT_POINT" 2>/dev/null; then
                    print_success "NFS share mounted successfully"
                    return 0
                else
                    print_error "Failed to mount NFS share"
                    return 1
                fi
            else
                print_error "NFS server IP or remote path not configured"
                return 1
            fi
        fi
    else
        print_status "NFS backup is disabled"
        return 0
    fi
}

# Create backup directory structure
create_backup_dirs() {
    local env=$1
    local backup_dir="$BACKUP_BASE_DIR/$env"
    
    mkdir -p "$backup_dir"
    chmod 755 "$backup_dir"
    
    # Create NFS backup directory if enabled
    if [[ "$NFS_ENABLED" == "true" && -d "$NFS_MOUNT_POINT" ]]; then
        local nfs_backup_dir="$NFS_MOUNT_POINT/$env"
        mkdir -p "$nfs_backup_dir"
        chmod 755 "$nfs_backup_dir"
    fi
}

# Create full backup
create_full_backup() {
    local env=$1
    local source_path=$2
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="full_backup_${env}_${timestamp}.zip"
    local backup_path="$BACKUP_BASE_DIR/$env/$backup_name"
    
    print_status "Creating full backup for $env environment..."
    
    # Create backup directory
    create_backup_dirs "$env"
    
    # Create backup
    cd "$(dirname "$source_path")"
    if zip -r "$backup_path" "$(basename "$source_path")" -x "*/node_modules/*" "*/logs/*" "*/temp/*" "*.log" >/dev/null 2>&1; then
        print_success "Full backup created: $backup_name"
        
        # Copy to NFS if enabled
        if [[ "$NFS_ENABLED" == "true" && -d "$NFS_MOUNT_POINT" ]]; then
            local nfs_backup_path="$NFS_MOUNT_POINT/$env/$backup_name"
            if cp "$backup_path" "$nfs_backup_path"; then
                print_success "Backup copied to NFS: $nfs_backup_path"
            else
                print_warning "Failed to copy backup to NFS"
            fi
        fi
        
        # Update last full backup timestamp
        echo "$timestamp" > "$BACKUP_BASE_DIR/$env/last_full_backup.txt"
        
        return 0
    else
        print_error "Failed to create full backup for $env"
        return 1
    fi
}

# Create incremental backup
create_incremental_backup() {
    local env=$1
    local source_path=$2
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="incremental_backup_${env}_${timestamp}.zip"
    local backup_path="$BACKUP_BASE_DIR/$env/$backup_name"
    local last_full_file="$BACKUP_BASE_DIR/$env/last_full_backup.txt"
    
    print_status "Creating incremental backup for $env environment..."
    
    # Check if we have a last full backup
    if [[ ! -f "$last_full_file" ]]; then
        print_warning "No full backup found for $env. Creating full backup instead..."
        create_full_backup "$env" "$source_path"
        return $?
    fi
    
    # Create backup directory
    create_backup_dirs "$env"
    
    # Get last full backup timestamp
    local last_full_timestamp=$(cat "$last_full_file")
    
    # Create incremental backup using rsync
    local temp_dir="/tmp/incremental_${env}_${timestamp}"
    mkdir -p "$temp_dir"
    
    # Use rsync to get only changed files since last full backup
    if rsync -av --delete --exclude="node_modules" --exclude="logs" --exclude="temp" --exclude="*.log" \
        --link-dest="$BACKUP_BASE_DIR/$env/full_backup_${env}_${last_full_timestamp}" \
        "$source_path/" "$temp_dir/" >/dev/null 2>&1; then
        
        # Create zip from incremental files
        cd "$temp_dir"
        if zip -r "$backup_path" . >/dev/null 2>&1; then
            print_success "Incremental backup created: $backup_name"
            
            # Copy to NFS if enabled
            if [[ "$NFS_ENABLED" == "true" && -d "$NFS_MOUNT_POINT" ]]; then
                local nfs_backup_path="$NFS_MOUNT_POINT/$env/$backup_name"
                if cp "$backup_path" "$nfs_backup_path"; then
                    print_success "Backup copied to NFS: $nfs_backup_path"
                else
                    print_warning "Failed to copy backup to NFS"
                fi
            fi
            
            # Cleanup temp directory
            rm -rf "$temp_dir"
            return 0
        else
            print_error "Failed to create incremental backup zip for $env"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        print_error "Failed to create incremental backup for $env"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local env=$1
    local backup_dir="$BACKUP_BASE_DIR/$env"
    local nfs_backup_dir="$NFS_MOUNT_POINT/$env"
    
    print_status "Cleaning up old backups for $env environment..."
    
    # Remove backups older than retention period
    if [[ -d "$backup_dir" ]]; then
        find "$backup_dir" -name "*.zip" -type f -mtime +$RETENTION_DAYS -delete
        print_success "Cleaned up local backups for $env"
    fi
    
    # Clean up NFS backups if enabled
    if [[ "$NFS_ENABLED" == "true" && -d "$nfs_backup_dir" ]]; then
        find "$nfs_backup_dir" -name "*.zip" -type f -mtime +$RETENTION_DAYS -delete
        print_success "Cleaned up NFS backups for $env"
    fi
}

# Send email notification
send_notification() {
    local subject=$1
    local message=$2
    
    if [[ "$EMAIL_NOTIFICATIONS" == "true" && -n "$NOTIFICATION_EMAIL" ]]; then
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
        print_status "Email notification sent to $NOTIFICATION_EMAIL"
    fi
}

# Main backup function
run_backup() {
    local backup_type=$1
    
    print_status "Starting SDLC backup process (type: $backup_type)"
    
    # Load configuration
    load_config
    
    # Check if backup is enabled
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        print_warning "Backup is disabled in configuration"
        exit 0
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Check NFS mount
    check_nfs_mount
    
    # Backup both environments
    local prod_success=false
    local dev_success=false
    
    # Backup production
    if [[ "$backup_type" == "full" ]]; then
        if create_full_backup "prod" "$PROD_PATH"; then
            prod_success=true
        fi
    else
        if create_incremental_backup "prod" "$PROD_PATH"; then
            prod_success=true
        fi
    fi
    
    # Backup development
    if [[ "$backup_type" == "full" ]]; then
        if create_full_backup "dev" "$DEV_PATH"; then
            dev_success=true
        fi
    else
        if create_incremental_backup "dev" "$DEV_PATH"; then
            dev_success=true
        fi
    fi
    
    # Cleanup old backups
    cleanup_old_backups "prod"
    cleanup_old_backups "dev"
    
    # Send notifications
    if [[ "$prod_success" == "true" && "$dev_success" == "true" ]]; then
        print_success "SDLC backup completed successfully"
        send_notification "SDLC Backup Success" "Backup completed successfully for both prod and dev environments"
    else
        print_error "SDLC backup completed with errors"
        send_notification "SDLC Backup Error" "Backup completed with errors. Check logs for details."
    fi
}

# Show backup status
show_status() {
    print_status "SDLC Backup Status"
    echo "===================="
    
    load_config
    echo "Backup Enabled: $BACKUP_ENABLED"
    echo "NFS Enabled: $NFS_ENABLED"
    if [[ "$NFS_ENABLED" == "true" ]]; then
        echo "NFS Server: $NFS_SERVER_IP"
        echo "NFS Path: $NFS_REMOTE_PATH"
        echo "NFS Mounted: $(mount | grep -q "$NFS_MOUNT_POINT" && echo "Yes" || echo "No")"
    fi
    echo "Retention Days: $RETENTION_DAYS"
    echo ""
    
    # Show backup counts
    for env in "prod" "dev"; do
        local backup_dir="$BACKUP_BASE_DIR/$env"
        local nfs_backup_dir="$NFS_MOUNT_POINT/$env"
        
        echo "$env Environment:"
        if [[ -d "$backup_dir" ]]; then
            local full_count=$(find "$backup_dir" -name "full_backup_*.zip" | wc -l)
            local inc_count=$(find "$backup_dir" -name "incremental_backup_*.zip" | wc -l)
            echo "  Local backups: $full_count full, $inc_count incremental"
        else
            echo "  Local backups: No backup directory"
        fi
        
        if [[ "$NFS_ENABLED" == "true" && -d "$nfs_backup_dir" ]]; then
            local nfs_full_count=$(find "$nfs_backup_dir" -name "full_backup_*.zip" | wc -l)
            local nfs_inc_count=$(find "$nfs_backup_dir" -name "incremental_backup_*.zip" | wc -l)
            echo "  NFS backups: $nfs_full_count full, $nfs_inc_count incremental"
        fi
        echo ""
    done
}

# Show help
show_help() {
    echo "OrthodoxMetrics SDLC Backup Manager"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  full       - Create full backups for both prod and dev"
    echo "  incremental - Create incremental backups for both prod and dev"
    echo "  cleanup    - Clean up old backups"
    echo "  status     - Show backup status"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 full         - Create full backups"
    echo "  $0 incremental  - Create incremental backups"
    echo "  $0 status       - Show current status"
    echo ""
    echo "Configuration: $CONFIG_FILE"
    echo "Log file: $LOG_FILE"
}

# Main execution
case "${1:-}" in
    "full")
        check_root
        run_backup "full"
        ;;
    "incremental")
        check_root
        run_backup "incremental"
        ;;
    "cleanup")
        check_root
        load_config
        cleanup_old_backups "prod"
        cleanup_old_backups "dev"
        ;;
    "status")
        show_status
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Invalid command"
        show_help
        exit 1
        ;;
esac 