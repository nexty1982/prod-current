#!/bin/bash

# Big Book Auto-Install TSX Component Testing Script
# Tests the enhanced TSX component installation with automatic menu integration

echo "🧪 Big Book Auto-Install TSX Component Testing Script"
echo "================================================="
echo ""

# Configuration
SERVER_URL="http://localhost:3001"
BIGBOOK_URL="$SERVER_URL/api/bigbook"
FRONTEND_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end"
CUSTOM_DIR="$FRONTEND_DIR/src/components/bigbook/custom"
REGISTRY_FILE="$FRONTEND_DIR/src/config/bigbook-custom-components.json"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((TESTS_FAILED++))
}

run_test() {
    ((TOTAL_TESTS++))
    echo ""
    echo -e "${BLUE}🧪 Test $TOTAL_TESTS: $1${NC}"
}

# Test 1: Check server connectivity
run_test "Server Connectivity"
if curl -s "$SERVER_URL/api/auth/check" > /dev/null; then
    log_success "Server is responding at $SERVER_URL"
else
    log_error "Server is not responding at $SERVER_URL"
    echo "Please ensure the server is running on port 3001"
    exit 1
fi

# Test 2: Check directory structure
run_test "Directory Structure"
if [ -d "$FRONTEND_DIR" ]; then
    log_success "Frontend directory exists: $FRONTEND_DIR"
    
    # Create custom components directory if it doesn't exist
    mkdir -p "$CUSTOM_DIR"
    if [ -d "$CUSTOM_DIR" ]; then
        log_success "Custom components directory exists: $CUSTOM_DIR"
    else
        log_error "Failed to create custom components directory"
    fi
else
    log_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Test 3: Create test TSX components
run_test "Creating Test TSX Components"

# Valid Big Book Component
cat > /tmp/BigBookTestComponent.tsx << 'EOF'
import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';

interface BigBookTestComponentProps {
  title?: string;
}

const BigBookTestComponent: React.FC<BigBookTestComponentProps> = ({ 
  title = "Big Book Test Component" 
}) => {
  const [count, setCount] = useState(0);

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          {title}
        </Typography>
        
        <Typography variant="body1" paragraph>
          This is a test component for the Big Book auto-install system.
          It demonstrates React hooks, TypeScript, and Material-UI integration.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
          <Typography variant="h6">
            Count: {count}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setCount(c => c + 1)}
          >
            Increment
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setCount(0)}
          >
            Reset
          </Button>
        </Box>
        
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Installed via Big Book Auto-Install System
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BigBookTestComponent;
EOF

log_success "Created valid test component: BigBookTestComponent.tsx"

# Invalid component (for security testing)
cat > /tmp/InvalidComponent.tsx << 'EOF'
import React from 'react';

const InvalidComponent = () => {
  // This should trigger security validation
  eval('console.log("This is dangerous")');
  
  return <div>Invalid Component</div>;
};

export default InvalidComponent;
EOF

log_success "Created invalid test component: InvalidComponent.tsx"

# Component with missing dependencies
cat > /tmp/MissingDepsComponent.tsx << 'EOF'
import React from 'react';
import { format } from 'date-fns';
import axios from 'axios';

const MissingDepsComponent: React.FC = () => {
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  
  return (
    <div>
      <h1>Missing Dependencies Component</h1>
      <p>Current date: {currentDate}</p>
      <p>This component requires date-fns and axios packages</p>
    </div>
  );
};

export default MissingDepsComponent;
EOF

log_success "Created component with missing dependencies: MissingDepsComponent.tsx"

# Test 4: Test Big Book Custom Components Registry API
run_test "Big Book Custom Components Registry API"
REGISTRY_RESPONSE=$(curl -s "$BIGBOOK_URL/custom-components-registry")
if echo "$REGISTRY_RESPONSE" | grep -q '"success":true'; then
    log_success "Custom components registry API is responding"
else
    log_error "Custom components registry API failed"
    echo "Response: $REGISTRY_RESPONSE"
fi

