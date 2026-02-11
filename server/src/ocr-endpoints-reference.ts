/**
 * OCR Fusion Drafts Endpoints - Reference Implementation
 * 
 * This file contains all OCR-related endpoints for fusion drafts management.
 * Use this as a reference when fixing issues.
 * 
 * Key Endpoints:
 * - GET  /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
 * - POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
 * - POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review
 * - POST /api/church/:churchId/ocr/jobs/:jobId/fusion/validate
 * - POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize
 * - POST /api/church/:churchId/ocr/jobs/:jobId/review/commit
 */

// =============================================================================
// GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
// =============================================================================
// Get fusion drafts for a specific OCR job
app.get('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts', async (req, res) => {
  console.log(`[Fusion Drafts GET] ===== REQUEST RECEIVED =====`);
  console.log(`[Fusion Drafts GET] URL: ${req.url}`);
  console.log(`[Fusion Drafts GET] Params:`, req.params);
  console.log(`[Fusion Drafts GET] Query:`, req.query);
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[Fusion Drafts GET] Parsed churchId: ${churchId}, jobId: ${jobId}`);
    
    // First, verify the job exists and where it is
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      console.log(`[Fusion Drafts GET] Church ${churchId} not found`);
      return res.status(404).json({ error: 'Church not found' });
    }
    
    const dbName = churchRows[0].database_name;
    console.log(`[Fusion Drafts GET] Church database: ${dbName}`);
    
    // Check if job exists in church DB
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(dbName);
    
    // Check if job exists
    try {
      const [jobCheck] = await db.query('SELECT id, status, filename FROM ocr_jobs WHERE id = ?', [jobId]);
      if (jobCheck.length === 0) {
        console.log(`[Fusion Drafts GET] WARNING: Job ${jobId} not found in church DB ${dbName}`);
        // Check main DB
        const [mainJobCheck] = await promisePool.query('SELECT id, status, filename FROM ocr_jobs WHERE id = ? AND church_id = ?', [jobId, churchId]);
        if (mainJobCheck.length > 0) {
          console.log(`[Fusion Drafts GET] Job ${jobId} exists in MAIN database, not church DB ${dbName}`);
          console.log(`[Fusion Drafts GET] This explains why drafts might not be found - they should be in church DB`);
        }
      } else {
        console.log(`[Fusion Drafts GET] Job ${jobId} found in church DB: ${jobCheck[0].filename}, status: ${jobCheck[0].status}`);
      }
    } catch (e: any) {
      console.log(`[Fusion Drafts GET] Could not check job existence: ${e.message}`);
    }

    // Check if table exists
    const [tables] = await db.query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_fused_drafts'`,
      [dbName]
    );

    if (tables[0].count === 0) {
      return res.json({ drafts: [] });
    }

    // Check which columns exist
    let selectCols = 'id, ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, status, committed_record_id, created_by, created_at, updated_at';
    let hasWorkflowStatus = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      if (colNames.includes('workflow_status')) {
        selectCols += ', workflow_status';
        hasWorkflowStatus = true;
      }
      if (colNames.includes('last_saved_at')) selectCols += ', last_saved_at';
      if (colNames.includes('finalized_at')) selectCols += ', finalized_at';
      if (colNames.includes('finalized_by')) selectCols += ', finalized_by';
    } catch (e) { /* use default columns */ }

    // Support optional status filter query parameter
    const statusFilter = req.query.status as string | undefined;
    const recordTypeFilter = req.query.record_type as string | undefined;
    
    let whereClause = 'WHERE ocr_job_id = ?';
    const queryParams: any[] = [jobId];
    
    // Filter by workflow_status if status param is provided and column exists
    if (statusFilter && hasWorkflowStatus) {
      if (statusFilter === 'in_review' || statusFilter === 'draft' || statusFilter === 'finalized' || statusFilter === 'committed') {
        whereClause += ' AND workflow_status = ?';
        queryParams.push(statusFilter);
      }
    } else if (statusFilter && !hasWorkflowStatus) {
      // Fallback to status column if workflow_status doesn't exist
      whereClause += ' AND status = ?';
      queryParams.push(statusFilter);
    }
    
    // Filter by record_type if provided
    if (recordTypeFilter) {
      whereClause += ' AND record_type = ?';
      queryParams.push(recordTypeFilter);
    }

    // Check if church_id column exists and add filter if needed
    // Note: We match church_id = ? OR church_id IS NULL to handle legacy drafts
    let hasChurchId = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      if (colNames.includes('church_id')) {
        hasChurchId = true;
        // Match church_id = ? OR church_id IS NULL (for backward compatibility)
        whereClause += ' AND (church_id = ? OR church_id IS NULL)';
        queryParams.push(churchId);
      }
    } catch (e) { /* ignore */ }

    console.log(`[Fusion Drafts GET] ===== STARTING QUERY =====`);
    console.log(`[Fusion Drafts GET] Database: ${dbName}`);
    console.log(`[Fusion Drafts GET] JobId: ${jobId}, ChurchId: ${churchId}`);
    console.log(`[Fusion Drafts GET] Has workflow_status: ${hasWorkflowStatus}, Has church_id: ${hasChurchId}`);
    console.log(`[Fusion Drafts GET] Query: SELECT ${selectCols} FROM ocr_fused_drafts ${whereClause}`);
    console.log(`[Fusion Drafts GET] Query params:`, JSON.stringify(queryParams));

    const [drafts] = await db.query(
      `SELECT ${selectCols}
       FROM ocr_fused_drafts
       ${whereClause}
       ORDER BY entry_index ASC`,
      queryParams
    );

    console.log(`[Fusion Drafts GET] ===== QUERY RESULT =====`);
    console.log(`[Fusion Drafts GET] Found ${drafts.length} drafts`);
    
    if (drafts.length > 0) {
      console.log(`[Fusion Drafts GET] First draft:`, JSON.stringify({
        id: drafts[0].id,
        ocr_job_id: drafts[0].ocr_job_id,
        entry_index: drafts[0].entry_index,
        workflow_status: drafts[0].workflow_status || 'N/A',
        status: drafts[0].status || 'N/A',
        record_type: drafts[0].record_type,
        church_id: drafts[0].church_id || 'NULL'
      }));
    } else {
      console.log(`[Fusion Drafts GET] ===== DEBUGGING EMPTY RESULT =====`);
      // Check if ANY drafts exist for this job (without filters)
      const [allDrafts] = await db.query(
        `SELECT COUNT(*) as count FROM ocr_fused_drafts WHERE ocr_job_id = ?`,
        [jobId]
      );
      console.log(`[Fusion Drafts GET] Total drafts for job ${jobId} (no filters): ${allDrafts[0].count}`);
      
      if (allDrafts[0].count > 0) {
        // Get sample draft to see what's wrong
        const [sample] = await db.query(
          `SELECT id, ocr_job_id, entry_index, church_id, workflow_status, status FROM ocr_fused_drafts WHERE ocr_job_id = ? LIMIT 1`,
          [jobId]
        );
        console.log(`[Fusion Drafts GET] Sample draft (no filters):`, JSON.stringify(sample[0]));
        
        if (hasChurchId) {
          // Check if church_id mismatch is the issue
          const [churchIdCheck] = await db.query(
            `SELECT COUNT(*) as count, church_id FROM ocr_fused_drafts WHERE ocr_job_id = ? GROUP BY church_id`,
            [jobId]
          );
          console.log(`[Fusion Drafts GET] Drafts grouped by church_id:`, JSON.stringify(churchIdCheck));
        }
      } else {
        console.log(`[Fusion Drafts GET] No drafts exist for job ${jobId} at all`);
      }
    }

    // Parse JSON fields
    const parsedDrafts = drafts.map((d: any) => {
      try {
        return {
          ...d,
          payload_json: typeof d.payload_json === 'string' ? JSON.parse(d.payload_json) : d.payload_json,
          bbox_json: d.bbox_json ? (typeof d.bbox_json === 'string' ? JSON.parse(d.bbox_json) : d.bbox_json) : null,
        };
      } catch (parseError: any) {
        console.error(`[Fusion Drafts GET] Error parsing draft ${d.id}:`, parseError);
        return {
          ...d,
          payload_json: {},
          bbox_json: null,
        };
      }
    });

    console.log(`[Fusion Drafts GET] Returning ${parsedDrafts.length} parsed drafts`);
    res.json({ drafts: parsedDrafts });
  } catch (error: any) {
    console.error('[Fusion Drafts GET] ===== ERROR =====');
    console.error('[Fusion Drafts GET] Error:', error);
    console.error('[Fusion Drafts GET] Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch drafts', message: error.message });
  }
});

