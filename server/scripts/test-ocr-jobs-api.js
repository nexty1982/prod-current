#!/usr/bin/env node

/**
 * Test script to debug the OCR jobs API endpoint
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.development') });

const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { promisePool } = require('../config/db');

async function testOcrJobsEndpoint() {
  console.log('🧪 Testing OCR Jobs API endpoint...');
  
  try {
    const churchId = 14; // The registered church ID
    
    console.log('📋 Step 1: Check church registration...');
    const [churchRows] = await promisePool.query('SELECT * FROM churches WHERE id = ?', [churchId]);
    
    if (!churchRows.length) {
      throw new Error(`Church with ID ${churchId} not found in central database`);
    }
    
    const church = churchRows[0];
    console.log('✅ Church found:', {
      id: church.id,
      name: church.name,
      database_name: church.database_name
    });
    
    console.log('\n📋 Step 2: Test church database connection...');
    const db = await getChurchDbConnection(church.database_name);
    console.log('✅ Church database connection successful');
    
    console.log('\n📋 Step 3: Check OCR jobs table...');
    const [tableCheck] = await db.query('SHOW TABLES LIKE "ocr_jobs"');
    if (!tableCheck.length) {
      throw new Error('ocr_jobs table does not exist in church database');
    }
    console.log('✅ ocr_jobs table exists');
    
    console.log('\n📋 Step 4: Count OCR jobs for this church...');
    const [[countResult]] = await db.query('SELECT COUNT(*) as total FROM ocr_jobs WHERE church_id = ?', [churchId]);
    console.log(`✅ Found ${countResult.total} OCR jobs for church ID ${churchId}`);
    
    console.log('\n📋 Step 5: Fetch sample OCR jobs...');
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, created_at, updated_at, description,
        CASE WHEN ocr_result IS NOT NULL AND ocr_result != '' THEN TRUE ELSE FALSE END as hasResult
      FROM ocr_jobs 
      WHERE church_id = ?
      ORDER BY created_at DESC 
      LIMIT 5
    `, [churchId]);
    
    console.log(`✅ Retrieved ${jobs.length} sample jobs:`);
    jobs.forEach(job => {
      console.log(`   - Job ${job.id}: ${job.original_filename} (${job.status})`);
    });
    
    console.log('\n📋 Step 6: Test the exact API query...');
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    const [apiJobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, created_at, updated_at, description,
        CASE WHEN ocr_result IS NOT NULL AND ocr_result != '' THEN TRUE ELSE FALSE END as hasResult
      FROM ocr_jobs 
      WHERE church_id = ?
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [churchId, limit, offset]);
    
    console.log(`✅ API query returned ${apiJobs.length} jobs`);
    
    // Test the count query
    const [[apiCountResult]] = await db.query(`
      SELECT COUNT(*) as total FROM ocr_jobs WHERE church_id = ?
    `, [churchId]);
    
    const response = {
      jobs: apiJobs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: apiCountResult?.total || 0,
        pages: Math.ceil((apiCountResult?.total || 0) / parseInt(limit))
      }
    };
    
    console.log('\n✅ Full API response structure:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n🎉 OCR Jobs API test completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Check network requests in browser dev tools');
    console.log('   2. Verify the frontend is calling /api/church/14/ocr/jobs');
    console.log('   3. Check server logs for any errors');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    process.exit(1);
  }
}

// Run the test
testOcrJobsEndpoint().catch(console.error);
