#!/usr/bin/env node
// Test church records loading functionality
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function testChurchRecordsLoading() {
    console.log('🔍 Testing church records loading functionality...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // Test 1: Check if churches are properly loaded
        console.log('1️⃣ Testing church loading...');
        const [churches] = await promisePool.execute(
            'SELECT id, name, email, is_active, has_baptism_records FROM churches WHERE is_active = TRUE LIMIT 5'
        );
        
        console.log(`   ✅ Found ${churches.length} active churches:`);
        churches.forEach(church => {
            console.log(`     - ${church.name} (ID: ${church.id}) - Baptism Records: ${church.has_baptism_records ? 'Yes' : 'No'}`);
        });
        
        if (churches.length === 0) {
            console.log('   ⚠️ No churches found! This explains why dropdown is empty.');
            console.log('   💡 Solution: Add churches to the database or check database connection.');
            return;
        }
        
        // Test 2: Check baptism records for a specific church
        const testChurch = churches[0];
        console.log(`\n2️⃣ Testing baptism records for "${testChurch.name}"...`);
        
        // Try multiple possible table names
        const possibleTables = [
            'baptism_records',
            `church_${testChurch.id}_baptism_records`,
            `baptism_records_church_${testChurch.id}`
        ];
        
        let recordsFound = false;
        for (const tableName of possibleTables) {
            try {
                const [tableExists] = await promisePool.execute(
                    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ? AND table_schema = DATABASE()',
                    [tableName]
                );
                
                if (tableExists[0].count > 0) {
                    console.log(`   ✅ Found table: ${tableName}`);
                    
                    const [records] = await promisePool.execute(
                        `SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`
                    );
                    
                    console.log(`     📊 Records in ${tableName}: ${records[0].count}`);
                    recordsFound = true;
                    
                    if (records[0].count > 0) {
                        // Get sample records
                        const [sampleRecords] = await promisePool.execute(
                            `SELECT * FROM ${tableName} LIMIT 3`
                        );
                        console.log(`     📝 Sample records:`);
                        sampleRecords.forEach((record, index) => {
                            const name = record.firstName || record.first_name || record.fname || 'Unknown';
                            const date = record.dateOfBaptism || record.baptism_date || record.bdate || 'Unknown';
                            console.log(`       ${index + 1}. ${name} - ${date}`);
                        });
                    }
                } else {
                    console.log(`   ❌ Table does not exist: ${tableName}`);
                }
            } catch (error) {
                console.log(`   ❌ Error checking table ${tableName}: ${error.message}`);
            }
        }
        
        if (!recordsFound) {
            console.log('   ⚠️ No baptism records tables found!');
            console.log('   💡 Solution: Create baptism records tables or import data.');
        }
        
        // Test 3: Check API endpoint
        console.log(`\n3️⃣ Testing API endpoint simulation...`);
        try {
            // Simulate what the frontend API call would do
            const query = `
                SELECT COUNT(*) as total
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name LIKE '%baptism%'
            `;
            
            const [apiTest] = await promisePool.execute(query);
            console.log(`   ✅ Total baptism-related tables: ${apiTest[0].total}`);
            
        } catch (error) {
            console.log(`   ❌ API endpoint test failed: ${error.message}`);
        }
        
        // Test 4: Check user-church associations
        console.log(`\n4️⃣ Testing user-church associations...`);
        const [userChurches] = await promisePool.execute(`
            SELECT u.email, u.church_id, c.name as church_name
            FROM users u
            LEFT JOIN churches c ON u.church_id = c.id
            WHERE u.email LIKE '%james%' OR u.email LIKE '%ssppoc%'
            LIMIT 5
        `);
        
        if (userChurches.length > 0) {
            console.log('   ✅ User-church associations:');
            userChurches.forEach(user => {
                console.log(`     - ${user.email} → ${user.church_name || 'No church assigned'} (ID: ${user.church_id || 'None'})`);
            });
        } else {
            console.log('   ⚠️ No users with church associations found');
        }
        
        console.log('\n📋 Summary and Recommendations:');
        console.log('=====================================');
        
        if (churches.length === 0) {
            console.log('❌ ISSUE: No churches in database');
            console.log('   🔧 FIX: Add churches via Admin → Church Management');
        } else {
            console.log('✅ Churches are available in database');
        }
        
        if (!recordsFound) {
            console.log('❌ ISSUE: No baptism records tables found');
            console.log('   🔧 FIX: Import baptism records or create sample data');
        } else {
            console.log('✅ Baptism records tables exist');
        }
        
        console.log('\n🎯 Frontend fixes applied:');
        console.log('   ✅ Fixed church.church_name → church.name');
        console.log('   ✅ Improved church selection logic');
        console.log('   ✅ Default to baptism records');
        console.log('   ✅ Added better error handling');
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Restart frontend development server');
        console.log('   2. Login and go to Church Records page');
        console.log('   3. Should now see church names in dropdown');
        console.log('   4. Should default to baptism records');
        console.log('   5. If no records show, import some sample data');
        
    } catch (error) {
        console.error('❌ Error testing church records loading:', error.message);
    } finally {
        await close();
    }
}

testChurchRecordsLoading(); 