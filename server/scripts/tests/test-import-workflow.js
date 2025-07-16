// Test Import Workflow - Generate sample records and test the import API
const fs = require('fs');
const path = require('path');

// Generate sample baptism records for testing
const generateSampleBaptismRecords = (count = 5) => {
  const records = [];
  const names = ['Dimitrios Kostas', 'Maria Petrov', 'George Nikolaou', 'Catherine Stavros', 'John Papadopoulos'];
  const priests = ['Fr. Nicholas', 'Fr. Michael', 'Fr. George', 'Fr. Peter'];
  
  for (let i = 0; i < count; i++) {
    const record = {
      person_name: names[i % names.length],
      date_performed: `2024-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      priest_name: priests[i % priests.length],
      notes: `Sample baptism record ${i + 1} for testing import functionality`,
      parents: `Parent1 and Parent2 ${names[i % names.length].split(' ')[1]}`,
      godparents: `Godparent1 and Godparent2 ${names[(i + 1) % names.length].split(' ')[1]}`
    };
    records.push(record);
  }
  
  return records;
};

// Test the import workflow
async function testImportWorkflow() {
  console.log('🧪 Testing Import Workflow\n');
  
  // Step 1: Generate sample records
  console.log('1️⃣ Generating sample baptism records...');
  const sampleRecords = generateSampleBaptismRecords(3);
  console.log('✅ Generated records:', JSON.stringify(sampleRecords, null, 2));
  
  // Step 2: Save to test file
  const testFile = path.join(__dirname, 'test-baptism-import.json');
  fs.writeFileSync(testFile, JSON.stringify(sampleRecords, null, 2));
  console.log(`✅ Saved test file: ${testFile}`);
  
  // Step 3: Test church API
  console.log('\n2️⃣ Testing church API...');
  try {
    const axios = require('axios');
    const response = await axios.get('http://localhost:3001/api/churches');
    console.log('✅ Church API Response:', response.data);
    
    if (response.data.success && response.data.churches.length > 0) {
      const church = response.data.churches[0];
      console.log(`✅ Found church: ${church.name} (ID: ${church.id})`);
      
      // Step 4: Test import API
      console.log('\n3️⃣ Testing import API...');
      const importData = {
        churchId: church.id,
        recordType: 'baptism',
        records: sampleRecords
      };
      
      try {
        const importResponse = await axios.post('http://localhost:3001/api/records/import', importData);
        console.log('✅ Import API Response:', importResponse.data);
        
        if (importResponse.data.success) {
          console.log(`🎉 Successfully imported ${importResponse.data.inserted} records!`);
        } else {
          console.log('❌ Import failed:', importResponse.data.error);
        }
      } catch (importError) {
        console.log('❌ Import API Error:', importError.response?.data || importError.message);
      }
    } else {
      console.log('❌ No churches found in API response');
    }
  } catch (error) {
    console.log('❌ Church API Error:', error.response?.data || error.message);
  }
  
  console.log('\n📋 Test Summary:');
  console.log('• Sample records generated ✅');
  console.log('• Test JSON file created ✅');
  console.log('• Ready for frontend testing ✅');
  console.log('\n💡 Next steps:');
  console.log('1. Open the frontend application');
  console.log('2. Navigate to Baptism Records page');
  console.log('3. Click "Import Records" button');
  console.log('4. Select "Saints Peter and Paul Orthodox Church"');
  console.log('5. Upload the test-baptism-import.json file');
  console.log('6. Verify the import completes successfully');
}

// Run the test
testImportWorkflow().catch(console.error);
