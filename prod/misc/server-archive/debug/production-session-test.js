#!/usr/bin/env node

/**
 * Production Session Diagnosis Script
 * Run this to check if your production session configuration is correct
 */

console.log('🔍 Orthodox Metrics Production Session Diagnosis');
console.log('================================================');

// Check environment
console.log('\n📋 Environment Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'default');
console.log('DB_NAME:', process.env.DB_NAME || 'default');

// Test session configuration
console.log('\n🔧 Session Configuration Test:');
try {
  const session = require('../config/session');
  console.log('✅ Session configuration loaded successfully');
  
  // Check cookie settings
  const mockApp = {
    use: (middleware) => {
      // Extract session options
      if (middleware && middleware.name === 'session') {
        console.log('📝 Session Cookie Settings:');
        console.log('  secure:', middleware.options?.cookie?.secure);
        console.log('  httpOnly:', middleware.options?.cookie?.httpOnly);
        console.log('  sameSite:', middleware.options?.cookie?.sameSite);
        console.log('  domain:', middleware.options?.cookie?.domain);
        console.log('  maxAge:', middleware.options?.cookie?.maxAge);
      }
    }
  };
  
} catch (error) {
  console.log('❌ Session configuration error:', error.message);
}

// Database connection test
console.log('\n🗄️  Database Connection Test:');
const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'orthodoxapps', 
      password: process.env.DB_PASSWORD || 'Summerof1982@!',
      database: process.env.DB_NAME || 'orthodoxmetrics_db'
    });
    
    console.log('✅ Database connection successful');
    
    // Check if sessions table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'sessions'");
    if (tables.length > 0) {
      console.log('✅ Sessions table exists');
      
      // Check sessions table structure
      const [structure] = await connection.execute("DESCRIBE sessions");
      console.log('📋 Sessions table structure:');
      structure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
      
      // Count current sessions
      const [count] = await connection.execute("SELECT COUNT(*) as count FROM sessions");
      console.log(`📊 Current active sessions: ${count[0].count}`);
      
    } else {
      console.log('⚠️  Sessions table does not exist - this could be the issue!');
    }
    
    await connection.end();
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

testDatabase();

// Recommendations
console.log('\n💡 Production Checklist:');
console.log('1. ✓ Set NODE_ENV=production');
console.log('2. ✓ Set strong SESSION_SECRET'); 
console.log('3. ✓ Ensure HTTPS is enabled');
console.log('4. ✓ Verify sessions table exists');
console.log('5. ✓ Check CORS allows orthodoxmetrics.com');
console.log('6. ✓ Restart server after changes');

console.log('\n🚀 To fix session issues:');
console.log('   1. Run: export NODE_ENV=production');
console.log('   2. Set SESSION_SECRET environment variable');
console.log('   3. Restart your server');
console.log('   4. Clear browser cookies for orthodoxmetrics.com');
console.log('   5. Try logging in again'); 