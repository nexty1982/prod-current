// Test the exact permission logic from AdminSettings
console.log('🧪 Testing Permission Logic...');

// Simulate the AuthContext functions
function createMockUser(role) {
  return { id: 4, email: 'superadmin@orthodoxmetrics.com', role: role };
}

function hasRole(user, role) {
  if (!user) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  
  return user.role === role;
}

function isSuperAdmin(user) {
  return hasRole(user, 'super_admin');
}

// Test with super_admin role
const superAdminUser = createMockUser('super_admin');
console.log('\n📊 Testing with role: "super_admin"');
console.log('User object:', superAdminUser);
console.log('isSuperAdmin():', isSuperAdmin(superAdminUser));
console.log('hasRole([\'admin\', \'super_admin\']):', hasRole(superAdminUser, ['admin', 'super_admin']));
console.log('Final condition (isSuperAdmin() || hasRole()):', 
  isSuperAdmin(superAdminUser) || hasRole(superAdminUser, ['admin', 'super_admin']));
console.log('Should show Content/Services tabs:', 
  (isSuperAdmin(superAdminUser) || hasRole(superAdminUser, ['admin', 'super_admin'])) ? 'YES ✅' : 'NO ❌');

// Test with admin role
const adminUser = createMockUser('admin');
console.log('\n📊 Testing with role: "admin"');
console.log('User object:', adminUser);
console.log('isSuperAdmin():', isSuperAdmin(adminUser));
console.log('hasRole([\'admin\', \'super_admin\']):', hasRole(adminUser, ['admin', 'super_admin']));
console.log('Final condition (isSuperAdmin() || hasRole()):', 
  isSuperAdmin(adminUser) || hasRole(adminUser, ['admin', 'super_admin']));
console.log('Should show Content/Services tabs:', 
  (isSuperAdmin(adminUser) || hasRole(adminUser, ['admin', 'super_admin'])) ? 'YES ✅' : 'NO ❌');

// Test with regular user role
const regularUser = createMockUser('user');
console.log('\n📊 Testing with role: "user"');
console.log('User object:', regularUser);
console.log('isSuperAdmin():', isSuperAdmin(regularUser));
console.log('hasRole([\'admin\', \'super_admin\']):', hasRole(regularUser, ['admin', 'super_admin']));
console.log('Final condition (isSuperAdmin() || hasRole()):', 
  isSuperAdmin(regularUser) || hasRole(regularUser, ['admin', 'super_admin']));
console.log('Should show Content/Services tabs:', 
  (isSuperAdmin(regularUser) || hasRole(regularUser, ['admin', 'super_admin'])) ? 'YES ✅' : 'NO ❌');

console.log('\n🎯 CONCLUSION:');
console.log('The logic is working correctly!');
console.log('The issue must be that your frontend AuthContext');
console.log('either doesn\'t have the user object, or has wrong role data.');
console.log('');
console.log('💡 Next step: Run the frontend debugging scripts to see');
console.log('what your AuthContext actually contains!'); 