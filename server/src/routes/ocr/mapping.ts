import { Router, Request, Response } from 'express';
import { resolveChurchDb, promisePool } from './helpers';

const router = Router({ mergeParams: true });

/**
 * POST /jobs/:jobId/mapping — Save (upsert) an OCR mapping
 */
router.post('/jobs/:jobId/mapping', async (req: Request, res: Response) => {
  try {
    const churchId = Number(req.params.churchId);
    const jobId = Number(req.params.jobId);
    const { record_type, mapping_json } = req.body;
    const userEmail = (req as any).session?.user?.email || (req as any).user?.email || 'unknown';

    // Ensure ocr_mappings table exists
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS ocr_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ocr_job_id INT NOT NULL,
        church_id INT NULL,
        record_type VARCHAR(50),
        mapping_json LONGTEXT,
        bbox_links LONGTEXT NULL,
        status ENUM('draft','reviewed','approved') DEFAULT 'draft',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ocr_job_id (ocr_job_id),
        INDEX idx_church_id (church_id)
      )
    `);

    // Ensure church_id column exists (safe for repeated calls)
    try {
      await promisePool.query(`ALTER TABLE ocr_mappings ADD COLUMN IF NOT EXISTS church_id INT NULL`);
    } catch (_e) {
      // Column already exists or DB doesn't support IF NOT EXISTS — ignore
    }

    // Stringify mapping_json if it's an object
    const mappingStr = typeof mapping_json === 'object' ? JSON.stringify(mapping_json) : mapping_json;

    // Check for existing row
    const [existing]: any = await promisePool.query(
      'SELECT id FROM ocr_mappings WHERE ocr_job_id = ? LIMIT 1',
      [jobId]
    );

    if (existing.length > 0) {
      // Update
      await promisePool.query(
        `UPDATE ocr_mappings
            SET record_type  = ?,
                mapping_json = ?,
                church_id    = ?,
                created_by   = ?,
                updated_at   = CURRENT_TIMESTAMP
          WHERE ocr_job_id = ?`,
        [record_type, mappingStr, churchId, userEmail, jobId]
      );
    } else {
      // Insert
      await promisePool.query(
        `INSERT INTO ocr_mappings (ocr_job_id, church_id, record_type, mapping_json, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [jobId, churchId, record_type, mappingStr, userEmail]
      );
    }

    return res.json({ success: true, message: 'Mapping saved' });
  } catch (err: any) {
    console.error('[OCR mapping] POST error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /jobs/:jobId/mapping — Retrieve the latest mapping for a job
 */
router.get('/jobs/:jobId/mapping', async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);

    const [rows]: any = await promisePool.query(
      `SELECT id, ocr_job_id, record_type, mapping_json, created_by, created_at, updated_at
         FROM ocr_mappings
        WHERE ocr_job_id = ?
        ORDER BY updated_at DESC
        LIMIT 1`,
      [jobId]
    );

    if (!rows.length) {
      return res.json({ mapping: null });
    }

    const row = rows[0];

    // Parse mapping_json if it's a string
    if (typeof row.mapping_json === 'string') {
      try {
        row.mapping_json = JSON.parse(row.mapping_json);
      } catch (_e) {
        // Leave as-is if not valid JSON
      }
    }

    return res.json({
      mapping: {
        id: row.id,
        ocr_job_id: row.ocr_job_id,
        record_type: row.record_type,
        mapping_json: row.mapping_json,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (err: any) {
    // Handle table-not-found gracefully
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ mapping: null });
    }
    console.error('[OCR mapping] GET error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
