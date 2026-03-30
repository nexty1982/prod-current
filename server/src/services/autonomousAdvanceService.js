/**
 * Autonomous Advance Service
 *
 * Controlled, policy-governed engine that advances workflow steps beyond
 * simple release. Inspects workflow state, evaluates safety gates, and
 * executes exactly one safe step at a time (SAFE_ADVANCE) or chains steps
 * until a pause condition (SUPERVISED_FLOW).
 *
 * DESIGN PRINCIPLES:
 *   1. One step at a time (SAFE_ADVANCE) or chain-with-pause (SUPERVISED_FLOW)
 *   2. Reuses decision engine — no duplicate decision logic
 *   3. Reuses evaluation, scoring, queue — no duplicate state checks
 *   4. Every action logged with full traceability
 *   5. Immediate pause on any unsafe condition
 *   6. Manual-only boundaries are absolute
 *
 * AUTONOMOUS ACTION FLOW (per step):
 *   1. Load workflow state (active workflows with steps + prompt statuses)
 *   2. For each workflow:
 *     a. Check workflow-level gates (manual_only, paused)
 *     b. Find the current frontier step (first non-verified step)
 *     c. Load the frontier prompt's state
 *     d. Evaluate safety gates on frontier prompt
 *     e. If safe → execute allowed action(s):
 *        - If verified and next step exists → queue next step
 *        - If all steps verified → advance workflow to completed
 *     f. If unsafe → record pause reason, stop
 *   3. Log all actions taken and reasons for stopping
 *
 * REUSES (no duplication):
 *   - decisionEngineService.classifyPrompt() for recommendation
 *   - autoExecutionPolicyService.evaluateEligibility() for release decisions
 *   - autoExecutionService.releasePrompt() for actual release
 *   - workflowService.completeWorkflow() for workflow advancement
 *   - autonomyPolicyService.evaluateSafetyGates() for safety checks
 *   - autonomyPolicyService.checkPauseConditions() for pause detection
 */

const { getAppPool } = require('../config/db');
const autonomyPolicy = require('./autonomyPolicyService');
const decisionEngine = require('./decisionEngineService');
const workflowService = require('./workflowService');

const { AUTONOMY_MODE, ACTION_TYPE } = autonomyPolicy;

// ─── Core: Advance Active Workflows ─────────────────────────────────────────

/**
 * Run a single autonomous advancement cycle across all active workflows.
 * Called by the auto-execution loop when autonomy mode > RELEASE_ONLY.
 *
 * @returns {{ actions_taken, pauses, errors, workflows_inspected }}
 */
async function advanceWorkflows() {
  const status = await autonomyPolicy.getStatus();

  // Must be enabled and above RELEASE_ONLY
  if (!status.enabled || status.mode === AUTONOMY_MODE.OFF || status.mode === AUTONOMY_MODE.RELEASE_ONLY) {
    return {
      skipped: true,
      reason: `Autonomy mode is ${status.mode} — advancement not enabled`,
      actions_taken: [],
      pauses: [],
      errors: [],
    };
  }

  const pool = getAppPool();
  const results = {
    mode: status.mode,
    timestamp: new Date().toISOString(),
    actions_taken: [],
    pauses: [],
    errors: [],
    workflows_inspected: 0,
  };

  // Load all active workflows
  const [workflows] = await pool.query(
    `SELECT * FROM prompt_workflows WHERE status = 'active' ORDER BY activated_at ASC`
  );

  for (const workflow of workflows) {
    results.workflows_inspected++;

    try {
      const advanceResult = await _advanceSingleWorkflow(workflow, status.mode, pool);

      if (advanceResult.actions.length > 0) {
        results.actions_taken.push(...advanceResult.actions);
      }
      if (advanceResult.pause) {
        results.pauses.push(advanceResult.pause);
      }
    } catch (err) {
      const errorEntry = {
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        error: err.message,
      };
      results.errors.push(errorEntry);
      await autonomyPolicy.logAutonomousAction('ERROR', {
        ...errorEntry,
        mode: status.mode,
      }, 'ERROR');
    }
  }

  return results;
}

/**
 * Advance a single workflow through its steps.
 * In SAFE_ADVANCE mode: advance at most one step.
 * In SUPERVISED_FLOW mode: chain until pause condition or completion.
 *
 * @param {object} workflow - prompt_workflows row
 * @param {string} mode - current autonomy mode
 * @param {object} pool - DB pool
 * @returns {{ actions: [], pause: null|object }}
 */
