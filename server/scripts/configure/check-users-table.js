#!/usr/bin/env node

require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkUsersTable() {
    console.log('🔍 Checking users table structure...');

    let connection;
    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ssppoc_records_db'
        });

        console.log('✅ Connected to database:', process.env.DB_NAME || 'ssppoc_records_db');

        // Check if users table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'users'"
        );

        if (tables.length === 0) {
            console.log('❌ Users table does not exist');
            return;
        }

        console.log('✅ Users table exists');

        // Get table structure
        const [columns] = await connection.execute('DESCRIBE users');

        console.log('\n📋 Users table structure:');
        console.table(columns.map(col => ({
            Field: col.Field,
            Type: col.Type,
            Null: col.Null,
            Key: col.Key,
            Default: col.Default
        })));

        // Check for existing users
        const [users] = await connection.execute('SELECT id, email, role FROM users LIMIT 5');

        console.log('\n👥 Existing users (first 5):');
        if (users.length > 0) {
            console.table(users);
        } else {
            console.log('No users found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure MySQL is running');
        console.log('2. Check database connection settings in server/.env.development');
        console.log('3. Verify database exists and user has SELECT privileges');
    } finally {
        if (connection) {
            await connection.end();
            console.log('📡 Database connection closed');
        }
    }
}

checkUsersTable();
