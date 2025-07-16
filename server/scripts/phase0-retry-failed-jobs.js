/**
 * Phase 0: Retry Failed OCR Jobs After Schema Fix
 * 
 * This script resets error jobs to 'pending' status so they can be
 * reprocessed with the correct schema in place.
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'saints_peter_and_paul_orthodox_church_db'
};

async function retryFailedJobs() {
    console.log('🔄 Phase 0: Retrying failed OCR jobs after schema fix...');
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected to OCR database');

        // Check current error jobs
        console.log('\n📋 Checking current error jobs...');
        const [errorJobs] = await connection.execute(`
            SELECT id, original_filename, error_message, created_at
            FROM ocr_jobs 
            WHERE status = 'error'
            ORDER BY created_at DESC
        `);
        
        console.log(`Found ${errorJobs.length} error jobs:`);
        errorJobs.forEach(job => {
            const isSchemaError = job.error_message && 
                (job.error_message.includes('ocr_result_translation') || 
                 job.error_message.includes('extracted_entities') ||
                 job.error_message.includes('unknown column'));
            const errorType = isSchemaError ? '🔧 SCHEMA' : '❓ OTHER';
            console.log(`   Job ${job.id}: ${job.original_filename} (${errorType})`);
        });

        // Reset schema-related error jobs to pending
        console.log('\n🔄 Resetting schema-related error jobs to pending...');
        const [resetResult] = await connection.execute(`
            UPDATE ocr_jobs 
            SET status = 'pending', 
                error_message = NULL,
                processing_started_at = NULL,
                processing_completed_at = NULL,
                updated_at = NOW()
            WHERE status = 'error' 
            AND (error_message LIKE '%ocr_result_translation%' 
                 OR error_message LIKE '%extracted_entities%'
                 OR error_message LIKE '%unknown column%'
                 OR error_message LIKE '%Unknown column%')
        `);
        
        console.log(`✅ Reset ${resetResult.affectedRows} schema-related error jobs to pending`);

        // Also reset the 6 recent jobs we uploaded (Jobs 20-25) regardless of error type
        console.log('\n🎯 Resetting recent test upload jobs (20-25) to pending...');
        const [recentResetResult] = await connection.execute(`
            UPDATE ocr_jobs 
            SET status = 'pending', 
                error_message = NULL,
                processing_started_at = NULL,
                processing_completed_at = NULL,
                updated_at = NOW()
            WHERE id BETWEEN 20 AND 25
            AND status = 'error'
        `);
        
        console.log(`✅ Reset ${recentResetResult.affectedRows} recent test jobs to pending`);

        // Check final status
        console.log('\n📊 Updated job status distribution:');
        const [finalStatus] = await connection.execute(`
            SELECT status, COUNT(*) as count 
            FROM ocr_jobs 
            GROUP BY status 
            ORDER BY count DESC
        `);
        
        finalStatus.forEach(row => {
            console.log(`   ${row.status.toUpperCase()}: ${row.count} jobs`);
        });

        // Check if there are jobs ready for processing
        const [pendingJobs] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE status = 'pending'
        `);
        
        console.log(`\n🚀 Jobs ready for reprocessing: ${pendingJobs[0].count}`);

        if (pendingJobs[0].count > 0) {
            console.log('\n💡 NEXT STEPS:');
            console.log('   1. The OCR processing service should automatically pick up pending jobs');
            console.log('   2. Monitor the job status to see them move from pending → processing → complete');
            console.log('   3. Check for extracted entities in completed jobs');
            console.log('   4. Run final verification once processing completes');
        }

    } catch (error) {
        console.error('❌ Error retrying failed jobs:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the retry
retryFailedJobs()
    .then(() => {
        console.log('\n🎯 Phase 0 Job Retry Complete!');
        console.log('📝 Monitor OCR processing service to watch jobs complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Phase 0 Job Retry Failed:', error.message);
        process.exit(1);
    });
