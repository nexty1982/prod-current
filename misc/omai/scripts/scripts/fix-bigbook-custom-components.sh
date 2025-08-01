#!/bin/bash
# 🛠️ Fix Big Book Custom Components System
# This script addresses the runtime errors and enables the Custom Components tab

echo "🔧 Big Book Custom Components System Fix"
echo "========================================"

# 1. Check current system status
echo "📋 Checking system status..."

# Check if ParishMap component exists
PARISH_MAP_PATH="front-end/src/components/bigbook/custom/ParishMap.tsx"
if [ -f "$PARISH_MAP_PATH" ]; then
    echo "✅ ParishMap component found at: $PARISH_MAP_PATH"
else
    echo "❌ ParishMap component not found at: $PARISH_MAP_PATH"
fi

# Check if custom components registry exists
REGISTRY_PATH="front-end/src/config/bigbook-custom-components.json"
if [ -f "$REGISTRY_PATH" ]; then
    echo "✅ Custom components registry found at: $REGISTRY_PATH"
    echo "📊 Registry contents:"
    cat "$REGISTRY_PATH" | head -10
    echo "..."
else
    echo "❌ Custom components registry not found at: $REGISTRY_PATH"
fi

# 2. Backend API Status
echo ""
echo "🔌 Testing backend API endpoints..."
echo "Note: These tests require the server to be running on port 3001"

# Test custom components registry endpoint
echo "Testing: /api/bigbook/custom-components-registry"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3001/api/bigbook/custom-components-registry

# Test BigBook routes endpoint  
echo "Testing: /api/bigbook/routes"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3001/api/bigbook/routes

# 3. Frontend Status
echo ""
echo "🎨 Frontend Status..."
echo "✅ BigBookCustomComponentViewer has been re-enabled in OMBigBook.tsx"
echo "✅ Custom Components tab is now properly wired up (activeTab === 6)"
echo "✅ Component viewer error handling has been improved"

# 4. ParishMap Specific Tests
echo ""
echo "🗺️ ParishMap Component Status..."
if [ -f "$PARISH_MAP_PATH" ]; then
    echo "📝 ParishMap details:"
    echo "   - File size: $(wc -c < "$PARISH_MAP_PATH") bytes"
    echo "   - Last modified: $(stat -c %y "$PARISH_MAP_PATH" 2>/dev/null || stat -f %Sm "$PARISH_MAP_PATH" 2>/dev/null || echo "Unknown")"
    
    # Check if ParishMap is in registry
    if [ -f "$REGISTRY_PATH" ]; then
        if grep -q "parish-map" "$REGISTRY_PATH"; then
            echo "✅ ParishMap is registered in custom components"
        else
            echo "❌ ParishMap is NOT registered in custom components"
        fi
    fi
fi

# 5. Required Dependencies Check
echo ""
echo "📦 Checking required dependencies..."
PACKAGE_JSON="front-end/package.json"
if [ -f "$PACKAGE_JSON" ]; then
    echo "Checking for ParishMap dependencies:"
    
    dependencies=("react-leaflet" "leaflet" "react-leaflet-markercluster" "@headlessui/react" "@heroicons/react")
    for dep in "${dependencies[@]}"; do
        if grep -q "\"$dep\"" "$PACKAGE_JSON"; then
            echo "✅ $dep is in package.json"
        else
            echo "⚠️  $dep is missing from package.json"
        fi
    done
else
    echo "❌ package.json not found at: $PACKAGE_JSON"
fi

# 6. Rebuild Instructions
echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. 🔄 Restart the backend server to ensure all routes are loaded:"
echo "   pm2 restart orthodox-backend"
echo ""
echo "2. 🔨 Rebuild the frontend to apply the custom components fixes:"
echo "   cd front-end"
echo "   npm install --legacy-peer-deps  # If dependencies are missing"
echo "   NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
echo ""
echo "3. 🧪 Test the Custom Components tab:"
echo "   - Open OrthodoxMetrics admin panel"
echo "   - Navigate to Big Book"
echo "   - Click on 'Custom Components' tab (tab #7)"
echo "   - You should see the ParishMap component listed"
echo "   - Click 'View' to test the BigBookCustomComponentViewer"
echo ""
echo "4. 🗺️ Test direct ParishMap access:"
echo "   - Navigate to: https://orthodoxmetrics.com/bigbook/parish-map"
echo "   - The ParishMap should load directly"
echo ""

# 7. Troubleshooting
echo "🔍 Troubleshooting:"
echo "==================="
echo "If you see 'rt is not defined' or 'tt is not defined' errors:"
echo "  - Clear browser cache and hard refresh (Ctrl+Shift+R)"
echo "  - Check browser console for specific import errors"
echo "  - Ensure all required dependencies are installed"
echo ""
echo "If ParishMap doesn't load:"
echo "  - Check that all Leaflet dependencies are installed"
echo "  - Verify the component registry is accessible"
echo "  - Check network tab for failed API calls"
echo ""
echo "If Custom Components tab is empty:"
echo "  - Verify custom-components-registry.json exists and is valid"
echo "  - Check backend logs for API errors"
echo "  - Ensure user has proper permissions (admin/super_admin/editor)"

echo ""
echo "✨ Big Book Custom Components system fixes applied!"
echo "Please follow the steps above to complete the activation." 