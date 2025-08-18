const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing useAuth import conflict...');

const churchRecordsProviderPath = path.join(__dirname, '../../front-end/src/context/ChurchRecordsProvider.tsx');

// Read the current file
let content = fs.readFileSync(churchRecordsProviderPath, 'utf8');

// Fix the conflicting import
const wrongImport = "import { useAuth } from '../api/church-records.hooks';";
const correctImport = "import { useAuth as useChurchRecordsAuth } from '../api/church-records.hooks';";

if (content.includes(wrongImport)) {
  content = content.replace(wrongImport, correctImport);
  
  // Also update the usage in the file
  content = content.replace(/const auth = useAuth\(\);/g, 'const auth = useChurchRecordsAuth();');
  
  // Write the fixed file
  fs.writeFileSync(churchRecordsProviderPath, content);
  
  console.log('✅ Fixed ChurchRecordsProvider useAuth conflict');
} else {
  console.log('⚠️  No conflict found in ChurchRecordsProvider');
}

// Check if AdminSettings has the temporary fix applied
const adminSettingsPath = path.join(__dirname, '../../front-end/src/views/admin/AdminSettings.tsx');
const adminContent = fs.readFileSync(adminSettingsPath, 'utf8');

if (adminContent.includes('// 🚨 TEMPORARY FIX - BYPASS AUTHCONTEXT')) {
  console.log('✅ Temporary localStorage fix is active in AdminSettings');
} else {
  console.log('❌ Temporary fix not found in AdminSettings');
}

console.log('\n🔄 NEXT STEPS:');
console.log('1. Hard refresh browser (Ctrl+Shift+R or Ctrl+F5)');
console.log('2. Clear browser cache completely');
console.log('3. Close and reopen browser');
console.log('4. Go to Settings page');
console.log('5. Look for "🔍 Direct localStorage check:" in console');
console.log('');
console.log('💡 IF STILL NOT WORKING:');
console.log('The frontend build might need to be refreshed.');
console.log('Check if you have a build process running (npm run build, etc.)');
console.log('');
console.log('🧹 NUCLEAR OPTION:');
console.log('Clear ALL browser data:');
console.log('- localStorage.clear();');
console.log('- sessionStorage.clear();');  
console.log('- Clear all cookies');
console.log('- Hard refresh (Ctrl+Shift+R)');
console.log('- Try in incognito/private mode'); 