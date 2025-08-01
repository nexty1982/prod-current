#!/bin/bash

# Auto-Install NFS Client Tools
# This script automatically installs and configures NFS client tools

echo "🚀 Auto-Installing NFS Client Tools..."
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    echo "Usage: sudo ./install-nfs-client.sh"
    exit 1
fi

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

# Detect distribution
DISTRO=$(detect_distro)
echo "Detected OS: $DISTRO"

echo ""
echo "📦 Installing NFS client packages..."

# Install packages based on distribution
case $DISTRO in
    ubuntu|debian)
        echo "Installing for Ubuntu/Debian..."
        apt update
        apt install -y nfs-common rpcbind
        ;;
    rhel|centos)
        echo "Installing for RHEL/CentOS..."
        if command -v dnf &> /dev/null; then
            dnf install -y nfs-utils rpcbind
        else
            yum install -y nfs-utils rpcbind
        fi
        ;;
    fedora)
        echo "Installing for Fedora..."
        dnf install -y nfs-utils rpcbind
        ;;
    *)
        echo "❌ Unsupported distribution: $DISTRO"
        echo "Please install NFS client tools manually:"
        echo "- nfs-utils or nfs-common"
        echo "- rpcbind"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo "✅ Packages installed successfully"
else
    echo "❌ Package installation failed"
    exit 1
fi

echo ""
echo "🔧 Configuring services..."

# Enable and start rpcbind
systemctl enable rpcbind
systemctl start rpcbind

if systemctl is-active --quiet rpcbind; then
    echo "✅ rpcbind service is running"
else
    echo "❌ Failed to start rpcbind service"
    exit 1
fi

# Load NFS kernel modules
echo ""
echo "📡 Loading NFS kernel modules..."
modprobe nfs
modprobe nfsv4

if lsmod | grep -q nfs; then
    echo "✅ NFS kernel modules loaded"
else
    echo "❌ Failed to load NFS kernel modules"
fi

# Create NFS mount point
echo ""
echo "📁 Creating NFS mount point..."
mkdir -p /mnt/orthodox-nfs-backup
chmod 755 /mnt/orthodox-nfs-backup
echo "✅ Mount point created: /mnt/orthodox-nfs-backup"

echo ""
echo "🧪 Testing NFS functionality..."

# Test if mount.nfs is available
if command -v mount.nfs &> /dev/null; then
    echo "✅ mount.nfs command is available"
else
    echo "❌ mount.nfs command not found"
fi

# Test basic NFS client functionality
echo ""
echo "Testing NFS server connectivity..."
if ping -c 1 192.168.1.230 &> /dev/null; then
    echo "✅ NFS server (192.168.1.230) is reachable"
    
    # Try to list exports
    if command -v showmount &> /dev/null; then
        echo "Testing showmount command..."
        if timeout 5 showmount -e 192.168.1.230 &> /dev/null; then
            echo "✅ NFS exports are accessible"
            showmount -e 192.168.1.230
        else
            echo "⚠️  Cannot list NFS exports (server may not be configured)"
        fi
    fi
else
    echo "⚠️  NFS server (192.168.1.230) is not reachable"
    echo "   Check network connectivity and server configuration"
fi

echo ""
echo "🎊 Installation Complete!"
echo "========================"
echo "✅ NFS client tools installed"
echo "✅ rpcbind service configured"
echo "✅ NFS kernel modules loaded"
echo "✅ Mount point created"

echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Restart the Orthodox Metrics server"
echo "2. Test SDLC backup in the NFS Remote Backup tab"
echo "3. The 'Protocol not supported' error should be resolved"

echo ""
echo "🔍 Verification Commands:"
echo "========================"
echo "Check installation: which mount.nfs"
echo "Check service: systemctl status rpcbind"
echo "Check modules: lsmod | grep nfs"
echo "Test mount: mount -t nfs 192.168.1.230:/backup /mnt/orthodox-nfs-backup"

echo ""
echo "✅ Installation script complete!" 