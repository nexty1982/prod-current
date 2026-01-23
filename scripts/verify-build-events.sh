#!/bin/bash
#
# Verification script for build events system
# Tests endpoints and verifies functionality
#

set -e

BASE_URL="${OM_BUILD_EVENT_URL:-http://127.0.0.1:3001}"
TOKEN="${OM_BUILD_EVENT_TOKEN}"

echo "═══════════════════════════════════════════════════════════"
echo "🔍 Build Events System Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check 1: Database tables exist
echo "1️⃣  Checking database tables..."
if mysql -u orthodoxapps -p"${DB_PASSWORD:-}" orthodoxmetrics_db -e "SELECT COUNT(*) FROM build_runs;" > /dev/null 2>&1; then
    echo "   ✅ build_runs table exists"
else
    echo "   ❌ build_runs table missing - run migration first"
    exit 1
fi

if mysql -u orthodoxapps -p"${DB_PASSWORD:-}" orthodoxmetrics_db -e "SELECT COUNT(*) FROM build_run_events;" > /dev/null 2>&1; then
    echo "   ✅ build_run_events table exists"
else
    echo "   ❌ build_run_events table missing - run migration first"
    exit 1
fi
echo ""

# Check 2: Token is set
echo "2️⃣  Checking environment..."
if [ -z "$TOKEN" ]; then
    echo "   ⚠️  OM_BUILD_EVENT_TOKEN not set"
    echo "   Set it with: export OM_BUILD_EVENT_TOKEN=your-token"
else
    echo "   ✅ OM_BUILD_EVENT_TOKEN is set"
fi
echo ""

# Check 3: Backend is running
echo "3️⃣  Checking backend availability..."
if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/admin/_routes" | grep -q "200\|401\|403"; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is not responding"
    exit 1
fi
echo ""

# Check 4: Internal endpoint (with token)
if [ -n "$TOKEN" ]; then
    echo "4️⃣  Testing internal build-events endpoint..."
    TEST_RUN_ID="test-$(date +%s)"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/internal/build-events" \
        -H "Content-Type: application/json" \
        -H "X-OM-BUILD-TOKEN: ${TOKEN}" \
        -d "{
            \"runId\": \"${TEST_RUN_ID}\",
            \"event\": \"build_started\",
            \"env\": \"prod\",
            \"origin\": \"server\",
            \"command\": \"npm run build:deploy\",
            \"host\": \"$(hostname)\",
            \"pid\": $$"
    )
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Internal endpoint working"
        echo "   Response: $BODY"
    else
        echo "   ❌ Internal endpoint failed (HTTP $HTTP_CODE)"
        echo "   Response: $BODY"
    fi
    echo ""
fi

# Check 5: Build status endpoint (requires admin session)
echo "5️⃣  Testing build-status endpoint..."
echo "   ⚠️  Requires admin session - test manually:"
echo "   curl -b cookies.txt ${BASE_URL}/api/admin/build-status"
echo ""

# Check 6: Verify build script has emitter
echo "6️⃣  Checking build script integration..."
if grep -q "build-event-emitter" /var/www/orthodoxmetrics/prod/server/scripts/build-all.js 2>/dev/null; then
    echo "   ✅ build-all.js includes build-event-emitter"
else
    echo "   ❌ build-all.js missing build-event-emitter import"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ Verification Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Set OM_BUILD_EVENT_TOKEN in server/.env"
echo "2. Rebuild backend: cd server && npm run build"
echo "3. Restart PM2: pm2 restart orthodox-backend"
echo "4. Run a build: npm run build:deploy"
echo "5. Check notifications as admin user"
echo ""
