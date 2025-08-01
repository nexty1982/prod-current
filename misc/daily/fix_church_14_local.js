const { promisePool } = require('./config/db');

async function fixChurch14() {
    try {
        console.log('🔍 Checking church 14 current configuration...');
        
        // Check current state of church 14
        const [churches] = await promisePool.execute(
            'SELECT id, name, database_name, email FROM churches WHERE id = 14'
        );
        
        if (churches.length === 0) {
            console.log('❌ Church 14 not found');
            process.exit(1);
        }
        
        const church = churches[0];
        console.log('📋 Current church 14 info:');
        console.log(`   Name: ${church.name}`);
        console.log(`   Email: ${church.email}`);
        console.log(`   Database Name: ${church.database_name || 'NOT SET'}`);
        
        // If database_name is not set, configure it
        if (!church.database_name) {
            console.log('');
            console.log('🔧 Setting database_name for church 14...');
            
            // Generate database name based on church name
            const churchSlug = church.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .substring(0, 50);
            
            const databaseName = `${churchSlug}_records_db`;
            
            console.log(`   Generated database name: ${databaseName}`);
            
            // Update the church record
            await promisePool.execute(
                'UPDATE churches SET database_name = ? WHERE id = 14',
                [databaseName]
            );
            
            console.log('✅ Church 14 database_name updated successfully!');
            
            // Verify the update
            const [updatedChurch] = await promisePool.execute(
                'SELECT id, name, database_name FROM churches WHERE id = 14'
            );
            
            console.log('');
            console.log('📋 Updated church 14 info:');
            console.log(`   Name: ${updatedChurch[0].name}`);
            console.log(`   Database Name: ${updatedChurch[0].database_name}`);
            
        } else {
            console.log('✅ Church 14 already has database_name configured');
        }
        
        console.log('');
        console.log('🎯 CHURCH 14 FIX COMPLETE!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error fixing church 14:', error.message);
        process.exit(1);
    }
}

fixChurch14();
