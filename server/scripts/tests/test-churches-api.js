// Test script to debug church API endpoints
const axios = require('axios');

async function testChurchesAPI() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🔍 Testing Churches API Endpoints\n');
    
    // Test 1: Debug endpoint (already working)
    try {
        const debugResponse = await axios.get(`${baseURL}/api/debug/churches`);
        console.log('✅ Debug endpoint:', debugResponse.data);
    } catch (error) {
        console.error('❌ Debug endpoint failed:', error.message);
    }
    
    // Test 2: Main churches endpoint (this is what the frontend uses)
    try {
        const churchesResponse = await axios.get(`${baseURL}/api/churches`);
        console.log('✅ Churches endpoint success:', churchesResponse.data);
    } catch (error) {
        console.error('❌ Churches endpoint failed:');
        console.error('   Status:', error.response?.status);
        console.error('   Message:', error.response?.data?.error || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 This is likely an authentication issue.');
            console.log('   The frontend needs to be logged in to access this endpoint.');
        }
    }
    
    // Test 3: Try without auth (if there's a public endpoint)
    try {
        const publicResponse = await axios.get(`${baseURL}/churches`);
        console.log('✅ Public churches endpoint:', publicResponse.data);
    } catch (error) {
        console.error('❌ Public churches endpoint failed:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    // Test 4: Check what routes are actually available
    try {
        console.log('\n🔍 Testing route availability...');
        
        // Test the admin churches route
        const adminResponse = await axios.get(`${baseURL}/api/admin/churches`);
        console.log('✅ Admin churches endpoint:', adminResponse.data);
    } catch (error) {
        console.error('❌ Admin churches endpoint failed:', error.response?.status, error.response?.data?.error || error.message);
    }
}

testChurchesAPI();
