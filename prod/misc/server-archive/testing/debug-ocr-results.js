#!/usr/bin/env node

// Debug script to check OCR results in database
// Run with: node debug-ocr-results.js

const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { promisePool } = require('../../config/db');

async function debugOcrResults() {
    try {
        console.log('🔍 Debugging OCR Results for Church 14\n');
        
        // Get church database connection
        const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [14]);
        if (!churchRows.length) {
            console.error('❌ Church 14 not found');
            return;
        }
        
        const dbName = churchRows[0].database_name;
        console.log(`📋 Church database: ${dbName}`);
        
        const db = await getChurchDbConnection(dbName);
        
        // Check all OCR jobs
        const [jobs] = await db.query(`
            SELECT 
                id, filename, original_filename, status, record_type, language,
                confidence_score, created_at, updated_at,
                CASE WHEN ocr_result IS NOT NULL THEN 1 ELSE 0 END as has_ocr_result,
                CASE WHEN ocr_result IS NOT NULL AND LENGTH(ocr_result) > 0 THEN 1 ELSE 0 END as has_text,
                LENGTH(ocr_result) as text_length,
                LEFT(ocr_result, 100) as text_preview
            FROM ocr_jobs 
            WHERE church_id = 14
            ORDER BY created_at DESC
        `);
        
        console.log(`\n📊 Found ${jobs.length} OCR jobs:\n`);
        
        jobs.forEach((job, index) => {
            console.log(`${index + 1}. Job ID: ${job.id}`);
            console.log(`   File: ${job.original_filename}`);
            console.log(`   Status: ${job.status}`);
            console.log(`   Language: ${job.language}`);
            console.log(`   Confidence: ${job.confidence_score ? (job.confidence_score * 100).toFixed(1) + '%' : 'N/A'}`);
            console.log(`   Has OCR Result: ${job.has_ocr_result ? 'YES' : 'NO'}`);
            console.log(`   Has Text: ${job.has_text ? 'YES' : 'NO'}`);
            console.log(`   Text Length: ${job.text_length || 0} characters`);
            console.log(`   Created: ${job.created_at}`);
            console.log(`   Updated: ${job.updated_at}`);
            if (job.text_preview) {
                console.log(`   Preview: "${job.text_preview}..."`);
            }
            console.log('');
        });
        
        // Check status distribution
        const [statusCounts] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM ocr_jobs 
            WHERE church_id = 14 
            GROUP BY status
        `);
        
        console.log('📈 Status Distribution:');
        statusCounts.forEach(row => {
            console.log(`   ${row.status}: ${row.count} jobs`);
        });
        
        // Check for jobs with results
        const [resultsCount] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN ocr_result IS NOT NULL THEN 1 ELSE 0 END) as with_results,
                SUM(CASE WHEN ocr_result IS NOT NULL AND LENGTH(ocr_result) > 0 THEN 1 ELSE 0 END) as with_text
            FROM ocr_jobs 
            WHERE church_id = 14
        `);
        
        console.log('\n📊 Results Summary:');
        console.log(`   Total jobs: ${resultsCount[0].total}`);
        console.log(`   With OCR results: ${resultsCount[0].with_results}`);
        console.log(`   With actual text: ${resultsCount[0].with_text}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

debugOcrResults();
