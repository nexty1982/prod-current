/**
 * Workflow execution — canonical per-church workflow state (Phase B).
 * Single write authority for church_workflow_executions* tables.
 */
const catalog = require('./workflowCatalogService');
const {
  generateExecutionId,
  generateEventId,
  churchSubjectId,
  buildDedupeKey,
  definitionHashFromSteps,
} = require('../utils/executionId');

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'archived']);
const OPEN_STATUSES = new Set(['pending', 'active', 'blocked']);

function getExecutionFlags() {
  return {
    model_enabled: process.env.EXECUTION_MODEL_ENABLED === 'true',
    write_through: process.env.EXECUTION_WRITE_THROUGH === 'true',
    read_primary: process.env.EXECUTION_READ_PRIMARY === 'true',
    fallback_inference: process.env.EXECUTION_FALLBACK_INFERENCE !== 'false',
    analytics_enabled: process.env.EXECUTION_ANALYTICS_ENABLED === 'true',
  };
}

function isModelEnabled() {
  return getExecutionFlags().model_enabled;
}

function isWriteThroughEnabled() {
  return getExecutionFlags().model_enabled && getExecutionFlags().write_through;
}

function mapExecutionStatusToStepBucket(status) {
  if (status === 'active' || status === 'pending') return 'active';
  if (status === 'blocked') return 'blocked';
  if (status === 'failed') return 'failed';
  if (status === 'completed') return 'completed';
  return null;
}

async function fetchExecutionRow(pool, executionId, { forUpdate = false } = {}) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const [rows] = await pool.query(
    `SELECT * FROM church_workflow_executions WHERE execution_id = ?${lock}`,
    [executionId]
  );
  return rows[0] || null;
}

async function findExecution(pool, { churchId, workflowKey, subjectType, subjectId }) {
  const [rows] = await pool.query(
    `SELECT * FROM church_workflow_executions
     WHERE church_id = ? AND workflow_key = ? AND subject_type = ? AND subject_id = ?
     LIMIT 1`,
    [churchId, workflowKey, subjectType, subjectId]
  );
  return rows[0] || null;
}

async function fetchStepRows(pool, executionId) {
  const [rows] = await pool.query(
    `SELECT * FROM church_workflow_step_executions
     WHERE execution_id = ?
     ORDER BY step_sequence`,
    [executionId]
  );
  return rows;
}

async function preseedSteps(pool, executionId, catalogSteps, currentStepKey, transitionSource = 'system') {
  if (!catalogSteps?.length) return;
  const currentIdx = currentStepKey
    ? catalogSteps.findIndex((s) => s.step_key === currentStepKey)
    : -1;

  for (let i = 0; i < catalogSteps.length; i++) {
    const step = catalogSteps[i];
    let stepStatus = 'pending';
    if (currentIdx >= 0) {
      if (i < currentIdx) stepStatus = 'completed';
      else if (i === currentIdx) stepStatus = 'active';
    }
    await pool.query(
      `INSERT INTO church_workflow_step_executions (
         execution_id, step_key, step_sequence, step_status, last_transition_source,
         entered_at, completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         step_status = IF(VALUES(step_status) = 'pending' AND step_status != 'pending', step_status, VALUES(step_status)),
         last_transition_source = COALESCE(VALUES(last_transition_source), last_transition_source),
         entered_at = COALESCE(entered_at, VALUES(entered_at)),
         completed_at = COALESCE(completed_at, VALUES(completed_at))`,
      [
        executionId,
        step.step_key,
        step.step_sequence,
        stepStatus,
        transitionSource,
        stepStatus === 'active' || stepStatus === 'completed' ? new Date() : null,
        stepStatus === 'completed' ? new Date() : null,
      ]
    );
  }
}

