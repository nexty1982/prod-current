/**
 * Basic Tests for Records Suite API
 */
const assert = require('assert');

function testValidationSchemas() {
  console.log('🧪 Testing validation schemas...');
  
  const churchIdRegex = /^[0-9]{1,6}$/;
  assert(churchIdRegex.test('12345'), 'Valid church ID should pass');
  assert(!churchIdRegex.test('abc123'), 'Invalid church ID should fail');
  
  const tableNameRegex = /^[A-Za-z0-9_]+_records$/;
  assert(tableNameRegex.test('baptism_records'), 'Valid table name should pass');
  assert(!tableNameRegex.test('baptism'), 'Invalid table name should fail');
  
  console.log('✅ Validation schemas passed');
}

function runTests() {
  console.log('🚀 Running Records Suite Tests...\n');
  
  try {
    testValidationSchemas();
    console.log('\n🎉 All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
