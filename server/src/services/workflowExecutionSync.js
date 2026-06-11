/**
 * Write-through sync — domain mutations → church_workflow_executions.
 * Call after platform DB updates succeed; failures enqueue outbox without blocking domain.
 */
const execution = require('./workflowExecutionService');
const reconcilers = require('./workflowExecutionReconcilers');
const { churchSubjectId, ocrJobSubjectId } = require('../utils/executionId');

async function syncFromReconcile(pool, workflowKey, subject, opts = {}) {
  if (!execution.isModelEnabled()) return null;
  if (!opts.force && !execution.isWriteThroughEnabled()) return null;

  const {
    actorType = 'system',
    actorUserId = null,
    correlationId = null,
    transitionSource = 'automatic',
  } = opts;

  try {
    const result = await reconcilers.reconcileSubject(pool, workflowKey, subject);
    const terminal = ['completed', 'failed', 'archived'].includes(result.status);
    if (!result.eligible && !terminal) return null;

    return await execution.upsertExecutionFromDomain(pool, {
      churchId: subject.church_id,
      workflowKey,
      subjectType: subject.subject_type,
      subjectId: subject.subject_id,
      status: result.status,
      currentStepKey: result.current_step_key,
      sourceTable: result.source_table,
      sourceRowId: result.source_row_id,
      sourceUpdatedAt: result.source_updated_at,
      contextSnapshot: result.context_snapshot,
      reconcileHash: result.reconcile_hash,
      transitionSource,
      actorType,
      actorUserId,
      correlationId,
    });
  } catch (err) {
    console.warn(`[workflowExecutionSync] ${workflowKey} failed:`, err.message);
    try {
      await execution.enqueueOutbox(pool, {
        executionId: null,
        operation: `sync:${workflowKey}`,
        payload: { subject, workflowKey },
        error: err.message,
      });
    } catch (outboxErr) {
      console.warn('[workflowExecutionSync] outbox failed:', outboxErr.message);
    }
    return null;
  }
}

async function syncEnrollment(pool, onboardingRequestId, opts = {}) {
  const [rows] = await pool.query(
    'SELECT church_id, onboarding_request_id FROM onboarding_requests WHERE onboarding_request_id = ? LIMIT 1',
    [onboardingRequestId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return syncFromReconcile(pool, 'church.enrollment', {
    church_id: row.church_id || 0,
    subject_type: 'onboarding_request',
    subject_id: row.onboarding_request_id,
  }, { ...opts, transitionSource: opts.transitionSource || 'automatic' });
}

async function syncChurchOps(pool, churchId, opts = {}) {
  return syncFromReconcile(pool, 'church.ops.setup', {
    church_id: churchId,
    subject_type: 'church',
    subject_id: churchSubjectId(churchId),
  }, opts);
}

async function syncOcrSetup(pool, churchId, opts = {}) {
  return syncFromReconcile(pool, 'ocr.setup.wizard', {
    church_id: churchId,
    subject_type: 'church',
    subject_id: churchSubjectId(churchId),
  }, opts);
}

async function syncOcrJob(pool, jobId, opts = {}) {
  const [rows] = await pool.query(
    'SELECT id, church_id FROM ocr_jobs WHERE id = ? LIMIT 1',
    [jobId]
  );
  if (!rows.length) return null;
  const job = rows[0];
  return syncFromReconcile(pool, 'ocr.batch.review', {
    church_id: job.church_id,
    subject_type: 'ocr_job',
    subject_id: ocrJobSubjectId(job.id),
  }, { ...opts, transitionSource: opts.transitionSource || 'pipeline' });
}

async function syncIdentityAdmin(pool, churchId, opts = {}) {
  return syncFromReconcile(pool, 'identity.user.admin', {
    church_id: churchId,
    subject_type: 'church',
    subject_id: churchSubjectId(churchId),
  }, opts);
}

async function syncCertificateGoal(pool, churchId, opts = {}) {
  return syncFromReconcile(pool, 'records.certificate.generate', {
    church_id: churchId,
    subject_type: 'church',
    subject_id: churchSubjectId(churchId),
  }, opts);
}

/** Sync all church-scoped workflows after parish hub / church row changes. */
async function syncChurchScopedWorkflows(pool, churchId, opts = {}) {
  if (!execution.isWriteThroughEnabled()) return;
  await Promise.all([
    syncChurchOps(pool, churchId, opts),
    syncOcrSetup(pool, churchId, opts),
    syncIdentityAdmin(pool, churchId, opts),
    syncCertificateGoal(pool, churchId, opts),
  ]);
}

module.exports = {
  syncFromReconcile,
  syncEnrollment,
  syncChurchOps,
  syncOcrSetup,
  syncOcrJob,
  syncIdentityAdmin,
  syncCertificateGoal,
  syncChurchScopedWorkflows,
};
