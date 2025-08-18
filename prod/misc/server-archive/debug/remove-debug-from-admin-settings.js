const fs = require('fs');
const path = require('path');

console.log('🧹 Removing debug logging from AdminSettings.tsx...');

const adminSettingsPath = path.join(__dirname, '../../front-end/src/views/admin/AdminSettings.tsx');

// Read the current file
let content = fs.readFileSync(adminSettingsPath, 'utf8');

// Check if debug code exists
if (!content.includes('// 🚨 DEBUG CODE - REMOVE AFTER TESTING')) {
  console.log('✅ No debug code found in AdminSettings.tsx');
  return;
}

// Find and remove the debug code block
const debugStartPattern = /const { isSuperAdmin, hasRole, user } = useAuth\(\);\s*\n\s*\/\/ 🚨 DEBUG CODE - REMOVE AFTER TESTING[\s\S]*?\/\/ 🚨 END DEBUG CODE/;
const originalLine = 'const { isSuperAdmin, hasRole, user } = useAuth();';

content = content.replace(debugStartPattern, originalLine);

// Write the cleaned file
fs.writeFileSync(adminSettingsPath, content);

console.log('✅ Debug code removed from AdminSettings.tsx');
console.log('🔄 Refresh your browser to see the clean version'); 