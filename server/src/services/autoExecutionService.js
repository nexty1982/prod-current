/**
 * Auto-Execution Service
 *
 * Controlled execution loop that:
 *   1. Reads decision engine recommendations
 *   2. Evaluates eligibility via policy service
 *   3. Executes safe actions (release prompts)
 *   4. Logs every action with full audit trail
 *
 * SAFETY GUARANTEES:
 *   - Mutex prevents overlapping execution runs
 *   - Idempotent: re-releasing an already-released prompt is a no-op
 *   - Reuses existing release logic (status transition on om_prompt_registry)
 *   - Respects sequence enforcement (queue_status must be ready_for_release/overdue)
 *   - Every action is logged to system_logs — no silent execution
 *   - Cannot execute escalated, degraded, blocked, or low-confidence prompts
 *
 * LOOP:
 *   - Configurable interval (default 30s)
 *   - start()/stop() for lifecycle management
 *   - runOnce() for manual/test invocation
 */

const { getAppPool } = require('../config/db');
const policyService = require('./autoExecutionPolicyService');
const decisionEngine = require('./decisionEngineService');
const autonomousAdvance = require('./autonomousAdvanceService');

// ─── Mutex & Change Detection ────────────────────────────────────────────
//
// The auto-execution loop runs every 30s. Most cycles find nothing changed.
// Change detection tracks a lightweight fingerprint of om_prompt_registry
// state (count + max updated_at for release-eligible prompts). If the
// fingerprint hasn't changed, the expensive getRecommendations() call and
// per-prompt eligibility checks are skipped entirely.

let _running = false;
let _timer = null;
let _intervalMs = 30000; // 30 seconds default
let _lastFingerprint = null; // { count, maxUpdated }
let _skippedCycles = 0;

// ─── Core: Execute a Single Release ───────────────────────────────────────

/**
 * Release a prompt by transitioning its status.
 * Reuses the same logic as manual release — updates queue_status and status.
 * Returns { success, prompt_id, previous_status, new_status, error? }
 */
async function releasePrompt(promptId, reason) {
  const pool = getAppPool();

  // Fetch current state (double-check before execution)
  const [rows] = await pool.query(
    `SELECT id, status, queue_status, released_for_execution,
            escalation_required, degradation_flag, confidence_level
     FROM om_prompt_registry WHERE id = ?`,
    [promptId]
  );

  if (rows.length === 0) {
    return { success: false, prompt_id: promptId, error: 'Prompt not found' };
  }

  const prompt = rows[0];

  // Final safety checks before mutation
  if (prompt.released_for_execution) {
    return { success: true, prompt_id: promptId, already_released: true, note: 'Idempotent — already released' };
  }
  if (prompt.escalation_required) {
    return { success: false, prompt_id: promptId, error: 'Cannot release — escalation required' };
  }
  if (prompt.degradation_flag) {
    return { success: false, prompt_id: promptId, error: 'Cannot release — degradation detected' };
  }
  if (!['ready_for_release', 'overdue'].includes(prompt.queue_status)) {
    return { success: false, prompt_id: promptId, error: `Cannot release — queue_status is ${prompt.queue_status}` };
  }

  // Execute the release
  const previousStatus = prompt.status;
  const previousQueue = prompt.queue_status;

  await pool.query(
    `UPDATE om_prompt_registry
     SET status = 'executing',
         queue_status = 'released',
         released_for_execution = 1,
         last_release_attempt_at = NOW(),
         updated_at = NOW()
     WHERE id = ? AND released_for_execution = 0`,
    [promptId]
  );

  return {
    success: true,
    prompt_id: promptId,
    previous_status: previousStatus,
    previous_queue_status: previousQueue,
    new_status: 'executing',
    new_queue_status: 'released',
    reason,
  };
}

// ─── Change Detection ────────────────────────────────────────────────────

/**
 * Compute a lightweight fingerprint of release-eligible prompt state.
 * If the fingerprint hasn't changed, no prompts have been added, removed,
 * or had their status/queue_status updated — so running the full
 * recommendation + eligibility pipeline is provably unnecessary.
 */
