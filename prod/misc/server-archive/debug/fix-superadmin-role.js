const { promisePool } = require('../../config/db');
const bcrypt = require('bcrypt');

async function fixSuperAdminRole() {
  try {
    console.log('🔧 Checking and fixing superadmin role...');
    
    // Check if the user exists
    const [users] = await promisePool.query(
      'SELECT id, email, role, is_active, first_name, last_name FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User superadmin@orthodoxmetrics.com not found. Creating...');
      
      // Create the user with proper role
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await promisePool.query(`
        INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        'superadmin@orthodoxmetrics.com',
        'Super',
        'Admin',
        hashedPassword,
        'super_admin',
        1
      ]);
      
      console.log('✅ Created superadmin user with role "super_admin"');
      console.log('   Email: superadmin@orthodoxmetrics.com');
      console.log('   Password: admin123');
      console.log('   Role: super_admin');
      
    } else {
      const user = users[0];
      console.log('✅ User found:', user.email);
      console.log('   Current role:', user.role);
      console.log('   Active:', user.is_active);
      
      if (user.role !== 'super_admin') {
        console.log('🔧 Updating role to "super_admin"...');
        
        await promisePool.query(
          'UPDATE users SET role = ?, updated_at = NOW() WHERE email = ?',
          ['super_admin', 'superadmin@orthodoxmetrics.com']
        );
        
        console.log('✅ Role updated to "super_admin"');
      } else {
        console.log('✅ Role is already correct!');
      }
      
      if (user.is_active !== 1) {
        console.log('🔧 Activating user...');
        
        await promisePool.query(
          'UPDATE users SET is_active = 1, updated_at = NOW() WHERE email = ?',
          ['superadmin@orthodoxmetrics.com']
        );
        
        console.log('✅ User activated');
      }
    }
    
    // Verify final state
    const [finalUsers] = await promisePool.query(
      'SELECT id, email, role, is_active, first_name, last_name FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    const finalUser = finalUsers[0];
    console.log('\n🎯 Final user state:');
    console.log('   Email:', finalUser.email);
    console.log('   Role:', finalUser.role);
    console.log('   Active:', finalUser.is_active);
    console.log('   Name:', finalUser.first_name, finalUser.last_name);
    
    console.log('\n🔍 Permission check results:');
    console.log('   isSuperAdmin() should return:', finalUser.role === 'super_admin');
    console.log('   hasRole([\'admin\', \'super_admin\']) should return:', ['admin', 'super_admin'].includes(finalUser.role));
    console.log('   Content & Services tabs should be visible:', finalUser.role === 'super_admin' || ['admin', 'super_admin'].includes(finalUser.role));
    
    if (finalUser.role === 'super_admin' && finalUser.is_active === 1) {
      console.log('\n✅ SUCCESS! User is properly configured.');
      console.log('💡 Next steps:');
      console.log('   1. Logout and login again to refresh your session');
      console.log('   2. Clear browser cache/localStorage if needed');
      console.log('   3. Check the Settings page - Content & Services tabs should now be visible');
    } else {
      console.log('\n❌ Something is still wrong. Please check the database manually.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSuperAdminRole(); 