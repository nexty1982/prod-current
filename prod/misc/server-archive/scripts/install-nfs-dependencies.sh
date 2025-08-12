#!/bin/bash

# OrthodoxMetrics NFS Backup Dependencies Installation Script
# This script installs and configures NFS client dependencies

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Install NFS client packages
install_nfs_packages() {
    print_status "Installing NFS client packages..."
    
    # Update package list
    apt-get update
    
    # Install NFS client packages
    apt-get install -y nfs-common nfs4-acl-tools
    
    print_success "NFS client packages installed"
}

# Create necessary directories
setup_directories() {
    print_status "Setting up NFS backup directories..."
    
    # Create mount point
    mkdir -p /mnt/orthodox-nfs-backup
    chmod 755 /mnt/orthodox-nfs-backup
    chown root:root /mnt/orthodox-nfs-backup
    
    # Create configuration directory
    mkdir -p /etc/orthodoxmetrics
    chmod 700 /etc/orthodoxmetrics
    chown root:root /etc/orthodoxmetrics
    
    # Create audit log directory
    mkdir -p /var/log/orthodoxmetrics
    chmod 755 /var/log/orthodoxmetrics
    chown root:root /var/log/orthodoxmetrics
    
    # Create audit log file
    touch /var/log/orthodoxmetrics/audit.log
    chmod 644 /var/log/orthodoxmetrics/audit.log
    chown root:root /var/log/orthodoxmetrics/audit.log
    
    print_success "NFS backup directories created"
}

# Test NFS functionality
test_nfs_functionality() {
    print_status "Testing NFS functionality..."
    
    # Check if NFS client is installed
    if ! command -v mount.nfs &> /dev/null; then
        print_error "NFS client not properly installed"
        return 1
    fi
    
    # Check if showmount is available
    if ! command -v showmount &> /dev/null; then
        print_error "showmount command not available"
        return 1
    fi
    
    print_success "NFS functionality test passed"
    return 0
}

# Create systemd service for NFS mount management (optional)
create_systemd_service() {
    print_status "Creating systemd service for NFS mount management..."
    
    cat > /etc/systemd/system/orthodoxmetrics-nfs.service << 'EOF'
[Unit]
Description=OrthodoxMetrics NFS Backup Mount Service
After=network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/true
ExecStop=/bin/true
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable orthodoxmetrics-nfs.service
    
    print_success "Systemd service created and enabled"
}

# Show installation summary
show_summary() {
    print_success "NFS Backup Dependencies Installation Complete!"
    echo ""
    echo "Installed components:"
    echo "  ✓ NFS client packages (nfs-common, nfs4-acl-tools)"
    echo "  ✓ Mount point: /mnt/orthodox-nfs-backup"
    echo "  ✓ Configuration directory: /etc/orthodoxmetrics"
    echo "  ✓ Audit log: /var/log/orthodoxmetrics/audit.log"
    echo "  ✓ Systemd service: orthodoxmetrics-nfs.service"
    echo ""
    echo "Next steps:"
    echo "  1. Configure your NFS server and exports"
    echo "  2. Access the NFS Remote Backup tab in Admin → Backup Settings"
    echo "  3. Enter your NFS server IP and remote path"
    echo "  4. Test the connection and mount the share"
    echo ""
    echo "Useful commands:"
    echo "  # Test NFS server connectivity"
    echo "  showmount -e <nfs-server-ip>"
    echo ""
    echo "  # Manual mount test"
    echo "  mount -t nfs <nfs-server-ip>:/path /mnt/orthodox-nfs-backup"
    echo ""
    echo "  # Check mount status"
    echo "  mount | grep nfs"
    echo ""
}

# Main installation function
main() {
    print_status "Starting NFS Backup Dependencies Installation..."
    
    check_root
    install_nfs_packages
    setup_directories
    test_nfs_functionality
    create_systemd_service
    show_summary
}

# Handle command line arguments
case "${1:-}" in
    "install"|"")
        main
        ;;
    "test")
        check_root
        test_nfs_functionality
        ;;
    "cleanup")
        check_root
        print_status "Cleaning up NFS backup directories..."
        umount /mnt/orthodox-nfs-backup 2>/dev/null || true
        rm -rf /mnt/orthodox-nfs-backup
        rm -f /etc/orthodoxmetrics/nfs-backup.conf
        systemctl disable orthodoxmetrics-nfs.service 2>/dev/null || true
        rm -f /etc/systemd/system/orthodoxmetrics-nfs.service
        systemctl daemon-reload
        print_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "OrthodoxMetrics NFS Backup Dependencies Installation Script"
        echo ""
        echo "Usage:"
        echo "  $0 install    - Install NFS dependencies (default)"
        echo "  $0 test       - Test NFS functionality"
        echo "  $0 cleanup    - Remove NFS backup components"
        echo "  $0 help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  sudo $0 install  - Install all dependencies"
        echo "  sudo $0 test     - Test NFS functionality"
        echo "  sudo $0 cleanup  - Remove NFS components"
        ;;
    *)
        print_error "Invalid command"
        echo "Usage: $0 [install|test|cleanup|help]"
        exit 1
        ;;
esac 