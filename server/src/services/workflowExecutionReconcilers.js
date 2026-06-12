/**
 * Workflow execution reconcilers — domain state → execution snapshot.
 * Ports inference logic from workflowGoalsService for backfill + nightly reconcile.
 */
const { churchSubjectId, ocrJobSubjectId, sha256Hex } = require('../utils/executionId');

const ENROLLMENT_STATUS_TO_STEP = {
  submitted: 'submit_enrollment',
  reviewing: 'staff_review',
  payment_pending: 'payment_pending',
  payment_received: 'payment_received',
  provisioning: 'provision_tenant',
  admin_account_created: 'create_admin_account',
  awaiting_first_login: 'await_first_login',
  record_tables_review: 'configure_record_tables',
  active: 'activate_parish',
  rejected: null,
  cancelled: null,
};

const OCR_REVIEW_STATUS_TO_STEP = {
  uploaded: 'upload_batch',
  ocr_complete: 'queue_processing',
  agent_extracted: 'agent_extract',
  human_confirmed: 'human_review',
  in_review: 'human_review',
  ready_to_seed: 'confirm_seed',
  seeded: 'write_records',
};

function resolveEnrollmentCurrentStep(request) {
  if (!request) return null;
  if (request.status === 'record_tables_review') {
    if (!request.table_configuration_completed) return 'configure_record_tables';
    if (!request.layout_configuration_completed) return 'configure_record_tables';
    return 'activate_parish';
  }
  if (Object.prototype.hasOwnProperty.call(ENROLLMENT_STATUS_TO_STEP, request.status)) {
    return ENROLLMENT_STATUS_TO_STEP[request.status];
  }
  return 'submit_enrollment';
}

function resolveEnrollmentStatus(request) {
  if (!request) return null;
  if (request.status === 'active') return 'completed';
  if (request.status === 'rejected') return 'failed';
  if (request.status === 'cancelled') return 'archived';
  return 'active';
}

function resolveOcrSetupStep(percentComplete, isComplete) {
  if (isComplete || percentComplete >= 100) return { step: null, status: 'completed' };
  if (percentComplete >= 60) return { step: 'feeder_settings', status: 'active' };
  if (percentComplete >= 40) return { step: 'layout_template', status: 'active' };
  if (percentComplete >= 20) return { step: 'record_types', status: 'active' };
  return { step: 'select_church', status: 'active' };
}

async function getChurchDbPool(churchId, pool) {
  const [rows] = await pool.query(
    'SELECT database_name FROM churches WHERE id = ? LIMIT 1',
    [churchId]
  );
  if (!rows.length || !rows[0].database_name) return null;
  const { getChurchDbConnection } = require('../utils/dbSwitcher');
  return getChurchDbConnection(rows[0].database_name);
}

async function countChurchRecords(churchDb) {
  const tables = [
    'baptism_records', 'marriage_records', 'funeral_records',
    'baptism', 'marriage', 'funeral',
  ];
  let total = 0;
  for (const table of tables) {
    try {
      const [rows] = await churchDb.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
      total += Number(rows[0]?.cnt || 0);
    } catch {
      // table may not exist
    }
  }
  return total;
}

async function countChurchUsersByLockState(pool, churchId) {
  const [rows] = await pool.query(
    `SELECT
       SUM(CASE WHEN u.is_locked = 1 THEN 1 ELSE 0 END) AS pending_users,
       SUM(CASE WHEN u.is_locked = 0 OR u.is_locked IS NULL THEN 1 ELSE 0 END) AS active_users
     FROM church_users cu
     JOIN users u ON u.id = cu.user_id
     WHERE cu.church_id = ?`,
    [churchId]
  );
  return {
    pending_users: Number(rows[0]?.pending_users || 0),
    active_users: Number(rows[0]?.active_users || 0),
  };
}

function buildReconcileResult({
  status,
  currentStepKey,
  sourceTable,
  sourceRowId,
  sourceUpdatedAt,
  contextSnapshot,
  eligible = true,
}) {
  const hashInput = JSON.stringify({
    status,
    currentStepKey,
    sourceRowId,
    sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt).toISOString() : null,
    contextSnapshot,
  });
  return {
    eligible,
    status,
    current_step_key: currentStepKey,
    source_table: sourceTable,
    source_row_id: sourceRowId,
    source_updated_at: sourceUpdatedAt,
    context_snapshot: contextSnapshot,
    reconcile_hash: sha256Hex(hashInput),
  };
}

