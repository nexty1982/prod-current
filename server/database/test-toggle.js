// Test script to check user toggle functionality
const http = require('http');

console.log('🔧 Testing User Toggle Functionality');
console.log('=====================================');

// First, get the list of users
function getUsers() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '192.168.1.239',
            port: 80,
            path: '/admin/users',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

// Test toggle functionality
function toggleUser(userId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '192.168.1.239',
            port: 80,
            path: `/admin/users/${userId}/toggle-status`,
            method: 'PUT'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({ status: res.statusCode, response });
                } catch (err) {
                    resolve({ status: res.statusCode, response: data });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

// Run the test
async function runTest() {
    try {
        console.log('1. Getting users list...');
        const usersData = await getUsers();

        if (usersData.success && usersData.users.length > 0) {
            console.log(`✅ Found ${usersData.users.length} users`);

            // Find a user to test with (not the super admin)
            const testUser = usersData.users.find(u => u.role !== 'super_admin') || usersData.users[usersData.users.length - 1];

            console.log(`\n2. Testing toggle for user: ${testUser.email} (ID: ${testUser.id})`);
            console.log(`   Current status: ${testUser.is_active ? 'Active' : 'Inactive'}`);

            const toggleResult = await toggleUser(testUser.id);
            console.log(`   Toggle result - Status: ${toggleResult.status}`);
            console.log(`   Response:`, toggleResult.response);

            // Check the user status after toggle
            console.log('\n3. Checking user status after toggle...');
            const usersDataAfter = await getUsers();
            const updatedUser = usersDataAfter.users.find(u => u.id === testUser.id);

            if (updatedUser) {
                console.log(`   Updated status: ${updatedUser.is_active ? 'Active' : 'Inactive'}`);

                if (updatedUser.is_active !== testUser.is_active) {
                    console.log('✅ Toggle functionality is working!');
                } else {
                    console.log('❌ Toggle functionality is NOT working - status did not change');
                }
            }
        } else {
            console.log('❌ No users found');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

runTest();
