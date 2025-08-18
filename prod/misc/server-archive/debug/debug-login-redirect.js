#!/usr/bin/env node
// Debug the specific login redirect issue for frjames@ssppoc.org
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function debugLoginRedirect() {
    console.log('🔍 Debugging Login Redirect Issue for frjames@ssppoc.org...\n');
    
    try {
        // Test connection first
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database. Please check db connection.');
            return;
        }
        
        // Get frjames user data (same format as provided)
        console.log('1️⃣ Getting user data from database:');
        const [users] = await promisePool.execute(`
            SELECT 
                id, email, password_hash, first_name, last_name, avatar, 
                preferred_language, timezone, role, default_landing_page, 
                church_id, is_active, is_email_verified, last_login, 
                created_at, last_activity_at
            FROM users 
            WHERE email = ?
        `, ['frjames@ssppoc.org']);
        
        if (users.length === 0) {
            console.log('❌ User not found in database');
            return;
        }
        
        const user = users[0];
        console.log('👤 User Database Record:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Church ID: ${user.church_id}`);
        console.log(`   Default Landing: ${user.default_landing_page || 'none'}`);
        console.log(`   Is Active: ${user.is_active}`);
        
        // Simulate the AuthContext hasRole logic
        console.log('\n2️⃣ Simulating Frontend hasRole Logic:');
        
        // hasRole(['super_admin']) check
        const userRole = user.role;
        const requiredRoles = ['super_admin'];
        const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        const hasRoleSuper = rolesArray.includes(userRole);
        
        console.log(`   User role: "${userRole}"`);
        console.log(`   Checking hasRole(['super_admin']): ${hasRoleSuper}`);
        
        if (hasRoleSuper) {
            console.log('   ✅ User has super_admin role → SmartRedirect will check churches');
            
            // Simulate the admin/churches API call
            const [churches] = await promisePool.execute(
                'SELECT id, church_id, name FROM churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (churches.length > 0) {
                const church = churches[0];
                const churchRecordId = church.church_id || church.id;
                console.log(`   → First active church: ${church.name} (ID: ${churchRecordId})`);
                console.log(`   → Expected redirect: /${churchRecordId}-records`);
            } else {
                console.log('   → No active churches found');
                console.log('   → Expected redirect: /apps/church-management');
            }
        } else {
            console.log('   ✅ User does NOT have super_admin role → Check church assignment');
            
            if (user.church_id) {
                console.log(`   → User has church_id: ${user.church_id}`);
                console.log(`   → Expected redirect: /${user.church_id}-records`);
                
                // Get church name for verification
                const [churches] = await promisePool.execute(
                    'SELECT name, church_id FROM churches WHERE id = ?',
                    [user.church_id]
                );
                
                if (churches.length > 0) {
                    console.log(`   → Church name: ${churches[0].name}`);
                }
            } else {
                console.log('   → User has no church_id');
                console.log('   → Expected redirect: /apps/liturgical-calendar');
            }
        }
        
        // Check if there are any other redirect mechanisms
        console.log('\n3️⃣ Checking for Conflicting Redirect Logic:');
        
        // Check for default_landing_page
        if (user.default_landing_page) {
            console.log(`   ⚠️  User has default_landing_page: ${user.default_landing_page}`);
            console.log('   This might override SmartRedirect logic!');
        } else {
            console.log('   ✅ No default_landing_page set');
        }
        
        // Explain the expected flow
        console.log('\n4️⃣ Expected Login Flow:');
        console.log('   1. User logs in → OrthodoxLogin.tsx');
        console.log('   2. Login success → navigate("/")');
        console.log('   3. Router matches "/" → SmartRedirect component');
        console.log('   4. SmartRedirect checks hasRole(["super_admin"])');
        
        if (hasRoleSuper) {
            console.log('   5. hasRole returns TRUE → Super admin flow');
            console.log('   6. Fetch /api/admin/churches → Get first church');
            console.log('   7. Redirect to /{church_id}-records');
        } else {
            console.log('   5. hasRole returns FALSE → Regular user flow');
            console.log('   6. Check user.church_id');
            console.log(`   7. Redirect to /${user.church_id}-records`);
        }
        
        // Diagnose the actual issue
        console.log('\n🔍 DIAGNOSIS:');
        console.log('='.repeat(50));
        
        if (user.role === 'admin' && user.church_id === 14) {
            console.log('❌ ISSUE IDENTIFIED:');
            console.log('   User settings are CORRECT but still going to /admin');
            console.log('\n🧐 Possible causes:');
            console.log('   1. hasRole logic might be wrong (check AuthContext.tsx)');
            console.log('   2. SmartRedirect might not be triggering');
            console.log('   3. Some other redirect is happening first');
            console.log('   4. Browser caching old redirect logic');
            console.log('   5. Multiple SmartRedirect components triggering');
            
            console.log('\n🔧 Debugging steps:');
            console.log('   1. Check browser console during login');
            console.log('   2. Look for SmartRedirect console.log messages');
            console.log('   3. Check Network tab for API calls');
            console.log('   4. Clear browser cache/localStorage');
            console.log('   5. Add more console.log to SmartRedirect');
        } else {
            console.log('✅ User settings analysis complete');
        }
        
        // Specific recommendations
        console.log('\n💡 IMMEDIATE FIXES TO TRY:');
        console.log('   1. Add console.log to SmartRedirect useEffect');
        console.log('   2. Check if AuthContext user object is loaded correctly');
        console.log('   3. Verify hasRole function implementation');
        console.log('   4. Check for multiple Router entries with "/"');
        
    } catch (error) {
        console.error('❌ Error during debug:', error.message);
    } finally {
        await close();
    }
}

debugLoginRedirect(); 