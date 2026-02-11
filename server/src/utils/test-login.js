#!/usr/bin/env node

/**
 * Test the login functionality after fixing the auth routes
 */

const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🧪 Testing login functionality...');
    
    // Test login
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin@orthodoxmetrics.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ Login successful!');
      console.log('👤 User:', loginData.user);
    } else {
      console.log('❌ Login failed:', loginData);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testLogin();
