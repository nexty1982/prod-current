#!/usr/bin/env node

/**
 * Session Management Diagnostic Script
 * Investigates why the Session Management Interface shows "Invalid Data"
 */

const DatabaseService = require('../services/databaseService');

async function diagnoseSessions() {
  try {
    console.log('🔍 SESSIONS DIAGNOSTIC REPORT');
    console.log('=' .repeat(50));
    
    // 1. Check activity_log table structure and data
    console.log('\n📋 1. ACTIVITY_LOG TABLE ANALYSIS');
    console.log('-'.repeat(30));
    
    const activityLogCount = await DatabaseService.queryPlatform(
      'SELECT COUNT(*) as total FROM activity_log WHERE action = "login"'
    );
    console.log(`Total login entries: ${activityLogCount[0]?.total || 0}`);
    
    if (activityLogCount[0]?.total > 0) {
      const recentLogins = await DatabaseService.queryPlatform(`
        SELECT 
          id, user_id, action, ip_address, user_agent, 
          created_at, details
        FROM activity_log 
        WHERE action = 'login' 
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      console.log('Recent login entries:');
      recentLogins.forEach((log, i) => {
        console.log(`  ${i+1}. User ID: ${log.user_id}, IP: ${log.ip_address}, Time: ${log.created_at}`);
        console.log(`     User Agent: ${log.user_agent?.substring(0, 60)}...`);
      });
    }
    
    // 2. Check users table
    console.log('\n👥 2. USERS TABLE ANALYSIS');
    console.log('-'.repeat(30));
    
    const usersCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM users');
    console.log(`Total users: ${usersCount[0]?.total || 0}`);
    
    if (usersCount[0]?.total > 0) {
      const sampleUsers = await DatabaseService.queryPlatform(`
        SELECT id, email, first_name, last_name, role, church_id 
        FROM users 
        LIMIT 3
      `);
      console.log('Sample users:');
      sampleUsers.forEach((user, i) => {
        console.log(`  ${i+1}. ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Church: ${user.church_id}`);
      });
    }
    
    // 3. Check sessions table
    console.log('\n🔒 3. SESSIONS TABLE ANALYSIS');
    console.log('-'.repeat(30));
    
    const sessionsCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM sessions');
    console.log(`Total sessions: ${sessionsCount[0]?.total || 0}`);
    
    if (sessionsCount[0]?.total > 0) {
      const activeSessions = await DatabaseService.queryPlatform(`
        SELECT 
          session_id, 
          JSON_EXTRACT(data, '$.user.id') as user_id,
          expires,
          FROM_UNIXTIME(expires) as expires_readable,
          CASE WHEN expires > UNIX_TIMESTAMP() THEN 'ACTIVE' ELSE 'EXPIRED' END as status
        FROM sessions 
        ORDER BY expires DESC 
        LIMIT 3
      `);
      console.log('Sample sessions:');
      activeSessions.forEach((session, i) => {
        console.log(`  ${i+1}. Session ID: ${session.session_id}, User ID: ${session.user_id}`);
        console.log(`     Status: ${session.status}, Expires: ${session.expires_readable}`);
      });
    }
    
    // 4. Test the main query that the API uses
    console.log('\n🔧 4. TESTING MAIN API QUERY');
    console.log('-'.repeat(30));
    
    const mainQuery = `
      SELECT DISTINCT
        COALESCE(s.session_id, CONCAT('logged_out_', al.id)) as session_id,
        al.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        c.name as church_name,
        al.ip_address,
        al.user_agent,
        al.created_at as login_time,
        CASE 
          WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() THEN 1 
          ELSE 0 
        END as is_active,
        CASE 
          WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() 
          THEN ROUND((s.expires - UNIX_TIMESTAMP()) / 60)
          ELSE 0 
        END as minutes_until_expiry
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN churches c ON u.church_id = c.id
      LEFT JOIN sessions s ON JSON_EXTRACT(s.data, '$.user.id') = al.user_id
      WHERE al.action = 'login'
      ORDER BY al.created_at DESC
      LIMIT 3
    `;
    
    const mainResult = await DatabaseService.queryPlatform(mainQuery);
    console.log(`Query returned ${mainResult.length} rows`);
    
    if (mainResult.length > 0) {
      mainResult.forEach((row, i) => {
        console.log(`\nRow ${i+1}:`);
        console.log(`  Session ID: ${row.session_id}`);
        console.log(`  User: ${row.first_name} ${row.last_name} (${row.email})`);
        console.log(`  Role: ${row.role}`);
        console.log(`  Church: ${row.church_name || 'N/A'}`);
        console.log(`  IP: ${row.ip_address || 'N/A'}`);
        console.log(`  User Agent: ${row.user_agent?.substring(0, 50) || 'N/A'}...`);
        console.log(`  Login Time: ${row.login_time}`);
        console.log(`  Active: ${row.is_active ? 'YES' : 'NO'}`);
        console.log(`  Minutes Until Expiry: ${row.minutes_until_expiry || 0}`);
      });
    } else {
      console.log('❌ No results returned from main query!');
    }
    
    // 5. Check for JOIN issues
    console.log('\n🔍 5. CHECKING JOIN RELATIONSHIPS');
    console.log('-'.repeat(30));
    
    const joinCheck = await DatabaseService.queryPlatform(`
      SELECT 
        al.id,
        al.user_id,
        u.id as user_exists,
        c.id as church_exists,
        s.session_id as session_exists
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN churches c ON u.church_id = c.id
      LEFT JOIN sessions s ON JSON_EXTRACT(s.data, '$.user.id') = al.user_id
      WHERE al.action = 'login'
      LIMIT 5
    `);
    
    console.log('JOIN relationship check:');
    joinCheck.forEach((row, i) => {
      console.log(`  ${i+1}. Activity Log ID: ${row.id}, User ID: ${row.user_id}`);
      console.log(`     User Exists: ${row.user_exists ? 'YES' : 'NO'}`);
      console.log(`     Church Exists: ${row.church_exists ? 'YES' : 'NO'}`);
      console.log(`     Session Exists: ${row.session_exists ? 'YES' : 'NO'}`);
    });
    
    console.log('\n✅ DIAGNOSTIC COMPLETE');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the diagnostic
diagnoseSessions().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
