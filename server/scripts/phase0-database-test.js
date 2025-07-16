#!/usr/bin/env node

/**
 * Updated Database Connection Test for Phase 0
 * Tests the correct database names used in OrthodoxMetrics
 * 
 * Run with: node phase0-database-test.js
 */

const mysql = require('mysql2/promise');

async function testCorrectDatabases() {
    console.log('🔍 Testing Correct OrthodoxMetrics Database Connections');
    console.log('═'.repeat(60));
    
    const databases = [
        'saints_peter_and_paul_orthodox_church_db',
        'ssppoc_records_db',
        'orthodoxmetrics_db'
    ];

    const auth = {
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        port: 3306
    };

    console.log(`🔐 Testing with user: ${auth.user}\n`);

    let allSuccess = true;

    for (const dbName of databases) {
        console.log(`📋 Testing database: ${dbName}`);
        console.log('─'.repeat(40));
        
        try {
            // Test connection to specific database
            const connection = await mysql.createConnection({
                ...auth,
                database: dbName
            });

            console.log('✅ Connection successful!');
            
            // Test basic query
            const [result] = await connection.query('SELECT 1 as test');
            console.log('✅ Query test passed');
            
            // Check table count
            const [tables] = await connection.query('SHOW TABLES');
            console.log(`✅ Found ${tables.length} tables`);
            
            // For OCR database, check specific tables
            if (dbName === 'saints_peter_and_paul_orthodox_church_db') {
                const [ocrTables] = await connection.query("SHOW TABLES LIKE '%ocr%'");
                console.log(`✅ OCR tables: ${ocrTables.length} found`);
                
                ocrTables.forEach(table => {
                    const tableName = Object.values(table)[0];
                    console.log(`   • ${tableName}`);
                });
            }
            
            await connection.end();
            console.log('✅ Connection closed properly\n');
            
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}\n`);
            allSuccess = false;
        }
    }

    console.log('═'.repeat(60));
    if (allSuccess) {
        console.log('🎉 ALL DATABASE CONNECTIONS SUCCESSFUL!');
        console.log('✅ Phase 0 database testing PASSED');
        console.log('\n📋 Ready for next Phase 0 tests:');
        console.log('   • Google Vision API testing');
        console.log('   • OCR upload functionality');
        console.log('   • OCR processing pipeline');
    } else {
        console.log('❌ Some database connections failed');
        console.log('🔧 Fix database issues before proceeding');
    }
    
    return allSuccess;
}

// Run the test
if (require.main === module) {
    testCorrectDatabases()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test crashed:', error);
            process.exit(1);
        });
}

module.exports = { testCorrectDatabases };
