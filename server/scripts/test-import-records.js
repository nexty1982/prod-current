// server/scripts/test-import-records.js
// Test script for the new JSON import functionality

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const TEST_DATA_DIR = path.join(__dirname, '../../test-data');

// Test data file paths
const testFiles = {
  baptism: path.join(TEST_DATA_DIR, 'baptism-records-sample.json'),
  marriage: path.join(TEST_DATA_DIR, 'marriage-records-sample.json'),
  funeral: path.join(TEST_DATA_DIR, 'funeral-records-sample.json')
};

/**
 * Test the sample JSON endpoints
 */
async function testSampleEndpoints() {
  console.log('\n📋 Testing Sample JSON Endpoints...');
  
  for (const recordType of ['baptism', 'marriage', 'funeral']) {
    try {
      const response = await axios.get(`${BASE_URL}/api/records/sample/${recordType}`);
      
      if (response.data.success) {
        console.log(`✅ ${recordType.toUpperCase()} sample endpoint working`);
        console.log(`   - Required fields: ${response.data.requiredFields.join(', ')}`);
        console.log(`   - Optional fields: ${response.data.optionalFields.join(', ')}`);
        console.log(`   - Max records: ${response.data.maxRecordsPerImport}`);
      } else {
        console.log(`❌ ${recordType.toUpperCase()} sample endpoint failed`);
      }
    } catch (error) {
      console.log(`❌ ${recordType.toUpperCase()} sample endpoint error:`, error.message);
    }
  }
}

/**
 * Test church listing endpoint
 */
async function testChurchesEndpoint() {
  console.log('\n🏛️ Testing Churches Endpoint...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/churches`);
    
    if (response.data.success && response.data.churches) {
      console.log(`✅ Churches endpoint working - Found ${response.data.churches.length} churches`);
      
      const activeChurches = response.data.churches.filter(church => church.is_active);
      console.log(`   - Active churches: ${activeChurches.length}`);
      
      if (activeChurches.length > 0) {
        console.log(`   - Sample church: ${activeChurches[0].name} (ID: ${activeChurches[0].id})`);
        return activeChurches[0].id; // Return first church ID for testing
      }
    } else {
      console.log('❌ Churches endpoint failed or no churches found');
    }
  } catch (error) {
    console.log('❌ Churches endpoint error:', error.message);
  }
  
  return null;
}

/**
 * Test import functionality with sample data
 */
async function testImportFunctionality(churchId) {
  if (!churchId) {
    console.log('❌ Cannot test import - no church ID available');
    return;
  }

  console.log(`\n📤 Testing Import Functionality with Church ID: ${churchId}...`);
  
  for (const [recordType, filePath] of Object.entries(testFiles)) {
    try {
      // Check if test file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Test file not found: ${filePath}`);
        continue;
      }

      // Read and parse test data
      const testData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`\n🧪 Testing ${recordType.toUpperCase()} import...`);
      console.log(`   - File: ${path.basename(filePath)}`);
      console.log(`   - Records: ${testData.length}`);

      // Prepare import request
      const importRequest = {
        churchId: churchId,
        recordType: recordType,
        records: testData
      };

      // NOTE: This would require authentication in a real scenario
      // For testing, we're assuming the server allows unauthenticated requests
      // or you need to modify this to include proper session/auth headers
      
      console.log('   - Sending import request...');
      console.log('   ⚠️  Note: This test requires proper authentication to work');
      console.log('   📝 Import request prepared with:');
      console.log(`      * Church ID: ${churchId}`);
      console.log(`      * Record Type: ${recordType}`);
      console.log(`      * Records Count: ${testData.length}`);
      console.log('   📋 Sample record preview:');
      console.log(JSON.stringify(testData[0], null, 4));
      
      // Uncomment the following lines to actually test the import
      // (requires proper authentication setup)
      /*
      const response = await axios.post(`${BASE_URL}/api/records/import`, importRequest);
      
      if (response.data.success) {
        console.log(`✅ ${recordType.toUpperCase()} import successful`);
        console.log(`   - Imported: ${response.data.inserted} records`);
        console.log(`   - Message: ${response.data.message}`);
      } else {
        console.log(`❌ ${recordType.toUpperCase()} import failed`);
        console.log(`   - Error: ${response.data.error}`);
      }
      */
      
    } catch (error) {
      console.log(`❌ ${recordType.toUpperCase()} import error:`, error.message);
      if (error.response?.data) {
        console.log('   - Server response:', error.response.data);
      }
    }
  }
}

/**
 * Validate JSON structure of test files
 */
function validateTestFiles() {
  console.log('\n🔍 Validating Test Data Files...');
  
  for (const [recordType, filePath] of Object.entries(testFiles)) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`❌ ${recordType.toUpperCase()}: File not found - ${filePath}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        console.log(`❌ ${recordType.toUpperCase()}: Not an array`);
        continue;
      }

      if (data.length === 0) {
        console.log(`❌ ${recordType.toUpperCase()}: Empty array`);
        continue;
      }

      // Check required fields
      let validRecords = 0;
      for (const record of data) {
        if (record.person_name || record.groom_name || record.bride_name) {
          validRecords++;
        }
      }

      console.log(`✅ ${recordType.toUpperCase()}: Valid JSON with ${data.length} records (${validRecords} valid)`);
      console.log(`   - File: ${path.basename(filePath)}`);
      console.log(`   - Size: ${(content.length / 1024).toFixed(1)} KB`);

    } catch (error) {
      console.log(`❌ ${recordType.toUpperCase()}: Invalid JSON - ${error.message}`);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Import Records API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📁 Test Data Directory: ${TEST_DATA_DIR}`);
  
  // Step 1: Validate test data files
  validateTestFiles();
  
  // Step 2: Test sample endpoints
  await testSampleEndpoints();
  
  // Step 3: Test churches endpoint and get church ID
  const churchId = await testChurchesEndpoint();
  
  // Step 4: Test import functionality (preparation only without auth)
  await testImportFunctionality(churchId);
  
  console.log('\n✨ Test Suite Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Set up proper authentication in your session');
  console.log('2. Use the frontend ImportRecordsButton component');
  console.log('3. Upload the test JSON files via the UI');
  console.log('4. Verify records are imported correctly in the database');
  console.log('\n📁 Available test files:');
  console.log('   - baptism-records-sample.json (5 records)');
  console.log('   - marriage-records-sample.json (5 records)');
  console.log('   - funeral-records-sample.json (5 records)');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testSampleEndpoints,
  testChurchesEndpoint,
  testImportFunctionality,
  validateTestFiles,
  runTests
};
