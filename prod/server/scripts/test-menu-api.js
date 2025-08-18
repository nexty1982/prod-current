// Test script for menu permissions API
const axios = require('axios');

async function testMenuAPI() {
  const baseURL = process.env.API_URL || 'http://localhost:3001';
  
  console.log('🧪 Testing Menu Permissions API...');
  console.log('Base URL:', baseURL);
  
  try {
    // Test the items endpoint
    console.log('\n📋 Testing /api/menu-permissions/items endpoint...');
    const response = await axios.get(`${baseURL}/api/menu-permissions/items`, {
      // You may need to add authentication headers here
      headers: {
        // Add session cookie or auth token if needed
        'Cookie': process.env.AUTH_COOKIE || ''
      }
    });
    
    console.log('✅ Success! Response status:', response.status);
    console.log('Menu items count:', response.data.data?.length || 0);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 404) {
        console.error('\n⚠️  The API endpoint was not found. Possible issues:');
        console.error('   1. Server needs to be restarted after route changes');
        console.error('   2. The route is not properly registered');
        console.error('   3. There may be a conflicting route');
      } else if (error.response.status === 401) {
        console.error('\n⚠️  Authentication required. You need to:');
        console.error('   1. Be logged in');
        console.error('   2. Pass valid session cookie or auth token');
      } else if (error.response.status === 403) {
        console.error('\n⚠️  Access forbidden. You need to:');
        console.error('   1. Be logged in as a super_admin');
      }
    } else {
      console.error('❌ Network error:', error.message);
      console.error('\n⚠️  Could not connect to server. Make sure:');
      console.error('   1. The server is running');
      console.error('   2. The correct port is being used');
      console.error('   3. The API_URL environment variable is set correctly');
    }
  }
}

// Run the test
testMenuAPI().catch(console.error);