// =============================================================================
// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
// =============================================================================
// Save/upsert fusion drafts
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entries } = req.body; // Array of { entry_index, record_type, record_number, payload_json, bbox_json }
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ocr_job_id BIGINT NOT NULL,
        entry_index INT NOT NULL DEFAULT 0,
        record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
        record_number VARCHAR(16) NULL,
        payload_json LONGTEXT NOT NULL,
        bbox_json LONGTEXT NULL,
        status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
        committed_record_id BIGINT NULL,
        created_by VARCHAR(255) NOT NULL DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if church_id and workflow_status columns exist
    let hasChurchId = false;
    let hasWorkflowStatus = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      hasChurchId = colNames.includes('church_id');
      hasWorkflowStatus = colNames.includes('workflow_status');
    } catch (e) { /* ignore */ }

    const savedDrafts: any[] = [];

    for (const entry of entries) {
      const { entry_index, record_type, record_number, payload_json, bbox_json } = entry;

      // Build INSERT columns and values dynamically based on what columns exist
      let insertCols = 'ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, status, created_by';
      let insertValues = '?, ?, ?, ?, ?, ?, ?, ?';
      const insertParams: any[] = [
        jobId,
        entry_index,
        record_type || 'baptism',
        record_number || null,
        JSON.stringify(payload_json || {}),
        bbox_json ? JSON.stringify(bbox_json) : null,
        'draft',
        userEmail,
      ];

      // Add church_id if column exists
      if (hasChurchId) {
        insertCols += ', church_id';
        insertValues += ', ?';
        insertParams.push(churchId);
      }

      // Add workflow_status if column exists (default to 'draft')
      if (hasWorkflowStatus) {
        insertCols += ', workflow_status';
        insertValues += ', ?';
        insertParams.push('draft');
      }

      // Upsert: insert or update on duplicate key
      const [result] = await db.query(`
        INSERT INTO ocr_fused_drafts 
          (${insertCols})
        VALUES (${insertValues})
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          record_number = VALUES(record_number),
          payload_json = VALUES(payload_json),
          bbox_json = VALUES(bbox_json),
          updated_at = CURRENT_TIMESTAMP
          ${hasChurchId ? ', church_id = VALUES(church_id)' : ''}
          ${hasWorkflowStatus ? ', workflow_status = COALESCE(VALUES(workflow_status), workflow_status)' : ''}
      `, insertParams);

      // Get the saved/updated draft
      const [saved] = await db.query(
        'SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index = ?',
        [jobId, entry_index]
      );

      if (saved.length > 0) {
        savedDrafts.push({
          ...saved[0],
          payload_json: typeof saved[0].payload_json === 'string' ? JSON.parse(saved[0].payload_json) : saved[0].payload_json,
          bbox_json: saved[0].bbox_json ? (typeof saved[0].bbox_json === 'string' ? JSON.parse(saved[0].bbox_json) : saved[0].bbox_json) : null,
        });
      }
    }

    res.json({ success: true, drafts: savedDrafts });
  } catch (error: any) {
    console.error('[Fusion Drafts POST] Error:', error);
    res.status(500).json({ error: 'Failed to save drafts', message: error.message });
  }
});

