#!/usr/bin/env node

const { promisePool } = require('../config/db.js');

async function testActivityLogsAPI() {
  console.log('🧪 Testing Activity Logs API...');
  
  try {
    // Test database connection
    console.log('\n1️⃣ Testing database connection...');
    const [testResult] = await promisePool.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check activity_log table structure
    console.log('\n2️⃣ Checking activity_log table structure...');
    const [structure] = await promisePool.query('DESCRIBE activity_log');
    console.log('📋 Table structure:');
    structure.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Get recent activity count
    console.log('\n3️⃣ Checking recent activity logs...');
    const [countResult] = await promisePool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM activity_log 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    const stats = countResult[0];
    console.log(`📊 Last 7 days stats:`);
    console.log(`   - Total activities: ${stats.total}`);
    console.log(`   - Unique users: ${stats.unique_users}`);
    console.log(`   - Date range: ${stats.earliest} to ${stats.latest}`);
    
    // Get sample activity logs
    console.log('\n4️⃣ Getting sample activity logs...');
    const [activities] = await promisePool.query(`
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.ip_address,
        al.created_at,
        u.email as user_email,
        u.role as user_role
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 5
    `);
    
    console.log('📝 Recent activities:');
    activities.forEach((activity, i) => {
      console.log(`   ${i+1}. ${activity.action} by ${activity.user_email || `User ${activity.user_id}`} at ${activity.created_at}`);
    });
    
    // Test the API endpoint logic
    console.log('\n5️⃣ Testing API query logic...');
    const [apiTestResult] = await promisePool.query(`
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.changes,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.role as user_role
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 3
    `);
    
    console.log('🔍 API test results:');
    apiTestResult.forEach((result, i) => {
      console.log(`   ${i+1}. ID: ${result.id}, Action: ${result.action}, User: ${result.user_email}`);
      if (result.changes) {
        try {
          const changes = JSON.parse(result.changes);
          console.log(`      Changes: ${Object.keys(changes).length} properties`);
        } catch (e) {
          console.log(`      Changes: Invalid JSON`);
        }
      }
    });
    
    console.log('\n✅ Activity Logs API test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the router setup script');
    console.log('   2. Restart the frontend development server');
    console.log('   3. Navigate to /admin/activity-logs in the browser');
    
  } catch (error) {
    console.error('❌ Error testing Activity Logs API:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

testActivityLogsAPI();
