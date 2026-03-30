/**
 * Workflow Learning Service
 *
 * Cross-workflow learning engine that captures recurring violations,
 * successful execution patterns, and structural patterns. All learnings
 * are structured, deterministic, and reusable.
 *
 * Core flows:
 *   recordViolation()     — Capture a violation with pattern signature
 *   recordSuccess()       — Capture a success pattern
 *   recordStructural()    — Capture a structural pattern
 *   aggregatePatterns()   — Promote patterns that cross threshold to global
 *   getConstraints()      — Get injectable constraints for a component
 *   getStats()            — Dashboard aggregation
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_LEARNING_TYPES = ['violation_pattern', 'success_pattern', 'structural_pattern'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

/** How many occurrences before a pattern becomes a global constraint candidate */
const GLOBAL_THRESHOLD = 3;

/** Severity escalation: if occurrences >= N, escalate severity */
const SEVERITY_ESCALATION = {
  low:      { threshold: 5, escalate_to: 'medium' },
  medium:   { threshold: 8, escalate_to: 'high' },
  high:     { threshold: 12, escalate_to: 'critical' },
  critical: null, // cannot escalate further
};

// ─── Pattern Signature ─────────────────────────────────────────────────────

/**
 * Build a deterministic pattern signature from type + category + key.
 * Signatures are used for grouping/deduplication.
 *
 * @param {string} type - violation_pattern | success_pattern | structural_pattern
 * @param {string} category - e.g. 'wrong_api_client', 'complete_execution'
 * @param {string} [qualifier] - optional qualifier for uniqueness
 * @returns {string} e.g. 'violation:wrong_api_client' or 'success:complete_execution:backend'
 */
function buildSignature(type, category, qualifier) {
  const prefix = type.replace('_pattern', '');
  const parts = [prefix, category];
  if (qualifier) parts.push(qualifier);
  return parts.join(':');
}

// ─── Violation Patterns ────────────────────────────────────────────────────

/**
 * Known violation categories with their default constraint text.
 * Adding a new category here automatically makes it capturable.
 */
const VIOLATION_CATEGORIES = {
  duplicate_api_logic: {
    title: 'Duplicate API Logic',
    constraint: 'Do not duplicate existing API logic. Reuse existing service methods and route handlers.',
    severity: 'medium',
  },
  wrong_api_client: {
    title: 'Wrong API Client Used',
    constraint: 'Must use omApi (the project API client), not fetch, axios, or custom HTTP clients.',
    severity: 'high',
  },
  fallback_implementation: {
    title: 'Fallback Implementation Instead of Proper Fix',
    constraint: 'Do not implement fallback behavior or workarounds. Fix the root cause directly.',
    severity: 'high',
  },
  missing_required_outputs: {
    title: 'Missing Required Outputs',
    constraint: 'All required outputs specified in the task must be fully implemented. No placeholders.',
    severity: 'high',
  },
  partial_implementation: {
    title: 'Partial Implementation',
    constraint: 'All required outputs must be fully implemented, no placeholders, stubs, or TODO comments.',
    severity: 'high',
  },
  wrong_db_access: {
    title: 'Wrong Database Access Pattern',
    constraint: 'Use getTenantPool(churchId) for church-specific data. Use getAppPool() for platform data. Never use getChurchRecordConnection.',
    severity: 'high',
  },
  missing_error_handling: {
    title: 'Missing Error Handling at System Boundary',
    constraint: 'All API endpoints must return appropriate HTTP status codes and structured error responses.',
    severity: 'medium',
  },
  inconsistent_naming: {
    title: 'Inconsistent Naming Convention',
    constraint: 'Follow existing codebase naming: camelCase for JS variables/functions, snake_case for DB columns, PascalCase for React components.',
    severity: 'low',
  },
  missing_auth_guard: {
    title: 'Missing Authentication Guard',
    constraint: 'All admin/ops API routes must use requireRole middleware. Never expose endpoints without auth.',
    severity: 'critical',
  },
  src_dist_mismatch: {
    title: 'Source/Dist Mismatch',
    constraint: 'JS changes must be applied to BOTH server/src/ and server/dist/ for immediate effect. Use deploy script.',
    severity: 'medium',
  },
};

/**
 * Known success pattern categories.
 */
const SUCCESS_CATEGORIES = {
  complete_execution: {
    title: 'Complete Execution Without Violations',
    severity: 'low',
  },
  high_quality_score: {
    title: 'High Quality Score Prompt',
    severity: 'low',
  },
  clean_first_pass: {
    title: 'Clean First-Pass Implementation',
    severity: 'low',
  },
  proper_pattern_reuse: {
    title: 'Proper Pattern Reuse',
    severity: 'low',
  },
};

