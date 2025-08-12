#!/bin/bash

echo "=== Debug Encrypted Storage Issues ==="
echo "Date: $(date)"
echo ""

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Changing to production directory: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo "=== Check 1: ecryptfs-utils Package ==="
dpkg -l | grep ecryptfs-utils || echo "❌ ecryptfs-utils package not found"
echo ""

echo "=== Check 2: Available ecryptfs Commands ==="
echo "Checking for ecryptfs commands:"
for cmd in ecryptfs-mount-private ecryptfs-umount-private ecryptfs-setup-private ecryptfs-add-passphrase; do
    if command -v "$cmd" &> /dev/null; then
        echo "✅ $cmd - $(which $cmd)"
    else
        echo "❌ $cmd - not found"
    fi
done
echo ""

echo "=== Check 3: Mount Points and Permissions ==="
echo "Checking mount point /mnt:"
ls -la /mnt/ 2>/dev/null || echo "❌ Cannot access /mnt directory"
echo ""

echo "Current user: $(whoami)"
echo "User ID: $(id)"
echo ""

echo "=== Check 4: Test Basic EncryptedStorage Initialization ==="
node -e "
const EncryptedStorage = require('./server/utils/encryptedStorage');

console.log('Testing EncryptedStorage initialization...');
const storage = new EncryptedStorage();

console.log('Calling initialize()...');
storage.initialize()
  .then(() => {
    console.log('✅ EncryptedStorage initialized successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ EncryptedStorage initialization failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  });
" 2>&1

echo ""
echo "=== Check 5: Directory Creation Test ==="
echo "Testing directory creation in bigbook path:"

BIGBOOK_ROOT="$PROD_ROOT/bigbook"
ENCRYPTED_DIR="$BIGBOOK_ROOT/encrypted"
KEYS_DIR="$BIGBOOK_ROOT/keys"

echo "Trying to create: $ENCRYPTED_DIR"
mkdir -p "$ENCRYPTED_DIR" 2>&1 && echo "✅ Created encrypted directory" || echo "❌ Failed to create encrypted directory"

echo "Trying to create: $KEYS_DIR"
mkdir -p "$KEYS_DIR" 2>&1 && echo "✅ Created keys directory" || echo "❌ Failed to create keys directory"

echo "Current permissions:"
ls -la "$BIGBOOK_ROOT/" 2>/dev/null || echo "❌ Cannot list bigbook directory"

echo ""
echo "=== Check 6: Manual Encrypted Storage Steps ==="
echo "Testing individual encrypted storage steps:"

node -e "
const EncryptedStorage = require('./server/utils/encryptedStorage');
const fs = require('fs').promises;
const path = require('path');

async function testSteps() {
  try {
    const storage = new EncryptedStorage();
    
    console.log('Step 1: Create directories...');
    await storage.ensureDirectories();
    console.log('✅ Directories created');
    
    console.log('Step 2: Generate encryption key...');
    await storage.generateEncryptionKey();
    console.log('✅ Encryption key generated');
    
    console.log('Step 3: Setup ecryptfs...');
    await storage.setupEcryptfs();
    console.log('✅ Ecryptfs setup completed');
    
    console.log('✅ All steps completed successfully');
  } catch (error) {
    console.error('❌ Step failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSteps();
" 2>&1

echo ""
echo "=== Debug Complete ==="
echo "This should help identify exactly where the encrypted storage setup is failing." 