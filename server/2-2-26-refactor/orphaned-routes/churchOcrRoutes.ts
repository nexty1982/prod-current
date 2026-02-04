/**
 * Church OCR Routes - DB as Source of Truth
 * 
 * All OCR endpoints for church-scoped operations.
 * Database is the single source of truth; Job Bundle files are optional artifacts only.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Extend Request type to include session and params
// When router is mounted at /api/church/:churchId/ocr, churchId is available in params
interface ChurchOcrRequest extends Omit<Request, 'params' | 'user'> {
  params: {
    churchId: string;
    jobId?: string;
    [key: string]: string | undefined;
  };
  session?: {
    user?: {
      email?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  user?: {
    userId: number;
    email: string;
    role: string;
    churchId?: number;
  };
}

const router = Router({ mergeParams: true }); // Merge params from parent route (/api/church/:churchId/ocr)

// Router signature for debugging
const OCR_ROUTER_SIGNATURE = 'churchOcrRoutes:v2:jobs-only';
(router as any).__om_signature = OCR_ROUTER_SIGNATURE;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
    const uploadDir = path.join(baseUploadPath, 'ocr', 'temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const crypto = require('crypto');
    const fileHash = crypto.randomBytes(8).toString('hex');
    cb(null, `ocr_${uniqueSuffix}_${fileHash}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(null, mimetype && extname);
  }
});

/**
 * Helper: Get church database connection
 */
async function getChurchDb(churchId: number) {
  const { promisePool } = require('../config/db');
  const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
  if (!churchRows.length) {
    throw new Error('Church not found');
  }

  let dbSwitcherModule;
  try {
    dbSwitcherModule = require('../utils/dbSwitcher');
  } catch (e) {
    dbSwitcherModule = require('../../utils/dbSwitcher');
  }
  const { getChurchDbConnection } = dbSwitcherModule;
  return await getChurchDbConnection(churchRows[0].database_name);
}

/**
 * Helper: Check if Job Bundle exists (optional metadata only)
 */
async function checkBundleExists(churchId: number, jobId: string | number): Promise<boolean> {
  try {
    let jobBundleModule;
    try {
      jobBundleModule = require('../utils/jobBundle');
    } catch (e) {
      try {
        jobBundleModule = require('../../dist/utils/jobBundle');
      } catch (e2) {
        return false;
      }
    }
    const { tryReadManifest } = jobBundleModule;
    const manifest = await tryReadManifest(churchId, String(jobId));
    return manifest !== null;
  } catch {
    return false;
  }
}

/**
 * GET /api/church/:churchId/ocr/jobs
 * List OCR jobs - DB ONLY (no bundle merge)
 */
