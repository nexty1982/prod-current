/**
 * OCR Fusion Workflow Routes
 * Handles fusion drafts lifecycle: create, read, autosave, extract, review.
 * Mounted at /api/church/:churchId/ocr
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
import { resolveChurchDb, promisePool } from './helpers';

const CREATE_FUSED_DRAFTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ocr_job_id BIGINT NOT NULL,
    entry_index INT DEFAULT 0,
    record_type ENUM('baptism','marriage','funeral') DEFAULT 'baptism',
    record_number VARCHAR(16) NULL,
    payload_json LONGTEXT,
    bbox_json LONGTEXT NULL,
    status ENUM('draft','committed') DEFAULT 'draft',
    workflow_status VARCHAR(32) DEFAULT 'draft',
    church_id INT NULL,
    committed_record_id BIGINT NULL,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
    INDEX idx_status (status)
  )
`;

// ---------------------------------------------------------------------------
// 1. POST /test/create-test-job — Create test OCR job and fusion drafts
// ---------------------------------------------------------------------------
router.post('/test/create-test-job', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Fusion] POST /test/create-test-job for church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db, dbName } = resolved;

    // Create a test job in ocr_jobs
    const [jobResult]: any = await db.query(
      `INSERT INTO ocr_jobs (church_id, workflow_status, status, file_name, created_by)
       VALUES (?, 'processing', 'processing', 'test-fusion-job.png', 'system')`,
      [churchId]
    );
    const jobId = jobResult.insertId;

    // Ensure ocr_fused_drafts table exists
    await db.query(CREATE_FUSED_DRAFTS_TABLE);

    // Insert 2 test draft records
    const testDrafts = [
      {
        entry_index: 0,
        record_number: 'TEST-001',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBaptism: '2024-01-15',
          priestName: 'Fr. Michael',
          godparentName: 'Jane Smith'
        }
      },
      {
        entry_index: 1,
        record_number: 'TEST-002',
        payload: {
          firstName: 'Maria',
          lastName: 'Ivanova',
          dateOfBaptism: '2024-02-20',
          priestName: 'Fr. Alexei',
          godparentName: 'Peter Johnson'
        }
      }
    ];

    const insertedDrafts: any[] = [];
    for (const draft of testDrafts) {
      const [result]: any = await db.query(
        `INSERT INTO ocr_fused_drafts
           (ocr_job_id, entry_index, record_type, record_number, payload_json,
            workflow_status, church_id, created_by)
         VALUES (?, ?, 'baptism', ?, ?, 'draft', ?, 'system')`,
        [jobId, draft.entry_index, draft.record_number, JSON.stringify(draft.payload), churchId]
      );
      insertedDrafts.push({
        id: result.insertId,
        ocr_job_id: jobId,
        entry_index: draft.entry_index,
        record_type: 'baptism',
        record_number: draft.record_number,
        payload: draft.payload
      });
    }

    return res.json({
      success: true,
      message: `Created test job ${jobId} with ${insertedDrafts.length} fusion drafts`,
      job: { id: jobId, church_id: churchId, workflow_status: 'processing' },
      drafts: insertedDrafts
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Error creating test job:', err);
    return res.status(500).json({ error: 'Failed to create test job', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /jobs/:jobId/fusion/drafts — Get fusion drafts for a job
// ---------------------------------------------------------------------------
router.get('/jobs/:jobId/fusion/drafts', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Fusion] GET drafts for job ${jobId}, church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    let query = 'SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND church_id = ?';
    const params: any[] = [jobId, churchId];

    // Optional filters
    if (req.query.status) {
      query += ' AND workflow_status = ?';
      params.push(req.query.status);
    }
    if (req.query.record_type) {
      query += ' AND record_type = ?';
      params.push(req.query.record_type);
    }

    query += ' ORDER BY entry_index ASC';

    const [rows]: any = await db.query(query, params);

    // Normalize drafts: parse JSON fields and map status
    const drafts = rows.map((row: any) => {
      let payload = null;
      let bbox = null;
      try { payload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch (_) { payload = null; }
      try { bbox = row.bbox_json ? JSON.parse(row.bbox_json) : null; } catch (_) { bbox = null; }

      return {
        id: row.id,
        ocr_job_id: row.ocr_job_id,
        entry_index: row.entry_index,
        record_type: row.record_type,
        record_number: row.record_number,
        payload,
        bbox,
        status: row.workflow_status || row.status,
        committed_record_id: row.committed_record_id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    // Build convenience structures
    const entryAreas: any[] = [];
    const entries: any[] = [];
    const fields: Record<string, any> = {};
    const selections: Record<string, any> = {};

    for (const draft of drafts) {
      entries.push({
        entryIndex: draft.entry_index,
        recordType: draft.record_type,
        recordNumber: draft.record_number,
        status: draft.status
      });

      if (draft.bbox && draft.bbox.entryBbox) {
        entryAreas.push({
          entryId: `entry-${draft.entry_index}`,
          bbox: draft.bbox.entryBbox
        });
      }

      if (draft.payload) {
        fields[`entry-${draft.entry_index}`] = draft.payload;
      }

      if (draft.bbox && draft.bbox.selections) {
        selections[`entry-${draft.entry_index}`] = draft.bbox.selections;
      }
    }

    return res.json({ drafts, entryAreas, entries, fields, selections });
  } catch (err: any) {
    console.error('[OCR Fusion] Error fetching drafts:', err);
    return res.status(500).json({ error: 'Failed to fetch drafts', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. PUT /jobs/:jobId/fusion/drafts/:entryIndex — Autosave a draft
// ---------------------------------------------------------------------------
router.put('/jobs/:jobId/fusion/drafts/:entryIndex', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const entryIndex = parseInt(req.params.entryIndex);
    console.log(`[OCR Fusion] PUT autosave draft job=${jobId} entry=${entryIndex} church=${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const { payload_json, bbox_json } = req.body;
    const payloadStr = typeof payload_json === 'string' ? payload_json : JSON.stringify(payload_json || null);
    const bboxStr = typeof bbox_json === 'string' ? bbox_json : JSON.stringify(bbox_json || null);

    // Ensure table exists
    await db.query(CREATE_FUSED_DRAFTS_TABLE);

    // Upsert on (ocr_job_id, entry_index)
    await db.query(
      `INSERT INTO ocr_fused_drafts
         (ocr_job_id, entry_index, payload_json, bbox_json, church_id, workflow_status, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', 'system')
       ON DUPLICATE KEY UPDATE
         payload_json = VALUES(payload_json),
         bbox_json = VALUES(bbox_json),
         updated_at = CURRENT_TIMESTAMP`,
      [jobId, entryIndex, payloadStr, bboxStr, churchId]
    );

    // Fetch the saved row
    const [saved]: any = await db.query(
      'SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index = ?',
      [jobId, entryIndex]
    );

    if (!saved.length) {
      return res.status(500).json({ error: 'Failed to retrieve saved draft' });
    }

    const row = saved[0];
    let parsedPayload = null;
    let parsedBbox = null;
    try { parsedPayload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch (_) { parsedPayload = null; }
    try { parsedBbox = row.bbox_json ? JSON.parse(row.bbox_json) : null; } catch (_) { parsedBbox = null; }

    const draft = {
      id: row.id,
      ocr_job_id: row.ocr_job_id,
      entry_index: row.entry_index,
      record_type: row.record_type,
      record_number: row.record_number,
      payload: parsedPayload,
      bbox: parsedBbox,
      status: row.workflow_status || row.status,
      committed_record_id: row.committed_record_id,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return res.json({
      success: true,
      draft,
      last_saved_at: row.updated_at
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Error autosaving draft:', err);
    return res.status(500).json({ error: 'Failed to autosave draft', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /jobs/:jobId/fusion/extract-layout — Extract fields via layout extractor
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/extract-layout', async (req: any, res: any) => {
  try {
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Fusion] POST extract-layout for job ${jobId}`);

    const {
      visionResponse,
      imageWidth,
      imageHeight,
      recordType,
      confidenceThreshold,
      entryAreas,
      debug
    } = req.body;

    if (!visionResponse || !imageWidth || !imageHeight) {
      return res.status(400).json({
        error: 'Missing required fields: visionResponse, imageWidth, imageHeight'
      });
    }

    const { extractLayoutFields } = require('../../ocr/layoutExtractor');

    const result = extractLayoutFields(visionResponse, {
      imageWidth,
      imageHeight,
      recordType: recordType || 'baptism',
      confidenceThreshold: confidenceThreshold || 0.6,
      entryAreas: entryAreas || [],
      debug: debug || false
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[OCR Fusion] Error extracting layout fields:', err);
    return res.status(500).json({ error: 'Failed to extract layout fields', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. PATCH /jobs/:jobId/fusion/drafts/:draftId/entry-bbox — Update entry bbox
// ---------------------------------------------------------------------------
router.patch('/jobs/:jobId/fusion/drafts/:draftId/entry-bbox', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const draftId = parseInt(req.params.draftId);
    console.log(`[OCR Fusion] PATCH entry-bbox for draft ${draftId}, church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const { entryBbox, entryAreas } = req.body;

    // Validate entryBbox if provided
    if (entryBbox) {
      if (
        typeof entryBbox !== 'object' ||
        typeof entryBbox.x !== 'number' ||
        typeof entryBbox.y !== 'number' ||
        typeof entryBbox.w !== 'number' ||
        typeof entryBbox.h !== 'number'
      ) {
        return res.status(400).json({
          error: 'Invalid entryBbox: must be an object with numeric x, y, w, h'
        });
      }
    }

    // Validate entryAreas if provided
    if (entryAreas) {
      if (!Array.isArray(entryAreas)) {
        return res.status(400).json({ error: 'Invalid entryAreas: must be an array' });
      }
      for (const area of entryAreas) {
        if (!area.entryId || !area.bbox) {
          return res.status(400).json({
            error: 'Invalid entryAreas: each item must have entryId and bbox'
          });
        }
      }
    }

    if (!entryBbox && !entryAreas) {
      return res.status(400).json({ error: 'Must provide entryBbox or entryAreas' });
    }

    // Read existing bbox_json
    const [rows]: any = await db.query(
      'SELECT * FROM ocr_fused_drafts WHERE id = ?',
      [draftId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const row = rows[0];
    let existingBbox: any = {};
    try { existingBbox = row.bbox_json ? JSON.parse(row.bbox_json) : {}; } catch (_) { existingBbox = {}; }

    // Merge updates
    if (entryBbox) {
      existingBbox.entryBbox = entryBbox;
    }

    if (entryAreas) {
      existingBbox.entryAreas = entryAreas;
    }

    // Ensure selections object exists
    if (!existingBbox.selections) {
      existingBbox.selections = {};
    }

    const updatedBboxStr = JSON.stringify(existingBbox);

    await db.query(
      'UPDATE ocr_fused_drafts SET bbox_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [updatedBboxStr, draftId]
    );

    // Return updated draft
    let parsedPayload = null;
    try { parsedPayload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch (_) { parsedPayload = null; }

    const draft = {
      id: row.id,
      ocr_job_id: row.ocr_job_id,
      entry_index: row.entry_index,
      record_type: row.record_type,
      record_number: row.record_number,
      payload: parsedPayload,
      bbox: existingBbox,
      status: row.workflow_status || row.status,
      committed_record_id: row.committed_record_id,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: new Date()
    };

    return res.json({ success: true, draft });
  } catch (err: any) {
    console.error('[OCR Fusion] Error updating entry bbox:', err);
    return res.status(500).json({ error: 'Failed to update entry bbox', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /jobs/:jobId/fusion/ready-for-review — Mark drafts ready for review
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/ready-for-review', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Fusion] POST ready-for-review job=${jobId} church=${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const { entry_indexes } = req.body;

    let query: string;
    let params: any[];

    if (entry_indexes && Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      // Only update specified entries
      const placeholders = entry_indexes.map(() => '?').join(',');
      query = `UPDATE ocr_fused_drafts
               SET workflow_status = 'in_review', updated_at = CURRENT_TIMESTAMP
               WHERE ocr_job_id = ? AND church_id = ? AND workflow_status = 'draft'
                 AND entry_index IN (${placeholders})`;
      params = [jobId, churchId, ...entry_indexes];
    } else {
      // Update all drafts for this job
      query = `UPDATE ocr_fused_drafts
               SET workflow_status = 'in_review', updated_at = CURRENT_TIMESTAMP
               WHERE ocr_job_id = ? AND church_id = ? AND workflow_status = 'draft'`;
      params = [jobId, churchId];
    }

    const [result]: any = await db.query(query, params);

    return res.json({
      success: true,
      message: `Marked ${result.affectedRows} draft(s) as in_review`
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Error marking ready for review:', err);
    return res.status(500).json({ error: 'Failed to mark drafts for review', details: err.message });
  }
});

module.exports = router;
