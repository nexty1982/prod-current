#!/usr/bin/env node

/**
 * Phase 1: Database Schema & Core Infrastructure  
 * Step 2: Create OCR tables schema in ssppoc_records_db
 */

const mysql = require('mysql2/promise');

const OCR_TABLES_SCHEMA = {
  
  // OCR Field Configurations - Per-church JSON config for field mappings
  ocr_field_configurations: `
    CREATE TABLE IF NOT EXISTS ocr_field_configurations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      church_id INT NOT NULL,
      record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
      field_config JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT,
      is_active BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      description TEXT,
      UNIQUE KEY unique_church_record_type (church_id, record_type),
      INDEX idx_church_record (church_id, record_type),
      INDEX idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Per-church field mapping configurations for OCR processing'
  `,
  
  // OCR Processing Log - Track each OCR batch processing
  ocr_processing_log: `
    CREATE TABLE IF NOT EXISTS ocr_processing_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      church_id INT NOT NULL,
      ocr_job_id INT NOT NULL,
      record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
      filename VARCHAR(255) NOT NULL,
      status ENUM('pending', 'processing', 'completed', 'failed', 'transferred') NOT NULL DEFAULT 'pending',
      user_id INT,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      error_message TEXT,
      processing_metadata JSON,
      confidence_score DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_church_id (church_id),
      INDEX idx_ocr_job_id (ocr_job_id),
      INDEX idx_status (status),
      INDEX idx_record_type (record_type),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Log of OCR processing batches and their status'
  `,
  
  // OCR Review Queue - Stores OCR results pending manual review/approval
  ocr_review_queue: `
    CREATE TABLE IF NOT EXISTS ocr_review_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      church_id INT NOT NULL,
      ocr_job_id INT NOT NULL,
      processing_log_id INT NOT NULL,
      record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255),
      extracted_text LONGTEXT,
      mapped_fields JSON,
      confidence_avg DECIMAL(5,2),
      status ENUM('pending_review', 'in_review', 'approved', 'rejected', 'needs_correction') NOT NULL DEFAULT 'pending_review',
      priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
      assigned_to INT,
      reviewed_by INT,
      reviewed_at TIMESTAMP NULL,
      approval_notes TEXT,
      correction_data JSON,
      auto_insertable BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (processing_log_id) REFERENCES ocr_processing_log(id) ON DELETE CASCADE,
      INDEX idx_church_id (church_id),
      INDEX idx_ocr_job_id (ocr_job_id),
      INDEX idx_status (status),
      INDEX idx_priority (priority),
      INDEX idx_assigned_to (assigned_to),
      INDEX idx_reviewed_by (reviewed_by),
      INDEX idx_confidence (confidence_avg),
      INDEX idx_auto_insertable (auto_insertable),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Queue of OCR results pending manual review and approval'
  `,
  
  // OCR Job Transfers - Track transfers from OCR DB to Records DB
  ocr_job_transfers: `
    CREATE TABLE IF NOT EXISTS ocr_job_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      church_id INT NOT NULL,
      source_ocr_job_id INT NOT NULL,
      processing_log_id INT,
      review_queue_id INT,
      transfer_status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
      transfer_type ENUM('auto', 'manual', 'batch') NOT NULL DEFAULT 'auto',
      source_database VARCHAR(100) NOT NULL DEFAULT 'saints_peter_and_paul_orthodox_church_db',
      target_table VARCHAR(100),
      record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
      transferred_data JSON,
      target_record_id INT,
      transfer_started_at TIMESTAMP NULL,
      transfer_completed_at TIMESTAMP NULL,
      error_message TEXT,
      retry_count INT DEFAULT 0,
      initiated_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (processing_log_id) REFERENCES ocr_processing_log(id) ON DELETE SET NULL,
      FOREIGN KEY (review_queue_id) REFERENCES ocr_review_queue(id) ON DELETE SET NULL,
      INDEX idx_church_id (church_id),
      INDEX idx_source_ocr_job_id (source_ocr_job_id),
      INDEX idx_transfer_status (transfer_status),
      INDEX idx_transfer_type (transfer_type),
      INDEX idx_record_type (record_type),
      INDEX idx_target_record_id (target_record_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Track transfers of OCR jobs from processing DB to records DB'
  `
};

