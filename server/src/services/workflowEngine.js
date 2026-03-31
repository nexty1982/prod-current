/**
 * Workflow Engine — centralized orchestration service for platform workflows.
 *
 * Responsibilities:
 * - Execute multi-step workflows (event/schedule/manual triggers)
 * - Record step-level results for auditability
 * - Publish lifecycle events for each run/step
 * - Enforce cooldowns, concurrency limits, and escalation policies
 * - Provide query helpers for workflow state
 *
 * Architecture:
 * - Rules  = simple immediate event→action reactions (platformEvents.js)
 * - Workflows = multi-step orchestrations (this file)
 *
 * Step types supported:
 *   create_task, create_alert, emit_event, condition_check,
 *   assign_task, update_status, wait
 */

const { getAppPool } = require('../config/db');
const { publishPlatformEvent } = require('./platformEvents');

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Queue and execute a workflow run.
 * @param {object} opts
 * @param {number} opts.workflowId - FK to platform_workflows
 * @param {string} opts.triggerSource - 'event' | 'schedule' | 'manual' | 'retry'
 * @param {number|null} opts.triggerEventId - FK to platform_events if event-triggered
 * @param {object|null} opts.context - Runtime context (trigger data, actor info, etc.)
 * @returns {Promise<{runId: number, status: string}>}
 */
