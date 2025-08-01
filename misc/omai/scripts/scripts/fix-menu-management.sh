#!/bin/bash

# Fix Menu Management Component
# This script populates the database with default menu items and permissions

echo "🔧 Orthodox Metrics - Menu Management Fix"
echo "========================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "server/scripts/populate-menu-items.js" ]; then
    echo "❌ Error: Must be run from the project root directory"
    echo "   Expected to find: server/scripts/populate-menu-items.js"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo "🎯 Fixing menu-management component..."
echo ""

# Change to server directory
cd server

echo "📊 Checking current database state..."
echo "   Menu items in database:"
node -e "
const { promisePool } = require('./config/db');
(async () => {
    try {
        const [rows] = await promisePool.execute('SELECT COUNT(*) as count FROM menu_items');
        console.log('      Current menu items: ' + rows[0].count);
        const [perms] = await promisePool.execute('SELECT COUNT(*) as count FROM role_menu_permissions');
        console.log('      Current permissions: ' + perms[0].count);
        process.exit(0);
    } catch (error) {
        console.log('      Database connection error:', error.message);
        process.exit(1);
    }
})();
"

echo ""
echo "🔄 Populating database with default menu items..."

# Run the population script
node scripts/populate-menu-items.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Menu management fix completed successfully!"
    echo ""
    echo "📋 What was fixed:"
    echo "   • Database populated with default menu items"
    echo "   • Role permissions configured for all user types"
    echo "   • Menu Management component should now work"
    echo ""
    echo "🌐 Next steps:"
    echo "   1. Restart your server to ensure all changes are loaded"
    echo "   2. Navigate to: https://orthodoxmetrics.com/admin/menu-management"
    echo "   3. Log in as super_admin to access the menu management interface"
    echo ""
    echo "🔧 If you still have issues:"
    echo "   • Check server logs for any authentication errors"
    echo "   • Verify you're logged in as super_admin"
    echo "   • Clear browser cache and try again"
else
    echo ""
    echo "❌ Menu management fix failed!"
    echo "   Check the error messages above and ensure:"
    echo "   • Database connection is working"
    echo "   • You have proper permissions to modify the database"
    echo "   • The orthodoxmetrics_db database exists"
    exit 1
fi 