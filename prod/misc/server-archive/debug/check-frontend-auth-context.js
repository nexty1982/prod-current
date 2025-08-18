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

async function checkFrontendAuthContext() {
  let connection;
  
  try {
    console.log('🔍 Debugging Frontend AuthContext vs Backend Database...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // Check database state
    console.log('\n📊 BACKEND DATABASE STATE:');
    const [userResult] = await connection.execute(
      'SELECT id, email, role, is_active, first_name, last_name FROM users WHERE email = ?',
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (userResult.length === 0) {
      console.log('❌ User not found in database!');
      return;
    }
    
    const dbUser = userResult[0];
    console.log('Database User:', JSON.stringify(dbUser, null, 2));
    
    // Expected frontend behavior
    console.log('\n🎯 EXPECTED FRONTEND BEHAVIOR:');
    console.log('isSuperAdmin() should return:', dbUser.role === 'super_admin');
    console.log('hasRole([\'admin\', \'super_admin\']) should return:', ['admin', 'super_admin'].includes(dbUser.role));
    console.log('Content & Services tabs should be:', (dbUser.role === 'super_admin') ? 'VISIBLE' : 'HIDDEN');
    
    console.log('\n🔧 DEBUGGING STEPS FOR FRONTEND:');
    console.log('1. Open browser dev tools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Type these commands to debug AuthContext:');
    console.log('');
    console.log('// Check localStorage user data:');
    console.log('console.log("LocalStorage user:", JSON.parse(localStorage.getItem("auth_user") || "null"));');
    console.log('');
    console.log('// Check current AuthContext state (add this to AdminSettings.tsx temporarily):');
    console.log('const { user, isSuperAdmin, hasRole } = useAuth();');
    console.log('console.log("AuthContext user:", user);');
    console.log('console.log("AuthContext isSuperAdmin():", isSuperAdmin());');
    console.log('console.log("AuthContext hasRole():", hasRole(["admin", "super_admin"]));');
    console.log('');
    
    console.log('\n🚨 POTENTIAL ISSUES TO CHECK:');
    console.log('A) LocalStorage has stale user data with wrong role');
    console.log('B) Login response not properly updating AuthContext');
    console.log('C) AuthContext user object missing or malformed');
    console.log('D) JavaScript errors preventing permission checks');
    
    console.log('\n🔄 IF STILL GREYED OUT, TRY:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Clear localStorage completely:');
    console.log('   localStorage.clear(); sessionStorage.clear();');
    console.log('3. Hard refresh (Ctrl+F5)');
    console.log('4. Login again');
    console.log('5. Check if user object updates in AuthContext');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkFrontendAuthContext().catch(console.error); 