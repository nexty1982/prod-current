/**
 * Test script to verify the component usage query optimization
 * This script tests the new batched query implementation
 */

const ComponentUsageTrackerDB = require('./utils/componentUsageTrackerDB');

async function testOptimization() {
  console.log('🔍 Testing Component Usage Query Optimization\n');
  
  const usageTracker = new ComponentUsageTrackerDB();
  
  // Test component IDs (using common component IDs)
  const testComponentIds = [
    'authentication-service',
    'database-connector',
    'notification-service',
    'backup-scheduler',
    'api-gateway',
    'ocr-processor',
    'session-manager',
    'file-storage',
    'user-management',
    'admin-dashboard'
  ];
  
  console.log(`📊 Testing with ${testComponentIds.length} component IDs`);
  
  // Test 1: Single batched query
  console.log('\n⚡ Test 1: Batched Query (NEW OPTIMIZED METHOD)');
  const startTime1 = Date.now();
  
  try {
    const batchResults = await usageTracker.getBatchComponentUsageStatus(testComponentIds);
    const endTime1 = Date.now();
    
    console.log(`✅ Batched query completed in ${endTime1 - startTime1}ms`);
    console.log(`📋 Retrieved usage data for ${Object.keys(batchResults).length} components`);
    
    // Show sample results
    const sampleComponent = Object.keys(batchResults)[0];
    if (sampleComponent) {
      console.log(`📄 Sample result for '${sampleComponent}':`, batchResults[sampleComponent]);
    }
    
  } catch (error) {
    console.error('❌ Batched query failed:', error.message);
  }
  
  // Test 2: Individual queries (old method simulation)
  console.log('\n🐌 Test 2: Individual Queries (OLD METHOD SIMULATION)');
  const startTime2 = Date.now();
  
  try {
    const individualResults = {};
    for (const componentId of testComponentIds) {
      const result = await usageTracker.getComponentUsageStatus(componentId);
      individualResults[componentId] = result;
    }
    const endTime2 = Date.now();
    
    console.log(`✅ Individual queries completed in ${endTime2 - startTime2}ms`);
    console.log(`📋 Retrieved usage data for ${Object.keys(individualResults).length} components`);
    
  } catch (error) {
    console.error('❌ Individual queries failed:', error.message);
  }
  
  // Test 3: Empty array handling
  console.log('\n🔧 Test 3: Edge Case - Empty Array');
  try {
    const emptyResults = await usageTracker.getBatchComponentUsageStatus([]);
    console.log(`✅ Empty array handling: ${Object.keys(emptyResults).length} results (expected: 0)`);
  } catch (error) {
    console.error('❌ Empty array test failed:', error.message);
  }
  
  // Test 4: Non-existent components
  console.log('\n🔧 Test 4: Edge Case - Non-existent Components');
  try {
    const nonExistentResults = await usageTracker.getBatchComponentUsageStatus(['fake-component-1', 'fake-component-2']);
    console.log(`✅ Non-existent components handling: ${Object.keys(nonExistentResults).length} results`);
    
    const sampleNonExistent = Object.keys(nonExistentResults)[0];
    if (sampleNonExistent) {
      console.log(`📄 Sample fallback result:`, nonExistentResults[sampleNonExistent]);
    }
  } catch (error) {
    console.error('❌ Non-existent components test failed:', error.message);
  }
  
  console.log('\n🎉 Optimization testing completed!');
  console.log('\n📈 Expected Benefits:');
  console.log('   • Reduced database load from N queries to 1 query');
  console.log('   • Improved response times for component management UI');
  console.log('   • Eliminated excessive logging of individual queries');
  console.log('   • Better cache utilization');
  
  // Clear cache for clean testing
  usageTracker.clearCache();
}

// Run the test
if (require.main === module) {
  testOptimization()
    .then(() => {
      console.log('\n✨ Test script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testOptimization;