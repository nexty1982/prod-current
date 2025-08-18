const fs = require('fs');
const path = require('path');

console.log('🔧 Adding debug logging to AdminSettings.tsx...');

const adminSettingsPath = path.join(__dirname, '../../front-end/src/views/admin/AdminSettings.tsx');

// Read the current file
let content = fs.readFileSync(adminSettingsPath, 'utf8');

// Check if debug code is already added
if (content.includes('// 🚨 DEBUG CODE - REMOVE AFTER TESTING')) {
  console.log('⚠️  Debug code already present in AdminSettings.tsx');
  console.log('💡 Go to your browser console to see debug output');
  return;
}

// Find the line with useAuth hook
const useAuthLine = 'const { isSuperAdmin, hasRole, user } = useAuth();';
const debugCode = `const { isSuperAdmin, hasRole, user } = useAuth();

    // 🚨 DEBUG CODE - REMOVE AFTER TESTING
    useEffect(() => {
        console.log('🔍 AdminSettings Debug Info:');
        console.log('user object:', user);
        console.log('user.role:', user?.role);
        console.log('isSuperAdmin():', isSuperAdmin());
        console.log('hasRole([\'admin\', \'super_admin\']):', hasRole(['admin', 'super_admin']));
        console.log('Should show Content/Services tabs:', (isSuperAdmin() || hasRole(['admin', 'super_admin'])));
    }, [user]);
    // 🚨 END DEBUG CODE`;

// Replace the useAuth line with debug version
content = content.replace(useAuthLine, debugCode);

// Write the modified file
fs.writeFileSync(adminSettingsPath, content);

console.log('✅ Debug code added to AdminSettings.tsx');
console.log('');
console.log('📋 NEXT STEPS:');
console.log('1. Go to your browser');
console.log('2. Open Dev Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Navigate to Settings page');
console.log('5. Look for debug output starting with "🔍 AdminSettings Debug Info"');
console.log('');
console.log('🧹 TO REMOVE DEBUG CODE LATER:');
console.log('node debug/remove-debug-from-admin-settings.js'); 