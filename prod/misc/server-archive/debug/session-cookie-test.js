// server/debug/session-cookie-test.js
const express = require('express');
const path = require('path');

// Load environment
const envFile = process.env.NODE_ENV === 'production' 
  ? '../.env.production' 
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

console.log('🔍 Orthodox Metrics Session Cookie Diagnostic');
console.log('==============================================');

console.log('\n📋 Environment:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

console.log('\n🍪 Cookie Configuration Test:');
const isProduction = process.env.NODE_ENV === 'production';
console.log('Production mode:', isProduction);
console.log('Secure cookies:', isProduction);
console.log('SameSite:', 'lax');
console.log('Domain:', isProduction ? '.orthodoxmetrics.com' : 'undefined');
console.log('HttpOnly:', true);
console.log('MaxAge:', '24 hours');

// Test database connection for sessions
async function testSessionStore() {
  try {
    console.log('\n🗄️  Session Store Test:');
    
    const dbOptions = {
      host: process.env.DB_HOST || '0.0.0.0',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'orthodoxapps',
      password: process.env.DB_PASSWORD || 'Summerof1982@!',
      database: process.env.DB_NAME || 'orthodoxmetrics_db',
    };

    const store = new MySQLStore(dbOptions);
    
    console.log('✅ Session store created successfully');
    
    // Test store operations
    const testSessionId = 'test-session-' + Date.now();
    const testData = { user: { id: 1, email: 'test@example.com' } };
    
    await new Promise((resolve, reject) => {
      store.set(testSessionId, testData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Session write test passed');
    
    const retrievedData = await new Promise((resolve, reject) => {
      store.get(testSessionId, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    console.log('✅ Session read test passed');
    console.log('   Retrieved data:', retrievedData);
    
    // Clean up test session
    await new Promise((resolve, reject) => {
      store.destroy(testSessionId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Session cleanup test passed');
    
  } catch (error) {
    console.error('❌ Session store test failed:', error.message);
  }
}

// Test actual session table
async function testSessionTable() {
  try {
    console.log('\n📊 Session Table Test:');
    
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '0.0.0.0',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'orthodoxapps',
      password: process.env.DB_PASSWORD || 'Summerof1982@!',
      database: process.env.DB_NAME || 'orthodoxmetrics_db',
    });

    // Check if sessions table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'sessions'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Sessions table does not exist');
      return;
    }
    
    console.log('✅ Sessions table exists');
    
    // Check table structure
    const [structure] = await connection.execute('DESCRIBE sessions');
    console.log('📋 Sessions table structure:');
    structure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type}`);
    });
    
    // Check active sessions
    const [sessions] = await connection.execute(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 1 END) as active FROM sessions'
    );
    
    console.log(`📈 Sessions: ${sessions[0].total} total, ${sessions[0].active} active`);
    
    // Check recent sessions
    const [recentSessions] = await connection.execute(`
      SELECT session_id, FROM_UNIXTIME(expires) as expires_readable, 
             CHAR_LENGTH(data) as data_size
      FROM sessions 
      ORDER BY expires DESC 
      LIMIT 5
    `);
    
    console.log('🕒 Recent sessions:');
    recentSessions.forEach(session => {
      console.log(`   ${session.session_id}: expires ${session.expires_readable}, size ${session.data_size} bytes`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Session table test failed:', error.message);
  }
}

// Run all tests
async function runDiagnostics() {
  await testSessionStore();
  await testSessionTable();
  
  console.log('\n🚀 Recommendations:');
  console.log('1. Ensure NODE_ENV=production is set before starting server');
  console.log('2. Clear browser cookies for orthodoxmetrics.com');
  console.log('3. Use HTTPS in production (required for secure cookies)');
  console.log('4. Check browser Network tab for cookie headers');
  console.log('5. Verify session.config is using correct settings');
  
  process.exit(0);
}

runDiagnostics(); 