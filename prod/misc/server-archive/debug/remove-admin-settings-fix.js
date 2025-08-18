const fs = require('fs');
const path = require('path');

console.log('🧹 Removing temporary fix from AdminSettings...');

const adminSettingsPath = path.join(__dirname, '../../front-end/src/views/admin/AdminSettings.tsx');

// Read the current file
let content = fs.readFileSync(adminSettingsPath, 'utf8');

// Check if fix exists
if (!content.includes('// 🚨 TEMPORARY FIX - BYPASS AUTHCONTEXT')) {
  console.log('✅ No temporary fix found in AdminSettings.tsx');
  return;
}

// Remove the temporary fix code block
const fixPattern = /const { isSuperAdmin, hasRole, user } = useAuth\(\);\s*\n\s*\/\/ 🚨 TEMPORARY FIX - BYPASS AUTHCONTEXT[\s\S]*?\/\/ 🚨 END TEMPORARY FIX/;
const originalLine = 'const { isSuperAdmin, hasRole, user } = useAuth();';

content = content.replace(fixPattern, originalLine);

// Restore the original conditional rendering
content = content.replace(/{shouldShowTabs}/g, '{(isSuperAdmin() || hasRole([\'admin\', \'super_admin\']))}');

// Write the cleaned file
fs.writeFileSync(adminSettingsPath, content);

console.log('✅ Temporary fix removed from AdminSettings.tsx');
console.log('🔄 Refresh your browser to use the original AuthContext'); 