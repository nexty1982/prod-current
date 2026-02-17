/**
 * OCR Layout Template Controller — CRUD + Preview
 *
 * Manages layout templates (ocr_extractors + ocr_extractor_fields) for
 * defining custom column boundaries used by the table extraction pipeline.
 *
 * Endpoints:
 *   GET    /api/ocr/layout-templates              — List templates
 *   GET    /api/ocr/layout-templates/:id           — Get template + fields
 *   POST   /api/ocr/layout-templates               — Create template
 *   PUT    /api/ocr/layout-templates/:id           — Update template
 *   DELETE /api/ocr/layout-templates/:id           — Delete template
 *   POST   /api/ocr/layout-templates/:id/preview   — Preview extraction with template bands
 */

'use strict';

const fs = require('fs');
const path = require('path');

function getPool() {
  const { promisePool } = require('../config/db');
  return promisePool;
}

// ── GET /api/ocr/layout-templates ────────────────────────────────────────────

async function listTemplates(req, res) {
  try {
    const pool = getPool();
    const recordType = req.query.record_type || '';
    const churchId = req.query.church_id ? parseInt(req.query.church_id) : null;

    let sql = `
      SELECT e.id, e.name, e.description, e.record_type, e.column_bands,
             e.header_y_threshold, e.preview_job_id, e.is_default, e.church_id,
             e.record_regions, e.created_at, e.updated_at,
             (SELECT COUNT(*) FROM ocr_extractor_fields f WHERE f.extractor_id = e.id) AS field_count
      FROM ocr_extractors e
      WHERE e.column_bands IS NOT NULL
    `;
    const params = [];

    if (recordType) {
      sql += ' AND e.record_type = ?';
      params.push(recordType);
    }
    if (churchId) {
      sql += ' AND (e.church_id = ? OR e.church_id IS NULL)';
      params.push(churchId);
    }

    sql += ' ORDER BY e.is_default DESC, e.name ASC';

    const [rows] = await pool.query(sql, params);

    // Parse JSON fields for each row
    for (const row of rows) {
      if (row.column_bands && typeof row.column_bands === 'string') {
        try { row.column_bands = JSON.parse(row.column_bands); } catch (_) {}
      }
      if (row.record_regions && typeof row.record_regions === 'string') {
        try { row.record_regions = JSON.parse(row.record_regions); } catch (_) {}
      }
    }

    res.json({ templates: rows });
  } catch (error) {
    console.error('[LayoutTemplate] listTemplates error:', error);
    res.status(500).json({ error: 'Failed to list templates', message: error.message });
  }
}

// ── GET /api/ocr/layout-templates/:id ────────────────────────────────────────

async function getTemplate(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Template ID required' });

    const pool = getPool();

    const [rows] = await pool.query(`
      SELECT e.id, e.name, e.description, e.record_type, e.column_bands,
             e.header_y_threshold, e.preview_job_id, e.is_default, e.church_id,
             e.page_mode, e.record_regions, e.created_at, e.updated_at
      FROM ocr_extractors e
      WHERE e.id = ?
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: 'Template not found' });

    const template = rows[0];
    if (template.column_bands && typeof template.column_bands === 'string') {
      try { template.column_bands = JSON.parse(template.column_bands); } catch (_) {}
    }
    if (template.record_regions && typeof template.record_regions === 'string') {
      try { template.record_regions = JSON.parse(template.record_regions); } catch (_) {}
    }

    // Load fields
    const [fields] = await pool.query(`
      SELECT id, name, \`key\`, field_type, column_index, sort_order
      FROM ocr_extractor_fields
      WHERE extractor_id = ?
      ORDER BY sort_order ASC, column_index ASC
    `, [id]);

    template.fields = fields;

    res.json({ template });
  } catch (error) {
    console.error('[LayoutTemplate] getTemplate error:', error);
    res.status(500).json({ error: 'Failed to get template', message: error.message });
  }
}

// ── POST /api/ocr/layout-templates ───────────────────────────────────────────

