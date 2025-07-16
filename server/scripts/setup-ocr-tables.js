#!/usr/bin/env node

// Script to create OCR tables in all church databases
// Run with: node setup-ocr-tables.js

const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { promisePool } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

async function setupOcrTables() {
    console.log('🔧 Setting up OCR tables in all church databases...\n');

    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, '../database/migrations/create_ocr_jobs_table.sql');
        const migrationSQL = await fs.readFile(sqlPath, 'utf8');

        // Get all churches from central database
        const [churches] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE is_active = 1');
        
        console.log(`Found ${churches.length} active churches to migrate\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const church of churches) {
            try {
                console.log(`🏛️  Processing ${church.name} (DB: ${church.database_name})...`);
                
                // Get connection to church database
                const db = await getChurchDbConnection(church.database_name);
                
                // Split SQL into individual statements
                const statements = migrationSQL
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0);

                // Execute each statement
                for (const statement of statements) {
                    if (statement.trim()) {
                        await db.query(statement);
                    }
                }

                // Insert default OCR settings for this church
                await db.query(`
                    INSERT IGNORE INTO ocr_settings 
                    (church_id, confidence_threshold, default_language, preprocessing_enabled, auto_process)
                    VALUES (?, 0.80, 'en', TRUE, TRUE)
                `, [church.id]);

                console.log(`   ✅ OCR tables created successfully`);
                successCount++;

            } catch (error) {
                console.error(`   ❌ Error setting up ${church.name}: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`\n🎉 Migration completed!`);
        console.log(`   ✅ Successful: ${successCount} churches`);
        console.log(`   ❌ Failed: ${errorCount} churches`);

        if (errorCount === 0) {
            console.log(`\n🚀 All church databases are ready for OCR processing!`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
setupOcrTables();
