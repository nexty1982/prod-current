#!/bin/bash

echo "🧪 Component Name Validation Test"
echo "================================="
echo "Testing the fixed component name validation logic."
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Testing component name validation fixes..."

# Test different component name formats
test_component_names() {
    echo ""
    log "=== TESTING COMPONENT NAME FORMATS ==="
    
    local url="http://localhost:3001/api/bigbook/parse-tsx-component"
    
    # Test cases: filename -> expected component name
    declare -A test_cases=(
        ["api-routes-viewer.tsx"]="ApiRoutesViewer"
        ["user_profile.tsx"]="UserProfile"
        ["simple-button.tsx"]="SimpleButton"
        ["DataTable.tsx"]="DataTable"
        ["my-awesome-component.tsx"]="MyAwesomeComponent"
        ["test_component_123.tsx"]="TestComponent123"
    )
    
    for filename in "${!test_cases[@]}"; do
        expected_name="${test_cases[$filename]}"
        
        echo ""
        echo "Testing: $filename -> Expected: $expected_name"
        
        # Create simple test component content
        local test_component="import React from 'react';

const $expected_name: React.FC = () => {
  return (
    <div>
      <h1>$expected_name</h1>
      <p>This is a test component.</p>
    </div>
  );
};

export default $expected_name;"
        
        if command -v curl >/dev/null 2>&1; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                           -H "Content-Type: application/json" \
                           -d "{\"fileName\":\"$filename\",\"content\":$(echo "$test_component" | jq -Rs .)}" \
                           --max-time 10 \
                           "$url" 2>/dev/null)
            
            # Extract HTTP status and body
            http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
            body=$(echo "$response" | sed 's/HTTPSTATUS:.*$//')
            
            if [ "$http_code" = "200" ]; then
                # Parse the response to check if component name is correct
                component_name=$(echo "$body" | jq -r '.componentInfo.componentName' 2>/dev/null)
                is_valid=$(echo "$body" | jq -r '.componentInfo.isValid' 2>/dev/null)
                errors=$(echo "$body" | jq -r '.componentInfo.errors[]?' 2>/dev/null)
                
                if [ "$component_name" = "$expected_name" ] && [ "$is_valid" = "true" ]; then
                    echo "✅ SUCCESS: $filename -> $component_name (valid)"
                elif [ "$component_name" = "$expected_name" ] && [ "$is_valid" = "false" ]; then
                    echo "⚠️  PARTIAL: $filename -> $component_name (invalid due to errors)"
                    echo "   Errors: $errors"
                else
                    echo "❌ FAILED: $filename -> $component_name (expected: $expected_name)"
                    echo "   Valid: $is_valid"
                    if [ -n "$errors" ]; then
                        echo "   Errors: $errors"
                    fi
                fi
            else
                echo "❌ HTTP ERROR: $http_code"
                echo "   Response: $body"
            fi
        else
            echo "❌ curl not available"
            break
        fi
        
        sleep 0.5  # Small delay between requests
    done
}

# Test server connectivity first
log "=== CONNECTIVITY TEST ==="
if command -v curl >/dev/null 2>&1; then
    basic_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3001" 2>/dev/null)
    
    case "$basic_response" in
        "000")
            echo "❌ FAILED: Cannot connect to server on port 3001"
            echo "SOLUTION: Make sure the server is running"
            exit 1
            ;;
        *)
            echo "✅ Server responding on port 3001 (HTTP $basic_response)"
            ;;
    esac
else
    echo "❌ curl not available, cannot test"
    exit 1
fi

# Run the component name tests
test_component_names

echo ""
log "=== SUMMARY ==="
echo ""
echo "If all tests show ✅ SUCCESS, then:"
echo "  • Component name validation is working correctly"
echo "  • Files with hyphens and underscores are now accepted"
echo "  • Names are properly converted to PascalCase"
echo "  • The install button should now work in the frontend"
echo ""
echo "Next steps:"
echo "1. Try uploading 'api-routes-viewer.tsx' again in the frontend"
echo "2. The component should parse successfully (isValid: true)"
echo "3. The install button should become enabled"

echo ""
log "=== TEST COMPLETE ===" 