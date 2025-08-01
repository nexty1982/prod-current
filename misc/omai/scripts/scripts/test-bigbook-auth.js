#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 BigBook Authentication Test');
console.log('================================');

async function testBigBookAuth() {
  const fetch = (await import('node-fetch')).default;
  
  const baseUrl = 'http://localhost:3001';
  const testEndpoints = [
    '/api/bigbook/files',
    '/api/bigbook/addons',
    '/api/bigbook/upload-parish-map'
  ];
  
  console.log('📡 Testing BigBook endpoints...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`🔗 Testing: ${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // No cookies in Node.js test - this will fail authentication
        }
      });
      
      const data = await response.text();
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('   ✅ Authentication required (expected)');
      } else if (response.status === 200) {
        console.log('   ⚠️  No authentication required (unexpected)');
      } else {
        console.log(`   ❓ Unexpected status: ${response.status}`);
      }
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.error) {
          console.log(`   Error: ${jsonData.error}`);
        }
      } catch (e) {
        // Not JSON, show first 100 chars
        console.log(`   Response: ${data.substring(0, 100)}...`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

async function checkServerStatus() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3001/', {
      method: 'GET',
      timeout: 5000
    });
    
    const data = await response.json();
    console.log('🖥️  Server Status:', data.status);
    console.log('📅 Server Time:', new Date().toISOString());
    console.log('');
    
    return true;
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    console.log('💡 Make sure server is running: npm start');
    console.log('');
    return false;
  }
}

async function main() {
  const serverUp = await checkServerStatus();
  
  if (serverUp) {
    await testBigBookAuth();
    
    console.log('🧪 Browser Authentication Test:');
    console.log('================================');
    console.log('1. Open browser to: http://localhost:3001/admin/login');
    console.log('2. Login as super_admin');
    console.log('3. Go to: http://localhost:3001/admin/bigbook');
    console.log('4. Open browser dev tools (F12)');
    console.log('5. Check Console tab for any errors');
    console.log('6. In Network tab, try uploading Parish Map zip');
    console.log('7. Look for the request to /api/bigbook/upload-parish-map');
    console.log('8. Check if cookies are being sent with the request');
    console.log('');
    console.log('🔍 If authentication still fails:');
    console.log('   - Try logging out and logging back in');
    console.log('   - Clear browser cookies for localhost:3001');
    console.log('   - Restart the server and try again');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testBigBookAuth, checkServerStatus }; 