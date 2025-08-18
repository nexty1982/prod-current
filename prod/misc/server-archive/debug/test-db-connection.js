#!/usr/bin/env node
// Simple database connection test for scripts
const { testConnection, getDatabaseInfo, close } = require('../config/db-scripts');

async function testDatabaseConnection() {
    console.log('🧪 Testing Script Database Connection...\n');
    
    try {
        // Test basic connection
        const connectionResult = await testConnection();
        
        if (!connectionResult.success) {
            console.log('❌ Database connection failed!');
            console.log('   Please check:');
            console.log('   1. MySQL server is running');
            console.log('   2. Database credentials are correct');
            console.log('   3. Database user has proper permissions');
            console.log('\n🔧 To create a script database user:');
            console.log('   mysql -u root -p');
            console.log('   CREATE USER "orthodoxmetrics_user"@"localhost" IDENTIFIED BY "Summerof1982@!";');
            console.log('   GRANT ALL PRIVILEGES ON orthodoxmetrics_db.* TO "orthometrics_test"@"localhost";');
            console.log('   FLUSH PRIVILEGES;');
            console.log('   EXIT;');
            return;
        }
        
        // Get detailed database info
        console.log('\n📊 Getting database information...');
        const dbInfo = await getDatabaseInfo();
        
        if (dbInfo.success) {
            console.log('\n✅ Database Information:');
            console.log(`   Connected User: ${dbInfo.info.user}`);
            console.log(`   Database: ${dbInfo.info.database}`);
            console.log(`   MySQL Version: ${dbInfo.info.version}`);
            console.log(`   Total Tables: ${dbInfo.info.tableCount}`);
            
            // Check for key tables
            const importantTables = ['users', 'churches', 'user_profiles', 'notifications'];
            const foundTables = dbInfo.info.tables;
            
            console.log('\n🔍 Checking key tables:');
            importantTables.forEach(table => {
                const exists = foundTables.includes(table);
                console.log(`   ${exists ? '✅' : '❌'} ${table} ${exists ? 'found' : 'missing'}`);
            });
            
            if (foundTables.includes('users')) {
                console.log('\n👥 Sample users check...');
                const { promisePool } = require('../config/db-scripts');
                const [users] = await promisePool.execute(
                    'SELECT email, role, church_id FROM users LIMIT 5'
                );
                console.log(`   Found ${users.length} users (showing first 5):`);
                users.forEach(user => {
                    console.log(`     - ${user.email} (${user.role}) church_id: ${user.church_id || 'none'}`);
                });
            }
        }
        
        console.log('\n🎉 Database connection test completed successfully!');
        console.log('   Scripts should now work properly with this configuration.');
        
    } catch (error) {
        console.error('❌ Unexpected error during database test:', error.message);
        console.error('   Stack trace:', error.stack);
    } finally {
        // Clean up connections
        await close();
    }
}

// Run the test
testDatabaseConnection(); 