router.get('/jobs', async (req: ChurchOcrRequest, res: Response) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs`);
    const db = await getChurchDb(churchId);

    // Query canonical columns only (after migration)
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, file_path, status, 
        record_type, language, confidence_score, file_size, mime_type, pages,
        ocr_text, ocr_result_json, error, processing_time_ms,
        created_at, updated_at, church_id
      FROM ocr_jobs 
      WHERE church_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [churchId]);

    // Map to API format - DB is source of truth
    const mappedJobs = (jobs as any[]).map(job => {
      // Generate preview from ocr_text in DB
      let ocrTextPreview = null;
      if (job.ocr_text) {
        const lines = job.ocr_text.split('\n').slice(0, 8);
        ocrTextPreview = lines.join('\n').substring(0, 400);
        if (ocrTextPreview.length < job.ocr_text.length) {
          ocrTextPreview += '...';
        }
      } else if (job.status === 'completed') {
        ocrTextPreview = '[OCR text available - click to view]';
      }

      return {
        id: job.id?.toString() || '',
        church_id: job.church_id?.toString() || churchId.toString(),
        original_filename: job.original_filename || job.filename || '',
        filename: job.filename || '',
        status: job.status || 'pending', // DB is source of truth
        confidence_score: job.confidence_score || 0,
        error_message: job.error || null,
        created_at: job.created_at || new Date().toISOString(),
        updated_at: job.updated_at || new Date().toISOString(),
        record_type: job.record_type || 'baptism',
        language: job.language || 'en',
        ocr_text_preview: ocrTextPreview,
        has_ocr_text: !!job.ocr_text,
        // Optional: attach bundle metadata if exists (non-canonical)
        has_bundle: false, // Will be populated below if bundle exists
      };
    });

    // Optionally check for bundle existence (non-blocking, metadata only)
    try {
      const bundleChecks = await Promise.all(
        mappedJobs.map(async (job) => {
          const hasBundle = await checkBundleExists(churchId, job.id);
          return { id: job.id, hasBundle };
        })
      );
      const bundleMap = new Map(bundleChecks.map(b => [b.id, b.hasBundle]));
      mappedJobs.forEach(job => {
        job.has_bundle = bundleMap.get(job.id) || false;
      });
    } catch (bundleError) {
      // Non-blocking - bundle check failure doesn't affect response
      console.log('[OCR Jobs GET] Bundle check skipped (non-blocking):', bundleError);
    }

    res.json({ jobs: mappedJobs });
  } catch (error: any) {
    console.error('[OCR Jobs GET] Error:', error);
    // If table doesn't exist, return empty array (200) instead of 500
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('doesn\'t exist')) {
      console.warn('[OCR Jobs GET] ocr_jobs table not found, returning empty array');
      return res.json({ jobs: [] });
    }
    res.status(500).json({ error: 'Failed to fetch OCR jobs', message: error.message, jobs: [] });
  }
});

/**
 * GET /api/church/:churchId/ocr/jobs/:jobId
 * Get job detail - DB ONLY (no bundle merge)
 */
router.get('/jobs/:jobId', async (req: ChurchOcrRequest, res: Response) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId || '0');
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}`);
    const db = await getChurchDb(churchId);

    // Query canonical columns only
    const [rows] = await db.query(`
      SELECT 
        id, filename, original_filename, file_path, status,
        record_type, language, confidence_score, file_size, mime_type, pages,
        ocr_text, ocr_result_json, error, processing_time_ms,
        created_at, updated_at, church_id
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = rows[0] as any;

    // Parse OCR result JSON from DB
    let ocrResult = null;
    if (job.ocr_result_json) {
      try {
        ocrResult = typeof job.ocr_result_json === 'string' 
          ? JSON.parse(job.ocr_result_json) 
          : job.ocr_result_json;
      } catch (e) {
        console.warn(`[OCR Job Detail] Failed to parse ocr_result_json:`, e);
      }
    }

    // Load mapping from DB (if exists)
    let mapping = null;
    try {
      const [mappings] = await db.query(
        'SELECT * FROM ocr_mappings WHERE ocr_job_id = ? ORDER BY updated_at DESC LIMIT 1',
        [jobId]
      );
      if (mappings.length > 0) {
        const m = mappings[0] as any;
        mapping = {
          id: m.id,
          record_type: m.record_type,
          mapping_json: typeof m.mapping_json === 'string' ? JSON.parse(m.mapping_json) : m.mapping_json,
          created_by: m.created_by,
          created_at: m.created_at,
          updated_at: m.updated_at
        };
      }
    } catch (e) {
      // Table may not exist - that's OK
    }

    // Optional: Check if bundle exists (metadata only)
    const hasBundle = await checkBundleExists(churchId, jobId);

    res.json({
      id: job.id.toString(),
      original_filename: job.original_filename || job.filename,
      filename: job.filename,
      file_path: job.file_path,
      status: job.status, // DB is source of truth
      record_type: job.record_type || 'baptism',
      language: job.language || 'en',
      confidence_score: job.confidence_score || 0,
      created_at: job.created_at,
      updated_at: job.updated_at,
      ocr_text: job.ocr_text || null, // DB is source of truth
      ocr_result: ocrResult, // From DB
      error: job.error || null,
      mapping: mapping,
      has_ocr_text: !!job.ocr_text,
      // Optional metadata
      has_bundle: hasBundle,
    });
  } catch (error: any) {
    console.error('[OCR Job Detail] Error:', error);
    res.status(500).json({ error: 'Failed to fetch job detail', message: error.message });
  }
});

/**
 * GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
 * Get fusion drafts - DB ONLY (no bundle read)
 */
router.get('/jobs/:jobId/fusion/drafts', async (req: ChurchOcrRequest, res: Response) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId || '0');
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`);
    const statusFilter = req.query.status as string | undefined;
    const recordTypeFilter = req.query.record_type as string | undefined;

    const db = await getChurchDb(churchId);

    // Query drafts from DB (canonical source)
    let query = `
      SELECT 
        id, ocr_job_id, entry_index, record_type, record_number,
        payload_json, bbox_json, workflow_status, status,
        church_id, committed_record_id, created_at, updated_at
      FROM ocr_fused_drafts
      WHERE ocr_job_id = ? AND church_id = ?
    `;
    const params: any[] = [jobId, churchId];

    if (statusFilter) {
      query += ' AND workflow_status = ?';
      params.push(statusFilter);
    }

    if (recordTypeFilter) {
      query += ' AND record_type = ?';
      params.push(recordTypeFilter);
    }

    query += ' ORDER BY entry_index';

    const [drafts] = await db.query(query, params);

    // Convert to API format
    const normalizedDrafts = (drafts as any[]).map(draft => {
      const payloadJson = typeof draft.payload_json === 'string' 
        ? JSON.parse(draft.payload_json) 
        : (draft.payload_json || {});
      
      const bboxJson = typeof draft.bbox_json === 'string' 
        ? JSON.parse(draft.bbox_json) 
        : (draft.bbox_json || {});

      return {
        id: draft.entry_index,
        ocr_job_id: draft.ocr_job_id,
        entry_index: draft.entry_index,
        record_type: draft.record_type,
        record_number: draft.record_number,
        payload_json: payloadJson,
        bbox_json: {
          entryAreas: bboxJson.entryAreas || [],
          entries: bboxJson.entries || {},
          selections: bboxJson.selections || {},
          entryBbox: bboxJson.entryBbox,
          fieldBboxes: bboxJson.fieldBboxes || {},
        },
        status: draft.workflow_status === 'committed' ? 'committed' : 'draft',
        workflow_status: draft.workflow_status,
        committed_record_id: draft.committed_record_id || null,
        updated_at: draft.updated_at,
      };
    });

    res.json({
      drafts: normalizedDrafts,
      entryAreas: normalizedDrafts[0]?.bbox_json?.entryAreas || [],
      entries: normalizedDrafts[0]?.bbox_json?.entries || {},
      fields: normalizedDrafts[0]?.bbox_json?.entries || {},
      selections: normalizedDrafts[0]?.bbox_json?.selections || {},
    });
  } catch (error: any) {
    console.error('[Fusion Drafts GET] Error:', error);
    res.status(500).json({ error: 'Failed to fetch drafts', message: error.message });
  }
});

