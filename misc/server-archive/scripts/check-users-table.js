const path = require('path');
const DatabaseService = require('../services/databaseService');

/**
 * Check Users Table Structure
 * Identify all required fields in the users table
 */

async function checkUsersTableStructure() {
    console.log('🔍 CHECKING USERS TABLE STRUCTURE');
    console.log('========================================');

    try {
        // Get table structure
        console.log('\n1. Getting users table structure...');
        const structureResult = await DatabaseService.queryPlatform('DESCRIBE users');
        const structureData = structureResult[0]; // Correct access to data rows
        
        console.log('✅ Users table structure:');
        structureData.forEach((field, index) => {
            const required = field.Null === 'NO' && field.Default === null && field.Extra !== 'auto_increment';
            const status = required ? '❗ REQUIRED' : '✅ Optional';
            console.log(`   ${index + 1}. ${field.Field} (${field.Type}) - ${status}`);
            console.log(`      Null: ${field.Null}, Default: ${field.Default}, Extra: ${field.Extra}`);
        });

        // Check existing users to see what data they have
        console.log('\n2. Checking existing user data patterns...');
        const usersResult = await DatabaseService.queryPlatform('SELECT * FROM users LIMIT 2');
        const usersData = usersResult[0];
        
        if (usersData.length > 0) {
            console.log('✅ Sample user data:');
            console.log('   Fields available:', Object.keys(usersData[0]));
            usersData.forEach((user, index) => {
                console.log(`   User ${index + 1}:`);
                Object.entries(user).forEach(([key, value]) => {
                    console.log(`      ${key}: ${value}`);
                });
            });
        }

        return structureData;

    } catch (error) {
        console.error('❌ Error checking table structure:', error);
        return null;
    }
}

// Run the check
checkUsersTableStructure()
    .then((structure) => {
        if (structure) {
            console.log('\n✅ Table structure check completed');
            process.exit(0);
        } else {
            console.log('\n❌ Table structure check failed');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
