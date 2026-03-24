/**
 * OCR Usage & Monitoring Controller
 * Handles Vision API usage tracking, dead letter queue, storage usage, and quota monitoring.
 * Addresses OM Daily items: #5, #21, #23, #73, #106, #125, #157
 */
const { getAppPool } = require('../config/db');

// #5 + #157: Get Vision API usage stats (per-church or aggregate)
async function getApiUsage(req, res) {
  try {
    const pool = getAppPool();
    const { church_id, days = 30, provider } = req.query;

    let where = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    const params = [parseInt(days)];

    if (church_id) {
      where += ' AND church_id = ?';
      params.push(parseInt(church_id));
    }
    if (provider) {
      where += ' AND api_provider = ?';
      params.push(provider);
    }

    const [rows] = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        church_id,
        api_provider,
        COUNT(*) AS api_calls,
        SUM(page_count) AS total_pages,
        ROUND(SUM(estimated_cost_usd), 4) AS total_cost_usd,
        ROUND(AVG(response_ms)) AS avg_response_ms,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed_calls
      FROM ocr_api_usage
      ${where}
      GROUP BY DATE(created_at), church_id, api_provider
      ORDER BY date DESC
    `, params);

    // Summary totals
    const [summary] = await pool.query(`
      SELECT
        COUNT(*) AS total_calls,
        COALESCE(SUM(page_count), 0) AS total_pages,
        ROUND(COALESCE(SUM(estimated_cost_usd), 0), 4) AS total_cost_usd,
        ROUND(AVG(response_ms)) AS avg_response_ms,
        COUNT(DISTINCT church_id) AS churches_using
      FROM ocr_api_usage
      ${where}
    `, params);

    res.json({ success: true, usage: rows, summary: summary[0] });
  } catch (error) {
    console.error('[OCR Usage] getApiUsage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #73: Per-church OCR usage statistics
async function getChurchUsageStats(req, res) {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT
        oj.church_id,
        c.name AS church_name,
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN oj.status IN ('complete','completed') THEN 1 ELSE 0 END) AS successful_jobs,
        SUM(CASE WHEN oj.status IN ('error','failed') THEN 1 ELSE 0 END) AS failed_jobs,
        ROUND(AVG(oj.confidence_score), 2) AS avg_confidence,
        ROUND(AVG(oj.total_ms)) AS avg_processing_ms,
        MAX(oj.created_at) AS last_job_at,
        COALESCE(SUM(au.estimated_cost_usd), 0) AS total_api_cost_usd,
        COALESCE(SUM(au.page_count), 0) AS total_api_pages
      FROM ocr_jobs oj
      LEFT JOIN churches c ON c.id = oj.church_id
      LEFT JOIN ocr_api_usage au ON au.church_id = oj.church_id
      GROUP BY oj.church_id, c.name
      ORDER BY total_jobs DESC
    `);

    res.json({ success: true, stats: rows });
  } catch (error) {
    console.error('[OCR Usage] getChurchUsageStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #23 + #106: Dead letter queue management
async function getDeadLetterQueue(req, res) {
  try {
    const pool = getAppPool();
    const { church_id, error_category, limit = 50 } = req.query;

    let where = 'WHERE dead_letter = 1';
    const params = [];

    if (church_id) {
      where += ' AND church_id = ?';
      params.push(parseInt(church_id));
    }
    if (error_category) {
      where += ' AND error_category = ?';
      params.push(error_category);
    }

    params.push(parseInt(limit));

    const [rows] = await pool.query(`
      SELECT id, church_id, filename, status, error_category, last_error,
        retry_count, max_retries, created_at, completed_at
      FROM ocr_jobs
      ${where}
      ORDER BY completed_at DESC
      LIMIT ?
    `, params);

    // Error category breakdown
    const [categories] = await pool.query(`
      SELECT error_category, COUNT(*) AS count
      FROM ocr_jobs WHERE dead_letter = 1
      GROUP BY error_category ORDER BY count DESC
    `);

    res.json({ success: true, items: rows, categories, total: rows.length });
  } catch (error) {
    console.error('[OCR Usage] getDeadLetterQueue error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #23: Retry a dead-letter job
async function retryDeadLetterJob(req, res) {
  try {
    const pool = getAppPool();
    const { jobId } = req.params;

    const [result] = await pool.query(`
      UPDATE ocr_jobs
      SET dead_letter = 0, status = 'pending', retry_count = 0, last_error = NULL, error_category = NULL
      WHERE id = ? AND dead_letter = 1
    `, [jobId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Job not found in dead letter queue' });
    }

    res.json({ success: true, message: `Job ${jobId} moved back to pending queue` });
  } catch (error) {
    console.error('[OCR Usage] retryDeadLetterJob error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #23: Purge dead-letter jobs older than N days
async function purgeDeadLetterQueue(req, res) {
  try {
    const pool = getAppPool();
    const { days = 30 } = req.body;

    const [result] = await pool.query(`
      DELETE FROM ocr_jobs
      WHERE dead_letter = 1 AND completed_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(days)]);

    res.json({ success: true, purged: result.affectedRows });
  } catch (error) {
    console.error('[OCR Usage] purgeDeadLetterQueue error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #125: Storage usage tracking
async function getStorageUsage(req, res) {
  try {
    const pool = getAppPool();
    const { church_id } = req.query;

    let where = '';
    const params = [];
    if (church_id) {
      where = 'WHERE church_id = ?';
      params.push(parseInt(church_id));
    }

    const [rows] = await pool.query(`
      SELECT church_id, category,
        file_count, total_bytes,
        ROUND(total_bytes / 1048576, 2) AS total_mb,
        measured_at
      FROM storage_usage
      ${where}
      ORDER BY church_id, category
    `, params);

    // Aggregate totals
    const [totals] = await pool.query(`
      SELECT
        COALESCE(SUM(total_bytes), 0) AS total_bytes,
        ROUND(COALESCE(SUM(total_bytes), 0) / 1073741824, 2) AS total_gb,
        COALESCE(SUM(file_count), 0) AS total_files,
        COUNT(DISTINCT church_id) AS churches
      FROM storage_usage ${where}
    `, params);

    res.json({ success: true, usage: rows, totals: totals[0] });
  } catch (error) {
    console.error('[OCR Usage] getStorageUsage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #21: Pipeline timing metrics
async function getPipelineMetrics(req, res) {
  try {
    const pool = getAppPool();
    const { days = 7, church_id } = req.query;

    let where = 'WHERE total_ms IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    const params = [parseInt(days)];

    if (church_id) {
      where += ' AND church_id = ?';
      params.push(parseInt(church_id));
    }

    const [rows] = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS jobs,
        ROUND(AVG(preprocess_ms)) AS avg_preprocess_ms,
        ROUND(AVG(ocr_ms)) AS avg_ocr_ms,
        ROUND(AVG(parse_ms)) AS avg_parse_ms,
        ROUND(AVG(total_ms)) AS avg_total_ms,
        MAX(total_ms) AS max_total_ms,
        MIN(total_ms) AS min_total_ms
      FROM ocr_jobs
      ${where}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, params);

    res.json({ success: true, metrics: rows });
  } catch (error) {
    console.error('[OCR Usage] getPipelineMetrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #157: Vision API quota status
async function getQuotaStatus(req, res) {
  try {
    const pool = getAppPool();

    // Today's usage
    const [today] = await pool.query(`
      SELECT
        COUNT(*) AS calls_today,
        COALESCE(SUM(page_count), 0) AS pages_today,
        ROUND(COALESCE(SUM(estimated_cost_usd), 0), 4) AS cost_today
      FROM ocr_api_usage
      WHERE DATE(created_at) = CURDATE()
    `);

    // This month's usage
    const [month] = await pool.query(`
      SELECT
        COUNT(*) AS calls_month,
        COALESCE(SUM(page_count), 0) AS pages_month,
        ROUND(COALESCE(SUM(estimated_cost_usd), 0), 4) AS cost_month
      FROM ocr_api_usage
      WHERE YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())
    `);

    // Google Vision free tier: 1000 units/month, then $1.50 per 1000 for TEXT_DETECTION
    const MONTHLY_FREE_TIER = 1000;
    const COST_PER_1000 = 1.50;
    const pagesThisMonth = month[0].pages_month;
    const quotaUsedPercent = Math.round((pagesThisMonth / MONTHLY_FREE_TIER) * 100);

    res.json({
      success: true,
      today: today[0],
      month: month[0],
      quota: {
        free_tier_pages: MONTHLY_FREE_TIER,
        used_pages: pagesThisMonth,
        used_percent: quotaUsedPercent,
        over_quota: pagesThisMonth > MONTHLY_FREE_TIER,
        estimated_overage_cost: pagesThisMonth > MONTHLY_FREE_TIER
          ? ((pagesThisMonth - MONTHLY_FREE_TIER) / 1000 * COST_PER_1000).toFixed(4)
          : '0.0000',
      }
    });
  } catch (error) {
    console.error('[OCR Usage] getQuotaStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #106: Error categorization summary
async function getErrorCategories(req, res) {
  try {
    const pool = getAppPool();
    const { days = 30 } = req.query;

    const [rows] = await pool.query(`
      SELECT
        error_category,
        COUNT(*) AS count,
        ROUND(AVG(retry_count), 1) AS avg_retries,
        MAX(created_at) AS last_occurrence
      FROM ocr_jobs
      WHERE status IN ('error', 'failed') AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_category
      ORDER BY count DESC
    `, [parseInt(days)]);

    res.json({ success: true, categories: rows });
  } catch (error) {
    console.error('[OCR Usage] getErrorCategories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// #49: Cross-field consistency validation
async function validateJobFields(req, res) {
  try {
    const pool = getAppPool();
    const { jobId } = req.params;

    const [job] = await pool.query('SELECT * FROM ocr_jobs WHERE id = ?', [jobId]);
    if (!job.length) return res.status(404).json({ success: false, error: 'Job not found' });

    const issues = [];
    const j = job[0];

    // Check started_at < completed_at
    if (j.started_at && j.completed_at && new Date(j.started_at) > new Date(j.completed_at)) {
      issues.push({ field: 'started_at/completed_at', issue: 'started_at is after completed_at' });
    }
    // Check confidence in valid range
    if (j.confidence_score !== null && (j.confidence_score < 0 || j.confidence_score > 100)) {
      issues.push({ field: 'confidence_score', issue: `Out of range: ${j.confidence_score}` });
    }
    // Check dead_letter consistency
    if (j.dead_letter && j.status === 'pending') {
      issues.push({ field: 'dead_letter/status', issue: 'Dead letter job should not be pending' });
    }
    // Check retry_count vs max_retries
    if (j.retry_count > j.max_retries && !j.dead_letter) {
      issues.push({ field: 'retry_count', issue: 'Exceeded max retries but not in dead letter queue' });
    }

    res.json({ success: true, job_id: jobId, issues, valid: issues.length === 0 });
  } catch (error) {
    console.error('[OCR Usage] validateJobFields error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getApiUsage,
  getChurchUsageStats,
  getDeadLetterQueue,
  retryDeadLetterJob,
  purgeDeadLetterQueue,
  getStorageUsage,
  getPipelineMetrics,
  getQuotaStatus,
  getErrorCategories,
  validateJobFields,
};
