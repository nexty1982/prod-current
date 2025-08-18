#!/bin/bash

echo "🔍 Debugging the database query issue..."

echo ""
echo "1. First, check what the database actually contains:"
echo "   mysql -u root -p orthodoxmetrics_db -e \"SELECT id, email, is_active FROM users LIMIT 3;\""

echo ""
echo "2. Check the data types:"
echo "   mysql -u root -p orthodoxmetrics_db -e \"DESCRIBE users;\" | grep is_active"

echo ""
echo "3. Make sure your Node.js server was restarted after the code changes"
echo "   - Stop your current server (Ctrl+C)"
echo "   - Start it again: node server/index.js"

echo ""
echo "4. Then refresh your browser and click a toggle button"
echo "   - Look for these logs in your server terminal:"
echo "     🔍 Executing users query: SELECT..."
echo "     🔍 Raw users from DB: [{id: 4, email: ..., is_active: 1}, ...]"

echo ""
echo "5. If you don't see those server logs, the server wasn't restarted with our new code" 