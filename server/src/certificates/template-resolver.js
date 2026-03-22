/**
 * Template Resolver — Deterministic certificate template selection
 *
 * Resolution priority:
 *   1. Church-specific active template override
 *   2. Jurisdiction default active template
 *   3. System fallback (is_system_default = true) for the template type
 *
 * Usage:
 *   const template = await resolveTemplate(pool, { churchId, jurisdictionCode, templateType });
 */

const { getAppPool } = require('../config/db');

/**
 * Resolve the best certificate template for a given context.
 *
 * @param {object} params
 * @param {number} params.churchId — Church requesting the certificate
 * @param {string} params.templateType — 'baptism_adult' | 'baptism_child' | 'marriage' | 'reception' | 'funeral'
 * @param {string} [params.jurisdictionCode] — Optional override; if omitted, looked up from church
 * @returns {Promise<{template, group, fields}|null>}
 */
async function resolveTemplate({ churchId, templateType, jurisdictionCode }) {
  const pool = getAppPool();

  // If no jurisdiction code provided, look it up from the church
  if (!jurisdictionCode && churchId) {
    const [rows] = await pool.query(
      `SELECT j.abbreviation FROM churches c
       LEFT JOIN jurisdictions j ON j.id = c.jurisdiction_id
       WHERE c.id = ?`,
      [churchId]
    );
    jurisdictionCode = rows[0]?.abbreviation || null;
  }

  // 1. Church-specific override
  if (churchId) {
    const result = await findTemplate(pool, templateType, churchId);
    if (result) return { ...result, resolution: 'church_override' };
  }

  // 2. Jurisdiction default
  if (jurisdictionCode) {
    const result = await findJurisdictionTemplate(pool, templateType, jurisdictionCode);
    if (result) return { ...result, resolution: 'jurisdiction_default' };
  }

  // 3. System fallback
  const result = await findSystemDefault(pool, templateType);
  if (result) return { ...result, resolution: 'system_fallback' };

  return null;
}

/**
 * Find a church-specific template override
 */
async function findTemplate(pool, templateType, churchId) {
  const [rows] = await pool.query(
    `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name
     FROM certificate_templates t
     JOIN certificate_template_groups g ON g.id = t.template_group_id
     WHERE g.template_type = ? AND t.church_id = ? AND t.is_active = TRUE AND g.is_active = TRUE
     ORDER BY t.created_at DESC LIMIT 1`,
    [templateType, churchId]
  );
  if (!rows.length) return null;
  const fields = await loadFields(pool, rows[0].id);
  return { template: rows[0], fields };
}

/**
 * Find the jurisdiction default template (no church_id)
 */
async function findJurisdictionTemplate(pool, templateType, jurisdictionCode) {
  const [rows] = await pool.query(
    `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name
     FROM certificate_templates t
     JOIN certificate_template_groups g ON g.id = t.template_group_id
     WHERE g.template_type = ? AND g.jurisdiction_code = ? AND t.church_id IS NULL
       AND t.is_active = TRUE AND g.is_active = TRUE
     ORDER BY t.created_at DESC LIMIT 1`,
    [templateType, jurisdictionCode]
  );
  if (!rows.length) return null;
  const fields = await loadFields(pool, rows[0].id);
  return { template: rows[0], fields };
}

/**
 * Find the system default template
 */
async function findSystemDefault(pool, templateType) {
  const [rows] = await pool.query(
    `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name
     FROM certificate_templates t
     JOIN certificate_template_groups g ON g.id = t.template_group_id
     WHERE g.template_type = ? AND g.is_system_default = TRUE AND t.church_id IS NULL
       AND t.is_active = TRUE AND g.is_active = TRUE
     ORDER BY t.created_at DESC LIMIT 1`,
    [templateType]
  );
  if (!rows.length) return null;
  const fields = await loadFields(pool, rows[0].id);
  return { template: rows[0], fields };
}

/**
 * Load all field definitions for a template
 */
async function loadFields(pool, templateId) {
  const [rows] = await pool.query(
    'SELECT * FROM certificate_template_fields WHERE template_id = ? ORDER BY sort_order',
    [templateId]
  );
  return rows;
}

/**
 * Determine which baptism template type to use based on record data.
 * Returns 'baptism_adult' or 'baptism_child'.
 */
function determineBaptismVariant(record) {
  // If entry_type indicates chrismation/reception, use adult template
  if (record.entry_type && record.entry_type.toLowerCase() !== 'baptism') {
    return 'baptism_adult';
  }
  // If parents field is populated, likely a child baptism
  if (record.parents && record.parents.trim()) {
    return 'baptism_child';
  }
  // If we can compute age at baptism
  if (record.birth_date && record.reception_date) {
    const birth = new Date(record.birth_date);
    const reception = new Date(record.reception_date);
    const ageYears = (reception - birth) / (365.25 * 24 * 60 * 60 * 1000);
    return ageYears >= 13 ? 'baptism_adult' : 'baptism_child';
  }
  // Default to adult
  return 'baptism_adult';
}

module.exports = {
  resolveTemplate,
  determineBaptismVariant,
  loadFields,
};
