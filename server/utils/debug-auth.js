/**
 * Debug authentication - check user and create proper test user
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxmetrics_user',
  password: process.env.DB_PASSWORD || 'securepassword123',
  database: process.env.DB_NAME || 'orthodmetrics_dev',
  connectTimeout: 60000,
};

async function debugAuth() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check current user
    console.log('\n📋 Checking existing users...');
    const [users] = await connection.execute('SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = ?', ['admin@orthodmetrics.com']);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ Found user:', {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        password_hash_length: user.password_hash ? user.password_hash.length : 'NULL'
      });
      
      // Test password
      console.log('\n🔐 Testing password...');
      const testPassword = 'admin123';
      const isMatch = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`Password "${testPassword}" matches:`, isMatch);
      
      if (!isMatch) {
        console.log('\n🔧 Creating new password hash...');
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log('New hash:', newHash);
        
        // Update with new hash
        await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
        console.log('✅ Password updated');
        
        // Test again
        const isMatchAfter = await bcrypt.compare(testPassword, newHash);
        console.log(`Password "${testPassword}" matches after update:`, isMatchAfter);
      }
    } else {
      console.log('❌ User not found, creating new user...');
      
      const testUser = {
        email: 'admin@orthodmetrics.com',
        password: 'admin123',
        first_name: 'Test',
        last_name: 'Admin',
        role: 'admin'
      };
      
      const password_hash = await bcrypt.hash(testUser.password, 10);
      
      const [result] = await connection.execute(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, preferred_language, is_active, email_verified, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          testUser.email,
          password_hash,
          testUser.first_name,
          testUser.last_name,
          testUser.role,
          'en',
          true,
          true
        ]
      );
      
      console.log('✅ User created with ID:', result.insertId);
    }
    
    // Check database structure
    console.log('\n📊 Checking users table structure...');
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Table columns:', columns.map(col => `${col.Field} (${col.Type})`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
if (require.main === module) {
  debugAuth()
    .then(() => {
      console.log('\n🎉 Debug complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = debugAuth;