async function reconcileEnrollment(pool, subject) {
  const requestId = subject.subject_id;
  const [rows] = await pool.query(
    'SELECT * FROM onboarding_requests WHERE onboarding_request_id = ? LIMIT 1',
    [requestId]
  );
  if (!rows.length) {
    return buildReconcileResult({
      status: 'archived',
      currentStepKey: null,
      sourceTable: 'onboarding_requests',
      sourceRowId: requestId,
      contextSnapshot: { reason: 'source_missing' },
      eligible: false,
    });
  }
  const req = rows[0];
  const stepKey = resolveEnrollmentCurrentStep(req);
  const status = resolveEnrollmentStatus(req);
  if (!stepKey && status === 'active') {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'audit_complete',
      sourceTable: 'onboarding_requests',
      sourceRowId: requestId,
      sourceUpdatedAt: req.updated_at,
      contextSnapshot: {
        source_status: req.status,
        payment_status: req.payment_status,
        provisioning_status: req.provisioning_status,
      },
      eligible: true,
    });
  }
  if (!stepKey) {
    return buildReconcileResult({
      status,
      currentStepKey: null,
      sourceTable: 'onboarding_requests',
      sourceRowId: requestId,
      sourceUpdatedAt: req.updated_at,
      contextSnapshot: { source_status: req.status },
      eligible: status !== 'archived',
    });
  }
  return buildReconcileResult({
    status: status === 'completed' ? 'completed' : 'active',
    currentStepKey: stepKey,
    sourceTable: 'onboarding_requests',
    sourceRowId: requestId,
    sourceUpdatedAt: req.updated_at,
    contextSnapshot: {
      source_status: req.status,
      payment_status: req.payment_status,
      provisioning_status: req.provisioning_status,
    },
    eligible: true,
  });
}

async function reconcileChurchOps(pool, subject) {
  const churchId = subject.church_id;
  const [chRows] = await pool.query(
    `SELECT setup_complete, database_name, is_active, client_status, onboarding_phase,
            has_baptism_records, has_marriage_records, has_funeral_records, updated_at
     FROM churches WHERE id = ? LIMIT 1`,
    [churchId]
  );
  if (!chRows.length) {
    return buildReconcileResult({ eligible: false, status: 'archived', currentStepKey: null });
  }
  const ch = chRows[0];
  if (ch.setup_complete === 1 || !ch.is_active) {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'audit_complete',
      sourceTable: 'churches',
      sourceRowId: String(churchId),
      sourceUpdatedAt: ch.updated_at,
      contextSnapshot: { setup_complete: ch.setup_complete },
      eligible: false,
    });
  }
  if (['directory', 'pre_onboarded', 'decommissioned'].includes(ch.client_status)) {
    return buildReconcileResult({ eligible: false, status: 'archived', currentStepKey: null });
  }
  const [openEnroll] = await pool.query(
    `SELECT id FROM onboarding_requests
     WHERE church_id = ? AND status NOT IN ('active', 'rejected', 'cancelled') LIMIT 1`,
    [churchId]
  );
  if (openEnroll.length) {
    return buildReconcileResult({ eligible: false, status: 'pending', currentStepKey: null });
  }

  let stepKey = 'verify_provision';
  if (!ch.database_name) {
    stepKey = 'verify_provision';
  } else if (!ch.has_baptism_records && !ch.has_marriage_records && !ch.has_funeral_records) {
    stepKey = 'database_mapping';
  } else if (Number(ch.onboarding_phase || 0) < 4) {
    stepKey = 'record_settings';
  } else {
    const { active_users: activeStaff } = await countChurchUsersByLockState(pool, churchId);
    stepKey = activeStaff < 2 ? 'parish_staff' : 'finalize_setup';
  }

  if (stepKey === 'finalize_setup') {
    await pool.query(
      `UPDATE churches SET setup_complete = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND setup_complete = 0`,
      [churchId]
    );
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'audit_complete',
      sourceTable: 'churches',
      sourceRowId: String(churchId),
      sourceUpdatedAt: new Date(),
      contextSnapshot: {
        setup_complete: true,
        auto_completed: true,
        client_status: ch.client_status,
      },
      eligible: false,
    });
  }

  return buildReconcileResult({
    status: 'active',
    currentStepKey: stepKey,
    sourceTable: 'churches',
    sourceRowId: String(churchId),
    sourceUpdatedAt: ch.updated_at,
    contextSnapshot: {
      client_status: ch.client_status,
      onboarding_phase: ch.onboarding_phase,
    },
    eligible: true,
  });
}

