#!/bin/bash

# 🗺️ Simple Command Line Installation of ParishMap Component
# ===========================================================
# This script installs ParishMap.tsx directly via Big Book Auto-Install API
# No external dependencies required (no jq needed)

echo "🗺️ ParishMap Component - Simple CLI Installation"
echo "================================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting installation..."

# Configuration
SERVER_URL="http://localhost:3001"
COMPONENT_FILE="ParishMap.tsx"

# Check if ParishMap.tsx exists
if [ ! -f "$COMPONENT_FILE" ]; then
    echo "❌ ERROR: $COMPONENT_FILE not found"
    echo "💡 Run this from the directory containing ParishMap.tsx"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "✅ Found $COMPONENT_FILE ($(wc -c < $COMPONENT_FILE) bytes)"
echo ""

# Check server connectivity
echo "🔍 Checking server..."
if ! curl -s --connect-timeout 5 "$SERVER_URL/api/status" > /dev/null 2>&1; then
    echo "❌ Server not responding at $SERVER_URL"
    echo "💡 Make sure server is running: cd server && npm start"
    exit 1
fi
echo "✅ Server is responding"
echo ""

# Function to escape content for JSON (simple version)
escape_for_json() {
    # Read file and escape quotes and backslashes
    sed 's/\\/\\\\/g' "$1" | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//'
}

# Parse component first
echo "🔍 Step 1: Parsing component..."
ESCAPED_CONTENT=$(escape_for_json "$COMPONENT_FILE")

# Create temporary JSON file for parsing
cat > /tmp/parse_payload.json <<EOF
{
  "fileName": "$COMPONENT_FILE",
  "content": "$ESCAPED_CONTENT"
}
EOF

# Parse the component
PARSE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @/tmp/parse_payload.json \
    "$SERVER_URL/api/bigbook/parse-tsx-component" 2>/dev/null)

# Clean up temp file
rm -f /tmp/parse_payload.json

# Check parse result
if echo "$PARSE_RESPONSE" | grep -q '"isValid":true'; then
    echo "✅ Component parsed successfully"
else
    echo "❌ Component parsing failed"
    
    # Check for auth error
    if echo "$PARSE_RESPONSE" | grep -q "Authentication required\|NO_SESSION"; then
        echo ""
        echo "🔐 Authentication required!"
        echo "💡 Quick fix:"
        echo "   1. Open browser: https://orthodoxmetrics.com/admin"
        echo "   2. Login as super_admin"
        echo "   3. Keep browser tab open"
        echo "   4. Re-run this script"
        echo ""
    else
        echo "Error details: $PARSE_RESPONSE"
    fi
    exit 1
fi

# Install component
echo ""
echo "🚀 Step 2: Installing component..."

# Create installation payload (simpler approach)
cat > /tmp/install_payload.json <<EOF
{
  "fileName": "$COMPONENT_FILE",
  "content": "$ESCAPED_CONTENT",
  "installOptions": {
    "targetDirectory": "src/components/bigbook/custom",
    "registerInRegistry": true,
    "bigBookAutoInstall": true
  }
}
EOF

# Install the component
INSTALL_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @/tmp/install_payload.json \
    "$SERVER_URL/api/bigbook/install-bigbook-component" 2>/dev/null)

# Clean up temp file
rm -f /tmp/install_payload.json

# Check installation result
if echo "$INSTALL_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Installation successful!"
    echo ""
    echo "🎉 Results:"
    echo "==========="
    echo "✅ Component: ParishMap"
    echo "✅ Location: src/components/bigbook/custom/ParishMap.tsx"
    echo "✅ Route: /bigbook/parish-map"
    echo "✅ Menu: Added to Big Book sidebar"
    echo "✅ Registry: Updated"
    echo ""
    echo "🌐 Access at: https://orthodoxmetrics.com/bigbook/parish-map"
    echo ""
    echo "🎯 Success! Look for 'Parish Map' in your Big Book menu!"
else
    echo "❌ Installation failed"
    echo "Response: $INSTALL_RESPONSE"
    exit 1
fi

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Installation completed!"

# Verify installation
echo ""
echo "🔍 Quick verification..."
REGISTRY_CHECK=$(curl -s "$SERVER_URL/api/bigbook/custom-components-registry" 2>/dev/null)
if echo "$REGISTRY_CHECK" | grep -q "ParishMap\|parish-map"; then
    echo "✅ Component confirmed in registry"
else
    echo "⚠️  Component not found in registry (may need refresh)"
fi

echo ""
echo "📝 Next steps:"
echo "• Refresh your browser if Big Book is open"
echo "• Check Big Book sidebar for 'Parish Map' menu item"
echo "• Visit /bigbook/parish-map to see your component" 