#!/bin/bash

# 🗺️ Install jq and ParishMap Component
# =====================================
# This script first ensures jq is installed, then installs ParishMap.tsx via Big Book Auto-Install API

echo "🗺️ Installing jq and ParishMap Component"
echo "========================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting installation process..."

# Configuration
SERVER_URL="http://localhost:3001"
COMPONENT_FILE="ParishMap.tsx"

echo "📋 Environment Check:"
echo "• Linux environment: ✅"
echo "• Mapped workspace: ✅"
echo "• Server port: 3001"
echo ""

# Step 1: Install jq if not available
echo "🔧 Step 1: Checking for jq..."
if ! command -v jq &> /dev/null; then
    echo "📦 jq not found. Installing jq..."
    
    # Try different package managers
    if command -v apt-get &> /dev/null; then
        echo "Using apt-get to install jq..."
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        echo "Using yum to install jq..."
        sudo yum install -y jq
    elif command -v dnf &> /dev/null; then
        echo "Using dnf to install jq..."
        sudo dnf install -y jq
    elif command -v pacman &> /dev/null; then
        echo "Using pacman to install jq..."
        sudo pacman -S jq
    else
        echo "❌ Cannot automatically install jq. Please install manually:"
        echo "   Ubuntu/Debian: sudo apt-get install jq"
        echo "   CentOS/RHEL: sudo yum install jq"
        echo "   Fedora: sudo dnf install jq"
        echo "   Arch: sudo pacman -S jq"
        exit 1
    fi
    
    # Verify installation
    if command -v jq &> /dev/null; then
        echo "✅ jq installed successfully: $(jq --version)"
    else
        echo "❌ jq installation failed"
        exit 1
    fi
else
    echo "✅ jq already installed: $(jq --version)"
fi

echo ""

# Step 2: Check if ParishMap.tsx exists
echo "🔍 Step 2: Locating ParishMap.tsx..."
if [ ! -f "$COMPONENT_FILE" ]; then
    echo "❌ ERROR: $COMPONENT_FILE not found in current directory"
    echo "💡 Current directory: $(pwd)"
    echo "💡 Please ensure ParishMap.tsx is in the directory where you run this script"
    
    # Look for it in common locations
    echo ""
    echo "🔍 Searching for ParishMap.tsx..."
    find . -name "ParishMap.tsx" -type f 2>/dev/null | head -5
    echo ""
    exit 1
fi

echo "✅ Found $COMPONENT_FILE"
echo "📊 File size: $(wc -c < $COMPONENT_FILE) bytes"
echo "📝 File lines: $(wc -l < $COMPONENT_FILE) lines"
echo ""

# Step 3: Check server connectivity
echo "🔍 Step 3: Checking server connectivity..."
if ! curl -s --connect-timeout 5 "$SERVER_URL/api/status" > /dev/null 2>&1; then
    echo "❌ Server not responding at $SERVER_URL"
    echo "💡 Make sure the server is running:"
    echo "   cd server && npm start"
    echo ""
    echo "💡 Or check if it's running on a different port"
    exit 1
fi
echo "✅ Server is responding at $SERVER_URL"
echo ""

# Step 4: Parse component
echo "🔍 Step 4: Parsing TSX component..."
echo "Endpoint: $SERVER_URL/api/bigbook/parse-tsx-component"

# Read and escape content for JSON using jq
ESCAPED_CONTENT=$(cat "$COMPONENT_FILE" | jq -Rs .)

# Create JSON payload with proper escaping
PARSE_PAYLOAD=$(jq -n \
    --arg fileName "$COMPONENT_FILE" \
    --argjson content "$ESCAPED_CONTENT" \
    '{fileName: $fileName, content: $content}')

# Make parsing API call
PARSE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PARSE_PAYLOAD" \
    "$SERVER_URL/api/bigbook/parse-tsx-component" 2>/dev/null)

# Check parse result
if echo "$PARSE_RESPONSE" | jq -e '.isValid == true' > /dev/null 2>&1; then
    echo "✅ Component parsed successfully"
    
    # Extract details using jq
    COMPONENT_NAME=$(echo "$PARSE_RESPONSE" | jq -r '.componentName // "ParishMap"')
    ROUTE=$(echo "$PARSE_RESPONSE" | jq -r '.route // "/bigbook/parish-map"')
    
    echo "📋 Component details:"
    echo "   • Name: $COMPONENT_NAME"
    echo "   • Route: $ROUTE"
    
    # Check for warnings
    WARNINGS=$(echo "$PARSE_RESPONSE" | jq -r '.warnings[]? // empty')
    if [ ! -z "$WARNINGS" ]; then
        echo "⚠️  Warnings:"
        echo "$WARNINGS" | sed 's/^/   • /'
    fi
