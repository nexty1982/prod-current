#!/bin/bash

# ==============================================================================
# Test User Management Endpoint - Diagnostic Script
# ==============================================================================
# This script tests the /api/admin/users endpoint to identify why it's failing
# ==============================================================================

echo "🧪 Testing User Management Endpoint"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Step 1: Testing endpoint without authentication"
response_code=$(curl -s -w "%{http_code}" -o /dev/null https://orthodoxmetrics.com/api/admin/users)
echo "Response code: $response_code"

if [ "$response_code" = "401" ]; then
    echo -e "${GREEN}✅ Expected 401 - Authentication required${NC}"
else
    echo -e "${RED}❌ Unexpected response: $response_code${NC}"
fi

echo ""
echo "🔍 Step 2: Testing server health"
health_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/health -o /dev/null)
echo "Health check response: $health_response"

if [ "$health_response" = "200" ]; then
    echo -e "${GREEN}✅ Server is healthy${NC}"
else
    echo -e "${RED}❌ Server health issue: $health_response${NC}"
fi

echo ""
echo "🔍 Step 3: Testing route mounting"
echo "Testing if admin routes are mounted correctly..."

# Test other admin routes
echo "Testing /api/admin/churches..."
churches_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/churches -o /dev/null)
echo "Churches response: $churches_response"

echo "Testing our new modular routes..."
church_users_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/church-users/1 -o /dev/null)
echo "Church users response: $church_users_response"

church_db_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/church-database/1/tables -o /dev/null)
echo "Church database response: $church_db_response"

echo ""
echo "🔍 Step 4: Check server logs for errors"
echo "Checking recent PM2 logs..."
pm2 logs orthodox-backend --lines 20 | tail -10

echo ""
echo "🔍 Step 5: Test database connectivity"
echo "Testing database connection..."

# Create a simple Node.js test script
cat > /tmp/test_db.js << 'EOF'
const { promisePool } = require('./config/db');
const DatabaseService = require('./services/databaseService');

async function testDbConnection() {
    try {
        console.log('Testing platform database connection...');
        const [result] = await promisePool.execute('SELECT COUNT(*) as count FROM users');
        console.log('✅ Platform DB connected. User count:', result[0].count);
        
        console.log('Testing DatabaseService.queryPlatform...');
        const usersResult = await DatabaseService.queryPlatform('SELECT COUNT(*) as count FROM users');
        console.log('✅ DatabaseService working. User count:', usersResult[0][0].count);
        
        console.log('Testing users query...');
        const testQuery = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                u.is_locked,
                c.name as church_name
            FROM users u
            LEFT JOIN churches c ON u.church_id = c.id
            ORDER BY u.email
            LIMIT 5
        `;
        const usersData = await DatabaseService.queryPlatform(testQuery);
        console.log('✅ User query successful. Sample data:', usersData[0].slice(0, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        process.exit(1);
    }
}

testDbConnection();
EOF

echo "Running database test..."
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
timeout 10s node /tmp/test_db.js

echo ""
echo "🔍 Step 6: Test authentication middleware"
echo "Checking middleware files..."

if [ -f "middleware/auth.js" ]; then
    echo "✅ Auth middleware exists"
    echo "requireRole function lines:"
    grep -n "requireRole" middleware/auth.js | head -3
else
    echo "❌ Auth middleware missing"
fi

echo ""
echo "🔍 Step 7: Test route file exists and is valid"
if [ -f "routes/admin/users.js" ]; then
    echo "✅ User routes file exists"
    echo "File size: $(wc -c < routes/admin/users.js) bytes"
    echo "Lines: $(wc -l < routes/admin/users.js)"
    
    # Test JavaScript syntax
    if node -c routes/admin/users.js 2>/dev/null; then
        echo "✅ JavaScript syntax is valid"
    else
        echo "❌ JavaScript syntax error:"
        node -c routes/admin/users.js
    fi
else
    echo "❌ User routes file missing"
fi

echo ""
echo "🔍 Step 8: Check index.js route mounting"
if grep -q "'/api/admin/users', usersRouter" index.js; then
    echo "✅ User routes are mounted in index.js"
    echo "Route mounting line:"
    grep -n "'/api/admin/users'" index.js
else
    echo "❌ User routes not properly mounted"
fi

echo ""
echo "🔍 Summary:"
echo "==========="
echo "1. Endpoint authentication: Expected 401 ✓"
echo "2. Server health: $health_response"
echo "3. Route responses: users=401, churches=$churches_response"
echo "4. Modular routes: church-users=$church_users_response, church-db=$church_db_response"

# Clean up
rm -f /tmp/test_db.js

echo ""
echo -e "${BLUE}🎯 Next steps based on results above:${NC}"
echo "   - If DB test fails → Database connection issue"
echo "   - If syntax invalid → Code error in routes"
echo "   - If route not mounted → Route registration issue"
echo "   - If all pass → Session/auth issue in frontend" 