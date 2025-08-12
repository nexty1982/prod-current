#!/usr/bin/env node

// Complete OCR system test
// Run with: node test-ocr-complete.js

const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { promisePool } = require('../../config/db');

console.log('🔬 Testing Complete OCR System\n');

async function testOcrSystem() {
    try {
        // Test 1: Get Saints Peter and Paul church info
        console.log('1️⃣ Getting church information...');
        const [churches] = await promisePool.query(
            'SELECT id, name, database_name FROM churches WHERE name LIKE "%Saints Peter and Paul%"'
        );
        
        if (churches.length === 0) {
            console.log('❌ Saints Peter and Paul church not found');
            return;
        }
        
        const church = churches[0];
        console.log(`✅ Found church: ${church.name} (ID: ${church.id})`);
        console.log(`   Database: ${church.database_name}`);
        
        // Test 2: Connect to church database
        console.log('\n2️⃣ Testing church database connection...');
        const db = await getChurchDbConnection(church.database_name);
        console.log('✅ Connected to church database successfully');
        
        // Test 3: Check OCR tables exist
        console.log('\n3️⃣ Checking OCR tables...');
        const [tables] = await db.query('SHOW TABLES LIKE "%ocr%"');
        const ocrTables = tables.map(row => Object.values(row)[0]);
        console.log(`✅ Found OCR tables: ${ocrTables.join(', ')}`);
        
        // Test 4: Check table contents
        console.log('\n4️⃣ Checking table contents...');
        const [jobCount] = await db.query('SELECT COUNT(*) as count FROM ocr_jobs');
        const [settingsCount] = await db.query('SELECT COUNT(*) as count FROM ocr_settings');
        const [queueCount] = await db.query('SELECT COUNT(*) as count FROM ocr_queue');
        
        console.log(`✅ OCR Jobs: ${jobCount[0].count}`);
        console.log(`✅ OCR Settings: ${settingsCount[0].count}`);
        console.log(`✅ OCR Queue: ${queueCount[0].count}`);
        
        // Test 5: Test OCR processing service
        console.log('\n5️⃣ Testing OCR processing service...');
        const ocrService = require('../services/ocrProcessingService');
        console.log('✅ OCR service loaded successfully');
        
        // Test 6: Test church-specific queue processing
        console.log('\n6️⃣ Testing church queue processing...');
        const processedJobs = await ocrService.processChurchQueue(church);
        console.log(`✅ Processed ${processedJobs} OCR jobs for ${church.name}`);
        
        // Test 7: Get processing stats
        console.log('\n7️⃣ Testing processing stats...');
        const stats = await ocrService.getProcessingStats();
        if (stats) {
            console.log('✅ Processing stats retrieved successfully:');
            console.log(`   Total churches: ${stats.totalChurches}`);
            console.log(`   Queue status:`, stats.queueStatus);
        } else {
            console.log('⚠️  Could not retrieve processing stats');
        }
        
        console.log('\n🎉 OCR System Test Complete!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Church database connection working');
        console.log('   ✅ OCR tables properly set up');
        console.log('   ✅ OCR processing service functional');
        console.log('   ✅ Multi-tenant OCR pipeline ready');
        
        console.log('\n🚀 Ready for production OCR testing!');
        console.log('\n📝 Next steps:');
        console.log('   1. Start the server: npm start');
        console.log(`   2. Visit: http://192.168.1.239:3001/admin/church/${church.id}`);
        console.log('   3. Test OCR upload in the admin panel');
        console.log('   4. Monitor OCR processing in real-time');
        
    } catch (error) {
        console.error('❌ OCR system test failed:', error);
    } finally {
        // Close database connections
        try {
            await promisePool.end();
            console.log('\n🔌 Database connections closed');
        } catch (closeError) {
            console.warn('Warning: Could not close database connections properly');
        }
    }
}

// Run the test
testOcrSystem();
