#!/bin/bash

# TSX Component Registry Management Fix Test Script
# Tests the fix for "p is not defined" error in Registry Management panel
# Latest fix: Moved RegistryManagementPanel to separate file to prevent scoping issues

echo "🧪 TSX Component Registry Management Fix Test"
echo "=============================================="
echo ""
echo "🔧 LATEST FIX APPLIED:"
echo "- Extracted RegistryManagementPanel from OMBigBook.tsx into separate file"
echo "- Created front-end/src/components/admin/RegistryManagementPanel.tsx"
echo "- Eliminates potential scoping/bundling issues that cause 'p is not defined'"
echo "- Component now properly isolated with explicit prop passing"
echo ""

# Server Status Check
echo "📡 Checking server status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Server is running on port 3001"
else
    echo "❌ Server is not responding on port 3001"
    echo "Please start the server first!"
    exit 1
fi

# Check registries endpoint (will show auth error for curl, which is expected)
echo ""
echo "📋 Testing registries endpoint (auth error expected for curl)..."
REGISTRIES_RESPONSE=$(curl -s http://localhost:3001/api/bigbook/registries)
if echo "$REGISTRIES_RESPONSE" | grep -q "Authentication required"; then
    echo "✅ Endpoint responding correctly (authentication required for unauthenticated requests)"
else
    echo "❌ Unexpected response from registries endpoint"
    echo "Response: $REGISTRIES_RESPONSE"
fi

# Create a test TSX component for registry testing
echo ""
echo "📄 Creating test TSX component..."
mkdir -p ./test-components
cat > ./test-components/RegistryTestComponent.tsx << 'EOF'
import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';

interface RegistryTestProps {
  title?: string;
  description?: string;
}

/**
 * A simple test component for registry testing
 * Tests component isolation fix
 */
const RegistryTestComponent: React.FC<RegistryTestProps> = ({
  title = "Registry Test",
  description = "Testing component registry display after isolation fix"
}) => {
  return (
    <Card sx={{ maxWidth: 400, margin: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {description}
        </Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }}>
          Test Button - Component Isolation Fix
        </Button>
      </CardContent>
    </Card>
  );
};

export default RegistryTestComponent;
EOF

echo "✅ Created RegistryTestComponent.tsx"

# Test parsing endpoint (will show auth error for curl, which is expected)
echo ""
echo "🔍 Testing TSX parsing endpoint (auth error expected for curl)..."
PARSE_RESPONSE=$(curl -s -X POST \
  -F "file=@./test-components/RegistryTestComponent.tsx" \
  http://localhost:3001/api/bigbook/parse-tsx-component)

if echo "$PARSE_RESPONSE" | grep -q "Authentication required"; then
    echo "✅ TSX parsing endpoint responding correctly (auth required)"
else
    echo "❌ Unexpected response from parsing endpoint"
    echo "Response: $PARSE_RESPONSE"
fi

echo ""
echo "🎯 MANUAL TESTING STEPS:"
echo "========================"
echo "1. Rebuild frontend: npm run build --legacy-peer-deps"
echo "2. Restart the server"
echo "3. Go to http://localhost:3001/admin/settings"
echo "4. Click 'OM Big Book' tab"
echo "5. Click 'Registry Management' tab"
echo "6. Install the test component (drag RegistryTestComponent.tsx)"
echo "7. Verify NO 'p is not defined' error occurs"
echo "8. Check that installed components display properly in registry table"

echo ""
echo "🔧 COMPONENT ISOLATION FIX DETAILS:"
echo "===================================="
echo "- RegistryManagementPanel extracted from nested component"
echo "- Now in: front-end/src/components/admin/RegistryManagementPanel.tsx"
echo "- Proper prop interface: RegistryManagementPanelProps"
echo "- Eliminates minification/bundling scope conflicts"
echo "- Each helper function now properly scoped within isolated component"

echo ""
echo "🚨 TROUBLESHOOTING:"
echo "==================="
echo "- If 'p is not defined' error STILL occurs:"
echo "  1. Clear browser cache completely"
echo "  2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)"
echo "  3. Check Network tab for 404s on RegistryManagementPanel"
echo "  4. Verify frontend build completed without errors"
echo "  5. Check browser console for import/module errors"

echo ""
echo "📋 Test component created at: ./test-components/RegistryTestComponent.tsx"
echo "🎯 Focus: Component isolation should eliminate the 'p is not defined' ReferenceError"
echo "🏁 Registry isolation fix test completed!" 