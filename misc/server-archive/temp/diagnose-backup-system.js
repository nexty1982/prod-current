#!/usr/bin/env node

/**
 * Backup System Diagnostic Tool
 * 
 * This script diagnoses issues with:
 * 1. Storage information not loading
 * 2. Backup files not listing
 * 3. Database table existence
 * 4. API endpoint functionality
 */

require('dotenv').config();
const { promisePool } = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

console.log('🔍 BACKUP SYSTEM DIAGNOSTIC TOOL');
console.log('================================\n');

async function checkDatabaseTables() {
    console.log('📊 1. Checking Database Tables...');
    
    try {
        // Check if backup_settings table exists
        const [settingsResult] = await promisePool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'backup_settings'
        `);
        
        console.log(`   backup_settings table exists: ${settingsResult[0].count > 0 ? '✅' : '❌'}`);
        
        // Check if backup_files table exists
        const [filesResult] = await promisePool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'backup_files'
        `);
        
        console.log(`   backup_files table exists: ${filesResult[0].count > 0 ? '✅' : '❌'}`);
        
        // If tables don't exist, create them
        if (settingsResult[0].count === 0) {
            console.log('   🔧 Creating backup_settings table...');
            await promisePool.query(`
                CREATE TABLE backup_settings (
                    id INT PRIMARY KEY,
                    settings JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('   ✅ backup_settings table created');
        }
        
        if (filesResult[0].count === 0) {
            console.log('   🔧 Creating backup_files table...');
            await promisePool.query(`
                CREATE TABLE backup_files (
                    id VARCHAR(255) PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    size BIGINT DEFAULT 0,
                    type ENUM('full', 'database', 'files') NOT NULL,
                    status ENUM('completed', 'in_progress', 'failed') NOT NULL,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('   ✅ backup_files table created');
        }
        
        // Check current data
        const [settingsData] = await promisePool.query('SELECT * FROM backup_settings');
        const [filesData] = await promisePool.query('SELECT * FROM backup_files ORDER BY created_at DESC LIMIT 5');
        
        console.log(`   Settings records: ${settingsData.length}`);
        console.log(`   Backup files records: ${filesData.length}`);
        
        if (filesData.length > 0) {
            console.log('   Recent backup files:');
            filesData.forEach(file => {
                console.log(`     - ${file.filename} (${file.status}) - ${file.created_at}`);
            });
        }
        
    } catch (error) {
        console.error('   ❌ Database check failed:', error.message);
    }
    
    console.log('');
}

async function checkBackupDirectory() {
    console.log('📁 2. Checking Backup Directory...');
    
    const backupDir = process.env.BACKUP_DIR || '/opt/backups/orthodox-metrics';
    console.log(`   Configured backup directory: ${backupDir}`);
    
    try {
        // Check if directory exists
        const stats = await fs.stat(backupDir);
        console.log(`   Directory exists: ✅`);
        console.log(`   Directory created: ${stats.birthtime}`);
        
        // List files in backup directory
        const files = await fs.readdir(backupDir);
        console.log(`   Files in backup directory: ${files.length}`);
        
        if (files.length > 0) {
            console.log('   Backup files found:');
            for (const file of files.slice(0, 5)) {
                try {
                    const filePath = path.join(backupDir, file);
                    const fileStats = await fs.stat(filePath);
                    const sizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
                    console.log(`     - ${file} (${sizeMB} MB) - ${fileStats.mtime}`);
                } catch (err) {
                    console.log(`     - ${file} (cannot read stats)`);
                }
            }
        }
        
        // Calculate total backup space
        let totalSize = 0;
        for (const file of files) {
            try {
                const filePath = path.join(backupDir, file);
                const fileStats = await fs.stat(filePath);
                totalSize += fileStats.size;
            } catch (err) {
                // Skip files that can't be read
            }
        }
        
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(`   Total backup space used: ${totalSizeMB} MB`);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`   Directory exists: ❌`);
            console.log(`   🔧 Creating backup directory...`);
            try {
                await fs.mkdir(backupDir, { recursive: true });
                console.log(`   ✅ Backup directory created`);
            } catch (createError) {
                console.error(`   ❌ Failed to create directory: ${createError.message}`);
            }
        } else {
            console.error(`   ❌ Directory check failed: ${error.message}`);
        }
    }
    
    console.log('');
}

async function checkEnvironmentConfig() {
    console.log('⚙️  3. Checking Environment Configuration...');
    
    const config = {
        'BACKUP_DIR': process.env.BACKUP_DIR || '/opt/backups/orthodox-metrics',
        'APP_DIR': process.env.APP_DIR || '/var/www/orthodox-church-mgmt',
        'DB_HOST': process.env.DB_HOST || 'localhost',
        'DB_USER': process.env.DB_USER || 'ocm_user',
        'DB_NAME': process.env.DB_NAME || 'orthodox_church_management'
    };
    
    console.log('   Environment variables:');
    Object.entries(config).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
    });
    
    console.log('');
}

