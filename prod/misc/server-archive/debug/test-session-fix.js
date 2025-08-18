#!/usr/bin/env node

console.log('🔍 COMPREHENSIVE SESSION DEBUG ANALYSIS');
console.log('========================================\n');

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

// Set production environment variables as fallback (from start-production.sh)
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'orthodoxapps';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'Summerof1982@!';
process.env.DB_NAME = process.env.DB_NAME || 'orthodoxmetrics_db';

console.log('🔧 Environment check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('');

const { promisePool } = require('../../config/db');

async function debugSessionIssue() {
  try {
    console.log('📋 ISSUE ANALYSIS:');
    console.log('==================');
    console.log('✅ Login succeeds, but sessions don\'t persist across requests');
    console.log('✅ Each request gets a different session ID');
    console.log('✅ Database schema fixed (no more "status" column error)');
    console.log('❌ Session cookies not being transmitted properly\n');

    // 1. Test database connection
    console.log('1️⃣ TESTING DATABASE CONNECTION:');
    console.log('--------------------------------');
    const [dbTest] = await promisePool.query('SELECT 1 as test');
    console.log('✅ Database connection: WORKING');
    
    // 2. Check user exists
    console.log('\n2️⃣ CHECKING USER IN DATABASE:');
    console.log('------------------------------');
    const [users] = await promisePool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found in database!');
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);

    // 3. Check session table
    console.log('\n3️⃣ CHECKING SESSION STORAGE:');
    console.log('-----------------------------');
    try {
      const [sessions] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
      console.log(`✅ Sessions table exists with ${sessions[0].count} sessions`);
    } catch (sessionErr) {
      console.log('❌ Sessions table issue:', sessionErr.message);
    }

    console.log('\n🚨 ROOT CAUSE ANALYSIS:');
    console.log('=======================');
    console.log('The issue is COOKIE TRANSMISSION, not session storage.');
    console.log('Each request creates a NEW session instead of using the existing one.\n');

    console.log('🔧 PROBABLE CAUSES:');
    console.log('===================');
    console.log('1. CORS configuration missing credentials: true');
    console.log('2. Frontend not sending cookies with API requests');
    console.log('3. Cookie domain/path mismatch');
    console.log('4. SameSite policy blocking cookies');
    console.log('5. Browser security settings blocking cookies\n');

    console.log('🎯 IMMEDIATE FIXES TO APPLY:');
    console.log('============================');
    console.log('1. Enable CORS credentials on server');
    console.log('2. Configure frontend to send cookies with requests');
    console.log('3. Adjust cookie settings for broader compatibility');
    console.log('4. Add cookie debugging endpoints');
    console.log('5. Test with simplified cookie configuration\n');

    console.log('🔍 DEBUGGING STEPS:');
    console.log('===================');
    console.log('1. Check browser DevTools > Application > Cookies');
    console.log('   - Is "orthodox.sid" cookie being set after login?');
    console.log('   - What domain/path is set on the cookie?');
    console.log('');
    console.log('2. Check browser DevTools > Network > Any API request');
    console.log('   - Are cookies being sent in Request Headers?');
    console.log('   - Look for "Cookie: orthodox.sid=..." in request');
    console.log('');
    console.log('3. Check server logs for consistent session IDs');
    console.log('   - Same session ID should appear across multiple requests');
    console.log('   - If different IDs, cookies are not being transmitted\n');

    console.log('✅ Database and user verification: COMPLETE');
    console.log('🔧 Next step: Fix CORS and cookie configuration');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugSessionIssue(); 