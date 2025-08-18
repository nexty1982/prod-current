const fs = require('fs');
const path = require('path');

console.log('🔧 Creating temporary fix for AdminSettings...');

const adminSettingsPath = path.join(__dirname, '../../front-end/src/views/admin/AdminSettings.tsx');

// Read the current file
let content = fs.readFileSync(adminSettingsPath, 'utf8');

// Check if fix is already applied
if (content.includes('// 🚨 TEMPORARY FIX - BYPASS AUTHCONTEXT')) {
  console.log('⚠️  Temporary fix already applied');
  return;
}

// Find the useAuth line and replace with direct localStorage check
const useAuthPattern = /const { isSuperAdmin, hasRole, user } = useAuth\(\);/;

const fixedCode = `const { isSuperAdmin, hasRole, user } = useAuth();

    // 🚨 TEMPORARY FIX - BYPASS AUTHCONTEXT 
    // Read directly from localStorage since AuthContext is not updating
    const [localUser, setLocalUser] = useState(() => {
        try {
            const stored = localStorage.getItem('auth_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // Override AuthContext functions with direct localStorage checks
    const directIsSuperAdmin = () => {
        return localUser?.role === 'super_admin';
    };

    const directHasRole = (roles) => {
        if (!localUser) return false;
        if (Array.isArray(roles)) {
            return roles.includes(localUser.role);
        }
        return localUser.role === roles;
    };

    // Use direct functions instead of AuthContext
    const shouldShowTabs = directIsSuperAdmin() || directHasRole(['admin', 'super_admin']);
    
    console.log('🔍 Direct localStorage check:');
    console.log('localUser:', localUser);
    console.log('directIsSuperAdmin():', directIsSuperAdmin());
    console.log('directHasRole():', directHasRole(['admin', 'super_admin']));
    console.log('shouldShowTabs:', shouldShowTabs);
    // 🚨 END TEMPORARY FIX`;

// Replace the useAuth line
content = content.replace(useAuthPattern, fixedCode);

// Replace the conditional rendering to use our direct check
const tabsPattern = /{isSuperAdmin\(\) \|\| hasRole\(\['admin', 'super_admin'\]\)\)/g;
content = content.replace(tabsPattern, '{shouldShowTabs}');

// Write the fixed file
fs.writeFileSync(adminSettingsPath, content);

console.log('✅ Temporary fix applied to AdminSettings.tsx');
console.log('');
console.log('📋 WHAT THIS FIX DOES:');
console.log('1. Reads user data directly from localStorage');
console.log('2. Bypasses the broken AuthContext');
console.log('3. Shows Content/Services tabs based on localStorage role');
console.log('');
console.log('🔄 Next steps:');
console.log('1. Refresh your browser');
console.log('2. Go to Settings page');  
console.log('3. Content & Services tabs should now be visible!');
console.log('');
console.log('🧹 To remove this fix later:');
console.log('node server/debug/remove-admin-settings-fix.js'); 