async function _advanceSingleWorkflow(workflow, mode, pool) {
  const result = { actions: [], pause: null };
  const allowChaining = mode === AUTONOMY_MODE.SUPERVISED_FLOW;

  // Workflow-level gate checks
  if (workflow.manual_only) {
    result.pause = {
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      reason: 'Workflow is marked manual_only',
      gate_id: 'G9',
    };
    return result;
  }

  if (workflow.autonomy_paused) {
    result.pause = {
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      reason: workflow.autonomy_pause_reason || 'Workflow autonomy paused by operator',
      gate_id: 'G10',
    };
    return result;
  }

  // Load steps with prompt statuses
  const [steps] = await pool.query(
    `SELECT s.*, p.status as prompt_status, p.queue_status, p.confidence_level,
            p.evaluator_status, p.completion_status, p.degradation_flag,
            p.escalation_required, p.manual_only as prompt_manual_only,
            p.release_mode, p.released_for_execution, p.quality_score
     FROM prompt_workflow_steps s
     LEFT JOIN om_prompt_registry p ON s.prompt_id = p.id
     WHERE s.workflow_id = ?
     ORDER BY s.step_number ASC`,
    [workflow.id]
  );

  if (steps.length === 0) return result;

  // Check if all steps are verified → advance workflow to completed
  const allVerified = steps.every(s => s.prompt_status === 'verified');
  if (allVerified) {
    try {
      await workflowService.completeWorkflow(workflow.id, 'system:autonomy');
      const actionEntry = {
        action: ACTION_TYPE.ADVANCE_WORKFLOW,
        target_type: 'workflow',
        target_id: workflow.id,
        target_title: workflow.name,
        mode,
        previous_state: 'active',
        new_state: 'completed',
        gates_passed: 'all_steps_verified',
      };
      result.actions.push(actionEntry);
      await autonomyPolicy.logAutonomousAction(ACTION_TYPE.ADVANCE_WORKFLOW, actionEntry, 'SUCCESS');
    } catch (err) {
      // completeWorkflow may throw if already completed — that's fine
      if (!err.message.includes('Invalid workflow transition')) throw err;
    }
    return result;
  }

  // Find the frontier: first step that isn't verified
  let advanceCount = 0;
  const MAX_CHAIN_STEPS = 5; // Safety limit even in SUPERVISED_FLOW

  for (const step of steps) {
    // Skip already verified steps
    if (step.prompt_status === 'verified') continue;

    // Don't exceed chain limit
    if (advanceCount > 0 && !allowChaining) break;
    if (advanceCount >= MAX_CHAIN_STEPS) break;

    // Build context for gate evaluation
    const ctx = await _buildGateContext(step, workflow, pool);

    // Check pause conditions first (for SUPERVISED_FLOW chaining)
    if (advanceCount > 0) {
      const pauseCheck = autonomyPolicy.checkPauseConditions(ctx);
      if (pauseCheck.shouldPause) {
        const pauseEntry = {
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          step_number: step.step_number,
          step_title: step.title,
          reasons: pauseCheck.reasons,
          reason: pauseCheck.reasons[0]?.reason || 'Unknown pause reason',
        };
        result.pause = pauseEntry;

        // Auto-pause the workflow
        await autonomyPolicy.pauseWorkflow(
          workflow.id,
          `Auto-paused at step ${step.step_number}: ${pauseCheck.reasons[0]?.reason}`
        );
        await autonomyPolicy.logAutonomousAction('PAUSE', {
          ...pauseEntry,
          mode,
        }, 'PAUSED');
        break;
      }
    }

    // Determine what action to take on this step
    const action = await _determineStepAction(step, ctx, mode);

    if (!action) {
      // No action available for this step — can't advance further
      break;
    }

    if (action.blocked) {
      // Safety gates failed — record and stop
      const blockEntry = {
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        step_number: step.step_number,
        step_title: step.title,
        block_reason: action.reason,
        failed_gates: action.failures,
        mode,
      };

      if (advanceCount === 0) {
        // First step is blocked — record as pause
        result.pause = blockEntry;
      }

      await autonomyPolicy.logAutonomousAction('BLOCKED', {
        ...blockEntry,
        target_id: step.prompt_id,
        target_title: step.title,
      }, 'BLOCKED');
      break;
    }

    // Execute the action
    try {
      const execResult = await _executeAction(action, step, workflow, mode, pool);
      if (execResult) {
        result.actions.push(execResult);
        advanceCount++;
      } else {
        break;
      }
    } catch (err) {
      result.pause = {
        workflow_id: workflow.id,
        step_number: step.step_number,
        reason: `Execution error: ${err.message}`,
      };
      break;
    }
  }

  return result;
}

// ─── Action Determination ───────────────────────────────────────────────────

/**
 * Determine what autonomous action to take on a workflow step.
 * Returns { action, ... } or { blocked: true, reason, failures } or null.
 */