async function reconcileOcrSetup(pool, subject) {
  const churchId = subject.church_id;
  const churchDb = await getChurchDbPool(churchId, pool);
  let percentComplete = 0;
  let isComplete = false;
  let updatedAt = null;
  if (churchDb) {
    try {
      const [rows] = await churchDb.query(
        'SELECT percent_complete, is_complete FROM ocr_setup_state WHERE church_id = ?',
        [churchId]
      );
      if (rows.length) {
        percentComplete = Number(rows[0].percent_complete || 0);
        isComplete = Boolean(rows[0].is_complete);
      }
    } catch {
      // tenant table may not exist
    }
  }
  const resolved = resolveOcrSetupStep(percentComplete, isComplete);
  if (!resolved.step) {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'feeder_settings',
      sourceTable: 'ocr_setup_state',
      sourceRowId: String(churchId),
      sourceUpdatedAt: updatedAt,
      contextSnapshot: { percent_complete: percentComplete, is_complete: isComplete },
      eligible: false,
    });
  }
  return buildReconcileResult({
    status: 'active',
    currentStepKey: resolved.step,
    sourceTable: 'ocr_setup_state',
    sourceRowId: String(churchId),
    sourceUpdatedAt: updatedAt,
    contextSnapshot: { percent_complete: percentComplete, is_complete: isComplete },
    eligible: true,
  });
}

async function reconcileOcrJob(pool, subject) {
  const jobId = subject.subject_id.replace(/^job:/, '');
  const [rows] = await pool.query(
    `SELECT id, church_id, review_status, status, created_at, seeded_at
     FROM ocr_jobs WHERE id = ? LIMIT 1`,
    [jobId]
  );
  if (!rows.length) {
    return buildReconcileResult({
      eligible: false,
      status: 'archived',
      currentStepKey: null,
      sourceTable: 'ocr_jobs',
      sourceRowId: String(jobId),
      contextSnapshot: { reason: 'source_missing' },
    });
  }
  const job = rows[0];
  if (job.review_status === 'seeded' || job.seeded_at) {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'write_records',
      sourceTable: 'ocr_jobs',
      sourceRowId: String(job.id),
      sourceUpdatedAt: job.created_at,
      contextSnapshot: { review_status: job.review_status },
      eligible: false,
    });
  }
  const stepKey = OCR_REVIEW_STATUS_TO_STEP[job.review_status] || 'human_review';
  return buildReconcileResult({
    status: 'active',
    currentStepKey: stepKey,
    sourceTable: 'ocr_jobs',
    sourceRowId: String(job.id),
    sourceUpdatedAt: job.created_at,
    contextSnapshot: { review_status: job.review_status, status: job.status },
    eligible: true,
  });
}

async function reconcileManualEntry(pool, subject) {
  const churchId = subject.church_id;
  const [chRows] = await pool.query(
    'SELECT is_active, client_status FROM churches WHERE id = ? LIMIT 1',
    [churchId]
  );
  if (!chRows.length || !chRows[0].is_active) {
    return buildReconcileResult({ eligible: false, status: 'archived', currentStepKey: null });
  }
  if (['directory', 'pre_onboarded', 'decommissioned'].includes(chRows[0].client_status)) {
    return buildReconcileResult({ eligible: false, status: 'archived', currentStepKey: null });
  }

  const churchDb = await getChurchDbPool(churchId, pool);
  if (!churchDb) {
    return buildReconcileResult({ eligible: false, status: 'pending', currentStepKey: null });
  }

  const recordCount = await countChurchRecords(churchDb);
  if (recordCount >= 10) {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'audit_complete',
      sourceTable: 'church_records',
      sourceRowId: String(churchId),
      contextSnapshot: { record_count: recordCount },
      eligible: false,
    });
  }

  const stepKey = recordCount === 0 ? 'select_record_type' : 'open_entry_form';
  return buildReconcileResult({
    status: 'active',
    currentStepKey: stepKey,
    sourceTable: 'church_records',
    sourceRowId: String(churchId),
    contextSnapshot: { record_count: recordCount },
    eligible: true,
  });
}

