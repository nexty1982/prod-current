#!/usr/bin/env node

/**
 * Test Script: Verify OMAI Logger Database Setup
 * 
 * This script tests:
 * 1. Database connection
 * 2. error_events table exists with correct schema
 * 3. Log insertion and retrieval
 * 4. API endpoints functionality
 * 5. Log level filtering
 */

const { promisePool: db } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    const [rows] = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testTableSchema() {
  console.log('🔍 Testing errors table schema...');
  try {
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'errors' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Table schema:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check for required columns
    const columnNames = columns.map(col => col.COLUMN_NAME);
    const requiredColumns = ['id', 'hash', 'type', 'source', 'message', 'log_level', 'origin', 'source_component', 'first_seen', 'last_seen', 'occurrences'];
    
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    if (missingColumns.length > 0) {
      console.error('❌ Missing required columns:', missingColumns);
      return false;
    }

    // Check log_level enum values
    const logLevelColumn = columns.find(col => col.COLUMN_NAME === 'log_level');
    if (logLevelColumn && logLevelColumn.COLUMN_TYPE.includes('enum')) {
      console.log('✅ log_level column is enum type:', logLevelColumn.COLUMN_TYPE);
    } else {
      console.error('❌ log_level column is not enum type');
      return false;
    }

    console.log('✅ Table schema is correct');
    return true;
  } catch (error) {
    console.error('❌ Table schema test failed:', error.message);
    return false;
  }
}

async function testLogInsertion() {
  console.log('🔍 Testing log insertion...');
  try {
    const testHash = `test_${Date.now()}`;
    const testMessage = 'Test log entry from logging system test';
    
    // Insert test log
    const [result] = await db.execute(`
      INSERT INTO errors (
        hash, type, source, message, log_level, origin, source_component, 
        first_seen, last_seen, occurrences, auto_tracked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1, 1)
    `, [
      testHash,
      'backend',
      'LoggingSystemTest',
      testMessage,
      'INFO',
      'test',
      'LoggingSystemTest'
    ]);

    console.log(`✅ Log inserted with ID: ${result.insertId}`);
    
    // Verify retrieval
    const [rows] = await db.execute(
      'SELECT * FROM errors WHERE hash = ?',
      [testHash]
    );

    if (rows.length > 0) {
      console.log('✅ Log retrieval successful');
      console.log(`   Message: ${rows[0].message}`);
      console.log(`   Level: ${rows[0].log_level}`);
      console.log(`   Origin: ${rows[0].origin}`);
      
      // Clean up test data
      await db.execute('DELETE FROM errors WHERE hash = ?', [testHash]);
      console.log('✅ Test data cleaned up');
      
      return true;
    } else {
      console.error('❌ Log retrieval failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Log insertion test failed:', error.message);
    return false;
  }
}

async function testLogLevels() {
  console.log('🔍 Testing all log levels...');
  try {
    const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS'];
    const testResults = [];

    for (const level of logLevels) {
      const testHash = `test_${level.toLowerCase()}_${Date.now()}`;
      
      try {
        await db.execute(`
          INSERT INTO errors (
            hash, type, source, message, log_level, origin, source_component, 
            first_seen, last_seen, occurrences, auto_tracked
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1, 1)
        `, [
          testHash,
          'backend',
          'LogLevelTest',
          `Test ${level} log`,
          level,
          'test',
          'LogLevelTest'
        ]);
        
        testResults.push({ level, success: true });
        console.log(`  ✅ ${level} level inserted successfully`);
        
        // Clean up
        await db.execute('DELETE FROM errors WHERE hash = ?', [testHash]);
      } catch (error) {
        testResults.push({ level, success: false, error: error.message });
        console.log(`  ❌ ${level} level failed:`, error.message);
      }
    }

    const successfulLevels = testResults.filter(r => r.success).length;
    console.log(`✅ ${successfulLevels}/${logLevels.length} log levels working correctly`);
    
    return successfulLevels === logLevels.length;
  } catch (error) {
    console.error('❌ Log levels test failed:', error.message);
    return false;
  }
}

async function testRecentLogRetrieval() {
  console.log('🔍 Testing recent log retrieval...');
  try {
    // Get recent logs (last 24 hours)
    const [rows] = await db.execute(`
      SELECT id, message, log_level, origin, source_component, source, last_seen, occurrences
      FROM errors 
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY last_seen DESC 
      LIMIT 10
    `);

    console.log(`✅ Found ${rows.length} recent logs`);
    
    if (rows.length > 0) {
      console.log('📋 Recent logs:');
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. [${row.log_level}] ${row.message.substring(0, 50)}... (${row.occurrences}x)`);
      });
    } else {
      console.log('ℹ️  No recent logs found (this is normal for a fresh installation)');
    }

    return true;
  } catch (error) {
    console.error('❌ Recent log retrieval test failed:', error.message);
    return false;
  }
}

async function testApiEndpoints() {
  console.log('🔍 Testing API endpoints availability...');
  
  const routesPath = path.join(__dirname, '../routes');
  const expectedFiles = ['logger.js', 'logs.js'];
  
  try {
    for (const file of expectedFiles) {
      const filePath = path.join(routesPath, file);
      await fs.access(filePath);
      console.log(`  ✅ ${file} exists`);
      
      // Basic syntax check
      const content = await fs.readFile(filePath, 'utf8');
      if (content.includes('router.post') && content.includes('router.get')) {
        console.log(`  ✅ ${file} has POST and GET routes`);
      } else {
        console.log(`  ⚠️  ${file} may be missing some routes`);
      }
    }

    console.log('✅ API endpoint files are available');
    return true;
  } catch (error) {
    console.error('❌ API endpoints test failed:', error.message);
    return false;
  }
}

async function generateTestReport() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 OMAI LOGGER SYSTEM TEST REPORT');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Table Schema', test: testTableSchema },
    { name: 'Log Insertion', test: testLogInsertion },
    { name: 'Log Levels', test: testLogLevels },
    { name: 'Recent Log Retrieval', test: testRecentLogRetrieval },
    { name: 'API Endpoints', test: testApiEndpoints }
  ];

  const results = [];

  for (const { name, test } of tests) {
    console.log(`\n📝 Running: ${name}`);
    console.log('-'.repeat(40));
    
    try {
      const success = await test();
      results.push({ name, success, error: null });
    } catch (error) {
      results.push({ name, success: false, error: error.message });
      console.error(`❌ ${name} failed with error:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`🎯 OVERALL: ${successful}/${total} tests passed`);
  
  if (successful === total) {
    console.log('🎉 ALL TESTS PASSED - Logger system is ready!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the backend server');
    console.log('   2. Enable debug mode in frontend');
    console.log('   3. Check OMAI Logger UI for real-time logs');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Please fix the issues above');
    console.log('\n🔧 Common fixes:');
    console.log('   1. Run database migration: node server/database/migrations/add_success_debug_log_support.sql');
    console.log('   2. Check database connection settings');
    console.log('   3. Verify table permissions');
  }

  console.log('='.repeat(60));
  
  return successful === total;
}

// Run the test suite
if (require.main === module) {
  generateTestReport()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = {
  testDatabaseConnection,
  testTableSchema,
  testLogInsertion,
  testLogLevels,
  testRecentLogRetrieval,
  testApiEndpoints,
  generateTestReport
};