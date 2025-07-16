al#!/usr/bin/env node

/**
 * Phase 2 - Step 2: OCR Transfer Service Implementation
 * Creates transferOcrResult() function and automated transfer service
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createTransferService() {
  try {
    console.log('🔄 PHASE 2 - Step 2: Creating OCR Transfer Service...');
    console.log('================================================================================');
    
    // 1. Create the main transfer service
    console.log('📁 Creating transfer service module...');
    
    const transferServiceCode = `import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getOcrDbPool, getRecordsDbPool, getFrameworkDbPool } from '../utils/dbConnections';
import { 
  OcrJob, 
  OcrProcessingLog, 
  OcrReviewQueue, 
  OcrJobTransfer,
  TransferStatus,
  RecordType 
} from '../types/ocrTypes';

/**
 * Core OCR Transfer Service
 * Handles transfer of completed OCR jobs from OCR DB to Records DB
 */
export class OcrTransferService {
  
  /**
   * Transfer a completed OCR job from OCR DB to Records DB
   * @param ocrJobId - The ID of the completed OCR job
   * @param userId - The user initiating the transfer
   * @returns Promise<OcrJobTransfer>
   */
  async transferOcrResult(ocrJobId: number, userId?: number): Promise<OcrJobTransfer> {
    console.log(\`🔄 Starting transfer for OCR job \${ocrJobId}\`);
    
    const ocrPool = getOcrDbPool();
    const recordsPool = getRecordsDbPool();
    
    let ocrConnection: PoolConnection | null = null;
    let recordsConnection: PoolConnection | null = null;
    
    try {
      // Get connections
      ocrConnection = await ocrPool.getConnection();
      recordsConnection = await recordsPool.getConnection();
      
      // Start transactions
      await ocrConnection.beginTransaction();
      await recordsConnection.beginTransaction();
      
      // 1. Fetch OCR job from source database
      const ocrJob = await this.fetchOcrJob(ocrConnection, ocrJobId);
      if (!ocrJob) {
        throw new Error(\`OCR job \${ocrJobId} not found\`);
      }
      
      if (ocrJob.status !== 'complete') {
        throw new Error(\`OCR job \${ocrJobId} is not complete (status: \${ocrJob.status})\`);
      }
      
      // 2. Create processing log entry
      const processingLogId = await this.createProcessingLog(
        recordsConnection, 
        ocrJob, 
        userId
      );
      
      // 3. Create review queue entry
      const reviewQueueId = await this.createReviewQueueEntry(
        recordsConnection,
        ocrJob,
        processingLogId
      );
      
      // 4. Create transfer tracking record
      const transferRecord = await this.createTransferRecord(
        recordsConnection,
        ocrJob,
        processingLogId,
        reviewQueueId,
        userId
      );
      
      // 5. Mark OCR job as transferred (optional flag)
      await this.markOcrJobTransferred(ocrConnection, ocrJobId);
      
      // Commit transactions
      await ocrConnection.commit();
      await recordsConnection.commit();
      
      console.log(\`✅ Successfully transferred OCR job \${ocrJobId} to Records DB\`);
      console.log(\`   📊 Processing Log ID: \${processingLogId}\`);
      console.log(\`   📋 Review Queue ID: \${reviewQueueId}\`);
      console.log(\`   🔄 Transfer ID: \${transferRecord.id}\`);
      
      return transferRecord;
      
    } catch (error) {
      // Rollback transactions
      if (ocrConnection) await ocrConnection.rollback();
      if (recordsConnection) await recordsConnection.rollback();
      
      console.error(\`❌ Transfer failed for OCR job \${ocrJobId}:\`, error);
      throw error;
    } finally {
      // Release connections
      if (ocrConnection) ocrConnection.release();
      if (recordsConnection) recordsConnection.release();
    }
  }
  
  /**
   * Fetch OCR job details from OCR database
   */
  private async fetchOcrJob(connection: PoolConnection, ocrJobId: number): Promise<OcrJob | null> {
    const [rows] = await connection.execute<RowDataPacket[]>(
      \`SELECT 
        id, church_id, filename, original_filename, record_type, language,
        status, extracted_text, extracted_entities, entity_confidence,
        needs_review, detected_language, ocr_result, ocr_result_translation,
        translation_confidence, created_at, updated_at, processing_started_at,
        processing_completed_at, confidence_score
      FROM ocr_jobs 
      WHERE id = ?\`,
      [ocrJobId]
    );
    
    if (rows.length === 0) return null;
    
    return {
      id: rows[0].id,
      church_id: rows[0].church_id,
      filename: rows[0].filename,
      original_filename: rows[0].original_filename,
      record_type: rows[0].record_type as RecordType,
      language: rows[0].language,
      status: rows[0].status,
      extracted_text: rows[0].extracted_text,
      extracted_entities: rows[0].extracted_entities ? JSON.parse(rows[0].extracted_entities) : null,
      entity_confidence: rows[0].entity_confidence,
      needs_review: Boolean(rows[0].needs_review),
      detected_language: rows[0].detected_language,
      ocr_result: rows[0].ocr_result,
      ocr_result_translation: rows[0].ocr_result_translation,
      translation_confidence: rows[0].translation_confidence,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      processing_started_at: rows[0].processing_started_at,
      processing_completed_at: rows[0].processing_completed_at,
      confidence_score: rows[0].confidence_score
    };
  }
  
  /**
   * Create processing log entry in Records DB
   */
  private async createProcessingLog(
    connection: PoolConnection, 
    ocrJob: OcrJob, 
    userId?: number
  ): Promise<number> {
    const [result] = await connection.execute(
      \`INSERT INTO ocr_processing_log (
        church_id, ocr_job_id, record_type, filename, status, user_id,
        started_at, completed_at, processing_metadata, confidence_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        ocrJob.church_id,
        ocrJob.id,
        ocrJob.record_type,
        ocrJob.original_filename || ocrJob.filename,
        'transferred',
        userId || null,
        ocrJob.processing_started_at,
        ocrJob.processing_completed_at,
        JSON.stringify({
          extracted_entities: ocrJob.extracted_entities,
          entity_confidence: ocrJob.entity_confidence,
          detected_language: ocrJob.detected_language,
          translation_confidence: ocrJob.translation_confidence
        }),
        ocrJob.confidence_score
      ]
    );
    
    return (result as any).insertId;
  }
  
  /**
   * Create review queue entry in Records DB
   */
  private async createReviewQueueEntry(
    connection: PoolConnection,
    ocrJob: OcrJob,
    processingLogId: number
  ): Promise<number> {
    // Determine if auto-insertable based on confidence
    const autoInsertable = ocrJob.confidence_score && ocrJob.confidence_score >= 85 && !ocrJob.needs_review;
    
    // Set priority based on confidence and review needs
    let priority = 'normal';
    if (ocrJob.needs_review) priority = 'high';
    else if (ocrJob.confidence_score && ocrJob.confidence_score < 50) priority = 'urgent';
    else if (autoInsertable) priority = 'low';
    
    const [result] = await connection.execute(
      \`INSERT INTO ocr_review_queue (
        church_id, ocr_job_id, processing_log_id, record_type, filename,
        original_filename, extracted_text, confidence_avg, status, priority,
        auto_insertable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        ocrJob.church_id,
        ocrJob.id,
        processingLogId,
        ocrJob.record_type,
        ocrJob.filename,
        ocrJob.original_filename,
        ocrJob.extracted_text,
        ocrJob.confidence_score,
        'pending_review',
        priority,
        autoInsertable ? 1 : 0
      ]
    );
    
    return (result as any).insertId;
  }
  
  /**
   * Create transfer tracking record
   */
  private async createTransferRecord(
    connection: PoolConnection,
    ocrJob: OcrJob,
    processingLogId: number,
    reviewQueueId: number,
    userId?: number
  ): Promise<OcrJobTransfer> {
    const [result] = await connection.execute(
      \`INSERT INTO ocr_job_transfers (
        church_id, source_ocr_job_id, processing_log_id, review_queue_id,
        transfer_status, record_type, initiated_by, transfer_started_at,
        transfer_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        ocrJob.church_id,
        ocrJob.id,
        processingLogId,
        reviewQueueId,
        'completed',
        ocrJob.record_type,
        userId || null,
        new Date(),
        new Date()
      ]
    );
    
    const transferId = (result as any).insertId;
    
    return {
      id: transferId,
      church_id: ocrJob.church_id,
      source_ocr_job_id: ocrJob.id,
      processing_log_id: processingLogId,
      review_queue_id: reviewQueueId,
      transfer_status: 'completed' as TransferStatus,
      transfer_type: 'auto',
      source_database: 'saints_peter_and_paul_orthodox_church_db',
      target_table: null,
      record_type: ocrJob.record_type,
      transferred_data: null,
      target_record_id: null,
      transfer_started_at: new Date(),
      transfer_completed_at: new Date(),
      error_message: null,
      retry_count: 0,
      initiated_by: userId || null,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  
  /**
   * Mark OCR job as transferred (optional status update)
   */
  private async markOcrJobTransferred(connection: PoolConnection, ocrJobId: number): Promise<void> {
    await connection.execute(
      \`UPDATE ocr_jobs SET 
        updated_at = NOW(),
        processing_notes = CONCAT(
          COALESCE(processing_notes, ''), 
          '\\n[', NOW(), '] Transferred to Records DB'
        )
      WHERE id = ?\`,
      [ocrJobId]
    );
  }
  
  /**
   * Batch transfer multiple completed OCR jobs
   */
  async batchTransfer(churchId: number, userId?: number): Promise<OcrJobTransfer[]> {
    console.log(\`🔄 Starting batch transfer for church \${churchId}\`);
    
    const ocrPool = getOcrDbPool();
    let connection: PoolConnection | null = null;
    
    try {
      connection = await ocrPool.getConnection();
      
      // Find completed OCR jobs that haven't been transferred
      const [rows] = await connection.execute<RowDataPacket[]>(
        \`SELECT id FROM ocr_jobs 
         WHERE church_id = ? 
         AND status = 'complete' 
         AND (processing_notes IS NULL OR processing_notes NOT LIKE '%Transferred to Records DB%')
         ORDER BY processing_completed_at ASC
         LIMIT 10\`,
        [churchId]
      );
      
      const transfers: OcrJobTransfer[] = [];
      
      for (const row of rows) {
        try {
          const transfer = await this.transferOcrResult(row.id, userId);
          transfers.push(transfer);
        } catch (error) {
          console.error(\`❌ Failed to transfer OCR job \${row.id}:\`, error);
        }
      }
      
      console.log(\`✅ Batch transfer completed: \${transfers.length}/\${rows.length} successful\`);
      return transfers;
      
    } finally {
      if (connection) connection.release();
    }
  }
  
  /**
   * Get transfer status for an OCR job
   */
  async getTransferStatus(ocrJobId: number): Promise<OcrJobTransfer | null> {
    const recordsPool = getRecordsDbPool();
    let connection: PoolConnection | null = null;
    
    try {
      connection = await recordsPool.getConnection();
      
      const [rows] = await connection.execute<RowDataPacket[]>(
        \`SELECT * FROM ocr_job_transfers WHERE source_ocr_job_id = ? ORDER BY created_at DESC LIMIT 1\`,
        [ocrJobId]
      );
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        id: row.id,
        church_id: row.church_id,
        source_ocr_job_id: row.source_ocr_job_id,
        processing_log_id: row.processing_log_id,
        review_queue_id: row.review_queue_id,
        transfer_status: row.transfer_status as TransferStatus,
        transfer_type: row.transfer_type,
        source_database: row.source_database,
        target_table: row.target_table,
        record_type: row.record_type as RecordType,
        transferred_data: row.transferred_data ? JSON.parse(row.transferred_data) : null,
        target_record_id: row.target_record_id,
        transfer_started_at: row.transfer_started_at,
        transfer_completed_at: row.transfer_completed_at,
        error_message: row.error_message,
        retry_count: row.retry_count,
        initiated_by: row.initiated_by,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
    } finally {
      if (connection) connection.release();
    }
  }
}

// Export singleton instance
export const ocrTransferService = new OcrTransferService();

// Export individual function for backward compatibility
export const transferOcrResult = (ocrJobId: number, userId?: number) => 
  ocrTransferService.transferOcrResult(ocrJobId, userId);
`;
    
    const transferServicePath = path.join(__dirname, '..', 'services', 'ocrTransferService.ts');
    await fs.writeFile(transferServicePath, transferServiceCode);
    console.log('✅ Created OCR transfer service');
    
    // 2. Create automated background service
    console.log('🤖 Creating automated transfer background service...');
    
    const backgroundServiceCode = `import { ocrTransferService } from './ocrTransferService';
import { getFrameworkDbPool } from '../utils/dbConnections';

/**
 * Automated OCR Transfer Background Service
 * Runs periodically to transfer completed OCR jobs
 */
export class OcrTransferBackgroundService {
  private intervalId: NodeJS.Timer | null = null;
  private isRunning = false;
  
  /**
   * Start the automated transfer service
   * @param intervalMinutes - How often to check for transfers (default: 5 minutes)
   */
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('⚠️  OCR Transfer Background Service is already running');
      return;
    }
    
    console.log(\`🤖 Starting OCR Transfer Background Service (interval: \${intervalMinutes} minutes)\`);
    
    this.isRunning = true;
    
    // Run immediately
    this.runTransferCheck();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.runTransferCheck();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * Stop the automated transfer service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  OCR Transfer Background Service is not running');
      return;
    }
    
    console.log('🛑 Stopping OCR Transfer Background Service');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }
  
  /**
   * Check for completed OCR jobs and transfer them
   */
  private async runTransferCheck(): Promise<void> {
    try {
      console.log(\`🔍 [\${new Date().toISOString()}] Checking for completed OCR jobs to transfer...\`);
      
      // Get all active churches
      const churches = await this.getActiveChurches();
      
      let totalTransfers = 0;
      
      for (const church of churches) {
        try {
          const transfers = await ocrTransferService.batchTransfer(church.id);
          totalTransfers += transfers.length;
          
          if (transfers.length > 0) {
            console.log(\`✅ Church \${church.id} (\${church.name}): \${transfers.length} OCR jobs transferred\`);
          }
        } catch (error) {
          console.error(\`❌ Failed batch transfer for church \${church.id}:\`, error);
        }
      }
      
      if (totalTransfers > 0) {
        console.log(\`🎉 Transfer check complete: \${totalTransfers} total transfers\`);
      } else {
        console.log(\`ℹ️  No OCR jobs ready for transfer\`);
      }
      
    } catch (error) {
      console.error('❌ Error during transfer check:', error);
    }
  }
  
  /**
   * Get list of active churches
   */
  private async getActiveChurches(): Promise<Array<{id: number, name: string}>> {
    const frameworkPool = getFrameworkDbPool();
    let connection = null;
    
    try {
      connection = await frameworkPool.getConnection();
      
      const [rows] = await connection.execute(
        \`SELECT id, church_name as name FROM churches WHERE is_active = 1\`
      );
      
      return rows as Array<{id: number, name: string}>;
      
    } finally {
      if (connection) connection.release();
    }
  }
  
  /**
   * Get service status
   */
  getStatus(): {isRunning: boolean, uptime?: number} {
    return {
      isRunning: this.isRunning,
      uptime: this.intervalId ? Date.now() : undefined
    };
  }
}

// Export singleton instance
export const ocrTransferBackgroundService = new OcrTransferBackgroundService();
`;
    
    const backgroundServicePath = path.join(__dirname, '..', 'services', 'ocrTransferBackgroundService.ts');
    await fs.writeFile(backgroundServicePath, backgroundServiceCode);
    console.log('✅ Created automated background transfer service');
    
    // 3. Test the transfer service
    console.log('🧪 Testing transfer service...');
    
    try {
      // Check database connections
      const connection1 = await mysql.createConnection({
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'saints_peter_and_paul_orthodox_church_db'
      });
      
      const connection2 = await mysql.createConnection({
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'ssppoc_records_db'
      });
      
      // Check for completed OCR jobs
      const [ocrJobs] = await connection1.execute(
        'SELECT id, status FROM ocr_jobs WHERE status = "complete" LIMIT 1'
      );
      
      // Check new tables exist
      const [tables] = await connection2.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'ssppoc_records_db' AND table_name IN ('ocr_processing_log', 'ocr_review_queue', 'ocr_job_transfers')"
      );
      
      await connection1.end();
      await connection2.end();
      
      console.log(`   ✅ OCR DB connection: Working`);
      console.log(`   ✅ Records DB connection: Working`);
      console.log(`   ✅ OCR tables: ${tables[0].count}/3 found`);
      console.log(`   📊 Completed OCR jobs available: ${ocrJobs.length}`);
      
    } catch (error) {
      console.log(`   ⚠️  Test connection failed: ${error.message}`);
    }
    }
    
    console.log('================================================================================');
    console.log('🎉 OCR Transfer Service Creation Complete!');
    console.log('📁 Files created:');
    console.log('   - server/services/ocrTransferService.ts');
    console.log('   - server/services/ocrTransferBackgroundService.ts');
    console.log('');
    console.log('🔄 Key Features:');
    console.log('   - transferOcrResult() function for single transfers');
    console.log('   - Batch transfer support for multiple jobs');
    console.log('   - Automated background service with configurable intervals');
    console.log('   - Full transaction support with rollback on errors');
    console.log('   - Transfer status tracking and monitoring');
    console.log('   - Auto-insertion detection based on confidence scores');
    console.log('');
    console.log('📝 Next step: Run phase2-create-field-mapping.js');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ OCR Transfer Service creation failed:', error.message);
    process.exit(1);
  }
}

// Run transfer service creation
createTransferService().catch(console.error);
