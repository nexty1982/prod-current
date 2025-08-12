// server/scripts/test-church-api.js
// Test script to debug church API issues

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testChurchAPI() {
  console.log('🔍 Testing Church API...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/churches`);
    console.log('✅ Church API Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.churches) {
      console.log(`🏛️ Found ${response.data.churches.length} churches`);
      response.data.churches.forEach((church, index) => {
        console.log(`   ${index + 1}. ${church.name} (${church.church_id}) - Active: ${church.is_active}`);
      });
    } else if (Array.isArray(response.data)) {
      console.log(`🏛️ Found ${response.data.length} churches (direct array)`);
      response.data.forEach((church, index) => {
        console.log(`   ${index + 1}. ${church.name} (${church.church_id}) - Active: ${church.is_active}`);
      });
    } else {
      console.log('❌ Unexpected response format');
    }
    
  } catch (error) {
    console.error('❌ Error testing church API:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Test database direct query
async function testDatabaseQuery() {
  console.log('\n🗄️ Testing Database Query...');
  
  try {
    const { promisePool } = require('../../config/db');
    
    const [churches] = await promisePool.query(`
      SELECT 
        id, church_id, name, email, is_active, created_at
      FROM church_info 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Database Query Successful - Found ${churches.length} churches`);
    churches.forEach((church, index) => {
      console.log(`   ${index + 1}. ${church.name} (${church.church_id}) - Active: ${church.is_active} - Created: ${church.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
  }
}

async function runTests() {
  await testDatabaseQuery();
  await testChurchAPI();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testChurchAPI, testDatabaseQuery };