async function _getRegistryFingerprint() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as cnt,
            MAX(updated_at) as max_updated
     FROM om_prompt_registry
     WHERE queue_status IN ('ready_for_release', 'overdue')`
  );
  const r = rows[0];
  return `${r.cnt}:${r.max_updated || 'null'}`;
}

// ─── Core: Single Execution Run ───────────────────────────────────────────

/**
 * Run a single auto-execution cycle:
 *   1. Check if enabled
 *   2. Check change fingerprint (skip if unchanged)
 *   3. Get recommendations from decision engine
 *   4. Evaluate eligibility for each
 *   5. Execute eligible actions
 *   6. Log results
 *
 * Returns execution summary.
 */
async function runOnce() {
  // Mutex guard
  if (_running) {
    return { skipped: true, reason: 'Previous run still in progress' };
  }
  _running = true;

  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    executed: [],
    skipped: [],
    errors: [],
    evaluated: 0,
    eligible: 0,
  };

  try {
    // 1. Check policy status
    const status = await policyService.getStatus();
    if (!status.enabled) {
      results.skipped_reason = 'Auto-execution is disabled';
      await policyService.recordRun({ ...results, duration_ms: Date.now() - startTime });
      return results;
    }

    if (status.mode === policyService.MODE.OFF) {
      results.skipped_reason = 'Mode is OFF';
      await policyService.recordRun({ ...results, duration_ms: Date.now() - startTime });
      return results;
    }

    // 2. Change detection — skip expensive recommendation pipeline if nothing changed
    const fingerprint = await _getRegistryFingerprint();
    if (fingerprint === _lastFingerprint) {
      _skippedCycles++;
      results.skipped_reason = `No registry changes (skipped ${_skippedCycles} consecutive cycles)`;
      results.duration_ms = Date.now() - startTime;
      // Don't record run to avoid writing settings on every no-op cycle
      return results;
    }
    _skippedCycles = 0;

    // 3. Get recommendations from decision engine
    const recommendations = await decisionEngine.getRecommendations();
    const actionable = recommendations.actions || [];

    // 4. Filter to RELEASE_NOW only (other actions are never auto-executed)
    const releaseActions = actionable.filter(a => a.action === 'RELEASE_NOW');

    // 4. Evaluate each for eligibility
    const pool = getAppPool();

    for (const rec of releaseActions) {
      results.evaluated++;

      // Fetch full prompt data for eligibility check
      const [promptRows] = await pool.query(
        `SELECT * FROM om_prompt_registry WHERE id = ?`,
        [rec.target.prompt_id]
      );

      if (promptRows.length === 0) {
        results.errors.push({
          prompt_id: rec.target.prompt_id,
          error: 'Prompt not found during eligibility check',
        });
        continue;
      }

      const prompt = promptRows[0];

      // Enrich with chain failure check
      prompt._has_chain_failure = await policyService.hasChainStepFailure(prompt);
      prompt._auto_execute_excluded = false; // Future: check per-prompt flag

      // Evaluate eligibility
      const eligibility = policyService.evaluateEligibility(rec, prompt, status.mode);

      if (!eligibility.eligible) {
        results.skipped.push({
          prompt_id: prompt.id,
          title: prompt.title,
          failures: eligibility.failures,
        });
        continue;
      }

      results.eligible++;

      // 5. Execute the release
      try {
        const releaseResult = await releasePrompt(
          prompt.id,
          `Auto-executed: ${rec.reason}`
        );

        if (releaseResult.success) {
          const entry = {
            prompt_id: prompt.id,
            title: prompt.title,
            component: prompt.component,
            action: rec.action,
            rule_id: rec.rule_id,
            reason: rec.reason,
            policy_mode: status.mode,
            release_result: releaseResult,
            eligibility_passed: eligibility.passed_count,
            eligibility_total: eligibility.total_rules,
          };
          results.executed.push(entry);

          // Audit log
          await logExecution(entry, 'SUCCESS');
        } else {
          const errorEntry = {
            prompt_id: prompt.id,
            title: prompt.title,
            error: releaseResult.error,
            action: rec.action,
          };
          results.errors.push(errorEntry);
          await logExecution(errorEntry, 'FAILED');
        }
      } catch (execErr) {
        const errorEntry = {
          prompt_id: prompt.id,
          title: prompt.title,
          error: execErr.message,
          action: rec.action,
        };
        results.errors.push(errorEntry);
        await logExecution(errorEntry, 'ERROR');
      }
    }

    // 6. Autonomous advancement (if mode > RELEASE_ONLY)
    try {
      const advanceResult = await autonomousAdvance.advanceWorkflows();
      if (!advanceResult.skipped) {
        results.autonomy = {
          mode: advanceResult.mode,
          workflows_inspected: advanceResult.workflows_inspected,
          actions_taken: advanceResult.actions_taken.length,
          pauses: advanceResult.pauses.length,
          errors: advanceResult.errors.length,
        };
        if (advanceResult.actions_taken.length > 0) {
          results.autonomy.details = advanceResult.actions_taken;
        }
      }
    } catch (advErr) {
      results.autonomy_error = advErr.message;
      console.error('[AutoExecution] Autonomy advance error:', advErr.message);
    }

    results.duration_ms = Date.now() - startTime;
    await policyService.recordRun(results);

    // Update fingerprint after successful run
    _lastFingerprint = await _getRegistryFingerprint();

    return results;

  } catch (err) {
    results.fatal_error = err.message;
    results.duration_ms = Date.now() - startTime;
    try { await policyService.recordRun(results); } catch { /* best effort */ }
    await logExecution({ error: err.message }, 'FATAL_ERROR');
    return results;
  } finally {
    _running = false;
  }
}

// ─── Audit Logging ────────────────────────────────────────────────────────

/**
 * Log an auto-execution action to system_logs.
 * Every execution is recorded — no silent actions.
 */
async function logExecution(entry, level) {
  const pool = getAppPool();
  const logLevel = level === 'SUCCESS' ? 'SUCCESS' :
                   level === 'FAILED' ? 'WARN' :
                   level === 'ERROR' ? 'ERROR' :
                   level === 'FATAL_ERROR' ? 'ERROR' : 'INFO';

  const message = level === 'SUCCESS'
    ? `Auto-released prompt "${entry.title}" (${entry.prompt_id}) — rule ${entry.rule_id}, mode ${entry.policy_mode}`
    : level === 'FAILED'
    ? `Auto-release FAILED for "${entry.title}" (${entry.prompt_id}) — ${entry.error}`
    : `Auto-execution error: ${entry.error}`;

  try {
    await pool.query(
      `INSERT INTO system_logs (timestamp, level, source, message, meta, user_email, service)
       VALUES (NOW(), ?, 'auto_execution', ?, ?, 'system:auto_executor', 'auto_execution')`,
      [logLevel, message, JSON.stringify(entry)]
    );
  } catch (err) {
    console.error('[AutoExecution] Failed to write audit log:', err.message);
  }
}

// ─── Execution Logs Query ─────────────────────────────────────────────────

/**
 * Retrieve recent auto-execution logs from system_logs.
 */
async function getLogs(limit = 50) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT timestamp, level, message, meta
     FROM system_logs
     WHERE source = 'auto_execution'
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

// ─── Execution Loop Lifecycle ─────────────────────────────────────────────

/**
 * Start the periodic execution loop.
 * Safe to call multiple times — will not create duplicate timers.
 */
function start(intervalMs) {
  if (_timer) {
    console.log('[AutoExecution] Loop already running');
    return;
  }
  if (intervalMs) _intervalMs = intervalMs;

  console.log(`[AutoExecution] Starting execution loop (interval: ${_intervalMs}ms)`);
  _timer = setInterval(async () => {
    try {
      await runOnce();
    } catch (err) {
      console.error('[AutoExecution] Loop error:', err.message);
    }
  }, _intervalMs);

  // Don't prevent process exit
  if (_timer.unref) _timer.unref();
}

/**
 * Stop the execution loop.
 */
function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[AutoExecution] Loop stopped');
  }
}

/**
 * Check if the loop is currently running.
 */
function isLoopRunning() {
  return _timer !== null;
}

/**
 * Check if an execution is currently in progress.
 */
function isExecuting() {
  return _running;
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  runOnce,
  releasePrompt,
  getLogs,
  logExecution,
  start,
  stop,
  isLoopRunning,
  isExecuting,
};
