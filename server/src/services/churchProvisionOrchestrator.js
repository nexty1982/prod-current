/**
 * Unified church provisioning — CRM lifecycle, CRM API, and enrollment-adjacent flows.
 * All tenant DB creation goes through tenantProvisioning; CRM/church links stay bidirectional.
 */
const crypto = require('crypto');
const { getAppPool, getOmaiPool } = require('../config/db');
const { provisionTenantDb } = require('./tenantProvisioning');
const { applyOnboardingPhaseWrite } = require('../utils/churchOnboardingPhase');
const { assertCrmProvisionAllowed } = require('../utils/churchPromotionPolicy');
const { isEnrolledForProvisioning } = require('./churchOnboardingState');

function actorId(req) {
  return req?.session?.user?.id || req?.user?.id || req?.user?.userId || null;
}

/**
 * Stage a CRM lead as a directory church row (phase 1) — no tenant DB.
 */
async function stageDirectoryFromCrmLead(crmLeadId, req, { jurisdiction } = {}) {
  const authPool = getAppPool();
  const omaiPool = getOmaiPool();

  const [leads] = await omaiPool.query(
    `SELECT cl.* FROM omai_crm_leads cl WHERE cl.id = ?`,
    [crmLeadId]
  );
  if (!leads.length) return { success: false, error: 'CRM lead not found', status: 404 };
  const lead = leads[0];

  if (lead.provisioned_church_id) {
    return { success: false, error: 'Lead already linked to a church row', provisioned_church_id: lead.provisioned_church_id, status: 400 };
  }

  const [existing] = await authPool.query('SELECT id FROM churches WHERE crm_lead_id = ? LIMIT 1', [crmLeadId]);
  if (existing.length) {
    return { success: false, error: 'Church row already exists for this lead', church_id: existing[0].id, status: 409 };
  }

  const placeholderEmail = `onboarding-${lead.id}@placeholder.orthodoxmetrics.com`;
  const [result] = await authPool.query(
    `INSERT INTO churches (
      name, church_name, email, phone, address, city, state_province, postal_code, country,
      website, jurisdiction, jurisdiction_id, latitude, longitude,
      is_active, onboarding_phase, crm_lead_id, client_status,
      has_baptism_records, has_marriage_records, has_funeral_records, setup_complete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'US', ?, ?, ?, ?, ?, 0, 1, ?, 'directory', 0, 0, 0, 0)`,
    [
      lead.name, lead.name, placeholderEmail, lead.phone, lead.street, lead.city, lead.state_code,
      lead.zip, lead.website, jurisdiction || lead.jurisdiction, lead.jurisdiction_id,
      lead.latitude, lead.longitude, lead.id,
    ]
  );

  const churchId = result.insertId;
  await omaiPool.query(
    'UPDATE omai_crm_leads SET provisioned_church_id = ? WHERE id = ?',
    [churchId, crmLeadId]
  );

  await omaiPool.query(
    `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
     VALUES (?, 'stage', ?, ?, ?)`,
    [
      crmLeadId,
      `Directory church row staged (ID: ${churchId})`,
      JSON.stringify({ church_id: churchId, client_status: 'directory' }),
      actorId(req),
    ]
  );

  return { success: true, church_id: churchId, crm_lead_id: crmLeadId, client_status: 'directory' };
}

/**
 * Full provision: church row + tenant DB + registration token + CRM link.
 */