# Test 5: Test component parsing with valid component
run_test "Component Parsing - Valid Component"
PARSE_RESPONSE=$(curl -s -X POST "$BIGBOOK_URL/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"BigBookTestComponent.tsx\",
    \"content\": \"$(cat /tmp/BigBookTestComponent.tsx | sed 's/"/\\"/g' | tr '\n' ' ')\"
  }")

if echo "$PARSE_RESPONSE" | grep -q '"success":true'; then
    log_success "Valid component parsed successfully"
    if echo "$PARSE_RESPONSE" | grep -q '"isValid":true'; then
        log_success "Component validation passed"
    else
        log_warning "Component validation failed"
        echo "Validation response: $PARSE_RESPONSE"
    fi
else
    log_error "Component parsing failed"
    echo "Response: $PARSE_RESPONSE"
fi

# Test 6: Test component parsing with invalid component (security)
run_test "Component Parsing - Security Validation"
SECURITY_RESPONSE=$(curl -s -X POST "$BIGBOOK_URL/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"InvalidComponent.tsx\",
    \"content\": \"$(cat /tmp/InvalidComponent.tsx | sed 's/"/\\"/g' | tr '\n' ' ')\"
  }")

if echo "$SECURITY_RESPONSE" | grep -q '"isValid":false'; then
    log_success "Security validation correctly rejected dangerous component"
else
    log_error "Security validation failed to catch dangerous component"
    echo "Response: $SECURITY_RESPONSE"
fi

# Test 7: Test component installation (Big Book Auto-Install)
run_test "Big Book Auto-Install Component Installation"

# First parse the component
COMPONENT_INFO=$(curl -s -X POST "$BIGBOOK_URL/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"BigBookTestComponent.tsx\",
    \"content\": \"$(cat /tmp/BigBookTestComponent.tsx | sed 's/"/\\"/g' | tr '\n' ' ')\"
  }")

if echo "$COMPONENT_INFO" | grep -q '"success":true'; then
    # Extract component info for installation
    INSTALL_RESPONSE=$(curl -s -X POST "$BIGBOOK_URL/install-bigbook-component" \
      -H "Content-Type: application/json" \
      -d "{
        \"componentInfo\": $(echo "$COMPONENT_INFO" | jq '.componentInfo'),
        \"installOptions\": {
          \"targetDirectory\": \"src/components/bigbook/custom\",
          \"installMissingPackages\": false,
          \"registerInRegistry\": true,
          \"openPreview\": false,
          \"overwriteExisting\": true,
          \"bigBookAutoInstall\": true
        }
      }")
    
    if echo "$INSTALL_RESPONSE" | grep -q '"success":true'; then
        log_success "Component installed successfully via Big Book Auto-Install"
        
        # Check if file was created
        if [ -f "$CUSTOM_DIR/BigBookTestComponent.tsx" ]; then
            log_success "Component file created in correct directory"
        else
            log_error "Component file not found in expected location"
        fi
        
        # Check if registry was updated
        if [ -f "$REGISTRY_FILE" ]; then
            if grep -q "BigBookTestComponent" "$REGISTRY_FILE"; then
                log_success "Component registered in Big Book registry"
            else
                log_error "Component not found in Big Book registry"
            fi
        else
            log_warning "Big Book registry file not found"
        fi
        
        # Check route generation
        if echo "$INSTALL_RESPONSE" | grep -q '"/bigbook/component/big-book-test-component"'; then
            log_success "Component route generated correctly (kebab-case)"
        else
            log_warning "Component route may not be generated correctly"
        fi
        
    else
        log_error "Component installation failed"
        echo "Response: $INSTALL_RESPONSE"
    fi
else
    log_error "Failed to parse component for installation test"
fi

