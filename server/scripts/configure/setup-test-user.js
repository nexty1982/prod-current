// Setup test user for SSPPOC authentication
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment configuration
const envFile = process.env.NODE_ENV === 'production'
    ? './.env.production'
    : './.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

async function setupTestUser() {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'orthodoxapp',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: process.env.DB_NAME || 'ssppoc_records_db',
        });

        console.log('✅ Connected to database:', process.env.DB_NAME || 'ssppoc_records_db');

        // Check if users table exists
        const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME || 'ssppoc_records_db']);

        if (tables.length === 0) {
            console.log('📝 Creating users table...');
            await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) DEFAULT 'admin',
          landing_page VARCHAR(255) DEFAULT '/dashboard/analytics',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL,
          active BOOLEAN DEFAULT TRUE
        )
      `);
            console.log('✅ Users table created');
        } else {
            console.log('✅ Users table exists');
        }

        // Check if test user exists
        const [existingUsers] = await connection.query(
            'SELECT id, email FROM users WHERE email = ?',
            ['admin@ssppoc.org']
        );

        if (existingUsers.length === 0) {
            console.log('📝 Creating test user...');

            // Hash password
            const passwordHash = await bcrypt.hash('admin123', 10);

            // Insert test user
            await connection.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, landing_page)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
                'admin@ssppoc.org',
                passwordHash,
                'SSPPOC',
                'Administrator',
                'admin',
                '/dashboard/analytics'
            ]);

            console.log('✅ Test user created:');
            console.log('   Email: admin@ssppoc.org');
            console.log('   Password: admin123');
        } else {
            console.log('✅ Test user already exists:', existingUsers[0].email);
        }

        // Show all users
        const [allUsers] = await connection.query('SELECT id, email, first_name, last_name, role, created_at FROM users');
        console.log('\n📋 All users in database:');
        allUsers.forEach(user => {
            console.log(`   ${user.id}: ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
}

// Run the setup
setupTestUser();
