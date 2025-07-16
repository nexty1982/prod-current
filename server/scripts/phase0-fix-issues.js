#!/usr/bin/env node

/**
 * Phase 0 Issue Resolution Script
 * Fixes database connection and schema issues found during testing
 * 
 * Run with: node phase0-fix-issues.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

console.log('🔧 Phase 0: Fixing OCR System Issues');
console.log('═'.repeat(50));

class Phase0Fixer {
    constructor() {
        this.issues = [];
        this.fixes = [];
    }

    async testDatabaseConnections() {
        console.log('\n1️⃣ Testing Database Connections...');
        
        const databases = [
            'saints_peter_and_paul_orthodox_church_db',
            'ssppoc_records_db', 
            'orthodoxmetrics_db'
        ];

        // Try different auth methods
        const authMethods = [
            { user: 'orthodoxapps', password: 'Summerof1982@!' },
            { user: 'root', password: 'Summerof1982@!' },
            { user: 'root', password: '' },
            { user: 'orthodox', password: 'Summerof1982@!' }
        ];

        for (const auth of authMethods) {
            console.log(`\n🔐 Testing auth: ${auth.user}`);
            
            try {
                // Test connection without specific database first
                const connection = await mysql.createConnection({
                    host: 'localhost',
                    user: auth.user,
                    password: auth.password,
                    port: 3306
                });

                console.log(`✅ Connection successful with ${auth.user}`);
                
                // Test each database
                for (const dbName of databases) {
                    try {
                        await connection.query(`USE \`${dbName}\``);
                        console.log(`✅ Database ${dbName} accessible`);
                    } catch (dbError) {
                        console.log(`❌ Database ${dbName}: ${dbError.message}`);
                        if (dbError.message.includes('Unknown database')) {
                            this.issues.push(`Database ${dbName} does not exist`);
                        }
                    }
                }
                
                await connection.end();
                
                // Store working credentials
                this.workingAuth = auth;
                break;
                
            } catch (error) {
                console.log(`❌ Auth failed for ${auth.user}: ${error.message}`);
            }
        }
        
        if (!this.workingAuth) {
            console.log('\n🚨 No working database authentication found!');
            this.suggestDatabaseSetup();
        }
    }

    async fixOcrTableSchema() {
        console.log('\n2️⃣ Fixing OCR Table Schema Issues...');
        
        if (!this.workingAuth) {
            console.log('❌ Cannot fix schema - no database connection');
            return;
        }

        try {
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: this.workingAuth.user,
                password: this.workingAuth.password,
                database: 'saints_peter_and_paul_orthodox_church_db'
            });

            // Check current OCR settings table structure
            console.log('📋 Checking OCR settings table structure...');
            const [columns] = await connection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'saints_peter_and_paul_orthodox_church_db' 
                AND TABLE_NAME = 'ocr_settings'
            `);

            const existingColumns = columns.map(col => col.COLUMN_NAME);
            console.log(`Current columns: ${existingColumns.join(', ')}`);

            // Add missing columns if needed
            const requiredColumns = [
                'auto_process',
                'notification_email',
                'ocr_engine'
            ];

            for (const column of requiredColumns) {
                if (!existingColumns.includes(column)) {
                    console.log(`➕ Adding missing column: ${column}`);
                    
                    let alterSQL = '';
                    switch (column) {
                        case 'auto_process':
                            alterSQL = 'ALTER TABLE ocr_settings ADD COLUMN auto_process BOOLEAN DEFAULT TRUE';
                            break;
                        case 'notification_email':
                            alterSQL = 'ALTER TABLE ocr_settings ADD COLUMN notification_email VARCHAR(255) NULL';
                            break;
                        case 'ocr_engine':
                            alterSQL = "ALTER TABLE ocr_settings ADD COLUMN ocr_engine ENUM('google_vision','tesseract','hybrid') DEFAULT 'google_vision'";
                            break;
                    }
                    
                    if (alterSQL) {
                        await connection.query(alterSQL);
                        console.log(`✅ Added column: ${column}`);
                        this.fixes.push(`Added ${column} column to ocr_settings`);
                    }
                }
            }

            await connection.end();
            
        } catch (error) {
            console.log(`❌ Schema fix error: ${error.message}`);
            this.issues.push(`OCR schema issue: ${error.message}`);
        }
    }

    async createMissingDatabases() {
        console.log('\n3️⃣ Creating Missing Databases...');
        
        if (!this.workingAuth) {
            console.log('❌ Cannot create databases - no connection');
            return;
        }

        const databases = [
            'saints_peter_and_paul_orthodox_church_db',
            'ssppoc_records_db',
            'orthodoxmetrics_db'
        ];

        try {
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: this.workingAuth.user,
                password: this.workingAuth.password
            });

            for (const dbName of databases) {
                try {
                    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
                    console.log(`✅ Database ${dbName} exists or created`);
                    this.fixes.push(`Ensured database ${dbName} exists`);
                } catch (error) {
                    console.log(`❌ Could not create ${dbName}: ${error.message}`);
                    this.issues.push(`Cannot create database ${dbName}`);
                }
            }

            await connection.end();
            
        } catch (error) {
            console.log(`❌ Database creation error: ${error.message}`);
        }
    }

    async updateConfigFiles() {
        console.log('\n4️⃣ Updating Configuration Files...');
        
        if (!this.workingAuth) {
            console.log('❌ No working auth to update configs');
            return;
        }

        try {
            // Update server/config/db.js if it exists
            const dbConfigPath = path.join(__dirname, '../config/db.js');
            
            if (await this.fileExists(dbConfigPath)) {
                console.log('📝 Found db.js config file');
                // You might want to update this file with working credentials
                this.fixes.push('Database config file located');
            }

            // Create/update .env file
            const envPath = path.join(__dirname, '../.env');
            const envContent = `
# Database Configuration (Updated by Phase 0 fixer)
DB_HOST=localhost
DB_USER=${this.workingAuth.user}
DB_PASSWORD=${this.workingAuth.password}
DB_PORT=3306

# OCR Database
OCR_DATABASE=saints_peter_and_paul_orthodox_church_db

# Records Database  
RECORDS_DATABASE=ssppoc_records_db

# Main Framework Database
MAIN_DATABASE=orthodoxmetrics_db

# Google Vision API
GOOGLE_APPLICATION_CREDENTIALS=./credentials/orthodox-vision-api.json
`;

            await fs.writeFile(envPath, envContent);
            console.log('✅ Updated .env file with working credentials');
            this.fixes.push('Updated .env file');
            
        } catch (error) {
            console.log(`❌ Config update error: ${error.message}`);
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    suggestDatabaseSetup() {
        console.log('\n💡 Database Setup Suggestions:');
        console.log('─'.repeat(40));
        console.log('1. Connect to MySQL as root:');
        console.log('   mysql -u root -p');
        console.log('\n2. Create user and databases:');
        console.log(`   CREATE USER IF NOT EXISTS 'orthodoxapps'@'localhost' IDENTIFIED BY 'Summerof1982@!';`);
        console.log(`   CREATE DATABASE IF NOT EXISTS saints_peter_and_paul_orthodox_church_db;`);
        console.log(`   CREATE DATABASE IF NOT EXISTS ssppoc_records_db;`);
        console.log(`   CREATE DATABASE IF NOT EXISTS orthodoxmetrics_db;`);
        console.log(`   GRANT ALL PRIVILEGES ON *.* TO 'orthodoxapps'@'localhost';`);
        console.log(`   FLUSH PRIVILEGES;`);
    }

    async runAllFixes() {
        console.log('Starting Phase 0 issue resolution...\n');
        
        await this.testDatabaseConnections();
        await this.createMissingDatabases();
        await this.fixOcrTableSchema();
        await this.updateConfigFiles();
        
        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '═'.repeat(50));
        console.log('🏁 PHASE 0 ISSUE RESOLUTION SUMMARY');
        console.log('═'.repeat(50));
        
        if (this.fixes.length > 0) {
            console.log('\n✅ Issues Fixed:');
            this.fixes.forEach(fix => console.log(`   • ${fix}`));
        }
        
        if (this.issues.length > 0) {
            console.log('\n❌ Remaining Issues:');
            this.issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (this.workingAuth) {
            console.log('\n🎉 Phase 0 fixes completed!');
            console.log(`✅ Working database connection: ${this.workingAuth.user}`);
            console.log('\n📋 Next Steps:');
            console.log('1. Run: node scripts/phase0-ocr-system-test.js');
            console.log('2. Verify all tests pass');
            console.log('3. Proceed to Phase 1');
        } else {
            console.log('\n🚨 Critical Issues Remain');
            console.log('❌ No working database connection found');
            console.log('🔧 Follow database setup suggestions above');
        }
    }
}

// Run the fixer
async function main() {
    const fixer = new Phase0Fixer();
    
    try {
        await fixer.runAllFixes();
    } catch (error) {
        console.error('\n💥 Phase 0 fixer crashed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { Phase0Fixer };
