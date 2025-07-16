#!/usr/bin/env node

// Cleanup script for fake/test churches
// Run with: node cleanup-fake-churches.js

const { promisePool } = require('./config/db');

console.log('🧹 Cleaning up fake/test churches\n');

async function cleanupFakeChurches() {
    try {
        // Get all churches except the real one (Saints Peter and Paul)
        console.log('1️⃣ Finding fake churches...');
        const [churches] = await promisePool.query(`
            SELECT id, name, database_name 
            FROM churches 
            WHERE name NOT LIKE '%Saints Peter and Paul%'
            ORDER BY id
        `);
        
        if (churches.length === 0) {
            console.log('✅ No fake churches found to clean up');
            return;
        }
        
        console.log(`Found ${churches.length} fake churches to clean up:`);
        churches.forEach(church => {
            console.log(`   - ${church.name} (ID: ${church.id})`);
        });
        
        // Remove fake churches from the database
        console.log('\n2️⃣ Removing fake churches from central database...');
        for (const church of churches) {
            await promisePool.query('DELETE FROM churches WHERE id = ?', [church.id]);
            console.log(`✅ Removed: ${church.name}`);
        }
        
        console.log('\n🎉 Cleanup complete!');
        console.log('\n📋 Summary:');
        console.log(`   🗑️  Removed ${churches.length} fake churches`);
        console.log('   ✅ Saints Peter and Paul Orthodox Church preserved');
        console.log('\n📝 Note: This only removes entries from the central churches table.');
        console.log('   Individual church databases (if any were created) still exist.');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await promisePool.end();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the cleanup
cleanupFakeChurches();