async function createTemplate(req, res) {
  try {
    const pool = getPool();
    const {
      name,
      description,
      record_type,
      column_bands,
      header_y_threshold,
      preview_job_id,
      is_default,
      church_id,
      fields,
      record_regions,
    } = req.body;

    if (!name || !record_type) {
      return res.status(400).json({ error: 'name and record_type are required' });
    }

    if (!column_bands || !Array.isArray(column_bands) || column_bands.length === 0) {
      return res.status(400).json({ error: 'column_bands array is required' });
    }

    // If setting as default, unset other defaults for this record_type
    if (is_default) {
      await pool.query(
        'UPDATE ocr_extractors SET is_default = 0 WHERE record_type = ? AND is_default = 1',
        [record_type]
      );
    }

    const [result] = await pool.query(`
      INSERT INTO ocr_extractors (name, description, record_type, column_bands, header_y_threshold, preview_job_id, is_default, church_id, record_regions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || null,
      record_type,
      JSON.stringify(column_bands),
      header_y_threshold || 0,
      preview_job_id || null,
      is_default ? 1 : 0,
      church_id || null,
      record_regions ? JSON.stringify(record_regions) : null,
    ]);

    const templateId = result.insertId;

    // Insert fields if provided
    if (fields && Array.isArray(fields)) {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        await pool.query(`
          INSERT INTO ocr_extractor_fields (extractor_id, name, \`key\`, field_type, column_index, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          templateId,
          field.name || `Column ${i + 1}`,
          field.key || `col_${i + 1}`,
          field.field_type || 'text',
          field.column_index ?? i,
          field.sort_order ?? i,
        ]);
      }
    }

    console.log(`[LayoutTemplate] Created template ${templateId}: "${name}" (${record_type}, ${column_bands.length} columns)`);

    res.json({ success: true, template_id: templateId });
  } catch (error) {
    console.error('[LayoutTemplate] createTemplate error:', error);
    res.status(500).json({ error: 'Failed to create template', message: error.message });
  }
}

// ── PUT /api/ocr/layout-templates/:id ────────────────────────────────────────

async function updateTemplate(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Template ID required' });

    const pool = getPool();
    const {
      name,
      description,
      record_type,
      column_bands,
      header_y_threshold,
      preview_job_id,
      is_default,
      church_id,
      fields,
      record_regions,
    } = req.body;

    // Verify exists
    const [existing] = await pool.query('SELECT id, record_type FROM ocr_extractors WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Template not found' });

    const effectiveRecordType = record_type || existing[0].record_type;

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(
        'UPDATE ocr_extractors SET is_default = 0 WHERE record_type = ? AND is_default = 1 AND id != ?',
        [effectiveRecordType, id]
      );
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (record_type !== undefined) { updates.push('record_type = ?'); params.push(record_type); }
    if (column_bands !== undefined) { updates.push('column_bands = ?'); params.push(JSON.stringify(column_bands)); }
    if (header_y_threshold !== undefined) { updates.push('header_y_threshold = ?'); params.push(header_y_threshold); }
    if (preview_job_id !== undefined) { updates.push('preview_job_id = ?'); params.push(preview_job_id); }
    if (is_default !== undefined) { updates.push('is_default = ?'); params.push(is_default ? 1 : 0); }
    if (church_id !== undefined) { updates.push('church_id = ?'); params.push(church_id); }
    if (record_regions !== undefined) { updates.push('record_regions = ?'); params.push(record_regions ? JSON.stringify(record_regions) : null); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE ocr_extractors SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Replace fields if provided
    if (fields && Array.isArray(fields)) {
      await pool.query('DELETE FROM ocr_extractor_fields WHERE extractor_id = ?', [id]);
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        await pool.query(`
          INSERT INTO ocr_extractor_fields (extractor_id, name, \`key\`, field_type, column_index, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          id,
          field.name || `Column ${i + 1}`,
          field.key || `col_${i + 1}`,
          field.field_type || 'text',
          field.column_index ?? i,
          field.sort_order ?? i,
        ]);
      }
    }

    console.log(`[LayoutTemplate] Updated template ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[LayoutTemplate] updateTemplate error:', error);
    res.status(500).json({ error: 'Failed to update template', message: error.message });
  }
}

// ── DELETE /api/ocr/layout-templates/:id ─────────────────────────────────────

async function deleteTemplate(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Template ID required' });

    const pool = getPool();

    // Delete fields first (FK)
    await pool.query('DELETE FROM ocr_extractor_fields WHERE extractor_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM ocr_extractors WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log(`[LayoutTemplate] Deleted template ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[LayoutTemplate] deleteTemplate error:', error);
    res.status(500).json({ error: 'Failed to delete template', message: error.message });
  }
}

// ── POST /api/ocr/layout-templates/:id/preview ──────────────────────────────

async function previewExtraction(req, res) {
  try {
    const id = parseInt(req.params.id);
    const jobId = parseInt(req.body.job_id);

    if (!id) return res.status(400).json({ error: 'Template ID required' });
    if (!jobId) return res.status(400).json({ error: 'job_id required in body' });

    const pool = getPool();

    // Load template
    const [tplRows] = await pool.query(
      'SELECT column_bands, header_y_threshold FROM ocr_extractors WHERE id = ?',
      [id]
    );
    if (!tplRows.length) return res.status(404).json({ error: 'Template not found' });

    let columnBands = tplRows[0].column_bands;
    if (typeof columnBands === 'string') {
      columnBands = JSON.parse(columnBands);
    }
    const headerY = tplRows[0].header_y_threshold || 0.15;

    // Load Vision JSON for the job
    const [jobRows] = await pool.query('SELECT ocr_result FROM ocr_jobs WHERE id = ?', [jobId]);
    let visionJsonStr = jobRows.length ? jobRows[0].ocr_result : null;

    // Fallback to disk
    if (!visionJsonStr) {
      const feederPath = path.join(
        '/var/www/orthodoxmetrics/prod/server/storage/feeder',
        `job_${jobId}`, 'page_0', 'vision_result.json'
      );
      if (fs.existsSync(feederPath)) {
        visionJsonStr = fs.readFileSync(feederPath, 'utf8');
      }
    }

    if (!visionJsonStr) {
      return res.status(400).json({ error: 'No OCR result available for this job' });
    }

    const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

    // Run extraction with template bands
    const { extractGenericTable } = require('../ocr/layouts/generic_table');
    const result = extractGenericTable(visionJson, {
      pageIndex: 0,
      headerY,
      columnBands: columnBands,
    });

    console.log(`[LayoutTemplate] Preview: template ${id}, job ${jobId} → ${result.data_rows} rows, ${result.columns_detected} cols`);

    res.json({
      success: true,
      template_id: id,
      job_id: jobId,
      extraction: result,
    });
  } catch (error) {
    console.error('[LayoutTemplate] previewExtraction error:', error);
    res.status(500).json({ error: 'Preview extraction failed', message: error.message });
  }
}

// ── POST /api/ocr/layout-templates/preview-inline ────────────────────────────
// Same as previewExtraction but reads column_bands + header_y from request body
// instead of looking up a saved template.

async function previewInline(req, res) {
  try {
    const jobId = parseInt(req.body.job_id);
    let columnBands = req.body.column_bands;
    const headerY = parseFloat(req.body.header_y_threshold) || 0.15;

    if (!jobId) return res.status(400).json({ error: 'job_id required in body' });
    if (!columnBands || !Array.isArray(columnBands) || columnBands.length === 0) {
      return res.status(400).json({ error: 'column_bands required (array of {start, end})' });
    }

    const pool = getPool();

    // Load Vision JSON for the job
    const [jobRows] = await pool.query('SELECT ocr_result FROM ocr_jobs WHERE id = ?', [jobId]);
    let visionJsonStr = jobRows.length ? jobRows[0].ocr_result : null;

    // Fallback to disk
    if (!visionJsonStr) {
      const feederPath = path.join(
        '/var/www/orthodoxmetrics/prod/server/storage/feeder',
        `job_${jobId}`, 'page_0', 'vision_result.json'
      );
      if (fs.existsSync(feederPath)) {
        visionJsonStr = fs.readFileSync(feederPath, 'utf8');
      }
    }

    if (!visionJsonStr) {
      return res.status(400).json({ error: 'No OCR result available for this job' });
    }

    const visionJson = typeof visionJsonStr === 'string' ? JSON.parse(visionJsonStr) : visionJsonStr;

    // Run extraction with inline bands
    const { extractGenericTable } = require('../ocr/layouts/generic_table');
    const result = extractGenericTable(visionJson, {
      pageIndex: 0,
      headerY,
      columnBands: columnBands,
    });

    console.log(`[LayoutTemplate] PreviewInline: job ${jobId} → ${result.data_rows} rows, ${result.columns_detected} cols`);

    res.json({
      success: true,
      job_id: jobId,
      extraction: result,
    });
  } catch (error) {
    console.error('[LayoutTemplate] previewInline error:', error);
    res.status(500).json({ error: 'Inline preview failed', message: error.message });
  }
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewExtraction,
  previewInline,
};
