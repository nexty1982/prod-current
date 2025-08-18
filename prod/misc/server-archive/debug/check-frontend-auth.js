#!/usr/bin/env node

console.log('🔍 Frontend Authentication Debug Script');
console.log('=====================================\n');

console.log('This script helps debug why Content and Services tabs are greyed out.\n');

console.log('📋 MANUAL DEBUG STEPS:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to your OrthodoxMetrics site');
console.log('3. Open Console tab');
console.log('4. Paste this code to check auth state:\n');

console.log('// Check authentication state');
console.log('console.log("=== AUTH DEBUG ===");');
console.log('console.log("Current user:", localStorage.getItem("user"));');
console.log('console.log("Auth token:", localStorage.getItem("authToken"));');
console.log('console.log("Session storage:", sessionStorage.getItem("user"));');
console.log('');
console.log('// Check if React context has user data');
console.log('// (Run this in React DevTools or add to component)');
console.log('// const { user, isSuperAdmin, hasRole } = useAuth();');
console.log('// console.log("User from context:", user);');
console.log('// console.log("isSuperAdmin():", isSuperAdmin());');
console.log('// console.log("hasRole([\'admin\', \'super_admin\']):", hasRole(["admin", "super_admin"]));');
console.log('');

console.log('🔧 COMMON ISSUES & FIXES:');
console.log('');
console.log('❌ ISSUE: User object is null/undefined');
console.log('   ✅ FIX: Clear cookies, localStorage, sessionStorage and login again');
console.log('');
console.log('❌ ISSUE: User role is not "admin" or "super_admin"');
console.log('   ✅ FIX: Update user role in database:');
console.log('   UPDATE orthodoxmetrics_db.users SET role = "super_admin" WHERE email = "your@email.com";');
console.log('');
console.log('❌ ISSUE: Session expired');
console.log('   ✅ FIX: Check session with: node debug/check-active-sessions.js');
console.log('');
console.log('❌ ISSUE: hasRole function not working');
console.log('   ✅ FIX: Check AuthContext implementation');
console.log('');

console.log('🔍 BACKEND VERIFICATION:');
console.log('Run these commands on your Linux server:');
console.log('');
console.log('# Check current sessions');
console.log('node debug/check-active-sessions.js');
console.log('');
console.log('# Check user role in database');
console.log('mysql -u root -p -e "SELECT id, email, role FROM orthodoxmetrics_db.users WHERE email = \'superadmin@orthodoxmetrics.com\';"');
console.log('');
console.log('# Check if backend auth middleware is working');
console.log('curl -H "Cookie: orthodox.sid=YOUR_SESSION_ID" https://orthodoxmetrics.com/api/admin/system-info');
console.log('');

console.log('🎯 EXPECTED BEHAVIOR:');
console.log('- User should have role "admin" or "super_admin"');
console.log('- hasRole(["admin", "super_admin"]) should return true');
console.log('- isSuperAdmin() OR hasRole() should make tabs visible');
console.log('- Content and Services tabs should appear and be clickable');
console.log('');

console.log('📧 If still greyed out, the issue is likely:');
console.log('1. Session not persisting (cookie domain mismatch)');
console.log('2. User role incorrect in database');  
console.log('3. Frontend auth context not updating properly');
console.log('4. Authentication middleware rejecting requests');

console.log('\n✅ Run this to get your session ID:');
console.log('Open browser DevTools → Application → Cookies → look for "orthodox.sid"'); 