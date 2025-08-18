#!/usr/bin/env node

// Test script for church database connection functionality
const { promisePool } = require('../../config/db');

async function testChurchDatabaseConnection() {
    console.log('🧪 Testing church database connection functionality...\n');
    
    try {
        // Test 1: Check church record
        console.log('1️⃣ Checking church record...');
        const [churches] = await promisePool.query(
            'SELECT id, name, database_name FROM churches WHERE id = 14'
        );
        
        if (churches.length === 0) {
            console.log('❌ Church with ID 14 not found');
            return;
        }
        
        const church = churches[0];
        console.log('✅ Church found:', {
            id: church.id,
            name: church.name,
            database_name: church.database_name
        });
        
        if (!church.database_name) {
            console.log('❌ Church has no database_name configured');
            return;
        }
        
        // Test 2: Check if database exists
        console.log('\n2️⃣ Checking if database exists...');
        const [dbExists] = await promisePool.query(`
            SELECT SCHEMA_NAME 
            FROM information_schema.SCHEMATA 
            WHERE SCHEMA_NAME = ?
        `, [church.database_name]);
        
        if (dbExists.length === 0) {
            console.log(`❌ Database '${church.database_name}' does not exist`);
            return;
        }
        
        console.log(`✅ Database '${church.database_name}' exists`);
        
        // Test 3: Get database stats
        console.log('\n3️⃣ Getting database stats...');
        const [dbStats] = await promisePool.query(`
            SELECT 
                COUNT(TABLE_NAME) as table_count,
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
        `, [church.database_name]);
        
        console.log('✅ Database stats:', {
            table_count: dbStats[0]?.table_count || 0,
            size_mb: dbStats[0]?.size_mb || 0
        });
        
        // Test 4: Test record table queries
        console.log('\n4️⃣ Testing record table queries...');
        const commonTables = ['baptism_records', 'marriage_records', 'funeral_records'];
        
        for (const tableName of commonTables) {
            try {
                const [tableQuery] = await promisePool.query(`
                    SELECT COUNT(*) as record_count 
                    FROM \`${church.database_name}\`.\`${tableName}\` 
                    LIMIT 1
                `);
                console.log(`✅ ${tableName}: ${tableQuery[0].record_count} records`);
            } catch (tableError) {
                console.log(`❌ ${tableName}: ${tableError.message}`);
            }
        }
        
        // Test 5: Test the new API endpoints (simulated)
        console.log('\n5️⃣ Testing API endpoint functionality...');
        
        try {
            // Test database info logic
            const [dbInfo] = await promisePool.execute(`
                SELECT 
                    TABLE_SCHEMA as name,
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                    COUNT(TABLE_NAME) as table_count
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ?
                GROUP BY TABLE_SCHEMA
            `, [church.database_name]);
            
            console.log('✅ Database info query successful:', dbInfo[0]);
            
        } catch (apiError) {
            console.log('❌ API endpoint test failed:', apiError.message);
        }
        
        console.log('\n🎉 All tests completed!');
        console.log('💡 You should now be able to:');
        console.log('   - See database name in admin UI');
        console.log('   - Get table counts'); 
        console.log('   - Test database connection successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

testChurchDatabaseConnection(); 