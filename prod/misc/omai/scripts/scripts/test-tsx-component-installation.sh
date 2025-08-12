#!/bin/bash

# Test TSX Component Installation Feature
# Created: $(date)
# Purpose: Comprehensive testing of the drag-and-drop TSX component installation system

echo "🧪 TSX Component Installation Feature Test"
echo "=========================================="

# Configuration
SERVER_URL="http://localhost:3001"
BASE_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
FRONT_END_DIR="$BASE_DIR/front-end"
TEST_DIR="$BASE_DIR/tests/tsx-components"

echo "📋 Test Configuration:"
echo "   Server URL: $SERVER_URL"
echo "   Base Directory: $BASE_DIR"
echo "   Test Directory: $TEST_DIR"
echo ""

# Create test directory
mkdir -p "$TEST_DIR"

echo "🔧 Step 1: Server Status Check"
echo "-----------------------------"
if curl -s "$SERVER_URL/api/health" > /dev/null 2>&1; then
    echo "✅ Server is running on port 3001"
else
    echo "❌ Server is not running on port 3001"
    echo "Please start the Orthodox Metrics server first"
    exit 1
fi

echo ""
echo "🧩 Step 2: Create Sample TSX Components"
echo "--------------------------------------"

# Create a simple React component for testing
cat > "$TEST_DIR/TestButton.tsx" << 'EOF'
import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface TestButtonProps extends ButtonProps {
  label?: string;
  variant?: 'contained' | 'outlined' | 'text';
}

const TestButton: React.FC<TestButtonProps> = ({ 
  label = 'Test Button', 
  variant = 'contained',
  ...props 
}) => {
  return (
    <Button variant={variant} {...props}>
      {label}
    </Button>
  );
};

export default TestButton;
EOF

# Create a more complex component with external dependencies
cat > "$TEST_DIR/AdvancedCard.tsx" << 'EOF'
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box
} from '@mui/material';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles';

interface AdvancedCardProps {
  title: string;
  description?: string;
  tags?: string[];
  onAction?: () => void;
}

const AdvancedCard: React.FC<AdvancedCardProps> = ({
  title,
  description,
  tags = [],
  onAction
}) => {
  const [lastClicked, setLastClicked] = useState<Date | null>(null);
  const theme = useTheme();

  const handleAction = () => {
    setLastClicked(new Date());
    onAction?.();
  };

  return (
    <Card sx={{ maxWidth: 345, m: 2 }}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
        {tags.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {tags.map((tag, index) => (
              <Chip key={index} label={tag} size="small" sx={{ mr: 1, mb: 1 }} />
            ))}
          </Box>
        )}
        {lastClicked && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Last clicked: {format(lastClicked, 'PPpp')}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={handleAction}>
          Action
        </Button>
      </CardActions>
    </Card>
  );
};

export default AdvancedCard;
EOF

# Create an invalid TSX file for testing validation
cat > "$TEST_DIR/InvalidComponent.tsx" << 'EOF'
import React from 'react';

// This component has syntax errors for testing validation
const InvalidComponent: React.FC = () => {
  return (
    <div>
      <h1>Invalid Component</h1>
      <p>This component has intentional syntax errors
      // Missing closing tag for paragraph
    </div>
  );
};

export default InvalidComponent;
EOF

echo "✅ Created sample TSX components:"
echo "   - TestButton.tsx (simple component)"
echo "   - AdvancedCard.tsx (complex component with external deps)"
echo "   - InvalidComponent.tsx (invalid syntax for testing)"

echo ""
echo "🔍 Step 3: Test Backend API Endpoints"
echo "------------------------------------"

# Test TSX parsing endpoint
echo "Testing /api/bigbook/parse-tsx-component endpoint..."

# Read the TestButton component content
TEST_BUTTON_CONTENT=$(cat "$TEST_DIR/TestButton.tsx")

# Test parsing endpoint
PARSE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/bigbook/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"TestButton.tsx\",
    \"content\": $(echo "$TEST_BUTTON_CONTENT" | jq -R -s .)
  }" 2>/dev/null)

if echo "$PARSE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Parse endpoint working correctly"
    echo "   Component name: $(echo "$PARSE_RESPONSE" | jq -r '.componentInfo.componentName')"
    echo "   Is default export: $(echo "$PARSE_RESPONSE" | jq -r '.componentInfo.isDefaultExport')"
    echo "   Imports found: $(echo "$PARSE_RESPONSE" | jq -r '.componentInfo.imports | length')"
else
    echo "❌ Parse endpoint failed"
    echo "Response: $PARSE_RESPONSE"
fi

echo ""
echo "🔧 Step 4: Test Frontend Integration"
echo "----------------------------------"

# Check if OM Big Book component exists and is accessible
if [ -f "$FRONT_END_DIR/src/components/admin/OMBigBook.tsx" ]; then
    echo "✅ OMBigBook component exists"
    
    # Check for TSX wizard import
    if grep -q "TSXComponentInstallWizard" "$FRONT_END_DIR/src/components/admin/OMBigBook.tsx"; then
        echo "✅ TSXComponentInstallWizard is imported in OMBigBook"
    else
        echo "❌ TSXComponentInstallWizard import missing in OMBigBook"
    fi
    
    # Check for .tsx file detection logic
    if grep -q 'extension === "tsx"' "$FRONT_END_DIR/src/components/admin/OMBigBook.tsx"; then
        echo "✅ TSX file detection logic present"
    else
        echo "❌ TSX file detection logic missing"
    fi
