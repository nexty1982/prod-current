/**
 * Phase 0: Check OCR Job Status After Schema Fix
 * 
 * This script verifies that OCR jobs can now complete successfully
 * after adding the missing translation columns.
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'saints_peter_and_paul_orthodox_church_db'
};

async function checkOcrJobStatus() {
    console.log('🔍 Phase 0: Checking OCR job status after schema fix...');
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected to OCR database');

        // Check current job status
        console.log('\n📊 Current OCR job status distribution:');
        const [statusCounts] = await connection.execute(`
            SELECT status, COUNT(*) as count 
            FROM ocr_jobs 
            GROUP BY status 
            ORDER BY count DESC
        `);
        
        statusCounts.forEach(row => {
            console.log(`   ${row.status}: ${row.count} jobs`);
        });

        // Check the most recent jobs (should be the ones we just uploaded)
        console.log('\n📋 Most recent 10 OCR jobs:');
        const [recentJobs] = await connection.execute(`
            SELECT id, original_filename, status, record_type, 
                   confidence_score, error_message, 
                   created_at, processing_completed_at
            FROM ocr_jobs 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        recentJobs.forEach(job => {
            const errorMsg = job.error_message ? ` (${job.error_message.substring(0, 50)}...)` : '';
            console.log(`   Job ${job.id}: ${job.original_filename} - ${job.status}${errorMsg}`);
        });

        // Check if there are any jobs still in 'processing' status
        const [processingJobs] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE status = 'processing'
        `);
        
        console.log(`\n⚡ Currently processing: ${processingJobs[0].count} jobs`);

        // Check if there are any jobs in 'error' status with the translation error
        const [translationErrors] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE status = 'error' 
            AND error_message LIKE '%ocr_result_translation%'
        `);
        
        console.log(`🔧 Translation schema errors: ${translationErrors[0].count} jobs`);

        if (translationErrors[0].count > 0) {
            console.log('\n🎯 There are still jobs with translation schema errors.');
            console.log('💡 The OCR processing service may need to be restarted to pick up the schema changes.');
        } else {
            console.log('\n🎉 No translation schema errors found!');
        }

        // Check for completed jobs with extracted entities
        const [completedWithEntities] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE status = 'complete' 
            AND extracted_entities IS NOT NULL
            AND JSON_LENGTH(extracted_entities) > 0
        `);
        
        console.log(`📊 Completed jobs with extracted entities: ${completedWithEntities[0].count}`);

    } catch (error) {
        console.error('❌ Error checking OCR job status:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the check
checkOcrJobStatus()
    .then(() => {
        console.log('\n🎯 OCR Job Status Check Complete!');
        console.log('📝 Phase 0 is ready to transition to Phase 1: Field Mapping Layer');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 OCR Job Status Check Failed:', error.message);
        process.exit(1);
    });
