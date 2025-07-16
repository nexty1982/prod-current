#!/usr/bin/env node

/**
 * Backup API Endpoint Tester
 * 
 * This script tests the backup API endpoints to verify they're working correctly.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');

// Mock session for testing
const mockSession = {
    user: {
        role: 'super_admin',
        id: 1,
        username: 'test-admin'
    }
};

console.log('🚀 BACKUP API ENDPOINT TESTER');
console.log('==============================\n');

async function testEndpoint(name, testFunction) {
    console.log(`📡 Testing ${name}...`);
    try {
        await testFunction();
        console.log(`   ✅ ${name} - SUCCESS\n`);
    } catch (error) {
        console.error(`   ❌ ${name} - FAILED:`, error.message);
        console.error(`      ${error.stack}\n`);
    }
}

async function testBackupSettings() {
    const backupRouter = require('./routes/backup');
    
    // Mock request and response objects
    const req = {
        session: mockSession,
        body: {},
        params: {},
        query: {}
    };
    
    const res = {
        status: (code) => res,
        json: (data) => {
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            return res;
        },
        send: (data) => {
            console.log(`   Response:`, data);
            return res;
        }
    };
    
    // Test GET /settings
    console.log('   → GET /api/admin/backup/settings');
    req.method = 'GET';
    req.url = '/settings';
    
    // Find the settings route handler
    const settingsRoute = backupRouter.stack.find(layer => 
        layer.route && layer.route.path === '/settings' && layer.route.methods.get
    );
    
    if (settingsRoute) {
        await settingsRoute.route.stack[1].handle(req, res, () => {});
    } else {
        throw new Error('Settings route not found');
    }
}

async function testBackupFiles() {
    const backupRouter = require('./routes/backup');
    
    const req = {
        session: mockSession,
        body: {},
        params: {},
        query: {}
    };
    
    const res = {
        status: (code) => res,
        json: (data) => {
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            return res;
        }
    };
    
    // Test GET /files
    console.log('   → GET /api/admin/backup/files');
    req.method = 'GET';
    req.url = '/files';
    
    const filesRoute = backupRouter.stack.find(layer => 
        layer.route && layer.route.path === '/files' && layer.route.methods.get
    );
    
    if (filesRoute) {
        await filesRoute.route.stack[1].handle(req, res, () => {});
    } else {
        throw new Error('Files route not found');
    }
}

async function testStorageInfo() {
    const backupRouter = require('./routes/backup');
    
    const req = {
        session: mockSession,
        body: {},
        params: {},
        query: {}
    };
    
    const res = {
        status: (code) => res,
        json: (data) => {
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            return res;
        }
    };
    
    // Test GET /storage
    console.log('   → GET /api/admin/backup/storage');
    req.method = 'GET';
    req.url = '/storage';
    
    const storageRoute = backupRouter.stack.find(layer => 
        layer.route && layer.route.path === '/storage' && layer.route.methods.get
    );
    
    if (storageRoute) {
        await storageRoute.route.stack[1].handle(req, res, () => {});
    } else {
        throw new Error('Storage route not found');
    }
}

async function testDatabasesList() {
    const backupRouter = require('./routes/backup');
    
    const req = {
        session: mockSession,
        body: {},
        params: {},
        query: {}
    };
    
    const res = {
        status: (code) => res,
        json: (data) => {
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            return res;
        }
    };
    
    // Test GET /databases
    console.log('   → GET /api/admin/backup/databases');
    req.method = 'GET';
    req.url = '/databases';
    
    const databasesRoute = backupRouter.stack.find(layer => 
        layer.route && layer.route.path === '/databases' && layer.route.methods.get
    );
    
    if (databasesRoute) {
        await databasesRoute.route.stack[1].handle(req, res, () => {});
    } else {
        throw new Error('Databases route not found');
    }
}

async function directDatabaseTest() {
    const { promisePool } = require('./config/db');
    
    console.log('   → Direct database query test');
    
    // Test backup_settings table
    try {
        const [settings] = await promisePool.query('SELECT * FROM backup_settings LIMIT 1');
        console.log(`   Settings table: ${settings.length} records found`);
    } catch (error) {
        console.log(`   Settings table error: ${error.message}`);
    }
    
    // Test backup_files table
    try {
        const [files] = await promisePool.query('SELECT * FROM backup_files LIMIT 5');
        console.log(`   Files table: ${files.length} records found`);
    } catch (error) {
        console.log(`   Files table error: ${error.message}`);
    }
    
    // Test storage directory
    const fs = require('fs').promises;
    const backupDir = process.env.BACKUP_DIR || '/opt/backups/orthodox-metrics';
    
    try {
        const files = await fs.readdir(backupDir);
        console.log(`   Backup directory: ${files.length} files found`);
    } catch (error) {
        console.log(`   Backup directory error: ${error.message}`);
    }
}

async function main() {
    try {
        console.log('🔍 Testing backup system components...\n');
        
        await testEndpoint('Direct Database Test', directDatabaseTest);
        await testEndpoint('Backup Settings API', testBackupSettings);
        await testEndpoint('Backup Files API', testBackupFiles);
        await testEndpoint('Storage Info API', testStorageInfo);
        await testEndpoint('Databases List API', testDatabasesList);
        
        console.log('🎉 API TESTING COMPLETE!');
        console.log('=========================\n');
        
        console.log('📋 If you see any ❌ errors above:');
        console.log('1. Run the diagnose-backup-system.js script first');
        console.log('2. Check that the backup tables exist in your database');
        console.log('3. Verify the backup directory has proper permissions');
        console.log('4. Restart your server after running the diagnostic script\n');
        
    } catch (error) {
        console.error('❌ API TESTING FAILED:', error);
    } finally {
        process.exit(0);
    }
}

// Run the API tests
main().catch(console.error);
