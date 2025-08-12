#!/usr/bin/env node

const DatabaseService = require('../services/databaseService');

async function addUserLockoutFields() {
  try {
    console.log('🔧 Adding user lockout fields...\n');
    
    // Check if lockout columns exist
    const checkColumnsResult = await DatabaseService.queryPlatform(`
      SHOW COLUMNS FROM users LIKE 'is_locked'
    `);
    const hasLockoutColumns = checkColumnsResult[0].length > 0;
    
    if (hasLockoutColumns) {
      console.log('✅ Lockout columns already exist');
      return;
    }
    
    console.log('📝 Adding lockout columns to users table...');
    
    // Add lockout fields to users table
    await DatabaseService.queryPlatform(`
      ALTER TABLE users 
      ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
      ADD COLUMN locked_at TIMESTAMP NULL,
      ADD COLUMN locked_by VARCHAR(255) NULL,
      ADD COLUMN lockout_reason TEXT NULL
    `);
    
    console.log('✅ Successfully added lockout columns:');
    console.log('  - is_locked (BOOLEAN)');
    console.log('  - locked_at (TIMESTAMP)');
    console.log('  - locked_by (VARCHAR)');
    console.log('  - lockout_reason (TEXT)');
    
    // Check current users
    const usersResult = await DatabaseService.queryPlatform(`
      SELECT id, email, is_locked FROM users LIMIT 5
    `);
    const users = usersResult[0] || [];
    
    console.log('\n📊 Current users status:');
    users.forEach(user => {
      console.log(`  - ${user.email}: ${user.is_locked ? 'LOCKED' : 'ACTIVE'}`);
    });
    
    console.log('\n🎉 User lockout system ready!');
    
  } catch (error) {
    console.error('❌ Error setting up user lockout fields:', error);
  }
}

// Run if called directly
if (require.main === module) {
  addUserLockoutFields().then(() => process.exit(0));
}

module.exports = addUserLockoutFields;
