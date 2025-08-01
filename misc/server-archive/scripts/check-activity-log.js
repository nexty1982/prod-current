#!/usr/bin/env node

/**
 * Check and fix activity_log table structure
 */

const DatabaseService = require('../services/databaseService');

async function checkActivityLogTable() {
  try {
    console.log('🔍 CHECKING ACTIVITY_LOG TABLE STRUCTURE');
    console.log('=' .repeat(50));
    
    // Check if table exists
    const tableExists = await DatabaseService.queryPlatform(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'activity_log'
    `);
    
    console.log(`Activity_log table exists: ${tableExists[0]?.table_exists ? 'YES' : 'NO'}`);
    
    if (tableExists[0]?.table_exists) {
      // Check table structure
      const structure = await DatabaseService.queryPlatform(`
        DESCRIBE activity_log
      `);
      
      console.log('\nTable structure:');
      structure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      
      // Check for data
      const count = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM activity_log');
      console.log(`\nTotal records: ${count[0]?.total || 0}`);
      
    } else {
      console.log('\n⚠️  Activity_log table does not exist! Creating it...');
      
      const createTableQuery = `
        CREATE TABLE activity_log (
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
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      
      await DatabaseService.queryPlatform(createTableQuery);
      console.log('✅ Activity_log table created successfully!');
    }
    
    // Also check users table
    console.log('\n👥 CHECKING USERS TABLE');
    console.log('-'.repeat(30));
    
    const usersCount = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM users');
    console.log(`Total users: ${usersCount[0]?.total || 0}`);
    
    if (usersCount[0]?.total === 0) {
      console.log('⚠️  No users in database - this is why sessions appear empty!');
      console.log('💡 You need to create users to see session data');
    }
    
    console.log('\n✅ ANALYSIS COMPLETE');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkActivityLogTable().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
