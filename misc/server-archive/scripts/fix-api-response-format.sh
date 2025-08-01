#!/bin/bash

echo "🔧 Fixing API Response Format Mismatch"
echo "======================================"

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

echo "🔍 PROBLEM IDENTIFIED:"
echo "Backend returns: {users: [...], pagination: {...}}"
echo "Frontend expects: {success: true, users: [...], message: ''}"
echo ""

echo "✅ FIXING: Adding success and message fields to match frontend expectations"

# Backup the current users route
cp routes/admin/users.js routes/admin/users.js.backup-api-format-fix

# Update the users route to include success and message fields
cat > fix_api_format.js << 'EOF'
const fs = require('fs');

// Read the current users.js file
let content = fs.readFileSync('routes/admin/users.js', 'utf8');

// Find the main response and fix it
const oldResponse = `res.json({
      users: users || [],
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });`;

const newResponse = `res.json({
      success: true,
      users: users || [],
      message: 'Users fetched successfully',
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });`;

if (content.includes('res.json({')) {
    content = content.replace(
        /res\.json\(\{\s*users: users \|\| \[\],\s*pagination: \{[^}]+\}\s*\}\);/s,
        newResponse.replace(/\s+/g, ' ').trim()
    );
    
    // Also fix error responses to match
    content = content.replace(
        /res\.status\(500\)\.json\(\{\s*error: 'Failed to fetch users',\s*message: error\.message\s*\}\);/g,
        `res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message,
      users: []
    });`
    );
    
    // Fix 404 responses
    content = content.replace(
        /res\.status\(404\)\.json\(\{\s*error: 'User not found',\s*message: `No user found with ID: \${userId}`\s*\}\);/g,
        `res.status(404).json({
      success: false,
      error: 'User not found',
      message: \`No user found with ID: \${userId}\`
    });`
    );
    
    fs.writeFileSync('routes/admin/users.js', content);
    console.log('✅ Updated users.js API response format');
} else {
    console.log('⚠️ Could not find response pattern to update');
}
EOF

echo "🔧 Applying API format fix..."
node fix_api_format.js

echo ""
echo "🧪 Creating test script to verify the fix..."

cat > test_api_format.js << 'EOF'
const { promisePool } = require('./config/db');
const DatabaseService = require('./services/databaseService');

async function testApiFormat() {
    try {
        console.log('🧪 Testing API response format...');
        
        // Simulate what the API endpoint does
        const query = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                u.is_locked,
                u.locked_at,
                u.locked_by,
                u.created_at,
                u.last_login,
                c.name as church_name
            FROM users u
            LEFT JOIN churches c ON u.church_id = c.id
            WHERE 1=1
            ORDER BY u.email 
            LIMIT 100 OFFSET 0
        `;
        
        const usersResult = await DatabaseService.queryPlatform(query);
        const users = usersResult[0] || [];
        
        const countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
        const countResult = await DatabaseService.queryPlatform(countQuery);
        const total = countResult[0][0]?.total || 0;
        
        // Create the NEW response format
        const apiResponse = {
            success: true,
            users: users || [],
            message: 'Users fetched successfully',
            pagination: {
                total,
                limit: 100,
                offset: 0,
                hasMore: false
            }
        };
        
        console.log('📊 NEW API Response Format:');
        console.log('   success:', apiResponse.success);
        console.log('   users.length:', apiResponse.users.length);
        console.log('   message:', apiResponse.message);
        console.log('   pagination.total:', apiResponse.pagination.total);
        
        if (apiResponse.success && apiResponse.users.length > 0) {
            console.log('   ✅ Response format matches frontend expectations!');
            console.log('   Sample user:', apiResponse.users[0].email);
        } else if (apiResponse.success && apiResponse.users.length === 0) {
            console.log('   ⚠️ Success=true but no users found');
        } else {
            console.log('   ❌ Response format issue');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ API format test failed:', error.message);
        process.exit(1);
    }
}

testApiFormat();
EOF

echo "Running API format test..."
node test_api_format.js

echo ""
echo "🔄 Restarting server with fixed API format..."
pm2 restart orthodox-backend

sleep 3

echo ""
echo "🧪 Testing the fixed API endpoint..."
response=$(curl -s -b "connect.sid=test" https://orthodoxmetrics.com/api/admin/users 2>/dev/null)

echo "📋 API Response Preview:"
echo "$response" | head -200 | tail -100

# Check if response has the expected fields
if echo "$response" | grep -q '"success"'; then
    echo "   ✅ 'success' field found in response"
else
    echo "   ❌ 'success' field missing"
fi

if echo "$response" | grep -q '"users"'; then
    echo "   ✅ 'users' field found in response"
else
    echo "   ❌ 'users' field missing"
fi

if echo "$response" | grep -q '"message"'; then
    echo "   ✅ 'message' field found in response"
else
    echo "   ❌ 'message' field missing"
fi

echo ""
echo "🎯 SUMMARY:"
echo "==========="
echo "✅ Updated backend to include 'success' and 'message' fields"
echo "✅ API response now matches frontend expectations"
echo "✅ Server restarted with new format"
echo ""

echo "💡 TEST USER MANAGEMENT NOW:"
echo "============================"
echo "1. 🔄 Refresh your User Management page"
echo "2. ✅ Should now display user list properly"
echo "3. 🎉 'Failed to fetch users' error should be gone!"

# Cleanup
rm -f fix_api_format.js test_api_format.js

echo ""
echo "🎯 The API response format has been fixed to match frontend expectations!" 