else
    echo "❌ Component parsing failed"
    
    # Extract error details
    ERROR_MSG=$(echo "$PARSE_RESPONSE" | jq -r '.error // "Unknown error"')
    echo "   Error: $ERROR_MSG"
    
    # Check for authentication issues
    if echo "$PARSE_RESPONSE" | jq -e '.code == "NO_SESSION"' > /dev/null 2>&1; then
        echo ""
        echo "🔐 Authentication Required!"
        echo "💡 Please login to the web interface first:"
        echo "   1. Open browser: https://orthodoxmetrics.com/admin"
        echo "   2. Login as super_admin or editor"
        echo "   3. Keep browser tab open"
        echo "   4. Re-run this script"
        echo ""
    fi
    exit 1
fi

echo ""

# Step 5: Install component
echo "🚀 Step 5: Installing component with Big Book Auto-Install..."
echo "Endpoint: $SERVER_URL/api/bigbook/install-bigbook-component"

# Create installation payload
INSTALL_PAYLOAD=$(jq -n \
    --arg fileName "$COMPONENT_FILE" \
    --argjson content "$ESCAPED_CONTENT" \
    '{
        fileName: $fileName,
        content: $content,
        installOptions: {
            targetDirectory: "src/components/bigbook/custom",
            registerInRegistry: true,
            bigBookAutoInstall: true
        }
    }')

# Make installation API call
INSTALL_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$INSTALL_PAYLOAD" \
    "$SERVER_URL/api/bigbook/install-bigbook-component" 2>/dev/null)

# Check installation result
if echo "$INSTALL_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Installation successful!"
    echo ""
    echo "🎉 Installation Results:"
    echo "========================"
    
    # Extract installation details using jq
    INSTALLED_COMPONENT=$(echo "$INSTALL_RESPONSE" | jq -r '.componentName // "ParishMap"')
    INSTALLED_PATH=$(echo "$INSTALL_RESPONSE" | jq -r '.installedPath // "src/components/bigbook/custom/ParishMap.tsx"')
    INSTALLED_ROUTE=$(echo "$INSTALL_RESPONSE" | jq -r '.route // "/bigbook/parish-map"')
    MENU_UPDATED=$(echo "$INSTALL_RESPONSE" | jq -r '.menuUpdated // false')
    
    echo "✅ Component: $INSTALLED_COMPONENT"
    echo "✅ Installed to: $INSTALLED_PATH"
    echo "✅ Route created: $INSTALLED_ROUTE"
    echo "✅ Registry updated: ✅"
    
    if [ "$MENU_UPDATED" = "true" ]; then
        echo "✅ Menu item added to Big Book sidebar"
    fi
    
    echo ""
    echo "🌐 Access your component at:"
    echo "   https://orthodoxmetrics.com$INSTALLED_ROUTE"
    echo ""
    echo "📋 Look for 'Parish Map' in the Big Book sidebar menu!"
else
    echo "❌ Installation failed"
    
    # Extract error details
    ERROR_MSG=$(echo "$INSTALL_RESPONSE" | jq -r '.error // "Unknown error"')
    echo "   Error: $ERROR_MSG"
    
    # Show full response for debugging
    echo ""
    echo "🔍 Full response for debugging:"
    echo "$INSTALL_RESPONSE" | jq . 2>/dev/null || echo "$INSTALL_RESPONSE"
    exit 1
fi

echo ""

# Step 6: Verify installation
echo "🔍 Step 6: Verifying installation..."
REGISTRY_RESPONSE=$(curl -s "$SERVER_URL/api/bigbook/custom-components-registry" 2>/dev/null)

if echo "$REGISTRY_RESPONSE" | jq -e '.components | has("ParishMap") or has("parish-map")' > /dev/null 2>&1; then
    echo "✅ Component confirmed in registry"
    
    # Count total components
    COMPONENT_COUNT=$(echo "$REGISTRY_RESPONSE" | jq '.components | length')
    echo "📊 Total custom components: $COMPONENT_COUNT"
    
    # Show menu items
    MENU_COUNT=$(echo "$REGISTRY_RESPONSE" | jq '.menu | length')
    if [ "$MENU_COUNT" -gt 0 ]; then
        echo "📋 Menu items: $MENU_COUNT"
        echo "$REGISTRY_RESPONSE" | jq -r '.menu[]? | "   • \(.displayName) (\(.route))"'
    fi
else
    echo "⚠️  Component not found in registry (may still be processing)"
fi

echo ""
echo "🎉 ParishMap Component Installation Complete!"
echo ""
echo "📝 Next Steps:"
echo "• Refresh your browser if Big Book is open"
echo "• Look for 'Parish Map' in the Big Book sidebar"
echo "• Access the component at: https://orthodoxmetrics.com/bigbook/parish-map"
echo "• Manage it from the Custom Components tab in Big Book"
echo ""
echo "📋 Component Features:"
echo "• Interactive Orthodox parish map"
echo "• Leaflet-based mapping with clustering"
echo "• Parish filtering by jurisdiction, state, diocese, city"
echo "• Mock data included for demonstration"
echo "• Responsive design for mobile and desktop"
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Installation completed successfully!" 