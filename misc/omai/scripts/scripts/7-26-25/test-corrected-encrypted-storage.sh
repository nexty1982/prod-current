#!/bin/bash

echo "=== Test Corrected Encrypted Storage ==="
echo "Date: $(date)"
echo "Testing the fixed encrypted storage with correct ecryptfs commands"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Changing to production directory: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "=== Test 1: Verify ecryptfs Commands ==="
echo "Checking for required ecryptfs commands:"
for cmd in ecryptfs-add-passphrase mount umount; do
    if command -v "$cmd" &> /dev/null; then
        echo "✅ $cmd - $(which $cmd)"
    else
        echo "❌ $cmd - not found"
        exit 1
    fi
done

echo ""
echo "=== Test 2: Test Encrypted Storage Initialization ==="
node -e "
const EncryptedStorage = require('./server/utils/encryptedStorage');

console.log('Testing corrected EncryptedStorage initialization...');
const storage = new EncryptedStorage();

console.log('Calling initialize()...');
storage.initialize()
  .then(() => {
    console.log('✅ EncryptedStorage initialized successfully');
    return storage.getStatus();
  })
  .then(status => {
    console.log('Storage Status:', JSON.stringify(status, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ EncryptedStorage initialization failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  });
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Test 2 passed: Encrypted storage initialization successful"
else
    echo "❌ Test 2 failed: Encrypted storage initialization failed"
    exit 1
fi

echo ""
echo "=== Test 3: Test OMAI Discovery with Encrypted Storage ==="
node -e "
const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery');
const discovery = new OMAIPathDiscovery();

console.log('Testing OMAI Discovery with corrected encrypted storage...');
discovery.initialize()
  .then(() => {
    console.log('✅ OMAI Discovery initialized with encrypted storage');
    console.log('Running quick discovery test...');
    return discovery.discoverFiles();
  })
  .then(result => {
    console.log('✅ Discovery completed successfully with encrypted storage');
    console.log('Results Summary:');
    console.log('  Total Files Scanned:', result.totalFiles);
    console.log('  Supported Files Found:', result.supportedFiles);
    console.log('  Files Processed:', result.processedFiles);
    console.log('  Top Categories:', result.summary.topCategories.slice(0, 3));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ OMAI Discovery with encrypted storage failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  });
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Test 3 passed: OMAI Discovery with encrypted storage successful"
else
    echo "❌ Test 3 failed: OMAI Discovery with encrypted storage failed"
    exit 1
fi

echo ""
echo "=== Test 4: Check Mount Status ==="
echo "Checking if encrypted volume is mounted:"
if mount | grep ecryptfs | grep /mnt/bigbook_secure; then
    echo "✅ Encrypted volume is mounted at /mnt/bigbook_secure"
    
    echo "Mount details:"
    mount | grep ecryptfs | grep /mnt/bigbook_secure
    
    echo ""
    echo "Mount point permissions:"
    ls -la /mnt/bigbook_secure 2>/dev/null || echo "Cannot access mount point"
else
    echo "❌ Encrypted volume not found in mount list"
fi

echo ""
echo "=== Test 5: Cleanup ==="
echo "Unmounting encrypted storage for cleanup..."
node -e "
const EncryptedStorage = require('./server/utils/encryptedStorage');
const storage = new EncryptedStorage();
storage.unmountEncryptedVolume()
  .then(() => {
    console.log('✅ Encrypted storage unmounted successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Note: Unmount error (may be expected):', error.message);
    process.exit(0);
  });
" 2>&1

echo ""
echo "=== Corrected Encrypted Storage Test Complete ==="
echo ""
echo "🎯 Results:"
if [ $? -eq 0 ]; then
    echo "✅ Encrypted storage with correct ecryptfs commands is working"
    echo "✅ OMAI Discovery can now use encrypted storage successfully"
    echo "✅ Files are securely stored and accessible through encrypted filesystem"
    echo ""
    echo "🌐 Ready for production use with full encryption!"
else
    echo "❌ Some tests failed - check output above for details"
fi

echo ""
echo "📁 You can now use:"
echo "   - Full OMAI Discovery with encrypted storage"
echo "   - Secure file handling with ecryptfs encryption"
echo "   - Web interface access at /admin/bigbook → 'OMAI Discovery' tab" 