async function createOcrSchema() {
  let connection;
  
  try {
    console.log('🔨 PHASE 1 - Step 2: Creating OCR schema tables in ssppoc_records_db...');
    console.log('================================================================================');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodoxapps', 
      password: 'Summerof1982@!',
      database: 'ssppoc_records_db'
    });
    
    console.log('✅ Connected to ssppoc_records_db');
    
    // Create each table
    let tablesCreated = 0;
    let tablesExisted = 0;
    
    for (const [tableName, sql] of Object.entries(OCR_TABLES_SCHEMA)) {
      try {
        console.log(`\n🔨 Creating table: ${tableName}`);
        
        await connection.execute(sql);
        
        // Check if table was actually created or already existed
        const [tableCheck] = await connection.query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = 'ssppoc_records_db' AND table_name = ?`,
          [tableName]
        );
        
        if (tableCheck[0].count > 0) {
          console.log(`   ✅ ${tableName} - Ready`);
          tablesCreated++;
        } else {
          console.log(`   ❌ ${tableName} - Failed to create`);
        }
        
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`   ℹ️  ${tableName} - Already exists`);
          tablesExisted++;
        } else {
          console.error(`   ❌ ${tableName} - Error:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('\n🔍 Verifying table structure...');
    
    // Verify all tables exist and show their structure
    for (const tableName of Object.keys(OCR_TABLES_SCHEMA)) {
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      console.log(`\n📋 ${tableName} (${columns.length} columns):`);
      
      columns.forEach(col => {
        const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.Key ? ` [${col.Key}]` : '';
        const defaultVal = col.Default !== null ? ` DEFAULT: ${col.Default}` : '';
        console.log(`   - ${col.Field}: ${col.Type} ${nullable}${key}${defaultVal}`);
      });
    }
    
    // Insert sample field configuration for church 14 (Saints Peter and Paul)
    console.log('\n🌱 Creating sample field configuration for Saints Peter and Paul (church_id: 14)...');
    
    const sampleBaptismConfig = {
      fields: [
        {
          ocr_label: "Name",
          target_column: "full_name", 
          required: true,
          validation: "^[A-Za-z\\s]{2,100}$",
          format: "{first_name} {last_name}"
        },
        {
          ocr_label: "Date of Birth",
          target_column: "birth_date",
          required: true,
          validation: "date",
          format: "YYYY-MM-DD"
        },
        {
          ocr_label: "Date of Baptism", 
          target_column: "baptism_date",
          required: true,
          validation: "date",
          format: "YYYY-MM-DD"
        },
        {
          ocr_label: "Father",
          target_column: "father_name",
          required: false,
          validation: "^[A-Za-z\\s]{0,100}$"
        },
        {
          ocr_label: "Mother",
          target_column: "mother_name", 
          required: false,
          validation: "^[A-Za-z\\s]{0,100}$"
        },
        {
          ocr_label: "Godparent",
          target_column: "godparent_name",
          required: false,
          validation: "^[A-Za-z\\s]{0,100}$"
        },
        {
          ocr_label: "Clergy",
          target_column: "clergy",
          required: false,
          validation: "^[A-Za-z\\s\\.]{0,100}$"
        }
      ],
      settings: {
        auto_insert_threshold: 85,
        require_manual_review: ["birth_date", "baptism_date"],
        confidence_warning_threshold: 70
      }
    };
    
    await connection.execute(`
      INSERT INTO ocr_field_configurations (church_id, record_type, field_config, description, created_by) 
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        field_config = VALUES(field_config),
        updated_at = CURRENT_TIMESTAMP,
        description = VALUES(description)
    `, [
      14, 
      'baptism', 
      JSON.stringify(sampleBaptismConfig),
      'Default baptism record field configuration for Saints Peter and Paul Orthodox Church',
      1
    ]);
    
    console.log('   ✅ Sample baptism field configuration created');
    
    await connection.end();
    
    console.log('\n================================================================================');
    console.log('🎉 OCR Schema Creation Complete!');
    console.log(`📊 Tables created/verified: ${Object.keys(OCR_TABLES_SCHEMA).length}`);
    console.log(`✅ New tables: ${tablesCreated}`);
    console.log(`ℹ️  Existing tables: ${tablesExisted}`);
    console.log('\n📝 Next step: Run phase1-create-typescript-interfaces.js to create TypeScript definitions');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error.message);
    console.error('📋 Check database permissions and connection');
    if (connection) await connection.end();
    process.exit(1);
  }
}

// Run schema creation
createOcrSchema().catch(console.error);
