/**
 * Auto-Execution Policy Service
 *
 * Deterministic policy engine that evaluates decision engine output and
 * determines which actions are eligible for automatic execution.
 *
 * DESIGN PRINCIPLES:
 *   1. Safety over speed — only provably safe actions auto-execute
 *   2. Determinism — same input → same eligibility decision, every time
 *   3. Transparency — every decision is logged with full reasoning
 *   4. Control — operator can disable globally, per-mode, or per-prompt
 *
 * EXECUTION MODES:
 *   OFF  — no auto-execution (default on first use)
 *   SAFE — only fully safe RELEASE_NOW actions (strict eligibility)
 *   FULL — expanded rules (still deterministic, future-ready)
 *
 * ELIGIBILITY (SAFE mode — ALL must be true):
 *   ✓ action type = RELEASE_NOW
 *   ✓ confidence_level = high
 *   ✓ evaluator_status = pass
 *   ✓ completion_status = complete
 *   ✓ no escalation_required
 *   ✓ no degradation_flag
 *   ✓ dependencies satisfied (queue_status = ready_for_release or overdue)
 *   ✓ release_mode allows auto (auto_safe or auto_full)
 *   ✓ no prior failures in same chain step
 *   ✓ not excluded by operator (auto_execute_excluded flag)
 */

const { getAppPool } = require('../config/db');

// ─── Execution Modes ──────────────────────────────────────────────────────

const MODE = {
  OFF: 'OFF',
  SAFE: 'SAFE',
  FULL: 'FULL',
};

// ─── Settings Keys ────────────────────────────────────────────────────────

const SETTINGS = {
  ENABLED: 'auto_execution_enabled',
  MODE: 'auto_execution_mode',
  LAST_RUN_AT: 'auto_execution_last_run_at',
  LAST_RUN_RESULT: 'auto_execution_last_run_result',
};

// ─── Eligibility Rules (SAFE mode) ───────────────────────────────────────
//
// Each rule returns { eligible: false, reason } on failure, or null on pass.
// ALL rules must pass for a prompt to be auto-executable.

const SAFE_RULES = [
  {
    id: 'E1',
    name: 'action_is_release',
    test: (rec) => rec.action === 'RELEASE_NOW',
    reason: (rec) => `Action is ${rec.action}, not RELEASE_NOW`,
  },
  {
    id: 'E2',
    name: 'confidence_high',
    test: (rec, prompt) => prompt.confidence_level === 'high',
    reason: (rec, prompt) => `Confidence is ${prompt.confidence_level}, not high`,
  },
  {
    id: 'E3',
    name: 'evaluator_passed',
    test: (rec, prompt) => prompt.evaluator_status === 'pass',
    reason: (rec, prompt) => `Evaluator status is ${prompt.evaluator_status || 'null'}, not pass`,
  },
  {
    id: 'E4',
    name: 'completion_complete',
    test: (rec, prompt) => prompt.completion_status === 'complete',
    reason: (rec, prompt) => `Completion status is ${prompt.completion_status || 'null'}, not complete`,
  },
  {
    id: 'E5',
    name: 'no_escalation',
    test: (rec, prompt) => !prompt.escalation_required,
    reason: () => 'Escalation required — cannot auto-execute',
  },
  {
    id: 'E6',
    name: 'no_degradation',
    test: (rec, prompt) => !prompt.degradation_flag,
    reason: () => 'Degradation flag set — cannot auto-execute',
  },
  {
    id: 'E7',
    name: 'dependencies_satisfied',
    test: (rec, prompt) => ['ready_for_release', 'overdue'].includes(prompt.queue_status),
    reason: (rec, prompt) => `Queue status is ${prompt.queue_status} — dependencies not satisfied`,
  },
  {
    id: 'E8',
    name: 'release_mode_allows_auto',
    test: (rec, prompt) => ['auto_safe', 'auto_full'].includes(prompt.release_mode),
    reason: (rec, prompt) => `Release mode is ${prompt.release_mode} — auto-execution not allowed`,
  },
  {
    id: 'E9',
    name: 'no_prior_chain_failure',
    test: (rec, prompt) => !prompt._has_chain_failure,
    reason: () => 'Prior failure detected in same chain step — manual review required',
  },
  {
    id: 'E10',
    name: 'not_excluded',
    test: (rec, prompt) => !prompt._auto_execute_excluded,
    reason: () => 'Prompt explicitly excluded from auto-execution by operator',
  },
];

// FULL mode includes SAFE rules plus relaxed confidence
const FULL_RULES = SAFE_RULES.map(rule => {
  if (rule.id === 'E2') {
    return {
      ...rule,
      name: 'confidence_acceptable',
      test: (rec, prompt) => ['high', 'medium'].includes(prompt.confidence_level),
      reason: (rec, prompt) => `Confidence is ${prompt.confidence_level}, must be high or medium`,
    };
  }
  return rule;
});

