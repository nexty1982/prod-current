#!/usr/bin/env node

/**
 * Check Current Sessions Script
 * Identifies what sessions exist and their content
 */

const mysql = require('mysql2/promise');

async function checkCurrentSessions() {
  try {
    console.log('🔍 CHECKING CURRENT SESSIONS');
    console.log('============================');
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodoxapps',
      password: 'Summerof1982@!',
      database: 'orthodoxmetrics_db'
    });
    
    // Check total sessions
    const [sessions] = await connection.execute('SELECT COUNT(*) as count FROM sessions');
    console.log(`📊 Total active sessions: ${sessions[0].count}`);
    
    if (sessions[0].count > 0) {
      // Get session details
      const [sessionData] = await connection.execute(`
        SELECT 
          session_id, 
          expires, 
          LENGTH(data) as data_length,
          SUBSTRING(data, 1, 200) as data_preview
        FROM sessions 
        ORDER BY expires DESC
      `);
      
      console.log('\n📋 Session Details:');
      sessionData.forEach((session, i) => {
        console.log(`\n${i+1}. Session ID: ${session.session_id.substring(0, 20)}...`);
        console.log(`   Expires: ${new Date(session.expires * 1000).toISOString()}`);
        console.log(`   Data length: ${session.data_length} bytes`);
        console.log(`   Data preview: ${session.data_preview}`);
        
        // Try to parse session data
        try {
          const sessionObj = JSON.parse(session.data_preview);
          if (sessionObj.user) {
            console.log(`   👤 User: ${sessionObj.user.email || 'No email'} (${sessionObj.user.role || 'No role'})`);
          } else {
            console.log(`   👤 User: NO USER DATA`);
          }
        } catch (e) {
          console.log(`   👤 User: Cannot parse session data`);
        }
      });
    }
    
    await connection.end();
    
    console.log('\n🎯 ANALYSIS:');
    console.log('============');
    if (sessions[0].count === 0) {
      console.log('✅ No sessions in database - this is good');
      console.log('   The phantom user might be coming from frontend cache');
    } else {
      console.log('⚠️  Sessions exist in database');
      console.log('   Check if any have user data or are empty sessions');
    }
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('=======================');
    console.log('1. Clear all sessions: DELETE FROM sessions;');
    console.log('2. Clear browser localStorage and sessionStorage');
    console.log('3. Check frontend AuthContext for cached user data');
    console.log('4. Restart both frontend and backend');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCurrentSessions().then(() => {
  console.log('\n🏁 SESSION CHECK COMPLETE');
  process.exit(0);
}); 