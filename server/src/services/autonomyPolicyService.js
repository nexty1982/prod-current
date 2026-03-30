/**
 * Autonomy Policy Service
 *
 * Formal policy model governing how far the Prompt Workflow System may
 * advance autonomously. Every autonomous action must pass through this
 * service before execution.
 *
 * MODES (strictly ordered — each level adds to the previous):
 *
 *   OFF             — No autonomous actions of any kind
 *   RELEASE_ONLY    — May release prompts that pass all safety gates (existing behavior)
 *   SAFE_ADVANCE    — RELEASE_ONLY + may advance one step after a verified result
 *   SUPERVISED_FLOW — SAFE_ADVANCE + may chain multiple steps until a pause condition
 *
 * DESIGN PRINCIPLES:
 *   1. Safety over autonomy — if any gate fails, stop
 *   2. Deterministic — same state → same decision, every time
 *   3. Traceable — every decision logged with full reasoning
 *   4. Operator override — manual_only flags, pause/resume, mode changes
 *   5. No duplicate logic — reuses decision engine, evaluation, scoring
 *
 * AUTONOMOUS ACTION TYPES:
 *   RELEASE          — Release a prompt for execution
 *   TRIGGER_EVAL     — Trigger evaluation after execution completes
 *   QUEUE_NEXT       — Queue the next prompt in a workflow step sequence
 *   ADVANCE_WORKFLOW — Advance workflow status when all steps verified
 *
 * NOT ALLOWED (require explicit operator action):
 *   - Disabling learning patterns
 *   - Overriding severity
 *   - Bypassing audit
 *   - Mutating template definitions
 *   - Changing routing rules
 *   - Resolving escalations
 */

const { getAppPool } = require('../config/db');

// ─── Autonomy Modes ─────────────────────────────────────────────────────────

const AUTONOMY_MODE = {
  OFF: 'OFF',
  RELEASE_ONLY: 'RELEASE_ONLY',
  SAFE_ADVANCE: 'SAFE_ADVANCE',
  SUPERVISED_FLOW: 'SUPERVISED_FLOW',
};

const MODE_ORDER = [
  AUTONOMY_MODE.OFF,
  AUTONOMY_MODE.RELEASE_ONLY,
  AUTONOMY_MODE.SAFE_ADVANCE,
  AUTONOMY_MODE.SUPERVISED_FLOW,
];

// ─── Autonomous Action Types ────────────────────────────────────────────────

const ACTION_TYPE = {
  RELEASE: 'RELEASE',
  TRIGGER_EVAL: 'TRIGGER_EVAL',
  QUEUE_NEXT: 'QUEUE_NEXT',
  ADVANCE_WORKFLOW: 'ADVANCE_WORKFLOW',
};

/**
 * Which modes allow which action types.
 * Each entry lists the MINIMUM mode required.
 */
const ACTION_MODE_REQUIREMENTS = {
  [ACTION_TYPE.RELEASE]:          AUTONOMY_MODE.RELEASE_ONLY,
  [ACTION_TYPE.TRIGGER_EVAL]:     AUTONOMY_MODE.SAFE_ADVANCE,
  [ACTION_TYPE.QUEUE_NEXT]:       AUTONOMY_MODE.SAFE_ADVANCE,
  [ACTION_TYPE.ADVANCE_WORKFLOW]: AUTONOMY_MODE.SAFE_ADVANCE,
};

/**
 * Check if the current mode permits a given action type.
 * Deterministic: mode ordering is fixed.
 */
function modePermitsAction(currentMode, actionType) {
  const requiredMode = ACTION_MODE_REQUIREMENTS[actionType];
  if (!requiredMode) return false;
  const currentLevel = MODE_ORDER.indexOf(currentMode);
  const requiredLevel = MODE_ORDER.indexOf(requiredMode);
  if (currentLevel < 0 || requiredLevel < 0) return false;
  return currentLevel >= requiredLevel;
}