// =============================================================================
// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review
// =============================================================================
// Mark drafts ready for review
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body;

    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('../utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);

    // Check if workflow_status column exists and what type status column is
    let hasWorkflowStatus = false;
    let hasStatusColumn = false;
    let statusIsEnum = false;
    let statusEnumValues: string[] = [];
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      hasWorkflowStatus = colNames.includes('workflow_status');
      hasStatusColumn = colNames.includes('status');
      
      // Check if status is an ENUM and what values it accepts
      if (hasStatusColumn) {
        const statusCol = cols.find((c: any) => c.Field === 'status');
        if (statusCol && statusCol.Type) {
          const typeStr = statusCol.Type.toString().toLowerCase();
          if (typeStr.startsWith('enum')) {
            statusIsEnum = true;
            // Extract ENUM values: ENUM('draft','committed') -> ['draft', 'committed']
            const match = typeStr.match(/enum\((.+)\)/);
            if (match) {
              statusEnumValues = match[1].split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
            }
          }
        }
      }
    } catch (e) { 
      console.error('[ready-for-review] Error checking columns:', e);
    }

    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      const placeholders = entry_indexes.map(() => '?').join(',');
      
      if (hasWorkflowStatus) {
        // Update workflow_status (primary) and optionally status (for compatibility)
        if (hasStatusColumn && !statusIsEnum) {
          // Only update status if it's not an ENUM (ENUMs don't support 'in_review')
          await db.query(
            `UPDATE ocr_fused_drafts 
             SET workflow_status = 'in_review', status = 'in_review', updated_at = NOW() 
             WHERE ocr_job_id = ? AND entry_index IN (${placeholders}) AND workflow_status = 'draft'`,
            [jobId, ...entry_indexes]
          );
        } else {
          // If status is ENUM or doesn't exist, only update workflow_status
          await db.query(
            `UPDATE ocr_fused_drafts 
             SET workflow_status = 'in_review', updated_at = NOW() 
             WHERE ocr_job_id = ? AND entry_index IN (${placeholders}) AND workflow_status = 'draft'`,
            [jobId, ...entry_indexes]
          );
        }
      } else if (hasStatusColumn && !statusIsEnum) {
        // Fallback to status column only if it's not an ENUM
        await db.query(
          `UPDATE ocr_fused_drafts SET status = 'in_review', updated_at = NOW() 
           WHERE ocr_job_id = ? AND entry_index IN (${placeholders}) AND status = 'draft'`,
          [jobId, ...entry_indexes]
        );
      } else {
        // If status is ENUM, we can't set it to 'in_review' - this is an error condition
        return res.status(400).json({ 
          error: 'Cannot set status to in_review: status column is ENUM and does not support in_review. Please add workflow_status column.' 
        });
      }
    } else {
      // Update all drafts for the job
      if (hasWorkflowStatus) {
        if (hasStatusColumn && !statusIsEnum) {
          await db.query(
            `UPDATE ocr_fused_drafts 
             SET workflow_status = 'in_review', status = 'in_review', updated_at = NOW() 
             WHERE ocr_job_id = ? AND workflow_status = 'draft'`,
            [jobId]
          );
        } else {
          await db.query(
            `UPDATE ocr_fused_drafts 
             SET workflow_status = 'in_review', updated_at = NOW() 
             WHERE ocr_job_id = ? AND workflow_status = 'draft'`,
            [jobId]
          );
        }
      } else if (hasStatusColumn && !statusIsEnum) {
        await db.query(
          `UPDATE ocr_fused_drafts SET status = 'in_review', updated_at = NOW() 
           WHERE ocr_job_id = ? AND status = 'draft'`,
          [jobId]
        );
      } else {
        return res.status(400).json({ 
          error: 'Cannot set status to in_review: status column is ENUM and does not support in_review. Please add workflow_status column.' 
        });
      }
    }

    res.json({ success: true, message: 'Drafts marked for review' });
  } catch (error: any) {
    console.error('[Ready for Review] Error:', error);
    res.status(500).json({ error: 'Failed to mark ready for review', message: error.message });
  }
});

