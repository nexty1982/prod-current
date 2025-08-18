#!/usr/bin/env node

/**
 * Phantom User Diagnostic Script
 * Identifies the root cause of authentication issues where sessions exist but user data is missing
 */

const mysql = require('mysql2/promise');
const https = require('https');

console.log('🔍 PHANTOM USER DIAGNOSTIC SCRIPT');
console.log('==================================');
console.log('');

async function diagnosePhantomUser() {
  try {
    console.log('🔧 STEP 1: DATABASE CONNECTION TEST');
    console.log('===================================');
    
    // Test database connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodoxapps',
      password: 'Summerof1982@!',
      database: 'orthodoxmetrics_db'
    });
    
    console.log('✅ Database connection successful');
    
    // Check sessions table
    const [sessions] = await connection.execute('SELECT COUNT(*) as count FROM sessions');
    console.log(`📊 Active sessions in database: ${sessions[0].count}`);
    
    if (sessions[0].count > 0) {
      const [sessionData] = await connection.execute('SELECT session_id, expires, LENGTH(data) as data_length FROM sessions LIMIT 3');
      console.log('📋 Sample sessions:');
      sessionData.forEach((session, i) => {
        console.log(`   ${i+1}. ID: ${session.session_id.substring(0, 20)}...`);
        console.log(`      Expires: ${new Date(session.expires * 1000).toISOString()}`);
        console.log(`      Data length: ${session.data_length} bytes`);
      });
    }
    
    await connection.end();
    
    console.log('');
    console.log('🔧 STEP 2: API ENDPOINT TEST');
    console.log('=============================');
    
    // Test auth check endpoint
    const authCheckResult = await testEndpoint('/api/auth/check');
    console.log('🔐 Auth check endpoint response:', authCheckResult);
    
    // Test health endpoint
    const healthResult = await testEndpoint('/api/health');
    console.log('🏥 Health endpoint response:', healthResult);
    
    console.log('');
    console.log('🔧 STEP 3: SESSION CONFIGURATION ANALYSIS');
    console.log('==========================================');
    
    // Check session configuration
    const sessionConfig = require('../config/session.js');
    console.log('✅ Session middleware loaded');
    console.log('📋 Session middleware type:', typeof sessionConfig);
    
    console.log('');
    console.log('🔧 STEP 4: DIAGNOSIS SUMMARY');
    console.log('=============================');
    
    if (sessions[0].count === 0) {
      console.log('❌ ISSUE: No sessions in database');
      console.log('   This suggests sessions are not being saved properly');
      console.log('   Possible causes:');
      console.log('   - Session store connection issues');
      console.log('   - Session middleware not configured correctly');
      console.log('   - Database permissions issues');
    } else if (authCheckResult.includes('authenticated: false')) {
      console.log('❌ ISSUE: Sessions exist but authentication fails');
      console.log('   This suggests session data corruption or cookie issues');
      console.log('   Possible causes:');
      console.log('   - Session data not being serialized properly');
      console.log('   - Cookie domain/path mismatch');
      console.log('   - Nginx proxy not forwarding cookies correctly');
    } else {
      console.log('✅ Sessions and authentication appear to be working');
      console.log('   The phantom user issue may be frontend-related');
    }
    
    console.log('');
    console.log('🎯 RECOMMENDED ACTIONS:');
    console.log('=======================');
    console.log('1. Clear all sessions: DELETE FROM sessions;');
    console.log('2. Restart the server to clear any cached sessions');
    console.log('3. Clear browser cookies completely');
    console.log('4. Test login flow with browser dev tools open');
    console.log('5. Monitor server logs for session debugging output');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'orthodoxmetrics.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PhantomUser-Diagnostic'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(`Status: ${res.statusCode}, Data: ${JSON.stringify(parsed).substring(0, 100)}...`);
        } catch {
          resolve(`Status: ${res.statusCode}, Raw: ${data.substring(0, 100)}...`);
        }
      });
    });
    
    req.on('error', (err) => {
      resolve(`Error: ${err.message}`);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve('Timeout');
    });
    
    req.end();
  });
}

// Run the diagnostic
diagnosePhantomUser().then(() => {
  console.log('');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('======================');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
}); 