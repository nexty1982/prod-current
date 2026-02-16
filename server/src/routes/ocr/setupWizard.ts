/**
 * OCR Setup Wizard Routes
 * GET/PUT setup state, POST validate, GET inventory.
 * Extracted from index.ts lines ~1341-1733.
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
import { resolveChurchDb } from './helpers';

// Shared SQL for creating the ocr_setup_state table
const CREATE_SETUP_STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS ocr_setup_state (
    church_id INT NOT NULL PRIMARY KEY,
    state_json LONGTEXT NULL,
    percent_complete INT NOT NULL DEFAULT 0,
    is_complete TINYINT(1) NOT NULL DEFAULT 0,
    flow_type ENUM('blank_slate', 'existing_records') NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_complete (is_complete),
    INDEX idx_updated_at (updated_at),
    INDEX idx_flow_type (flow_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

// Shared ALTER to add flow_type column on older tables that lack it
async function ensureFlowTypeColumn(db: any): Promise<void> {
  try {
    await db.query(`
      ALTER TABLE ocr_setup_state
      ADD COLUMN flow_type ENUM('blank_slate', 'existing_records') NULL AFTER is_complete,
      ADD INDEX idx_flow_type (flow_type)
    `);
  } catch (e: any) {
    // Column might already exist, that's fine
    if (!e.message?.includes('Duplicate column name')) {
      console.warn('[OCR Setup] Could not add flow_type column:', e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// GET /setup-state - Get setup wizard state
// ---------------------------------------------------------------------------
router.get('/setup-state', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Setup] GET /api/church/${churchId}/ocr/setup-state`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Ensure table exists
    await db.query(CREATE_SETUP_STATE_TABLE);

    // Add flow_type column if it doesn't exist (for existing tables)
    await ensureFlowTypeColumn(db);

    const [rows] = await db.query(
      'SELECT state_json, percent_complete, is_complete, flow_type, updated_at FROM ocr_setup_state WHERE church_id = ?',
      [churchId]
    );

    if (rows.length > 0) {
      const row = rows[0];
      const stateJson = row.state_json
        ? (typeof row.state_json === 'string' ? JSON.parse(row.state_json) : row.state_json)
        : {};
      res.json({
        churchId,
        state: stateJson,
        percentComplete: row.percent_complete || 0,
        isComplete: Boolean(row.is_complete),
        flowType: row.flow_type || null,
        updatedAt: row.updated_at
      });
    } else {
      // Return default empty state
      res.json({
        churchId,
        state: {},
        percentComplete: 0,
        isComplete: false,
        flowType: null,
        updatedAt: null
      });
    }
  } catch (error: any) {
    console.error('Error fetching OCR setup state:', error);
    res.status(500).json({ error: 'Failed to fetch setup state', message: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /setup-state - Save setup wizard state
// ---------------------------------------------------------------------------
router.put('/setup-state', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { state, percentComplete, isComplete } = req.body;

    console.log(`[OCR Setup] PUT /api/church/${churchId}/ocr/setup-state - percentComplete: ${percentComplete}, isComplete: ${isComplete}`);

    if (!churchId) {
      return res.status(400).json({ error: 'Invalid church ID' });
    }

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Ensure table exists
    await db.query(CREATE_SETUP_STATE_TABLE);

    // Add flow_type column if it doesn't exist (for existing tables)
    await ensureFlowTypeColumn(db);

    const stateJson = JSON.stringify(state || {});
    const percent = Math.max(0, Math.min(100, percentComplete || 0));
    const complete = isComplete ? 1 : 0;
    const flowType = req.body.flowType || null;

    await db.query(`
      INSERT INTO ocr_setup_state (church_id, state_json, percent_complete, is_complete, flow_type)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        state_json = VALUES(state_json),
        percent_complete = VALUES(percent_complete),
        is_complete = VALUES(is_complete),
        flow_type = COALESCE(VALUES(flow_type), flow_type),
        updated_at = CURRENT_TIMESTAMP
    `, [churchId, stateJson, percent, complete, flowType]);

    res.json({ success: true, message: 'Setup state saved successfully' });
  } catch (error: any) {
    console.error('Error saving OCR setup state:', error);
    res.status(500).json({ error: 'Failed to save setup state', message: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /setup-validate - Validate readiness checks
// ---------------------------------------------------------------------------
router.post('/setup-validate', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Setup] POST /api/church/${churchId}/ocr/setup-validate`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const fs = require('fs').promises;
    const path = require('path');

    const checklist: any = {
      churchContext: { passed: true, message: 'Church context verified' },
      ocrSettings: { passed: false, message: 'OCR settings not configured' },
      storageReady: { passed: false, message: 'Storage paths not verified' },
      visionReady: { passed: false, message: 'Vision credentials not configured' },
      mappingReady: { passed: false, message: 'Mapping templates not configured' }
    };

    // Check OCR settings
    try {
      const [settingsRows] = await db.query('SELECT * FROM ocr_settings WHERE church_id = ? LIMIT 1', [churchId]);
      if (settingsRows.length > 0) {
        checklist.ocrSettings = { passed: true, message: 'OCR settings configured' };
      }
    } catch (e: any) {
      console.warn('[OCR Setup] OCR settings check failed:', e.message);
    }

    // Check storage paths (check if upload directory exists)
    try {
      const uploadPath = path.join('/var/www/orthodoxmetrics/data/church', String(churchId), 'ocr_uploads');
      try {
        await fs.access(uploadPath);
        checklist.storageReady = { passed: true, message: 'Storage directory exists' };
      } catch (e: any) {
        // Try to create it
        try {
          await fs.mkdir(uploadPath, { recursive: true });
          // Test write
          const testFile = path.join(uploadPath, '.write-test');
          await fs.writeFile(testFile, 'test');
          await fs.unlink(testFile);
          checklist.storageReady = { passed: true, message: 'Storage directory created and writable' };
        } catch (createError: any) {
          checklist.storageReady = { passed: false, message: `Storage directory not writable: ${createError.message}` };
        }
      }
    } catch (e: any) {
      checklist.storageReady = { passed: false, message: `Storage check failed: ${e.message}` };
    }

    // Check Vision credentials
    try {
      let serverConfig: any;
      try {
        serverConfig = require('../../config');
      } catch (e) {
        serverConfig = null;
      }
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                             process.env.GOOGLE_VISION_API_KEY ||
                             (serverConfig && serverConfig.ocr && serverConfig.ocr.googleVisionKey);
      checklist.visionReady = {
        passed: !!hasCredentials,
        message: hasCredentials ? 'Vision credentials configured' : 'Vision credentials not found'
      };
    } catch (e: any) {
      checklist.visionReady = { passed: false, message: `Vision check failed: ${e.message}` };
    }

    // Check mapping templates
    try {
      const [mappingRows] = await db.query(
        'SELECT id FROM ocr_job_mappings WHERE church_id = ? LIMIT 1',
        [churchId]
      );
      if (mappingRows.length > 0) {
        checklist.mappingReady = { passed: true, message: 'Mapping templates exist' };
      } else {
        checklist.mappingReady = { passed: false, message: 'No mapping templates found (can be created in wizard)' };
      }
    } catch (e: any) {
      // Table might not exist, that's okay
      checklist.mappingReady = { passed: false, message: 'Mapping table not initialized (will be created in wizard)' };
    }

    const allPassed = Object.values(checklist).every((item: any) => item.passed);
    res.json({
      checklist,
      allPassed,
      percentComplete: Math.round(
        (Object.values(checklist).filter((item: any) => item.passed).length / Object.keys(checklist).length) * 100
      )
    });
  } catch (error: any) {
    console.error('Error validating OCR setup:', error);
    res.status(500).json({ error: 'Failed to validate setup', message: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /setup-inventory - Check church data inventory for branching
// ---------------------------------------------------------------------------
router.get('/setup-inventory', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Setup] GET /api/church/${churchId}/ocr/setup-inventory`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Helper function to check if table exists and get row count
    async function checkTable(tableName: string): Promise<{ table_exists: boolean; row_count: number }> {
      try {
        // Whitelist of allowed table names for safety
        const allowedTables = ['baptism', 'marriage', 'funeral', 'ocr_jobs', 'ocr_fused_drafts', 'ocr_mappings', 'ocr_settings'];
        if (!allowedTables.includes(tableName)) {
          return { table_exists: false, row_count: 0 };
        }

        // Check if table exists using information_schema
        const [tableRows] = await db.query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name = ?
        `, [tableName]);

        const tableExists = (tableRows as any[])[0]?.count > 0;

        if (!tableExists) {
          return { table_exists: false, row_count: 0 };
        }

        // Get row count (only if table exists) - use string interpolation with whitelist
        const [countRows] = await db.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = (countRows as any[])[0]?.count || 0;

        return { table_exists: true, row_count: rowCount };
      } catch (error: any) {
        // If query fails, assume table doesn't exist
        console.warn(`[Setup Inventory] Error checking table ${tableName}:`, error.message);
        return { table_exists: false, row_count: 0 };
      }
    }

    // Check record tables
    const baptism = await checkTable('baptism');
    const marriage = await checkTable('marriage');
    const funeral = await checkTable('funeral');

    // Check OCR tables
    const ocrJobs = await checkTable('ocr_jobs');
    const ocrFusedDrafts = await checkTable('ocr_fused_drafts');
    const ocrMappings = await checkTable('ocr_mappings');
    const ocrSettings = await checkTable('ocr_settings');

    // Determine classification
    const recordsExist = baptism.table_exists || marriage.table_exists || funeral.table_exists;
    const recordsHaveData = (baptism.row_count > 0) || (marriage.row_count > 0) || (funeral.row_count > 0);
    const ocrTablesExist = ocrJobs.table_exists || ocrFusedDrafts.table_exists || ocrMappings.table_exists || ocrSettings.table_exists;

    // Classification logic
    let classification: 'existing_records' | 'blank_slate' = 'blank_slate';
    const reasons: string[] = [];

    if (recordsHaveData) {
      classification = 'existing_records';
      reasons.push(`Found existing record data: ${baptism.row_count} baptisms, ${marriage.row_count} marriages, ${funeral.row_count} funerals`);
    } else if (recordsExist && !recordsHaveData) {
      classification = 'blank_slate';
      reasons.push('Record tables exist but are empty');
    } else {
      classification = 'blank_slate';
      reasons.push('No record tables found');
    }

    if (ocrTablesExist) {
      reasons.push(`OCR infrastructure exists: ${ocrJobs.row_count} jobs, ${ocrMappings.row_count} mappings`);
    } else {
      reasons.push('No OCR infrastructure found');
    }

    res.json({
      church_id: churchId,
      records: {
        baptism,
        marriage,
        funeral
      },
      ocr: {
        ocr_jobs: ocrJobs,
        ocr_fused_drafts: ocrFusedDrafts,
        ocr_mappings: ocrMappings,
        ocr_settings: ocrSettings
      },
      classification,
      reasons
    });
  } catch (error: any) {
    console.error('Error fetching setup inventory:', error);
    res.status(500).json({ error: 'Failed to fetch setup inventory', message: error.message });
  }
});

module.exports = router;
