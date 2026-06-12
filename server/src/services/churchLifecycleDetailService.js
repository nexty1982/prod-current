/**
 * Lifecycle detail payload for CRM + onboarded churches (shared by route + unified profile).
 */
function deriveOnboardingStage(ch) {
  if (ch.setup_complete === 1) return 'setup_complete';
  if (ch.active_users > 0) return 'active';
  if (ch.pending_users > 0 || ch.active_tokens > 0) return 'onboarding';
  return 'onboarding';
}

/**
 * @param {import('mysql2/promise').Pool} omaiPool
 * @param {import('mysql2/promise').Pool} authPool
 * @param {string|number} apiId — numeric CRM id or `church_<id>`
 */
async function buildLifecycleDetail(omaiPool, authPool, apiId) {
  const raw = String(apiId);
  const isChurchTableId = raw.startsWith('church_');
  const numericId = isChurchTableId ? parseInt(raw.replace('church_', ''), 10) : parseInt(raw, 10);

  if (Number.isNaN(numericId)) {
    return { error: 'Invalid ID', status: 400 };
  }

  let crmChurch = null;
  let onboardedChurch = null;
  let contacts = [];
  let activities = [];
  let followUps = [];
  let members = [];
  let tokens = [];

  if (isChurchTableId) {
    const [rows] = await authPool.query('SELECT * FROM churches WHERE id = ?', [numericId]);
    if (!rows.length) return { error: 'Church not found', status: 404 };
    onboardedChurch = rows[0];
    if (onboardedChurch.crm_lead_id) {
      const [crmRows] = await omaiPool.query(
        `SELECT uc.*, ps.label AS stage_label, ps.color AS stage_color
         FROM omai_crm_leads uc
         LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
         WHERE uc.id = ?`,
        [onboardedChurch.crm_lead_id]
      );
      if (crmRows.length) {
        crmChurch = crmRows[0];
        const [c] = await omaiPool.query(
          'SELECT * FROM omai_crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name',
          [onboardedChurch.crm_lead_id]
        );
        contacts = c;
        const [a] = await omaiPool.query(
          'SELECT * FROM omai_crm_activities WHERE church_id = ? ORDER BY created_at DESC LIMIT 50',
          [onboardedChurch.crm_lead_id]
        );
        activities = a;
        const [f] = await omaiPool.query(
          'SELECT * FROM omai_crm_followups WHERE church_id = ? ORDER BY due_date ASC',
          [onboardedChurch.crm_lead_id]
        );
        followUps = f;
      }
    }
  } else {
    const [crmRows] = await omaiPool.query(
      `SELECT uc.*, ps.label AS stage_label, ps.color AS stage_color
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       WHERE uc.id = ?`,
      [numericId]
    );
    if (!crmRows.length) return { error: 'Church not found', status: 404 };
    crmChurch = crmRows[0];

    const [c] = await omaiPool.query(
      'SELECT * FROM omai_crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name',
      [numericId]
    );
    contacts = c;
    const [a] = await omaiPool.query(
      'SELECT * FROM omai_crm_activities WHERE church_id = ? ORDER BY created_at DESC LIMIT 50',
      [numericId]
    );
    activities = a;
    const [f] = await omaiPool.query(
      'SELECT * FROM omai_crm_followups WHERE church_id = ? ORDER BY due_date ASC',
      [numericId]
    );
    followUps = f;

    if (crmChurch.provisioned_church_id) {
      const [oRows] = await authPool.query('SELECT * FROM churches WHERE id = ?', [crmChurch.provisioned_church_id]);
      if (oRows.length) onboardedChurch = oRows[0];
    }
  }

  const churchId = onboardedChurch?.id;
  if (churchId) {
    const [m] = await authPool.query(
      `SELECT id, email, first_name, last_name, full_name, role, is_locked, lockout_reason, created_at
       FROM users WHERE church_id = ? ORDER BY created_at DESC`,
      [churchId]
    );
    members = m;

    const [t] = await authPool.query(
      `SELECT crt.id, crt.token, crt.is_active, crt.created_at, u.email AS created_by
       FROM church_registration_tokens crt
       LEFT JOIN users u ON crt.created_by = u.id
       WHERE crt.church_id = ? ORDER BY crt.created_at DESC`,
      [churchId]
    );
    tokens = t;
  }

  let unified_stage;
  let source;
  if (onboardedChurch) {
    unified_stage = deriveOnboardingStage({
      setup_complete: onboardedChurch.setup_complete,
      active_users: members.filter(m => m.is_locked === 0).length,
      pending_users: members.filter(m => m.is_locked === 1).length,
      active_tokens: tokens.filter(t => t.is_active === 1).length,
    });
    source = crmChurch ? 'both' : 'onboarded';
  } else {
    unified_stage = crmChurch.pipeline_stage;
    source = 'crm';
  }

  let checklist = null;
  if (onboardedChurch) {
    checklist = {
      church_created: true,
      token_issued: tokens.length > 0,
      members_registered: members.length > 0,
      members_active: members.filter(m => m.is_locked === 0).length > 0,
      setup_complete: onboardedChurch.setup_complete === 1,
    };
  }

  return {
    source,
    unified_stage,
    crm: crmChurch,
    onboarded: onboardedChurch,
    contacts,
    activities,
    followUps,
    members,
    tokens,
    checklist,
  };
}

module.exports = {
  buildLifecycleDetail,
  deriveOnboardingStage,
};
