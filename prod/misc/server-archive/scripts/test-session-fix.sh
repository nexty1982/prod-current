#!/bin/bash

# ==============================================================================
# Test HTTPS Session Fix Script  
# ==============================================================================
# This script tests if the HTTPS session authentication fix is working
# 
# Usage: ./test-session-fix.sh
# ==============================================================================

echo "🧪 Testing HTTPS Session Authentication Fix"
echo "=========================================="

# Test 1: Check if server is responding
echo ""
echo "Test 1: Server Health Check"
echo "---------------------------"
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding"
    exit 1
fi

# Test 2: Check session configuration 
echo ""
echo "Test 2: Session Configuration"
echo "-----------------------------"
if grep -q "secure: isHTTPS" config/session.js; then
    echo "✅ Session config updated for HTTPS"
else
    echo "❌ Session config not updated"
fi

if grep -q "domain: isProduction" config/session.js; then
    echo "✅ Domain configuration updated"
else
    echo "❌ Domain configuration not updated"
fi

# Test 3: Test auth endpoint
echo ""
echo "Test 3: Authentication Endpoint"
echo "-------------------------------"
auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" https://orthodoxmetrics.com/api/auth/check 2>/dev/null || echo "HTTPSTATUS:000")
auth_status=$(echo "$auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

if [ "$auth_status" = "401" ]; then
    echo "✅ Auth endpoint correctly returns 401 (not authenticated)"
else
    echo "⚠️ Auth endpoint returned status: $auth_status"
fi

# Test 4: Check if response has proper API v2 format
echo ""
echo "Test 4: API v2 Response Format"
echo "------------------------------"
response_body=$(echo "$auth_response" | sed 's/HTTPSTATUS:[0-9]*$//')
if echo "$response_body" | grep -q '"error".*"code"'; then
    echo "✅ API returns proper v2 error format"
else
    echo "⚠️ API response format may not be v2 compliant"
fi

# Test 5: Check session database
echo ""
echo "Test 5: Session Database"
echo "-----------------------"
session_count=$(mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -sN -e "SELECT COUNT(*) FROM sessions;" 2>/dev/null || echo "0")
echo "Sessions in database: $session_count"

if [ "$session_count" -gt 0 ]; then
    echo "✅ Sessions are being stored in database"
else
    echo "⚠️ No sessions found in database"
fi

# Test 6: Check PM2 status
echo ""
echo "Test 6: PM2 Backend Status"
echo "--------------------------"
if pm2 list | grep -q "orthodox-backend.*online"; then
    echo "✅ Backend is running in PM2"
else
    echo "❌ Backend is not running properly in PM2"
fi

echo ""
echo "🎯 Test Summary"
echo "==============="
echo ""
echo "If all tests pass, try the following:"
echo ""
echo "1. 🧹 CLEAR BROWSER COOKIES (very important!):"
echo "   - Open browser dev tools (F12)"
echo "   - Go to Application > Storage" 
echo "   - Right-click on orthodoxmetrics.com > Clear"
echo "   - Or use browser settings to clear cookies"
echo ""
echo "2. 🔐 LOGIN AGAIN:"
echo "   - Go to https://orthodoxmetrics.com"
echo "   - Login with your credentials"
echo "   - Check if session persists after page refresh"
echo ""
echo "3. 🔍 VERIFY SECURE COOKIES:"
echo "   - After login, open dev tools (F12)"
echo "   - Go to Application > Cookies > orthodoxmetrics.com"
echo "   - Look for 'orthodox.sid' cookie"
echo "   - Verify: Secure=true, Domain=.orthodoxmetrics.com"
echo ""
echo "4. 📊 MONITOR SESSION LOGS:"
echo "   tail -f logs/auth.log | grep -E '(🔐|Auth middleware)'"
echo ""

if [ "$auth_status" = "401" ] && [ "$session_count" -gt 0 ]; then
    echo "✅ HTTPS Session fix appears to be working!"
    echo "   Clear browser cookies and try logging in again."
else
    echo "⚠️ Some issues detected - check the test results above"
fi 