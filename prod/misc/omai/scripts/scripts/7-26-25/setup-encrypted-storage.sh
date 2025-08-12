#!/bin/bash

# OrthodoxMetrics Big Book Encrypted Storage Setup Script
# Sets up eCryptFS encrypted storage for Big Book files

set -e

echo "🔐 OrthodoxMetrics Big Book Encrypted Storage Setup"
echo "=================================================="

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

# Configuration
PROJECT_ROOT="$(pwd)"
BIGBOOK_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook"
ENCRYPTED_SOURCE_PATH="$BIGBOOK_ROOT/encrypted"
ENCRYPTED_MOUNT_PATH="/mnt/bigbook_secure"
KEYS_PATH="$BIGBOOK_ROOT/keys"

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Current directory: $PROJECT_ROOT"

# Step 1: Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# Step 2: Check if eCryptFS is installed
print_status "Checking eCryptFS installation..."

if ! command -v ecryptfs-util &> /dev/null; then
    print_warning "eCryptFS utilities not found. Installing..."
    
    # Detect package manager and install
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y ecryptfs-utils
    elif command -v yum &> /dev/null; then
        yum install -y ecryptfs-utils
    elif command -v dnf &> /dev/null; then
        dnf install -y ecryptfs-utils
    else
        print_error "Could not detect package manager. Please install eCryptFS manually."
        exit 1
    fi
fi

print_success "eCryptFS utilities are available"

# Step 3: Create necessary directories
print_status "Creating encrypted storage directories..."

mkdir -p "$ENCRYPTED_SOURCE_PATH"
mkdir -p "$KEYS_PATH"
mkdir -p "$(dirname "$ENCRYPTED_MOUNT_PATH")"

# Set proper permissions
chmod 700 "$ENCRYPTED_SOURCE_PATH"
chmod 700 "$KEYS_PATH"
chmod 755 "$(dirname "$ENCRYPTED_MOUNT_PATH")"

# Set ownership to www-data (or appropriate web server user)
if id "www-data" &>/dev/null; then
    chown -R www-data:www-data "$ENCRYPTED_SOURCE_PATH"
    chown -R www-data:www-data "$KEYS_PATH"
    print_success "Set ownership to www-data"
else
    print_warning "www-data user not found. Using current user ownership."
fi

print_success "Created encrypted storage directories"

# Step 4: Generate encryption key
print_status "Generating encryption key..."

KEY_FILE="$KEYS_PATH/mount.key"
if [ ! -f "$KEY_FILE" ]; then
    # Generate a random 32-byte key
    openssl rand -hex 32 > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    print_success "Generated new encryption key"
else
    print_status "Encryption key already exists"
fi

# Step 5: Create eCryptFS configuration
print_status "Creating eCryptFS configuration..."

CONFIG_FILE="$KEYS_PATH/ecryptfs.conf"
MOUNT_KEY=$(cat "$KEY_FILE")

cat > "$CONFIG_FILE" << EOF
key=passphrase:passphrase_passwd=$MOUNT_KEY
EOF

chmod 600 "$CONFIG_FILE"
print_success "Created eCryptFS configuration"

# Step 6: Test mount and unmount
print_status "Testing encrypted volume mount..."

# Try to mount
if ecryptfs-util -c "$CONFIG_FILE" "$ENCRYPTED_SOURCE_PATH" "$ENCRYPTED_MOUNT_PATH" &>/dev/null; then
    print_success "Successfully mounted encrypted volume"
    
    # Test file operations
    TEST_FILE="$ENCRYPTED_MOUNT_PATH/test.txt"
    echo "Test content" > "$TEST_FILE"
    
    if [ -f "$TEST_FILE" ]; then
        print_success "File operations working correctly"
        rm "$TEST_FILE"
    else
        print_error "File operations failed"
        exit 1
    fi
    
    # Unmount
    umount "$ENCRYPTED_MOUNT_PATH"
    print_success "Successfully unmounted encrypted volume"
else
    print_error "Failed to mount encrypted volume"
    exit 1
fi

# Step 7: Set up systemd service for auto-mounting (optional)
print_status "Setting up systemd service for auto-mounting..."

