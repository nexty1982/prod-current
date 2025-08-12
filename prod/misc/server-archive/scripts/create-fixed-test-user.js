const path = require('path');
const bcrypt = require('bcrypt');
const DatabaseService = require('../services/databaseService');

/**
 * Fixed Test User Creation Script
 * Using correct database access pattern: result[0] for data, result[1] for metadata
 */

async function createTestUser() {
    console.log('👤 CREATING TEST USER WITH CORRECT DATABASE ACCESS');
    console.log('========================================');

    try {
        const testEmail = 'test@orthodoxmetrics.com';
        const testPassword = 'TestPassword123!';
        const testRole = 'admin';
        const testFirstName = 'Test';
        const testLastName = 'User';

        // Check if user already exists using correct access pattern
        console.log('\n1. Checking if test user already exists...');
        const existingResult = await DatabaseService.queryPlatform(
            'SELECT id, email, role FROM users WHERE email = ?', 
            [testEmail]
        );
        const existingData = existingResult[0]; // Correct access to data rows
        
        if (existingData.length > 0) {
            const existingUser = existingData[0];
            console.log(`✅ Test user already exists:`);
            console.log(`   ID: ${existingUser.id}`);
            console.log(`   Email: ${existingUser.email}`);
            console.log(`   Role: ${existingUser.role}`);
            return existingUser;
        }

        // Hash the password
        console.log('\n2. Hashing password...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(testPassword, saltRounds);
        console.log('✅ Password hashed successfully');

        // Create the user
        console.log('\n3. Creating test user...');
        const insertResult = await DatabaseService.queryPlatform(
            'INSERT INTO users (email, password_hash, first_name, last_name, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [testEmail, hashedPassword, testFirstName, testLastName, testRole]
        );
        console.log('✅ User creation query executed');

        // Get the newly created user
        console.log('\n4. Retrieving newly created user...');
        const newUserResult = await DatabaseService.queryPlatform(
            'SELECT id, email, role, created_at FROM users WHERE email = ?', 
            [testEmail]
        );
        const newUserData = newUserResult[0]; // Correct access to data rows
        
        if (newUserData.length > 0) {
            const newUser = newUserData[0];
            console.log(`✅ Test user created successfully:`);
            console.log(`   ID: ${newUser.id}`);
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Role: ${newUser.role}`);
            console.log(`   Created: ${newUser.created_at}`);
            
            // Test login with the new user
            console.log('\n5. Testing password verification...');
            const isValid = await bcrypt.compare(testPassword, hashedPassword);
            console.log(`✅ Password verification: ${isValid ? 'PASSED' : 'FAILED'}`);
            
            return newUser;
        } else {
            throw new Error('Failed to retrieve newly created user');
        }

    } catch (error) {
        console.error('❌ Error creating test user:', error);
        throw error;
    }
}

// Run the script
createTestUser()
    .then((user) => {
        console.log('\n🎉 TEST USER CREATION COMPLETED');
        console.log(`Final user: ID=${user.id}, Email=${user.email}, Role=${user.role}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test user creation failed:', error);
        process.exit(1);
    });