async function testDatabaseConnection() {
    console.log('🔌 4. Testing Database Connection...');
    
    try {
        const [result] = await promisePool.query('SELECT NOW() as current_time, DATABASE() as current_db');
        console.log(`   Database connection: ✅`);
        console.log(`   Current database: ${result[0].current_db}`);
        console.log(`   Server time: ${result[0].current_time}`);
        
        // Test backup settings access
        try {
            const [settings] = await promisePool.query('SELECT * FROM backup_settings WHERE id = 1');
            console.log(`   Backup settings accessible: ✅`);
            if (settings.length > 0) {
                const config = JSON.parse(settings[0].settings);
                console.log(`   Settings loaded: enabled=${config.enabled}, schedule='${config.schedule}'`);
            } else {
                console.log(`   No settings found, will use defaults`);
            }
        } catch (settingsError) {
            console.error(`   ❌ Backup settings access failed: ${settingsError.message}`);
        }
        
    } catch (error) {
        console.error(`   ❌ Database connection failed: ${error.message}`);
    }
    
    console.log('');
}

async function checkDatabaseList() {
    console.log('🗄️  5. Checking Available Databases...');
    
    try {
        const [databases] = await promisePool.query(`
            SHOW DATABASES 
            WHERE \`Database\` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        `);
        
        console.log(`   Found ${databases.length} databases to backup:`);
        databases.forEach(db => {
            console.log(`     - ${db.Database}`);
        });
        
    } catch (error) {
        console.error(`   ❌ Database list failed: ${error.message}`);
    }
    
    console.log('');
}

async function checkRequiredPackages() {
    console.log('📦 6. Checking Required Packages...');
    
    const requiredPackages = [
        'mysqldump',
        'archiver',
        'node-cron'
    ];
    
    for (const pkg of requiredPackages) {
        try {
            require(pkg);
            console.log(`   ${pkg}: ✅`);
        } catch (error) {
            console.log(`   ${pkg}: ❌ (${error.message})`);
        }
    }
    
    console.log('');
}

async function testBackupFunctionality() {
    console.log('🧪 7. Testing Core Backup Functions...');
    
    try {
        // Test backup directory creation
        const backupDir = process.env.BACKUP_DIR || '/opt/backups/orthodox-metrics';
        await fs.mkdir(backupDir, { recursive: true });
        console.log(`   Backup directory creation: ✅`);
        
        // Test file writing
        const testFile = path.join(backupDir, 'test-write.txt');
        await fs.writeFile(testFile, 'Test backup system write access');
        await fs.unlink(testFile);
        console.log(`   File write permissions: ✅`);
        
        // Test backup settings initialization
        const defaultSettings = {
            enabled: true,
            schedule: '0 2 * * *',
            retention_days: 30,
            include_database: true,
            include_files: true,
            include_uploads: true,
            compression: true,
            email_notifications: false,
            notification_email: '',
            backup_location: backupDir,
            max_backups: 50,
        };
        
        await promisePool.query(
            'INSERT INTO backup_settings (id, settings) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings = ?',
            [JSON.stringify(defaultSettings), JSON.stringify(defaultSettings)]
        );
        console.log(`   Backup settings initialization: ✅`);
        
    } catch (error) {
        console.error(`   ❌ Backup functionality test failed: ${error.message}`);
    }
    
    console.log('');
}

async function main() {
    try {
        await checkDatabaseTables();
        await checkBackupDirectory();
        await checkEnvironmentConfig();
        await testDatabaseConnection();
        await checkDatabaseList();
        await checkRequiredPackages();
        await testBackupFunctionality();
        
        console.log('🎉 DIAGNOSTIC COMPLETE!');
        console.log('========================');
        console.log('');
        console.log('📋 SUMMARY:');
        console.log('- Database tables should now be created if they were missing');
        console.log('- Backup directory should be created and accessible');
        console.log('- Default settings should be initialized');
        console.log('- Check the logs above for any ❌ errors that need attention');
        console.log('');
        console.log('🔧 NEXT STEPS:');
        console.log('1. Restart your server to pick up any database changes');
        console.log('2. Access the backup settings at /admin/settings (Backup tab)');
        console.log('3. Check if storage information and backup files now load correctly');
        console.log('');
        
    } catch (error) {
        console.error('❌ DIAGNOSTIC FAILED:', error);
    } finally {
        process.exit(0);
    }
}

// Run the diagnostic
main().catch(console.error);
