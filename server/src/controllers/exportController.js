/**
 * Export Controller
 * Handles PDF reports, Excel exports, and bulk data export.
 * OM Daily #129, #130, #131, #132
 */
const { getAppPool, getTenantPool } = require('../config/db');

// List export jobs for a church
async function listExportJobs(req, res) {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId);
    const userId = req.user?.id || req.session?.user?.id;

    const [rows] = await pool.query(
      `SELECT id, export_type, status, record_type, record_count,
        file_size_bytes, created_at, completed_at, expires_at, error_message
      FROM export_jobs
      WHERE church_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 50`,
      [churchId, userId]
    );

    res.json({ success: true, jobs: rows });
  } catch (error) {
    console.error('[Export] listExportJobs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create a new export job
async function createExportJob(req, res) {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId);
    const userId = req.user?.id || req.session?.user?.id;
    const { export_type, record_type, filters } = req.body;

    if (!export_type) {
      return res.status(400).json({ success: false, error: 'export_type is required' });
    }

    const validTypes = ['pdf_report', 'xlsx', 'csv', 'gedcom', 'zip_archive'];
    if (!validTypes.includes(export_type)) {
      return res.status(400).json({ success: false, error: `Invalid export_type. Valid: ${validTypes.join(', ')}` });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [result] = await pool.query(
      `INSERT INTO export_jobs (church_id, user_id, export_type, record_type, filter_json, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [churchId, userId, export_type, record_type || null, filters ? JSON.stringify(filters) : null, expiresAt]
    );

    res.json({
      success: true,
      job: { id: result.insertId, status: 'pending', export_type, record_type },
    });
  } catch (error) {
    console.error('[Export] createExportJob error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get export job status
async function getExportJob(req, res) {
  try {
    const pool = getAppPool();
    const { jobId } = req.params;

    const [rows] = await pool.query('SELECT * FROM export_jobs WHERE id = ?', [jobId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Export job not found' });
    }

    res.json({ success: true, job: rows[0] });
  } catch (error) {
    console.error('[Export] getExportJob error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Quick CSV export (synchronous for small datasets)
async function quickExport(req, res) {
  try {
    const churchId = parseInt(req.params.churchId);
    const { record_type = 'baptism', format = 'csv' } = req.query;

    const tableMap = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
    const table = tableMap[record_type];
    if (!table) {
      return res.status(400).json({ success: false, error: 'Invalid record_type' });
    }

    const tenantPool = getTenantPool(churchId);
    const [records] = await tenantPool.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1000`);

    if (format === 'csv') {
      if (!records.length) {
        return res.status(200).type('text/csv').send('No records found');
      }
      const headers = Object.keys(records[0]);
      const csv = [
        headers.join(','),
        ...records.map(r => headers.map(h => {
          const val = r[h];
          if (val === null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${record_type}_records_church${churchId}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, records, count: records.length });
  } catch (error) {
    console.error('[Export] quickExport error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { listExportJobs, createExportJob, getExportJob, quickExport };
