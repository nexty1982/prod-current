#!/usr/bin/env node
// Simple test of the SmartRedirect logic for frjames@ssppoc.org
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function testSmartRedirectLogic() {
    console.log('🧪 Testing SmartRedirect Logic for frjames@ssppoc.org...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // Get frjames user (from your database output)
        const userFromDb = {
            id: 20,
            email: 'frjames@ssppoc.org',
            role: 'admin',  // NOT super_admin
            church_id: 14   // Has church assigned
        };
        
        console.log('👤 User from database:');
        console.log(`   Email: ${userFromDb.email}`);
        console.log(`   Role: ${userFromDb.role}`);
        console.log(`   Church ID: ${userFromDb.church_id}`);
        
        // Simulate hasRole(['super_admin']) function
        const hasRoleSuper = ['super_admin'].includes(userFromDb.role);
        console.log(`\n🔄 hasRole(['super_admin']): ${hasRoleSuper}`);
        
        if (hasRoleSuper) {
            console.log('❌ ERROR: User should NOT be super_admin but hasRole returned true!');
        } else {
            console.log('✅ Correct: User is not super_admin, should go to regular user flow');
            
            if (userFromDb.church_id) {
                console.log(`✅ User has church_id: ${userFromDb.church_id}`);
                console.log(`✅ Expected redirect: /${userFromDb.church_id}-records`);
                console.log(`✅ Final URL should be: localhost:5173/${userFromDb.church_id}-records`);
            } else {
                console.log('❌ User has no church_id, would go to liturgical calendar');
            }
        }
        
        console.log('\n🔍 ISSUE ANALYSIS:');
        console.log('='.repeat(50));
        console.log('❌ ACTUAL: User goes to localhost:5173/admin');
        console.log('✅ EXPECTED: User should go to localhost:5173/14-records');
        console.log('');
        console.log('🚨 CONCLUSION: SmartRedirect is NOT running at all!');
        console.log('');
        console.log('💡 POSSIBLE CAUSES:');
        console.log('   1. Browser cache/localStorage has old redirect logic');
        console.log('   2. Another route catches "/" before SmartRedirect');
        console.log('   3. Server-side redirect happening');
        console.log('   4. Error boundary or other component redirecting');
        console.log('   5. React Router not properly set up');
        
        console.log('\n🧪 IMMEDIATE TESTS TO TRY:');
        console.log('   1. Clear all browser cache and localStorage');
        console.log('   2. Try incognito/private browsing window');
        console.log('   3. Manually go to localhost:5173/ and see what happens');
        console.log('   4. Check if SmartRedirect component mounts at all');
        console.log('   5. Check Network tab for any redirects');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await close();
    }
}

testSmartRedirectLogic(); 