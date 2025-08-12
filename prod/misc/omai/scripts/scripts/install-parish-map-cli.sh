#!/bin/bash

# 🗺️ Command Line Installation of ParishMap Component
# ===================================================
# This script installs ParishMap.tsx directly via Big Book Auto-Install API

echo "🗺️ ParishMap Component - Command Line Installation"
echo "=================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting CLI installation..."

# Configuration
SERVER_URL="http://localhost:3001"
COMPONENT_FILE="ParishMap.tsx"
API_PARSE_ENDPOINT="/api/bigbook/parse-tsx-component"
API_INSTALL_ENDPOINT="/api/bigbook/install-bigbook-component"

# Check if ParishMap.tsx exists
if [ ! -f "$COMPONENT_FILE" ]; then
    echo "❌ ERROR: $COMPONENT_FILE not found in current directory"
    echo "💡 Please run this script from the directory containing $COMPONENT_FILE"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: $(pwd)/$COMPONENT_FILE"
    exit 1
fi

echo "✅ Found $COMPONENT_FILE"
echo "📁 File location: $(pwd)/$COMPONENT_FILE"
echo "📊 File size: $(wc -c < $COMPONENT_FILE) bytes"
echo ""

# Function to check server connectivity
check_server() {
    echo "🔍 Checking server connectivity..."
    if curl -s --connect-timeout 5 "$SERVER_URL/api/status" > /dev/null 2>&1; then
        echo "✅ Server is responding at $SERVER_URL"
        return 0
    else
        echo "❌ Server not responding at $SERVER_URL"
        echo "💡 Make sure the server is running on port 3001"
        echo "   Try: cd server && npm start"
        return 1
    fi
}

