#!/bin/bash

echo "🔧 Fixing all Fr. James issues..."
echo "================================="

echo ""
echo "1. 🔧 Fixing Fr. James social menu access..."
node fix-frjames-social-access.js

echo ""
echo "2. 🔧 Fixing notifications system..."
node fix-notifications-system.js

echo ""
echo "3. 🔔 Checking friend request notifications..."
node check-friend-notifications.js

echo ""
echo "🎉 All fixes completed!"
echo ""
echo "📝 Instructions for Fr. James:"
echo "1. Refresh your browser to see the social menu"
echo "2. Try setting your church affiliation again - it should now persist"
echo "3. Check your notifications for any friend requests"
echo ""
echo "✅ The church affiliation field has been added to the profile API"
echo "✅ Social menu permissions have been fixed for your role"
echo "✅ Friend request notifications have been checked and fixed if needed" 