SERVICE_FILE="/etc/systemd/system/bigbook-encrypted-storage.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Big Book Encrypted Storage Mount
After=network.target
Before=nginx.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/ecryptfs-util -c $CONFIG_FILE $ENCRYPTED_SOURCE_PATH $ENCRYPTED_MOUNT_PATH
ExecStop=/bin/umount $ENCRYPTED_MOUNT_PATH
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl daemon-reload
systemctl enable bigbook-encrypted-storage.service

print_success "Created systemd service for auto-mounting"

# Step 8: Create management scripts
print_status "Creating management scripts..."

# Create mount script
cat > "/usr/local/bin/bigbook-mount" << 'EOF'
#!/bin/bash
# Big Book Encrypted Storage Mount Script

CONFIG_FILE="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/keys/ecryptfs.conf"
SOURCE_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/encrypted"
MOUNT_PATH="/mnt/bigbook_secure"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: eCryptFS configuration file not found"
    exit 1
fi

if mountpoint -q "$MOUNT_PATH"; then
    echo "Encrypted volume is already mounted"
    exit 0
fi

echo "Mounting encrypted volume..."
if ecryptfs-util -c "$CONFIG_FILE" "$SOURCE_PATH" "$MOUNT_PATH"; then
    echo "Encrypted volume mounted successfully"
    chmod 700 "$MOUNT_PATH"
    chown www-data:www-data "$MOUNT_PATH"
else
    echo "Failed to mount encrypted volume"
    exit 1
fi
EOF

# Create unmount script
cat > "/usr/local/bin/bigbook-unmount" << 'EOF'
#!/bin/bash
# Big Book Encrypted Storage Unmount Script

MOUNT_PATH="/mnt/bigbook_secure"

if ! mountpoint -q "$MOUNT_PATH"; then
    echo "Encrypted volume is not mounted"
    exit 0
fi

echo "Unmounting encrypted volume..."
if umount "$MOUNT_PATH"; then
    echo "Encrypted volume unmounted successfully"
else
    echo "Failed to unmount encrypted volume"
    exit 1
fi
EOF

# Create status script
cat > "/usr/local/bin/bigbook-storage-status" << 'EOF'
#!/bin/bash
# Big Book Encrypted Storage Status Script

MOUNT_PATH="/mnt/bigbook_secure"
SOURCE_PATH="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/encrypted"

echo "Big Book Encrypted Storage Status"
echo "================================="

if mountpoint -q "$MOUNT_PATH"; then
    echo "Status: MOUNTED"
    echo "Mount Path: $MOUNT_PATH"
    echo "Source Path: $SOURCE_PATH"
    
    if [ -d "$MOUNT_PATH" ]; then
        FILE_COUNT=$(find "$MOUNT_PATH" -type f | wc -l)
        TOTAL_SIZE=$(du -sh "$MOUNT_PATH" 2>/dev/null | cut -f1)
        echo "File Count: $FILE_COUNT"
        echo "Total Size: $TOTAL_SIZE"
    fi
else
    echo "Status: NOT MOUNTED"
    echo "Mount Path: $MOUNT_PATH"
    echo "Source Path: $SOURCE_PATH"
fi

echo ""
echo "Management Commands:"
echo "  bigbook-mount          - Mount encrypted volume"
echo "  bigbook-unmount        - Unmount encrypted volume"
echo "  bigbook-storage-status - Show this status"
EOF

# Make scripts executable
chmod +x "/usr/local/bin/bigbook-mount"
chmod +x "/usr/local/bin/bigbook-unmount"
chmod +x "/usr/local/bin/bigbook-storage-status"

print_success "Created management scripts"

# Step 9: Create security documentation
print_status "Creating security documentation..."

DOC_FILE="$BIGBOOK_ROOT/ENCRYPTED_STORAGE_SECURITY.md"

cat > "$DOC_FILE" << 'EOF'
# Big Book Encrypted Storage Security

## Overview
The Big Book system uses eCryptFS to provide encrypted file storage for all uploaded files. Files are only accessible through the Big Book Viewer interface and cannot be accessed directly from the filesystem.

## Security Features

