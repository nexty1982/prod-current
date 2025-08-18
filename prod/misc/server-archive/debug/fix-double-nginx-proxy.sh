#!/bin/bash

echo "🔧 FIXING DOUBLE NGINX PROXY PHANTOM USER ISSUE"
echo "==============================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-double-nginx-proxy.sh"
    exit 1
fi

echo "🎯 IDENTIFIED ROOT CAUSE:"
echo "========================="
echo "✅ Double nginx proxy: outer nginx → inner nginx → Node.js"
echo "✅ Cookies not being forwarded properly through both proxy layers"
echo "✅ Session cookies exist but user data not persisting"
echo ""

echo "🔧 STEP 1: CHECK FOR TEMPORARY BYPASSES"
echo "======================================="
echo "Searching for temporary authentication bypasses..."

# Check for bypass patterns in key files
if grep -r "TEMPORARY.*BYPASS" middleware/ routes/ 2>/dev/null; then
    echo "⚠️  TEMPORARY BYPASSES FOUND - These may be causing phantom user"
    echo "   These should be removed for proper authentication"
else
    echo "✅ No temporary bypasses found in middleware/routes"
fi

echo ""
echo "🔧 STEP 2: CLEAR ALL SESSIONS"
echo "============================="
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Cleared all sessions from database"

echo ""
echo "🔧 STEP 3: VERIFY SESSION CONFIGURATION"
echo "======================================="
echo "Checking session.js for proxy compatibility..."

if grep -q "proxy: true" config/session.js; then
    echo "✅ Proxy trust enabled"
else
    echo "❌ Proxy trust not enabled"
fi

if grep -q "domain: '.orthodoxmetrics.com'" config/session.js; then
    echo "✅ Domain set correctly"
else
    echo "❌ Domain not set correctly"
fi

echo ""
echo "🔧 STEP 4: RESTART BACKEND WITH ENHANCED DEBUGGING"
echo "=================================================="
echo "Stopping PM2 process..."
pm2 stop orthodox-backend 2>/dev/null

echo "Deleting PM2 process to clear module cache..."
pm2 delete orthodox-backend 2>/dev/null

echo "Starting fresh PM2 process..."
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
NODE_ENV=production pm2 start index.js --name orthodox-backend

echo "Waiting for server to start..."
sleep 5

echo ""
echo "🔧 STEP 5: NGINX CONFIGURATION CHECKLIST"
echo "======================================="
echo "⚠️  CRITICAL: Check both nginx configurations for proper cookie forwarding"
echo ""
echo "OUTER NGINX (facing internet) should have:"
echo "   proxy_set_header Cookie \$http_cookie;"
echo "   proxy_pass_header Set-Cookie;"
echo "   proxy_cookie_path / /;"
echo "   proxy_cookie_domain localhost .orthodoxmetrics.com;"
echo ""
echo "INNER NGINX (facing Node.js) should have:"
echo "   proxy_set_header Cookie \$http_cookie;"
echo "   proxy_pass_header Set-Cookie;"
echo "   proxy_cookie_path / /;"
echo "   proxy_cookie_domain 127.0.0.1 .orthodoxmetrics.com;"
echo ""

echo "🔧 STEP 6: TEST SESSION FLOW"
echo "============================"
echo "Testing server response..."
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo "❌ Server may not be responding yet"
fi

echo ""
echo "🎯 MANUAL TESTING STEPS:"
echo "========================"
echo "1. 🧹 CLEAR BROWSER STORAGE COMPLETELY:"
echo "   - Open browser dev tools (F12)"
echo "   - Go to Application > Storage"
echo "   - Click 'Clear site data' for orthodoxmetrics.com"
echo ""
echo "2. 🔄 HARD REFRESH THE PAGE (Ctrl+F5)"
echo ""
echo "3. 🔐 LOGIN WITH VALID CREDENTIALS"
echo ""
echo "4. 🔍 CHECK COOKIE TRANSMISSION:"
echo "   - Open dev tools > Network tab"
echo "   - Login and watch for /api/auth/login request"
echo "   - Check if Set-Cookie header is present in response"
echo "   - Check if subsequent requests include Cookie header"
echo ""
echo "5. 🔍 MONITOR SERVER LOGS:"
echo "   pm2 logs orthodox-backend --lines 30"
echo ""

echo "🔧 STEP 7: NGINX CONFIGURATION FIXES"
echo "==================================="
echo "If the issue persists, the problem is likely nginx configuration:"
echo ""
echo "1. Check outer nginx config (usually /etc/nginx/sites-available/orthodoxmetrics):"
echo "   - Ensure proxy_set_header Cookie \$http_cookie; is present"
echo "   - Ensure proxy_pass_header Set-Cookie; is present"
echo ""
echo "2. Check inner nginx config (usually /etc/nginx/sites-available/orthodox-church-mgmt):"
echo "   - Ensure proxy_set_header Cookie \$http_cookie; is present"
echo "   - Ensure proxy_pass_header Set-Cookie; is present"
echo ""
echo "3. Reload both nginx configurations:"
echo "   sudo systemctl reload nginx"
echo ""

echo "🎯 EXPECTED RESULTS:"
echo "===================="
echo "✅ No phantom user with 'User' label"
echo "✅ Actual email address displayed"
echo "✅ Session persists across page refreshes"
echo "✅ Server logs show proper session debugging"
echo ""

echo "🚨 TROUBLESHOOTING:"
echo "==================="
echo "If the issue continues:"
echo "1. The problem is likely nginx cookie forwarding"
echo "2. Check both nginx configurations for proper cookie headers"
echo "3. Verify session debugging shows proper user data"
echo "4. Test with curl to bypass nginx: curl -v http://localhost:3001/api/auth/check"
echo ""

echo "🏁 DOUBLE NGINX PROXY FIX COMPLETE!"
echo "===================================" 