/**
 * OCR Table Extractor Controller — Super Admin endpoints
 *
 * Provides artifact storage, table extraction replay, and structured
 * result retrieval for the Marriage Ledger v1 layout.
 *
 * Endpoints:
 *   GET  /api/admin/ocr/table-jobs              — List jobs with table extraction status
 *   GET  /api/admin/ocr/table-jobs/:jobId        — Get table extraction result
 *   POST /api/admin/ocr/table-jobs/:jobId/extract — Run/rerun table extraction from stored Vision JSON
 *   GET  /api/admin/ocr/table-jobs/:jobId/artifacts/:filename — Download artifact file
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { dbLogger } = require('../utils/dbLogger');

const ARTIFACTS_BASE = '/var/www/orthodoxmetrics/prod/server/var/ocr_artifacts';

function getPool() {
  const { promisePool } = require('../config/db');
  return promisePool;
}

function getArtifactDir(jobId) {
  return path.join(ARTIFACTS_BASE, String(jobId));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Save artifacts for a job ─────────────────────────────────────────────────

function saveArtifact(jobId, filename, data) {
  const dir = getArtifactDir(jobId);
  ensureDir(dir);
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

function loadArtifact(jobId, filename) {
  const filePath = path.join(getArtifactDir(jobId), filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

// ── GET /api/admin/ocr/table-jobs ────────────────────────────────────────────

async function listTableJobs(req, res) {
  try {
    const pool = getPool();
    const churchIdFilter = req.query.church_id ? parseInt(req.query.church_id) : null;
    const status = req.query.status || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize) || 25));

    const recordTypeFilter = req.query.record_type || '';

    const where = ["j.status IN ('completed','complete')"];
    const params = [];

    if (churchIdFilter) {
      where.push('j.church_id = ?');
      params.push(churchIdFilter);
    }

    if (recordTypeFilter) {
      where.push('j.record_type = ?');
      params.push(recordTypeFilter);
    }

    // Count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM ocr_jobs j WHERE ${where.join(' AND ')}`,
      params
    );
    const total = Number(countRows[0]?.total) || 0;

    // Paged data
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(`
      SELECT j.id, j.church_id, j.filename, j.status, j.record_type,
             j.language, j.confidence_score, j.created_at, j.source_pipeline,
             c.name AS church_name
      FROM ocr_jobs j
      LEFT JOIN churches c ON c.id = j.church_id
      WHERE ${where.join(' AND ')}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    // Check which jobs have table extraction artifacts
    for (const row of rows) {
      const extractionPath = path.join(getArtifactDir(row.id), 'table_extraction.json');
      row.has_table_extraction = fs.existsSync(extractionPath);
    }

    // Churches dropdown
    const [churches] = await pool.query(
      'SELECT id, name FROM churches WHERE database_name IS NOT NULL ORDER BY name ASC'
    );

    res.json({ rows, total, page, pageSize, churches });
  } catch (error) {
    console.error('[TableExtractor] listTableJobs error:', error);
    res.status(500).json({ error: 'Failed to list table jobs', message: error.message });
  }
}

// ── GET /api/admin/ocr/table-jobs/:jobId ─────────────────────────────────────

async function getTableResult(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    if (!jobId) return res.status(400).json({ error: 'jobId required' });

    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT j.id, j.church_id, j.filename, j.status, j.record_type,
             j.language, j.confidence_score, j.created_at, j.source_pipeline,
             c.name AS church_name
      FROM ocr_jobs j
      LEFT JOIN churches c ON c.id = j.church_id
      WHERE j.id = ?
    `, [jobId]);

    if (!rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = rows[0];

    // Load table extraction artifact
    const extractionRaw = loadArtifact(jobId, 'table_extraction.json');
    job.table_extraction = extractionRaw ? JSON.parse(extractionRaw) : null;

    // List available artifacts
    const artifactDir = getArtifactDir(jobId);
    job.artifacts = [];
    if (fs.existsSync(artifactDir)) {
      job.artifacts = fs.readdirSync(artifactDir).filter(f => !f.startsWith('.'));
    }

    res.json({ job });
  } catch (error) {
    console.error('[TableExtractor] getTableResult error:', error);
    res.status(500).json({ error: 'Failed to get table result', message: error.message });
  }
}

// ── POST /api/admin/ocr/table-jobs/:jobId/extract ────────────────────────────

async function runExtraction(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    if (!jobId) return res.status(400).json({ error: 'jobId required' });

    const pool = getPool();

    // Fetch job + its Vision JSON
    const [rows] = await pool.query(`
      SELECT j.id, j.church_id, j.filename, j.record_type, j.language,
             j.ocr_result, j.confidence_score, j.source_pipeline,
             c.name AS church_name
      FROM ocr_jobs j
      LEFT JOIN churches c ON c.id = j.church_id
      WHERE j.id = ?
    `, [jobId]);

    if (!rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = rows[0];
    let visionJsonStr = job.ocr_result;

    // Fallback: if DB column is empty, try feeder pipeline's disk file
    if (!visionJsonStr) {
      const feederPath = path.join(
        '/var/www/orthodoxmetrics/prod/server/storage/feeder',
        `job_${jobId}`, 'page_0', 'vision_result.json'
      );
      if (fs.existsSync(feederPath)) {
        try {
          visionJsonStr = fs.readFileSync(feederPath, 'utf8');
          console.log(`[TableExtractor] Job ${jobId}: Loaded Vision JSON from feeder disk (${visionJsonStr.length} bytes)`);
        } catch (readErr) {
          console.warn(`[TableExtractor] Job ${jobId}: Failed to read feeder Vision file:`, readErr.message);
        }
      }
    }

    if (!visionJsonStr) {
      return res.status(400).json({ error: 'No OCR result JSON stored for this job. Re-upload required.' });
    }

    let visionJson;
    try {
      visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;
    } catch (parseErr) {
      return res.status(400).json({ error: 'Stored OCR JSON is malformed', message: parseErr.message });
    }

    // Save raw provider response artifact (if not already saved)
    const rawPath = path.join(getArtifactDir(jobId), 'raw_provider_response.json');
    if (!fs.existsSync(rawPath)) {
      saveArtifact(jobId, 'raw_provider_response.json', visionJson);
    }

    // Save request config artifact
    saveArtifact(jobId, 'provider_request_config.json', {
      job_id: jobId,
      church_id: job.church_id,
      church_name: job.church_name,
      record_type: job.record_type,
      language: job.language,
      filename: job.filename,
      extracted_at: new Date().toISOString(),
    });

    // Run the marriage ledger table extractor
    const { extractMarriageLedgerTable } = require('../ocr/layouts/marriage_ledger_v1');
    const tableResult = extractMarriageLedgerTable(visionJson, {
      pageIndex: 0,
      headerY: req.body.headerY || undefined,
    });

    // Save table extraction artifact
    saveArtifact(jobId, 'table_extraction.json', tableResult);

    const tableCount = tableResult.tables ? tableResult.tables.length : 0;
    console.log(`[TableExtractor] Job ${jobId}: extracted ${tableCount} tables, ${tableResult.data_rows} data rows, ${tableResult.data_tokens} data tokens`);
    dbLogger.info('OCR:TableExtract', `Job ${jobId}: ${tableCount} tables, ${tableResult.data_rows} rows extracted`, {
      jobId, tableCount, dataRows: tableResult.data_rows, dataTokens: tableResult.data_tokens
    }, null, 'ocr-table-extractor');

    res.json({
      success: true,
      job_id: jobId,
      tables_extracted: tableCount,
      data_rows: tableResult.data_rows,
      table_extraction: tableResult,
    });
  } catch (error) {
    console.error('[TableExtractor] runExtraction error:', error);
    dbLogger.error('OCR:TableExtract', `Job ${req.params.jobId} extraction failed: ${error.message}`, {
      jobId: req.params.jobId, error: error.message
    }, null, 'ocr-table-extractor');
    res.status(500).json({ error: 'Table extraction failed', message: error.message });
  }
}

// ── GET /api/admin/ocr/table-jobs/:jobId/artifacts/:filename ─────────────────

async function downloadArtifact(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    const filename = req.params.filename;

    if (!jobId || !filename) return res.status(400).json({ error: 'jobId and filename required' });

    // Security: only allow known file patterns
    if (!/^[\w\-\.]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(getArtifactDir(jobId), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('[TableExtractor] downloadArtifact error:', error);
    res.status(500).json({ error: 'Failed to download artifact', message: error.message });
  }
}

module.exports = {
  listTableJobs,
  getTableResult,
  runExtraction,
  downloadArtifact,
  saveArtifact,
  loadArtifact,
};
