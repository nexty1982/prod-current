#!/bin/bash

# NFS Test Debug Script
# This script helps debug the NFS connection test functionality

set -e

echo "🔧 NFS Test Debug Script"
echo "========================"

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

# Get NFS configuration from the config file
NFS_CONFIG_FILE="/etc/orthodoxmetrics/nfs-backup.conf"

if [ ! -f "$NFS_CONFIG_FILE" ]; then
    print_error "NFS configuration file not found: $NFS_CONFIG_FILE"
    print_status "Creating default configuration..."
    
    # Create directory if it doesn't exist
    sudo mkdir -p /etc/orthodoxmetrics
    
    # Create default config
    cat > /tmp/nfs-backup.conf << EOF
{
  "enabled": false,
  "nfsServerIP": "192.168.1.230",
  "remotePath": "/nfs/backup",
  "mountTarget": "/mnt/orthodox-nfs-backup",
  "persistMount": false
}
EOF
    
    sudo mv /tmp/nfs-backup.conf "$NFS_CONFIG_FILE"
    sudo chmod 600 "$NFS_CONFIG_FILE"
    print_success "Created default NFS configuration"
fi

# Read configuration
print_status "Reading NFS configuration..."
if [ -f "$NFS_CONFIG_FILE" ]; then
    NFS_SERVER_IP=$(grep -o '"nfsServerIP": *"[^"]*"' "$NFS_CONFIG_FILE" | cut -d'"' -f4)
    REMOTE_PATH=$(grep -o '"remotePath": *"[^"]*"' "$NFS_CONFIG_FILE" | cut -d'"' -f4)
    
    print_status "NFS Server IP: $NFS_SERVER_IP"
    print_status "Remote Path: $REMOTE_PATH"
else
    print_error "Could not read NFS configuration"
    exit 1
fi

# Test 1: Check if NFS client tools are installed
print_status "Testing NFS client tools..."
if command -v showmount >/dev/null 2>&1; then
    print_success "showmount command is available"
else
    print_error "showmount command not found"
    print_warning "You may need to install nfs-common: sudo apt-get install nfs-common"
fi

if command -v ping >/dev/null 2>&1; then
    print_success "ping command is available"
else
    print_error "ping command not found"
fi

# Test 2: Test network connectivity
print_status "Testing network connectivity to NFS server..."
if ping -c 1 -W 3 "$NFS_SERVER_IP" >/dev/null 2>&1; then
    print_success "NFS server is reachable (ping successful)"
else
    print_error "NFS server is not reachable (ping failed)"
    print_warning "Check network connectivity and firewall settings"
fi

# Test 3: Test NFS exports
print_status "Testing NFS exports..."
if command -v showmount >/dev/null 2>&1; then
    if showmount -e "$NFS_SERVER_IP" >/dev/null 2>&1; then
        print_success "NFS server exports are accessible"
        
        # Check if the specific path is exported
        EXPORTS=$(showmount -e "$NFS_SERVER_IP" 2>/dev/null)
        if echo "$EXPORTS" | grep -q "$REMOTE_PATH"; then
            print_success "Remote path '$REMOTE_PATH' is found in NFS exports"
        else
            print_error "Remote path '$REMOTE_PATH' is NOT found in NFS exports"
            print_status "Available exports:"
            echo "$EXPORTS" | sed 's/^/  /'
        fi
    else
        print_error "Cannot access NFS exports from server"
        print_warning "Check NFS server configuration and firewall settings"
    fi
else
    print_warning "Cannot test NFS exports (showmount not available)"
fi

# Test 4: Check mount point
MOUNT_POINT="/mnt/orthodox-nfs-backup"
print_status "Checking mount point..."
if [ -d "$MOUNT_POINT" ]; then
    print_success "Mount point directory exists"
    
    # Check if it's already mounted
    if mount | grep -q "$MOUNT_POINT"; then
        print_warning "Mount point is already mounted"
        mount | grep "$MOUNT_POINT"
    else
        print_status "Mount point is not currently mounted"
    fi
else
    print_warning "Mount point directory does not exist"
    print_status "It will be created automatically when needed"
fi

# Test 5: Test the actual API endpoint
print_status "Testing API endpoint..."
if curl -s http://localhost:3001/api/health >/dev/null; then
    print_success "Backend server is running"
    
    # Test the NFS test endpoint
    print_status "Testing NFS test endpoint..."
    RESPONSE=$(curl -s -X POST http://localhost:3001/api/admin/nfs-backup/test \
        -H "Content-Type: application/json" \
        -d "{\"nfsServerIP\":\"$NFS_SERVER_IP\",\"remotePath\":\"$REMOTE_PATH\"}")
    
    echo "API Response: $RESPONSE"
    
    # Parse the response
    if echo "$RESPONSE" | grep -q '"success":true'; then
        print_success "API test endpoint returned success"
    else
        print_error "API test endpoint returned failure"
    fi
else
    print_error "Backend server is not running"
fi

# Test 6: Check system logs
print_status "Checking system logs for NFS-related errors..."
if [ -f "/var/log/syslog" ]; then
    NFS_ERRORS=$(grep -i nfs /var/log/syslog | tail -5)
    if [ -n "$NFS_ERRORS" ]; then
        print_warning "Recent NFS errors in syslog:"
        echo "$NFS_ERRORS" | sed 's/^/  /'
    else
        print_success "No recent NFS errors found in syslog"
    fi
fi

# Test 7: Check if NFS dependencies are installed
print_status "Checking NFS dependencies..."
if dpkg -l | grep -q nfs-common; then
    print_success "nfs-common package is installed"
else
    print_error "nfs-common package is not installed"
    print_warning "Install with: sudo apt-get install nfs-common"
fi

echo ""
echo "========================================"
print_status "Debug summary:"
echo "1. Check if NFS server $NFS_SERVER_IP is reachable"
echo "2. Verify that $REMOTE_PATH is exported on the NFS server"
echo "3. Ensure nfs-common package is installed"
echo "4. Check firewall settings on both client and server"
echo "5. Verify NFS server configuration (/etc/exports)"
echo ""
print_status "To test manually:"
echo "  ping $NFS_SERVER_IP"
echo "  showmount -e $NFS_SERVER_IP"
echo "  sudo mount -t nfs $NFS_SERVER_IP:$REMOTE_PATH /mnt/test-mount"
echo ""
print_status "Common NFS server configuration (/etc/exports):"
echo "  $REMOTE_PATH *(rw,sync,no_subtree_check)"
echo "  # Then run: sudo exportfs -ra" 