/**
 * POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
 * Save/upsert fusion drafts - DB FIRST, then optional bundle write
 */
router.post('/jobs/:jobId/fusion/drafts', async (req: ChurchOcrRequest, res: Response) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId || '0');
    const { entries } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const db = await getChurchDb(churchId);

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
        workflow_status ENUM('draft', 'in_review', 'finalized', 'committed') NOT NULL DEFAULT 'draft',
        status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
        church_id INT NOT NULL,
        committed_record_id BIGINT NULL,
        created_by VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
        INDEX idx_workflow_status (workflow_status),
        INDEX idx_church (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Write to DB FIRST (canonical source)
    const savedDrafts = [];
    for (const entry of entries) {
      const [result] = await db.query(`
        INSERT INTO ocr_fused_drafts 
          (ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, workflow_status, church_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          record_number = VALUES(record_number),
          payload_json = VALUES(payload_json),
          bbox_json = VALUES(bbox_json),
          workflow_status = VALUES(workflow_status),
          updated_at = CURRENT_TIMESTAMP
      `, [
        jobId,
        entry.entry_index,
        entry.record_type,
        entry.record_number || null,
        JSON.stringify(entry.payload_json || {}),
        entry.bbox_json ? JSON.stringify(entry.bbox_json) : null,
        entry.workflow_status || 'draft',
        churchId,
        userEmail,
      ]);

      savedDrafts.push({
        id: entry.entry_index,
        ocr_job_id: jobId,
        entry_index: entry.entry_index,
        record_type: entry.record_type,
        record_number: entry.record_number,
        payload_json: entry.payload_json,
        bbox_json: entry.bbox_json,
        workflow_status: entry.workflow_status || 'draft',
        updated_at: new Date().toISOString(),
      });
    }

    // Optional: Write to bundle as derived artifact (non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../../dist/utils/jobBundle');
        } catch (e2) {
          // Bundle module not available - that's OK
        }
      }

      if (jobBundleModule && jobBundleModule.upsertDraftEntries) {
        await jobBundleModule.upsertDraftEntries(churchId, String(jobId), entries.map(entry => ({
          entry_index: entry.entry_index,
          record_type: entry.record_type,
          record_number: entry.record_number,
          payload_json: entry.payload_json || {},
          bbox_json: entry.bbox_json,
          workflow_status: entry.workflow_status || 'draft',
        })));
        console.log(`[Fusion Drafts POST] Wrote to bundle as artifact (non-canonical) for job ${jobId}`);
      }
    } catch (bundleError: any) {
      // Non-blocking - bundle write failure doesn't affect response
      console.warn(`[Fusion Drafts POST] Bundle write skipped (non-blocking):`, bundleError.message);
    }

    res.json({ success: true, drafts: savedDrafts });
  } catch (error: any) {
    console.error('[Fusion Drafts POST] Error:', error);
    res.status(500).json({ error: 'Failed to save drafts', message: error.message });
  }
});