async function executeWorkflow({ workflowId, triggerSource = 'manual', triggerEventId = null, context = null }) {
  const pool = getAppPool();

  // 1. Load workflow definition
  const [wfRows] = await pool.query(
    'SELECT * FROM platform_workflows WHERE id = ? AND is_enabled = 1',
    [workflowId]
  );
  if (!wfRows.length) {
    throw new Error(`Workflow ${workflowId} not found or disabled`);
  }
  const workflow = wfRows[0];

  // 2. Enforce cooldown
  if (workflow.cooldown_seconds) {
    const [recent] = await pool.query(
      `SELECT id FROM platform_workflow_runs
       WHERE workflow_id = ? AND status IN ('completed','failed','partially_completed')
         AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)
       LIMIT 1`,
      [workflowId, workflow.cooldown_seconds]
    );
    if (recent.length) {
      await publishWorkflowEvent('workflow.skipped_cooldown', workflow, null, 'info',
        `Workflow "${workflow.name}" skipped — cooldown active`);
      return { runId: null, status: 'skipped_cooldown' };
    }
  }

  // 3. Enforce max concurrent
  if (workflow.max_concurrent) {
    const [running] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM platform_workflow_runs
       WHERE workflow_id = ? AND status IN ('queued','running')`,
      [workflowId]
    );
    if (running[0].cnt >= workflow.max_concurrent) {
      await publishWorkflowEvent('workflow.skipped_concurrency', workflow, null, 'info',
        `Workflow "${workflow.name}" skipped — max concurrent (${workflow.max_concurrent}) reached`);
      return { runId: null, status: 'skipped_concurrency' };
    }
  }

  // 4. Create workflow run
  const [runResult] = await pool.query(
    `INSERT INTO platform_workflow_runs
       (workflow_id, trigger_event_id, trigger_source, status, context, started_at)
     VALUES (?, ?, ?, 'running', ?, UTC_TIMESTAMP())`,
    [workflowId, triggerEventId, triggerSource, context ? JSON.stringify(context) : null]
  );
  const runId = runResult.insertId;

  // 5. Parse definition
  let steps;
  try {
    steps = typeof workflow.definition === 'string'
      ? JSON.parse(workflow.definition)
      : workflow.definition;
  } catch (e) {
    await failRun(pool, runId, `Invalid workflow definition: ${e.message}`);
    return { runId, status: 'failed' };
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    await failRun(pool, runId, 'Workflow definition has no steps');
    return { runId, status: 'failed' };
  }

  // 6. Publish workflow.started event
  await publishWorkflowEvent('workflow.started', workflow, runId, 'info',
    `Workflow "${workflow.name}" started (run #${runId})`);

  // 7. Execute steps sequentially
  const runContext = context ? { ...context } : {};
  runContext._runId = runId;
  let allCompleted = true;
  let anyFailed = false;

  for (let i = 0; i < steps.length; i++) {
    const stepDef = steps[i];
    const stepKey = stepDef.step_key || `step_${i}`;
    const stepType = stepDef.step_type;

    // Insert step record
    const [stepResult] = await pool.query(
      `INSERT INTO platform_workflow_steps
         (workflow_run_id, step_key, step_type, step_order, status, input_json, started_at)
       VALUES (?, ?, ?, ?, 'running', ?, UTC_TIMESTAMP())`,
      [runId, stepKey, stepType, i, stepDef.config ? JSON.stringify(stepDef.config) : null]
    );
    const stepId = stepResult.insertId;

    try {
      const output = await runWorkflowStep(stepType, stepDef.config || {}, runContext, workflow);

      // Step completed
      await pool.query(
        `UPDATE platform_workflow_steps
         SET status = 'completed', output_json = ?, completed_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [output ? JSON.stringify(output) : null, stepId]
      );

      // Merge output into context for downstream steps
      if (output) {
        runContext[stepKey] = output;
      }

    } catch (err) {
      const isSkip = err.message && err.message.startsWith('SKIP:');

      if (isSkip) {
        // Condition check failures skip remaining steps gracefully
        await pool.query(
          `UPDATE platform_workflow_steps
           SET status = 'skipped', error_message = ?, completed_at = UTC_TIMESTAMP()
           WHERE id = ?`,
          [err.message.replace('SKIP:', '').trim(), stepId]
        );

        // Mark remaining steps as skipped
        for (let j = i + 1; j < steps.length; j++) {
          await pool.query(
            `INSERT INTO platform_workflow_steps
               (workflow_run_id, step_key, step_type, step_order, status, completed_at)
             VALUES (?, ?, ?, ?, 'skipped', UTC_TIMESTAMP())`,
            [runId, steps[j].step_key || `step_${j}`, steps[j].step_type, j]
          );
        }

        allCompleted = false;
        break;

      } else {
        // Actual failure
        await pool.query(
          `UPDATE platform_workflow_steps
           SET status = 'failed', error_message = ?, completed_at = UTC_TIMESTAMP()
           WHERE id = ?`,
          [String(err.message || err).substring(0, 2000), stepId]
        );

        anyFailed = true;
        allCompleted = false;

        // Mark remaining steps as cancelled
        for (let j = i + 1; j < steps.length; j++) {
          await pool.query(
            `INSERT INTO platform_workflow_steps
               (workflow_run_id, step_key, step_type, step_order, status, completed_at)
             VALUES (?, ?, ?, ?, 'cancelled', UTC_TIMESTAMP())`,
            [runId, steps[j].step_key || `step_${j}`, steps[j].step_type, j]
          );
        }

        break;
      }
    }
  }

  // 8. Finalize run status
  const finalStatus = anyFailed ? 'failed'
    : allCompleted ? 'completed'
    : 'partially_completed';

  await pool.query(
    `UPDATE platform_workflow_runs
     SET status = ?, completed_at = UTC_TIMESTAMP(),
         result_summary = ?, context = ?
     WHERE id = ?`,
    [
      finalStatus,
      `${finalStatus}: ${steps.length} steps defined`,
      JSON.stringify(runContext),
      runId
    ]
  );

  // 9. Publish completion event
  const sevMap = { completed: 'success', failed: 'critical', partially_completed: 'warning' };
  await publishWorkflowEvent(
    `workflow.${finalStatus}`, workflow, runId,
    sevMap[finalStatus] || 'info',
    `Workflow "${workflow.name}" ${finalStatus} (run #${runId})`
  );

  return { runId, status: finalStatus };
}

/**
 * Retry a failed/partially_completed workflow run.
 */
async function retryWorkflowRun(runId) {
  const pool = getAppPool();
  const [runs] = await pool.query(
    'SELECT * FROM platform_workflow_runs WHERE id = ? AND status IN (\'failed\',\'partially_completed\')',
    [runId]
  );
  if (!runs.length) throw new Error(`Run ${runId} not found or not retryable`);

  const run = runs[0];
  let ctx = null;
  try { ctx = typeof run.context === 'string' ? JSON.parse(run.context) : run.context; } catch {}

  return executeWorkflow({
    workflowId: run.workflow_id,
    triggerSource: 'retry',
    triggerEventId: run.trigger_event_id,
    context: ctx,
  });
}

/**
 * Cancel a running workflow run.
 */
async function cancelWorkflowRun(runId) {
  const pool = getAppPool();
  const [result] = await pool.query(
    `UPDATE platform_workflow_runs
     SET status = 'cancelled', completed_at = UTC_TIMESTAMP()
     WHERE id = ? AND status IN ('queued','running')`,
    [runId]
  );
  if (result.affectedRows === 0) throw new Error(`Run ${runId} not found or already terminal`);

  // Cancel pending steps
  await pool.query(
    `UPDATE platform_workflow_steps
     SET status = 'cancelled', completed_at = UTC_TIMESTAMP()
     WHERE workflow_run_id = ? AND status IN ('pending','running')`,
    [runId]
  );

  return { runId, status: 'cancelled' };
}

/**
 * Evaluate event-triggered workflows. Called from publishPlatformEvent after rule eval.
 */
async function evaluateWorkflowTriggers(eventId, event) {
  const pool = getAppPool();
  const [workflows] = await pool.query(
    `SELECT * FROM platform_workflows
     WHERE is_enabled = 1 AND trigger_type = 'event'`
  );

  for (const wf of workflows) {
    try {
      let config;
      try {
        config = typeof wf.trigger_config === 'string'
          ? JSON.parse(wf.trigger_config) : wf.trigger_config;
      } catch { continue; }

      if (!config) continue;

      // Match event_type
      if (config.event_type && config.event_type !== event.event_type) continue;

      // Match category
      if (config.category && config.category !== event.category) continue;

      // Match severity minimum
      if (config.severity_min) {
        const sevOrder = { info: 0, warning: 1, critical: 2 };
        const eventSev = sevOrder[event.severity] ?? 0;
        const minSev = sevOrder[config.severity_min] ?? 0;
        if (eventSev < minSev) continue;
      }

      // Count threshold (within time window)
      if (config.min_count && config.min_count > 1) {
        const window = config.time_window_seconds || 900;
        const [countResult] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM platform_events
           WHERE event_type = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)`,
          [event.event_type, window]
        );
        if (countResult[0].cnt < config.min_count) continue;
      }

      // Trigger matched — execute workflow (fire-and-forget)
      executeWorkflow({
        workflowId: wf.id,
        triggerSource: 'event',
        triggerEventId: eventId,
        context: {
          trigger_event: {
            id: eventId,
            event_type: event.event_type,
            category: event.category,
            severity: event.severity,
            title: event.title,
            source_system: event.source_system,
            source_ref_id: event.source_ref_id,
          }
        }
      }).catch(err => {
        console.error(`[WorkflowEngine] Failed to execute workflow ${wf.workflow_key}:`, err.message);
      });

    } catch (err) {
      console.error(`[WorkflowEngine] Error evaluating workflow ${wf.id}:`, err.message);
    }
  }
}

/**
 * Execute scheduled workflows. Called by the scheduler on cron match.
 */
async function executeScheduledWorkflows() {
  const pool = getAppPool();
  const [workflows] = await pool.query(
    `SELECT * FROM platform_workflows
     WHERE is_enabled = 1 AND trigger_type = 'schedule'`
  );

  const results = [];
  for (const wf of workflows) {
    try {
      const result = await executeWorkflow({
        workflowId: wf.id,
        triggerSource: 'schedule',
        context: { scheduled_at: new Date().toISOString() }
      });
      results.push({ workflow_key: wf.workflow_key, ...result });
    } catch (err) {
      console.error(`[WorkflowEngine] Scheduled workflow ${wf.workflow_key} error:`, err.message);
      results.push({ workflow_key: wf.workflow_key, status: 'error', error: err.message });
    }
  }
  return results;
}

/**
 * Query workflows with optional filters.
 */
async function queryWorkflows(filters = {}) {
  const pool = getAppPool();
  let where = 'WHERE 1=1';
  const params = [];

  if (filters.category) { where += ' AND category = ?'; params.push(filters.category); }
  if (filters.trigger_type) { where += ' AND trigger_type = ?'; params.push(filters.trigger_type); }
  if (filters.is_enabled !== undefined) { where += ' AND is_enabled = ?'; params.push(filters.is_enabled ? 1 : 0); }

  const [rows] = await pool.query(
    `SELECT id, workflow_key, name, description, category, is_enabled,
            trigger_type, trigger_config, cooldown_seconds, max_concurrent,
            created_at, updated_at
     FROM platform_workflows ${where}
     ORDER BY category, name`,
    params
  );

  // Parse JSON fields
  return rows.map(r => {
    if (typeof r.trigger_config === 'string') {
      try { r.trigger_config = JSON.parse(r.trigger_config); } catch {}
    }
    return r;
  });
}

/**
 * Get workflow with its definition (for detail view).
 */
async function getWorkflowDetail(workflowId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT * FROM platform_workflows WHERE id = ?',
    [workflowId]
  );
  if (!rows.length) return null;

  const wf = rows[0];
  if (typeof wf.definition === 'string') {
    try { wf.definition = JSON.parse(wf.definition); } catch {}
  }
  if (typeof wf.trigger_config === 'string') {
    try { wf.trigger_config = JSON.parse(wf.trigger_config); } catch {}
  }

  // Recent runs
  const [runs] = await pool.query(
    `SELECT id, trigger_source, status, started_at, completed_at,
            result_summary, error_message, created_at
     FROM platform_workflow_runs
     WHERE workflow_id = ?
     ORDER BY created_at DESC LIMIT 20`,
    [workflowId]
  );

  wf.recent_runs = runs;
  return wf;
}

/**
 * Get workflow run with steps.
 */
async function getWorkflowRunDetail(runId) {
  const pool = getAppPool();
  const [runs] = await pool.query(
    `SELECT r.*, w.workflow_key, w.name AS workflow_name, w.category
     FROM platform_workflow_runs r
     JOIN platform_workflows w ON w.id = r.workflow_id
     WHERE r.id = ?`,
    [runId]
  );
  if (!runs.length) return null;

  const run = runs[0];
  if (typeof run.context === 'string') {
    try { run.context = JSON.parse(run.context); } catch {}
  }

  const [steps] = await pool.query(
    `SELECT * FROM platform_workflow_steps
     WHERE workflow_run_id = ?
     ORDER BY step_order`,
    [runId]
  );

  // Parse JSON fields
  run.steps = steps.map(s => {
    ['input_json', 'output_json'].forEach(f => {
      if (typeof s[f] === 'string') { try { s[f] = JSON.parse(s[f]); } catch {} }
    });
    return s;
  });

  return run;
}

/**
 * Query workflow runs with filters.
 */
async function queryWorkflowRuns(filters = {}) {
  const pool = getAppPool();
  let where = 'WHERE 1=1';
  const params = [];

  if (filters.workflow_id) { where += ' AND r.workflow_id = ?'; params.push(filters.workflow_id); }
  if (filters.status) { where += ' AND r.status = ?'; params.push(filters.status); }
  if (filters.trigger_source) { where += ' AND r.trigger_source = ?'; params.push(filters.trigger_source); }

  const limit = Math.min(parseInt(filters.limit) || 50, 200);
  const offset = parseInt(filters.offset) || 0;

  const [rows] = await pool.query(
    `SELECT r.id, r.workflow_id, w.workflow_key, w.name AS workflow_name, w.category,
            r.trigger_source, r.status, r.started_at, r.completed_at,
            r.result_summary, r.error_message, r.created_at
     FROM platform_workflow_runs r
     JOIN platform_workflows w ON w.id = r.workflow_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM platform_workflow_runs r ${where}`,
    params
  );

  return { runs: rows, total: countResult[0].total, limit, offset };
}

/**
 * Toggle workflow enabled/disabled.
 */
async function toggleWorkflow(workflowId, enabled, updatedBy = null) {
  const pool = getAppPool();
  const [result] = await pool.query(
    'UPDATE platform_workflows SET is_enabled = ?, updated_by = ? WHERE id = ?',
    [enabled ? 1 : 0, updatedBy, workflowId]
  );
  return result.affectedRows > 0;
}

// ─── Step Executors ──────────────────────────────────────────────────────────

/**
 * Execute a single workflow step.
 * @throws Error on failure, Error('SKIP:...') for condition-check skips.
 */
async function runWorkflowStep(stepType, config, runContext, workflow) {
  switch (stepType) {
    case 'create_task':
      return stepCreateTask(config, runContext, workflow);
    case 'create_alert':
      return stepCreateAlert(config, runContext, workflow);
    case 'emit_event':
      return stepEmitEvent(config, runContext, workflow);
    case 'condition_check':
      return stepConditionCheck(config, runContext);
    case 'assign_task':
      return stepAssignTask(config, runContext);
    case 'update_status':
      return stepUpdateStatus(config, runContext);
    case 'wait':
      return stepWait(config);
    default:
      throw new Error(`Unknown step type: ${stepType}`);
  }
}

async function stepCreateTask(config, runContext, workflow) {
  const pool = getAppPool();
  const [result] = await pool.query(
    `INSERT INTO omai_tasks (task_type, source_feature, title, status, metadata_json, created_at)
     VALUES (?, ?, ?, 'queued', ?, UTC_TIMESTAMP())`,
    [
      config.task_type || 'workflow_task',
      config.source_feature || 'workflow-engine',
      resolveTemplate(config.title || 'Workflow task', runContext),
      JSON.stringify({
        workflow_key: workflow.workflow_key,
        workflow_id: workflow.id,
        ...(config.metadata || {}),
      }),
    ]
  );

  // Link task to workflow run if we have runContext
  if (runContext._runId) {
    await pool.query(
      'UPDATE omai_tasks SET workflow_run_id = ? WHERE id = ?',
      [runContext._runId, result.insertId]
    ).catch(() => {});
  }

  return { task_id: result.insertId };
}

async function stepCreateAlert(config, runContext, workflow) {
  const result = await publishPlatformEvent({
    event_type: 'alert.workflow_generated',
    category: config.category || 'alert',
    severity: config.severity || 'warning',
    source_system: 'workflow_engine',
    source_ref_id: runContext._runId || null,
    title: resolveTemplate(config.title || 'Workflow alert', runContext),
    message: resolveTemplate(config.message || '', runContext),
    event_payload: { workflow_key: workflow.workflow_key, workflow_id: workflow.id },
    actor_type: 'system',
    platform: 'omai',
  });
  return { event_id: result.id };
}

async function stepEmitEvent(config, runContext, workflow) {
  const result = await publishPlatformEvent({
    event_type: config.event_type || 'workflow.step_event',
    category: config.category || 'system',
    severity: config.severity || 'info',
    source_system: 'workflow_engine',
    source_ref_id: runContext._runId || null,
    title: resolveTemplate(config.title || 'Workflow event', runContext),
    message: resolveTemplate(config.message || '', runContext),
    event_payload: {
      workflow_key: workflow.workflow_key,
      ...(config.payload || {}),
    },
    actor_type: 'system',
    platform: config.platform || 'omai',
  });
  return { event_id: result.id };
}

async function stepConditionCheck(config, runContext) {
  const pool = getAppPool();
  const check = config.check;
  const threshold = config.threshold ?? 1;
  const operator = config.operator || '>=';

  let value = 0;

  switch (check) {
    case 'stale_task_count': {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM omai_tasks
         WHERE status = 'running'
           AND (
             (last_heartbeat IS NOT NULL AND last_heartbeat < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 120 SECOND))
             OR (last_heartbeat IS NULL AND started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 120 SECOND))
           )`
      );
      value = rows[0].cnt;
      break;
    }
    case 'stalled_onboarding_count': {
      // Check for churches stuck in provisioning for >24h
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM omai_tasks
         WHERE task_type IN ('tenant_provision', 'onboarding')
           AND status = 'running'
           AND started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)`
      );
      value = rows[0].cnt;
      break;
    }
    case 'ocr_queue_depth': {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM omai_tasks
         WHERE task_type = 'ocr_feeder' AND status IN ('queued', 'running')`
      );
      value = rows[0].cnt;
      break;
    }
    case 'failed_task_count_recent': {
      const window = config.time_window_seconds || 3600;
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM omai_tasks
         WHERE status = 'failed'
           AND finished_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)`,
        [window]
      );
      value = rows[0].cnt;
      break;
    }
    default:
      throw new Error(`Unknown condition check: ${check}`);
  }

  const pass = compareValues(value, operator, threshold);

  if (!pass) {
    throw new Error(`SKIP: Condition "${check}" not met (value=${value}, required ${operator} ${threshold})`);
  }

  return { check, value, threshold, operator, passed: true };
}

async function stepAssignTask(config, runContext) {
  const pool = getAppPool();
  const taskId = config.task_id || (runContext.create_followup_task && runContext.create_followup_task.task_id);
  if (!taskId) throw new Error('assign_task: no task_id available');

  const assignee = config.assignee_name || 'ops-team';
  await pool.query(
    `UPDATE omai_tasks
     SET metadata_json = JSON_SET(COALESCE(metadata_json, '{}'), '$.assignee_name', ?, '$.assigned_at', UTC_TIMESTAMP())
     WHERE id = ?`,
    [assignee, taskId]
  );

  return { task_id: taskId, assignee_name: assignee };
}

async function stepUpdateStatus(config, runContext) {
  const pool = getAppPool();
  const taskId = config.task_id || (runContext.create_followup_task && runContext.create_followup_task.task_id);
  if (!taskId) throw new Error('update_status: no task_id available');

  const status = config.status;
  if (!['queued', 'running', 'succeeded', 'failed', 'cancelled'].includes(status)) {
    throw new Error(`update_status: invalid status "${status}"`);
  }

  await pool.query(
    'UPDATE omai_tasks SET status = ? WHERE id = ?',
    [status, taskId]
  );

  return { task_id: taskId, new_status: status };
}

async function stepWait(config) {
  const delayMs = Math.min((config.delay_seconds || 1) * 1000, 30000); // Max 30s
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return { waited_ms: delayMs };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compareValues(value, operator, threshold) {
  switch (operator) {
    case '>=': return value >= threshold;
    case '>':  return value > threshold;
    case '<=': return value <= threshold;
    case '<':  return value < threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
    default:   return value >= threshold;
  }
}

function resolveTemplate(template, context) {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split('.');
    let val = context;
    for (const p of parts) {
      if (val == null) return match;
      val = val[p];
    }
    return val != null ? String(val) : match;
  });
}

async function failRun(pool, runId, errorMessage) {
  await pool.query(
    `UPDATE platform_workflow_runs
     SET status = 'failed', error_message = ?, completed_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [errorMessage, runId]
  );
}

async function publishWorkflowEvent(eventType, workflow, runId, severity, title) {
  try {
    await publishPlatformEvent({
      event_type: eventType,
      category: 'system',
      severity,
      source_system: 'workflow_engine',
      source_ref_id: runId,
      title,
      event_payload: { workflow_id: workflow.id, workflow_key: workflow.workflow_key },
      actor_type: 'system',
      platform: 'omai',
    });
  } catch (err) {
    console.error('[WorkflowEngine] Failed to publish event:', err.message);
  }
}

module.exports = {
  executeWorkflow,
  retryWorkflowRun,
  cancelWorkflowRun,
  evaluateWorkflowTriggers,
  executeScheduledWorkflows,
  queryWorkflows,
  getWorkflowDetail,
  getWorkflowRunDetail,
  queryWorkflowRuns,
  toggleWorkflow,
};
