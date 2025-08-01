#!/bin/bash

# OrthodoxMetrics SDLC Backup System - Complete Setup
# Installs automated backup system with Sunday 3am full backups and NFS integration

set -e

echo "🚀 OrthodoxMetrics SDLC Backup System Setup"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory (where server/ and front-end/ folders are located)"
    exit 1
fi

print_status "Current directory: $(pwd)"

# Step 1: Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# Step 2: Install system dependencies
print_status "Installing system dependencies..."

# Update package list
apt-get update

# Install required packages
PACKAGES=("zip" "rsync" "nfs-common" "cron" "mailutils")
for package in "${PACKAGES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $package "; then
        print_status "Installing $package..."
        apt-get install -y "$package"
    else
        print_success "$package is already installed"
    fi
done

# Step 3: Make backup scripts executable
print_status "Setting up backup scripts..."

BACKUP_SCRIPT="server/scripts/sdlc-backup-manager.sh"
CRON_SCRIPT="server/scripts/setup-sdlc-cron.sh"

if [ -f "$BACKUP_SCRIPT" ]; then
    chmod +x "$BACKUP_SCRIPT"
    print_success "Made $BACKUP_SCRIPT executable"
else
    print_error "Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

if [ -f "$CRON_SCRIPT" ]; then
    chmod +x "$CRON_SCRIPT"
    print_success "Made $CRON_SCRIPT executable"
else
    print_error "Cron setup script not found: $CRON_SCRIPT"
    exit 1
fi

# Step 4: Create backup directories
print_status "Creating backup directories..."

BACKUP_BASE="/var/backups/orthodoxmetrics"
mkdir -p "$BACKUP_BASE/prod"
mkdir -p "$BACKUP_BASE/dev"
chmod 755 "$BACKUP_BASE"
chmod 755 "$BACKUP_BASE/prod"
chmod 755 "$BACKUP_BASE/dev"

print_success "Backup directories created: $BACKUP_BASE"

# Step 5: Create configuration directory
print_status "Creating configuration directory..."

CONFIG_DIR="/etc/orthodoxmetrics"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

# Step 6: Create default configuration
print_status "Creating default configuration..."

cat > "$CONFIG_DIR/sdlc-backup.conf" << 'EOF'
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

chmod 600 "$CONFIG_DIR/sdlc-backup.conf"
chown root:root "$CONFIG_DIR/sdlc-backup.conf"

print_success "Configuration file created: $CONFIG_DIR/sdlc-backup.conf"

# Step 7: Create log files
print_status "Setting up log files..."

LOG_FILES=(
    "/var/log/om-sdlc-backup.log"
    "/var/log/om-sdlc-backup-cron.log"
)

for log_file in "${LOG_FILES[@]}"; do
    touch "$log_file"
    chmod 644 "$log_file"
    chown root:root "$log_file"
    print_success "Log file created: $log_file"
done

# Step 8: Test backup script
print_status "Testing backup script..."

if "$BACKUP_SCRIPT" help > /dev/null 2>&1; then
    print_success "Backup script test passed"
else
    print_error "Backup script test failed"
    exit 1
fi

# Step 9: Set up cron jobs
print_status "Setting up cron jobs..."

# Run the cron setup script
if "$CRON_SCRIPT" install; then
    print_success "Cron jobs installed successfully"
else
    print_error "Failed to install cron jobs"
    exit 1
fi

# Step 10: Create NFS mount point
print_status "Setting up NFS mount point..."

NFS_MOUNT="/mnt/orthodox-nfs-backup"
mkdir -p "$NFS_MOUNT"
chmod 755 "$NFS_MOUNT"

print_success "NFS mount point created: $NFS_MOUNT"

# Step 11: Create management scripts
print_status "Creating management scripts..."

# Create a quick status script
cat > "/usr/local/bin/om-backup-status" << 'EOF'
#!/bin/bash
# Quick status check for OrthodoxMetrics SDLC backups
/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh status
EOF

chmod +x "/usr/local/bin/om-backup-status"

# Create a quick backup script
cat > "/usr/local/bin/om-backup-now" << 'EOF'
#!/bin/bash
# Quick manual backup for OrthodoxMetrics SDLC
/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh full
EOF

chmod +x "/usr/local/bin/om-backup-now"

print_success "Management scripts created"

