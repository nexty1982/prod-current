/**
 * Workflow Goals — resolves catalog steps + live runtime into actionable goals.
 *
 * ADDING A NEW WORKFLOW (no gaps):
 * 1. File workflow in app_workflows* (migration or admin seed) with steps + route_entrypoints.
 * 2. Register a runtime resolver in RUNTIME_RESOLVERS below.
 * 3. Optionally add STEP_ACTION_ROUTES for parish/admin deep links.
 * 4. Goals appear automatically on GET /api/workflow-goals and admin enrollment detail.
 */
const catalog = require('./workflowCatalogService');

/** onboarding_requests.status → catalog step_key */
const ENROLLMENT_STATUS_TO_STEP = {
  submitted: 'submit_enrollment',
  reviewing: 'staff_review',
  payment_pending: 'payment',
  payment_received: 'payment',
  provisioning: 'provision_tenant',
  admin_account_created: 'create_admin_account',
  awaiting_first_login: 'await_first_login',
  record_tables_review: 'configure_record_tables',
  active: 'activate_parish',
  rejected: null,
  cancelled: null,
};

/** Per-step action routes (OM app paths). Extend when filing new workflows. */
const STEP_ACTION_ROUTES = {
  'church.enrollment': {
    submit_enrollment: { route: '/enroll', label: 'View enrollment', audience: 'admin' },
    staff_review: { route: '/admin/onboarding', label: 'Review enrollment', audience: 'admin' },
    payment: { route: '/admin/onboarding', label: 'Manage payment', audience: 'admin' },
    provision_tenant: { route: '/admin/onboarding', label: 'Provisioning status', audience: 'admin' },
    create_admin_account: { route: '/admin/onboarding', label: 'Admin account', audience: 'admin' },
    await_first_login: { route: '/onboarding/change-password', label: 'Set your password', audience: 'parish' },
    configure_record_tables: { route: '/onboarding/record-tables', label: 'Configure record tables', audience: 'parish' },
    activate_parish: { route: '/account/parish-management', label: 'Open parish hub', audience: 'parish' },
    audit_complete: { route: '/account/parish-management', label: 'Parish dashboard', audience: 'parish' },
  },
  'ocr.batch.review': {
    upload_batch: { route: '/devel/ocr-studio/upload', label: 'Upload records', audience: 'parish' },
    human_review: { route: '/portal/ocr', label: 'Review OCR batch', audience: 'parish' },
    confirm_seed: { route: '/portal/ocr', label: 'Confirm and seed', audience: 'parish' },
  },
};

function resolveEnrollmentCurrentStep(request) {
  if (!request) return null;
  if (request.status === 'record_tables_review') {
    if (!request.table_configuration_completed) return 'configure_record_tables';
    if (!request.layout_configuration_completed) return 'configure_record_tables';
    return 'activate_parish';
  }
  return ENROLLMENT_STATUS_TO_STEP[request.status] ?? 'submit_enrollment';
}

function buildStepProgress(catalogSteps, currentStepKey) {
  if (!catalogSteps?.length) return [];
  const currentIdx = currentStepKey
    ? catalogSteps.findIndex((s) => s.step_key === currentStepKey)
    : -1;
  return catalogSteps.map((step, idx) => {
    const isCurrent = step.step_key === currentStepKey;
    const done = currentIdx >= 0 && idx < currentIdx;
    return {
      step_key: step.step_key,
      step_name: step.step_name,
      step_kind: step.step_kind,
      step_sequence: step.step_sequence,
      status: done ? 'done' : isCurrent ? 'current' : 'pending',
      done,
      current: isCurrent,
    };
  });
}

function attachActions(workflowKey, steps, audience = 'all') {
  const routes = STEP_ACTION_ROUTES[workflowKey] || {};
  return steps.map((step) => {
    const action = routes[step.step_key];
    if (!action) return { ...step, action_route: null, action_label: null };
    if (audience !== 'all' && action.audience !== audience && action.audience !== 'all') {
      return { ...step, action_route: null, action_label: null };
    }
    return {
      ...step,
      action_route: action.route,
      action_label: action.label,
    };
  });
}

function buildWorkflowContext(workflow, currentStepKey, audience = 'all') {
  const steps = buildStepProgress(workflow.steps, currentStepKey);
  const withActions = attachActions(workflow.workflow_key, steps, audience);
  const current = withActions.find((s) => s.current) || null;
  const nextPending = withActions.find((s) => s.status === 'pending');
  return {
    workflow_key: workflow.workflow_key,
    workflow_name: workflow.workflow_name,
    description: workflow.description,
    completion_state: workflow.completion_state,
    active_version: workflow.active_version,
    current_step_key: currentStepKey,
    current_step: current,
    next_step: nextPending || null,
    steps: withActions,
    route_entrypoints: workflow.route_entrypoints || [],
  };
}

