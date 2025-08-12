#!/bin/bash

# Emergency Revert Script
# Reverts RegistryManagementPanel extraction to fix site-breaking issue

echo "🚨 EMERGENCY REVERT: Registry Management Panel"
echo "=============================================="
echo "This will revert the RegistryManagementPanel back into OMBigBook.tsx"
echo ""

# Backup current files
echo "📋 Creating backup of current files..."
cp front-end/src/components/admin/OMBigBook.tsx front-end/src/components/admin/OMBigBook.tsx.backup
if [ -f "front-end/src/components/admin/RegistryManagementPanel.tsx" ]; then
    cp front-end/src/components/admin/RegistryManagementPanel.tsx front-end/src/components/admin/RegistryManagementPanel.tsx.backup
fi

echo "✅ Backups created"

# Remove the RegistryManagementPanel import from OMBigBook.tsx
echo ""
echo "🔧 Removing RegistryManagementPanel import from OMBigBook.tsx..."

# Remove the import line
sed -i '/import RegistryManagementPanel from/d' front-end/src/components/admin/OMBigBook.tsx

echo "✅ Import removed"

# Delete the separate RegistryManagementPanel.tsx file
echo ""
echo "🗑️ Removing separate RegistryManagementPanel.tsx file..."
if [ -f "front-end/src/components/admin/RegistryManagementPanel.tsx" ]; then
    rm front-end/src/components/admin/RegistryManagementPanel.tsx
    echo "✅ RegistryManagementPanel.tsx deleted"
else
    echo "⚠️ RegistryManagementPanel.tsx not found"
fi

echo ""
echo "📝 NOTE: You still need to manually re-add the RegistryManagementPanel component"
echo "back inside OMBigBook.tsx where it was originally (around line 1370-1575)"
echo ""
echo "Original location was at the end of the OMBigBook component, just before:"
echo "  };"
echo "  export default OMBigBook;"
echo ""
echo "After manual restoration:"
echo "1. Rebuild frontend: cd front-end && npm run build --legacy-peer-deps"
echo "2. Restart server"
echo "3. Test site at orthodoxmetrics.com"

echo ""
echo "🔄 MANUAL STEPS REQUIRED:"
echo "========================"
echo "1. Edit front-end/src/components/admin/OMBigBook.tsx"
echo "2. Replace the <RegistryManagementPanel /> JSX with the original nested component"
echo "3. Add back the component definition before the closing }; of OMBigBook"
echo "4. Rebuild and restart"

echo ""
echo "🏁 Emergency revert preparation completed!"
echo "Manual component restoration still needed in OMBigBook.tsx" 