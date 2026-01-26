// Check   database: 'orthodoxmetrics_db        ['admin@orthodoxmetrics_db.com', hashedPassword, 'Admin', 'User', 'super_admin', 1, 1]       ['admin@orthodoxmetrics_db.com', hashedPassword, 'Admin', 'User', 'super_admin', 1, 1]dev',f test user exists and create if needed
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Summerof1982@!', // Update this with your actual password
  database: 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const promisePool = mysql.createPool(dbConfig);

async function checkAndCreateTestUser() {
  console.log('🔍 Checking if test user exists...');
  
  try {
    // Check if user exists
    const [rows] = await promisePool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM orthodoxmetrics_db.users WHERE email = ?',
      ['admin@orthodoxmetrics_db.com']
    );
    
    if (rows.length === 0) {
      console.log('❌ Test user does not exist. Creating...');
      
      // Create test user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await promisePool.query(
        'INSERT INTO orthodoxmetrics_db.users (email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin@orthodoxmetrics.com', hashedPassword, 'Admin', 'User', 'super_admin', 1, 1]
      );
      
      console.log('✅ Test user created successfully!');
      console.log('   Email: admin@orthodoxmetrics_db.com');
      console.log('   Password: admin123');
      console.log('   Role: super_admin');
    } else {
      console.log('✅ Test user exists:');
      console.log('   ID:', rows[0].id);
      console.log('   Email:', rows[0].email);
      console.log('   Name:', rows[0].first_name, rows[0].last_name);
      console.log('   Role:', rows[0].role);
      console.log('   Active:', rows[0].is_active);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndCreateTestUser();
