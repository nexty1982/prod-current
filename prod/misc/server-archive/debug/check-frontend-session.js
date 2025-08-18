const { promisePool } = require('../../config/db');

async function checkFrontendSession() {
  try {
    console.log('🔍 Checking frontend session vs database state...');
    
    // Get current database state
    const [users] = await promisePool.query(
      'SELECT id, email, role, is_active, first_name, last_name FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    const user = users[0];
    console.log('\n📊 Database State:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Active:', user.is_active);
    console.log('   Expected isSuperAdmin():', user.role === 'super_admin');
    console.log('   Expected hasRole():', ['admin', 'super_admin'].includes(user.role));
    
    console.log('\n🔧 Frontend Debugging Steps:');
    console.log('1. Open your browser and go to Settings page');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Type these commands to check your session:');
    console.log('');
    console.log('   // Check localStorage user data');
    console.log('   console.log("LocalStorage user:", JSON.parse(localStorage.getItem("auth_user") || "null"));');
    console.log('');
    console.log('   // Check if useAuth is working correctly');
    console.log('   // You can add this to the AdminSettings component temporarily:');
    console.log('   // const { user, isSuperAdmin, hasRole } = useAuth();');
    console.log('   // console.log("Current user:", user);');
    console.log('   // console.log("isSuperAdmin():", isSuperAdmin());');
    console.log('   // console.log("hasRole():", hasRole(["admin", "super_admin"]));');
    console.log('');
    console.log('🚨 MOST LIKELY SOLUTIONS:');
    console.log('');
    console.log('A) Clear browser data:');
    console.log('   - Go to Developer Tools > Application > Storage');
    console.log('   - Clear localStorage, sessionStorage, and cookies');
    console.log('   - Refresh page and login again');
    console.log('');
    console.log('B) Force logout/login:');
    console.log('   - Logout completely');
    console.log('   - Clear browser cache (Ctrl+Shift+Delete)');
    console.log('   - Login again with superadmin@orthodoxmetrics.com');
    console.log('');
    console.log('C) Check for JavaScript errors:');
    console.log('   - Look in Console tab for any red errors');
    console.log('   - Errors in AuthContext could prevent permission checks');
    console.log('');
    console.log('📋 Expected Result After Fix:');
    console.log(`   - User role should be: "${user.role}"`);
    console.log('   - Content & Services tabs should be visible and clickable');
    console.log('   - No grey overlay on the tabs');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFrontendSession(); 