/**
 * OCR Admin Monitor Controller — Super Admin OCR Operations Console
 *
 * Provides super_admin endpoints for global OCR job monitoring & ops across all churches.
 *
 * All ocr_jobs queries now hit the PLATFORM DB (orthodoxmetrics_db.ocr_jobs)
 * which serves as the global queue. No per-tenant schema iteration needed.
 *
 * Endpoints:
 *   GET  /api/admin/ocr/jobs                           — List jobs + summary + churches dropdown
 *   GET  /api/admin/ocr/jobs/:churchId/:jobId          — Full job detail with file existence check
 *   POST /api/admin/ocr/jobs/:churchId/:jobId/kill     — Kill a processing/queued job
 *   POST /api/admin/ocr/jobs/:churchId/:jobId/reprocess — Re-queue a failed/killed job
 *   POST /api/admin/ocr/jobs/:churchId/:jobId/clear    — Archive a failed/killed job
 *   POST /api/admin/ocr/jobs/bulk                      — Bulk action (kill/reprocess/clear)
 *   POST /api/admin/ocr/jobs/cleanup-stale             — Mark stale processing jobs as failed
 *
 * DB tables touched:
 *   orthodoxmetrics_db.churches (read: id, name, database_name)
 *   orthodoxmetrics_db.ocr_jobs (read/write — global queue)
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPool() {
  const { promisePool } = require('../config/db');
  return promisePool;
}

// Build a safe SELECT column list — only columns that exist in orthodoxmetrics_db.ocr_jobs
// Actual schema: id, church_id, filename, status, record_type, language,
//   confidence_score, error_regions, ocr_result, ocr_text, created_at
const JOB_COLUMNS = `
  j.id, j.church_id, j.status, j.record_type, j.language,
  j.filename, j.confidence_score, j.error_regions,
  j.ocr_text, j.ocr_result, j.created_at, j.source_pipeline,
  c.name AS church_name
`;

// Resolve a job's filename to an absolute filesystem path
const UPLOADS_ROOT = '/var/www/orthodoxmetrics/prod/uploads';
function resolveJobFilePath(filename, churchId) {
  if (!filename) return null;
  let filePath;
  if (filename.startsWith('/uploads/')) {
    filePath = path.join('/var/www/orthodoxmetrics/prod', filename);
  } else {
    filePath = path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'uploaded', filename);
  }
  if (filePath.includes('/server/')) {
    console.error(`[OCR Monitor] FATAL: resolved path contains /server/: ${filePath}`);
    return null;
  }
  return filePath;
}

// ── GET /api/admin/ocr/jobs ──────────────────────────────────────────────────

async function listAllJobs(req, res) {
  try {
    const pool = getPool();

    const status = req.query.status || '';
    const churchIdFilter = req.query.church_id ? parseInt(req.query.church_id) : null;
    const q = (req.query.q || '').trim();
    const fromDate = req.query.from || '';
    const toDate = req.query.to || '';
    const staleOnly = req.query.stale === '1';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(10, parseInt(req.query.pageSize) || 50));
    const sortField = req.query.sort || 'created_at';
    const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
    const hideArchived = req.query.hideArchived !== '0'; // default true

    // Churches dropdown (always full list)
    const [allChurches] = await pool.query(
      'SELECT id, name FROM churches WHERE database_name IS NOT NULL ORDER BY name ASC'
    );

    // Build WHERE
    const where = ['1=1'];
    const params = [];

    if (churchIdFilter) {
      where.push('j.church_id = ?');
      params.push(churchIdFilter);
    }
    // archived_at column does not exist — skip filter
    if (status) {
      where.push('j.status = ?');
      params.push(status);
    }
    if (q) {
      where.push('(j.filename LIKE ? OR CAST(j.id AS CHAR) = ? OR j.error_regions LIKE ?)');
      params.push(`%${q}%`, q, `%${q}%`);
    }
    if (fromDate) {
      where.push('j.created_at >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('j.created_at <= ?');
      params.push(toDate);
    }
    if (staleOnly) {
      where.push("j.status = 'processing'");
    }

    // Validate sort column
    const safeSortCols = ['created_at', 'status', 'church_name', 'id'];
    const sortCol = safeSortCols.includes(sortField) ? sortField : 'created_at';
    const sortPrefix = sortCol === 'church_name' ? 'c.name' : `j.${sortCol}`;

    // Count query for summary
    const [countRows] = await pool.query(`
      SELECT
        SUM(j.status IN ('queued','pending')) AS queued,
        SUM(j.status = 'processing') AS processing,
        SUM(j.status IN ('completed','complete')) AS completed,
        SUM(j.status IN ('failed','error')) AS failed,
        SUM(j.status = 'processing') AS stale
      FROM ocr_jobs j
      WHERE ${where.join(' AND ')}
    `, params);
    const counts = {
      queued: Number(countRows[0]?.queued) || 0,
      processing: Number(countRows[0]?.processing) || 0,
      completed: Number(countRows[0]?.completed) || 0,
      failed: Number(countRows[0]?.failed) || 0,
      stale: Number(countRows[0]?.stale) || 0,
    };

    // Total for pagination
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM ocr_jobs j WHERE ${where.join(' AND ')}`, params
    );
    const total = Number(totalRows[0]?.total) || 0;

    // Paged data with JOIN to churches
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(`
      SELECT ${JOB_COLUMNS}
      FROM ocr_jobs j
      LEFT JOIN churches c ON c.id = j.church_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortPrefix} ${sortDir}
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    res.json({ rows, total, page, pageSize, counts, churches: allChurches });
  } catch (error) {
    console.error('[OCR Monitor] listAllJobs error:', error);
    res.status(500).json({ error: 'Failed to fetch OCR jobs', message: error.message });
  }
}

// ── GET /api/admin/ocr/jobs/:churchId/:jobId ─────────────────────────────────

async function getJobDetail(req, res) {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId are required' });

    const pool = getPool();

    const [rows] = await pool.query(`
      SELECT ${JOB_COLUMNS}
      FROM ocr_jobs j
      LEFT JOIN churches c ON c.id = j.church_id
      WHERE j.id = ? AND j.church_id = ?
    `, [jobId, churchId]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = rows[0];

    // File existence check — resolve from filename + churchId
    let fileExists = false;
    let fileSize = null;
    const resolvedPath = resolveJobFilePath(job.filename, churchId);
    if (resolvedPath) {
      try {
        const stat = fs.statSync(resolvedPath);
        fileExists = stat.isFile();
        fileSize = stat.size;
      } catch (_) { /* not found */ }
    }
    job.file_exists = fileExists;
    job.file_size_disk = fileSize;
    job.resolved_file_path = resolvedPath;

    res.json({ job });
  } catch (error) {
    console.error('[OCR Monitor] getJobDetail error:', error);
    res.status(500).json({ error: 'Failed to fetch job detail', message: error.message });
  }
}

