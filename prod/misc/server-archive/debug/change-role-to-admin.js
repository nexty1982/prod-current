const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '../.env.production' 
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const dbConfig = {
  host: process.env.DB_HOST || '0.0.0.0',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  charset: 'utf8mb4'
};

async function changeRoleToAdmin() {
  let connection;
  
  try {
    console.log('🔧 Changing superadmin@orthodoxmetrics.com role to admin...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // Check current role
    console.log('\n📊 BEFORE CHANGE:');
    const [beforeResult] = await connection.execute(
      'SELECT id, email, role, is_active FROM users WHERE email = ?',
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (beforeResult.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('Current role:', beforeResult[0].role);
    
    // Update role to admin
    const [updateResult] = await connection.execute(
      'UPDATE users SET role = ? WHERE email = ?',
      ['admin', 'superadmin@orthodoxmetrics.com']
    );
    
    console.log('✅ Role updated successfully');
    
    // Verify the change
    console.log('\n📊 AFTER CHANGE:');
    const [afterResult] = await connection.execute(
      'SELECT id, email, role, is_active FROM users WHERE email = ?',
      ['superadmin@orthodoxmetrics.com']
    );
    
    console.log('New role:', afterResult[0].role);
    
    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('hasRole([\'admin\', \'super_admin\']) should return:', ['admin', 'super_admin'].includes(afterResult[0].role));
    console.log('Content & Services tabs should be: VISIBLE');
    
    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Clear browser localStorage:');
    console.log('   localStorage.clear(); sessionStorage.clear();');
    console.log('2. Logout and login again');
    console.log('3. Go to Settings page');
    console.log('4. Content & Services tabs should now be visible!');
    
    console.log('\n💡 TO CHANGE BACK TO SUPER_ADMIN LATER:');
    console.log('UPDATE users SET role = "super_admin" WHERE email = "superadmin@orthodoxmetrics.com";');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the change
changeRoleToAdmin().catch(console.error); 