async function reconcileCertificate(pool, subject) {
  const churchId = subject.church_id;
  const [genRows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM generated_certificates WHERE church_id = ?',
    [churchId]
  );
  if (Number(genRows[0]?.cnt || 0) > 0) {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'print_or_download',
      sourceTable: 'generated_certificates',
      sourceRowId: String(churchId),
      contextSnapshot: { certificates_generated: Number(genRows[0].cnt) },
      eligible: false,
    });
  }
  const churchDb = await getChurchDbPool(churchId, pool);
  if (!churchDb) {
    return buildReconcileResult({ eligible: false, status: 'pending', currentStepKey: null });
  }
  const recordCount = await countChurchRecords(churchDb);
  if (recordCount === 0) {
    return buildReconcileResult({ eligible: false, status: 'pending', currentStepKey: null });
  }
  return buildReconcileResult({
    status: 'active',
    currentStepKey: 'select_record',
    sourceTable: 'generated_certificates',
    sourceRowId: String(churchId),
    contextSnapshot: { record_count: recordCount },
    eligible: true,
  });
}

async function reconcileIdentityAdmin(pool, subject) {
  const churchId = subject.church_id;
  const { pending_users: pendingCount, active_users: activeCount } =
    await countChurchUsersByLockState(pool, churchId);

  if (activeCount >= 2 && pendingCount === 0) {
    return buildReconcileResult({
      status: 'completed',
      currentStepKey: 'notify_user',
      sourceTable: 'church_users',
      sourceRowId: String(churchId),
      contextSnapshot: { pending_users: pendingCount, active_users: activeCount },
      eligible: false,
    });
  }

  let stepKey = 'create_or_edit';
  if (pendingCount > 0) stepKey = 'notify_user';

  return buildReconcileResult({
    status: 'active',
    currentStepKey: stepKey,
    sourceTable: 'church_users',
    sourceRowId: String(churchId),
    contextSnapshot: { pending_users: pendingCount, active_users: activeCount },
    eligible: true,
  });
}

const RECONCILER_REGISTRY = {
  'church.enrollment': reconcileEnrollment,
  'church.ops.setup': reconcileChurchOps,
  'ocr.setup.wizard': reconcileOcrSetup,
  'ocr.batch.review': reconcileOcrJob,
  'records.manual.entry': reconcileManualEntry,
  'records.certificate.generate': reconcileCertificate,
  'identity.user.admin': reconcileIdentityAdmin,
};

async function discoverSubjects(pool, workflowKey) {
  const subjects = [];

  if (workflowKey === 'church.enrollment') {
    const [rows] = await pool.query(
      `SELECT church_id, onboarding_request_id AS subject_id
       FROM onboarding_requests
       WHERE status NOT IN ('cancelled')`
    );
    for (const r of rows) {
      subjects.push({
        church_id: r.church_id || 0,
        subject_type: 'onboarding_request',
        subject_id: r.subject_id,
      });
    }
    return subjects;
  }

  if (workflowKey === 'ocr.batch.review') {
    const [rows] = await pool.query(
      `SELECT church_id, id AS job_id
       FROM ocr_jobs
       WHERE review_status NOT IN ('seeded')
         AND (seeded_at IS NULL OR review_status != 'seeded')`
    );
    for (const r of rows) {
      subjects.push({
        church_id: r.church_id,
        subject_type: 'ocr_job',
        subject_id: ocrJobSubjectId(r.job_id),
      });
    }
    return subjects;
  }

  const [churches] = await pool.query(
    `SELECT id AS church_id FROM churches
     WHERE is_active = 1 AND database_name IS NOT NULL`
  );
  for (const ch of churches) {
    subjects.push({
      church_id: ch.church_id,
      subject_type: 'church',
      subject_id: churchSubjectId(ch.church_id),
    });
  }
  return subjects;
}

async function reconcileSubject(pool, workflowKey, subject) {
  const fn = RECONCILER_REGISTRY[workflowKey];
  if (!fn) return { skipped: true, reason: 'no_reconciler' };
  const result = await fn(pool, subject);
  return result;
}

module.exports = {
  RECONCILER_REGISTRY,
  discoverSubjects,
  reconcileSubject,
  reconcileEnrollment,
  reconcileChurchOps,
  reconcileOcrSetup,
  reconcileOcrJob,
  reconcileManualEntry,
  reconcileCertificate,
  reconcileIdentityAdmin,
};
