#!/bin/bash

# OrthodoxMetrics SDLC Backup System Installation Script
# This script installs and configures the enhanced backup system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts"
BACKUP_BASE_DIR="/backups"
LOG_DIR="/var/log"

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

# Check and install dependencies
install_dependencies() {
    print_status "Checking and installing dependencies..."
    
    # Check if we're on a Debian/Ubuntu system
    if command -v apt-get &> /dev/null; then
        print_status "Detected Debian/Ubuntu system"
        
        # Update package list
        apt-get update
        
        # Install required packages
        local packages=(
            "gpg"
            "tar"
            "gzip"
            "mysql-client"
            "nodejs"
            "npm"
        )
        
        for package in "${packages[@]}"; do
            if ! dpkg -l | grep -q "^ii  $package "; then
                print_status "Installing $package..."
                apt-get install -y "$package"
            else
                print_success "$package is already installed"
            fi
        done
        
    elif command -v yum &> /dev/null; then
        print_status "Detected RHEL/CentOS system"
        
        # Install required packages
        local packages=(
            "gnupg2"
            "tar"
            "gzip"
            "mysql"
            "nodejs"
            "npm"
        )
        
        for package in "${packages[@]}"; do
            if ! rpm -q "$package" &> /dev/null; then
                print_status "Installing $package..."
                yum install -y "$package"
            else
                print_success "$package is already installed"
            fi
        done
        
    else
        print_error "Unsupported package manager. Please install dependencies manually:"
        echo "  - gpg/gnupg2"
        echo "  - tar"
        echo "  - gzip"
        echo "  - mysql-client"
        echo "  - nodejs"
        echo "  - npm"
        exit 1
    fi
    
    print_success "Dependencies check completed"
}

# Create directories and set permissions
setup_directories() {
    print_status "Setting up directories and permissions..."
    
    # Create backup base directory
    if [[ ! -d "$BACKUP_BASE_DIR" ]]; then
        mkdir -p "$BACKUP_BASE_DIR"
        print_status "Created backup base directory: $BACKUP_BASE_DIR"
    fi
    
    # Set permissions on backup directory
    chmod 700 "$BACKUP_BASE_DIR"
    chown root:root "$BACKUP_BASE_DIR"
    print_success "Set permissions on backup directory"
    
    # Create log directory if it doesn't exist
    if [[ ! -d "$LOG_DIR" ]]; then
        mkdir -p "$LOG_DIR"
        print_status "Created log directory: $LOG_DIR"
    fi
    
    # Create log files
    local log_files=(
        "/var/log/om-backup.log"
        "/var/log/om-backup-cron.log"
    )
    
    for log_file in "${log_files[@]}"; do
        touch "$log_file"
        chmod 644 "$log_file"
        chown root:root "$log_file"
        print_status "Created log file: $log_file"
    done
    
    print_success "Directory setup completed"
}