// ── POST /api/admin/ocr/jobs/:churchId/:jobId/kill ───────────────────────────

async function killJob(req, res) {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const reason = (req.body.reason || '').trim() || 'Killed by admin';
    const killedBy = req.session?.user?.id || 0;
    if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId are required' });

    const pool = getPool();

    const [jobs] = await pool.query('SELECT id, status FROM ocr_jobs WHERE id = ? AND church_id = ?', [jobId, churchId]);
    if (!jobs.length) return res.status(404).json({ error: 'Job not found' });
    if (jobs[0].status === 'completed' || jobs[0].status === 'complete') {
      return res.status(400).json({ error: 'Cannot kill a completed job' });
    }

    await pool.query(`
      UPDATE ocr_jobs SET
        status = 'error', error_regions = ?
      WHERE id = ?
    `, [`Killed: ${reason}`, jobId]);

    console.log(`[OCR Monitor] Job ${churchId}/${jobId} killed by user ${killedBy}: ${reason}`);
    res.json({ success: true, message: `Killed job ${churchId}/${jobId}` });
  } catch (error) {
    console.error('[OCR Monitor] killJob error:', error);
    res.status(500).json({ error: 'Failed to kill job', message: error.message });
  }
}

// ── POST /api/admin/ocr/jobs/:churchId/:jobId/reprocess ──────────────────────

async function reprocessJob(req, res) {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId are required' });

    const pool = getPool();

    const [jobs] = await pool.query('SELECT id, status FROM ocr_jobs WHERE id = ? AND church_id = ?', [jobId, churchId]);
    if (!jobs.length) return res.status(404).json({ error: 'Job not found' });

    const allowedStatuses = ['failed', 'error', 'queued', 'pending'];
    if (!allowedStatuses.includes(jobs[0].status)) {
      return res.status(400).json({ error: `Cannot reprocess job with status '${jobs[0].status}'. Allowed: ${allowedStatuses.join(', ')}` });
    }

    await pool.query(`
      UPDATE ocr_jobs SET
        status = 'pending',
        error_regions = NULL,
        ocr_text = NULL, ocr_result = NULL, confidence_score = NULL
      WHERE id = ?
    `, [jobId]);

    console.log(`[OCR Monitor] Job ${churchId}/${jobId} re-queued for processing (status=pending)`);
    res.json({ success: true, message: `Job ${churchId}/${jobId} re-queued` });
  } catch (error) {
    console.error('[OCR Monitor] reprocessJob error:', error);
    res.status(500).json({ error: 'Failed to reprocess job', message: error.message });
  }
}

