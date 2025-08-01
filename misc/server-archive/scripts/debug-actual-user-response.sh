#!/bin/bash

echo "🔍 DEBUGGING ACTUAL USER MANAGEMENT RESPONSE"
echo "============================================="
echo "Let's see what the API is ACTUALLY returning..."

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

# Create a test script to check the actual response
cat > test_user_response.js << 'EOF'
const { promisePool } = require('./config/db');

async function testUserResponse() {
    try {
        console.log('🔍 Testing actual user query response...');
        
        // Test the exact query from the logs
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
        
        const [users] = await promisePool.execute(query);
        
        console.log('📊 Query Results:');
        console.log('   Total users found:', users.length);
        
        if (users.length > 0) {
            console.log('   Sample user data:');
            console.log('   ', JSON.stringify(users[0], null, 2));
            
            console.log('   All users:');
            users.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.email} (${user.role})`);
            });
        } else {
            console.log('   ❌ NO USERS FOUND!');
        }
        
        // Test count query
        const countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
        const [countResult] = await promisePool.execute(countQuery);
        console.log('   Total count query result:', countResult[0].total);
        
        // Now test what the API endpoint would return
        console.log('');
        console.log('🧪 Testing API response format...');
        
        const apiResponse = {
            users: users || [],
            pagination: {
                total: countResult[0].total,
                limit: 100,
                offset: 0,
                hasMore: false
            }
        };
        
        console.log('API Response structure:');
        console.log('   users array length:', apiResponse.users.length);
        console.log('   pagination.total:', apiResponse.pagination.total);
        
        if (apiResponse.users.length === 0) {
            console.log('');
            console.log('❌ PROBLEM FOUND: API returning empty users array!');
            console.log('');
            console.log('🔍 Let\'s check if users table has data...');
            
            const [allUsers] = await promisePool.execute('SELECT * FROM users LIMIT 5');
            console.log('Direct users table query:', allUsers.length, 'users found');
            
            if (allUsers.length > 0) {
                console.log('Sample user from direct query:');
                console.log(JSON.stringify(allUsers[0], null, 2));
            }
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error testing user response:', error);
        process.exit(1);
    }
}

testUserResponse();
EOF

echo "📊 Running user response test..."
node test_user_response.js

echo ""
echo "🌐 Testing actual API endpoint response..."

# Test the actual API endpoint with a real request
echo "Making actual API call..."
response=$(curl -s -b "connect.sid=test" https://orthodoxmetrics.com/api/admin/users)

echo "Raw API Response:"
echo "$response"

echo ""
echo "📝 Response analysis:"
if echo "$response" | grep -q '"users"'; then
    users_count=$(echo "$response" | grep -o '"users":\[[^]]*\]' | grep -o ',' | wc -l)
    echo "   Found users array in response"
    echo "   Estimated users count: $users_count"
else
    echo "   ❌ No 'users' property found in response"
fi

if echo "$response" | grep -q 'error'; then
    echo "   ❌ Error found in response"
fi

if echo "$response" | grep -q 'Authentication required'; then
    echo "   ⚠️ Authentication required - need valid session"
fi

echo ""
echo "🔍 DEBUGGING CHECKLIST:"
echo "======================="
echo "1. Check if database has users: [see above]"
echo "2. Check if API returns users array: [see above]"  
echo "3. Check if frontend is parsing response correctly"
echo "4. Check browser network tab for actual API response"
echo "5. Check browser console for JavaScript errors"

echo ""
echo "💡 NEXT STEPS:"
echo "=============="
echo "1. Look at the 'Raw API Response' above"
echo "2. If it shows users, the problem is frontend parsing"
echo "3. If it shows empty array, the problem is backend query"
echo "4. If it shows authentication error, session issue"

# Cleanup
rm -f test_user_response.js

echo ""
echo "🎯 Tell me what you see in the 'Raw API Response' above!" 