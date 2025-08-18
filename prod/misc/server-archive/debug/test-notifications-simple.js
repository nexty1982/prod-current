const http = require('http');

async function testNotificationEndpoints() {
    console.log('🔍 Testing notification API endpoints...');
    
    // Test the notification endpoints without requiring database authentication
    const testEndpoints = [
        '/api/notifications',
        '/api/notifications/counts'
    ];
    
    for (const endpoint of testEndpoints) {
        try {
            console.log(`\n📡 Testing ${endpoint}...`);
            
            const options = {
                hostname: 'localhost',
                port: 3001, // Adjust if your server runs on a different port
                path: endpoint,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const response = await new Promise((resolve, reject) => {
                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve({ status: res.statusCode, data }));
                });
                req.on('error', reject);
                req.end();
            });
            
            console.log(`✅ ${endpoint} responded with status: ${response.status}`);
            if (response.status === 200 || response.status === 401) {
                console.log('👍 Endpoint is accessible');
            } else {
                console.log('⚠️  Unexpected status code');
            }
            
        } catch (error) {
            console.log(`❌ ${endpoint} failed:`, error.message);
        }
    }
    
    console.log('\n🎉 Notification API endpoint test completed!');
    console.log('\n💡 If you see 401 errors, that\'s normal - it means the endpoints are working but require authentication.');
    console.log('💡 The important thing is that the endpoints are accessible and not returning database errors.');
}

// Run the test
testNotificationEndpoints(); 