// ─── Safety Gates ───────────────────────────────────────────────────────────
//
// Autonomous advancement is ONLY allowed when ALL gates pass.
// Each gate is a pure function: (prompt, workflow, step) => { pass, reason }
//
// GATE TABLE:
// ┌────┬───────────────────────────────────────┬──────────────────────────────────────────┐
// │ #  │ Gate                                  │ Blocks When                              │
// ├────┼───────────────────────────────────────┼──────────────────────────────────────────┤
// │ G1 │ confidence_level = high               │ confidence is medium, low, or unknown    │
// │ G2 │ evaluator_status = pass               │ evaluator pending or failed              │
// │ G3 │ completion_status = complete           │ partial, failed, blocked                 │
// │ G4 │ no degradation_flag                   │ degradation detected in chain            │
// │ G5 │ no escalation_required                │ escalation flag set                      │
// │ G6 │ dependencies satisfied                │ queue_status blocked or pending           │
// │ G7 │ no manual_only on prompt              │ operator locked this prompt              │
// │ G8 │ no manual_only on step                │ operator locked this step                │
// │ G9 │ no manual_only on workflow            │ operator locked this workflow             │
// │G10 │ workflow not autonomy_paused          │ operator paused autonomy on this workflow │
// │G11 │ no unresolved learning conflicts      │ active critical violation for component   │
// │G12 │ agent result is final/selected        │ multi-agent selection not complete        │
// └────┴───────────────────────────────────────┴──────────────────────────────────────────┘

const SAFETY_GATES = [
  {
    id: 'G1', name: 'confidence_high',
    test: (ctx) => ctx.prompt.confidence_level === 'high',
    reason: (ctx) => `Confidence is ${ctx.prompt.confidence_level || 'unknown'}, must be high`,
  },
  {
    id: 'G2', name: 'evaluator_passed',
    test: (ctx) => ctx.prompt.evaluator_status === 'pass',
    reason: (ctx) => `Evaluator status is ${ctx.prompt.evaluator_status || 'pending'}, must be pass`,
  },
  {
    id: 'G3', name: 'completion_complete',
    test: (ctx) => ctx.prompt.completion_status === 'complete',
    reason: (ctx) => `Completion status is ${ctx.prompt.completion_status || 'null'}, must be complete`,
  },
  {
    id: 'G4', name: 'no_degradation',
    test: (ctx) => !ctx.prompt.degradation_flag,
    reason: () => 'Degradation flag is set — chain quality declining',
  },
  {
    id: 'G5', name: 'no_escalation',
    test: (ctx) => !ctx.prompt.escalation_required,
    reason: () => 'Escalation required — must be resolved manually',
  },
  {
    id: 'G6', name: 'dependencies_satisfied',
    test: (ctx) => !['blocked', 'pending'].includes(ctx.prompt.queue_status),
    reason: (ctx) => `Queue status is ${ctx.prompt.queue_status} — dependencies not satisfied`,
  },
  {
    id: 'G7', name: 'prompt_not_manual_only',
    test: (ctx) => !ctx.prompt.manual_only,
    reason: () => 'Prompt is marked manual_only by operator',
  },
  {
    id: 'G8', name: 'step_not_manual_only',
    test: (ctx) => !ctx.step || !ctx.step.manual_only,
    reason: () => 'Workflow step is marked manual_only by operator',
  },
  {
    id: 'G9', name: 'workflow_not_manual_only',
    test: (ctx) => !ctx.workflow || !ctx.workflow.manual_only,
    reason: () => 'Workflow is marked manual_only by operator',
  },
  {
    id: 'G10', name: 'workflow_not_paused',
    test: (ctx) => !ctx.workflow || !ctx.workflow.autonomy_paused,
    reason: (ctx) => `Workflow autonomy paused: ${ctx.workflow?.autonomy_pause_reason || 'no reason given'}`,
  },
  {
    id: 'G11', name: 'no_critical_learning_conflict',
    test: (ctx) => !ctx.hasCriticalLearningConflict,
    reason: () => 'Active critical violation pattern exists for this component',
  },
  {
    id: 'G12', name: 'agent_result_final',
    test: (ctx) => ctx.agentResultFinal !== false,
    reason: () => 'Multi-agent selection not yet complete',
  },
];

