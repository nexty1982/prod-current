// Test script for church creation API endpoint
// Run this to verify the new church creation functionality

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001'; // Adjust if different port

// Sample church data for testing
const sampleChurch = {
  name: 'Holy Trinity Orthodox Cathedral',
  email: 'info@holytrinityorthodox.org',
  phone: '(555) 987-6543',
  website: 'https://holytrinityorthodox.org',
  address: '456 Cathedral Avenue',
  city: 'Chicago',
  state_province: 'Illinois',
  postal_code: '60601',
  country: 'United States',
  description: 'A beautiful Orthodox cathedral serving the Chicago community with traditional liturgy and modern outreach programs.',
  founded_year: 1898,
  language_preference: 'en',
  timezone: 'America/Chicago',
  currency: 'USD',
  tax_id: '12-3456789'
};

async function testChurchCreation() {
  console.log('🧪 Testing Church Creation API Endpoint');
  console.log('🔗 Server URL:', SERVER_URL);
  
  try {
    // Test 1: Valid church creation
    console.log('\n📋 Test 1: Creating valid church...');
    console.log('Sample data:', JSON.stringify(sampleChurch, null, 2));
    
    const response = await axios.post(`${SERVER_URL}/api/churches/create`, sampleChurch, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ Church creation successful!');
    console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Church creation failed:', error.response.status, error.response.statusText);
      console.log('📄 Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network error:', error.message);
      console.log('💡 Make sure the server is running on', SERVER_URL);
    }
  }
  
  try {
    // Test 2: Invalid data (missing required fields)
    console.log('\n📋 Test 2: Testing validation with missing required fields...');
    const invalidChurch = {
      name: 'Test Church',
      // Missing email, country, language_preference, timezone
    };
    
    const response2 = await axios.post(`${SERVER_URL}/api/churches/create`, invalidChurch, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('⚠️  Unexpected success - validation should have failed');
    
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Validation working correctly - rejected invalid data');
      console.log('📄 Validation errors:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  try {
    // Test 3: Duplicate church name
    console.log('\n📋 Test 3: Testing duplicate prevention...');
    
    const duplicateChurch = {
      ...sampleChurch,
      email: 'different@email.com' // Different email but same name
    };
    
    const response3 = await axios.post(`${SERVER_URL}/api/churches/create`, duplicateChurch, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('⚠️  Unexpected success - duplicate name should have been rejected');
    
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('✅ Duplicate prevention working correctly');
      console.log('📄 Conflict details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n🎉 Church creation API testing completed!');
  console.log('📌 Next steps:');
  console.log('   1. Test church creation through the frontend UI');
  console.log('   2. Verify church data appears in database');
  console.log('   3. Test church editing and management features');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testChurchCreation().catch(console.error);
}

module.exports = testChurchCreation;
