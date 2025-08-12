#!/bin/bash

# OrthodoxMetrics SDLC Backup Cron Setup Script
# Sets up automated backup scheduling for Sunday 3am full backups and incremental backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_SCRIPT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh"
CRON_USER="root"
CRON_FILE="/tmp/om-sdlc-backup-cron"
LOG_FILE="/var/log/om-sdlc-backup-cron.log"

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

# Check if backup script exists
check_backup_script() {
    if [[ ! -f "$BACKUP_SCRIPT" ]]; then
        print_error "SDLC backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    
    # Make backup script executable
    chmod +x "$BACKUP_SCRIPT"
    print_success "SDLC backup script permissions set"
}

# Create cron entries
create_cron_entries() {
    print_status "Creating SDLC cron entries..."
    
    # Full backup: Sundays at 3 AM (as requested)
    local full_cron="0 3 * * 0 $BACKUP_SCRIPT full >> $LOG_FILE 2>&1"
    
    # Incremental backup: Monday-Saturday at 3 AM
    local inc_cron="0 3 * * 1-6 $BACKUP_SCRIPT incremental >> $LOG_FILE 2>&1"
    
    # Cleanup old backups: Daily at 4 AM
    local cleanup_cron="0 4 * * * $BACKUP_SCRIPT cleanup >> $LOG_FILE 2>&1"
    
    # Create temporary cron file
    cat > "$CRON_FILE" << EOF
# OrthodoxMetrics SDLC Backup Schedule
# Full backup: Sundays at 3 AM
$full_cron

# Incremental backup: Monday-Saturday at 3 AM
$inc_cron

# Cleanup old backups: Daily at 4 AM
$cleanup_cron
EOF
    
    print_success "SDLC cron entries created"
}

# Install cron jobs
install_cron_jobs() {
    print_status "Installing SDLC cron jobs..."
    
    # Check if cron jobs already exist
    if crontab -u "$CRON_USER" -l 2>/dev/null | grep -q "sdlc-backup-manager"; then
        print_warning "SDLC cron jobs already exist. Removing old entries..."
        crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "sdlc-backup-manager" | crontab -u "$CRON_USER" -
    fi
    
    # Install new cron jobs
    crontab -u "$CRON_USER" "$CRON_FILE"
    
    print_success "SDLC cron jobs installed for user: $CRON_USER"
}

# Create log file
create_log_file() {
    print_status "Setting up log file..."
    
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    chown root:root "$LOG_FILE"
    
    print_success "Log file created: $LOG_FILE"
}

# Show current cron jobs
show_cron_jobs() {
    print_status "Current SDLC cron jobs for $CRON_USER:"
    echo ""
    crontab -u "$CRON_USER" -l 2>/dev/null | grep -E "(sdlc-backup-manager|OrthodoxMetrics)" || print_warning "No OrthodoxMetrics SDLC cron jobs found"
    echo ""
}

# Test backup script
test_backup_script() {
    print_status "Testing SDLC backup script..."
    
    if "$BACKUP_SCRIPT" help > /dev/null 2>&1; then
        print_success "SDLC backup script test passed"
    else
        print_error "SDLC backup script test failed"
        exit 1
    fi
}

# Create configuration file
create_config_file() {
    print_status "Creating SDLC backup configuration..."
    
    local config_dir="/etc/orthodoxmetrics"
    local config_file="$config_dir/sdlc-backup.conf"
    
    # Create config directory
    mkdir -p "$config_dir"
    chmod 700 "$config_dir"
    
    # Create default configuration
    cat > "$config_file" << 'EOF'
# OrthodoxMetrics SDLC Backup Configuration

# Enable/disable backup system
BACKUP_ENABLED=true

# NFS Configuration
NFS_ENABLED=false
NFS_SERVER_IP="192.168.1.230"
NFS_REMOTE_PATH="/nfs/backup"

# Backup Settings
RETENTION_DAYS=30
COMPRESSION=true

# Email Notifications
EMAIL_NOTIFICATIONS=false
NOTIFICATION_EMAIL=""

# Backup Paths (auto-detected)
PROD_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
DEV_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/dev"
EOF
    
    chmod 600 "$config_file"
    chown root:root "$config_file"
    
    print_success "Configuration file created: $config_file"
    print_warning "Please edit the configuration file to enable NFS and set your preferences"
}

