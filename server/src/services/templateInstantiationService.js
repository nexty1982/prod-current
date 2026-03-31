/**
 * Template Instantiation Service
 *
 * Takes a workflow template + parameter values and generates a complete
 * workflow with all steps. The generated workflow passes through the
 * existing workflowService (creation) and workflowGenerationService
 * (prompt generation) — no bypassing of audit, evaluation, or queue.
 *
 * PARAMETER INJECTION:
 *   Parameters use {{param_name}} syntax in template step fields.
 *   Injection is applied to: title, purpose, component, expected_outcome,
 *   requirements_summary.
 *
 * FLOW:
 *   1. Load template (or version snapshot)
 *   2. Validate all required parameters are provided
 *   3. Inject parameters into step definitions
 *   4. Create workflow via workflowService.createWorkflow
 *   5. Workflow enters standard pipeline (draft → approve → generate → audit)
 */

const templateService = require('./workflowTemplateService');
const workflowService = require('./workflowService');
const { getAppPool } = require('../config/db');

// ─── Parameter Injection ──────────────────────────────────────────────────

/**
 * Replace all {{param_name}} placeholders in a string with parameter values.
 * Deterministic: same template + same params → same output, every time.
 */
function injectParams(text, params) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
    if (params.hasOwnProperty(paramName)) {
      return String(params[paramName]);
    }
    return match; // Leave unresolved placeholders as-is (caught in validation)
  });
}

/**
 * Apply parameter injection to all text fields of a step.
 */
function injectStepParams(step, params) {
  return {
    ...step,
    title: injectParams(step.title, params),
    purpose: injectParams(step.purpose, params),
    component: injectParams(step.component, params),
    expected_outcome: injectParams(step.expected_outcome, params),
    requirements_summary: injectParams(step.requirements_summary, params),
  };
}

// ─── Parameter Validation ─────────────────────────────────────────────────

/**
 * Validate that all required parameters are provided.
 * Returns { valid, errors[], resolved_params }.
 */
function validateParams(templateParams, providedParams) {
  const errors = [];
  const resolved = {};

  if (!templateParams || templateParams.length === 0) {
    return { valid: true, errors: [], resolved_params: providedParams || {} };
  }

  for (const paramDef of templateParams) {
    const value = providedParams?.[paramDef.name];

    if (value === undefined || value === null || value === '') {
      if (paramDef.required !== false) {
        if (paramDef.default_value !== undefined && paramDef.default_value !== null) {
          resolved[paramDef.name] = paramDef.default_value;
        } else {
          errors.push(`Required parameter "${paramDef.label || paramDef.name}" is missing`);
        }
      } else if (paramDef.default_value !== undefined) {
        resolved[paramDef.name] = paramDef.default_value;
      }
    } else {
      // Type coercion
      if (paramDef.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`Parameter "${paramDef.name}" must be a number`);
        } else {
          resolved[paramDef.name] = num;
        }
      } else if (paramDef.type === 'boolean') {
        resolved[paramDef.name] = value === true || value === 'true';
      } else if (paramDef.type === 'enum' && paramDef.options) {
        if (!paramDef.options.includes(value)) {
          errors.push(`Parameter "${paramDef.name}" must be one of: ${paramDef.options.join(', ')}`);
        } else {
          resolved[paramDef.name] = value;
        }
      } else {
        resolved[paramDef.name] = String(value);
      }
    }
  }

  return { valid: errors.length === 0, errors, resolved_params: resolved };
}

// ─── Preview ──────────────────────────────────────────────────────────────

/**
 * Preview what a template instantiation would produce without creating anything.
 * Returns the workflow definition and steps with parameters injected.
 */
async function previewInstantiation(templateId, params, version = null) {
  const template = version
    ? await getTemplateSnapshot(templateId, version)
    : await templateService.getTemplateById(templateId);

  if (!template) throw new Error('Template not found');

  const templateParams = template.parameters || [];
  const paramValidation = validateParams(templateParams, params);
  if (!paramValidation.valid) {
    throw new Error(`Parameter validation failed: ${paramValidation.errors.join('; ')}`);
  }

  const resolvedParams = paramValidation.resolved_params;
  const workflowName = injectParams(template.name, resolvedParams);
  const workflowDesc = injectParams(template.description || '', resolvedParams);

  const steps = (template.steps || []).map(step => injectStepParams(step, resolvedParams));

  // Check for unresolved placeholders
  const unresolvedWarnings = [];
  for (const step of steps) {
    for (const field of ['title', 'purpose', 'component', 'expected_outcome', 'requirements_summary']) {
      if (step[field] && /\{\{\w+\}\}/.test(step[field])) {
        const matches = step[field].match(/\{\{(\w+)\}\}/g);
        unresolvedWarnings.push(`Step ${step.step_number} ${field}: unresolved ${matches.join(', ')}`);
      }
    }
  }

  return {
    workflow: {
      name: workflowName,
      description: workflowDesc,
      component: injectParams(template.steps?.[0]?.component || template.category, resolvedParams),
    },
    steps,
    parameters_used: resolvedParams,
    template: {
      id: template.id || templateId,
      name: template.name,
      version: template.version || version,
      category: template.category,
    },
    unresolved_warnings: unresolvedWarnings,
  };
}

// ─── Instantiation ────────────────────────────────────────────────────────

/**
 * Instantiate a template into a real workflow.
 * Creates the workflow and steps via workflowService (enters standard pipeline).
 * Returns the created workflow.
 */
async function instantiate(templateId, params, actor, version = null) {
  const preview = await previewInstantiation(templateId, params, version);

  if (preview.unresolved_warnings.length > 0) {
    throw new Error(`Unresolved template parameters: ${preview.unresolved_warnings.join('; ')}`);
  }

  // Create workflow via existing service (preserves all guardrails)
  const workflow = await workflowService.createWorkflow(
    {
      name: preview.workflow.name,
      description: preview.workflow.description,
      component: preview.workflow.component,
      steps: preview.steps.map(s => ({
        step_number: s.step_number,
        title: s.title,
        purpose: s.purpose,
        component: s.component,
        prompt_type: s.prompt_type,
        expected_outcome: s.expected_outcome,
        requirements_summary: s.requirements_summary,
        depends_on_step: s.depends_on_step,
      })),
    },
    actor
  );

  // Tag the workflow with template info
  const pool = getAppPool();
  await pool.query(
    'UPDATE prompt_workflows SET template_id = ?, template_version = ? WHERE id = ?',
    [templateId, preview.template.version || 1, workflow.id]
  );

  // Increment usage count
  await pool.query(
    'UPDATE workflow_templates SET usage_count = usage_count + 1, updated_at = updated_at WHERE id = ?',
    [templateId]
  );

  return {
    workflow,
    template: preview.template,
    parameters_used: preview.parameters_used,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getTemplateSnapshot(templateId, version) {
  const versionData = await templateService.getVersionSnapshot(templateId, version);
  if (!versionData) throw new Error(`Template version ${version} not found`);
  return { ...versionData.snapshot, id: templateId, version };
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  injectParams,
  injectStepParams,
  validateParams,
  previewInstantiation,
  instantiate,
};