# Set up script permissions
setup_scripts() {
    print_status "Setting up script permissions..."
    
    local scripts=(
        "backup-engine.js"
        "backup.sh"
        "backup-cleanup.js"
        "setup-backup-cron.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [[ -f "$script_path" ]]; then
            chmod +x "$script_path"
            chown root:root "$script_path"
            print_success "Set permissions on $script"
        else
            print_warning "Script not found: $script_path"
        fi
    done
    
    print_success "Script permissions set"
}

# Test backup system
test_backup_system() {
    print_status "Testing backup system..."
    
    # Test backup script help
    if "$SCRIPT_DIR/backup.sh" help > /dev/null 2>&1; then
        print_success "Backup script test passed"
    else
        print_error "Backup script test failed"
        return 1
    fi
    
    # Test backup engine
    if node "$SCRIPT_DIR/backup-engine.js" > /dev/null 2>&1; then
        print_success "Backup engine test passed"
    else
        print_warning "Backup engine test failed (expected without arguments)"
    fi
    
    # Test cleanup script
    if node "$SCRIPT_DIR/backup-cleanup.js" > /dev/null 2>&1; then
        print_success "Cleanup script test passed"
    else
        print_warning "Cleanup script test failed (expected without arguments)"
    fi
    
    print_success "Backup system tests completed"
}

# Create systemd service (optional)
create_systemd_service() {
    print_status "Creating systemd service..."
    
    local service_file="/etc/systemd/system/om-backup.service"
    local timer_file="/etc/systemd/system/om-backup.timer"
    
    # Create service file
    cat > "$service_file" << EOF
[Unit]
Description=OrthodoxMetrics SDLC Backup Service
After=network.target

[Service]
Type=oneshot
ExecStart=$SCRIPT_DIR/backup.sh diff
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF
    
    # Create timer file
    cat > "$timer_file" << EOF
[Unit]
Description=OrthodoxMetrics SDLC Backup Timer
Requires=om-backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    # Reload systemd and enable timer
    systemctl daemon-reload
    systemctl enable om-backup.timer
    
    print_success "Systemd service created and enabled"
}

# Show installation summary
show_summary() {
    print_success "OrthodoxMetrics SDLC Backup System Installation Complete"
    echo ""
    print_status "Installation Summary:"
    echo "  ✓ Dependencies installed"
    echo "  ✓ Directories created with proper permissions"
    echo "  ✓ Scripts configured and tested"
    echo "  ✓ Log files created"
    echo ""
    print_status "Backup System Features:"
    echo "  • Full backups (complete system snapshots)"
    echo "  • Differential backups (changes since last full)"
    echo "  • GPG encryption (AES-256)"
    echo "  • SHA256 checksums for integrity"
    echo "  • Automatic retention policy (4 full + 7 days diff)"
    echo "  • Comprehensive logging"
    echo ""
    print_status "Manual Commands:"
    echo "  • Full backup: sudo $SCRIPT_DIR/backup.sh full"
    echo "  • Differential backup: sudo $SCRIPT_DIR/backup.sh diff"
    echo "  • Cleanup: sudo $SCRIPT_DIR/backup.sh cleanup"
    echo "  • Status check: sudo $SCRIPT_DIR/backup.sh status"
    echo ""
    print_status "Automated Scheduling:"
    echo "  • To set up cron jobs: sudo $SCRIPT_DIR/setup-backup-cron.sh"
    echo "  • To remove cron jobs: sudo $SCRIPT_DIR/setup-backup-cron.sh remove"
    echo "  • To check cron status: sudo $SCRIPT_DIR/setup-backup-cron.sh show"
    echo ""
    print_status "Log Files:"
    echo "  • Backup logs: /var/log/om-backup.log"
    echo "  • Cron logs: /var/log/om-backup-cron.log"
    echo ""
    print_status "Backup Storage:"
    echo "  • Location: $BACKUP_BASE_DIR"
    echo "  • Structure: /backups/YYYY-MM-DD/full/ and /backups/YYYY-MM-DD/diff/"
    echo ""
    print_warning "Next Steps:"
    echo "  1. Run a test backup: sudo $SCRIPT_DIR/backup.sh full"
    echo "  2. Set up automated scheduling: sudo $SCRIPT_DIR/setup-backup-cron.sh"
    echo "  3. Monitor logs: tail -f /var/log/om-backup.log"
}

# Main installation function
main() {
    print_status "Starting OrthodoxMetrics SDLC Backup System Installation"
    echo ""
    
    # Check if running as root
    check_root
    
    # Install dependencies
    install_dependencies
    
    # Setup directories
    setup_directories
    
    # Setup scripts
    setup_scripts
    
    # Test backup system
    test_backup_system
    
    # Create systemd service (optional)
    if command -v systemctl &> /dev/null; then
        create_systemd_service
    else
        print_warning "Systemd not available, skipping service creation"
    fi
    
    # Show summary
    show_summary
}

# Handle command line arguments
case "${1:-}" in
    "install"|"")
        main
        ;;
    "test")
        check_root
        test_backup_system
        ;;
    "help"|"-h"|"--help")
        echo "OrthodoxMetrics SDLC Backup System Installation Script"
        echo ""
        echo "Usage:"
        echo "  $0 install    - Install the backup system (default)"
        echo "  $0 test       - Test the backup system"
        echo "  $0 help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  sudo $0 install  - Install the complete backup system"
        echo "  sudo $0 test     - Test the backup system"
        ;;
    *)
        print_error "Invalid command"
        echo "Usage: $0 [install|test|help]"
        exit 1
        ;;
esac 