/**
 * Evaluate all safety gates for an autonomous action.
 * Returns { safe, failures[], passed[] }
 *
 * @param {object} ctx - Context: { prompt, workflow, step, hasCriticalLearningConflict, agentResultFinal }
 */
function evaluateSafetyGates(ctx) {
  const failures = [];
  const passed = [];

  for (const gate of SAFETY_GATES) {
    if (gate.test(ctx)) {
      passed.push({ id: gate.id, name: gate.name });
    } else {
      failures.push({ id: gate.id, name: gate.name, reason: gate.reason(ctx) });
    }
  }

  return {
    safe: failures.length === 0,
    failures,
    passed,
    passed_count: passed.length,
    total_gates: SAFETY_GATES.length,
  };
}

// ─── Pause Conditions ───────────────────────────────────────────────────────
//
// Autonomy must automatically pause when any of these conditions appear.
// These are checked DURING chained execution (SUPERVISED_FLOW mode) to
// determine when to stop advancing.
//
// PAUSE TABLE:
// ┌────┬────────────────────────────────────────┬─────────────────────────────────────┐
// │ #  │ Condition                              │ Pause Reason                        │
// ├────┼────────────────────────────────────────┼─────────────────────────────────────┤
// │ P1 │ Decision engine: FIX_REQUIRED          │ Prompt needs fix before advancing   │
// │ P2 │ Decision engine: UNBLOCK_REQUIRED      │ Blocked dependency                  │
// │ P3 │ Decision engine: REVIEW_REQUIRED       │ Manual review needed                │
// │ P4 │ Degradation detected                   │ Chain quality declining              │
// │ P5 │ Confidence below threshold             │ Not confident enough for autonomy   │
// │ P6 │ Agent comparison inconclusive          │ Multi-agent selection unclear         │
// │ P7 │ Repeated corrections in chain          │ Same step corrected 2+ times         │
// │ P8 │ Step marked manual-only                │ Operator locked this step             │
// └────┴────────────────────────────────────────┴─────────────────────────────────────┘

const PAUSE_CONDITIONS = [
  {
    id: 'P1', name: 'fix_required',
    test: (ctx) => ctx.recommendation?.action === 'FIX_REQUIRED',
    reason: () => 'Decision engine recommends FIX_REQUIRED',
  },
  {
    id: 'P2', name: 'unblock_required',
    test: (ctx) => ctx.recommendation?.action === 'UNBLOCK_REQUIRED',
    reason: () => 'Decision engine recommends UNBLOCK_REQUIRED',
  },
  {
    id: 'P3', name: 'review_required',
    test: (ctx) => ctx.recommendation?.action === 'REVIEW_REQUIRED',
    reason: () => 'Decision engine recommends REVIEW_REQUIRED — manual review needed',
  },
  {
    id: 'P4', name: 'degradation_detected',
    test: (ctx) => !!ctx.prompt?.degradation_flag,
    reason: () => 'Degradation flag detected in chain',
  },
  {
    id: 'P5', name: 'confidence_below_threshold',
    test: (ctx) => ctx.prompt?.confidence_level === 'low' || ctx.prompt?.confidence_level === 'unknown',
    reason: (ctx) => `Confidence is ${ctx.prompt?.confidence_level} — below autonomy threshold`,
  },
  {
    id: 'P6', name: 'comparison_inconclusive',
    test: (ctx) => ctx.comparisonInconclusive === true,
    reason: () => 'Multi-agent comparison result is inconclusive',
  },
  {
    id: 'P7', name: 'repeated_corrections',
    test: (ctx) => (ctx.correctionCount || 0) >= 2,
    reason: (ctx) => `Step has been corrected ${ctx.correctionCount} times — manual intervention required`,
  },
  {
    id: 'P8', name: 'step_manual_only',
    test: (ctx) => !!ctx.step?.manual_only,
    reason: () => 'Next step is marked manual-only by operator',
  },
];

/**
 * Check if autonomy should pause for the current context.
 * Returns { shouldPause, reasons[] } — first matching reason triggers pause.
 */
