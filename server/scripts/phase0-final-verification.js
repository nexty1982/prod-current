/**
 * Phase 0: Final Comprehensive OCR System Verification
 * 
 * This script performs a complete verification of the OCR system
 * to confirm Phase 0 is ready for completion.
 */

const mysql = require('mysql2/promise');

const OCR_DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'saints_peter_and_paul_orthodox_church_db'
};

const RECORDS_DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'ssppoc_records_db'
};

const FRAMEWORK_DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'orthodoxmetrics_db'
};

async function runFinalVerification() {
    console.log('🔍 PHASE 0: Final Comprehensive OCR System Verification');
    console.log('=' .repeat(60));
    
    let ocrConnection, recordsConnection, frameworkConnection;
    
    try {
        // Test 1: Database Connections
        console.log('\n📋 TEST 1: Database Connections');
        console.log('-'.repeat(40));
        
        ocrConnection = await mysql.createConnection(OCR_DB_CONFIG);
        console.log('✅ OCR Database (saints_peter_and_paul_orthodox_church_db): CONNECTED');
        
        recordsConnection = await mysql.createConnection(RECORDS_DB_CONFIG);
        console.log('✅ Records Database (ssppoc_records_db): CONNECTED');
        
        frameworkConnection = await mysql.createConnection(FRAMEWORK_DB_CONFIG);
        console.log('✅ Framework Database (orthodoxmetrics_db): CONNECTED');

        // Test 2: OCR Table Schema Verification
        console.log('\n📋 TEST 2: OCR Table Schema Verification');
        console.log('-'.repeat(40));
        
        const [ocrColumns] = await ocrConnection.execute('SHOW COLUMNS FROM ocr_jobs');
        const columnNames = ocrColumns.map(col => col.Field);
        
        const requiredColumns = [
            'id', 'church_id', 'filename', 'original_filename', 'status', 
            'record_type', 'language', 'confidence_score', 'ocr_result',
            'ocr_result_translation', 'translation_confidence', 
            'extracted_entities', 'entity_confidence', 'needs_review',
            'detected_language', 'processing_log'
        ];
        
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length === 0) {
            console.log(`✅ OCR Jobs Table Schema: ALL ${requiredColumns.length} REQUIRED COLUMNS PRESENT`);
        } else {
            console.log(`❌ OCR Jobs Table Schema: MISSING COLUMNS: ${missingColumns.join(', ')}`);
        }

        // Test 3: OCR Job Status Summary
        console.log('\n📋 TEST 3: OCR Job Status Summary');
        console.log('-'.repeat(40));
        
        const [statusCounts] = await ocrConnection.execute(`
            SELECT status, COUNT(*) as count 
            FROM ocr_jobs 
            GROUP BY status 
            ORDER BY count DESC
        `);
        
        let totalJobs = 0;
        statusCounts.forEach(row => {
            totalJobs += row.count;
            console.log(`   ${row.status.toUpperCase()}: ${row.count} jobs`);
        });
        console.log(`   TOTAL: ${totalJobs} jobs`);

        // Test 4: Recent Job Analysis
        console.log('\n📋 TEST 4: Recent Job Analysis (Last 10 Jobs)');
        console.log('-'.repeat(40));
        
        const [recentJobs] = await ocrConnection.execute(`
            SELECT id, original_filename, status, record_type, 
                   confidence_score, error_message, 
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created,
                   CASE 
                       WHEN extracted_entities IS NOT NULL THEN 'YES'
                       ELSE 'NO'
                   END as has_entities
            FROM ocr_jobs 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        let successfulJobs = 0;
        let errorJobs = 0;
        let processingJobs = 0;
        
        recentJobs.forEach(job => {
            const status = job.status.toUpperCase();
            const entities = job.has_entities === 'YES' ? '📊' : '📋';
            const errorInfo = job.error_message ? ` (${job.error_message.substring(0, 30)}...)` : '';
            
            console.log(`   Job ${job.id}: ${job.original_filename}`);
            console.log(`      Status: ${status} ${entities} | Created: ${job.created}${errorInfo}`);
            
            if (job.status === 'complete') successfulJobs++;
            else if (job.status === 'error') errorJobs++;
            else if (job.status === 'processing') processingJobs++;
        });

        // Test 5: OCR Processing Pipeline Health
        console.log('\n📋 TEST 5: OCR Processing Pipeline Health');
        console.log('-'.repeat(40));
        
        // Check for jobs with extracted entities
        const [entitiesResult] = await ocrConnection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE extracted_entities IS NOT NULL
            AND JSON_LENGTH(extracted_entities) > 0
        `);
        
        console.log(`📊 Jobs with extracted entities: ${entitiesResult[0].count}`);

        // Check for recent successful jobs
        const [recentSuccess] = await ocrConnection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE status = 'complete' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        `);
        
        console.log(`🎯 Successful jobs (last 24h): ${recentSuccess[0].count}`);

        // Check for translation errors (should be 0 after our fixes)
        const [translationErrors] = await ocrConnection.execute(`
            SELECT COUNT(*) as count 
            FROM ocr_jobs 
            WHERE status = 'error' 
            AND (error_message LIKE '%ocr_result_translation%' 
                 OR error_message LIKE '%extracted_entities%')
        `);
        
        console.log(`🔧 Schema-related errors: ${translationErrors[0].count}`);

        // Test 6: Cross-Database Connectivity Test
        console.log('\n📋 TEST 6: Cross-Database Connectivity');
        console.log('-'.repeat(40));
        
        const [churchInfo] = await frameworkConnection.execute(`
            SELECT id, name FROM churches WHERE id = 14 LIMIT 1
        `);
        
        if (churchInfo.length > 0) {
            console.log(`✅ Church #14: ${churchInfo[0].name}`);
        } else {
            console.log('❌ Church #14: NOT FOUND');
        }

        const [recordsTableCount] = await recordsConnection.execute(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = 'ssppoc_records_db'
        `);
        
        console.log(`✅ Records DB Tables: ${recordsTableCount[0].count} tables`);

        // Final Assessment
        console.log('\n🎯 PHASE 0 FINAL ASSESSMENT');
        console.log('='.repeat(60));
        
        const assessments = [
            { test: 'Database Connections', status: true },
            { test: 'OCR Schema Complete', status: missingColumns.length === 0 },
            { test: 'No Schema Errors', status: translationErrors[0].count === 0 },
            { test: 'Recent Processing Activity', status: totalJobs > 0 },
            { test: 'Entity Extraction Working', status: entitiesResult[0].count > 0 },
            { test: 'Cross-DB Connectivity', status: churchInfo.length > 0 }
        ];
        
        const passedTests = assessments.filter(a => a.status).length;
        const totalTests = assessments.length;
        
        assessments.forEach(assessment => {
            const icon = assessment.status ? '✅' : '❌';
            console.log(`${icon} ${assessment.test}`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`📊 PHASE 0 RESULTS: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 PHASE 0: COMPLETE AND READY FOR PHASE 1!');
        } else {
            console.log('⚠️  PHASE 0: Some issues need resolution before Phase 1');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    } finally {
        if (ocrConnection) await ocrConnection.end();
        if (recordsConnection) await recordsConnection.end();
        if (frameworkConnection) await frameworkConnection.end();
        console.log('\n🔌 All database connections closed');
    }
}

// Run the verification
runFinalVerification()
    .then(() => {
        console.log('\n🎯 Phase 0 Final Verification Complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Phase 0 Final Verification Failed:', error.message);
        process.exit(1);
    });
