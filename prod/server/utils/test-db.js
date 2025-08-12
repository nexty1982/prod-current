// Direct database test from server perspective
const { promisePool } = require('./config/db');

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Test 1: Check what columns exist in users table
    const [columns] = await promisePool.query('DESCRIBE users');
    console.log('Users table structure:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
    // Test 2: Count all users
    const [countRows] = await promisePool.query('SELECT COUNT(*) as count FROM orthodoxmetrics_auth_db.users');
    console.log('Total users:', countRows[0].count);
    
    // Test 3: List all users with existing columns
    const [allUsers] = await promisePool.query('SELECT * FROM orthodoxmetrics_auth_db.users');
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