function checkPauseConditions(ctx) {
  const reasons = [];
  for (const cond of PAUSE_CONDITIONS) {
    if (cond.test(ctx)) {
      reasons.push({ id: cond.id, name: cond.name, reason: cond.reason(ctx) });
    }
  }
  return {
    shouldPause: reasons.length > 0,
    reasons,
  };
}

// ─── Settings Management ────────────────────────────────────────────────────

const SETTINGS = {
  MODE: 'autonomy_mode',
  ENABLED: 'autonomy_enabled',
};

async function _getSetting(key, defaultValue) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT value_multilang FROM system_settings WHERE key_name = ?',
    [key]
  );
  if (rows.length === 0) return defaultValue;
  try {
    const raw = JSON.parse(rows[0].value_multilang);
    return raw;
  } catch {
    return rows[0].value_multilang;
  }
}

async function _setSetting(key, value, dataType = 'string', category = 'autonomy') {
  const pool = getAppPool();
  const jsonValue = typeof value === 'object' ? JSON.stringify(value) : JSON.stringify(String(value));
  await pool.query(
    `INSERT INTO system_settings (key_name, value_multilang, data_type, category)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value_multilang = ?, updated_at = NOW()`,
    [key, jsonValue, dataType, category, jsonValue]
  );
}

/**
 * Get current autonomy status.
 */
async function getStatus() {
  const mode = await _getSetting(SETTINGS.MODE, AUTONOMY_MODE.OFF);
  const enabled = await _getSetting(SETTINGS.ENABLED, 'false');

  return {
    enabled: enabled === 'true' || enabled === true,
    mode: MODE_ORDER.includes(mode) ? mode : AUTONOMY_MODE.OFF,
    allowed_actions: Object.entries(ACTION_MODE_REQUIREMENTS)
      .filter(([, required]) => {
        const cur = MODE_ORDER.indexOf(MODE_ORDER.includes(mode) ? mode : AUTONOMY_MODE.OFF);
        const req = MODE_ORDER.indexOf(required);
        return cur >= req;
      })
      .map(([action]) => action),
  };
}

/**
 * Set autonomy mode. Validates mode is known.
 */
async function setMode(mode) {
  if (!MODE_ORDER.includes(mode)) {
    throw new Error(`Invalid autonomy mode: ${mode}. Valid: ${MODE_ORDER.join(', ')}`);
  }
  if (mode === AUTONOMY_MODE.OFF) {
    await _setSetting(SETTINGS.ENABLED, 'false', 'boolean');
  } else {
    await _setSetting(SETTINGS.ENABLED, 'true', 'boolean');
  }
  await _setSetting(SETTINGS.MODE, mode);
  return getStatus();
}

// ─── Workflow Pause / Resume ────────────────────────────────────────────────

/**
 * Pause autonomy on a specific workflow.
 */
async function pauseWorkflow(workflowId, reason) {
  const pool = getAppPool();
  const [result] = await pool.query(
    `UPDATE prompt_workflows
     SET autonomy_paused = 1, autonomy_pause_reason = ?, autonomy_paused_at = NOW()
     WHERE id = ?`,
    [reason || 'Paused by operator', workflowId]
  );
  if (result.affectedRows === 0) throw new Error('Workflow not found');
  return { success: true, workflow_id: workflowId, paused: true, reason };
}

/**
 * Resume autonomy on a specific workflow.
 */
async function resumeWorkflow(workflowId) {
  const pool = getAppPool();
  const [result] = await pool.query(
    `UPDATE prompt_workflows
     SET autonomy_paused = 0, autonomy_pause_reason = NULL, autonomy_resumed_at = NOW()
     WHERE id = ?`,
    [workflowId]
  );
  if (result.affectedRows === 0) throw new Error('Workflow not found');
  return { success: true, workflow_id: workflowId, paused: false };
}

/**
 * Set manual_only flag on workflow, step, or prompt.
 */
