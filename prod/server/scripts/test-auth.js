#!/usr/bin/env node

/**
 * Authentication Test Script
 * Tests the login process and role mapping
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function testAuth() {
  console.log('🔧 Testing Authentication System...\n');

  // Connect to database
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'orthodoxmetrics_auth_db'
  });

  console.log('✅ Connected to database\n');

  // Test 1: Check users and their roles
  console.log('📋 Current Users and Roles:');
  const [users] = await connection.query(`
    SELECT u.id, u.email, u.full_name, u.role_id, r.name as role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.is_active = 1
  `);

  users.forEach(user => {
    console.log(`  ${user.email} - ${user.role_name} (ID: ${user.role_id})`);
  });

  console.log('\n');

  // Test 2: Role mapping
  console.log('🔄 Role Mapping (Database → Frontend):');
  const roleMapping = {
    'superadmin': 'super_admin',
    'church_admin': 'church_admin', 
    'editor': 'editor',
    'viewer': 'viewer',
    'auditor': 'viewer'
  };

  Object.entries(roleMapping).forEach(([dbRole, frontendRole]) => {
    console.log(`  ${dbRole} → ${frontendRole}`);
  });

  console.log('\n');

  // Test 3: Password verification for admin user
  console.log('🔐 Testing Password Verification:');
  const [adminUsers] = await connection.query(
    'SELECT email, password_hash FROM users WHERE email = ?',
    ['admin@orthodoxmetrics.com']
  );

  if (adminUsers.length > 0) {
    const testPassword = 'your_test_password'; // You'd need to know this
    console.log(`  Admin user found: ${adminUsers[0].email}`);
    console.log(`  Password hash exists: ${!!adminUsers[0].password_hash}`);
    
    // Note: You'd need to provide the actual password to test this
    // const isValid = await bcrypt.compare(testPassword, adminUsers[0].password_hash);
    // console.log(`  Password verification: ${isValid ? 'Valid' : 'Invalid'}`);
  } else {
    console.log('  No admin user found');
  }

  await connection.end();
  console.log('\n✅ Test completed');
}

// Test the debug endpoints
async function testDebugEndpoints() {
  console.log('\n🔍 Testing Debug Endpoints...\n');
  
  const axios = require('axios').default;
  const baseURL = 'https://orthodoxmetrics.com';
  
  try {
    // Test current-db endpoint
    console.log('Testing /__debug/current-db:');
    const dbResponse = await axios.get(`${baseURL}/__debug/current-db`);
    console.log(`  Database: ${dbResponse.data.db}`);
    
    // Test session endpoint
    console.log('\nTesting /__debug/session:');
    const sessionResponse = await axios.get(`${baseURL}/__debug/session`);
    console.log(`  Has Session: ${sessionResponse.data.hasSession}`);
    console.log(`  Session ID: ${sessionResponse.data.sessionID || 'None'}`);
    console.log(`  User: ${sessionResponse.data.user ? sessionResponse.data.user.email : 'None'}`);
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

async function main() {
  try {
    await testAuth();
    await testDebugEndpoints();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
}
