#!/bin/bash

# OrthodoxMetrics SDLC Backup Script
# Usage: sudo ./backup.sh [full|diff]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_ENGINE="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup-engine.js"
LOG_FILE="/var/log/om-backup.log"
BACKUP_BASE_DIR="/backups"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check if backup type is valid
check_backup_type() {
    local backup_type=$1
    if [[ -z "$backup_type" ]]; then
        print_error "Backup type not specified"
        echo "Usage: $0 [full|diff]"
        exit 1
    fi
    
    if [[ "$backup_type" != "full" && "$backup_type" != "diff" ]]; then
        print_error "Invalid backup type: $backup_type"
        echo "Usage: $0 [full|diff]"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if backup engine exists
    if [[ ! -f "$BACKUP_ENGINE" ]]; then
        print_error "Backup engine not found: $BACKUP_ENGINE"
        exit 1
    fi
    
    # Check if required tools are available
    local required_tools=("tar" "gzip" "gpg" "sha256sum" "mysqldump")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check if backup directory exists and is writable
    if [[ ! -d "$BACKUP_BASE_DIR" ]]; then
        print_status "Creating backup base directory..."
        mkdir -p "$BACKUP_BASE_DIR"
        chmod 700 "$BACKUP_BASE_DIR"
        chown root:root "$BACKUP_BASE_DIR"
    fi
    
    # Check if log directory exists
    local log_dir=$(dirname "$LOG_FILE")
    if [[ ! -d "$log_dir" ]]; then
        print_status "Creating log directory..."
        mkdir -p "$log_dir"
        chmod 755 "$log_dir"
    fi
    
    print_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    local backup_type=$1
    
    print_status "Starting $backup_type backup..."
    
    # Execute backup engine
    if node "$BACKUP_ENGINE" "$backup_type"; then
        print_success "$backup_type backup completed successfully"
        return 0
    else
        print_error "$backup_type backup failed"
        return 1
    fi
}

# Show backup status
show_status() {
    print_status "Backup status:"
    
    if [[ -f "$LOG_FILE" ]]; then
        echo "Recent log entries:"
        tail -n 20 "$LOG_FILE" | while IFS= read -r line; do
            if [[ $line == *"[ERROR]"* ]]; then
                echo -e "${RED}$line${NC}"
            elif [[ $line == *"[WARNING]"* ]]; then
                echo -e "${YELLOW}$line${NC}"
            elif [[ $line == *"[INFO]"* ]]; then
                echo -e "${BLUE}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        print_warning "No log file found"
    fi
    
    echo ""
    print_status "Backup directory structure:"
    if [[ -d "$BACKUP_BASE_DIR" ]]; then
        find "$BACKUP_BASE_DIR" -type f -name "*.gpg" -exec ls -lh {} \; 2>/dev/null || print_warning "No backup files found"
    else
        print_warning "Backup directory not found"
    fi
}

# Main execution
main() {
    local backup_type=$1
    
    # Check if running as root
    check_root
    
    # Check backup type
    check_backup_type "$backup_type"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    if create_backup "$backup_type"; then
        print_success "Backup process completed"
        show_status
        exit 0
    else
        print_error "Backup process failed"
        show_status
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "full"|"diff")
        main "$1"
        ;;
    "cleanup")
        check_root
        print_status "Running backup cleanup..."
        if node "$(dirname "$BACKUP_ENGINE")/backup-cleanup.js"; then
            print_success "Cleanup completed successfully"
            exit 0
        else
            print_error "Cleanup failed"
            exit 1
        fi
        ;;
    "status")
        check_root
        show_status
        ;;
    "help"|"-h"|"--help")
        echo "OrthodoxMetrics SDLC Backup Script"
        echo ""
        echo "Usage:"
        echo "  $0 full          - Create a full backup"
        echo "  $0 diff          - Create a differential backup"
        echo "  $0 cleanup       - Clean up old backups (retention policy)"
        echo "  $0 status        - Show backup status and recent logs"
        echo "  $0 help          - Show this help message"
        echo ""
        echo "Examples:"
        echo "  sudo $0 full     - Create full backup"
        echo "  sudo $0 diff     - Create differential backup"
        echo "  sudo $0 cleanup  - Clean up old backups"
        echo "  sudo $0 status   - Check backup status"
        ;;
    *)
        print_error "Invalid command"
        echo "Usage: $0 [full|diff|cleanup|status|help]"
        exit 1
        ;;
esac 