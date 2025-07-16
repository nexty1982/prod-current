/**
 * Create a test user for login testing
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxmetrics_user',
  password: process.env.DB_PASSWORD || 'securepassword123',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

async function createTestUser() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Test user data
    const testUser = {
      email: 'admin@orthodoxmetrics.com',
      password: 'admin123',
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin',
      preferred_language: 'en',
      is_active: true,
      email_verified: true
    };
    
    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(testUser.password, saltRounds);
    
    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [testUser.email]
    );
    
    if (existingUsers.length > 0) {
      console.log('✅ Test user already exists!');
      console.log('📧 Email:', testUser.email);
      console.log('🔑 Password:', testUser.password);
      return;
    }
    
    // Create test user
    console.log('👤 Creating test user...');
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, preferred_language, is_active, email_verified, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        testUser.email,
        password_hash,
        testUser.first_name,
        testUser.last_name,
        testUser.role,
        testUser.preferred_language,
        testUser.is_active,
        testUser.email_verified
      ]
    );
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password:', testUser.password);
    console.log('🆔 User ID:', result.insertId);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('🎉 Test user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = createTestUser;