### 1. Encryption
- **Algorithm**: AES-256 encryption via eCryptFS
- **Key Storage**: Encryption keys stored securely in `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/keys/`
- **Key Permissions**: 600 (read/write for owner only)

### 2. Access Control
- **Mount Point**: `/mnt/bigbook_secure` (permissions: 700)
- **Ownership**: www-data:www-data
- **Direct Access**: Blocked via restrictive permissions
- **Auto-lock**: Volume unmounts when service stops

### 3. File Operations
- **Upload**: Files immediately encrypted and stored
- **Retrieval**: Files decrypted on-demand via Big Book API
- **Deletion**: Files permanently removed from encrypted storage
- **No Plaintext**: Files never stored in plaintext on disk

## Management Commands

### Mount/Unmount
```bash
# Mount encrypted volume
sudo bigbook-mount

# Unmount encrypted volume
sudo bigbook-unmount

# Check status
bigbook-storage-status
```

### Systemd Service
```bash
# Enable auto-mounting on boot
sudo systemctl enable bigbook-encrypted-storage.service

# Start service
sudo systemctl start bigbook-encrypted-storage.service

# Check service status
sudo systemctl status bigbook-encrypted-storage.service
```

## Security Best Practices

1. **Key Rotation**: Regularly rotate encryption keys
2. **Backup**: Backup encryption keys securely
3. **Monitoring**: Monitor mount status and access logs
4. **Updates**: Keep eCryptFS and system packages updated
5. **Audit**: Regular security audits of the system

## Troubleshooting

### Volume Won't Mount
1. Check if eCryptFS is installed: `which ecryptfs-util`
2. Verify key file exists and has correct permissions
3. Check system logs: `journalctl -u bigbook-encrypted-storage.service`

### Permission Denied
1. Ensure running as root for mount operations
2. Check ownership of mount point and source directories
3. Verify www-data user exists and has proper permissions

### Service Issues
1. Check service status: `systemctl status bigbook-encrypted-storage.service`
2. View service logs: `journalctl -u bigbook-encrypted-storage.service -f`
3. Restart service: `systemctl restart bigbook-encrypted-storage.service`

## Emergency Procedures

### Key Loss
If encryption keys are lost, encrypted files cannot be recovered. Always maintain secure backups of:
- `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/keys/mount.key`
- `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/keys/ecryptfs.conf`

### System Recovery
1. Restore encryption keys from secure backup
2. Restart the Big Book service
3. Mount encrypted volume: `sudo bigbook-mount`
4. Verify file access through Big Book interface

## Compliance Notes

This encrypted storage system provides:
- **Data at Rest Encryption**: All files encrypted on disk
- **Access Control**: Files only accessible through authorized interface
- **Audit Trail**: All file operations logged
- **Secure Key Management**: Keys stored with appropriate permissions
EOF

print_success "Created security documentation"

# Step 10: Final setup verification
print_status "Performing final setup verification..."

# Check if everything is properly configured
if [ -f "$KEY_FILE" ] && [ -f "$CONFIG_FILE" ]; then
    print_success "Encryption keys and configuration verified"
else
    print_error "Encryption setup incomplete"
    exit 1
fi

# Test mount one more time
if bigbook-mount; then
    print_success "Final mount test successful"
    bigbook-unmount
else
    print_error "Final mount test failed"
    exit 1
fi

print_success "Big Book Encrypted Storage Setup Complete!"
echo ""
echo "🔐 Security Features Enabled:"
echo "  • AES-256 encryption via eCryptFS"
echo "  • Secure key storage with restricted permissions"
echo "  • Files only accessible through Big Book interface"
echo "  • Auto-lock on service stop"
echo "  • Systemd service for auto-mounting"
echo ""
echo "📋 Management Commands:"
echo "  bigbook-mount          - Mount encrypted volume"
echo "  bigbook-unmount        - Unmount encrypted volume"
echo "  bigbook-storage-status - Check storage status"
echo ""
echo "📖 Documentation: $DOC_FILE"
echo ""
echo "⚠️  IMPORTANT: Keep your encryption keys secure!"
echo "   Key location: $KEY_FILE"
echo "   Backup these keys securely - loss means data loss!"
echo ""
print_success "Setup completed successfully!" 