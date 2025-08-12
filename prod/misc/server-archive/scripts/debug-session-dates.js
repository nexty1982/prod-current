#!/usr/bin/env node

const path = require('path');
const DatabaseService = require('../services/databaseService');

async function debugSessionDates() {
  try {
    console.log('🔍 Debugging session date issues...\n');
    
    // Check current server time and timezone
    console.log('📅 Server Information:');
    console.log('- Current server time:', new Date().toISOString());
    console.log('- Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('- Current Unix timestamp:', Math.floor(Date.now() / 1000));
    console.log('- Current Unix timestamp as date:', new Date(Math.floor(Date.now() / 1000) * 1000).toISOString());
    console.log();
    
    // Check sessions table data
    console.log('📊 Sessions Table Data:');
    const sessionsResult = await DatabaseService.queryPlatform(`
      SELECT 
        session_id, 
        expires, 
        FROM_UNIXTIME(expires) as expires_local,
        CONVERT_TZ(FROM_UNIXTIME(expires), @@session.time_zone, '+00:00') as expires_utc,
        data 
      FROM sessions 
      ORDER BY expires DESC 
      LIMIT 5
    `);
    const sessions = sessionsResult[0] || [];
    
    sessions.forEach((session, index) => {
      console.log(`Session ${index + 1}:`);
      console.log(`  - Session ID: ${session.session_id}`);
      console.log(`  - Expires (Unix): ${session.expires}`);
      console.log(`  - Expires (Local): ${session.expires_local}`);
      console.log(`  - Expires (UTC): ${session.expires_utc}`);
      console.log(`  - User: ${JSON.parse(session.data)?.user?.email || 'N/A'}`);
      console.log();
    });
    
    // Check activity_log dates
    console.log('📊 Activity Log Data:');
    const activityResult = await DatabaseService.queryPlatform(`
      SELECT 
        id, 
        user_id, 
        action, 
        created_at,
        DATE(created_at) as date_only
      FROM activity_log 
      WHERE action = 'login' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    const activities = activityResult[0] || [];
    
    activities.forEach((activity, index) => {
      console.log(`Activity ${index + 1}:`);
      console.log(`  - ID: ${activity.id}`);
      console.log(`  - User ID: ${activity.user_id}`);
      console.log(`  - Action: ${activity.action}`);
      console.log(`  - Created At: ${activity.created_at}`);
      console.log(`  - Date Only: ${activity.date_only}`);
      console.log();
    });
    
    // Check database timezone settings
    console.log('🌍 Database Timezone Settings:');
    const timezoneResult = await DatabaseService.queryPlatform(`
      SELECT 
        @@global.time_zone as global_tz,
        @@session.time_zone as session_tz,
        NOW() as db_now,
        UTC_TIMESTAMP() as db_utc,
        UNIX_TIMESTAMP() as db_unix_now
    `);
    const timezoneData = timezoneResult[0] || [];
    
    if (timezoneData[0]) {
      console.log('- Global timezone:', timezoneData[0].global_tz);
      console.log('- Session timezone:', timezoneData[0].session_tz);
      console.log('- Database NOW():', timezoneData[0].db_now);
      console.log('- Database UTC_TIMESTAMP():', timezoneData[0].db_utc);
      console.log('- Database UNIX_TIMESTAMP():', timezoneData[0].db_unix_now);
    }
    
    console.log('\n✅ Session date debugging complete!');
    
  } catch (error) {
    console.error('❌ Error debugging session dates:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugSessionDates().then(() => process.exit(0));
}

module.exports = debugSessionDates;
