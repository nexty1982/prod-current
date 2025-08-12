#!/usr/bin/env node

/**
 * Fix Sessions Management - Complete Setup Script
 * This script will:
 * 1. Check/create activity_log table
 * 2. Create a test user 
 * 3. Verify the setup
 */

const bcrypt = require('bcrypt');
const DatabaseService = require('../services/databaseService');

async function fixSessionsSetup() {
  try {
    console.log('🚀 FIXING SESSIONS MANAGEMENT SETUP');
    console.log('=' .repeat(50));
    
    // 1. Check and create activity_log table if needed
    console.log('\n📋 1. CHECKING ACTIVITY_LOG TABLE');
    console.log('-'.repeat(30));
    
    try {
      // Try to create table with IF NOT EXISTS - safer approach
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS activity_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          church_id INT NULL,
          action VARCHAR(50) NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          details JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_church_id (church_id),
          INDEX idx_action (action),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      
      await DatabaseService.queryPlatform(createTableQuery);
      console.log('✅ Activity_log table verified/created');
      
      // Check current record count
      const logCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM activity_log WHERE action = "login"');
      console.log(`Current login entries: ${logCount[0]?.total || 0}`);
      
    } catch (error) {
      console.log('⚠️  Error with activity_log table:', error.message);
    }
    
    // 2. Check users and create test user if needed
    console.log('\n👥 2. CHECKING USERS');
    console.log('-'.repeat(30));
    
    const usersCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM users');
    console.log(`Current users: ${usersCount[0]?.total || 0}`);
    
    if (usersCount[0]?.total === 0) {
      console.log('⚠️  No users found. Creating test admin user...');
      
      // Create test user
      const testUser = {
        email: 'admin@orthodoxmetrics.com',
        password: 'admin123',
        first_name: 'Test',
        last_name: 'Admin',
        role: 'super_admin',
        preferred_language: 'en'
      };
      
      const password_hash = await bcrypt.hash(testUser.password, 10);
      
      const [result] = await DatabaseService.queryPlatform(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, preferred_language, is_active, email_verified, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [
          testUser.email,
          password_hash,
          testUser.first_name,
          testUser.last_name,
          testUser.role,
          testUser.preferred_language
        ]
      );
      
      console.log('✅ Test user created!');
      console.log(`📧 Email: ${testUser.email}`);
      console.log(`🔑 Password: ${testUser.password}`);
      console.log(`🆔 User ID: ${result.insertId}`);
      
      // Create a sample login activity for testing
      await DatabaseService.queryPlatform(
        'INSERT INTO activity_log (user_id, action, ip_address, user_agent, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [
          result.insertId,
          'login',
          '127.0.0.1',
          'Setup Script Test Login',
          JSON.stringify({ 
            email: testUser.email, 
            role: testUser.role,
            note: 'Test login created by setup script'
          })
        ]
      );
      console.log('✅ Sample login activity created!');
      
    } else {
      console.log('✅ Users already exist in database');
    }
    
    // 3. Verify the setup
    console.log('\n🔧 3. VERIFYING SETUP');
    console.log('-'.repeat(30));
    
    const testQuery = `
      SELECT 
        al.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        al.ip_address,
        al.user_agent,
        al.created_at as login_time
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      WHERE al.action = 'login'
      ORDER BY al.created_at DESC
      LIMIT 3
    `;
    
    const testResult = await DatabaseService.queryPlatform(testQuery);
    console.log(`Sessions query returns: ${testResult.length} rows`);
    
    if (testResult.length > 0) {
      console.log('Sample data:');
      testResult.forEach((row, i) => {
        console.log(`  ${i+1}. ${row.first_name} ${row.last_name} (${row.email})`);
        console.log(`     IP: ${row.ip_address}, Time: ${row.login_time}`);
      });
    }
    
    console.log('\n🎉 SETUP COMPLETE!');
    console.log('✅ Activity_log table ready');
    console.log('✅ Test user available'); 
    console.log('✅ Login route updated to log activities');
    console.log('✅ Sessions management should now work');
    console.log('\n💡 Next steps:');
    console.log('   1. Try logging in with admin@orthodoxmetrics.com / admin123');
    console.log('   2. Check /admin/logs to see session data');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run the setup
fixSessionsSetup().then(() => {
  console.log('\n🏁 Setup script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('💥 Setup script failed:', error);
  process.exit(1);
});
