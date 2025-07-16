#!/usr/bin/env node

// Add Real Church to Database Script
// Run with: node add-church.js

const { promisePool } = require('../config/db');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🏛️ Add Real Church to Orthodox Metrics Database\n');

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function generateDatabaseName(churchName) {
    return churchName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50) + '_db';
}

async function addChurch() {
    try {
        console.log('Please provide the church information:\n');
        
        // Basic Information
        const name = await question('1️⃣ Church Name: ');
        if (!name.trim()) {
            console.log('❌ Church name is required!');
            process.exit(1);
        }
        
        const email = await question('2️⃣ Church Email: ');
        if (!email.trim()) {
            console.log('❌ Church email is required!');
            process.exit(1);
        }
        
        const phone = await question('3️⃣ Phone (optional): ');
        const address = await question('4️⃣ Address (optional): ');
        const city = await question('5️⃣ City (optional): ');
        const state = await question('6️⃣ State/Province (optional): ');
        const postal = await question('7️⃣ Postal Code (optional): ');
        const country = await question('8️⃣ Country (optional): ');
        const website = await question('9️⃣ Website (optional): ');
        
        // Technical Configuration
        console.log('\n🔧 Technical Configuration:');
        const language = await question('🔤 Preferred Language (en/el/ru/etc): ') || 'en';
        const timezone = await question('🕐 Timezone (e.g., America/New_York): ') || 'UTC';
        const currency = await question('💰 Currency (USD/EUR/etc): ') || 'USD';
        
        // Generate database name
        const suggestedDbName = generateDatabaseName(name);
        console.log(`\n📊 Suggested database name: ${suggestedDbName}`);
        const customDbName = await question('📊 Database name (press enter to use suggested): ');
        const databaseName = customDbName.trim() || suggestedDbName;
        
        // Confirm
        console.log('\n📋 Church Information Summary:');
        console.log(`   Name: ${name}`);
        console.log(`   Email: ${email}`);
        console.log(`   Database: ${databaseName}`);
        console.log(`   Language: ${language}`);
        console.log(`   Timezone: ${timezone}`);
        if (phone) console.log(`   Phone: ${phone}`);
        if (city) console.log(`   Location: ${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`);
        
        const confirm = await question('\n✅ Add this church? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('❌ Cancelled.');
            process.exit(0);
        }
        
        // Insert into database
        console.log('\n💾 Adding church to database...');
        
        const insertQuery = `
            INSERT INTO churches (
                name, email, phone, address, city, state_province, 
                postal_code, country, website, preferred_language, 
                timezone, currency, database_name, is_active, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `;
        
        const values = [
            name.trim(),
            email.trim(),
            phone.trim() || null,
            address.trim() || null,
            city.trim() || null,
            state.trim() || null,
            postal.trim() || null,
            country.trim() || null,
            website.trim() || null,
            language.trim(),
            timezone.trim(),
            currency.trim(),
            databaseName
        ];
        
        const [result] = await promisePool.query(insertQuery, values);
        const churchId = result.insertId;
        
        console.log(`✅ Church added successfully! Church ID: ${churchId}`);
        
        // Create church database
        console.log(`\n🗄️ Creating database: ${databaseName}...`);
        
        try {
            await promisePool.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
            console.log(`✅ Database created: ${databaseName}`);
            
            // Create basic tables in the new database
            console.log('📋 Creating basic church tables...');
            
            const { getChurchDbConnection } = require('../utils/dbSwitcher');
            const churchDb = await getChurchDbConnection(databaseName);
            
            // Church info table
            await churchDb.query(`
                CREATE TABLE IF NOT EXISTS church_info (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    church_id INT NOT NULL,
                    location VARCHAR(255),
                    founded_year INT,
                    priest_name VARCHAR(255),
                    parish_size INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            // Users table
            await churchDb.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'super_admin', 'user') DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            // Activity log table
            await churchDb.query(`
                CREATE TABLE IF NOT EXISTS activity_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    church_id INT NOT NULL,
                    user_id INT,
                    action VARCHAR(255) NOT NULL,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Record tables
            const recordTables = ['baptism_records', 'marriage_records', 'funeral_records'];
            for (const tableName of recordTables) {
                await churchDb.query(`
                    CREATE TABLE IF NOT EXISTS ${tableName} (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        church_id INT NOT NULL,
                        person_name VARCHAR(255) NOT NULL,
                        date_performed DATE,
                        priest_name VARCHAR(255),
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                `);
            }
            
            // Invoice history table
            await churchDb.query(`
                CREATE TABLE IF NOT EXISTS invoice_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    church_id INT NOT NULL,
                    amount DECIMAL(10,2),
                    date DATE NOT NULL,
                    description TEXT,
                    status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            console.log('✅ Basic church tables created');
            
        } catch (dbError) {
            console.error('❌ Database creation failed:', dbError.message);
            console.log('⚠️  Church record created but database setup incomplete');
        }
        
        console.log('\n🎉 Church Setup Complete!');
        console.log('\n📊 Next Steps:');
        console.log(`   1. Test Church Admin Panel: /admin/church/${churchId}`);
        console.log(`   2. Add OCR tables: node utils/setup-ocr-tables.js`);
        console.log(`   3. Create admin users for the church`);
        console.log(`   4. Test OCR functionality: /admin/church/${churchId}/ocr`);
        
        console.log('\n🔗 URLs:');
        console.log(`   Admin Panel: http://192.168.1.239:3001/admin/church/${churchId}`);
        console.log(`   API Overview: http://192.168.1.239:3001/api/admin/church/${churchId}/overview`);
        
    } catch (error) {
        console.error('❌ Error adding church:', error.message);
        console.error(error);
    } finally {
        rl.close();
    }
}

addChurch();