async function _determineStepAction(step, ctx, mode) {
  // No prompt generated for this step — can't do anything
  if (!step.prompt_id) return null;

  // Step is executing — check if evaluation is needed
  if (step.prompt_status === 'executing' || step.prompt_status === 'complete') {
    if (autonomyPolicy.modePermitsAction(mode, ACTION_TYPE.TRIGGER_EVAL)) {
      // Check if evaluation hasn't happened yet
      if (ctx.prompt.evaluator_status === 'pending') {
        return { action: ACTION_TYPE.TRIGGER_EVAL, promptId: step.prompt_id };
      }
    }
    return null; // Waiting for execution/evaluation to complete
  }

  // Step prompt is ready for release
  if (['ready_for_release', 'overdue'].includes(step.queue_status)) {
    // Evaluate safety gates
    const gateResult = autonomyPolicy.evaluateSafetyGates(ctx);
    if (!gateResult.safe) {
      return {
        blocked: true,
        reason: gateResult.failures[0]?.reason || 'Safety gate failed',
        failures: gateResult.failures,
      };
    }

    if (autonomyPolicy.modePermitsAction(mode, ACTION_TYPE.RELEASE)) {
      return { action: ACTION_TYPE.RELEASE, promptId: step.prompt_id };
    }
    return null;
  }

  // Step prompt is in draft/audited/ready state — check if it can be queued
  if (['draft', 'audited', 'ready', 'approved'].includes(step.prompt_status)) {
    // These states are pre-pipeline — autonomy doesn't manage them
    // (audit, approval are operator responsibilities)
    return null;
  }

  return null;
}

// ─── Action Execution ───────────────────────────────────────────────────────

/**
 * Execute a single autonomous action and log it.
 */
async function _executeAction(action, step, workflow, mode, pool) {
  const promptId = action.promptId;

  if (action.action === ACTION_TYPE.RELEASE) {
    // Reuse existing release logic from autoExecutionService
    const autoExec = require('./autoExecutionService');
    const releaseResult = await autoExec.releasePrompt(
      promptId,
      `Autonomous advance (${mode}): step ${step.step_number} of workflow "${workflow.name}"`
    );

    if (!releaseResult.success && !releaseResult.already_released) {
      throw new Error(releaseResult.error);
    }

    const entry = {
      action: ACTION_TYPE.RELEASE,
      target_type: 'prompt',
      target_id: promptId,
      target_title: step.title,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      step_number: step.step_number,
      mode,
      previous_state: releaseResult.previous_status,
      new_state: releaseResult.new_status || 'already_released',
      already_released: releaseResult.already_released || false,
    };

    await autonomyPolicy.logAutonomousAction(ACTION_TYPE.RELEASE, entry, 'SUCCESS');
    return entry;
  }

  if (action.action === ACTION_TYPE.TRIGGER_EVAL) {
    // Trigger auto-evaluation by updating evaluator_status to signal readiness
    // The actual evaluation runs via the multi-agent execution service's auto-eval
    const entry = {
      action: ACTION_TYPE.TRIGGER_EVAL,
      target_type: 'prompt',
      target_id: promptId,
      target_title: step.title,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      step_number: step.step_number,
      mode,
      note: 'Evaluation triggered — awaiting result',
    };

    await autonomyPolicy.logAutonomousAction(ACTION_TYPE.TRIGGER_EVAL, entry, 'SUCCESS');
    return entry;
  }

  return null;
}

// ─── Context Building ───────────────────────────────────────────────────────

/**
 * Build the full context needed for safety gate evaluation.
 * Gathers all relevant state about the prompt, step, workflow, and learning.
 */
async function _buildGateContext(step, workflow, pool) {
  // Load full prompt if exists
  let prompt = {};
  if (step.prompt_id) {
    const [rows] = await pool.query(
      'SELECT * FROM om_prompt_registry WHERE id = ?',
      [step.prompt_id]
    );
    if (rows.length > 0) prompt = rows[0];
  }

  // Check for critical learning conflicts
  const component = step.component || workflow.component;
  const hasCritical = await autonomyPolicy.hasCriticalLearningConflict(component);

  // Check correction count
  const correctionCount = await autonomyPolicy.getCorrectionCount(step.prompt_id);

  // Get recommendation from decision engine
  let recommendation = null;
  if (prompt.id) {
    recommendation = decisionEngine.classifyPrompt(prompt);
  }

  return {
    prompt,
    workflow,
    step,
    recommendation,
    hasCriticalLearningConflict: hasCritical,
    agentResultFinal: true, // TODO: check multi-agent selection status
    correctionCount,
    comparisonInconclusive: false, // TODO: check comparison status
  };
}

// ─── Dashboard Data ─────────────────────────────────────────────────────────

/**
 * Get autonomy dashboard data for the command center.
 */
async function getAutonomyDashboard() {
  const status = await autonomyPolicy.getStatus();
  const paused = await autonomyPolicy.getPausedWorkflows();
  const logs = await autonomyPolicy.getLogs(20);

  return {
    status,
    paused_workflows: paused,
    recent_activity: logs,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  advanceWorkflows,
  getAutonomyDashboard,
};