/**
 * Known structural pattern categories.
 */
const STRUCTURAL_CATEGORIES = {
  effective_step_sequence: {
    title: 'Effective Step Sequence',
    severity: 'low',
  },
  optimal_component_split: {
    title: 'Optimal Component Split',
    severity: 'low',
  },
};

// ─── Core Recording ────────────────────────────────────────────────────────

/**
 * Record a violation occurrence. If the pattern already exists, increment
 * occurrences and check for severity escalation / global promotion.
 *
 * @param {object} params
 * @param {string} params.category - one of VIOLATION_CATEGORIES keys
 * @param {string} [params.component] - affected component
 * @param {string} [params.description] - specific violation description
 * @param {string} [params.workflow_id] - source workflow
 * @param {string} [params.prompt_id] - source prompt
 * @param {string} [params.constraint_override] - override default constraint
 * @returns {{ learning_id: string, is_new: boolean, occurrences: number, severity: string }}
 */
async function recordViolation({ category, component, description, workflow_id, prompt_id, constraint_override }) {
  if (!VIOLATION_CATEGORIES[category]) {
    throw new Error(`Unknown violation category: ${category}. Valid: ${Object.keys(VIOLATION_CATEGORIES).join(', ')}`);
  }

  const catDef = VIOLATION_CATEGORIES[category];
  const signature = buildSignature('violation_pattern', category, component || null);

  return _recordPattern({
    learning_type: 'violation_pattern',
    signature,
    title: catDef.title,
    description: description || catDef.title,
    constraint_text: constraint_override || catDef.constraint,
    default_severity: catDef.severity,
    component,
    workflow_id,
    prompt_id,
  });
}

/**
 * Record a success pattern occurrence.
 */
async function recordSuccess({ category, component, description, workflow_id, prompt_id }) {
  const catDef = SUCCESS_CATEGORIES[category];
  if (!catDef) {
    throw new Error(`Unknown success category: ${category}. Valid: ${Object.keys(SUCCESS_CATEGORIES).join(', ')}`);
  }

  const signature = buildSignature('success_pattern', category, component || null);

  return _recordPattern({
    learning_type: 'success_pattern',
    signature,
    title: catDef.title,
    description: description || catDef.title,
    constraint_text: null,
    default_severity: catDef.severity,
    component,
    workflow_id,
    prompt_id,
  });
}

/**
 * Record a structural pattern occurrence.
 */
async function recordStructural({ category, component, description, workflow_id, prompt_id, constraint_text }) {
  const catDef = STRUCTURAL_CATEGORIES[category];
  if (!catDef) {
    throw new Error(`Unknown structural category: ${category}. Valid: ${Object.keys(STRUCTURAL_CATEGORIES).join(', ')}`);
  }

  const signature = buildSignature('structural_pattern', category, component || null);

  return _recordPattern({
    learning_type: 'structural_pattern',
    signature,
    title: catDef.title,
    description: description || catDef.title,
    constraint_text: constraint_text || null,
    default_severity: catDef.severity,
    component,
    workflow_id,
    prompt_id,
  });
}

/**
 * Internal: record or update a pattern in the registry.
 */