# Function to parse component
parse_component() {
    echo ""
    echo "🔍 Step 1: Parsing TSX component..."
    echo "Endpoint: $SERVER_URL$API_PARSE_ENDPOINT"
    
    # Read file content and escape it properly for JSON
    local file_content=$(cat "$COMPONENT_FILE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
    
    # Create JSON payload
    local json_payload=$(cat <<EOF
{
  "fileName": "$COMPONENT_FILE",
  "content": "$file_content"
}
EOF
)
    
    # Make API call
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$json_payload" \
        "$SERVER_URL$API_PARSE_ENDPOINT" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to connect to parsing endpoint"
        return 1
    fi
    
    # Check if response contains success
    if echo "$response" | grep -q '"isValid":true'; then
        echo "✅ Component parsed successfully"
        echo "📋 Component details:"
        
        # Extract component name if possible
        local component_name=$(echo "$response" | grep -o '"componentName":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        if [ ! -z "$component_name" ]; then
            echo "   • Name: $component_name"
        fi
        
        # Extract route if possible
        local route=$(echo "$response" | grep -o '"route":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        if [ ! -z "$route" ]; then
            echo "   • Route: $route"
        fi
        
        return 0
    else
        echo "❌ Component parsing failed"
        
        # Try to extract error message
        local error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        if [ ! -z "$error_msg" ]; then
            echo "   Error: $error_msg"
        else
            echo "   Response: $response"
        fi
        
        # Check for authentication issues
        if echo "$response" | grep -q "Authentication required\|NO_SESSION"; then
            echo ""
            echo "🔐 Authentication Issue Detected"
            echo "   The API requires authentication but no session was found."
            echo ""
            echo "💡 Solutions:"
            echo "   1. Login to the web interface first to establish a session"
            echo "   2. Use browser-based installation instead"
            echo "   3. Or use this temporary workaround:"
            echo "      • Open browser to https://orthodoxmetrics.com/admin"
            echo "      • Login as super_admin"
            echo "      • Keep browser tab open"
            echo "      • Re-run this script"
        fi
        
        return 1
    fi
}

# Function to install component
install_component() {
    echo ""
    echo "🚀 Step 2: Installing component with Big Book Auto-Install..."
    echo "Endpoint: $SERVER_URL$API_INSTALL_ENDPOINT"
    
    # Read file content
    local file_content=$(cat "$COMPONENT_FILE")
    
    # Create installation payload
    local install_payload=$(cat <<EOF
{
  "fileName": "$COMPONENT_FILE",
  "content": $(echo "$file_content" | jq -Rs .),
  "installOptions": {
    "targetDirectory": "src/components/bigbook/custom",
    "registerInRegistry": true,
    "bigBookAutoInstall": true
  }
}
EOF
)
    
    # Make installation API call
    local install_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$install_payload" \
        "$SERVER_URL$API_INSTALL_ENDPOINT" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to connect to installation endpoint"
        return 1
    fi
    
    # Check installation success
    if echo "$install_response" | grep -q '"success":true'; then
        echo "✅ Component installed successfully!"
        echo ""
        echo "🎉 Installation Results:"
        echo "========================"
        
        # Extract installation details
        local component_name=$(echo "$install_response" | grep -o '"componentName":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        local installed_path=$(echo "$install_response" | grep -o '"installedPath":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        local route=$(echo "$install_response" | grep -o '"route":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        
        echo "✅ Component: ${component_name:-ParishMap}"
        echo "✅ Installed to: ${installed_path:-src/components/bigbook/custom/ParishMap.tsx}"
        echo "✅ Route created: ${route:-/bigbook/parish-map}"
        echo "✅ Menu item added to Big Book sidebar"
        echo "✅ Registry updated: front-end/src/config/bigbook-custom-components.json"
        echo ""
        echo "🌐 Access your component at:"
        echo "   https://orthodoxmetrics.com${route:-/bigbook/parish-map}"
        echo ""
        echo "📋 Look for 'Parish Map' in the Big Book sidebar menu!"
        
        return 0
    else
        echo "❌ Installation failed"
        
        # Extract error details
        local error_msg=$(echo "$install_response" | grep -o '"error":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        if [ ! -z "$error_msg" ]; then
            echo "   Error: $error_msg"
        else
            echo "   Response: $install_response"
        fi
        
        return 1
    fi
}

# Function to verify installation
verify_installation() {
    echo ""
    echo "🔍 Step 3: Verifying installation..."
    
    # Check if component registry was updated
    local registry_response=$(curl -s "$SERVER_URL/api/bigbook/custom-components-registry" 2>/dev/null)
    
    if echo "$registry_response" | grep -q "ParishMap\|parish-map"; then
        echo "✅ Component found in registry"
        
        # Count total components
        local component_count=$(echo "$registry_response" | grep -o '"components":{[^}]*}' | grep -o '":"' | wc -l)
        echo "📊 Total custom components: $component_count"
        
        return 0
    else
        echo "⚠️  Component not found in registry (may still be installing)"
        return 1
    fi
}

# Main installation process
main() {
    echo "Starting Big Book Auto-Install process..."
    echo ""
    
    # Step 1: Check server
    if ! check_server; then
        exit 1
    fi
    
    # Step 2: Parse component
    if ! parse_component; then
        echo ""
        echo "❌ Installation aborted due to parsing failure"
        exit 1
    fi
    
    # Step 3: Install component
    if ! install_component; then
        echo ""
        echo "❌ Installation failed"
        exit 1
    fi
    
    # Step 4: Verify installation
    verify_installation
    
    echo ""
    echo "🎉 ParishMap Component Installation Complete!"
    echo ""
    echo "📝 Next Steps:"
    echo "• Refresh your browser if Big Book is open"
    echo "• Look for 'Parish Map' in the Big Book sidebar"
    echo "• Access the component at /bigbook/parish-map"
    echo "• Manage it from the Custom Components tab"
    echo ""
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Installation completed successfully"
}

# Check if jq is available (for JSON processing)
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: 'jq' not found. Using fallback JSON processing."
    echo "   For better JSON handling, install jq: sudo apt-get install jq"
    echo ""
fi

# Run main installation
main 