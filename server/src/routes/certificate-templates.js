/**
 * Certificate Templates API — CRUD + resolution + generation
 * Mounted at /api/certificate-templates
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getAppPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { resolveTemplate, determineBaptismVariant } = require('../certificates/template-resolver');
const { mapFieldValues } = require('../certificates/field-mapper');

const ADMIN_ROLES = ['super_admin', 'admin'];
const TEMPLATE_MGMT_ROLES = ['super_admin'];

/* ══════════════════════════════════════════════════════════
   Template Groups — List / Get
   ══════════════════════════════════════════════════════════ */

// GET /api/certificate-templates/groups — List all template groups
router.get('/groups', requireAuth, async (req, res) => {
  try {
    const { jurisdiction, type } = req.query;
    let query = `SELECT g.*, j.name as jurisdiction_name,
      (SELECT COUNT(*) FROM certificate_templates t WHERE t.template_group_id = g.id) as template_count
      FROM certificate_template_groups g
      LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
      WHERE 1=1`;
    const params = [];

    if (jurisdiction) { query += ' AND g.jurisdiction_code = ?'; params.push(jurisdiction); }
    if (type) { query += ' AND g.template_type = ?'; params.push(type); }
    query += ' ORDER BY g.jurisdiction_code, g.template_type';

    const [rows] = await getAppPool().query(query, params);
    res.json({ groups: rows });
  } catch (err) {
    console.error('[certificate-templates] GET /groups error:', err.message);
    res.status(500).json({ error: 'Failed to list template groups' });
  }
});

/* ══════════════════════════════════════════════════════════
   Templates — CRUD
   ══════════════════════════════════════════════════════════ */