async function _recordPattern({
  learning_type, signature, title, description, constraint_text,
  default_severity, component, workflow_id, prompt_id,
}) {
  const pool = getAppPool();

  // Check for existing pattern
  const [existing] = await pool.query(
    'SELECT * FROM workflow_learning_registry WHERE pattern_signature = ?',
    [signature]
  );

  if (existing.length > 0) {
    const record = existing[0];
    const newOccurrences = record.occurrences + 1;

    // Merge affected components
    let components = [];
    try { components = JSON.parse(record.affected_components || '[]'); } catch (e) { /* ignore */ }
    if (component && !components.includes(component)) components.push(component);

    // Merge source workflow IDs
    let wfIds = [];
    try { wfIds = JSON.parse(record.source_workflow_ids || '[]'); } catch (e) { /* ignore */ }
    if (workflow_id && !wfIds.includes(workflow_id)) wfIds.push(workflow_id);

    // Merge source prompt IDs
    let pIds = [];
    try { pIds = JSON.parse(record.source_prompt_ids || '[]'); } catch (e) { /* ignore */ }
    if (prompt_id && !pIds.includes(prompt_id)) pIds.push(prompt_id);

    // Check severity escalation
    let newSeverity = record.severity;
    const escalation = SEVERITY_ESCALATION[record.severity];
    if (escalation && newOccurrences >= escalation.threshold) {
      newSeverity = escalation.escalate_to;
    }

    // Check global threshold
    const isGlobal = newOccurrences >= GLOBAL_THRESHOLD ? 1 : record.global_candidate;

    await pool.query(
      `UPDATE workflow_learning_registry
       SET occurrences = ?, severity = ?, global_candidate = ?,
           affected_components = ?, source_workflow_ids = ?, source_prompt_ids = ?,
           last_seen_at = NOW()
       WHERE id = ?`,
      [newOccurrences, newSeverity, isGlobal,
       JSON.stringify(components), JSON.stringify(wfIds), JSON.stringify(pIds),
       record.id]
    );

    return {
      learning_id: record.id,
      is_new: false,
      occurrences: newOccurrences,
      severity: newSeverity,
      global_candidate: isGlobal === 1,
    };
  }

  // Create new pattern
  const id = uuidv4();
  const components = component ? JSON.stringify([component]) : JSON.stringify([]);
  const wfIds = workflow_id ? JSON.stringify([workflow_id]) : JSON.stringify([]);
  const pIds = prompt_id ? JSON.stringify([prompt_id]) : JSON.stringify([]);

  await pool.query(
    `INSERT INTO workflow_learning_registry
     (id, learning_type, pattern_signature, title, description, constraint_text,
      occurrences, severity, affected_components, source_workflow_ids, source_prompt_ids,
      active, global_candidate)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, 0)`,
    [id, learning_type, signature, title, description, constraint_text,
     default_severity, components, wfIds, pIds]
  );

  return {
    learning_id: id,
    is_new: true,
    occurrences: 1,
    severity: default_severity,
    global_candidate: false,
  };
}

// ─── Pattern Aggregation ───────────────────────────────────────────────────

/**
 * Run aggregation pass: promote patterns that crossed the global threshold
 * and escalate severities. This is idempotent.
 *
 * @returns {{ promoted: number, escalated: number }}
 */
async function aggregatePatterns() {
  const pool = getAppPool();
  let promoted = 0;
  let escalated = 0;

  // Promote to global candidate
  const [promoResult] = await pool.query(
    `UPDATE workflow_learning_registry
     SET global_candidate = 1
     WHERE active = 1 AND global_candidate = 0 AND occurrences >= ?`,
    [GLOBAL_THRESHOLD]
  );
  promoted = promoResult.affectedRows || 0;

  // Escalate severities
  for (const [severity, rule] of Object.entries(SEVERITY_ESCALATION)) {
    if (!rule) continue;
    const [escResult] = await pool.query(
      `UPDATE workflow_learning_registry
       SET severity = ?
       WHERE active = 1 AND severity = ? AND occurrences >= ?`,
      [rule.escalate_to, severity, rule.threshold]
    );
    escalated += escResult.affectedRows || 0;
  }

  return { promoted, escalated };
}

// ─── Constraint Query ──────────────────────────────────────────────────────

/**
 * Get applicable constraints for a given component and context.
 * Returns only active violation/structural patterns with constraint_text.
 *
 * Priority rules:
 *   - critical/high severity → always returned
 *   - medium → returned if component matches or is global candidate
 *   - low → returned only if component matches directly
 *
 * @param {string} [component] - target component (null = only global)
 * @param {object} [options]
 * @param {boolean} [options.includeAll] - include all active constraints regardless of priority
 * @returns {Array<{ learning_id, title, severity, constraint_text, occurrences, injection_reason }>}
 */
async function getConstraints(component, options = {}) {
  const pool = getAppPool();
  const { includeAll = false } = options;

  const [rows] = await pool.query(
    `SELECT id, learning_type, pattern_signature, title, description,
            constraint_text, occurrences, severity, affected_components,
            global_candidate
     FROM workflow_learning_registry
     WHERE active = 1 AND constraint_text IS NOT NULL AND constraint_text != ''
     ORDER BY
       FIELD(severity, 'critical', 'high', 'medium', 'low'),
       occurrences DESC`
  );

  const constraints = [];

  for (const row of rows) {
    let components = [];
    try { components = JSON.parse(row.affected_components || '[]'); } catch (e) { /* ignore */ }

    const componentMatch = component && components.includes(component);
    const isGlobal = row.global_candidate === 1;

    let include = false;
    let reason = '';

    if (includeAll) {
      include = true;
      reason = `Active pattern (${row.occurrences} occurrences)`;
    } else if (row.severity === 'critical' || row.severity === 'high') {
      // Always inject high/critical
      include = true;
      reason = `${row.severity} severity pattern (${row.occurrences} occurrences)`;
    } else if (row.severity === 'medium') {
      // Inject if component matches or global
      if (componentMatch || isGlobal) {
        include = true;
        reason = componentMatch
          ? `Medium severity, component match (${row.occurrences} occurrences)`
          : `Medium severity, global candidate (${row.occurrences} occurrences)`;
      }
    } else if (row.severity === 'low') {
      // Only inject if component matches directly
      if (componentMatch) {
        include = true;
        reason = `Low severity, direct component match (${row.occurrences} occurrences)`;
      }
    }

    if (include) {
      constraints.push({
        learning_id: row.id,
        title: row.title,
        severity: row.severity,
        constraint_text: row.constraint_text,
        occurrences: row.occurrences,
        injection_reason: reason,
        pattern_signature: row.pattern_signature,
      });
    }
  }

  return constraints;
}