// ─── Core: Evaluate Eligibility ───────────────────────────────────────────

/**
 * Evaluate a single recommendation for auto-execution eligibility.
 * Returns { eligible, prompt_id, failures[], passed_rules[] }
 */
function evaluateEligibility(recommendation, prompt, mode = MODE.SAFE) {
  const rules = mode === MODE.FULL ? FULL_RULES : SAFE_RULES;
  const failures = [];
  const passed = [];

  for (const rule of rules) {
    if (rule.test(recommendation, prompt)) {
      passed.push({ id: rule.id, name: rule.name });
    } else {
      failures.push({
        id: rule.id,
        name: rule.name,
        reason: rule.reason(recommendation, prompt),
      });
    }
  }

  return {
    eligible: failures.length === 0,
    prompt_id: prompt.id,
    title: prompt.title,
    mode,
    passed_rules: passed,
    failures,
    passed_count: passed.length,
    total_rules: rules.length,
  };
}

// ─── Settings Management ──────────────────────────────────────────────────

async function getSetting(key, defaultValue = null) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT value_multilang, data_type FROM system_settings WHERE key_name = ?',
    [key]
  );
  if (rows.length === 0) return defaultValue;
  const row = rows[0];
  // value_multilang is stored as JSON (json_valid constraint) — unwrap it
  let raw;
  try { raw = JSON.parse(row.value_multilang); } catch { raw = row.value_multilang; }
  if (row.data_type === 'boolean') return raw === 'true' || raw === true;
  if (row.data_type === 'json') {
    // raw is already parsed from the outer JSON.parse; if it's still a string, parse again
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return defaultValue; }
    }
    return raw;
  }
  return raw;
}

async function setSetting(key, value, dataType = 'string', category = 'auto_execution') {
  const pool = getAppPool();
  // value_multilang has a json_valid() CHECK constraint — all values must be valid JSON
  const jsonValue = typeof value === 'object' ? JSON.stringify(value) : JSON.stringify(String(value));
  await pool.query(
    `INSERT INTO system_settings (key_name, value_multilang, data_type, category)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value_multilang = ?, updated_at = NOW()`,
    [key, jsonValue, dataType, category, jsonValue]
  );
}

// ─── Policy State ─────────────────────────────────────────────────────────

async function getStatus() {
  const enabled = await getSetting(SETTINGS.ENABLED, false);
  const mode = await getSetting(SETTINGS.MODE, MODE.SAFE);
  const lastRunAt = await getSetting(SETTINGS.LAST_RUN_AT, null);
  const lastRunResult = await getSetting(SETTINGS.LAST_RUN_RESULT, null);

  return {
    enabled: enabled === true || enabled === 'true',
    mode: Object.values(MODE).includes(mode) ? mode : MODE.SAFE,
    last_run_at: lastRunAt,
    last_run_result: lastRunResult ? (typeof lastRunResult === 'string' ? (() => { try { return JSON.parse(lastRunResult); } catch { return null; } })() : lastRunResult) : null,
  };
}

async function enable() {
  await setSetting(SETTINGS.ENABLED, 'true', 'boolean');
  return getStatus();
}

async function disable() {
  await setSetting(SETTINGS.ENABLED, 'false', 'boolean');
  return getStatus();
}

async function setMode(mode) {
  if (!Object.values(MODE).includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be one of: ${Object.values(MODE).join(', ')}`);
  }
  if (mode === MODE.OFF) {
    await setSetting(SETTINGS.ENABLED, 'false', 'boolean');
  }
  await setSetting(SETTINGS.MODE, mode, 'string');
  return getStatus();
}

async function recordRun(result) {
  await setSetting(SETTINGS.LAST_RUN_AT, new Date().toISOString(), 'string');
  await setSetting(SETTINGS.LAST_RUN_RESULT, result, 'json');
}

// ─── Chain Failure Check ──────────────────────────────────────────────────

/**
 * Check if any prompt in the same chain_id at the same step has previously failed.
 * Returns true if prior failure exists.
 */
async function hasChainStepFailure(prompt) {
  if (!prompt.chain_id || !prompt.chain_step_number) return false;
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as cnt FROM om_prompt_registry
     WHERE chain_id = ? AND chain_step_number = ?
       AND (completion_status = 'failed' OR evaluator_status = 'fail')
       AND id != ?`,
    [prompt.chain_id, prompt.chain_step_number, prompt.id]
  );
  return Number(rows[0].cnt) > 0;
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  MODE,
  SETTINGS,
  SAFE_RULES,
  FULL_RULES,
  evaluateEligibility,
  getSetting,
  setSetting,
  getStatus,
  enable,
  disable,
  setMode,
  recordRun,
  hasChainStepFailure,
};
