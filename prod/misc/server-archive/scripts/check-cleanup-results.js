#!/usr/bin/env node

const DatabaseService = require('../services/databaseService');

async function checkCleanupResults() {
  try {
    console.log('🔍 Checking cleanup results...\n');
    
    // Check how many sessions are in the sessions table
    const sessionCountResult = await DatabaseService.queryPlatform(`
      SELECT COUNT(*) as active_sessions_count FROM sessions WHERE expires > UNIX_TIMESTAMP()
    `);
    const activeSessionsCount = sessionCountResult[0][0]?.active_sessions_count || 0;
    
    const expiredSessionCountResult = await DatabaseService.queryPlatform(`
      SELECT COUNT(*) as expired_sessions_count FROM sessions WHERE expires <= UNIX_TIMESTAMP()
    `);
    const expiredSessionsCount = expiredSessionCountResult[0][0]?.expired_sessions_count || 0;
    
    console.log(`📊 Sessions Table:`)
    console.log(`  - Active sessions: ${activeSessionsCount}`);
    console.log(`  - Expired sessions: ${expiredSessionsCount}`);
    console.log();
    
    // Check how many login records are in activity_log
    const loginCountResult = await DatabaseService.queryPlatform(`
      SELECT COUNT(*) as login_records_count FROM activity_log WHERE action = 'login'
    `);
    const loginRecordsCount = loginCountResult[0][0]?.login_records_count || 0;
    
    console.log(`📊 Activity Log:`)
    console.log(`  - Total login records: ${loginRecordsCount}`);
    console.log();
    
    // Check how the UI query works
    const uiQueryResult = await DatabaseService.queryPlatform(`
      SELECT 
        COUNT(*) as total_displayed,
        SUM(CASE WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() THEN 1 ELSE 0 END) as displayed_active,
        SUM(CASE WHEN s.session_id IS NULL OR s.expires <= UNIX_TIMESTAMP() THEN 1 ELSE 0 END) as displayed_expired
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN sessions s ON JSON_EXTRACT(s.data, '$.user.id') = al.user_id
      WHERE al.action = 'login'
    `);
    const uiData = uiQueryResult[0][0];
    
    console.log(`📊 What the UI shows:`)
    console.log(`  - Total sessions displayed: ${uiData?.total_displayed || 0}`);
    console.log(`  - Displayed as active: ${uiData?.displayed_active || 0}`);
    console.log(`  - Displayed as expired: ${uiData?.displayed_expired || 0}`);
    console.log();
    
    console.log('💡 Explanation:');
    console.log('- The UI shows ALL login records from activity_log');
    console.log('- Sessions are "active" if they have a corresponding entry in sessions table with expires > now');
    console.log('- Sessions are "expired" if they have no entry in sessions table or expires <= now');
    console.log('- Cleanup removes expired entries from sessions table, but login records remain in activity_log');
    console.log('- This is correct behavior - login history is preserved, but active sessions are cleaned up');
    
  } catch (error) {
    console.error('❌ Error checking cleanup results:', error);
  }
}

// Run if called directly
if (require.main === module) {
  checkCleanupResults().then(() => process.exit(0));
}

module.exports = checkCleanupResults;
