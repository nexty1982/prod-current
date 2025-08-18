const { promisePool } = require('../../config/db');

async function checkSuperAdminPermissions() {
  try {
    console.log('🔍 Checking superadmin@orthodoxmetrics.com permissions...');
    
    // Check the user data
    const [users] = await promisePool.query(
      'SELECT id, email, role, is_active, first_name, last_name, created_at FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User superadmin@orthodoxmetrics.com not found!');
      console.log('💡 Run this SQL to create the user:');
      console.log(`
        INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
        VALUES (
          'superadmin@orthodoxmetrics.com',
          'Super',
          'Admin', 
          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm',
          'super_admin',
          1,
          NOW(),
          NOW()
        );
      `);
      process.exit(1);
    }
    
    const user = users[0];
    console.log('\n✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Active:', user.is_active);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Created:', user.created_at);
    
    // Check permissions logic
    console.log('\n🔒 Permission checks:');
    
    // Check if role is super_admin
    const isSuperAdminByRole = user.role === 'super_admin';
    console.log(`   Role is 'super_admin': ${isSuperAdminByRole}`);
    
    // Check if role is in admin array
    const hasAdminRole = ['admin', 'super_admin'].includes(user.role);
    console.log(`   Role in ['admin', 'super_admin']: ${hasAdminRole}`);
    
    // Check if email matches root superadmin
    const isRootSuperAdmin = user.email === 'superadmin@orthodoxmetrics.com';
    console.log(`   Email is root superadmin: ${isRootSuperAdmin}`);
    
    console.log('\n🎯 Expected behavior:');
    console.log('   - isSuperAdmin() should return:', isRootSuperAdmin);
    console.log('   - hasRole([\'admin\', \'super_admin\']) should return:', hasAdminRole);
    console.log('   - Content & Services tabs should be visible:', isSuperAdminByRole || hasAdminRole);
    
    if (!isSuperAdminByRole && !hasAdminRole) {
      console.log('\n❌ ISSUE FOUND: User role is not correct!');
      console.log('💡 Fix with this SQL:');
      console.log(`   UPDATE users SET role = 'super_admin' WHERE email = 'superadmin@orthodoxmetrics.com';`);
    } else {
      console.log('\n✅ User permissions look correct!');
      console.log('💡 If tabs are still greyed out, check:');
      console.log('   1. Browser console for JavaScript errors');
      console.log('   2. User session data in localStorage');
      console.log('   3. AuthContext state in React Dev Tools');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSuperAdminPermissions(); 