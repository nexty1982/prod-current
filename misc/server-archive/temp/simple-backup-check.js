#!/usr/bin/env node

/**
 * Minimal Backup System Database Check
 * Run this with: node simple-backup-check.js
 */

require('dotenv').config();

async function simpleCheck() {
    console.log('🔍 Quick Backup System Check\n');
    
    try {
        // Import database connection
        const { promisePool } = require('./config/db');
        
        console.log('1. Testing database connection...');
        const [result] = await promisePool.query('SELECT DATABASE() as db, NOW() as time');
        console.log('   ✅ Connected to database:', result[0].db);
        
        console.log('\n2. Checking backup tables...');
        
        // Check backup_settings
        try {
            const [settings] = await promisePool.query('SELECT COUNT(*) as count FROM backup_settings');
            console.log('   ✅ backup_settings table exists with', settings[0].count, 'records');
        } catch (err) {
            console.log('   ❌ backup_settings table missing:', err.message);
        }
        
        // Check backup_files
        try {
            const [files] = await promisePool.query('SELECT COUNT(*) as count FROM backup_files');
            console.log('   ✅ backup_files table exists with', files[0].count, 'records');
        } catch (err) {
            console.log('   ❌ backup_files table missing:', err.message);
        }
        
        console.log('\n3. Checking databases for backup...');
        const [databases] = await promisePool.query(`
            SHOW DATABASES 
            WHERE \`Database\` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        `);
        console.log('   📋 Databases found:', databases.map(db => db.Database).join(', '));
        
        console.log('\n✅ Basic check complete!');
        console.log('\nIf you see missing tables above, run these SQL commands:');
        console.log('   CREATE TABLE backup_settings (id INT PRIMARY KEY, settings JSON NOT NULL);');
        console.log('   CREATE TABLE backup_files (id VARCHAR(255) PRIMARY KEY, filename VARCHAR(255), size BIGINT, type ENUM("full","database","files"), status ENUM("completed","in_progress","failed"), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\nCheck your .env file database credentials:');
        console.log('   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    }
    
    process.exit(0);
}

simpleCheck();
