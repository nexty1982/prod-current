#!/bin/bash

# Fix NFS Client Issue - Install and Configure NFS Tools
# This script fixes the "Protocol not supported" error for SDLC backups

echo "🔧 Fixing NFS Client Issue..."
echo "=============================="

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

# Function to check if a service is running
check_service() {
    if systemctl is-active --quiet "$1"; then
        echo "✅ $1 is running"
        return 0
    else
        echo "❌ $1 is not running"
        return 1
    fi
}

# Function to check if a package is installed
check_package() {
    local package="$1"
    local distro="$2"
    
    case $distro in
        ubuntu|debian)
            if dpkg -l | grep -q "^ii.*$package"; then
                echo "✅ $package is installed"
                return 0
            else
                echo "❌ $package is not installed"
                return 1
            fi
            ;;
        rhel|centos|fedora)
            if rpm -q "$package" &>/dev/null; then
                echo "✅ $package is installed"
                return 0
            else
                echo "❌ $package is not installed"
                return 1
            fi
            ;;
        *)
            echo "⚠️  Cannot check $package on unknown distribution"
            return 1
            ;;
    esac
}

echo ""
echo "🔍 System Diagnosis:"
echo "==================="

# Detect distribution
DISTRO=$(detect_distro)
echo "Detected OS: $DISTRO"

# Check current NFS mount capability
echo ""
echo "Testing current NFS mount capability..."
if command -v mount.nfs &> /dev/null; then
    echo "✅ mount.nfs command found"
else
    echo "❌ mount.nfs command not found"
fi

# Check if NFS kernel modules are loaded
echo ""
echo "Checking NFS kernel modules..."
if lsmod | grep -q nfs; then
    echo "✅ NFS kernel modules are loaded"
else
    echo "❌ NFS kernel modules are not loaded"
fi

# Check required services
echo ""
echo "Checking required services..."
check_service "rpcbind"

# Check required packages based on distribution
echo ""
echo "Checking required packages..."
case $DISTRO in
    ubuntu|debian)
        check_package "nfs-common" "$DISTRO"
        check_package "rpcbind" "$DISTRO"
        ;;
    rhel|centos|fedora)
        check_package "nfs-utils" "$DISTRO"
        check_package "rpcbind" "$DISTRO"
        ;;
    *)
        echo "⚠️  Unknown distribution, cannot check packages automatically"
        ;;
esac

echo ""
echo "🛠️  Installation and Fix Commands:"
echo "=================================="

# Provide installation commands based on distribution
case $DISTRO in
    ubuntu|debian)
        echo "For Ubuntu/Debian systems, run:"
        echo "sudo apt update"
        echo "sudo apt install -y nfs-common rpcbind"
        echo "sudo systemctl enable rpcbind"
        echo "sudo systemctl start rpcbind"
        echo "sudo modprobe nfs"
        ;;
    rhel|centos|fedora)
        echo "For RHEL/CentOS/Fedora systems, run:"
        echo "sudo yum install -y nfs-utils rpcbind"
        echo "# OR for newer systems:"
        echo "sudo dnf install -y nfs-utils rpcbind"
        echo "sudo systemctl enable rpcbind"
        echo "sudo systemctl start rpcbind"
        echo "sudo modprobe nfs"
        ;;
    *)
        echo "For your system, install the NFS client package:"
        echo "- NFS utilities package (nfs-utils or nfs-common)"
        echo "- RPC bind service (rpcbind)"
        ;;
esac

echo ""
echo "📋 Manual Verification Commands:"
echo "================================"
echo "After installation, verify with these commands:"
echo "1. Check mount.nfs: which mount.nfs"
echo "2. Check rpcbind: systemctl status rpcbind"
echo "3. Check NFS modules: lsmod | grep nfs"
echo "4. Test NFS mount: sudo mount -t nfs 192.168.1.230:/backup /tmp/test-mount"

echo ""
echo "🔗 Test NFS Server Connection:"
echo "=============================="
echo "Test if your NFS server is accessible:"
echo "ping 192.168.1.230"
echo "showmount -e 192.168.1.230"
echo "rpcinfo -p 192.168.1.230"

echo ""
echo "🎯 Expected Result After Fix:"
echo "============================="
echo "✅ mount.nfs command available"
echo "✅ rpcbind service running"
echo "✅ NFS kernel modules loaded"
echo "✅ SDLC backup mounting works without 'Protocol not supported' error"

echo ""
echo "⚠️  Security Note:"
echo "=================="
echo "Ensure your NFS server (192.168.1.230) is properly configured with:"
echo "- Proper export permissions for /backup"
echo "- Network firewall allowing NFS traffic (ports 111, 2049)"
echo "- NFS server service running"

echo ""
echo "✅ Diagnostic complete!"
echo ""
echo "📧 Next steps:"
echo "1. Run the installation commands for your OS above"
echo "2. Restart the Orthodox Metrics server"
echo "3. Test SDLC backup in NFS Remote Backup tab" 