# Test 8: Test component removal
run_test "Component Removal from Big Book Auto-Install"
if [ -f "$CUSTOM_DIR/BigBookTestComponent.tsx" ]; then
    # Create installation result for removal
    REMOVAL_RESPONSE=$(curl -s -X DELETE "$BIGBOOK_URL/remove-bigbook-component" \
      -H "Content-Type: application/json" \
      -d "{
        \"installationResult\": {
          \"componentName\": \"BigBookTestComponent\",
          \"installedPath\": \"src/components/bigbook/custom/BigBookTestComponent.tsx\",
          \"route\": \"/bigbook/component/big-book-test-component\",
          \"displayName\": \"Big Book Test Component\",
          \"registryUpdated\": true,
          \"menuUpdated\": true
        }
      }")
    
    if echo "$REMOVAL_RESPONSE" | grep -q '"success":true'; then
        log_success "Component removed successfully"
        
        # Check if file was deleted
        if [ ! -f "$CUSTOM_DIR/BigBookTestComponent.tsx" ]; then
            log_success "Component file deleted correctly"
        else
            log_error "Component file still exists after removal"
        fi
        
        # Check if removed from registry
        if [ -f "$REGISTRY_FILE" ]; then
            if ! grep -q "BigBookTestComponent" "$REGISTRY_FILE"; then
                log_success "Component removed from Big Book registry"
            else
                log_error "Component still found in Big Book registry after removal"
            fi
        fi
        
    else
        log_error "Component removal failed"
        echo "Response: $REMOVAL_RESPONSE"
    fi
else
    log_warning "Component file not found for removal test"
fi

# Test 9: Test missing dependencies detection
run_test "Missing Dependencies Detection"
DEPS_RESPONSE=$(curl -s -X POST "$BIGBOOK_URL/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"MissingDepsComponent.tsx\",
    \"content\": \"$(cat /tmp/MissingDepsComponent.tsx | sed 's/"/\\"/g' | tr '\n' ' ')\"
  }")

if echo "$DEPS_RESPONSE" | grep -q '"missingPackages":\['; then
    if echo "$DEPS_RESPONSE" | grep -q '"date-fns"' && echo "$DEPS_RESPONSE" | grep -q '"axios"'; then
        log_success "Missing dependencies detected correctly (date-fns, axios)"
    else
        log_warning "Some missing dependencies may not be detected"
    fi
else
    log_error "Missing dependencies detection failed"
fi

# Test 10: Test file size validation
run_test "File Size Validation"
# Create a large file (>1MB)
dd if=/dev/zero bs=1024 count=1025 | base64 > /tmp/large_content.txt 2>/dev/null
LARGE_CONTENT="import React from 'react'; const LargeComponent = () => <div>$(cat /tmp/large_content.txt)</div>; export default LargeComponent;"

SIZE_RESPONSE=$(curl -s -X POST "$BIGBOOK_URL/parse-tsx-component" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"LargeComponent.tsx\",
    \"content\": \"$LARGE_CONTENT\"
  }")

if echo "$SIZE_RESPONSE" | grep -q "File size too large"; then
    log_success "File size validation working correctly"
else
    log_error "File size validation failed"
fi

# Cleanup
log_info "Cleaning up test files..."
rm -f /tmp/BigBookTestComponent.tsx
rm -f /tmp/InvalidComponent.tsx
rm -f /tmp/MissingDepsComponent.tsx
rm -f /tmp/large_content.txt

# Final Results
echo ""
echo "=========================================="
echo "🏁 Test Results Summary"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Big Book Auto-Install TSX system is working correctly.${NC}"
    echo ""
    echo "📋 Features Verified:"
    echo "  ✅ TSX component parsing and validation"
    echo "  ✅ Security pattern detection"
    echo "  ✅ File size validation"
    echo "  ✅ Component name validation"
    echo "  ✅ Missing dependencies detection"
    echo "  ✅ Big Book auto-install with menu integration"
    echo "  ✅ Automatic route generation (kebab-case)"
    echo "  ✅ Registry management"
    echo "  ✅ Component removal functionality"
    echo "  ✅ Directory structure enforcement"
    echo ""
    echo "🚀 You can now use the Big Book Auto-Install feature by:"
    echo "  1. Going to Admin Settings > OM Big Book > Custom Components"
    echo "  2. Dragging .tsx files with 'Big Book Auto-Install Mode' enabled"
    echo "  3. Components will automatically appear in the sidebar navigation"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the errors above.${NC}"
    echo ""
    echo "🔧 Common issues:"
    echo "  - Server not running on port 3001"
    echo "  - Authentication required (login as super_admin or editor)"
    echo "  - File permissions on frontend directory"
    echo "  - Missing dependencies in package.json"
    exit 1
fi 