#!/bin/bash

echo "🧪 TSX Endpoint Testing Script"
echo "============================="
echo "This script tests the specific endpoint that's preventing installation."
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Testing TSX parsing endpoint that enables install button..."

# Test the specific endpoint that's failing
test_parse_endpoint() {
    echo ""
    log "=== TESTING PARSE TSX COMPONENT ENDPOINT ==="
    
    local url="http://localhost:3001/api/bigbook/parse-tsx-component"
    echo "Testing: $url"
    
    # Create a simple test TSX component
    local test_component='import React from "react";

const TestComponent: React.FC = () => {
  return (
    <div>
      <h1>Test Component</h1>
      <p>This is a test component for Big Book auto-install.</p>
    </div>
  );
};

export default TestComponent;'
    
    # Create JSON payload
    local json_payload="{
  \"fileName\": \"TestComponent.tsx\",
  \"content\": $(echo "$test_component" | jq -Rs .)
}"
    
    echo "Payload preview:"
    echo "$json_payload" | head -10
    echo ""
    
    if command -v curl >/dev/null 2>&1; then
        echo "Sending POST request..."
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                       -H "Content-Type: application/json" \
                       -d "$json_payload" \
                       --max-time 10 \
                       "$url" 2>/dev/null)
        
        # Extract HTTP status and body
        http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
        body=$(echo "$response" | sed 's/HTTPSTATUS:.*$//')
        
        echo "HTTP Status: $http_code"
        echo "Response Body:"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        
        case "$http_code" in
            "200")
                echo "✅ SUCCESS: Endpoint working correctly"
                echo "Component parsing successful - install button should be enabled"
                ;;
            "404")
                echo "❌ NOT FOUND: Endpoint missing - SERVER RESTART REQUIRED"
                echo "This is why the install button is disabled!"
                ;;
            "401"|"403")
                echo "🔐 AUTH REQUIRED: Need to be logged in as super_admin/editor"
                echo "Component parsing blocked by authentication"
                ;;
            "500")
                echo "⚠️ SERVER ERROR: Endpoint exists but has internal error"
                echo "Response body contains error details"
                ;;
            "000")
                echo "❌ CONNECTION REFUSED: Server not running"
                echo "Start the server first!"
                ;;
            *)
                echo "⚠️ UNEXPECTED STATUS: $http_code"
                ;;
        esac
    else
        echo "❌ curl not available, cannot test endpoint"
    fi
}

# Test basic connectivity first
log "=== BASIC CONNECTIVITY TEST ==="
if command -v curl >/dev/null 2>&1; then
    echo "Testing server connectivity..."
    basic_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3001" 2>/dev/null)
    
    case "$basic_response" in
        "000")
            echo "❌ FAILED: Cannot connect to server on port 3001"
            echo "SOLUTION: Start the server first!"
            echo "  cd server && npm start"
            exit 1
            ;;
        *)
            echo "✅ Server responding on port 3001 (HTTP $basic_response)"
            ;;
    esac
else
    echo "❌ curl not available, cannot test connectivity"
    exit 1
fi

# Run the specific endpoint test
test_parse_endpoint

echo ""
log "=== DIAGNOSIS SUMMARY ==="
echo ""
echo "The TSX Component Install Wizard's 'Install Component' button is disabled because:"
echo "1. componentInfo.isValid is false"
echo "2. This happens when /api/bigbook/parse-tsx-component fails"
echo "3. Based on your browser console errors, this endpoint returns 404"
echo ""
echo "SOLUTION:"
echo "1. Restart the server to load new endpoints:"
echo "   bash prod/scripts/restart-server-for-bigbook.sh"
echo ""
echo "2. After restart, test again:"
echo "   bash prod/scripts/test-tsx-endpoint-specifically.sh"
echo ""
echo "3. Once endpoint works, upload TSX files will be parsed successfully"
echo "   and the install button will become enabled."

echo ""
log "=== TEST COMPLETE ===" 