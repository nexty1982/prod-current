#!/usr/bin/env node

/**
 * Enhanced OCR Database Schema Update
 * Adds columns to support the new OCR wizard functionality
 */

const mysql = require('mysql2/promise');

async function updateOcrSchema() {
  try {
    console.log('🔄 Updating OCR database schema for enhanced features...');
    console.log('================================================================================');
    
    // Connect to OCR database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodoxapps',
      password: 'Summerof1982@!',
      database: 'saints_peter_and_paul_orthodox_church_db'
    });

    console.log('✅ Connected to OCR database');

    // Check existing columns
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'saints_peter_and_paul_orthodox_church_db' 
      AND TABLE_NAME = 'ocr_jobs'
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log(`📊 Found ${existingColumns.length} existing columns in ocr_jobs table`);

    // Define new columns needed for enhanced OCR
    const newColumns = [
      {
        name: 'preprocessing_options',
        definition: 'preprocessing_options JSON DEFAULT NULL',
        description: 'JSON object storing preprocessing settings used'
      },
      {
        name: 'raw_response_json',
        definition: 'raw_response_json JSON DEFAULT NULL',
        description: 'Complete raw response from OCR service'
      },
      {
        name: 'confidence_score',
        definition: 'confidence_score FLOAT DEFAULT NULL',
        description: 'Overall confidence score (0.0 to 1.0)'
      },
      {
        name: 'attempts',
        definition: 'attempts INT DEFAULT 0',
        description: 'Number of processing attempts'
      },
      {
        name: 'error_message',
        definition: 'error_message TEXT DEFAULT NULL',
        description: 'Error message if processing failed'
      },
      {
        name: 'processed_image_path',
        definition: 'processed_image_path TEXT DEFAULT NULL',
        description: 'Path to preprocessed image file'
      },
      {
        name: 'approved',
        definition: 'approved BOOLEAN DEFAULT FALSE',
        description: 'Whether results have been approved for insertion'
      },
      {
        name: 'segments_json',
        definition: 'segments_json JSON DEFAULT NULL',
        description: 'Structured OCR segments with bounding boxes'
      }
    ];

    // Add missing columns
    let addedColumns = 0;
    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name}`);
        
        try {
          await connection.execute(`ALTER TABLE ocr_jobs ADD COLUMN ${column.definition}`);
          console.log(`   ✅ Added ${column.name}: ${column.description}`);
          addedColumns++;
        } catch (error) {
          console.error(`   ❌ Failed to add ${column.name}:`, error.message);
        }
      } else {
        console.log(`   ⏭️  Column ${column.name} already exists`);
      }
    }

    // Create indexes for better performance
    console.log('\n📈 Creating performance indexes...');
    
    const indexes = [
      {
        name: 'idx_ocr_jobs_status_confidence',
        definition: 'CREATE INDEX idx_ocr_jobs_status_confidence ON ocr_jobs (status, confidence_score)',
        description: 'Index for filtering by status and confidence'
      },
      {
        name: 'idx_ocr_jobs_approved',
        definition: 'CREATE INDEX idx_ocr_jobs_approved ON ocr_jobs (approved, created_at)',
        description: 'Index for approved records'
      },
      {
        name: 'idx_ocr_jobs_attempts',
        definition: 'CREATE INDEX idx_ocr_jobs_attempts ON ocr_jobs (attempts, status)',
        description: 'Index for retry logic'
      }
    ];

    for (const index of indexes) {
      try {
        await connection.execute(index.definition);
        console.log(`   ✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`   ⏭️  Index ${index.name} already exists`);
        } else {
          console.error(`   ❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }

    // Verify final schema
    console.log('\n🔍 Verifying final schema...');
    
    const [finalColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'saints_peter_and_paul_orthodox_church_db' 
      AND TABLE_NAME = 'ocr_jobs'
      ORDER BY ORDINAL_POSITION
    `);

    console.log(`📊 Final schema: ${finalColumns.length} total columns`);
    
    // Show enhanced columns
    const enhancedColumns = finalColumns.filter(col => 
      ['preprocessing_options', 'raw_response_json', 'confidence_score', 'attempts', 
       'error_message', 'processed_image_path', 'approved', 'segments_json'].includes(col.COLUMN_NAME)
    );
    
    console.log(`🎯 Enhanced OCR columns: ${enhancedColumns.length}/8 present`);
    enhancedColumns.forEach(col => {
      console.log(`   ✅ ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    await connection.end();
    
    console.log('\n================================================================================');
    console.log('🎉 Enhanced OCR Schema Update Complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Added ${addedColumns} new columns`);
    console.log(`   - Total columns: ${finalColumns.length}`);
    console.log(`   - Enhanced features: Ready for wizard workflow`);
    console.log('\n🚀 Ready for enhanced OCR processing with:');
    console.log('   - Preprocessing options storage');
    console.log('   - Confidence scoring');
    console.log('   - Retry mechanisms');
    console.log('   - Approval workflow');
    console.log('   - Structured segment data');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
    process.exit(1);
  }
}

// Run schema update
updateOcrSchema().catch(console.error);
