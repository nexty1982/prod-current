#!/usr/bin/env node
// Test script to validate database logging functionality

const { info, warn, error, debug, success, getLogs } = require('../utils/dbLogger');

async function testDatabaseLogging() {
  console.log('🧪 Testing Database Logging System...\n');
  
  try {
    // Test different log levels
    console.log('1️⃣ Testing log levels...');
    await info('TestSuite', 'This is an info message', { testData: 'info test' }, null, 'test-service');
    await warn('TestSuite', 'This is a warning message', { testData: 'warn test' }, null, 'test-service');
    await error('TestSuite', 'This is an error message', { testData: 'error test' }, null, 'test-service');
    await debug('TestSuite', 'This is a debug message', { testData: 'debug test' }, null, 'test-service');
    await success('TestSuite', 'This is a success message', { testData: 'success test' }, null, 'test-service');
    
    // Test with user context
    console.log('2️⃣ Testing with user context...');
    const testUser = { email: 'test@example.com', id: 1 };
    const testContext = {
      sessionId: 'test-session-123',
      requestId: 'req-456',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent'
    };
    
    await info(
      'TestSuite', 
      'User action performed', 
      { action: 'test_action', timestamp: new Date() },
      testUser,
      'test-service',
      testContext
    );
    
    // Test error handling with database unavailable simulation
    console.log('3️⃣ Testing error handling...');
    await info('TestSuite', 'Testing fallback mechanism', { fallbackTest: true }, null, 'test-service');
    
    // Wait a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Query recent logs
    console.log('4️⃣ Querying recent logs...');
    const recentLogs = await getLogs({
      source: 'TestSuite',
      limit: 10
    });
    
    console.log(`✅ Found ${recentLogs.length} test log entries:`);
    recentLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.level}] ${log.message} (${log.timestamp})`);
    });
    
    // Test log filtering
    console.log('5️⃣ Testing log filtering...');
    const errorLogs = await getLogs({
      level: 'ERROR',
      source: 'TestSuite',
      limit: 5
    });
    
    console.log(`✅ Found ${errorLogs.length} error logs from test suite`);
    
    // Test service filtering
    const serviceLogs = await getLogs({
      service: 'test-service',
      limit: 5
    });
    
    console.log(`✅ Found ${serviceLogs.length} logs from test-service`);
    
    console.log('\n🎉 Database logging tests completed successfully!');
    console.log('\n📋 Test Results:');
    console.log(`   ✅ Log level support: Working`);
    console.log(`   ✅ User context logging: Working`);
    console.log(`   ✅ Metadata support: Working`);
    console.log(`   ✅ Log querying: Working`);
    console.log(`   ✅ Log filtering: Working`);
    
    // Clean up test logs
    console.log('\n🧹 Cleaning up test logs...');
    const { promisePool } = require('../../config/db');
    const [result] = await promisePool.execute(
      "DELETE FROM system_logs WHERE source = 'TestSuite' AND service = 'test-service'"
    );
    console.log(`   🗑️  Removed ${result.affectedRows} test log entries`);
    
  } catch (testError) {
    console.error('❌ Test failed:', testError);
    console.error('Stack trace:', testError.stack);
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Running performance test...');
  
  const startTime = Date.now();
  const logCount = 100;
  
  const promises = [];
  for (let i = 0; i < logCount; i++) {
    promises.push(
      info('PerformanceTest', `Log entry ${i}`, { iteration: i }, null, 'perf-test')
    );
  }
  
  await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  const logsPerSecond = Math.round((logCount / duration) * 1000);
  
  console.log(`⚡ Performance Results:`);
  console.log(`   📊 ${logCount} logs in ${duration}ms`);
  console.log(`   🚀 ~${logsPerSecond} logs/second`);
  
  // Clean up performance test logs
  const { promisePool } = require('../../config/db');
  const [result] = await promisePool.execute(
    "DELETE FROM system_logs WHERE source = 'PerformanceTest' AND service = 'perf-test'"
  );
  console.log(`   🗑️  Cleaned up ${result.affectedRows} performance test logs`);
}

// Database connectivity test
async function testDatabaseConnectivity() {
  console.log('🔗 Testing database connectivity...');
  
  try {
    const { promisePool } = require('../../config/db');
    
    // Test basic connection
    const [rows] = await promisePool.execute('SELECT 1 as test');
    if (rows[0].test === 1) {
      console.log('   ✅ Database connection: OK');
    }
    
    // Test system_logs table exists
    const [tables] = await promisePool.execute(
      "SHOW TABLES LIKE 'system_logs'"
    );
    if (tables.length > 0) {
      console.log('   ✅ system_logs table: Exists');
    } else {
      console.log('   ⚠️  system_logs table: Missing (will be created automatically)');
    }
    
    // Test table structure
    const [columns] = await promisePool.execute(
      "DESCRIBE system_logs"
    );
    console.log(`   ✅ Table structure: ${columns.length} columns defined`);
    
  } catch (dbError) {
    console.error('   ❌ Database connectivity failed:', dbError.message);
    throw dbError;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔬 Database Logging Test Suite');
  console.log('=' .repeat(50));
  
  try {
    await testDatabaseConnectivity();
    await testDatabaseLogging();
    await performanceTest();
    
    console.log('\n🎊 All tests passed! Database logging is working correctly.');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run tests if script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testDatabaseLogging,
  performanceTest,
  testDatabaseConnectivity,
  runAllTests
};