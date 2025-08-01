#!/bin/bash

echo "=== Debug Mount Error ==="
echo "Date: $(date)"
echo "Testing ecryptfs mount commands to identify the specific issue"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Changing to production directory: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "=== Test 1: Check Current User and Permissions ==="
echo "Current user: $(whoami)"
echo "User ID: $(id)"
echo "Groups: $(groups)"

echo ""
echo "=== Test 2: Check Mount Requirements ==="
echo "Checking if ecryptfs module is loaded:"
lsmod | grep ecryptfs || echo "ecryptfs module not loaded"

echo ""
echo "Checking /proc/filesystems for ecryptfs support:"
grep ecryptfs /proc/filesystems || echo "ecryptfs not in /proc/filesystems"

echo ""
echo "=== Test 3: Test Manual ecryptfs Commands ==="

# Create test directories
SOURCE_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/encrypted"
MOUNT_DIR="/mnt/bigbook_secure"
KEY_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/keys"

echo "Creating directories:"
echo "Source: $SOURCE_DIR"
echo "Mount: $MOUNT_DIR"
echo "Keys: $KEY_DIR"

mkdir -p "$SOURCE_DIR" 2>&1 && echo "✅ Source directory created" || echo "❌ Failed to create source directory"
mkdir -p "$MOUNT_DIR" 2>&1 && echo "✅ Mount directory created" || echo "❌ Failed to create mount directory"
mkdir -p "$KEY_DIR" 2>&1 && echo "✅ Keys directory created" || echo "❌ Failed to create keys directory"

echo ""
echo "=== Test 4: Generate Test Key ==="
TEST_KEY="160146f45e39817b456b4984f633613517236fc1d017d3aa7f7d5b4b98f754b9"
echo "Using test key: $TEST_KEY"

echo ""
echo "=== Test 5: Try ecryptfs-add-passphrase ==="
echo "Adding passphrase to keyring..."
echo "$TEST_KEY" | ecryptfs-add-passphrase 2>&1 || echo "❌ Failed to add passphrase"

echo ""
echo "=== Test 6: Try Simple Mount Command ==="
echo "Attempting mount with detailed error output..."

# Try basic mount first
echo "Command: mount -t ecryptfs $SOURCE_DIR $MOUNT_DIR -o key=passphrase,ecryptfs_cipher=aes,ecryptfs_key_bytes=32,ecryptfs_passthrough=no,ecryptfs_enable_filename_crypto=yes"

mount -t ecryptfs "$SOURCE_DIR" "$MOUNT_DIR" -o "key=passphrase,ecryptfs_cipher=aes,ecryptfs_key_bytes=32,ecryptfs_passthrough=no,ecryptfs_enable_filename_crypto=yes" 2>&1 && {
    echo "✅ Basic mount successful"
    echo "Mount status:"
    mount | grep ecryptfs
    umount "$MOUNT_DIR" 2>&1
} || {
    echo "❌ Basic mount failed"
}

echo ""
echo "=== Test 7: Try Alternative Mount Options ==="
echo "Trying simplified mount options..."

mount -t ecryptfs "$SOURCE_DIR" "$MOUNT_DIR" -o "key=passphrase,ecryptfs_cipher=aes,ecryptfs_key_bytes=32" 2>&1 && {
    echo "✅ Simplified mount successful"
    mount | grep ecryptfs
    umount "$MOUNT_DIR" 2>&1
} || {
    echo "❌ Simplified mount failed"
}

echo ""
echo "=== Test 8: Try ecryptfs-setup-private ==="
echo "Testing ecryptfs-setup-private approach..."

# Check if we can use ecryptfs-setup-private
if command -v ecryptfs-setup-private &> /dev/null; then
    echo "ecryptfs-setup-private is available"
    echo "This might be a better approach for setting up encrypted directories"
else
    echo "ecryptfs-setup-private not available"
fi

echo ""
echo "=== Test 9: Check System Requirements ==="
echo "Checking dmesg for ecryptfs messages:"
dmesg | grep -i ecryptfs | tail -10 || echo "No ecryptfs messages in dmesg"

echo ""
echo "Checking if we need to load ecryptfs module:"
if ! lsmod | grep -q ecryptfs; then
    echo "Attempting to load ecryptfs module..."
    modprobe ecryptfs 2>&1 && echo "✅ ecryptfs module loaded" || echo "❌ Failed to load ecryptfs module"
else
    echo "✅ ecryptfs module already loaded"
fi

echo ""
echo "=== Test 10: Check Kernel Support ==="
echo "Kernel version: $(uname -r)"
echo "Checking for CONFIG_ECRYPT_FS in kernel config:"
if [ -f /boot/config-$(uname -r) ]; then
    grep CONFIG_ECRYPT_FS /boot/config-$(uname -r) || echo "CONFIG_ECRYPT_FS not found in kernel config"
else
    echo "Kernel config file not found"
fi

echo ""
echo "=== Debug Complete ==="
echo "This should help identify why ecryptfs mounting is failing."
echo "Common issues:"
echo "- ecryptfs kernel module not loaded"
echo "- Insufficient permissions (need root for mount)"
echo "- Kernel not compiled with ecryptfs support"
echo "- Wrong mount options or syntax" 