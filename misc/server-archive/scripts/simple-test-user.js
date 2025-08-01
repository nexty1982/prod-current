#!/usr/bin/env node

/**
 * Super simple test user creation script
 */

const bcrypt = require('bcrypt');
const DatabaseService = require('../services/databaseService');

async function createSimpleTestUser() {
  try {
    console.log('🚀 CREATING SIMPLE TEST USER');
    console.log('=' .repeat(40));
    
    // Test database connection first
    console.log('\n🔗 Testing database connection...');
    const testConnection = await DatabaseService.queryPlatform('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check users table
    console.log('\n👥 Checking users table...');
    const userCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM users');
    console.log(`Current users: ${userCount[0]?.total || 0}`);
    
    // Create test user
    const testUser = {
      email: 'admin@orthodoxmetrics.com',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'super_admin'
    };
    
    // Check if exists
    const existing = await DatabaseService.queryPlatform(
      'SELECT id, email, role FROM users WHERE email = ?', 
      [testUser.email]
    );
    
    if (existing.length > 0) {
      console.log('✅ Test user already exists:');
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Email: ${existing[0].email}`);
      console.log(`   Role: ${existing[0].role}`);
    } else {
      console.log('\n🔐 Creating new test user...');
      const passwordHash = await bcrypt.hash(testUser.password, 10);
      
      const result = await DatabaseService.queryPlatform(
        `INSERT INTO users 
         (email, password_hash, first_name, last_name, role, preferred_language, is_active, email_verified, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'en', 1, 1, NOW(), NOW())`,
        [testUser.email, passwordHash, testUser.first_name, testUser.last_name, testUser.role]
      );
      
      console.log('✅ User created successfully!');
      console.log(`   ID: ${result.insertId}`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Password: ${testUser.password}`);
      console.log(`   Role: ${testUser.role}`);
    }
    
    // Now manually create a login activity 
    console.log('\n📊 Creating test login activity...');
    
    // Get the user ID
    const user = await DatabaseService.queryPlatform('SELECT id FROM users WHERE email = ?', [testUser.email]);
    const userId = user[0].id;
    
    console.log(`Using user ID: ${userId}`);
    
    // Simple activity insert
    await DatabaseService.queryPlatform(
      `INSERT INTO activity_log (user_id, action, ip_address, user_agent, created_at) 
       VALUES (?, 'login', '127.0.0.1', 'Test Browser Setup Script', NOW())`,
      [userId]
    );
    
    console.log('✅ Test login activity created!');
    
    // Verify it worked
    console.log('\n🔍 Verifying session data...');
    const sessionTest = await DatabaseService.queryPlatform(`
      SELECT u.email, u.first_name, u.last_name, al.ip_address, al.created_at
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      WHERE al.action = 'login'
      ORDER BY al.created_at DESC
      LIMIT 1
    `);
    
    if (sessionTest.length > 0) {
      const session = sessionTest[0];
      console.log('✅ Session data verified:');
      console.log(`   User: ${session.first_name} ${session.last_name} (${session.email})`);
      console.log(`   IP: ${session.ip_address}`);
      console.log(`   Time: ${session.created_at}`);
    }
    
    console.log('\n🎉 SETUP COMPLETE!');
    console.log('💡 Try logging in and check /admin/logs');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

createSimpleTestUser().then(() => {
  console.log('\n🏁 Done');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed:', error);
  process.exit(1);
});