// =============================================================================
// GET /api/church/:churchId/ocr/jobs
// =============================================================================
// Get list of OCR jobs for a church
app.get('/api/church/:churchId/ocr/jobs', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs`);
    const { promisePool } = require('./config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found', jobs: [] });
    }

    const dbName = churchRows[0].database_name;

    // Get church database connection
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(dbName);

    /**
     * Fetch OCR jobs with dynamic column detection
     */
    const fetchOcrJobsDynamic = async (pool: any, schema: string, churchIdVal: number): Promise<any[]> => {
      // Check if ocr_jobs table exists in this schema
      const [tableCheck] = await pool.query(`
        SELECT COUNT(*) as cnt FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = 'ocr_jobs'
      `, [schema]);
      
      if (!tableCheck[0]?.cnt) {
        console.warn(`[OCR Jobs] Table ocr_jobs does not exist in ${schema}`);
        return [];
      }

      // Get available columns
      const [columns] = await pool.query(`SHOW COLUMNS FROM \`${schema}\`.ocr_jobs`);
      const columnNames = new Set(columns.map((c: any) => c.Field));

      // Required columns (always include)
      const requiredCols = ['id', 'filename', 'original_filename', 'file_path', 'status', 
        'record_type', 'language', 'confidence_score', 'file_size', 'mime_type', 'pages',
        'created_at', 'updated_at', 'church_id'];
      
      // Optional columns (include only if present)
      const optionalCols = ['ocr_result', 'error', 'processing_time_ms', 'ocr_text'];

      // Build SELECT list from available columns
      const selectCols: string[] = [];
      for (const col of requiredCols) {
        if (columnNames.has(col)) {
          selectCols.push(col);
        }
      }
      for (const col of optionalCols) {
        if (columnNames.has(col)) {
          selectCols.push(col);
        }
      }

      if (selectCols.length === 0) {
        console.warn(`[OCR Jobs] No valid columns found in ${schema}.ocr_jobs`);
        return [];
      }

      const query = `
        SELECT ${selectCols.join(', ')}
        FROM \`${schema}\`.ocr_jobs 
        WHERE church_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const [rows] = await pool.query(query, [churchIdVal]);
      return rows;
    };

    // Fetch jobs from church database
    let jobs: any[] = [];
    let jobsSource = 'church_db';
    try {
      jobs = await fetchOcrJobsDynamic(db, dbName, churchId);
      console.log(`[OCR Jobs GET] Found ${jobs.length} jobs in church database ${dbName}`);
    } catch (dbError: any) {
      if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.code === 'ER_BAD_FIELD_ERROR') {
        console.warn(`[OCR Jobs] Church DB ${dbName} issue: ${dbError.message}`);
      } else {
        throw dbError;
      }
    }

    // Fallback: Try main database if no jobs found in church DB
    if (jobs.length === 0) {
      console.log(`[OCR Jobs GET] No jobs in church DB, checking main database...`);
      try {
        const [mainTableCheck] = await promisePool.query(`
          SELECT COUNT(*) as cnt FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = 'ocr_jobs'
        `);
        
        if (mainTableCheck[0]?.cnt > 0) {
          const [mainCols] = await promisePool.query(`SHOW COLUMNS FROM ocr_jobs`);
          const mainColNames = new Set(mainCols.map((c: any) => c.Field));
          
          const cols = ['id', 'filename', 'original_filename', 'file_path', 'status', 
            'record_type', 'language', 'confidence_score', 'file_size', 'mime_type', 'pages',
            'created_at', 'updated_at', 'church_id']
            .filter(c => mainColNames.has(c));
          
          if (mainColNames.has('ocr_result')) cols.push('ocr_result');
          if (mainColNames.has('error')) cols.push('error');
          
          if (cols.length > 0) {
            const [mainRows] = await promisePool.query(`
              SELECT ${cols.join(', ')} FROM ocr_jobs 
              WHERE church_id = ? ORDER BY created_at DESC LIMIT 100
            `, [churchId]);
            jobs = mainRows;
            jobsSource = 'main_db';
            console.log(`[OCR Jobs GET] Found ${jobs.length} jobs in main database (fallback)`);
          }
        }
      } catch (mainError) {
        // Silent - main DB fallback is optional
      }
    }

    console.log(`[OCR Jobs GET] Returning ${jobs.length} jobs from ${jobsSource} for church ${churchId}`);
    
    // Map to API response format
    const mappedJobs = jobs.map((job: any) => {
      const isCompleted = job.status === 'completed' || job.status === 'complete';
      const hasOcrText = isCompleted || !!job.ocr_text;
      
      let ocrTextPreview = null;
      if (job.ocr_text) {
        const lines = job.ocr_text.split('\n').slice(0, 8);
        ocrTextPreview = lines.join('\n').substring(0, 400);
        if (ocrTextPreview.length < job.ocr_text.length) {
          ocrTextPreview += '...';
        }
      } else if (isCompleted) {
        ocrTextPreview = '[OCR text available - click to view]';
      }
      
      return {
        id: job.id?.toString() || '',
        church_id: job.church_id?.toString() || churchId.toString(),
        original_filename: job.original_filename || job.filename || '',
        filename: job.filename || '',
        status: job.status || 'pending',
        confidence_score: job.confidence_score || 0,
        error_message: job.error || null,
        created_at: job.created_at || new Date().toISOString(),
        updated_at: job.updated_at || new Date().toISOString(),
        record_type: job.record_type || 'baptism',
        language: job.language || 'en',
        ocr_text_preview: ocrTextPreview,
        has_ocr_text: hasOcrText
      };
    });

    res.json({ jobs: mappedJobs });
  } catch (error: any) {
    console.error('[OCR Jobs] Error fetching church OCR jobs:', error);
    res.status(500).json({ error: 'Failed to fetch OCR jobs', message: error.message, jobs: [] });
  }
});

// =============================================================================
// Database Schema Reference
// =============================================================================
/*
OCR_JOBS TABLE (in church database, e.g., om_church_46):
  - id INT AUTO_INCREMENT PRIMARY KEY
  - church_id INT NOT NULL
  - filename VARCHAR(255)
  - original_filename VARCHAR(255)
  - file_path VARCHAR(500)
  - status ENUM('pending','processing','complete','error','cancelled')
  - record_type ENUM('baptism','marriage','funeral','custom')
  - language CHAR(2)
  - confidence_score DECIMAL(5,2)
  - created_at TIMESTAMP
  - updated_at TIMESTAMP

OCR_FUSED_DRAFTS TABLE (in church database):
  - id BIGINT AUTO_INCREMENT PRIMARY KEY
  - ocr_job_id BIGINT NOT NULL
  - entry_index INT NOT NULL DEFAULT 0
  - record_type ENUM('baptism', 'marriage', 'funeral')
  - record_number VARCHAR(16)
  - payload_json LONGTEXT NOT NULL
  - bbox_json LONGTEXT NULL
  - status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft'
  - workflow_status ENUM('draft','in_review','finalized','committed') (if exists)
  - church_id INT NULL (if exists)
  - committed_record_id BIGINT NULL
  - created_by VARCHAR(255)
  - created_at TIMESTAMP
  - updated_at TIMESTAMP
  - UNIQUE KEY uk_job_entry (ocr_job_id, entry_index)

KEY ISSUES TO FIX:
1. Jobs might be in main DB but drafts are in church DB - check both
2. church_id column might not exist or be NULL in drafts
3. workflow_status column might not exist
4. status column is ENUM('draft','committed') and doesn't support 'in_review'
5. Query filters might be too restrictive
*/

