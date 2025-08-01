#!/usr/bin/env node

const DatabaseService = require('../services/databaseService');

async function testSessionTermination() {
  try {
    console.log('🧪 Testing session termination functionality...\n');
    
    // Check current active sessions
    console.log('📊 Current Session Status:');
    const activeSessionsResult = await DatabaseService.queryPlatform(`
      SELECT session_id, expires, FROM_UNIXTIME(expires) as expires_readable,
             JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.email')) as user_email,
             CASE 
               WHEN expires > UNIX_TIMESTAMP() THEN 'ACTIVE' 
               ELSE 'EXPIRED' 
             END as status
      FROM sessions 
      ORDER BY expires DESC
      LIMIT 10
    `);
    const sessions = activeSessionsResult[0] || [];
    
    if (sessions.length === 0) {
      console.log('  No sessions found in sessions table');
    } else {
      sessions.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.user_email}: ${session.status}`);
        console.log(`     Session ID: ${session.session_id}`);
        console.log(`     Expires: ${session.expires_readable}`);
        console.log();
      });
    }
    
    // Check what the UI query shows
    console.log('📊 What the UI Session Management shows:');
    const uiQueryResult = await DatabaseService.queryPlatform(`
      SELECT DISTINCT
        COALESCE(s.session_id, CONCAT('logged_out_', al.id)) as session_id,
        u.email,
        CASE 
          WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() THEN 'ACTIVE'
          ELSE 'EXPIRED' 
        END as ui_status,
        CASE 
          WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() THEN 1 
          ELSE 0 
        END as is_active
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN sessions s ON JSON_EXTRACT(s.data, '$.user.id') = al.user_id
      WHERE al.action = 'login'
      ORDER BY al.created_at DESC
      LIMIT 10
    `);
    const uiSessions = uiQueryResult[0] || [];
    
    uiSessions.forEach((session, index) => {
      console.log(`  ${index + 1}. ${session.email}: ${session.ui_status} (is_active: ${session.is_active})`);
    });
    console.log();
    
    // Count active vs expired
    const countResult = await DatabaseService.queryPlatform(`
      SELECT 
        SUM(CASE WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN s.session_id IS NULL OR s.expires <= UNIX_TIMESTAMP() THEN 1 ELSE 0 END) as expired_count
      FROM activity_log al
      LEFT JOIN sessions s ON JSON_EXTRACT(s.data, '$.user.id') = al.user_id
      WHERE al.action = 'login'
    `);
    const counts = countResult[0][0];
    
    console.log(`📈 UI Display Counts:`);
    console.log(`  Active sessions shown: ${counts?.active_count || 0}`);
    console.log(`  Expired sessions shown: ${counts?.expired_count || 0}`);
    console.log();
    
    console.log('💡 How Session Termination Works:');
    console.log('1. 🎯 Termination sets expires = UNIX_TIMESTAMP() (current time)');
    console.log('2. 📊 Session remains in activity_log (login history preserved)');
    console.log('3. 🔄 Session changes from ACTIVE to EXPIRED status in UI');
    console.log('4. ✅ User can no longer use that session (must re-login)');
    console.log();
    console.log('🔍 Expected behavior after termination:');
    console.log('  - Session count stays the same (history preserved)');
    console.log('  - Active count decreases, Expired count increases');
    console.log('  - Session status changes from "Active" to "Expired" chip');
    
  } catch (error) {
    console.error('❌ Error testing session termination:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testSessionTermination().then(() => process.exit(0));
}

module.exports = testSessionTermination;
