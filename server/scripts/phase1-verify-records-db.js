#!/usr/bin/env node

/**
 * Phase 1: Database Schema & Core Infrastructure
 * Step 1: Verify ssppoc_records_db database exists and is accessible
 */

const mysql = require('mysql2/promise');

async function verifyRecordsDb() {
  try {
    console.log('🔍 PHASE 1 - Step 1: Verifying ssppoc_records_db database access...');
    console.log('================================================================================');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodoxapps',
      password: 'Summerof1982@!',
      database: 'ssppoc_records_db'
    });
    
    console.log('✅ Connected to ssppoc_records_db successfully');
    
    // Check existing tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 Found ${tables.length} existing tables:`);
    
    const tableNames = tables.map(table => Object.values(table)[0]);
    tableNames.forEach(table => {
      console.log(`   - ${table}`);
    });
    
    // Check for OCR-related tables that we need to create
    const requiredTables = [
      'ocr_field_configurations',
      'ocr_processing_log', 
      'ocr_review_queue',
      'ocr_job_transfers'
    ];
    
    console.log('\n🔍 Checking for required OCR tables...');
    const missingTables = [];
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`   ✅ ${table} - EXISTS`);
      } else {
        console.log(`   ❌ ${table} - MISSING`);
        missingTables.push(table);
      }
    }
    
    // Check for existing record tables
    console.log('\n📋 Checking for existing record tables...');
    const recordTables = ['baptism_records', 'marriage_records', 'funeral_records'];
    
    for (const table of recordTables) {
      if (tableNames.includes(table)) {
        console.log(`   ✅ ${table} - EXISTS`);
        
        // Count records
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`      📊 Contains ${countResult[0].count} records`);
      } else {
        console.log(`   ❌ ${table} - MISSING (will need to be created)`);
      }
    }
    
    await connection.end();
    
    console.log('\n================================================================================');
    console.log('🎯 Database verification complete');
    console.log(`📊 Total tables found: ${tables.length}`);
    console.log(`❌ Missing OCR tables: ${missingTables.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n📝 Next step: Run phase1-create-ocr-schema.js to create missing tables');
    } else {
      console.log('\n✅ All required OCR tables exist - schema is ready!');
    }
    
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.error('📋 Check connection details and database permissions');
    process.exit(1);
  }
}

// Run verification
verifyRecordsDb().catch(console.error);
