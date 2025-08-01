#!/usr/bin/env node

/**
 * Debug script to understand the exact database query results
 */

const DatabaseService = require('../services/databaseService');

async function debugDatabase() {
  try {
    console.log('🔍 DEBUGGING DATABASE QUERIES');
    console.log('=' .repeat(40));
    
    // 1. Test simple query
    console.log('\n1. Testing simple query...');
    const test = await DatabaseService.queryPlatform('SELECT 1 as test_value');
    console.log('Simple query result:', JSON.stringify(test, null, 2));
    console.log('Type:', typeof test);
    console.log('Array?', Array.isArray(test));
    
    // 2. Test users count
    console.log('\n2. Testing users count...');
    const userCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM users');
    console.log('User count result:', JSON.stringify(userCount, null, 2));
    console.log('Count value:', userCount[0]?.total);
    
    // 3. Test users query
    console.log('\n3. Testing users select...');
    const users = await DatabaseService.queryPlatform('SELECT id, email, role FROM users LIMIT 3');
    console.log('Users result:', JSON.stringify(users, null, 2));
    console.log('Users length:', users?.length);
    
    // 4. Test specific user query
    console.log('\n4. Testing specific user query...');
    const specificUser = await DatabaseService.queryPlatform(
      'SELECT id, email, role FROM users WHERE email = ?', 
      ['admin@orthodoxmetrics.com']
    );
    console.log('Specific user result:', JSON.stringify(specificUser, null, 2));
    console.log('User found?', specificUser?.length > 0);
    
    if (specificUser?.length > 0) {
      console.log('User ID:', specificUser[0]?.id);
      console.log('User Email:', specificUser[0]?.email);
      console.log('User Role:', specificUser[0]?.role);
    }
    
    // 5. Test table structure
    console.log('\n5. Testing table structure...');
    const tables = await DatabaseService.queryPlatform('SHOW TABLES');
    console.log('Available tables:', JSON.stringify(tables, null, 2));
    
    // 6. Test activity_log structure
    console.log('\n6. Testing activity_log structure...');
    try {
      const activityStructure = await DatabaseService.queryPlatform('DESCRIBE activity_log');
      console.log('Activity_log structure:', JSON.stringify(activityStructure, null, 2));
    } catch (err) {
      console.log('Activity_log table error:', err.message);
    }
    
    console.log('\n✅ DEBUG COMPLETE');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    console.error('Stack:', error.stack);
  }
}

debugDatabase().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});
