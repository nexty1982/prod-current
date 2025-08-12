#!/bin/bash

echo "=== Manual OMAI Discovery Test ==="
echo "Date: $(date)"
echo "This script will test OMAI discovery functionality without systemd"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Changing to production directory: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

# Test 1: Initialize OMAI Discovery
echo ""
echo "=== Test 1: Initializing OMAI Discovery ==="
node -e "
const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery');
const discovery = new OMAIPathDiscovery();

console.log('Initializing OMAI Path Discovery...');
discovery.initialize()
  .then(() => {
    console.log('✅ OMAI Path Discovery initialized successfully');
    return discovery.getStatus();
  })
  .then(status => {
    console.log('Status:', JSON.stringify(status, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Initialization failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Test 1 passed: OMAI Discovery initialization successful"
else
    echo "❌ Test 1 failed: OMAI Discovery initialization failed"
    exit 1
fi

# Test 2: Run Discovery Process
echo ""
echo "=== Test 2: Running File Discovery ==="
node -e "
const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery');
const discovery = new OMAIPathDiscovery();

console.log('Starting file discovery process...');
discovery.initialize()
  .then(() => {
    console.log('Running discovery...');
    return discovery.discoverFiles();
  })
  .then(result => {
    console.log('✅ Discovery completed successfully');
    console.log('Results:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Discovery failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Test 2 passed: File discovery completed successfully"
else
    echo "❌ Test 2 failed: File discovery failed"
    exit 1
fi

# Test 3: Check Generated Files
echo ""
echo "=== Test 3: Verifying Generated Files ==="

BIGBOOK_ROOT="$PROD_ROOT/bigbook"
INDEX_FILE="$BIGBOOK_ROOT/bigbook-index.json"
SUMMARY_FILE="$BIGBOOK_ROOT/discovery-summary.json"

if [ -f "$INDEX_FILE" ]; then
    echo "✅ Big Book index file created: $INDEX_FILE"
    file_count=$(jq -r '.totalFiles // 0' "$INDEX_FILE" 2>/dev/null || echo "0")
    echo "   Total files indexed: $file_count"
else
    echo "❌ Big Book index file not found: $INDEX_FILE"
fi

if [ -f "$SUMMARY_FILE" ]; then
    echo "✅ Discovery summary file created: $SUMMARY_FILE"
    total_files=$(jq -r '.totalFiles // 0' "$SUMMARY_FILE" 2>/dev/null || echo "0")
    echo "   Total files discovered: $total_files"
else
    echo "❌ Discovery summary file not found: $SUMMARY_FILE"
fi

# Check metadata directory
METADATA_DIR="$BIGBOOK_ROOT/metadata"
if [ -d "$METADATA_DIR" ]; then
    metadata_count=$(find "$METADATA_DIR" -name "*.json" | wc -l)
    echo "✅ Metadata directory exists with $metadata_count files"
else
    echo "❌ Metadata directory not found: $METADATA_DIR"
fi

# Check categories directory
CATEGORIES_DIR="$BIGBOOK_ROOT/categories"
if [ -d "$CATEGORIES_DIR" ]; then
    category_count=$(find "$CATEGORIES_DIR" -type d | wc -l)
    echo "✅ Categories directory exists with $category_count subdirectories"
else
    echo "❌ Categories directory not found: $CATEGORIES_DIR"
fi

echo ""
echo "=== Manual Test Complete ==="
echo ""
echo "🎯 Next Steps:"
echo "1. If all tests passed, the OMAI Discovery system is working correctly"
echo "2. The systemd service can be fixed and restarted"
echo "3. Access the Big Book Console at /admin/bigbook"
echo "4. Navigate to the 'OMAI Discovery' tab to use the web interface"
echo ""
echo "📁 Generated Files:"
echo "   Index: $INDEX_FILE"
echo "   Summary: $SUMMARY_FILE"
echo "   Metadata: $METADATA_DIR"
echo "   Categories: $CATEGORIES_DIR" 