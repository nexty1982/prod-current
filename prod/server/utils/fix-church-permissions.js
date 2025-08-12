#!/usr/bin/env node

// Fix Database Permissions for Church Databases
// Run with: node fix-church-permissions.js

const { promisePool } = require('../../config/db');

console.log('🔧 Fixing Database Permissions for Church Databases\n');

async function fixPermissions() {
    try {
        // Step 1: Get all churches with database names
        console.log('1️⃣ Finding all church databases...');
        const [churches] = await promisePool.query(`
            SELECT id, name, database_name 
            FROM churches 
            WHERE database_name IS NOT NULL AND database_name != ''
        `);
        
        console.log(`Found ${churches.length} churches with databases:`);
        churches.forEach(church => {
            console.log(`   - ${church.name} (DB: ${church.database_name})`);
        });
        
        if (churches.length === 0) {
            console.log('❌ No churches with databases found!');
            process.exit(1);
        }
        
        // Step 2: Grant permissions for each church database
        console.log('\n2️⃣ Granting permissions...');
        
        for (const church of churches) {
            console.log(`\n🏛️ Setting permissions for: ${church.name}`);
            console.log(`   Database: ${church.database_name}`);
            
            try {
                // Grant all privileges on the church database to orthodoxapps user
                const grantQuery = `GRANT ALL PRIVILEGES ON \`${church.database_name}\`.* TO 'orthodoxapps'@'localhost'`;
                await promisePool.query(grantQuery);
                console.log(`   ✅ Granted permissions on ${church.database_name}`);
                
                // Also grant permissions for any specific tables that might need it
                const tableGrants = [
                    `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${church.database_name}\`.ocr_jobs TO 'orthodoxapps'@'localhost'`,
                    `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${church.database_name}\`.ocr_settings TO 'orthodoxapps'@'localhost'`,
                    `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${church.database_name}\`.ocr_queue TO 'orthodoxapps'@'localhost'`
                ];
                
                for (const grantSql of tableGrants) {
                    try {
                        await promisePool.query(grantSql);
                    } catch (tableError) {
                        // Table might not exist, that's OK
                        console.log(`   ⚠️  Table permission warning: ${tableError.message.split(' ')[0]}`);
                    }
                }
                
            } catch (error) {
                console.error(`   ❌ Failed to grant permissions for ${church.database_name}:`, error.message);
            }
        }
        
        // Step 3: Flush privileges
        console.log('\n3️⃣ Flushing privileges...');
        try {
            await promisePool.query('FLUSH PRIVILEGES');
            console.log('✅ Privileges flushed successfully');
        } catch (error) {
            console.error('❌ Failed to flush privileges:', error.message);
        }
        
        // Step 4: Test permissions
        console.log('\n4️⃣ Testing permissions...');
        
        for (const church of churches) {
            try {
                // Try to connect to the church database using dbSwitcher
                const { getChurchDbConnection } = require('../utils/dbSwitcher');
                const churchDb = await getChurchDbConnection(church.database_name);
                
                // Test a simple query
                await churchDb.query('SELECT 1');
                console.log(`   ✅ ${church.name}: Connection successful`);
                
                // Test OCR table access
                try {
                    await churchDb.query('SELECT COUNT(*) as count FROM ocr_jobs LIMIT 1');
                    console.log(`   ✅ ${church.name}: OCR tables accessible`);
                } catch (ocrError) {
                    console.log(`   ⚠️  ${church.name}: OCR tables not accessible (${ocrError.message.split(' ')[0]})`);
                }
                
            } catch (error) {
                console.error(`   ❌ ${church.name}: Connection failed - ${error.message}`);
            }
        }
        
        console.log('\n🎉 Database Permissions Setup Complete!');
        console.log('\n📋 Summary:');
        console.log(`   📊 Processed ${churches.length} church databases`);
        console.log('   🔐 Granted ALL PRIVILEGES to orthodoxapps user');
        console.log('   🔄 Flushed MySQL privileges');
        
        console.log('\n🚀 Next Steps:');
        console.log('   1. Test Google Vision API again: node test-google-vision.js');
        console.log('   2. Test Church Admin Panel: http://192.168.1.239:3001/admin/church/14');
        console.log('   3. Test OCR functionality: http://192.168.1.239:3001/admin/church/14/ocr');
        
    } catch (error) {
        console.error('❌ Error fixing permissions:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

fixPermissions();
