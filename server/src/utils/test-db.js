const { getAppPool } = require('../config/db-compat');
// Direct database test from server perspective
const { promisePool } = require('../config/db-compat');

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Test 1: Check what columns exist in users table
    const [columns] = await getAppPool().query('DESCRIBE users');
    console.log('Users table structure:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
    // Test 2: Count all users
    const [countRows] = await getAppPool().query('SELECT COUNT(*) as count FROM orthodoxmetrics_db.users');
    console.log('Total users:', countRows[0].count);
    
    // Test 3: List all users with existing columns
    const [allUsers] = await getAppPool().query('SELECT * FROM orthodoxmetrics_db.users');
    console.log('All users:');
    allUsers.forEach(user => {
      console.log(`  User:`, user);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

testDatabase();