// ── POST /api/admin/ocr/jobs/:churchId/:jobId/clear ──────────────────────────

async function clearJob(req, res) {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const reason = (req.body.reason || '').trim() || 'Archived by admin';
    const archivedBy = req.session?.user?.id || 0;
    if (!churchId || !jobId) return res.status(400).json({ error: 'churchId and jobId are required' });

    const pool = getPool();

    const [jobs] = await pool.query('SELECT id, status FROM ocr_jobs WHERE id = ? AND church_id = ?', [jobId, churchId]);
    if (!jobs.length) return res.status(404).json({ error: 'Job not found' });

    const archivable = ['failed', 'error'];
    if (!archivable.includes(jobs[0].status)) {
      return res.status(400).json({ error: `Cannot archive job with status '${jobs[0].status}'. Allowed: ${archivable.join(', ')}` });
    }

    // No archived_at column — just delete the job
    await pool.query(`DELETE FROM ocr_jobs WHERE id = ?`, [jobId]);

    console.log(`[OCR Monitor] Job ${churchId}/${jobId} archived by user ${archivedBy}: ${reason}`);
    res.json({ success: true, message: `Job ${churchId}/${jobId} archived` });
  } catch (error) {
    console.error('[OCR Monitor] clearJob error:', error);
    res.status(500).json({ error: 'Failed to archive job', message: error.message });
  }
}

// ── POST /api/admin/ocr/jobs/bulk ────────────────────────────────────────────