# Step 12: Create documentation
print_status "Creating documentation..."

cat > "$CONFIG_DIR/README-SDLC-BACKUP.md" << 'EOF'
# OrthodoxMetrics SDLC Backup System

## Overview
This system provides automated backups for both production and development environments with NFS integration.

## Schedule
- **Full Backups**: Sundays at 3:00 AM
- **Incremental Backups**: Monday-Saturday at 3:00 AM
- **Cleanup**: Daily at 4:00 AM

## Backup Targets
- Production: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod`
- Development: `/var/www/orthodox-church-mgmt/orthodoxmetrics/dev`

## Configuration
Edit `/etc/orthodoxmetrics/sdlc-backup.conf` to:
- Enable/disable NFS backup
- Set NFS server IP and path
- Configure retention period
- Enable email notifications

## Manual Commands
- Check status: `om-backup-status`
- Create full backup: `om-backup-now`
- Create incremental: `sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh incremental`
- Cleanup: `sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh cleanup`

## Log Files
- Backup logs: `/var/log/om-sdlc-backup.log`
- Cron logs: `/var/log/om-sdlc-backup-cron.log`

## NFS Setup
1. Edit `/etc/orthodoxmetrics/sdlc-backup.conf`
2. Set `NFS_ENABLED=true`
3. Set `NFS_SERVER_IP` and `NFS_REMOTE_PATH`
4. Test NFS connection in web interface
5. Restart backup system if needed

## Troubleshooting
- Check logs: `tail -f /var/log/om-sdlc-backup.log`
- Check cron: `crontab -l`
- Test NFS: `showmount -e <nfs-server-ip>`
- Manual test: `sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh full`
EOF

print_success "Documentation created: $CONFIG_DIR/README-SDLC-BACKUP.md"

# Step 13: Test the system
print_status "Testing the backup system..."

# Test configuration loading
if source "$CONFIG_DIR/sdlc-backup.conf" 2>/dev/null; then
    print_success "Configuration test passed"
else
    print_warning "Configuration test failed (this is normal for first run)"
fi

# Test backup script status
if "$BACKUP_SCRIPT" status > /dev/null 2>&1; then
    print_success "Backup script status test passed"
else
    print_warning "Backup script status test failed (this is normal for first run)"
fi

# Step 14: Display summary
echo ""
echo "============================================"
print_success "SDLC Backup System Setup Complete!"
echo "============================================"
echo ""
print_status "What was installed:"
echo "✅ System dependencies (zip, rsync, nfs-common, cron)"
echo "✅ Backup scripts and made them executable"
echo "✅ Backup directories: $BACKUP_BASE"
echo "✅ Configuration file: $CONFIG_DIR/sdlc-backup.conf"
echo "✅ Log files: /var/log/om-sdlc-backup*.log"
echo "✅ Cron jobs for automated backups"
echo "✅ NFS mount point: $NFS_MOUNT"
echo "✅ Management scripts: om-backup-status, om-backup-now"
echo "✅ Documentation: $CONFIG_DIR/README-SDLC-BACKUP.md"
echo ""
print_status "Backup Schedule:"
echo "🕒 Full backups: Sundays at 3:00 AM"
echo "🕒 Incremental backups: Monday-Saturday at 3:00 AM"
echo "🕒 Cleanup: Daily at 4:00 AM"
echo ""
print_status "Next Steps:"
echo "1. Edit $CONFIG_DIR/sdlc-backup.conf to enable NFS"
echo "2. Configure NFS server settings"
echo "3. Test manual backup: sudo $BACKUP_SCRIPT full"
echo "4. Check status: om-backup-status"
echo "5. Monitor logs: tail -f /var/log/om-sdlc-backup.log"
echo ""
print_status "Quick Commands:"
echo "📊 Check status: om-backup-status"
echo "💾 Manual backup: om-backup-now"
echo "📋 View logs: tail -f /var/log/om-sdlc-backup.log"
echo "⚙️  Edit config: nano $CONFIG_DIR/sdlc-backup.conf"
echo ""
print_warning "Important:"
echo "• First backup will be full (no incremental available yet)"
echo "• NFS backup is disabled by default - enable in configuration"
echo "• Monitor disk space in /var/backups/orthodoxmetrics/"
echo "• Test restore procedures in a safe environment"
echo ""
print_success "SDLC Backup System is ready! 🎉" 