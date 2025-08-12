#!/usr/bin/env node

/**
 * Simple script to create test users and sample session data
 */

const bcrypt = require('bcrypt');
const DatabaseService = require('../services/databaseService');

async function createTestData() {
  try {
    console.log('🚀 CREATING TEST DATA FOR SESSIONS');
    console.log('=' .repeat(50));
    
    // 1. Create test user
    console.log('\n👤 1. CREATING TEST USER');
    console.log('-'.repeat(30));
    
    const testUser = {
      email: 'admin@orthodoxmetrics.com',
      password: 'admin123',
      first_name: 'Test',
      last_name: 'Admin',
      role: 'super_admin'
    };
    
    // Check if user exists
    const existing = await DatabaseService.queryPlatform('SELECT id FROM users WHERE email = ?', [testUser.email]);
    
    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log('✅ Test user already exists');
      console.log(`📧 Email: ${testUser.email}`);
      console.log(`🔑 Password: ${testUser.password}`);
      console.log(`🆔 User ID: ${userId}`);
    } else {
      const password_hash = await bcrypt.hash(testUser.password, 10);
      
      const result = await DatabaseService.queryPlatform(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, preferred_language, is_active, email_verified, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'en', 1, 1, NOW(), NOW())`,
        [testUser.email, password_hash, testUser.first_name, testUser.last_name, testUser.role]
      );
      
      userId = result.insertId;
      console.log('✅ Test user created!');
      console.log(`📧 Email: ${testUser.email}`);
      console.log(`🔑 Password: ${testUser.password}`);
      console.log(`🆔 User ID: ${userId}`);
    }
    
    // Verify userId is valid
    if (!userId) {
      throw new Error('Failed to get valid user ID');
    }
    
    // 2. Create sample login activities
    console.log('\n📊 2. CREATING SAMPLE LOGIN ACTIVITIES');
    console.log('-'.repeat(30));
    
    // Check if activities exist
    const existingActivities = await DatabaseService.queryPlatform(
      'SELECT COUNT(*) as total FROM activity_log WHERE user_id = ? AND action = "login"',
      [userId]
    );
    
    if (existingActivities[0]?.total > 0) {
      console.log(`✅ ${existingActivities[0].total} login activities already exist for this user`);
    } else {
      // Create sample login activities
      const sampleLogins = [
        {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          ip: '10.0.0.50',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          time: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        },
        {
          ip: '172.16.0.25',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          time: new Date() // now
        }
      ];
      
      for (let i = 0; i < sampleLogins.length; i++) {
        const login = sampleLogins[i];
        await DatabaseService.queryPlatform(
          'INSERT INTO activity_log (user_id, action, ip_address, user_agent, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            userId,
            'login',
            login.ip,
            login.userAgent,
            JSON.stringify({ email: testUser.email, role: testUser.role, sample: true }),
            login.time.toISOString().slice(0, 19).replace('T', ' ')
          ]
        );
      }
      console.log(`✅ Created ${sampleLogins.length} sample login activities`);
    }
    
    // 3. Verify the data
    console.log('\n🔧 3. VERIFYING SESSION DATA');
    console.log('-'.repeat(30));
    
    const verifyQuery = `
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
      LIMIT 5
    `;
    
    const sessions = await DatabaseService.queryPlatform(verifyQuery);
    console.log(`✅ Found ${sessions.length} login sessions`);
    
    if (sessions.length > 0) {
      console.log('Sample sessions:');
      sessions.forEach((session, i) => {
        console.log(`  ${i+1}. ${session.first_name} ${session.last_name} (${session.email})`);
        console.log(`     IP: ${session.ip_address} | Time: ${session.login_time}`);
      });
    }
    
    console.log('\n🎉 TEST DATA SETUP COMPLETE!');
    console.log('💡 Now try:');
    console.log('   1. Login with admin@orthodoxmetrics.com / admin123');
    console.log('   2. Visit /admin/logs to see session management');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createTestData().then(() => {
  console.log('\n🏁 Test data script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
