#!/bin/bash

# OrthodoxMetrics SDLC Backup Cron Setup Script
# This script sets up automated backup scheduling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_SCRIPT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh"
CRON_USER="root"
CRON_FILE="/tmp/om-backup-cron"

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
        print_error "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    
    # Make backup script executable
    chmod +x "$BACKUP_SCRIPT"
    print_success "Backup script permissions set"
}

# Create cron entries
create_cron_entries() {
    print_status "Creating cron entries..."
    
    # Full backup: Sundays at 2 AM
    local full_cron="0 2 * * 0 $BACKUP_SCRIPT full >> /var/log/om-backup-cron.log 2>&1"
    
    # Differential backup: Monday-Saturday at 2 AM
    local diff_cron="0 2 * * 1-6 $BACKUP_SCRIPT diff >> /var/log/om-backup-cron.log 2>&1"
    
    # Create temporary cron file
    cat > "$CRON_FILE" << EOF
# OrthodoxMetrics SDLC Backup Schedule
# Full backup: Sundays at 2 AM
$full_cron

# Differential backup: Monday-Saturday at 2 AM
$diff_cron

# Cleanup old backups: Daily at 3 AM (keep 4 full + 7 differential)
0 3 * * * $BACKUP_SCRIPT cleanup >> /var/log/om-backup-cron.log 2>&1
EOF
    
    print_success "Cron entries created"
}

# Install cron jobs
install_cron_jobs() {
    print_status "Installing cron jobs..."
    
    # Check if cron jobs already exist
    if crontab -u "$CRON_USER" -l 2>/dev/null | grep -q "om-backup"; then
        print_warning "Cron jobs already exist. Removing old entries..."
        crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "om-backup" | crontab -u "$CRON_USER" -
    fi
    
    # Install new cron jobs
    crontab -u "$CRON_USER" "$CRON_FILE"
    
    print_success "Cron jobs installed for user: $CRON_USER"
}

# Create log file
create_log_file() {
    print_status "Setting up log file..."
    
    local log_file="/var/log/om-backup-cron.log"
    touch "$log_file"
    chmod 644 "$log_file"
    chown root:root "$log_file"
    
    print_success "Log file created: $log_file"
}

# Show current cron jobs
show_cron_jobs() {
    print_status "Current cron jobs for $CRON_USER:"
    echo ""
    crontab -u "$CRON_USER" -l 2>/dev/null | grep -E "(om-backup|OrthodoxMetrics)" || print_warning "No OrthodoxMetrics cron jobs found"
    echo ""
}

# Test backup script
test_backup_script() {
    print_status "Testing backup script..."
    
    if "$BACKUP_SCRIPT" help > /dev/null 2>&1; then
        print_success "Backup script test passed"
    else
        print_error "Backup script test failed"
        exit 1
    fi
}

# Main execution
main() {
    print_status "Setting up OrthodoxMetrics SDLC Backup Cron Jobs"
    echo ""
    
    # Check if running as root
    check_root
    
    # Check backup script
    check_backup_script
    
    # Test backup script
    test_backup_script
    
    # Create cron entries
    create_cron_entries
    
    # Install cron jobs
    install_cron_jobs
    
    # Create log file
    create_log_file
    
    # Show current cron jobs
    show_cron_jobs
    
    print_success "Cron setup completed successfully"
    echo ""
    print_status "Backup Schedule:"
    echo "  - Full backup: Sundays at 2:00 AM"
    echo "  - Differential backup: Monday-Saturday at 2:00 AM"
    echo "  - Cleanup: Daily at 3:00 AM"
    echo ""
    print_status "Log files:"
    echo "  - Backup logs: /var/log/om-backup.log"
    echo "  - Cron logs: /var/log/om-backup-cron.log"
    echo ""
    print_status "Manual commands:"
    echo "  - Full backup: sudo $BACKUP_SCRIPT full"
    echo "  - Differential backup: sudo $BACKUP_SCRIPT diff"
    echo "  - Check status: sudo $BACKUP_SCRIPT status"
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
        print_status "Removing OrthodoxMetrics cron jobs..."
        crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "om-backup" | crontab -u "$CRON_USER" -
        print_success "Cron jobs removed"
        ;;
    "show")
        show_cron_jobs
        ;;
    "help"|"-h"|"--help")
        echo "OrthodoxMetrics SDLC Backup Cron Setup Script"
        echo ""
        echo "Usage:"
        echo "  $0 install    - Install cron jobs (default)"
        echo "  $0 remove     - Remove cron jobs"
        echo "  $0 show       - Show current cron jobs"
        echo "  $0 help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  sudo $0 install  - Set up automated backups"
        echo "  sudo $0 remove   - Remove automated backups"
        echo "  sudo $0 show     - Check current schedule"
        ;;
    *)
        print_error "Invalid command"
        echo "Usage: $0 [install|remove|show|help]"
        exit 1
        ;;
esac 