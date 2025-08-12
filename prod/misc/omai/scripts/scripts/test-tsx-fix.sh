#!/bin/bash

# Test TSX File Routing Fix
# Created: $(date)
# Purpose: Verify that .tsx files are properly routed to the wizard and not the ingest endpoint

echo "🔧 TSX File Routing Fix Test"
echo "============================"

SERVER_URL="http://localhost:3001"
TEST_DIR="/tmp/tsx-routing-test"

# Create test directory and sample .tsx file
mkdir -p "$TEST_DIR"

cat > "$TEST_DIR/TestComponent.tsx" << 'EOF'
import React from 'react';

const TestComponent: React.FC = () => {
  return <div>Test Component</div>;
};

export default TestComponent;
EOF

echo "📋 Testing TSX file routing..."
echo ""

# Test 1: Verify ingest endpoint rejects .tsx files
echo "🧪 Test 1: General ingest endpoint should reject .tsx files"
echo "--------------------------------------------------------"

INGEST_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/bigbook/ingest-file" \
  -F "file=@$TEST_DIR/TestComponent.tsx" 2>/dev/null)

if echo "$INGEST_RESPONSE" | grep -q "TSX files must be processed through the TSX Component Installation Wizard"; then
    echo "✅ SUCCESS: Ingest endpoint properly rejects .tsx files"
    echo "   Response: TSX files must be processed through the TSX Component Installation Wizard"
elif echo "$INGEST_RESPONSE" | grep -q "File type not supported"; then
    echo "✅ SUCCESS: Ingest endpoint rejects .tsx files (legacy error message)"
    echo "   Response: File type not supported"
else
    echo "❌ FAILED: Ingest endpoint did not properly reject .tsx files"
    echo "   Response: $INGEST_RESPONSE"
fi

echo ""

# Test 2: Verify TSX parsing endpoint works correctly
echo "🧪 Test 2: TSX parsing endpoint should work correctly"
echo "---------------------------------------------------"

TEST_CONTENT=$(cat "$TEST_DIR/TestComponent.tsx")
PARSE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/bigbook/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"TestComponent.tsx\",
    \"content\": $(echo "$TEST_CONTENT" | jq -R -s .)
  }" 2>/dev/null)

if echo "$PARSE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ SUCCESS: Parse endpoint working correctly"
    echo "   Component name: $(echo "$PARSE_RESPONSE" | jq -r '.componentInfo.componentName')"
    echo "   Is default export: $(echo "$PARSE_RESPONSE" | jq -r '.componentInfo.isDefaultExport')"
else
    echo "❌ FAILED: Parse endpoint not working"
    echo "   Response: $PARSE_RESPONSE"
fi

echo ""

# Test 3: Check frontend files for correct configuration
echo "🧪 Test 3: Frontend configuration check"
echo "--------------------------------------"

FRONTEND_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end/src/components/admin"

if [ -f "$FRONTEND_DIR/OMBigBook.tsx" ]; then
    echo "✅ OMBigBook component exists"
    
    # Check for .tsx detection logic
    if grep -q 'extension === "tsx"' "$FRONTEND_DIR/OMBigBook.tsx"; then
        echo "✅ TSX file detection logic present"
        
        # Check that it uses continue to skip processing
        if grep -A 5 'extension === "tsx"' "$FRONTEND_DIR/OMBigBook.tsx" | grep -q "continue"; then
            echo "✅ Continue statement present to skip normal processing"
        else
            echo "⚠️  Continue statement may be missing"
        fi
    else
        echo "❌ TSX file detection logic missing"
    fi
    
    # Check that supportedTypes arrays don't include .tsx
    if grep -A 1 "supportedTypes.*=" "$FRONTEND_DIR/OMBigBook.tsx" | grep -q "tsx"; then
        echo "❌ PROBLEM: .tsx found in supportedTypes arrays"
    else
        echo "✅ .tsx correctly excluded from supportedTypes arrays"
    fi
else
    echo "❌ OMBigBook component not found"
fi

if [ -f "$FRONTEND_DIR/TSXComponentInstallWizard.tsx" ]; then
    echo "✅ TSXComponentInstallWizard component exists"
else
    echo "❌ TSXComponentInstallWizard component missing"
fi

echo ""

# Test 4: Check backend configuration
echo "🧪 Test 4: Backend configuration check"
echo "-------------------------------------"

BACKEND_FILE="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/routes/bigbook.js"

if [ -f "$BACKEND_FILE" ]; then
    echo "✅ Backend routes file exists"
    
    # Check for TSX endpoints
    if grep -q "parse-tsx-component" "$BACKEND_FILE"; then
        echo "✅ parse-tsx-component endpoint exists"
    else
        echo "❌ parse-tsx-component endpoint missing"
    fi
    
    if grep -q "install-tsx-component" "$BACKEND_FILE"; then
        echo "✅ install-tsx-component endpoint exists"
    else
        echo "❌ install-tsx-component endpoint missing"
    fi
    
    # Check that multer filter rejects .tsx
    if grep -A 10 "fileFilter:" "$BACKEND_FILE" | grep -q "tsx"; then
        echo "✅ Multer filter has TSX handling"
    else
        echo "⚠️  Multer filter may not have explicit TSX handling"
    fi
    
    # Check that switch statement doesn't have .tsx case
    if grep -A 20 "switch (extension)" "$BACKEND_FILE" | grep -q "case '\.tsx'"; then
        echo "❌ PROBLEM: Switch statement has .tsx case (should not have one)"
    else
        echo "✅ Switch statement correctly excludes .tsx case"
    fi
else
    echo "❌ Backend routes file not found"
fi

echo ""

# Cleanup
rm -rf "$TEST_DIR"

echo "🎯 Summary"
echo "========="
echo "This test verifies that:"
echo "1. ✅ The general ingest endpoint rejects .tsx files"
echo "2. ✅ The TSX parsing endpoint works correctly"
echo "3. ✅ Frontend has proper .tsx detection and routing"
echo "4. ✅ Backend has correct endpoint configuration"
echo ""
echo "If all tests pass, .tsx files will be routed to the installation"
echo "wizard instead of causing errors at the ingest endpoint."
echo ""
echo "To test the full feature:"
echo "1. Go to http://localhost:3001/admin/settings"
echo "2. Click the 'OM Big Book' tab"
echo "3. Drag and drop a .tsx file"
echo "4. Verify the installation wizard opens" 