async function setManualOnly(targetType, targetId, manualOnly) {
  const pool = getAppPool();
  const flag = manualOnly ? 1 : 0;
  let table;
  if (targetType === 'workflow') table = 'prompt_workflows';
  else if (targetType === 'step') table = 'prompt_workflow_steps';
  else if (targetType === 'prompt') table = 'om_prompt_registry';
  else throw new Error(`Invalid target_type: ${targetType}. Must be workflow, step, or prompt`);

  const [result] = await pool.query(
    `UPDATE ${table} SET manual_only = ? WHERE id = ?`,
    [flag, targetId]
  );
  if (result.affectedRows === 0) throw new Error(`${targetType} not found: ${targetId}`);
  return { success: true, target_type: targetType, target_id: targetId, manual_only: !!manualOnly };
}

// ─── Autonomy Logging ───────────────────────────────────────────────────────

/**
 * Log an autonomous action to system_logs. Every action is recorded.
 *
 * @param {string} action - ACTION_TYPE value
 * @param {object} details - Full context: target, mode, gates passed, previous/new state
 * @param {string} level - 'SUCCESS' | 'PAUSED' | 'BLOCKED' | 'ERROR'
 */
async function logAutonomousAction(action, details, level = 'SUCCESS') {
  const pool = getAppPool();
  const logLevel = level === 'SUCCESS' ? 'INFO'
    : level === 'PAUSED' ? 'WARN'
    : level === 'BLOCKED' ? 'WARN'
    : 'ERROR';

  const message = level === 'SUCCESS'
    ? `Autonomous ${action}: ${details.target_title || details.target_id} — mode ${details.mode}`
    : level === 'PAUSED'
    ? `Autonomy PAUSED on ${details.target_title || details.target_id}: ${details.pause_reason}`
    : level === 'BLOCKED'
    ? `Autonomy BLOCKED: ${details.block_reason}`
    : `Autonomy ERROR: ${details.error}`;

  try {
    await pool.query(
      `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
       VALUES (NOW(), ?, 'autonomous_advance', ?, ?, 'system:autonomy', 'autonomy', 'prompt_workflows')`,
      [logLevel, message, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[Autonomy] Failed to write log:', err.message);
  }
}

/**
 * Get recent autonomy logs.
 */
async function getLogs(limit = 50) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT timestamp, level, message, meta
     FROM system_logs
     WHERE source = 'autonomous_advance'
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map(r => ({
    timestamp: r.timestamp,
    level: r.level,
    message: r.message,
    meta: r.meta ? (() => { try { return JSON.parse(r.meta); } catch { return null; } })() : null,
  }));
}

/**
 * Get workflows that are currently paused by autonomy policy.
 */
async function getPausedWorkflows() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT id, name, component, status, autonomy_pause_reason, autonomy_paused_at
     FROM prompt_workflows
     WHERE autonomy_paused = 1 AND status IN ('active', 'approved')
     ORDER BY autonomy_paused_at DESC`
  );
  return rows;
}

// ─── Learning Conflict Check ────────────────────────────────────────────────

/**
 * Check if there's an active critical violation pattern for a component.
 * This prevents autonomy from advancing through components with known
 * critical issues.
 */
async function hasCriticalLearningConflict(component) {
  if (!component) return false;
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as cnt FROM workflow_learning_registry
     WHERE active = 1 AND severity = 'critical'
       AND learning_type = 'violation_pattern'
       AND affected_components LIKE ?`,
    [`%"${component}"%`]
  );
  return Number(rows[0].cnt) > 0;
}

/**
 * Count how many times a chain step has been corrected.
 */
async function getCorrectionCount(promptId) {
  if (!promptId) return 0;
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as cnt FROM om_prompt_registry
     WHERE parent_prompt_id = ? AND result_type = 'correction'`,
    [promptId]
  );
  return Number(rows[0].cnt);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Modes & Types
  AUTONOMY_MODE,
  MODE_ORDER,
  ACTION_TYPE,
  ACTION_MODE_REQUIREMENTS,

  // Policy evaluation
  modePermitsAction,
  evaluateSafetyGates,
  SAFETY_GATES,
  checkPauseConditions,
  PAUSE_CONDITIONS,

  // Settings
  getStatus,
  setMode,

  // Workflow control
  pauseWorkflow,
  resumeWorkflow,
  setManualOnly,
  getPausedWorkflows,

  // Logging
  logAutonomousAction,
  getLogs,

  // Context helpers
  hasCriticalLearningConflict,
  getCorrectionCount,
};
