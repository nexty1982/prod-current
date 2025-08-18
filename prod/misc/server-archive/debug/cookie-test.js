// server/debug/cookie-test.js
const axios = require('axios');

async function testCookieFlow() {
  console.log('🍪 Testing Cookie Flow');
  console.log('======================');

  const baseURL = 'https://orthodoxmetrics.com';
  
  try {
    // Step 1: Login and capture cookies
    console.log('\n1. 🔐 Testing login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'superadmin@orthodoxmetrics.com',
      password: 'Admin123!' // Replace with actual password
    }, {
      withCredentials: true,
      timeout: 10000
    });

    console.log('✅ Login response status:', loginResponse.status);
    console.log('✅ Login response data:', loginResponse.data);
    
    // Check if cookies were set
    const setCookieHeaders = loginResponse.headers['set-cookie'];
    if (setCookieHeaders) {
      console.log('✅ Cookies set by server:');
      setCookieHeaders.forEach(cookie => {
        console.log('   ', cookie);
      });
    } else {
      console.log('❌ No cookies set by server');
    }

    // Step 2: Make an authenticated request
    console.log('\n2. 🔐 Testing authenticated request...');
    
    // Create a new axios instance with the cookies
    const authenticatedAxios = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 10000
    });

    const authCheckResponse = await authenticatedAxios.get('/api/auth/check');
    
    console.log('✅ Auth check response status:', authCheckResponse.status);
    console.log('✅ Auth check response data:', authCheckResponse.data);

    // Step 3: Test User Management endpoint
    console.log('\n3. 👥 Testing User Management endpoint...');
    
    const usersResponse = await authenticatedAxios.get('/api/admin/users');
    
    console.log('✅ Users response status:', usersResponse.status);
    console.log('✅ Users response data (first 100 chars):', 
      JSON.stringify(usersResponse.data).substring(0, 100) + '...');

    console.log('\n🎉 All tests passed! Cookie flow is working correctly.');

  } catch (error) {
    console.error('\n❌ Cookie test failed:');
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }

    console.log('\n🔍 Debugging suggestions:');
    console.log('1. Check if server is running and accessible');
    console.log('2. Verify login credentials are correct');
    console.log('3. Check server logs for authentication errors');
    console.log('4. Verify CORS and session configuration');
  }
}

testCookieFlow(); 