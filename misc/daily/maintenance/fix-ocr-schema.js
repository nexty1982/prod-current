#!/usr/bin/env node

// Fix OCR database schema - add missing columns
const { promisePool } = require('./config/db');
const { getChurchDbConnection } = require('./utils/dbSwitcher');

async function fixOcrSchema() {
    console.log('🔧 Fixing OCR Database Schema...\n');
    
    try {
        // Get all churches
        const [churches] = await promisePool.query('SELECT id, name, database_name FROM churches');
        console.log(`Found ${churches.length} churches to update\n`);
        
        for (const church of churches) {
            console.log(`🏛️  Updating ${church.name} (${church.database_name})...`);
            
            try {
                const db = await getChurchDbConnection(church.database_name);
                
                // Check current schema
                const [columns] = await db.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_jobs'
                `, [church.database_name]);
                
                const existingColumns = columns.map(col => col.COLUMN_NAME);
                console.log(`   Current columns: ${existingColumns.join(', ')}`);
                
                // Add missing columns
                const alterQueries = [];
                
                if (!existingColumns.includes('description')) {
                    alterQueries.push("ALTER TABLE ocr_jobs ADD COLUMN description TEXT DEFAULT NULL");
                }
                
                if (!existingColumns.includes('processing_log')) {
                    alterQueries.push("ALTER TABLE ocr_jobs ADD COLUMN processing_log TEXT DEFAULT NULL");
                }
                
                if (!existingColumns.includes('error_regions')) {
                    alterQueries.push("ALTER TABLE ocr_jobs ADD COLUMN error_regions JSON DEFAULT NULL");
                }
                
                if (alterQueries.length > 0) {
                    console.log(`   Adding ${alterQueries.length} missing columns...`);
                    for (const query of alterQueries) {
                        await db.query(query);
                        console.log(`   ✅ ${query.split('ADD COLUMN ')[1].split(' ')[0]} column added`);
                    }
                } else {
                    console.log('   ✅ Schema is already up to date');
                }
                
            } catch (error) {
                console.error(`   ❌ Error updating ${church.name}:`, error.message);
            }
        }
        
        console.log('\n🎉 OCR Schema Update Complete!');
        console.log('\n📋 Updated columns:');
        console.log('   - description: TEXT (optional upload description)');
        console.log('   - processing_log: TEXT (processing status and logs)');
        console.log('   - error_regions: JSON (error details for failed processing)');
        
    } catch (error) {
        console.error('❌ Error during schema update:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

fixOcrSchema();
