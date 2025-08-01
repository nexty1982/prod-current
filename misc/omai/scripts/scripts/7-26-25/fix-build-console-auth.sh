#!/bin/bash

echo "=== Fix Build Console Authentication ==="
echo "Date: $(date)"
echo "Fixed: Build route now correctly checks req.session.user.role instead of req.user.role"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Changing to production directory: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "=== Build Console Authentication Fix Applied ==="
echo "✅ Fixed authentication check in server/routes/build.js"
echo "✅ Build console now properly reads user role from session"
echo "✅ Added debug logging to troubleshoot future auth issues"
echo ""
echo "📋 Changes made:"
echo "  - Changed req.user?.role to req.session.user.role"
echo "  - Added proper session validation"
echo "  - Added debug logging for authentication flow"
echo ""
echo "🔧 The server needs to be restarted for changes to take effect."
echo ""
echo "📝 Manual restart steps:"
echo "1. Stop your current server process"
echo "2. Restart with: npm start or node server.js"
echo "3. Access /admin/build and try using the build console"
echo ""
echo "🎯 Expected result:"
echo "  ✅ Build Console should now work for superadmin users"
echo "  ✅ No more 'Insufficient permissions' error"
echo "  ✅ You can configure and run builds successfully"

echo ""
echo "=== Build Console Authentication Fix Complete ==="
echo "The build console should now work properly for your superadmin account!" 