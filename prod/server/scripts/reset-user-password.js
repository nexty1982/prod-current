#!/usr/bin/env node

/**
 * Orthodox Metrics - Password Reset CLI Tool
 * 
 * Usage:
 *   node reset-user-password.js <email> <new_password>
 *   node reset-user-password.js --user-id <id> <new_password>
 * 
 * Examples:
 *   node reset-user-password.js admin@orthodoxmetrics.com MyNewPassword123!
 *   node reset-user-password.js --user-id 1 MyNewPassword123!
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'orthodoxapps',
    password: process.env.DB_PASSWORD || 'Summerof1982@!',
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
    connectTimeout: 60000
};

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function showUsage() {
    colorLog('\n📝 Password Reset CLI Tool', 'blue');
    colorLog('════════════════════════════════════════', 'blue');
    colorLog('\nUsage:', 'cyan');
    colorLog('  node reset-user-password.js <email> <new_password>', 'yellow');
    colorLog('  node reset-user-password.js --user-id <id> <new_password>', 'yellow');
    colorLog('\nExamples:', 'cyan');
    colorLog('  node reset-user-password.js admin@orthodoxmetrics.com MyNewPassword123!', 'green');
    colorLog('  node reset-user-password.js --user-id 1 MyNewPassword123!', 'green');
    colorLog('\nPassword Requirements:', 'cyan');
    colorLog('  • Minimum 8 characters', 'yellow');
    colorLog('  • Mix of uppercase, lowercase, numbers, and symbols recommended', 'yellow');
    colorLog('');
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    
    return { valid: true };
}

async function resetPassword() {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    let userIdentifier, newPassword, searchByUserId = false;
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showUsage();
        process.exit(0);
    }
    
    if (args[0] === '--user-id') {
        if (args.length < 3) {
            colorLog('❌ Error: Missing user ID or password', 'red');
            showUsage();
            process.exit(1);
        }
        searchByUserId = true;
        userIdentifier = parseInt(args[1]);
        newPassword = args[2];
        
        if (isNaN(userIdentifier)) {
            colorLog('❌ Error: User ID must be a number', 'red');
            process.exit(1);
        }
    } else {
        if (args.length < 2) {
            colorLog('❌ Error: Missing email or password', 'red');
            showUsage();
            process.exit(1);
        }
        userIdentifier = args[0];
        newPassword = args[1];
    }
    
    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        colorLog(`❌ Error: ${passwordValidation.error}`, 'red');
        process.exit(1);
    }
    
    let connection;
    
    try {
        colorLog('🔌 Connecting to database...', 'blue');
        connection = await mysql.createConnection(dbConfig);
        colorLog('✅ Database connected successfully', 'green');
        
        // Find the user
        let query, params;
        if (searchByUserId) {
            query = 'SELECT id, email, first_name, last_name, role FROM orthodoxmetrics_auth_db.users WHERE id = ?';
            params = [userIdentifier];
            colorLog(`🔍 Looking for user with ID: ${userIdentifier}`, 'blue');
        } else {
            query = 'SELECT id, email, first_name, last_name, role FROM orthodoxmetrics_auth_db.users WHERE email = ?';
            params = [userIdentifier];
            colorLog(`🔍 Looking for user with email: ${userIdentifier}`, 'blue');
        }
        
        const [userRows] = await connection.execute(query, params);
        
        if (userRows.length === 0) {
            const identifier = searchByUserId ? `ID ${userIdentifier}` : `email ${userIdentifier}`;
            colorLog(`❌ Error: No user found with ${identifier}`, 'red');
            process.exit(1);
        }
        
        const user = userRows[0];
        colorLog(`✅ User found: ${user.first_name} ${user.last_name} (${user.email})`, 'green');
        colorLog(`   Role: ${user.role}`, 'cyan');
        
        // Hash the new password
        colorLog('🔐 Hashing new password...', 'blue');
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update the password
        colorLog('💾 Updating password in database...', 'blue');
        const updateQuery = 'UPDATE orthodoxmetrics_auth_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const [updateResult] = await connection.execute(updateQuery, [passwordHash, user.id]);
        
        if (updateResult.affectedRows === 1) {
            colorLog('\n🎉 Password reset successful!', 'green');
            colorLog('════════════════════════════════════════', 'green');
            colorLog(`👤 User: ${user.first_name} ${user.last_name}`, 'cyan');
            colorLog(`📧 Email: ${user.email}`, 'cyan');
            colorLog(`🔑 Password has been updated`, 'cyan');
            colorLog(`⏰ Updated at: ${new Date().toISOString()}`, 'cyan');
            colorLog('\n💡 The user should log in with their new password.', 'yellow');
        } else {
            colorLog('❌ Error: Password update failed - no rows affected', 'red');
            process.exit(1);
        }
        
    } catch (error) {
        colorLog('\n❌ Error occurred:', 'red');
        colorLog(`   ${error.message}`, 'red');
        
        if (error.code) {
            colorLog(`   Error Code: ${error.code}`, 'red');
        }
        
        if (error.code === 'ECONNREFUSED') {
            colorLog('\n💡 Troubleshooting:', 'yellow');
            colorLog('   • Check if MySQL server is running', 'yellow');
            colorLog('   • Verify database connection settings', 'yellow');
            colorLog('   • Check host, user, password, and database name', 'yellow');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            colorLog('🔌 Database connection closed', 'blue');
        }
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    colorLog(`\n💥 Uncaught Exception: ${error.message}`, 'red');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    colorLog(`\n💥 Unhandled Rejection: ${reason}`, 'red');
    process.exit(1);
});

// Run the script
resetPassword();