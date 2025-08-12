/**
 * Database Architecture Separation Migration
 * 
 * Implements proper separation of concerns:
 * - orthodoxmetrics_db: Global platform data (users, churches metadata, OCR configs)
 * - Church-specific DBs: Only record data (baptism, marriage, funeral records)
 * 
 * This migration:
 * 1. Migrates church metadata from church_info to orthodoxmetrics_db.churches
 * 2. Updates the churches table with additional settings from church_info
 * 3. Documents the clean architecture separation
 */

const { promisePool } = require('../../config/db');
const { getRecordsDbPool } = require('../utils/dbConnections');

async function up() {
  console.log('🚀 Starting Database Architecture Separation Migration...');
  
  try {
    // Step 1: Get all church_info records from records databases
    console.log('📋 Step 1: Fetching church metadata from records databases...');
    
    // For now, we'll migrate from ssppoc_records_db as it's our main church
    const recordsPool = getRecordsDbPool();
    const [churchInfoRecords] = await recordsPool.query(`
      SELECT 
        id as original_id,
        church_id,
        church_name,
        location,
        church_rector,
        church_plan,
        contact_method,
        admin_user as email,
        default_language,
        supported_languages,
        church_ocr_id,
        discount,
        supported_record_types,
        created_on
      FROM church_info
    `);
    
    console.log(`✅ Found ${churchInfoRecords.length} church records to migrate`);
    
    // Step 2: Update orthodoxmetrics_db.churches with missing metadata
    console.log('📋 Step 2: Updating churches table with additional metadata...');
    
    for (const churchInfo of churchInfoRecords) {
      // Check if church exists in orthodoxmetrics_db by name
      const [existingChurch] = await promisePool.query(`
        SELECT id, name, database_name FROM churches 
        WHERE name = ? OR email = ?
      `, [churchInfo.church_name, churchInfo.email]);
      
      if (existingChurch.length > 0) {
        const church = existingChurch[0];
        console.log(`🔄 Updating existing church: ${church.name} (ID: ${church.id})`);
        
        // Build settings JSON with church-specific configuration
        const settings = {
          church_plan: churchInfo.church_plan,
          church_rector: churchInfo.church_rector,
          contact_method: churchInfo.contact_method,
          supported_languages: churchInfo.supported_languages,
          church_ocr_id: churchInfo.church_ocr_id,
          discount: churchInfo.discount,
          supported_record_types: churchInfo.supported_record_types?.split(',') || []
        };
        
        // Update the church with additional metadata
        await promisePool.query(`
          UPDATE churches SET
            settings = ?,
            preferred_language = ?,
            database_name = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          JSON.stringify(settings),
          churchInfo.default_language || 'en',
          'ssppoc_records_db', // Map to the records database
          church.id
        ]);
        
        console.log(`✅ Updated church ${church.name} with settings and database mapping`);
      } else {
        console.log(`⚠️ No matching church found for: ${churchInfo.church_name}`);
      }
    }
    
    // Step 3: Add database architecture documentation
    console.log('📋 Step 3: Adding architecture documentation...');
    
    await promisePool.query(`
      INSERT INTO migration_log (
        migration_name,
        description,
        executed_at,
        status
      ) VALUES (
        '002-database-architecture-separation',
        'Implemented proper database architecture separation: orthodoxmetrics_db for platform data, church DBs for records only',
        NOW(),
        'completed'
      )
      ON DUPLICATE KEY UPDATE
        executed_at = NOW(),
        status = 'completed'
    `);
    
    console.log('✅ Database Architecture Separation Migration completed successfully!');
    console.log('');
    console.log('📚 Architecture Summary:');
    console.log('  🌐 orthodoxmetrics_db: Users, churches metadata, OCR configs, sessions');
    console.log('  🏛️ Church DBs (e.g., ssppoc_records_db): Baptism, marriage, funeral records only');
    console.log('  🔗 Connection: churches.database_name points to the correct records DB');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('⚠️ Rolling back Database Architecture Separation Migration...');
  
  try {
    // Remove the settings data that was added
    await promisePool.query(`
      UPDATE churches SET
        settings = NULL
      WHERE settings IS NOT NULL
    `);
    
    await promisePool.query(`
      UPDATE migration_log SET
        status = 'rolled_back',
        executed_at = NOW()
      WHERE migration_name = '002-database-architecture-separation'
    `);
    
    console.log('✅ Migration rolled back successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
