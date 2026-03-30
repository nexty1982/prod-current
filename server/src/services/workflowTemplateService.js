/**
 * Workflow Template Service
 *
 * CRUD, validation, versioning, and search for reusable workflow templates.
 * Templates are structured definitions (not free text) that can be
 * instantiated into real workflows with parameter injection.
 *
 * VALIDATION RULES:
 *   - Template must have a name and at least one step
 *   - Every step must have: step_number, title, purpose, prompt_type
 *   - Step numbers must be sequential starting from 1
 *   - dependency_type=explicit requires depends_on_step referencing a valid step
 *   - Parameters must have: name, label, type
 *   - Parameter names must be unique and valid identifiers
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── Valid Enums ──────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['backend', 'frontend', 'fullstack', 'analytics', 'ops', 'database', 'devops', 'docs'];
const VALID_PROMPT_TYPES = ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs'];
const VALID_DEPENDENCY_TYPES = ['sequential', 'explicit', 'none'];
const VALID_PARAM_TYPES = ['string', 'enum', 'boolean', 'number'];

// ─── Validation ───────────────────────────────────────────────────────────

/**
 * Validate a template definition. Returns { valid, errors[] }.
 */
function validateTemplate(template) {
  const errors = [];

  if (!template.name || typeof template.name !== 'string' || template.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (!VALID_CATEGORIES.includes(template.category)) {
    errors.push(`Invalid category "${template.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Validate steps
  const steps = template.steps;
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    errors.push('Template must have at least one step');
    return { valid: false, errors };
  }

  const stepNumbers = new Set();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prefix = `Step ${i + 1}`;

    if (!step.title || typeof step.title !== 'string') {
      errors.push(`${prefix}: title is required`);
    }
    if (!step.purpose || typeof step.purpose !== 'string') {
      errors.push(`${prefix}: purpose is required`);
    }
    if (!VALID_PROMPT_TYPES.includes(step.prompt_type)) {
      errors.push(`${prefix}: invalid prompt_type "${step.prompt_type}". Must be one of: ${VALID_PROMPT_TYPES.join(', ')}`);
    }

    const stepNum = step.step_number ?? (i + 1);
    if (stepNumbers.has(stepNum)) {
      errors.push(`${prefix}: duplicate step_number ${stepNum}`);
    }
    stepNumbers.add(stepNum);

    const depType = step.dependency_type || 'sequential';
    if (!VALID_DEPENDENCY_TYPES.includes(depType)) {
      errors.push(`${prefix}: invalid dependency_type "${depType}"`);
    }
    if (depType === 'explicit') {
      if (!step.depends_on_step || !stepNumbers.has(step.depends_on_step)) {
        if (step.depends_on_step && step.depends_on_step < stepNum) {
          // OK — references earlier step
        } else {
          errors.push(`${prefix}: explicit dependency requires depends_on_step referencing an earlier step`);
        }
      }
    }
  }

  // Validate step numbers are sequential from 1
  const sorted = Array.from(stepNumbers).sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      errors.push(`Step numbers must be sequential starting from 1. Got: ${sorted.join(', ')}`);
      break;
    }
  }

  // Validate parameters
  if (template.parameters && Array.isArray(template.parameters)) {
    const paramNames = new Set();
    for (let i = 0; i < template.parameters.length; i++) {
      const param = template.parameters[i];
      const prefix = `Parameter ${i + 1}`;

      if (!param.name || typeof param.name !== 'string') {
        errors.push(`${prefix}: name is required`);
      } else if (!/^[a-z][a-z0-9_]*$/.test(param.name)) {
        errors.push(`${prefix}: name must be a lowercase identifier (e.g., feature_name)`);
      } else if (paramNames.has(param.name)) {
        errors.push(`${prefix}: duplicate parameter name "${param.name}"`);
      } else {
        paramNames.add(param.name);
      }

      if (!param.label || typeof param.label !== 'string') {
        errors.push(`${prefix}: label is required`);
      }
      if (param.type && !VALID_PARAM_TYPES.includes(param.type)) {
        errors.push(`${prefix}: invalid type "${param.type}". Must be one of: ${VALID_PARAM_TYPES.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

async function createTemplate(data, actor) {
  const validation = validateTemplate(data);
  if (!validation.valid) {
    throw new Error(`Template validation failed: ${validation.errors.join('; ')}`);
  }

  const pool = getAppPool();
  const templateId = uuidv4();
  const params = data.parameters ? JSON.stringify(data.parameters) : null;

  // Validate release_mode if provided
  const validModes = ['manual', 'auto_safe', 'auto_full'];
  if (data.release_mode && !validModes.includes(data.release_mode)) {
    throw new Error(`Invalid release_mode "${data.release_mode}". Must be one of: ${validModes.join(', ')}`);
  }

  await pool.query(
    `INSERT INTO workflow_templates (id, name, description, category, parameters, version, is_active, created_by, release_mode)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    [templateId, data.name.trim(), data.description || null, data.category, params, actor, data.release_mode || null]
  );

  // Insert steps
  for (const step of data.steps) {
    const stepId = uuidv4();
    const stepNum = step.step_number ?? (data.steps.indexOf(step) + 1);
    await pool.query(
      `INSERT INTO workflow_template_steps
       (id, template_id, step_number, title, purpose, component, prompt_type, expected_outcome, requirements_summary, dependency_type, depends_on_step)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stepId, templateId, stepNum,
        step.title, step.purpose, step.component || null,
        step.prompt_type || 'implementation',
        step.expected_outcome || null, step.requirements_summary || null,
        step.dependency_type || 'sequential', step.depends_on_step || null,
      ]
    );
  }

  // Create initial version snapshot
  await createVersionSnapshot(templateId, 1, actor);

  return getTemplateById(templateId);
}

async function updateTemplate(templateId, data, actor) {
  const pool = getAppPool();
  const existing = await getTemplateById(templateId);
  if (!existing) throw new Error('Template not found');

  const merged = {
    name: data.name || existing.name,
    description: data.description !== undefined ? data.description : existing.description,
    category: data.category || existing.category,
    parameters: data.parameters !== undefined ? data.parameters : existing.parameters,
    steps: data.steps || existing.steps,
  };

  const validation = validateTemplate(merged);
  if (!validation.valid) {
    throw new Error(`Template validation failed: ${validation.errors.join('; ')}`);
  }

  // Validate release_mode if provided
  const validModes = ['manual', 'auto_safe', 'auto_full'];
  if (data.release_mode !== undefined && data.release_mode !== null && !validModes.includes(data.release_mode)) {
    throw new Error(`Invalid release_mode "${data.release_mode}". Must be one of: ${validModes.join(', ')}`);
  }

  const params = merged.parameters ? JSON.stringify(merged.parameters) : null;
  const releaseMode = data.release_mode !== undefined ? data.release_mode : existing.release_mode;
  await pool.query(
    `UPDATE workflow_templates SET name = ?, description = ?, category = ?, parameters = ?, release_mode = ?, updated_at = NOW()
     WHERE id = ?`,
    [merged.name.trim(), merged.description, merged.category, params, releaseMode || null, templateId]
  );

  // Replace steps if provided
  if (data.steps) {
    await pool.query('DELETE FROM workflow_template_steps WHERE template_id = ?', [templateId]);
    for (const step of data.steps) {
      const stepId = uuidv4();
      const stepNum = step.step_number ?? (data.steps.indexOf(step) + 1);
      await pool.query(
        `INSERT INTO workflow_template_steps
         (id, template_id, step_number, title, purpose, component, prompt_type, expected_outcome, requirements_summary, dependency_type, depends_on_step)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stepId, templateId, stepNum,
          step.title, step.purpose, step.component || null,
          step.prompt_type || 'implementation',
          step.expected_outcome || null, step.requirements_summary || null,
          step.dependency_type || 'sequential', step.depends_on_step || null,
        ]
      );
    }
  }

  return getTemplateById(templateId);
}

async function getTemplateById(templateId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM workflow_templates WHERE id = ?', [templateId]);
  if (rows.length === 0) return null;

  const template = rows[0];
  template.parameters = template.parameters
    ? (typeof template.parameters === 'string' ? JSON.parse(template.parameters) : template.parameters)
    : [];

  const [steps] = await pool.query(
    'SELECT * FROM workflow_template_steps WHERE template_id = ? ORDER BY step_number',
    [templateId]
  );
  template.steps = steps;

  return template;
}

async function listTemplates(filters = {}) {
  const pool = getAppPool();
  let where = 'WHERE 1=1';
  const params = [];

  if (filters.category) {
    where += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.is_active !== undefined) {
    where += ' AND is_active = ?';
    params.push(filters.is_active ? 1 : 0);
  }
  if (filters.search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const [rows] = await pool.query(
    `SELECT id, name, description, category, parameters, version, is_active, usage_count, created_by, created_at, updated_at,
            (SELECT COUNT(*) FROM workflow_template_steps WHERE template_id = workflow_templates.id) as step_count
     FROM workflow_templates ${where}
     ORDER BY updated_at DESC`,
    params
  );

  // Parse parameters for each
  for (const row of rows) {
    row.parameters = row.parameters
      ? (typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters)
      : [];
  }

  return rows;
}

async function deleteTemplate(templateId) {
  const pool = getAppPool();
  await pool.query('UPDATE workflow_templates SET is_active = 0, updated_at = NOW() WHERE id = ?', [templateId]);
}

// ─── Versioning ───────────────────────────────────────────────────────────

async function createVersionSnapshot(templateId, version, actor) {
  const pool = getAppPool();
  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const snapshot = JSON.stringify({
    name: template.name,
    description: template.description,
    category: template.category,
    release_mode: template.release_mode || null,
    parameters: template.parameters,
    steps: template.steps.map(s => ({
      step_number: s.step_number,
      title: s.title,
      purpose: s.purpose,
      component: s.component,
      prompt_type: s.prompt_type,
      expected_outcome: s.expected_outcome,
      requirements_summary: s.requirements_summary,
      dependency_type: s.dependency_type,
      depends_on_step: s.depends_on_step,
    })),
  });

  const versionId = uuidv4();
  await pool.query(
    `INSERT INTO workflow_template_versions (id, template_id, version, snapshot, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [versionId, templateId, version, snapshot, actor]
  );

  return { version_id: versionId, version };
}

async function publishNewVersion(templateId, actor) {
  const pool = getAppPool();
  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const newVersion = template.version + 1;

  await pool.query(
    'UPDATE workflow_templates SET version = ?, updated_at = NOW() WHERE id = ?',
    [newVersion, templateId]
  );

  await createVersionSnapshot(templateId, newVersion, actor);

  return { template_id: templateId, version: newVersion };
}

async function getVersionSnapshot(templateId, version) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT * FROM workflow_template_versions WHERE template_id = ? AND version = ?',
    [templateId, version]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  row.snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
  return row;
}

async function listVersions(templateId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT id, version, created_by, created_at FROM workflow_template_versions WHERE template_id = ? ORDER BY version DESC',
    [templateId]
  );
  return rows;
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  VALID_CATEGORIES,
  VALID_PROMPT_TYPES,
  VALID_DEPENDENCY_TYPES,
  VALID_PARAM_TYPES,
  validateTemplate,
  createTemplate,
  updateTemplate,
  getTemplateById,
  listTemplates,
  deleteTemplate,
  publishNewVersion,
  getVersionSnapshot,
  listVersions,
};