else
    echo "❌ OMBigBook component not found"
fi

# Check if TSXComponentInstallWizard exists
if [ -f "$FRONT_END_DIR/src/components/admin/TSXComponentInstallWizard.tsx" ]; then
    echo "✅ TSXComponentInstallWizard component exists"
else
    echo "❌ TSXComponentInstallWizard component not found"
fi

# Check if AdminSettings includes OM Big Book tab
if [ -f "$FRONT_END_DIR/src/views/admin/AdminSettings.tsx" ]; then
    if grep -q "OM Big Book" "$FRONT_END_DIR/src/views/admin/AdminSettings.tsx"; then
        echo "✅ OM Big Book tab exists in AdminSettings"
    else
        echo "❌ OM Big Book tab missing in AdminSettings"
    fi
else
    echo "❌ AdminSettings component not found"
fi

echo ""
echo "🛡️ Step 5: Test Security and Validation"
echo "--------------------------------------"

# Test invalid TSX parsing
INVALID_CONTENT=$(cat "$TEST_DIR/InvalidComponent.tsx")
INVALID_PARSE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/bigbook/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"InvalidComponent.tsx\",
    \"content\": $(echo "$INVALID_CONTENT" | jq -R -s .)
  }" 2>/dev/null)

if echo "$INVALID_PARSE_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo "✅ Invalid TSX properly rejected"
    echo "   Error: $(echo "$INVALID_PARSE_RESPONSE" | jq -r '.error')"
else
    echo "❌ Invalid TSX was not properly rejected"
fi

# Test that .tsx files are rejected by the general ingest endpoint
echo ""
echo "Testing general ingest endpoint rejects .tsx files..."
INGEST_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/bigbook/ingest-file" \
  -F "file=@$TEST_DIR/TestButton.tsx" 2>/dev/null)

if echo "$INGEST_RESPONSE" | grep -q "TSX files must be processed through the TSX Component Installation Wizard"; then
    echo "✅ General ingest endpoint properly rejects .tsx files"
else
    echo "❌ General ingest endpoint did not properly reject .tsx files"
    echo "Response: $INGEST_RESPONSE"
fi

echo ""
echo "📦 Step 6: Test Registry Integration"
echo "----------------------------------"

# Check if component registry file structure exists
REGISTRY_DIR="$BASE_DIR/configs"
if [ -d "$REGISTRY_DIR" ]; then
    echo "✅ Registry directory exists: $REGISTRY_DIR"
    
    # Check for component registry file
    if [ -f "$REGISTRY_DIR/component-registry.json" ]; then
        echo "✅ Component registry file exists"
    else
        echo "ℹ️ Component registry file will be created on first installation"
    fi
else
    echo "ℹ️ Registry directory will be created automatically"
fi

echo ""
echo "🎯 Step 7: Manual Testing Instructions"
echo "------------------------------------"
echo "To complete testing, perform these manual steps:"
echo ""
echo "1. 🌐 Open browser and navigate to: $SERVER_URL/admin/settings"
echo "2. 🖱️ Click on the 'OM Big Book' tab"
echo "3. 📂 Drag and drop the TestButton.tsx file into the upload area"
echo "4. 🧙 Verify the TSX Component Installation Wizard opens"
echo "5. ⚙️ Configure installation options:"
echo "   - Target directory: src/components/test/"
echo "   - Enable 'Install missing packages'"
echo "   - Enable 'Register in component registry'"
echo "   - Enable 'Open preview after installation'"
echo "6. 🚀 Click 'Install Component'"
echo "7. ✅ Verify installation completes successfully"
echo "8. 🔍 Check that component appears in preview"
echo "9. 🗑️ Test the remove/undo functionality"
echo ""

echo "🧪 Test Files Created:"
echo "--------------------"
echo "Test files have been created in: $TEST_DIR"
echo "- TestButton.tsx (for basic testing)"
echo "- AdvancedCard.tsx (for advanced testing with dependencies)"
echo "- InvalidComponent.tsx (for validation testing)"
echo ""

echo "📋 Summary of Test Results:"
echo "-------------------------"
if curl -s "$SERVER_URL/api/health" > /dev/null 2>&1; then
    echo "✅ Server connectivity"
else
    echo "❌ Server connectivity"
fi

if [ -f "$FRONT_END_DIR/src/components/admin/OMBigBook.tsx" ]; then
    echo "✅ Frontend components"
else
    echo "❌ Frontend components"
fi

echo ""
echo "🎉 TSX Component Installation Test Complete!"
echo "Please follow the manual testing instructions above to complete verification."
echo ""
echo "For any issues, check the server logs:"
echo "   - tsx-components.log"
echo "   - ingestion.log"
echo "   - execution.log" 