/**
 * GET /api/church/:churchId/ocr/jobs/:jobId/mapping
 * Get mapping for a job - DB ONLY
 */
router.get('/jobs/:jobId/mapping', async (req: ChurchOcrRequest, res: Response) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId || '0');
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/mapping`);
    const db = await getChurchDb(churchId);

    try {
      const [rows] = await db.query('SELECT * FROM ocr_mappings WHERE ocr_job_id = ? ORDER BY updated_at DESC LIMIT 1', [jobId]);
      
      if (!rows.length) {
        return res.json({ mapping: null });
      }

      const row = rows[0] as any;
      res.json({
        mapping: {
          id: row.id,
          ocr_job_id: row.ocr_job_id,
          record_type: row.record_type,
          mapping_json: typeof row.mapping_json === 'string' ? JSON.parse(row.mapping_json) : row.mapping_json,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
      });
    } catch (e: any) {
      if (e.code === 'ER_NO_SUCH_TABLE') {
        return res.json({ mapping: null });
      }
      throw e;
    }
  } catch (error: any) {
    console.error('[OCR Mapping Get] Error:', error);
    res.status(500).json({ error: 'Failed to get mapping', message: error.message });
  }
});

/**
 * GET /api/church/:churchId/ocr/jobs/:jobId/image
 * Serve job image file - DB path only
 */
router.get('/jobs/:jobId/image', async (req: ChurchOcrRequest, res: Response) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId || '0');
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/image`);
    const db = await getChurchDb(churchId);

    const [rows] = await db.query('SELECT file_path, mime_type FROM ocr_jobs WHERE id = ?', [jobId]);
    
    if (!rows.length || !rows[0].file_path) {
      return res.status(404).json({ error: 'Job or image not found' });
    }

    const dbFilePath = (rows[0] as any).file_path;
    const mimeType = (rows[0] as any).mime_type || 'image/jpeg';
    const filename = path.basename(dbFilePath);

    const fsSync = require('fs');
    const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
    const serverRoot = path.resolve(__dirname, '..').replace('/dist', '');
    const possiblePaths = [
      dbFilePath, // Try DB path first
      path.join(baseUploadPath, `om_church_${churchId}`, 'processed', filename),
      path.join(baseUploadPath, `om_church_${churchId}`, 'uploaded', filename),
      path.join(baseUploadPath, 'ocr', `church_${churchId}`, filename),
      path.join(serverRoot, 'uploads', `om_church_${churchId}`, 'processed', filename),
      path.join(serverRoot, 'uploads', `om_church_${churchId}`, 'uploaded', filename),
      path.join(__dirname, '..', 'uploads', `om_church_${churchId}`, 'processed', filename),
    ];
    
    let foundPath: string | null = null;
    for (const p of possiblePaths) {
      if (fsSync.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    
    if (!foundPath) {
      console.warn(`[OCR Image] File not found in any location. DB path: ${dbFilePath}, tried:`, possiblePaths.slice(0, 3));
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fsSync.createReadStream(foundPath).pipe(res);
  } catch (error: any) {
    console.error('[OCR Image] Error:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Debug helper to list registered routes
function listRoutes(r: any): string[] {
  try {
    return (r?.stack || [])
      .filter((l: any) => l?.route?.path)
      .map((l: any) => `${Object.keys(l.route.methods).join(',').toUpperCase()} ${l.route.path}`);
  } catch {
    return [];
  }
}

// Attach route list to router for debugging
(router as any).__om_routes = listRoutes(router);

// Export router (compatible with both ES modules and CommonJS)
// TypeScript compiles: export default router → exports.default = router
// IMPORTANT: Do NOT use module.exports here - it creates circular dependency issues
// The fix-router-exports.js script will add module.exports after compilation
export default router;
