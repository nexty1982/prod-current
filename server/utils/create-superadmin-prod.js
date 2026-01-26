/**
 * Create superadmin user for production environment
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// Production database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'orthodoxmetrics_db', // Production database
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

async function createSuperAdmin() {
  let connection;
  
  try {
    console.log('🔗 Connecting to production database (orthodoxmetrics_db)...');
    connection = await mysql.createConnection(dbConfig);
    
    // Superadmin user data
    const superAdminUser = {
      email: 'superadmin@orthodoxmetrics.com',
      password: 'Summerof82@!',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      preferred_language: 'en',
      is_active: true,
      email_verified: true
    };
    
    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(superAdminUser.password, saltRounds);
    
    // Check if user already exists
    console.log('🔍 Checking if superadmin user exists...');
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM orthodoxmetrics_db.users WHERE email = ?',
      [superAdminUser.email]
    );
    
    if (existingUsers.length > 0) {
      console.log('✅ Superadmin user already exists!');
      console.log('📧 Email:', existingUsers[0].email);
      console.log('👑 Role:', existingUsers[0].role);
      console.log('🆔 User ID:', existingUsers[0].id);
      
      // Update password if user exists
      console.log('🔄 Updating password and ensuring super_admin role...');
      await connection.execute(
        'UPDATE orthodoxmetrics_db.users SET password_hash = ?, role = ?, is_active = 1, email_verified = 1, updated_at = NOW() WHERE email = ?',
        [password_hash, 'super_admin', superAdminUser.email]
      );
      console.log('✅ Superadmin user updated!');
      return;
    }
    
    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const [result] = await connection.execute(
      `INSERT INTO orthodoxmetrics_db.users (email, password_hash, first_name, last_name, role, preferred_language, is_active, email_verified, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        superAdminUser.email,
        password_hash,
        superAdminUser.first_name,
        superAdminUser.last_name,
        superAdminUser.role,
        superAdminUser.preferred_language,
        superAdminUser.is_active,
        superAdminUser.email_verified
      ]
    );
    
    console.log('✅ Superadmin user created successfully!');
    console.log('📧 Email:', superAdminUser.email);
    console.log('🔑 Password:', superAdminUser.password);
    console.log('👑 Role:', superAdminUser.role);
    console.log('🆔 User ID:', result.insertId);
    console.log('🗄️ Database: orthodoxmetrics_db');
    
  } catch (error) {
    console.error('❌ Error creating superadmin user:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
if (require.main === module) {
  createSuperAdmin()
    .then(() => {
      console.log('🎉 Superadmin user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = createSuperAdmin;