/**
 * Nightly / manual workflow execution reconcile + outbox retry.
 */
const execution = require('./workflowExecutionService');
const reconcilers = require('./workflowExecutionReconcilers');
const sync = require('./workflowExecutionSync');
const { generateReconcileRunId } = require('../utils/executionId');

const FILED_WORKFLOW_KEYS = Object.keys(reconcilers.RECONCILER_REGISTRY);

async function runScopedReconcile(pool, {
  workflowKey = null,
  churchId = null,
  runType = 'nightly',
} = {}) {
  if (!execution.isModelEnabled()) {
    return { skipped: true, reason: 'EXECUTION_MODEL_ENABLED=false' };
  }

  const runId = generateReconcileRunId();
  const started = Date.now();
  let churchesScanned = 0;
  let executionsCreated = 0;
  let executionsUpdated = 0;
  let driftCorrected = 0;
  let errors = 0;
  const errorLog = [];

  const workflowKeys = workflowKey ? [workflowKey] : FILED_WORKFLOW_KEYS;

  for (const wk of workflowKeys) {
    let subjects = await reconcilers.discoverSubjects(pool, wk);
    if (churchId != null) {
      subjects = subjects.filter((s) => s.church_id === churchId);
    }

    for (const subject of subjects) {
      churchesScanned += 1;
      try {
        const existing = await execution.findExecution(pool, {
          churchId: subject.church_id,
          workflowKey: wk,
          subjectType: subject.subject_type,
          subjectId: subject.subject_id,
        });
        const result = await reconcilers.reconcileSubject(pool, wk, subject);
        if (!result.eligible && !['completed', 'failed', 'archived'].includes(result.status)) {
          continue;
        }

        const beforeHash = existing?.reconcile_hash;
        await sync.syncFromReconcile(pool, wk, subject, {
          transitionSource: 'reconciliation',
          force: true,
        });

        if (!existing) executionsCreated += 1;
        else if (beforeHash !== result.reconcile_hash) {
          executionsUpdated += 1;
          driftCorrected += 1;
        }
      } catch (err) {
        errors += 1;
        errorLog.push({ workflow_key: wk, subject_id: subject.subject_id, error: err.message });
      }
    }
  }

  await execution.refreshExecutionSummary(pool, workflowKey);
  const durationMs = Date.now() - started;

  await pool.query(
    `INSERT INTO workflow_execution_reconcile_runs (
       run_id, run_type, workflow_key, churches_scanned,
       executions_created, executions_updated, drift_corrected, errors,
       completed_at, error_log
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      runId,
      runType,
      workflowKey,
      churchesScanned,
      executionsCreated,
      executionsUpdated,
      driftCorrected,
      errors,
      errorLog.length ? JSON.stringify(errorLog.slice(0, 50)) : null,
    ]
  );

  return {
    run_id: runId,
    run_type: runType,
    churches_scanned: churchesScanned,
    executions_created: executionsCreated,
    executions_updated: executionsUpdated,
    drift_corrected: driftCorrected,
    errors,
    duration_ms: durationMs,
  };
}

async function archiveCompletedOcrJobExecutions(pool, { retentionDays = 90 } = {}) {
  const [result] = await pool.query(
    `UPDATE church_workflow_executions
     SET status = 'archived', archived_at = NOW()
     WHERE workflow_key = 'ocr.batch.review'
       AND status = 'completed'
       AND completed_at IS NOT NULL
       AND completed_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [retentionDays]
  );
  return { archived: result.affectedRows || 0, retention_days: retentionDays };
}

async function retryOutbox(pool, { batchSize = 20, maxAttempts = 5 } = {}) {
  if (!execution.isModelEnabled()) return { retried: 0, skipped: true };

  const [rows] = await pool.query(
    `SELECT * FROM workflow_execution_outbox
     WHERE attempts < ?
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
     ORDER BY created_at ASC
     LIMIT ?`,
    [maxAttempts, batchSize]
  );

  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const payload = typeof row.payload === 'object' ? row.payload : JSON.parse(row.payload || '{}');
      const { subject, workflowKey } = payload;
      if (subject && workflowKey) {
        await sync.syncFromReconcile(pool, workflowKey, subject, { force: true });
      }
      await pool.query('DELETE FROM workflow_execution_outbox WHERE id = ?', [row.id]);
      succeeded += 1;
    } catch (err) {
      await pool.query(
        `UPDATE workflow_execution_outbox
         SET attempts = attempts + 1, last_error = ?, next_retry_at = DATE_ADD(NOW(), INTERVAL POWER(2, LEAST(attempts, 6)) MINUTE)
         WHERE id = ?`,
        [String(err.message).slice(0, 512), row.id]
      );
      failed += 1;
    }
  }

  return { retried: rows.length, succeeded, failed };
}

async function runNightlyMaintenance(pool) {
  const reconcile = await runScopedReconcile(pool, { runType: 'nightly' });
  const archive = await archiveCompletedOcrJobExecutions(pool);
  const outbox = await retryOutbox(pool);
  return { reconcile, archive, outbox };
}

module.exports = {
  runScopedReconcile,
  runNightlyMaintenance,
  archiveCompletedOcrJobExecutions,
  retryOutbox,
  FILED_WORKFLOW_KEYS,
};