async function syncStepProgress(pool, executionId, catalogSteps, currentStepKey, transitionSource) {
  if (!catalogSteps?.length || !currentStepKey) return;
  const currentIdx = catalogSteps.findIndex((s) => s.step_key === currentStepKey);
  if (currentIdx < 0) return;

  for (let i = 0; i < catalogSteps.length; i++) {
    const step = catalogSteps[i];
    let stepStatus = 'pending';
    if (i < currentIdx) stepStatus = 'completed';
    else if (i === currentIdx) stepStatus = 'active';

    await pool.query(
      `UPDATE church_workflow_step_executions
       SET step_status = ?,
           last_transition_source = ?,
           entered_at = COALESCE(entered_at, IF(? IN ('active','completed'), NOW(), NULL)),
           completed_at = IF(? = 'completed', COALESCE(completed_at, NOW()), completed_at)
       WHERE execution_id = ? AND step_key = ?`,
      [stepStatus, transitionSource, stepStatus, stepStatus, executionId, step.step_key]
    );
  }
}

async function insertEvent(pool, {
  executionId,
  churchId,
  workflowKey,
  appFamilyKey,
  eventType,
  fromStatus,
  toStatus,
  fromStepKey,
  toStepKey,
  actorType = 'system',
  actorUserId = null,
  correlationId = null,
  dedupeKey,
  payload = null,
}) {
  const eventId = generateEventId();
  try {
    await pool.query(
      `INSERT INTO workflow_execution_events (
         event_id, execution_id, church_id, workflow_key, app_family_key,
         event_type, from_status, to_status, from_step_key, to_step_key,
         actor_type, actor_user_id, correlation_id, dedupe_key, payload
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        executionId,
        churchId,
        workflowKey,
        appFamilyKey,
        eventType,
        fromStatus,
        toStatus,
        fromStepKey,
        toStepKey,
        actorType,
        actorUserId,
        correlationId,
        dedupeKey,
        payload ? JSON.stringify(payload) : null,
      ]
    );
    return eventId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

async function enqueueOutbox(pool, { executionId, operation, payload, error }) {
  await pool.query(
    `INSERT INTO workflow_execution_outbox (execution_id, operation, payload, last_error, next_retry_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 MINUTE))`,
    [
      executionId,
      operation,
      JSON.stringify(payload),
      error ? String(error).slice(0, 512) : null,
    ]
  );
}

async function applySummaryDelta(pool, workflowKey, { oldStatus, newStatus, oldStep, newStep }) {
  const oldBucket = mapExecutionStatusToStepBucket(oldStatus);
  const newBucket = mapExecutionStatusToStepBucket(newStatus);

  const counters = {};
  if (oldStatus && newStatus && oldStatus !== newStatus) {
    counters[`executions_${oldStatus}`] = -1;
    counters[`executions_${newStatus}`] = 1;
  }

  const sets = Object.entries(counters)
    .filter(([k, v]) => v !== 0 && k.startsWith('executions_'))
    .map(([k, v]) => `${k} = GREATEST(0, ${k} + (${v}))`);

  if (sets.length) {
    await pool.query(
      `UPDATE workflow_execution_summary SET ${sets.join(', ')}, stale = 0 WHERE workflow_key = ?`,
      [workflowKey]
    );
  }

  if (oldStep && oldBucket && oldStep !== newStep) {
    await pool.query(
      `UPDATE workflow_execution_step_summary
       SET execution_count = GREATEST(0, execution_count - 1)
       WHERE workflow_key = ? AND step_key = ? AND status_bucket = ?`,
      [workflowKey, oldStep, oldBucket]
    );
  }
  if (newStep && newBucket) {
    await pool.query(
      `INSERT INTO workflow_execution_step_summary (workflow_key, step_key, status_bucket, execution_count)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE execution_count = execution_count + 1`,
      [workflowKey, newStep, newBucket]
    );
  }
}

/**
 * Create a new execution row with pre-seeded steps.
 */
async function createExecution(pool, {
  churchId,
  workflowKey,
  subjectType = 'church',
  subjectId,
  status = 'active',
  currentStepKey = null,
  sourceTable = null,
  sourceRowId = null,
  sourceUpdatedAt = null,
  contextSnapshot = null,
  reconcileHash = null,
  actorType = 'system',
  actorUserId = null,
  correlationId = null,
  transitionSource = 'system',
}, conn = null) {
  const db = conn || pool;
  const workflow = await catalog.fetchWorkflowDetail(workflowKey);
  if (!workflow) throw new Error(`Unknown workflow: ${workflowKey}`);

  const executionId = generateExecutionId();
  const versionId = workflow.version_id || null;
  const defHash = definitionHashFromSteps(workflow.steps);
  const now = new Date();
  const currentStep = currentStepKey
    ? workflow.steps.find((s) => s.step_key === currentStepKey)
    : null;

  await db.query(
    `INSERT INTO church_workflow_executions (
       execution_id, church_id, workflow_key, workflow_version, workflow_version_id,
       definition_hash, app_family_key, subject_type, subject_id, status,
       current_step_key, current_step_sequence,
       source_table, source_row_id, source_updated_at,
       context_snapshot, reconcile_hash, last_reconciled_at,
       started_at, started_by_user_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
    [
      executionId,
      churchId,
      workflowKey,
      workflow.active_version || '1.0.0',
      versionId,
      defHash,
      workflow.app_family_key,
      subjectType,
      subjectId,
      status,
      currentStepKey,
      currentStep?.step_sequence ?? null,
      sourceTable,
      sourceRowId,
      sourceUpdatedAt,
      contextSnapshot ? JSON.stringify(contextSnapshot) : null,
      reconcileHash,
      OPEN_STATUSES.has(status) ? now : null,
      actorUserId,
    ]
  );

  await preseedSteps(db, executionId, workflow.steps, currentStepKey, transitionSource);

  const dedupeKey = buildDedupeKey([executionId, 'execution_created', reconcileHash || '']);
  await insertEvent(db, {
    executionId,
    churchId,
    workflowKey,
    appFamilyKey: workflow.app_family_key,
    eventType: 'execution_created',
    toStatus: status,
    toStepKey: currentStepKey,
    actorType,
    actorUserId,
    correlationId,
    dedupeKey,
    payload: { subject_type: subjectType, subject_id: subjectId },
  });

  if (status === 'active' && currentStepKey) {
    const startDedupe = buildDedupeKey([executionId, 'execution_started', currentStepKey]);
    await insertEvent(db, {
      executionId,
      churchId,
      workflowKey,
      appFamilyKey: workflow.app_family_key,
      eventType: 'execution_started',
      toStatus: status,
      toStepKey: currentStepKey,
      actorType,
      actorUserId,
      correlationId,
      dedupeKey: startDedupe,
    });
  }

  await applySummaryDelta(db, workflowKey, {
    oldStatus: null,
    newStatus: status,
    oldStep: null,
    newStep: currentStepKey,
  });

  return fetchExecutionRow(db, executionId);
}

/**
 * Apply state transition with optimistic locking and idempotent events.
 */
async function applyTransition(pool, executionId, {
  toStatus,
  toStepKey = null,
  transitionSource = 'system',
  actorType = 'system',
  actorUserId = null,
  correlationId = null,
  contextSnapshot = null,
  reconcileHash = null,
  sourceUpdatedAt = null,
  blockedReason = null,
  expectedLockVersion = null,
  workflowDetail = null,
}, conn = null) {
  const db = conn || pool;
  const row = await fetchExecutionRow(db, executionId, { forUpdate: Boolean(conn) });
  if (!row) throw new Error(`Execution not found: ${executionId}`);

  if (expectedLockVersion != null && row.lock_version !== expectedLockVersion) {
    const err = new Error('EXECUTION_CONFLICT');
    err.code = 'EXECUTION_CONFLICT';
    err.lock_version = row.lock_version;
    throw err;
  }

  const workflow = workflowDetail || await catalog.fetchWorkflowDetail(row.workflow_key);
  const fromStatus = row.status;
  const fromStepKey = row.current_step_key;
  const toStep = toStepKey
    ? workflow?.steps?.find((s) => s.step_key === toStepKey)
    : null;
  const resolvedToStepKey = toStepKey || fromStepKey;
  const resolvedToStatus = toStatus || fromStatus;

  const dedupeKey = buildDedupeKey([
    executionId,
    'transition',
    fromStatus,
    resolvedToStatus,
    fromStepKey,
    resolvedToStepKey,
    transitionSource,
    reconcileHash || sourceUpdatedAt || '',
  ]);

  if (resolvedToStepKey && workflow?.steps?.length) {
    await syncStepProgress(db, executionId, workflow.steps, resolvedToStepKey, transitionSource);
  }

  const timeFields = {};
  if (resolvedToStatus === 'completed' && fromStatus !== 'completed') timeFields.completed_at = new Date();
  if (resolvedToStatus === 'failed' && fromStatus !== 'failed') timeFields.failed_at = new Date();
  if (resolvedToStatus === 'archived' && fromStatus !== 'archived') timeFields.archived_at = new Date();
  if (resolvedToStatus === 'blocked' && fromStatus !== 'blocked') timeFields.blocked_at = new Date();

  await db.query(
    `UPDATE church_workflow_executions
     SET status = ?,
         current_step_key = ?,
         current_step_sequence = ?,
         blocked_reason = ?,
         blocked_at = IF(? = 'blocked', COALESCE(blocked_at, NOW()), IF(? != 'blocked', NULL, blocked_at)),
         context_snapshot = COALESCE(?, context_snapshot),
         reconcile_hash = COALESCE(?, reconcile_hash),
         source_updated_at = COALESCE(?, source_updated_at),
         last_reconciled_at = IF(? = 'reconciliation', NOW(), last_reconciled_at),
         completed_at = COALESCE(?, completed_at),
         failed_at = COALESCE(?, failed_at),
         archived_at = COALESCE(?, archived_at),
         completed_by_user_id = IF(? IN ('completed','failed','archived'), ?, completed_by_user_id),
         lock_version = lock_version + 1
     WHERE execution_id = ? AND lock_version = ?`,
    [
      resolvedToStatus,
      resolvedToStepKey,
      toStep?.step_sequence ?? row.current_step_sequence,
      resolvedToStatus === 'blocked' ? blockedReason : null,
      resolvedToStatus,
      resolvedToStatus,
      contextSnapshot ? JSON.stringify(contextSnapshot) : null,
      reconcileHash,
      sourceUpdatedAt,
      transitionSource,
      timeFields.completed_at || null,
      timeFields.failed_at || null,
      timeFields.archived_at || null,
      resolvedToStatus,
      actorUserId,
      executionId,
      row.lock_version,
    ]
  );

  const eventType = transitionSource === 'reconciliation' ? 'reconciled'
    : resolvedToStatus !== fromStatus ? 'status_changed'
      : resolvedToStepKey !== fromStepKey ? 'step_entered'
        : 'status_changed';

  await insertEvent(db, {
    executionId,
    churchId: row.church_id,
    workflowKey: row.workflow_key,
    appFamilyKey: row.app_family_key,
    eventType,
    fromStatus,
    toStatus: resolvedToStatus,
    fromStepKey,
    toStepKey: resolvedToStepKey,
    actorType: transitionSource === 'reconciliation' ? 'reconciler' : actorType,
    actorUserId,
    correlationId,
    dedupeKey,
    payload: contextSnapshot || null,
  });

  await applySummaryDelta(db, row.workflow_key, {
    oldStatus: fromStatus,
    newStatus: resolvedToStatus,
    oldStep: fromStepKey,
    newStep: resolvedToStepKey,
  });

  return fetchExecutionRow(db, executionId);
}

/**
 * Upsert execution from domain write-through or reconcile.
 */
async function upsertExecutionFromDomain(pool, {
  churchId,
  workflowKey,
  subjectType = 'church',
  subjectId,
  status,
  currentStepKey,
  sourceTable,
  sourceRowId,
  sourceUpdatedAt,
  contextSnapshot,
  reconcileHash,
  transitionSource = 'automatic',
  actorType = 'system',
  actorUserId = null,
  correlationId = null,
}) {
  if (!isModelEnabled()) return null;

  const existing = await findExecution(pool, {
    churchId,
    workflowKey,
    subjectType,
    subjectId,
  });

  if (!existing) {
    return createExecution(pool, {
      churchId,
      workflowKey,
      subjectType,
      subjectId,
      status,
      currentStepKey,
      sourceTable,
      sourceRowId,
      sourceUpdatedAt,
      contextSnapshot,
      reconcileHash,
      actorType,
      actorUserId,
      correlationId,
      transitionSource,
    });
  }

  if (existing.reconcile_hash === reconcileHash && existing.current_step_key === currentStepKey
      && existing.status === status) {
    return existing;
  }

  return applyTransition(pool, existing.execution_id, {
    toStatus: status,
    toStepKey: currentStepKey,
    transitionSource,
    actorType,
    actorUserId,
    correlationId,
    contextSnapshot,
    reconcileHash,
    sourceUpdatedAt,
    expectedLockVersion: existing.lock_version,
  });
}

async function listOpenExecutionsForChurch(pool, churchId) {
  const [rows] = await pool.query(
    `SELECT e.*, w.workflow_name
     FROM church_workflow_executions e
     LEFT JOIN app_workflows w ON w.workflow_key = e.workflow_key
     WHERE e.church_id = ? AND e.status IN ('pending', 'active', 'blocked')
     ORDER BY e.workflow_key, e.updated_at DESC`,
    [churchId]
  );
  return rows;
}

async function refreshExecutionSummary(pool, workflowKey = null) {
  const started = Date.now();
  await pool.query('UPDATE workflow_execution_summary SET stale = 1');

  let wfFilter = '';
  const params = [];
  if (workflowKey) {
    wfFilter = ' WHERE workflow_key = ?';
    params.push(workflowKey);
  }

  const [workflows] = await pool.query(
    `SELECT workflow_key, app_family_key FROM workflow_execution_summary${wfFilter}`,
    params
  );

  for (const wf of workflows) {
    const [counts] = await pool.query(
      `SELECT status, COUNT(*) AS cnt
       FROM church_workflow_executions
       WHERE workflow_key = ?
       GROUP BY status`,
      [wf.workflow_key]
    );
    const dist = {};
    let total = 0;
    for (const c of counts) {
      dist[c.status] = Number(c.cnt);
      total += Number(c.cnt);
    }

    const [stepDist] = await pool.query(
      `SELECT current_step_key AS step_key, COUNT(*) AS cnt
       FROM church_workflow_executions
       WHERE workflow_key = ? AND status IN ('pending','active','blocked') AND current_step_key IS NOT NULL
       GROUP BY current_step_key`,
      [wf.workflow_key]
    );
    const stepDistribution = {};
    for (const s of stepDist) stepDistribution[s.step_key] = Number(s.cnt);

    await pool.query(
      `UPDATE workflow_execution_summary SET
         executions_total = ?,
         executions_pending = ?,
         executions_active = ?,
         executions_blocked = ?,
         executions_completed = ?,
         executions_failed = ?,
         executions_archived = ?,
         step_distribution = ?,
         status_distribution = ?,
         snapshot_at = NOW(),
         stale = 0,
         refresh_duration_ms = ?
       WHERE workflow_key = ?`,
      [
        total,
        dist.pending || 0,
        dist.active || 0,
        dist.blocked || 0,
        dist.completed || 0,
        dist.failed || 0,
        dist.archived || 0,
        JSON.stringify(stepDistribution),
        JSON.stringify(dist),
        Date.now() - started,
        wf.workflow_key,
      ]
    );
  }
}

module.exports = {
  TERMINAL_STATUSES,
  OPEN_STATUSES,
  getExecutionFlags,
  isModelEnabled,
  isWriteThroughEnabled,
  churchSubjectId,
  fetchExecutionRow,
  findExecution,
  fetchStepRows,
  createExecution,
  applyTransition,
  upsertExecutionFromDomain,
  listOpenExecutionsForChurch,
  refreshExecutionSummary,
  enqueueOutbox,
  preseedSteps,
  insertEvent,
};