// ─── Injection Tracking ────────────────────────────────────────────────────

/**
 * Record that a constraint was injected into a prompt (traceability).
 */
async function recordInjection({ learning_id, prompt_id, workflow_id, constraint_text, injection_reason }) {
  const pool = getAppPool();
  const id = uuidv4();

  await pool.query(
    `INSERT INTO workflow_learning_injections
     (id, learning_id, prompt_id, workflow_id, constraint_text, injection_reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, learning_id, prompt_id, workflow_id, constraint_text, injection_reason]
  );

  return { injection_id: id };
}

/**
 * Get injection history for a prompt.
 */
async function getInjectionsForPrompt(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT i.*, r.title as learning_title, r.pattern_signature, r.severity
     FROM workflow_learning_injections i
     JOIN workflow_learning_registry r ON r.id = i.learning_id
     WHERE i.prompt_id = ?
     ORDER BY i.created_at DESC`,
    [promptId]
  );
  return rows;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

/**
 * List all learnings with optional filters.
 */
async function listLearnings(filters = {}) {
  const pool = getAppPool();
  const where = ['1=1'];
  const params = [];

  if (filters.learning_type) {
    where.push('learning_type = ?');
    params.push(filters.learning_type);
  }
  if (filters.severity) {
    where.push('severity = ?');
    params.push(filters.severity);
  }
  if (filters.active !== undefined) {
    where.push('active = ?');
    params.push(filters.active ? 1 : 0);
  }
  if (filters.global_candidate !== undefined) {
    where.push('global_candidate = ?');
    params.push(filters.global_candidate ? 1 : 0);
  }
  if (filters.search) {
    where.push('(title LIKE ? OR description LIKE ? OR pattern_signature LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  const [rows] = await pool.query(
    `SELECT * FROM workflow_learning_registry
     WHERE ${where.join(' AND ')}
     ORDER BY
       FIELD(severity, 'critical', 'high', 'medium', 'low'),
       occurrences DESC,
       last_seen_at DESC`,
    params
  );

  return rows.map(r => ({
    ...r,
    affected_components: _parseJSON(r.affected_components, []),
    source_workflow_ids: _parseJSON(r.source_workflow_ids, []),
    source_prompt_ids: _parseJSON(r.source_prompt_ids, []),
  }));
}

/**
 * Get a single learning by ID.
 */
async function getLearningById(id) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM workflow_learning_registry WHERE id = ?', [id]);
  if (rows.length === 0) return null;

  const r = rows[0];
  r.affected_components = _parseJSON(r.affected_components, []);
  r.source_workflow_ids = _parseJSON(r.source_workflow_ids, []);
  r.source_prompt_ids = _parseJSON(r.source_prompt_ids, []);

  // Get injection history
  const [injections] = await pool.query(
    'SELECT * FROM workflow_learning_injections WHERE learning_id = ? ORDER BY created_at DESC LIMIT 20',
    [id]
  );
  r.recent_injections = injections;

  return r;
}

/**
 * Disable a learning pattern.
 */
async function disableLearning(id) {
  const pool = getAppPool();
  const [result] = await pool.query(
    'UPDATE workflow_learning_registry SET active = 0 WHERE id = ?',
    [id]
  );
  if (result.affectedRows === 0) throw new Error('Learning not found');
  return { success: true };
}

/**
 * Enable a learning pattern.
 */
async function enableLearning(id) {
  const pool = getAppPool();
  const [result] = await pool.query(
    'UPDATE workflow_learning_registry SET active = 1 WHERE id = ?',
    [id]
  );
  if (result.affectedRows === 0) throw new Error('Learning not found');
  return { success: true };
}

/**
 * Adjust severity of a learning pattern.
 */
async function setSeverity(id, severity) {
  if (!VALID_SEVERITIES.includes(severity)) {
    throw new Error(`Invalid severity: ${severity}. Valid: ${VALID_SEVERITIES.join(', ')}`);
  }
  const pool = getAppPool();
  const [result] = await pool.query(
    'UPDATE workflow_learning_registry SET severity = ? WHERE id = ?',
    [severity, id]
  );
  if (result.affectedRows === 0) throw new Error('Learning not found');
  return { success: true };
}

/**
 * Mark a learning pattern as resolved.
 */
async function resolveLearning(id, resolvedBy) {
  const pool = getAppPool();
  const [result] = await pool.query(
    'UPDATE workflow_learning_registry SET active = 0, resolved_at = NOW(), resolved_by = ? WHERE id = ?',
    [resolvedBy, id]
  );
  if (result.affectedRows === 0) throw new Error('Learning not found');
  return { success: true };
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────

/**
 * Get aggregated stats for the learning dashboard.
 */
async function getStats() {
  const pool = getAppPool();

  const [typeCounts] = await pool.query(
    `SELECT learning_type, COUNT(*) as count, SUM(occurrences) as total_occurrences
     FROM workflow_learning_registry WHERE active = 1
     GROUP BY learning_type`
  );

  const [severityCounts] = await pool.query(
    `SELECT severity, COUNT(*) as count
     FROM workflow_learning_registry WHERE active = 1
     GROUP BY severity`
  );

  const [topViolations] = await pool.query(
    `SELECT id, title, pattern_signature, occurrences, severity, affected_components, last_seen_at
     FROM workflow_learning_registry
     WHERE active = 1 AND learning_type = 'violation_pattern'
     ORDER BY occurrences DESC LIMIT 10`
  );

  const [topSuccesses] = await pool.query(
    `SELECT id, title, pattern_signature, occurrences, severity, affected_components, last_seen_at
     FROM workflow_learning_registry
     WHERE active = 1 AND learning_type = 'success_pattern'
     ORDER BY occurrences DESC LIMIT 10`
  );

  const [globalCandidates] = await pool.query(
    `SELECT id, title, pattern_signature, occurrences, severity, learning_type
     FROM workflow_learning_registry
     WHERE active = 1 AND global_candidate = 1
     ORDER BY occurrences DESC`
  );

  const [recentInjections] = await pool.query(
    `SELECT i.id, i.prompt_id, i.workflow_id, i.injection_reason, i.created_at,
            r.title as learning_title, r.severity
     FROM workflow_learning_injections i
     JOIN workflow_learning_registry r ON r.id = i.learning_id
     ORDER BY i.created_at DESC LIMIT 20`
  );

  const [totalActive] = await pool.query(
    'SELECT COUNT(*) as count FROM workflow_learning_registry WHERE active = 1'
  );

  const [totalInjections] = await pool.query(
    'SELECT COUNT(*) as count FROM workflow_learning_injections'
  );

  return {
    total_active: totalActive[0].count,
    total_injections: totalInjections[0].count,
    by_type: typeCounts.map(r => ({
      type: r.learning_type,
      count: r.count,
      total_occurrences: r.total_occurrences,
    })),
    by_severity: severityCounts.map(r => ({
      severity: r.severity,
      count: r.count,
    })),
    top_violations: topViolations.map(r => ({
      ...r,
      affected_components: _parseJSON(r.affected_components, []),
    })),
    top_successes: topSuccesses.map(r => ({
      ...r,
      affected_components: _parseJSON(r.affected_components, []),
    })),
    global_candidates: globalCandidates,
    recent_injections: recentInjections,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function _parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') || fallback; } catch { return fallback; }
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  VALID_LEARNING_TYPES,
  VALID_SEVERITIES,
  GLOBAL_THRESHOLD,
  SEVERITY_ESCALATION,
  VIOLATION_CATEGORIES,
  SUCCESS_CATEGORIES,
  STRUCTURAL_CATEGORIES,
  buildSignature,

  // Core recording
  recordViolation,
  recordSuccess,
  recordStructural,

  // Aggregation
  aggregatePatterns,

  // Constraint query
  getConstraints,

  // Injection tracking
  recordInjection,
  getInjectionsForPrompt,

  // CRUD
  listLearnings,
  getLearningById,
  disableLearning,
  enableLearning,
  setSeverity,
  resolveLearning,

  // Stats
  getStats,
};
