const { promisePool } = require('../../config/db');
const bcrypt = require('bcrypt');

async function checkAuthSystem() {
  try {
    console.log('🔐 Checking authentication system status...');
    
    // 1. Check if superadmin user exists and is properly configured
    console.log('\n1. Checking superadmin user...');
    const [users] = await promisePool.query(
      'SELECT id, email, role, is_active, password_hash FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (users.length === 0) {
      console.log('❌ CRITICAL: superadmin@orthodoxmetrics.com not found!');
      process.exit(1);
    }
    
    const user = users[0];
    console.log('✅ Superadmin user found:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Active:', user.is_active);
    console.log('   Has password hash:', !!user.password_hash);
    
    // 2. Test password verification
    console.log('\n2. Testing password verification...');
    try {
      const isValidPassword = await bcrypt.compare('admin123', user.password_hash);
      console.log('   Password "admin123" is valid:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('⚠️  Default password may have been changed');
        console.log('   Try your actual password instead');
      }
    } catch (error) {
      console.log('❌ Password verification error:', error.message);
    }
    
    // 3. Check session configuration
    console.log('\n3. Checking session configuration...');
    console.log('   Database connection: ✅ Working (you can see this message)');
    console.log('   Express session middleware should be configured');
    console.log('   Cookie settings should be secure but not too restrictive');
    
    // 4. Provide recovery steps
    console.log('\n🚨 RECOVERY STEPS:');
    console.log('');
    console.log('A) Try logging in normally:');
    console.log('   1. Go to your login page');
    console.log('   2. Email: superadmin@orthodoxmetrics.com');
    console.log('   3. Password: admin123 (or your actual password)');
    console.log('   4. Make sure to check browser console for errors');
    console.log('');
    console.log('B) If login page has errors:');
    console.log('   1. Check browser console for red JavaScript errors');
    console.log('   2. Check network tab for failed requests');
    console.log('   3. Try hard refresh (Ctrl+Shift+R)');
    console.log('');
    console.log('C) If backend auth issues:');
    console.log('   1. Check server logs for errors');
    console.log('   2. Restart the application server');
    console.log('   3. Check database connectivity');
    console.log('');
    console.log('D) Reset password if needed:');
    console.log('   Run this SQL command to reset password to "admin123":');
    console.log('   UPDATE users SET password_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm" WHERE email = "superadmin@orthodoxmetrics.com";');
    console.log('');
    
    // 5. Test auth endpoint availability
    console.log('🔗 Next steps:');
    console.log('1. Navigate to your login page');
    console.log('2. Open browser dev tools before logging in');
    console.log('3. Watch for any red errors in console');
    console.log('4. Try logging in with the credentials above');
    console.log('5. If it works, the 401 errors will stop and tabs will be visible');
    
    console.log('\n💡 Note: The 401 errors are normal after clearing browser data.');
    console.log('   They will disappear once you successfully log in again.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking auth system:', error.message);
    console.log('\n🚨 CRITICAL: Database connection or auth system issue!');
    console.log('Check:');
    console.log('1. Database server is running');
    console.log('2. Application server is running');
    console.log('3. Database credentials are correct');
    process.exit(1);
  }
}

checkAuthSystem(); 