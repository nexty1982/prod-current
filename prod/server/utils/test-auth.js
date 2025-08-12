// Test script to check database connection and user authentication
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.development') });

const db = require('./config/db');
const bcrypt = require('bcrypt');

async function testAuth() {
  try {
    console.log('🔧 Testing database connection and authentication...\n');
    
    // Test database connection
    const pool = db.getConnection();
    console.log('✅ Database connection successful');
    
    // Check if admin user exists
    const [users] = await pool.query('SELECT id, email, username, role, is_active, password_hash FROM orthodoxmetrics_auth_db.users WHERE email = ?', ['admin@test.com']);
    
    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const user = users[0];
    console.log('✅ Admin user found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Password hash exists: ${!!user.password_hash}`);
    
    // Test password verification
    const testPassword = 'admin123';
    const match = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`   Password test (${testPassword}): ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    // Check session storage table
    const [sessions] = await pool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`   Sessions table records: ${sessions[0].count}`);
    
    console.log('\n🎯 Test complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAuth();
