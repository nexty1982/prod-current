/**
 * Workflow Scheduler — centralized scheduled workflow execution.
 *
 * Uses node-cron to evaluate scheduled workflows at minute granularity.
 * Each workflow's trigger_config.cron is matched against the current time.
 *
 * Safety:
 * - Duplicate execution prevented by workflow engine's cooldown + max_concurrent checks
 * - Single scheduler instance (initialized once from index.ts)
 * - All runs are logged and auditable
 * - Failures are caught and logged, never crash the process
 */

const cron = require('node-cron');
const { getAppPool } = require('../config/db');

let schedulerJob = null;
let isRunning = false;

/**
 * Start the workflow scheduler. Call once at app startup.
 */
function startWorkflowScheduler() {
  if (schedulerJob) {
    console.log('[WorkflowScheduler] Already running');
    return;
  }

  // Run every minute to evaluate scheduled workflows
  schedulerJob = cron.schedule('* * * * *', async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;
    try {
      await evaluateScheduledWorkflows();
    } catch (err) {
      console.error('[WorkflowScheduler] Tick error:', err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log('[WorkflowScheduler] Started — evaluating scheduled workflows every minute');
}

/**
 * Stop the scheduler (for graceful shutdown).
 */
function stopWorkflowScheduler() {
  if (schedulerJob) {
    schedulerJob.stop();
    schedulerJob = null;
    console.log('[WorkflowScheduler] Stopped');
  }
}

/**
 * Evaluate which scheduled workflows should run now.
 * Checks each workflow's cron expression against current time.
 */
async function evaluateScheduledWorkflows() {
  const pool = getAppPool();

  const [workflows] = await pool.query(
    `SELECT id, workflow_key, name, trigger_config, cooldown_seconds
     FROM platform_workflows
     WHERE is_enabled = 1 AND trigger_type = 'schedule'`
  );

  if (!workflows.length) return;

  const { executeWorkflow } = require('./workflowEngine');

  for (const wf of workflows) {
    try {
      let config;
      try {
        config = typeof wf.trigger_config === 'string'
          ? JSON.parse(wf.trigger_config) : wf.trigger_config;
      } catch { continue; }

      if (!config || !config.cron) continue;

      // Check if cron expression matches current minute
      if (!cron.validate(config.cron)) {
        console.warn(`[WorkflowScheduler] Invalid cron for ${wf.workflow_key}: ${config.cron}`);
        continue;
      }

      // node-cron doesn't expose a "does this match now" API directly,
      // so we create a temporary task and check if it would fire this minute
      const now = new Date();
      if (!cronMatchesNow(config.cron, now)) continue;

      // Execute (cooldown + concurrency enforced by engine)
      console.log(`[WorkflowScheduler] Triggering: ${wf.workflow_key}`);
      executeWorkflow({
        workflowId: wf.id,
        triggerSource: 'schedule',
        context: {
          scheduled_at: now.toISOString(),
          cron: config.cron,
          description: config.description || null,
        }
      }).catch(err => {
        console.error(`[WorkflowScheduler] ${wf.workflow_key} failed:`, err.message);
      });

    } catch (err) {
      console.error(`[WorkflowScheduler] Error evaluating ${wf.workflow_key}:`, err.message);
    }
  }
}

/**
 * Check if a cron expression would fire at the given time.
 * Parses cron fields and compares against current date components.
 */
function cronMatchesNow(cronExpr, now) {
  // Standard cron: minute hour dayOfMonth month dayOfWeek
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [minField, hourField, domField, monField, dowField] = parts;

  const minute = now.getMinutes();
  const hour = now.getHours();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;
  const dayOfWeek = now.getDay(); // 0=Sun

  return fieldMatches(minField, minute, 0, 59)
    && fieldMatches(hourField, hour, 0, 23)
    && fieldMatches(domField, dayOfMonth, 1, 31)
    && fieldMatches(monField, month, 1, 12)
    && fieldMatches(dowField, dayOfWeek, 0, 7);
}

/**
 * Check if a single cron field matches a value.
 * Supports: *, N, N-M, * /N, N-M/S, comma-separated lists.
 */
function fieldMatches(field, value, min, max) {
  if (field === '*') return true;

  // Comma-separated
  const parts = field.split(',');
  for (const part of parts) {
    // Step: */N or N-M/S
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr) || 1;
      let start = min, end = max;
      if (range !== '*') {
        if (range.includes('-')) {
          [start, end] = range.split('-').map(Number);
        } else {
          start = parseInt(range);
          end = max;
        }
      }
      for (let i = start; i <= end; i += step) {
        if (i === value) return true;
      }
    }
    // Range: N-M
    else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (value >= start && value <= end) return true;
    }
    // Exact
    else {
      if (parseInt(part) === value) return true;
    }
  }

  return false;
}

module.exports = {
  startWorkflowScheduler,
  stopWorkflowScheduler,
};