async function resolveEnrollmentForChurch(pool, churchId) {
  const [rows] = await pool.query(
    `SELECT * FROM onboarding_requests
     WHERE church_id = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [churchId]
  );
  if (!rows.length) return null;
  const request = rows[0];
  const workflow = await catalog.fetchWorkflowDetail('church.enrollment');
  if (!workflow) return null;
  const currentStepKey = resolveEnrollmentCurrentStep(request);
  if (!currentStepKey) return null;
  return {
    request_id: request.onboarding_request_id,
    request_status: request.status,
    context: buildWorkflowContext(workflow, currentStepKey, 'parish'),
  };
}

async function resolveEnrollmentByRequestId(onboardingRequestId) {
  const onboarding = require('./onboardingService');
  const row = await onboarding.getByPublicId(onboardingRequestId);
  if (!row) return null;
  const workflow = await catalog.fetchWorkflowDetail('church.enrollment');
  if (!workflow) return null;
  const currentStepKey = resolveEnrollmentCurrentStep(row);
  const context = buildWorkflowContext(workflow, currentStepKey, 'admin');
  return { request: row, workflow: context };
}

function workflowStepsToLegacyProgress(workflowContext) {
  if (!workflowContext?.steps?.length) return [];
  return workflowContext.steps.map((s) => ({
    key: s.step_key,
    label: s.step_name,
    done: s.status === 'done' || s.done,
    current: s.current,
  }));
}

async function resolveOcrReviewGoals(pool, churchId) {
  const [rows] = await pool.query(
    `SELECT id, filename, review_status, status
     FROM ocr_jobs
     WHERE church_id = ?
       AND review_status IN ('uploaded','ocr_complete','agent_extracted','human_confirmed','in_review','ready_to_seed')
       AND (seeded_at IS NULL OR review_status != 'seeded')
     ORDER BY updated_at DESC LIMIT 5`,
    [churchId]
  );
  if (!rows.length) return [];
  const workflow = await catalog.fetchWorkflowDetail('ocr.batch.review');
  if (!workflow) return [];

  const reviewStatusToStep = {
    uploaded: 'upload_batch',
    ocr_complete: 'queue_processing',
    agent_extracted: 'agent_extract',
    human_confirmed: 'human_review',
    in_review: 'human_review',
    ready_to_seed: 'confirm_seed',
  };

  return rows.map((job) => {
    const stepKey = reviewStatusToStep[job.review_status] || 'human_review';
    const ctx = buildWorkflowContext(workflow, stepKey, 'parish');
    const reviewRoute = `/portal/ocr/review/${churchId}/${job.id}`;
    if (ctx.current_step) {
      ctx.current_step = {
        ...ctx.current_step,
        action_route: reviewRoute,
        action_label: `Review ${job.filename || 'batch'}`,
      };
    }
    return {
      job_id: job.id,
      filename: job.filename,
      review_status: job.review_status,
      workflow: ctx,
    };
  });
}

/**
 * Runtime resolvers — register new workflows here.
 * Each resolver: async (pool, churchId) => GoalItem | GoalItem[] | null
 */
const RUNTIME_RESOLVERS = [
  {
    workflow_key: 'church.enrollment',
    priority: 10,
    resolve: async (pool, churchId) => {
      const item = await resolveEnrollmentForChurch(pool, churchId);
      if (!item || item.request_status === 'active') return null;
      return {
        workflow_key: 'church.enrollment',
        priority: 10,
        title: item.context.workflow_name,
        summary: item.context.current_step?.step_name || 'Enrollment in progress',
        action_route: item.context.current_step?.action_route,
        action_label: item.context.current_step?.action_label || 'Continue setup',
        workflow: item.context,
        meta: { request_id: item.request_id, request_status: item.request_status },
      };
    },
  },
  {
    workflow_key: 'ocr.batch.review',
    priority: 20,
    resolve: async (pool, churchId) => {
      const items = await resolveOcrReviewGoals(pool, churchId);
      return items.map((item, i) => ({
        workflow_key: 'ocr.batch.review',
        priority: 20 + i,
        title: 'OCR review needed',
        summary: item.filename || `Job #${item.job_id}`,
        action_route: item.workflow.current_step?.action_route,
        action_label: item.workflow.current_step?.action_label || 'Review batch',
        workflow: item.workflow,
        meta: { job_id: item.job_id, review_status: item.review_status },
      }));
    },
  },
];

async function getGoalsForChurch(churchId, { audience = 'parish' } = {}) {
  const { getAppPool } = require('../config/db');
  const pool = getAppPool();
  const goals = [];

  for (const resolver of RUNTIME_RESOLVERS.sort((a, b) => a.priority - b.priority)) {
    const result = await resolver.resolve(pool, churchId);
    if (!result) continue;
    const list = Array.isArray(result) ? result : [result];
    for (const g of list) {
      if (audience === 'parish' && g.workflow?.current_step && !g.action_route) continue;
      goals.push(g);
    }
  }

  return {
    church_id: churchId,
    generated_at: new Date().toISOString(),
    goals,
  };
}

async function getAdminEnrollmentWorkflow(onboardingRequestId) {
  return resolveEnrollmentByRequestId(onboardingRequestId);
}

module.exports = {
  ENROLLMENT_STATUS_TO_STEP,
  STEP_ACTION_ROUTES,
  RUNTIME_RESOLVERS,
  resolveEnrollmentCurrentStep,
  buildStepProgress,
  buildWorkflowContext,
  workflowStepsToLegacyProgress,
  getGoalsForChurch,
  getAdminEnrollmentWorkflow,
  resolveEnrollmentByRequestId,
};