async function bulkAction(req, res) {
  try {
    const action = req.body.action; // 'kill' | 'reprocess' | 'clear'
    const items = req.body.items;   // [{ churchId, jobId }]
    const reason = (req.body.reason || '').trim() || `Bulk ${action} by admin`;
    const userId = req.session?.user?.id || 0;

    if (!['kill', 'reprocess', 'clear'].includes(action)) {
      return res.status(400).json({ error: `Invalid action '${action}'. Allowed: kill, reprocess, clear` });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const pool = getPool();
    const jobIds = items.map(i => parseInt(i.jobId)).filter(Boolean);
    if (jobIds.length === 0) return res.status(400).json({ error: 'No valid jobIds' });

    const placeholders = jobIds.map(() => '?').join(',');
    let sql, params;

    if (action === 'kill') {
      sql = `UPDATE ocr_jobs SET status='error', error_regions=?
             WHERE id IN (${placeholders}) AND status NOT IN ('complete')`;
      params = [`Killed: ${reason}`, ...jobIds];
    } else if (action === 'reprocess') {
      sql = `UPDATE ocr_jobs SET status='pending', error_regions=NULL,
             ocr_text=NULL, ocr_result=NULL, confidence_score=NULL
             WHERE id IN (${placeholders}) AND status IN ('error','pending')`;
      params = [...jobIds];
    } else { // clear — delete
      sql = `DELETE FROM ocr_jobs WHERE id IN (${placeholders}) AND status IN ('error')`;
      params = [...jobIds];
    }

    const [result] = await pool.query(sql, params);
    const totalAffected = result.affectedRows || 0;

    console.log(`[OCR Monitor] Bulk ${action}: ${totalAffected} jobs affected by user ${userId}`);
    res.json({ success: true, action, totalAffected, results: [{ affected: totalAffected }] });
  } catch (error) {
    console.error('[OCR Monitor] bulkAction error:', error);
    res.status(500).json({ error: 'Bulk action failed', message: error.message });
  }
}

// ── POST /api/admin/ocr/jobs/cleanup-stale ───────────────────────────────────

async function cleanupStale(req, res) {
  try {
    const maxAgeSeconds = Math.max(30, parseInt(req.body.maxAgeSeconds) || 90);
    const killedBy = req.session?.user?.id || 0;
    const result = await runStaleCleanup(maxAgeSeconds, killedBy);
    res.json({ success: true, cleaned: result.totalCleaned, maxAgeSeconds });
  } catch (error) {
    console.error('[OCR Monitor] cleanupStale error:', error);
    res.status(500).json({ error: 'Failed to cleanup stale jobs', message: error.message });
  }
}

// ── POST /api/admin/ocr/jobs/clear-processed ─────────────────────────────────

async function clearProcessed(req, res) {
  try {
    const churchId = req.body.churchId ? parseInt(req.body.churchId) : null;
    const deleteFiles = req.body.deleteFiles === true;
    const jobIds = Array.isArray(req.body.jobIds) ? req.body.jobIds.map(Number).filter(Boolean) : null;
    const userId = req.session?.user?.id || 0;

    const pool = getPool();

    // Build query to find completed jobs
    const where = ["j.status IN ('completed','complete')"];
    const params = [];

    if (jobIds && jobIds.length > 0) {
      const placeholders = jobIds.map(() => '?').join(',');
      where.push(`j.id IN (${placeholders})`);
      params.push(...jobIds);
    }
    if (churchId) {
      where.push('j.church_id = ?');
      params.push(churchId);
    }

    // Fetch matching rows (cap at 500 to avoid long-running ops)
    const [rows] = await pool.query(
      `SELECT j.id, j.church_id, j.filename FROM ocr_jobs j WHERE ${where.join(' AND ')} LIMIT 500`,
      params
    );

    if (rows.length === 0) {
      return res.json({ success: true, deleted: 0, filesRemoved: 0, capped: false });
    }

    // Optionally delete uploaded files from disk
    let filesRemoved = 0;
    if (deleteFiles) {
      for (const row of rows) {
        const filePath = resolveJobFilePath(row.filename, row.church_id);
        if (filePath) {
          try {
            fs.unlinkSync(filePath);
            filesRemoved++;
          } catch (_) { /* file already gone or inaccessible */ }
        }
      }
    }

    // Delete the job rows
    const ids = rows.map(r => r.id);
    const delPlaceholders = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM ocr_jobs WHERE id IN (${delPlaceholders})`, ids);

    const capped = rows.length === 500;
    console.log(`[OCR Monitor] clearProcessed: ${rows.length} jobs deleted (${filesRemoved} files removed) by user ${userId}${capped ? ' — capped, more remain' : ''}`);
    res.json({ success: true, deleted: rows.length, filesRemoved, capped });
  } catch (error) {
    console.error('[OCR Monitor] clearProcessed error:', error);
    res.status(500).json({ error: 'Failed to clear processed jobs', message: error.message });
  }
}

// ── Stale cleanup logic ──────────────────────────────────────────────────────

let _cleanupRunning = false;
async function runStaleCleanup(maxAgeSeconds = 90, killedBy = 0) {
  if (_cleanupRunning) return { totalCleaned: 0, skipped: true };
  _cleanupRunning = true;
  try {
    const pool = getPool();

    // Use processing_started_at for stale detection, fall back to created_at for legacy jobs
    const [result] = await pool.query(`
      UPDATE ocr_jobs SET
        status = 'error',
        error_regions = CONCAT('Timed out (stale cleanup after ', ?, 's)')
      WHERE status = 'processing'
        AND COALESCE(processing_started_at, created_at) <= DATE_SUB(NOW(), INTERVAL ? SECOND)
    `, [maxAgeSeconds, maxAgeSeconds]);

    const totalCleaned = result.affectedRows || 0;
    if (totalCleaned > 0) console.log(`[OCR Monitor] Stale cleanup: ${totalCleaned} jobs`);
    return { totalCleaned };
  } finally {
    _cleanupRunning = false;
  }
}

// ── Sweeper ──────────────────────────────────────────────────────────────────

let _sweeperInterval = null;
function startStaleSweeper(intervalMs = 30000, maxAgeSeconds = 90) {
  if (_sweeperInterval) { console.log('[OCR Monitor] Sweeper already running'); return; }
  console.log(`[OCR Monitor] Starting stale sweeper (${intervalMs / 1000}s interval, ${maxAgeSeconds}s timeout)`);
  _sweeperInterval = setInterval(async () => {
    try {
      const r = await runStaleCleanup(maxAgeSeconds, 0);
      if (r.totalCleaned > 0) console.log(`[OCR Monitor Sweeper] Cleaned ${r.totalCleaned} stale jobs`);
    } catch (e) { console.error('[OCR Monitor Sweeper] Error:', e.message); }
  }, intervalMs);
  if (_sweeperInterval.unref) _sweeperInterval.unref();
}

function stopStaleSweeper() {
  if (_sweeperInterval) { clearInterval(_sweeperInterval); _sweeperInterval = null; console.log('[OCR Monitor] Sweeper stopped'); }
}

module.exports = {
  listAllJobs,
  getJobDetail,
  killJob,
  reprocessJob,
  clearJob,
  clearProcessed,
  bulkAction,
  cleanupStale,
  runStaleCleanup,
  startStaleSweeper,
  stopStaleSweeper,
};