// GET /api/certificate-templates — List templates with optional filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { group_id, jurisdiction, type, church_id, active_only } = req.query;
    let query = `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name,
      g.is_system_default, j.name as jurisdiction_name,
      (SELECT COUNT(*) FROM certificate_template_fields f WHERE f.template_id = t.id) as field_count
      FROM certificate_templates t
      JOIN certificate_template_groups g ON g.id = t.template_group_id
      LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
      WHERE 1=1`;
    const params = [];

    if (group_id) { query += ' AND t.template_group_id = ?'; params.push(group_id); }
    if (jurisdiction) { query += ' AND g.jurisdiction_code = ?'; params.push(jurisdiction); }
    if (type) { query += ' AND g.template_type = ?'; params.push(type); }
    if (church_id) { query += ' AND t.church_id = ?'; params.push(church_id); }
    if (active_only === 'true') { query += ' AND t.is_active = TRUE AND g.is_active = TRUE'; }
    query += ' ORDER BY g.jurisdiction_code, g.template_type, t.church_id IS NULL DESC, t.created_at DESC';

    const [rows] = await getAppPool().query(query, params);
    res.json({ templates: rows });
  } catch (err) {
    console.error('[certificate-templates] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/certificate-templates/:id — Get single template with fields
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [templates] = await getAppPool().query(
      `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name,
        g.is_system_default, j.name as jurisdiction_name
       FROM certificate_templates t
       JOIN certificate_template_groups g ON g.id = t.template_group_id
       LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!templates.length) return res.status(404).json({ error: 'Template not found' });

    const [fields] = await getAppPool().query(
      'SELECT * FROM certificate_template_fields WHERE template_id = ? ORDER BY sort_order',
      [req.params.id]
    );

    res.json({ template: templates[0], fields });
  } catch (err) {
    console.error('[certificate-templates] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// PUT /api/certificate-templates/:id — Update template (superadmin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!TEMPLATE_MGMT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only superadmins can edit templates' });
    }

    const { version_label, is_active, styling_json, field_schema_json } = req.body;
    const updates = [];
    const params = [];

    if (version_label !== undefined) { updates.push('version_label = ?'); params.push(version_label); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (styling_json !== undefined) { updates.push('styling_json = ?'); params.push(JSON.stringify(styling_json)); }
    if (field_schema_json !== undefined) { updates.push('field_schema_json = ?'); params.push(JSON.stringify(field_schema_json)); }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    await getAppPool().query(`UPDATE certificate_templates SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    console.error('[certificate-templates] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/* ══════════════════════════════════════════════════════════
   Template Fields — CRUD
   ══════════════════════════════════════════════════════════ */

// PUT /api/certificate-templates/:id/fields/:fieldId — Update a field
router.put('/:id/fields/:fieldId', requireAuth, async (req, res) => {
  try {
    if (!TEMPLATE_MGMT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only superadmins can edit template fields' });
    }

    const allowedFields = ['x', 'y', 'width', 'height', 'font_family', 'font_size', 'font_weight',
      'text_align', 'color', 'text_transform', 'is_required', 'is_multiline', 'sort_order', 'label', 'source_path'];
    const updates = [];
    const params = [];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.fieldId, req.params.id);
    await getAppPool().query(
      `UPDATE certificate_template_fields SET ${updates.join(', ')} WHERE id = ? AND template_id = ?`,
      params
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[certificate-templates] PUT /:id/fields/:fieldId error:', err.message);
    res.status(500).json({ error: 'Failed to update field' });
  }
});

/* ══════════════════════════════════════════════════════════
   Template Resolution — Determine which template to use
   ══════════════════════════════════════════════════════════ */

// GET /api/certificate-templates/resolve?churchId=X&templateType=Y
router.get('/resolve/match', requireAuth, async (req, res) => {
  try {
    const { churchId, templateType, jurisdictionCode } = req.query;
    if (!templateType) return res.status(400).json({ error: 'templateType is required' });

    const result = await resolveTemplate({
      churchId: churchId ? parseInt(churchId) : null,
      templateType,
      jurisdictionCode,
    });

    if (!result) return res.status(404).json({ error: 'No matching template found' });

    res.json({
      resolution: result.resolution,
      template: result.template,
      fields: result.fields,
    });
  } catch (err) {
    console.error('[certificate-templates] GET /resolve/match error:', err.message);
    res.status(500).json({ error: 'Failed to resolve template' });
  }
});

/* ══════════════════════════════════════════════════════════
   Certificate Generation — Produce PDF from record + template
   ══════════════════════════════════════════════════════════ */

// POST /api/certificate-templates/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { churchId, recordType, recordId, templateType: explicitType } = req.body;
    if (!churchId || !recordType || !recordId) {
      return res.status(400).json({ error: 'churchId, recordType, and recordId are required' });
    }

    const pool = getAppPool();

    // 1. Load the record from the church database
    const { getTenantPool } = require('../config/db');
    const tenantPool = getTenantPool(churchId);
    const tableMap = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
    const table = tableMap[recordType];
    if (!table) return res.status(400).json({ error: 'Invalid recordType' });

    const [records] = await tenantPool.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
    if (!records.length) return res.status(404).json({ error: 'Record not found' });
    const record = records[0];

    // 2. Determine template type
    let templateType = explicitType;
    if (!templateType) {
      if (recordType === 'baptism') {
        templateType = determineBaptismVariant(record);
      } else {
        templateType = recordType;
      }
    }

    // 3. Resolve template
    const resolved = await resolveTemplate({ churchId: parseInt(churchId), templateType });
    if (!resolved) return res.status(404).json({ error: `No template found for type: ${templateType}` });

    // 4. Load church metadata
    const [churches] = await pool.query(
      'SELECT name, rector_name, seal_image_path, signature_image_path FROM churches WHERE id = ?',
      [churchId]
    );
    const church = churches[0] || { name: 'Orthodox Church' };

    // 5. Map fields
    const fieldValues = mapFieldValues(resolved.fields, record, church);

    // 6. Generate PDF
    const { generateFromTemplate } = require('../certificates/pdf-generator-v2');
    const pdfBytes = await generateFromTemplate(resolved.template, resolved.fields, fieldValues);

    // 7. Store generated certificate record
    const fileName = `${recordType}-${recordId}-${Date.now()}.pdf`;
    const filePath = `certificates/generated/${churchId}/${fileName}`;
    const fullPath = path.join(__dirname, '../../storage', filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, Buffer.from(pdfBytes));

    const [insertResult] = await pool.query(
      `INSERT INTO generated_certificates (church_id, record_type, record_id, template_id, file_path, file_size, generated_by, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [churchId, recordType, recordId, resolved.template.id, filePath, pdfBytes.length,
       req.user.id, JSON.stringify({ fieldValues, resolution: resolved.resolution })]
    );

    res.json({
      success: true,
      certificateId: insertResult.insertId,
      filePath,
      templateUsed: resolved.template.group_name,
      resolution: resolved.resolution,
    });
  } catch (err) {
    console.error('[certificate-templates] POST /generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate certificate: ' + err.message });
  }
});

// GET /api/certificate-templates/generate/:certId/download — Download generated certificate
router.get('/generate/:certId/download', requireAuth, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM generated_certificates WHERE id = ?',
      [req.params.certId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Certificate not found' });

    const cert = rows[0];
    const fullPath = path.join(__dirname, '../../storage', cert.file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Certificate file not found' });

    // Update status to downloaded
    await getAppPool().query(
      "UPDATE generated_certificates SET status = 'downloaded' WHERE id = ?",
      [cert.id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.record_type}-${cert.record_id}.pdf"`);
    res.send(fs.readFileSync(fullPath));
  } catch (err) {
    console.error('[certificate-templates] GET /generate/:certId/download error:', err.message);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

// GET /api/certificate-templates/generated — List generated certificates
router.get('/generated/list', requireAuth, async (req, res) => {
  try {
    const { church_id, record_type, limit = 50 } = req.query;
    const user = req.user;
    const churchId = church_id || user.active_church_id || user.church_id;

    let query = `SELECT gc.*, ct.version_label, g.name as template_name, g.jurisdiction_code
      FROM generated_certificates gc
      JOIN certificate_templates ct ON ct.id = gc.template_id
      JOIN certificate_template_groups g ON g.id = ct.template_group_id
      WHERE 1=1`;
    const params = [];

    if (churchId && !ADMIN_ROLES.includes(user.role)) {
      query += ' AND gc.church_id = ?'; params.push(churchId);
    } else if (church_id) {
      query += ' AND gc.church_id = ?'; params.push(church_id);
    }
    if (record_type) { query += ' AND gc.record_type = ?'; params.push(record_type); }

    query += ' ORDER BY gc.generated_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await getAppPool().query(query, params);
    res.json({ certificates: rows });
  } catch (err) {
    console.error('[certificate-templates] GET /generated/list error:', err.message);
    res.status(500).json({ error: 'Failed to list generated certificates' });
  }
});

/* ══════════════════════════════════════════════════════════
   Jurisdictions Summary — Available jurisdictions with template counts
   ══════════════════════════════════════════════════════════ */

router.get('/jurisdictions/summary', requireAuth, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      `SELECT g.jurisdiction_code, j.name as jurisdiction_name,
        COUNT(DISTINCT g.id) as group_count,
        COUNT(DISTINCT t.id) as template_count
       FROM certificate_template_groups g
       LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
       LEFT JOIN certificate_templates t ON t.template_group_id = g.id
       WHERE g.is_active = TRUE
       GROUP BY g.jurisdiction_code, j.name
       ORDER BY j.name`
    );
    res.json({ jurisdictions: rows });
  } catch (err) {
    console.error('[certificate-templates] GET /jurisdictions/summary error:', err.message);
    res.status(500).json({ error: 'Failed to list jurisdictions' });
  }
});

module.exports = router;
