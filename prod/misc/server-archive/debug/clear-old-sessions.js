#!/usr/bin/env node

console.log('🧹 CLEARING OLD SESSIONS FOR DEBUG');
console.log('==================================');

// Load environment variables - try multiple locations
const path = require('path');
const fs = require('fs');

// Try loading from various possible locations
const envPaths = [
  path.resolve(__dirname, '../.env.production'),
  path.resolve(__dirname, '../../.env.production'), 
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env')
];

console.log('🔧 Loading environment variables...');
let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`   ✅ Found env file: ${envPath}`);
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('   ⚠️  No .env file found, using system environment');
}

// Set production environment variables as fallback
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'orthodoxapps';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'Summerof1982@!';
process.env.DB_NAME = process.env.DB_NAME || 'orthodoxmetrics_db';

const { promisePool } = require('../../config/db');

async function clearOldSessions() {
  try {
    console.log('\n1️⃣ CHECKING CURRENT SESSIONS:');
    console.log('-----------------------------');
    
    // Count current sessions
    const [sessionCount] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`📊 Current sessions in database: ${sessionCount[0].count}`);
    
    // Show recent sessions with data (if any)
    const [recentSessions] = await promisePool.query(`
      SELECT session_id, expires, 
             CASE 
               WHEN data LIKE '%"email"%' THEN 'HAS_USER_DATA'
               ELSE 'NO_USER_DATA'
             END as has_user,
             LENGTH(data) as data_size
      FROM sessions 
      ORDER BY expires DESC 
      LIMIT 10
    `);
    
    if (recentSessions.length > 0) {
      console.log('\n📋 Recent sessions:');
      recentSessions.forEach((session, i) => {
        const expires = new Date(session.expires);
        const isExpired = expires < new Date();
        console.log(`   ${i+1}. ${session.session_id.substring(0, 20)}... (${session.has_user}) ${isExpired ? '⏰ EXPIRED' : '✅ ACTIVE'}`);
      });
    }
    
    console.log('\n2️⃣ CLEARING OLD/EXPIRED SESSIONS:');
    console.log('----------------------------------');
    
    // Clear expired sessions
    const [expiredResult] = await promisePool.query('DELETE FROM sessions WHERE expires < NOW()');
    console.log(`🗑️  Removed ${expiredResult.affectedRows} expired sessions`);
    
    // For debugging, let's keep only the most recent 5 sessions
    const [cleanupResult] = await promisePool.query(`
      DELETE FROM sessions 
      WHERE session_id NOT IN (
        SELECT session_id FROM (
          SELECT session_id FROM sessions ORDER BY expires DESC LIMIT 5
        ) as recent_sessions
      )
    `);
    console.log(`🧹 Kept only 5 most recent sessions (removed ${cleanupResult.affectedRows} others)`);
    
    // Final count
    const [finalCount] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`📊 Sessions remaining: ${finalCount[0].count}`);
    
    console.log('\n✅ Session cleanup complete!');
    console.log('💡 Now login and watch the logs to see session behavior.');
    
  } catch (error) {
    console.error('❌ Error clearing sessions:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

clearOldSessions(); 