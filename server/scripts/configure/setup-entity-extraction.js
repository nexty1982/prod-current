// setup-entity-extraction.js
const { promisePool } = require('./config/db');
const { getChurchDbConnection } = require('./utils/dbSwitcher');
const fs = require('fs').promises;
const path = require('path');

async function setupEntityExtraction() {
    console.log('🤖 Setting up AI Entity Extraction system...\n');

    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, 'database/migrations/add_entity_extraction_tables.sql');
        const migrationSQL = await fs.readFile(sqlPath, 'utf8');

        // Get all churches from central database
        const [churches] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE is_active = 1');
        
        console.log(`Found ${churches.length} active churches to setup\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const church of churches) {
            try {
                console.log(`🏛️  Setting up entity extraction for: ${church.name}`);
                
                // Get connection to church database
                const db = await getChurchDbConnection(church.database_name);
                
                // Split SQL into individual statements and execute
                const statements = migrationSQL
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

                console.log(`   📋 Executing ${statements.length} SQL statements...`);

                for (const statement of statements) {
                    if (statement.trim()) {
                        try {
                            await db.query(statement);
                        } catch (error) {
                            // Skip errors for existing columns/tables
                            if (!error.message.includes('Duplicate column') && 
                                !error.message.includes('already exists') &&
                                !error.message.includes('Duplicate key')) {
                                throw error;
                            }
                        }
                    }
                }

                // Verify entity extraction tables exist
                const [tables] = await db.query(`
                    SELECT TABLE_NAME 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = ? 
                    AND TABLE_NAME IN ('ocr_extraction_results', 'ocr_correction_log', 'ocr_pattern_improvements', 'orthodox_knowledge_base')
                `, [church.database_name]);

                console.log(`   ✅ Created ${tables.length}/4 entity extraction tables`);
                
                // Check if new columns were added to ocr_jobs
                const [columns] = await db.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_jobs'
                    AND COLUMN_NAME IN ('extracted_entities', 'entity_confidence', 'needs_review', 'reviewed_by', 'review_date', 'review_notes')
                `, [church.database_name]);

                console.log(`   ✅ Added ${columns.length}/6 new columns to ocr_jobs table`);
                
                successCount++;

            } catch (error) {
                console.error(`   ❌ Error setting up ${church.name}: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`\n🎉 Entity Extraction Setup Complete!\n`);
        console.log('📊 Summary:');
        console.log(`   ✅ Successfully setup: ${successCount} churches`);
        console.log(`   ❌ Failed setup: ${errorCount} churches`);
        console.log(`   📋 Total churches: ${churches.length}`);
        
        if (successCount > 0) {
            console.log('\n🆕 New Features Added:');
            console.log('   🤖 AI Entity Extraction - Automatically extracts structured data from OCR text');
            console.log('   📊 Confidence Scoring - Provides confidence levels for extracted fields');
            console.log('   🎓 Machine Learning - Learns from user corrections to improve accuracy');
            console.log('   📋 Review System - Flags low-confidence extractions for human review');
            console.log('   📈 Analytics - Tracks extraction statistics and performance');
            console.log('   💾 Knowledge Base - Orthodox church-specific terminology and patterns');
            
            console.log('\n🚀 API Endpoints Available:');
            console.log('   GET    /api/church/{id}/ocr/jobs/{jobId}/entities - Get extracted entities');
            console.log('   PUT    /api/church/{id}/ocr/jobs/{jobId}/entities - Update entities with corrections');
            console.log('   POST   /api/church/{id}/ocr/jobs/{jobId}/extract - Manually trigger extraction');
            console.log('   GET    /api/church/{id}/ocr/extraction/stats - Get extraction statistics');
            console.log('   GET    /api/church/{id}/ocr/extraction/review - Get jobs needing review');
            console.log('   POST   /api/church/{id}/ocr/extraction/bulk - Bulk extract multiple jobs');
            
            console.log('\n📋 Database Tables Created:');
            console.log('   - ocr_extraction_results: Stores AI-extracted data for analytics');
            console.log('   - ocr_correction_log: Logs user corrections for machine learning');
            console.log('   - ocr_pattern_improvements: Tracks pattern learning improvements');
            console.log('   - orthodox_knowledge_base: Orthodox church-specific terminology');
            
            console.log('\n🔧 Enhanced OCR Jobs Table:');
            console.log('   - extracted_entities: JSON field containing structured extracted data');
            console.log('   - entity_confidence: Confidence score for entity extraction');
            console.log('   - needs_review: Boolean flag for low-confidence extractions');
            console.log('   - reviewed_by/review_date/review_notes: Human review tracking');
            
            console.log('\n💡 Next Steps:');
            console.log('   1. Restart your server to load new entity extraction features');
            console.log('   2. Upload test church records to try entity extraction');
            console.log('   3. Check extraction confidence and review flagged records');
            console.log('   4. Make corrections to help the AI learn and improve');
            console.log('   5. Monitor extraction statistics in church admin panel');
        }

        if (errorCount > 0) {
            console.log('\n⚠️  Some churches had setup issues. Check the logs above for details.');
            console.log('   You can re-run this script to retry failed setups.');
        }

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run the setup
setupEntityExtraction()
    .then(() => {
        console.log('\n🎉 All done! Entity extraction system is ready.');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