async function provisionFromCrmLead(crmLeadId, req, { source = 'crm', force = false } = {}) {
  const authPool = getAppPool();
  const omaiPool = getOmaiPool();
  const initiatedBy = actorId(req);

  const [leadRows] = await omaiPool.query(
    `SELECT uc.*, j.calendar_type AS jurisdiction_calendar, j.name AS jurisdiction_name
     FROM omai_crm_leads uc
     LEFT JOIN orthodoxmetrics_db.jurisdictions j ON uc.jurisdiction_id = j.id
     WHERE uc.id = ?`,
    [crmLeadId]
  );
  if (!leadRows.length) {
    return { success: false, error: 'CRM lead not found', status: 404 };
  }
  const lead = leadRows[0];

  if (lead.provisioned_church_id) {
    const [existing] = await authPool.query('SELECT * FROM churches WHERE id = ?', [lead.provisioned_church_id]);
    if (existing.length && existing[0].database_name) {
      return {
        success: false,
        error: 'Church already provisioned',
        provisioned_church_id: lead.provisioned_church_id,
        status: 400,
      };
    }
  }

  const gate = await assertCrmProvisionAllowed(authPool, omaiPool, lead, { force, req });
  if (!gate.allowed) {
    return { success: false, error: gate.reason, code: gate.code, status: gate.status || 403 };
  }

  const [contacts] = await omaiPool.query(
    'SELECT * FROM omai_crm_contacts WHERE church_id = ? AND is_primary = 1 LIMIT 1',
    [crmLeadId]
  );
  const primaryContact = contacts[0] || null;
  const contactEmail = primaryContact?.email || null;
  const calendarType = lead.jurisdiction_calendar || null;

  const [enrollmentRows] = await authPool.query(
    `SELECT * FROM onboarding_requests
     WHERE crm_record_id = ? OR church_id = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [crmLeadId, lead.provisioned_church_id || 0]
  );
  const enrollment = enrollmentRows[0] || null;
  const clientStatus = isEnrolledForProvisioning(enrollment) ? 'enrolling' : 'pre_onboarded';

  let churchId = lead.provisioned_church_id || null;

  if (!churchId) {
    const [insertResult] = await authPool.query(
      `INSERT INTO churches (
        name, email, phone, website, address, city, state_province, postal_code, country,
        jurisdiction, jurisdiction_id, calendar_type, is_active, crm_lead_id,
        client_status, onboarding_phase, setup_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'United States', ?, ?, ?, 1, ?, ?, 1, 0)`,
      [
        lead.name, contactEmail,
        lead.phone || primaryContact?.phone || null,
        lead.website || null, lead.street || null,
        lead.city || null, lead.state_code || null, lead.zip || null,
        lead.jurisdiction || lead.jurisdiction_name || null,
        lead.jurisdiction_id || null, calendarType,
        crmLeadId, clientStatus,
      ]
    );
    churchId = insertResult.insertId;
  } else {
    await authPool.query(
      `UPDATE churches SET crm_lead_id = COALESCE(crm_lead_id, ?), client_status = ?, is_active = 1 WHERE id = ?`,
      [crmLeadId, clientStatus, churchId]
    );
  }

  const provResult = await provisionTenantDb(churchId, authPool, {
    source,
    initiatedBy,
    allowExisting: true,
  });
  if (!provResult.success) {
    return { success: false, error: provResult.error || 'Tenant provisioning failed', status: 500, church_id: churchId };
  }

  await applyOnboardingPhaseWrite(authPool, churchId, 2, { source: 'provision-orchestrator' });

  let registrationToken = null;
  let registrationUrl = null;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await authPool.query(
      'INSERT INTO church_registration_tokens (church_id, token, created_by, is_active) VALUES (?, ?, ?, 1)',
      [churchId, token, initiatedBy || 0]
    );
    registrationToken = token;
    registrationUrl = `https://orthodoxmetrics.com/auth/register?token=${token}&church=${encodeURIComponent(lead.name)}`;
  } catch (tokenErr) {
    console.warn('[provisionOrchestrator] token generation failed:', tokenErr.message);
  }

  await omaiPool.query(
    'UPDATE omai_crm_leads SET provisioned_church_id = ?, is_client = 1, pipeline_stage = ? WHERE id = ?',
    [churchId, 'deployment', crmLeadId]
  );

  await omaiPool.query(
    `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
     VALUES (?, 'provision', ?, ?, ?)`,
    [
      crmLeadId,
      `Church provisioned (ID: ${churchId})`,
      JSON.stringify({
        provisioned_church_id: churchId,
        database_name: provResult.targetDb || null,
        source,
        client_status: clientStatus,
      }),
      initiatedBy,
    ]
  );

  try {
    const sync = require('./workflowExecutionSync');
    await sync.syncChurchOps(authPool, churchId, { actorUserId: initiatedBy, actorType: 'admin' });
    if (enrollment?.onboarding_request_id) {
      await sync.syncEnrollment(authPool, enrollment.onboarding_request_id, { actorUserId: initiatedBy });
    }
  } catch (syncErr) {
    console.warn('[provisionOrchestrator] workflow sync:', syncErr.message);
  }

  return {
    success: true,
    provisioned_church_id: churchId,
    database_name: provResult.targetDb || null,
    registration_url: registrationUrl,
    registration_token: registrationToken ? '(generated)' : null,
    client_status: clientStatus,
    db_created: provResult.dbCreated,
  };
}

/**
 * Bidirectional CRM ↔ church link (no tenant DB).
 */
async function linkCrmLeadToChurch(crmLeadId, churchId) {
  const authPool = getAppPool();
  const omaiPool = getOmaiPool();
  await authPool.query(
    'UPDATE churches SET crm_lead_id = COALESCE(crm_lead_id, ?) WHERE id = ?',
    [crmLeadId, churchId]
  );
  await omaiPool.query(
    'UPDATE omai_crm_leads SET provisioned_church_id = COALESCE(provisioned_church_id, ?) WHERE id = ?',
    [churchId, crmLeadId]
  );
}

module.exports = {
  provisionFromCrmLead,
  stageDirectoryFromCrmLead,
  linkCrmLeadToChurch,
};