# Install dependencies
install_dependencies() {
    print_status "Installing required dependencies..."
    
    # Check if zip is installed
    if ! command -v zip >/dev/null 2>&1; then
        print_status "Installing zip..."
        apt-get update && apt-get install -y zip
    fi
    
    # Check if rsync is installed
    if ! command -v rsync >/dev/null 2>&1; then
        print_status "Installing rsync..."
        apt-get update && apt-get install -y rsync
    fi
    
    # Check if nfs-common is installed (for NFS support)
    if ! command -v showmount >/dev/null 2>&1; then
        print_status "Installing nfs-common..."
        apt-get update && apt-get install -y nfs-common
    fi
    
    print_success "Dependencies installed"
}

# Create backup directories
create_backup_directories() {
    print_status "Creating backup directories..."
    
    local backup_base="/var/backups/orthodoxmetrics"
    
    # Create main backup directory
    mkdir -p "$backup_base"
    chmod 755 "$backup_base"
    
    # Create environment directories
    mkdir -p "$backup_base/prod"
    mkdir -p "$backup_base/dev"
    chmod 755 "$backup_base/prod"
    chmod 755 "$backup_base/dev"
    
    print_success "Backup directories created: $backup_base"
}

# Main execution
main() {
    print_status "Setting up OrthodoxMetrics SDLC Backup Cron Jobs"
    echo ""
    
    # Check if running as root
    check_root
    
    # Install dependencies
    install_dependencies
    
    # Create backup directories
    create_backup_directories
    
    # Check backup script
    check_backup_script
    
    # Test backup script
    test_backup_script
    
    # Create configuration
    create_config_file
    
    # Create cron entries
    create_cron_entries
    
    # Install cron jobs
    install_cron_jobs
    
    # Create log file
    create_log_file
    
    # Show current cron jobs
    show_cron_jobs
    
    print_success "SDLC cron setup completed successfully"
    echo ""
    print_status "SDLC Backup Schedule:"
    echo "  - Full backup: Sundays at 3:00 AM"
    echo "  - Incremental backup: Monday-Saturday at 3:00 AM"
    echo "  - Cleanup: Daily at 4:00 AM"
    echo ""
    print_status "Backup Targets:"
    echo "  - Production: /var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
    echo "  - Development: /var/www/orthodox-church-mgmt/orthodoxmetrics/dev"
    echo ""
    print_status "Log files:"
    echo "  - Backup logs: /var/log/om-sdlc-backup.log"
    echo "  - Cron logs: $LOG_FILE"
    echo ""
    print_status "Configuration:"
    echo "  - Config file: /etc/orthodoxmetrics/sdlc-backup.conf"
    echo "  - Backup directory: /var/backups/orthodoxmetrics/"
    echo ""
    print_status "Manual commands:"
    echo "  - Full backup: sudo $BACKUP_SCRIPT full"
    echo "  - Incremental backup: sudo $BACKUP_SCRIPT incremental"
    echo "  - Check status: sudo $BACKUP_SCRIPT status"
    echo ""
    print_warning "Next steps:"
    echo "  1. Edit /etc/orthodoxmetrics/sdlc-backup.conf to enable NFS"
    echo "  2. Configure NFS server settings if using NFS backup"
    echo "  3. Test manual backup: sudo $BACKUP_SCRIPT full"
    echo ""
    
    # Clean up temporary file
    rm -f "$CRON_FILE"
}

# Handle command line arguments
case "${1:-}" in
    "install"|"")
        main
        ;;
    "remove")
        print_status "Removing OrthodoxMetrics SDLC cron jobs..."
        crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "sdlc-backup-manager" | crontab -u "$CRON_USER" -
        print_success "SDLC cron jobs removed"
        ;;
    "show")
        show_cron_jobs
        ;;
    "test")
        check_root
        check_backup_script
        test_backup_script
        print_success "SDLC backup script test completed"
        ;;
    "config")
        check_root
        create_config_file
        ;;
    "help"|"-h"|"--help")
        echo "OrthodoxMetrics SDLC Backup Cron Setup Script"
        echo ""
        echo "Usage:"
        echo "  $0 install    - Install cron jobs (default)"
        echo "  $0 remove     - Remove cron jobs"
        echo "  $0 show       - Show current cron jobs"
        echo "  $0 test       - Test backup script"
        echo "  $0 config     - Create configuration file"
        echo "  $0 help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  sudo $0 install  - Set up automated SDLC backups"
        echo "  sudo $0 remove   - Remove automated SDLC backups"
        echo "  sudo $0 show     - Check current schedule"
        echo "  sudo $0 test     - Test backup script functionality"
        ;;
    *)
        print_error "Invalid command"
        echo "Usage: $0 [install|remove|show|test|config|help]"
        exit 1
        ;;
esac 