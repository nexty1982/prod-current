/**
 * Unified onboarding read model — single derived view across enrollment, CRM, and phase pipeline.
 */
const { isOperationalChurchId } = require('../utils/churchVisibility');
const {
  ENROLLED_REQUEST_STATUSES,
  ENROLLED_PROVISIONING_STATUSES,
} = require('../utils/churchPromotionPolicy');

const ENROLLMENT_ACTIVE = new Set([
  'submitted', 'reviewing', 'payment_pending', 'payment_received', 'provisioning',
  'admin_account_created', 'awaiting_first_login', 'record_tables_review',
]);

function deriveTokenUserStage(ch) {
  if (!ch) return 'new';
  if (ch.setup_complete === 1) return 'setup_complete';
  if ((ch.active_users || 0) > 0) return 'active';
  if ((ch.pending_users || 0) > 0) return 'members_joining';
  if ((ch.active_tokens || ch.active_token_count || 0) > 0) return 'token_issued';
  return 'new';
}

/**
 * @param {{ church?: object|null, enrollment?: object|null, crmLead?: object|null }} input
 */
function resolveOnboardingState({ church, enrollment, crmLead } = {}) {
  const churchId = church?.id ? Number(church.id) : null;
  const tenantProvisioned = Boolean(church?.database_name || church?.db_name);
  const clientStatus = church?.client_status || (crmLead && !church ? 'directory' : null);

  let canonicalSystem = 'none';
  if (enrollment?.onboarding_request_id) {
    canonicalSystem = 'enrollment';
  } else if (church?.crm_lead_id || crmLead?.id) {
    canonicalSystem = 'crm';
  } else if (church?.onboarding_phase != null) {
    canonicalSystem = 'phase_pipeline';
  } else if (church) {
    canonicalSystem = 'legacy';
  }

  const enrollmentActive = enrollment
    ? ENROLLMENT_ACTIVE.has(enrollment.status)
    : false;

  const enrollmentComplete = enrollment?.status === 'active';

  let recommendedAction = null;
  if (clientStatus === 'directory' && !tenantProvisioned) {
    recommendedAction = 'start_enrollment';
  } else if (enrollmentActive && !tenantProvisioned) {
    recommendedAction = 'complete_enrollment_provisioning';
  } else if (tenantProvisioned && !enrollmentComplete && canonicalSystem === 'enrollment') {
    recommendedAction = 'finish_enrollment_setup';
  } else if (tenantProvisioned && (church?.onboarding_phase || 0) < 4 && !church?.setup_complete) {
    recommendedAction = 'configure_parish';
  }

  return {
    church_id: churchId,
    crm_lead_id: church?.crm_lead_id || crmLead?.id || null,
    onboarding_request_id: enrollment?.onboarding_request_id || null,
    canonical_system: canonicalSystem,
    client_status: clientStatus,
    billing_status: church?.billing_status || crmLead?.billing_status || null,
    enrollment_status: enrollment?.status || null,
    enrollment_payment_status: enrollment?.payment_status || null,
    enrollment_provisioning_status: enrollment?.provisioning_status || null,
    crm_pipeline_stage: crmLead?.pipeline_stage || null,
    onboarding_phase: church?.onboarding_phase ?? null,
    tenant_provisioned: tenantProvisioned,
    operational: churchId ? isOperationalChurchId(churchId) : false,
    setup_complete: Boolean(church?.setup_complete),
    derived_user_stage: deriveTokenUserStage(church),
    enrollment_active: enrollmentActive,
    enrollment_complete: enrollmentComplete,
    recommended_action: recommendedAction,
  };
}

/**
 * Load church + enrollment + CRM and return unified state.
 * @param {import('mysql2/promise').Pool} authPool
 * @param {import('mysql2/promise').Pool} omaiPool
 * @param {{ churchId?: number, crmLeadId?: number, onboardingRequestId?: string }} ids
 */
async function loadOnboardingState(authPool, omaiPool, { churchId, crmLeadId, onboardingRequestId } = {}) {
  let church = null;
  let enrollment = null;
  let crmLead = null;

  if (onboardingRequestId) {
    const [rows] = await authPool.query(
      'SELECT * FROM onboarding_requests WHERE onboarding_request_id = ? LIMIT 1',
      [onboardingRequestId]
    );
    enrollment = rows[0] || null;
    if (enrollment?.church_id) churchId = enrollment.church_id;
    if (enrollment?.crm_record_id) crmLeadId = enrollment.crm_record_id;
  }

  if (churchId) {
    const [rows] = await authPool.query('SELECT * FROM churches WHERE id = ? LIMIT 1', [churchId]);
    church = rows[0] || null;
    if (!crmLeadId && church?.crm_lead_id) crmLeadId = church.crm_lead_id;
  }

  if (crmLeadId) {
    const [rows] = await omaiPool.query('SELECT * FROM omai_crm_leads WHERE id = ? LIMIT 1', [crmLeadId]);
    crmLead = rows[0] || null;
    if (!churchId && crmLead?.provisioned_church_id) {
      const [rows] = await authPool.query('SELECT * FROM churches WHERE id = ? LIMIT 1', [crmLead.provisioned_church_id]);
      church = rows[0] || church;
    }
  }

  if (church && !enrollment) {
    const [rows] = await authPool.query(
      `SELECT * FROM onboarding_requests
       WHERE church_id = ? OR crm_record_id <=> ?
       ORDER BY updated_at DESC LIMIT 1`,
      [church.id, church.crm_lead_id || crmLeadId || null]
    );
    enrollment = rows[0] || null;
  }

  return resolveOnboardingState({ church, enrollment, crmLead });
}

function isEnrolledForProvisioning(enrollment) {
  if (!enrollment) return false;
  return (
    ENROLLED_REQUEST_STATUSES.has(enrollment.status)
    || ENROLLED_PROVISIONING_STATUSES.has(enrollment.provisioning_status)
    || ['paid', 'waived'].includes(enrollment.payment_status)
  );
}

module.exports = {
  resolveOnboardingState,
  loadOnboardingState,
  deriveTokenUserStage,
  isEnrolledForProvisioning,
  ENROLLMENT_ACTIVE,
};
