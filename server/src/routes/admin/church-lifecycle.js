/**
 * Church Lifecycle API — Unified CRM + Enrollment facade (canonical on OM server).
 * CRM leads (omai_db) + churches (orthodoxmetrics_db). Provisioning via churchProvisionOrchestrator.
 */
const express = require('express');
const router = express.Router();
const { getAppPool, getOmaiPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { provisionFromCrmLead } = require('../../services/churchProvisionOrchestrator');
const { loadOnboardingState, loadOnboardingProfileFull } = require('../../services/churchOnboardingState');
const { buildLifecycleDetail } = require('../../services/churchLifecycleDetailService');

const ADMIN_ROLES = ['super_admin', 'admin'];

function getOmAuthPool() {
  return getAppPool();
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE STAGES — full lifecycle stages list
// ═══════════════════════════════════════════════════════════════

router.get('/stages', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [stages] = await getOmaiPool().query(
      'SELECT * FROM omai_crm_pipeline_stages ORDER BY sort_order'
    );
    res.json({ stages });
  } catch (err) {
    console.error('Church lifecycle stages error:', err);
    res.status(500).json({ error: 'Failed to load stages' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — merged stats across full lifecycle
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const omaiPool = getOmaiPool();
    const authPool = getOmAuthPool();

    // CRM pipeline counts (stages 1-7 + terminal)
    const [crmCounts] = await omaiPool.query(
      `SELECT uc.pipeline_stage, ps.label, ps.color, ps.sort_order, COUNT(*) as count
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       GROUP BY uc.pipeline_stage, ps.label, ps.color, ps.sort_order
       ORDER BY ps.sort_order`
    );

    // Onboarding counts (from churches table — derive stage)
    const [onboardedChurches] = await authPool.query(`
      SELECT
        c.id, c.setup_complete,
        COALESCE(tok.active_tokens, 0) AS active_tokens,
        COALESCE(usr.active_users, 0)  AS active_users,
        COALESCE(usr.pending_users, 0) AS pending_users
      FROM churches c
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS active_tokens
        FROM church_registration_tokens WHERE is_active = 1
        GROUP BY church_id
      ) tok ON tok.church_id = c.id
      LEFT JOIN (
        SELECT cu.church_id,
          SUM(CASE WHEN u.is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN u.is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
        FROM church_users cu
        JOIN users u ON u.id = cu.user_id
        GROUP BY cu.church_id
      ) usr ON usr.church_id = c.id
    `);

    const onboardingCounts = { onboarding: 0, active: 0, setup_complete: 0 };
    for (const ch of onboardedChurches) {
      const stage = deriveOnboardingStage(ch);
      if (onboardingCounts[stage] !== undefined) onboardingCounts[stage]++;
      else onboardingCounts.onboarding++;
    }

    // Merge into unified pipeline
    const [allStages] = await omaiPool.query('SELECT * FROM omai_crm_pipeline_stages ORDER BY sort_order');
    const pipeline = allStages.map(s => {
      const crmEntry = crmCounts.find(c => c.pipeline_stage === s.stage_key);
      const onboardingCount = onboardingCounts[s.stage_key] || 0;
      return {
        stage_key: s.stage_key,
        label: s.label,
        color: s.color,
        sort_order: s.sort_order,
        is_terminal: s.is_terminal,
        count: (crmEntry?.count || 0) + onboardingCount,
      };
    });

    // Follow-up stats
    const [overdue] = await omaiPool.query(
      "SELECT COUNT(*) as count FROM omai_crm_followups WHERE status = 'pending' AND due_date < CURDATE()"
    );
    const [todayFollowups] = await omaiPool.query(
      "SELECT COUNT(*) as count FROM omai_crm_followups WHERE status = 'pending' AND due_date = CURDATE()"
    );
    const [upcomingFollowups] = await omaiPool.query(
      `SELECT f.*, uc.name as church_name, uc.state_code, uc.city
       FROM omai_crm_followups f
       JOIN omai_crm_leads uc ON f.church_id = uc.id
       WHERE f.status = 'pending' AND f.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY f.due_date ASC LIMIT 20`
    );

    // Totals
    const [crmTotals] = await omaiPool.query('SELECT COUNT(*) as total FROM omai_crm_leads');
    const [onboardedTotal] = await authPool.query('SELECT COUNT(*) as total FROM churches');

    // Client status breakdown (paid vs pre-onboarded)
    let clientStatusCounts = { active_paid: 0, pre_onboarded: 0, enrolling: 0, suspended: 0, decommissioned: 0 };
    try {
      const [csRows] = await authPool.query(
        `SELECT client_status, COUNT(*) AS count FROM churches GROUP BY client_status`
      );
      for (const r of csRows) clientStatusCounts[r.client_status] = r.count;
    } catch (_) { /* columns may not exist on older schemas */ }

    let billingCounts = { paid: 0, payment_pending: 0, past_due: 0 };
    try {
      const [bRows] = await authPool.query(
        `SELECT billing_status, COUNT(*) AS count FROM churches WHERE billing_status IN ('paid','payment_pending','past_due') GROUP BY billing_status`
      );
      for (const r of bRows) billingCounts[r.billing_status] = r.count;
    } catch (_) { /* ignore */ }

    res.json({
      pipeline,
      overdue: overdue[0].count,
      todayFollowups: todayFollowups[0].count,
      upcomingFollowups,
      totalCrmLeads: crmTotals[0].total,
      totalOnboarded: onboardedTotal[0].total,
      clientStatusCounts,
      billingCounts,
      activePaidClients: clientStatusCounts.active_paid || 0,
      preOnboardedClients: clientStatusCounts.pre_onboarded || 0,
    });
  } catch (err) {
    console.error('Church lifecycle dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE — unified list of all churches across full lifecycle
// ═══════════════════════════════════════════════════════════════

router.get('/pipeline', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const omaiPool = getOmaiPool();
    const authPool = getOmAuthPool();
    const {
      page = 1,
      limit = 50,
      search = '',
      stage = '',
      state = '',
      sort = 'name',
      direction = 'asc',
    } = req.query;

    // ── CRM leads ──
    const crmConditions = [];
    const crmParams = [];

    if (search) {
      crmConditions.push('(uc.name LIKE ? OR uc.city LIKE ?)');
      crmParams.push(`%${search}%`, `%${search}%`);
    }
    if (state) {
      crmConditions.push('uc.state_code = ?');
      crmParams.push(state);
    }
    if (stage && !['deployment', 'active_parish'].includes(stage)) {
      crmConditions.push('uc.pipeline_stage = ?');
      crmParams.push(stage);
    }

    const crmWhere = crmConditions.length > 0 ? `WHERE ${crmConditions.join(' AND ')}` : '';

    // Skip CRM query if filtering for onboarding-only stages
    let crmRows = [];
    if (!stage || !['deployment', 'active_parish'].includes(stage)) {
      const [rows] = await omaiPool.query(
        `SELECT
          uc.id,
          uc.name,
          uc.city,
          uc.state_code,
          uc.phone,
          uc.website,
          uc.pipeline_stage,
          uc.priority,
          uc.is_client,
          uc.provisioned_church_id,
          uc.last_contacted_at,
          uc.next_follow_up,
          uc.crm_notes,
          uc.jurisdiction,
          uc.jurisdiction_id,
          uc.created_at,
          ps.label AS stage_label,
          ps.color AS stage_color,
          ps.sort_order AS stage_order,
          (SELECT COUNT(*) FROM omai_crm_contacts cc WHERE cc.church_id = uc.id) AS contact_count,
          (SELECT COUNT(*) FROM omai_crm_followups cf WHERE cf.church_id = uc.id AND cf.status = 'pending') AS pending_followups
        FROM omai_crm_leads uc
        LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
        ${crmWhere}
        ORDER BY uc.name ASC`,
        crmParams
      );

      // Fetch jurisdiction names from authPool for the CRM leads that have jurisdiction_id
      const jurisdictionIds = [...new Set(rows.filter(r => r.jurisdiction_id).map(r => r.jurisdiction_id))];
      let jurisdictionMap = {};
      if (jurisdictionIds.length > 0) {
        const placeholders = jurisdictionIds.map(() => '?').join(',');
        const [jRows] = await authPool.query(
          `SELECT id, name FROM jurisdictions WHERE id IN (${placeholders})`,
          jurisdictionIds
        );
        jurisdictionMap = Object.fromEntries(jRows.map(j => [j.id, j.name]));
      }

      crmRows = rows.map(r => ({
        ...r,
        jurisdiction_name: jurisdictionMap[r.jurisdiction_id] || null,
        source: r.provisioned_church_id ? 'both' : 'crm',
        unified_stage: r.pipeline_stage,
        unified_stage_label: r.stage_label,
        unified_stage_color: r.stage_color,
        unified_stage_order: r.stage_order,
      }));
    }

    // ── Onboarded churches ──
    let onboardedRows = [];
    // Only include onboarded churches that are NOT already represented via provisioned_church_id
    const provisionedIds = new Set(crmRows.filter(r => r.provisioned_church_id).map(r => r.provisioned_church_id));

    const [churchRows] = await authPool.query(`
      SELECT
        c.id,
        c.name,
        c.city,
        c.state_province AS state_code,
        c.phone,
        c.website,
        c.jurisdiction,
        c.jurisdiction_id,
        c.is_active,
        c.setup_complete,
        c.client_status,
        c.billing_status,
        c.contact_phase,
        c.contact_phase_due,
        c.paid_at,
        c.created_at,
        c.notes,
        COALESCE(tok.active_tokens, 0) AS active_tokens,
        COALESCE(usr.total_users, 0)   AS total_users,
        COALESCE(usr.active_users, 0)  AS active_users,
        COALESCE(usr.pending_users, 0) AS pending_users,
        j.name AS jurisdiction_name
      FROM churches c
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS active_tokens
        FROM church_registration_tokens WHERE is_active = 1
        GROUP BY church_id
      ) tok ON tok.church_id = c.id
      LEFT JOIN (
        SELECT church_id,
          COUNT(*) AS total_users,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
        FROM users WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
      LEFT JOIN jurisdictions j ON c.jurisdiction_id = j.id
      ORDER BY c.name ASC
    `);

    // Get stage metadata for onboarding stages
    const [onboardingStages] = await omaiPool.query(
      "SELECT * FROM omai_crm_pipeline_stages WHERE stage_key IN ('deployment', 'active_parish')"
    );
    const stageMap = Object.fromEntries(onboardingStages.map(s => [s.stage_key, s]));

    for (const ch of churchRows) {
      // Skip if this church is already represented by a CRM lead
      if (provisionedIds.has(ch.id)) {
        // Enrich the CRM row with onboarding data instead
        const crmRow = crmRows.find(r => r.provisioned_church_id === ch.id);
        if (crmRow) {
          const derivedStage = deriveOnboardingStage(ch);
          const stageInfo = stageMap[derivedStage] || {};
          crmRow.unified_stage = derivedStage;
          crmRow.unified_stage_label = stageInfo.label || derivedStage;
          crmRow.unified_stage_color = stageInfo.color || '#00bcd4';
          crmRow.unified_stage_order = stageInfo.sort_order || 8;
          crmRow.onboarding = {
            church_id: ch.id,
            active_tokens: ch.active_tokens,
            total_users: ch.total_users,
            active_users: ch.active_users,
            pending_users: ch.pending_users,
            setup_complete: ch.setup_complete,
          };
        }
        continue;
      }

      // Standalone onboarded church (no CRM lead)
      const derivedStage = deriveOnboardingStage(ch);
      const stageInfo = stageMap[derivedStage] || {};

      if (search && !ch.name.toLowerCase().includes(search.toLowerCase()) &&
          !(ch.city && ch.city.toLowerCase().includes(search.toLowerCase()))) {
        continue;
      }
      if (stage && derivedStage !== stage) continue;

      onboardedRows.push({
        id: `church_${ch.id}`,
        church_table_id: ch.id,
        name: ch.name,
        city: ch.city,
        state_code: ch.state_code,
        phone: ch.phone,
        website: ch.website,
        pipeline_stage: derivedStage,
        priority: null,
        is_client: 1,
        provisioned_church_id: null,
        last_contacted_at: null,
        next_follow_up: null,
        crm_notes: ch.notes,
        jurisdiction: ch.jurisdiction,
        jurisdiction_id: ch.jurisdiction_id,
        created_at: ch.created_at,
        stage_label: stageInfo.label || derivedStage,
        stage_color: stageInfo.color || '#00bcd4',
        stage_order: stageInfo.sort_order || 8,
        jurisdiction_name: ch.jurisdiction_name,
        contact_count: 0,
        pending_followups: 0,
        source: 'onboarded',
        unified_stage: derivedStage,
        unified_stage_label: stageInfo.label || derivedStage,
        unified_stage_color: stageInfo.color || '#00bcd4',
        unified_stage_order: stageInfo.sort_order || 8,
        onboarding: {
          church_id: ch.id,
          active_tokens: ch.active_tokens,
          total_users: ch.total_users,
          active_users: ch.active_users,
          pending_users: ch.pending_users,
          setup_complete: ch.setup_complete,
        },
      });
    }

    // Merge and sort
    let merged = [...crmRows, ...onboardedRows];

    // Sort
    const allowedSorts = ['name', 'state_code', 'city', 'pipeline_stage', 'priority', 'created_at', 'unified_stage_order'];
    const sortField = allowedSorts.includes(sort) ? sort : 'name';
    const dir = direction === 'desc' ? -1 : 1;
    merged.sort((a, b) => {
      const av = a[sortField] || '';
      const bv = b[sortField] || '';
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    // Paginate
    const total = merged.length;
    const pageNum = parseInt(page);
    const lim = parseInt(limit);
    const offset = (pageNum - 1) * lim;
    const paged = merged.slice(offset, offset + lim);

    res.json({
      churches: paged,
      total,
      page: pageNum,
      limit: lim,
      totalPages: Math.ceil(total / lim),
    });
  } catch (err) {
    console.error('Church lifecycle pipeline error:', err);
    res.status(500).json({ error: 'Failed to load pipeline' });
  }
});

// ── Client management & contact outreach (before /:id catch-all) ──
const CLIENT_STATUSES = ['directory', 'pre_onboarded', 'enrolling', 'active_paid', 'suspended', 'decommissioned'];
const BILLING_STATUSES = ['not_configured', 'trial', 'invoice_sent', 'payment_pending', 'paid', 'past_due', 'waived', 'cancelled'];
const CONTACT_PHASES = [
  { key: 'none', label: 'No outreach planned', order: 0 },
  { key: 'initial_outreach', label: 'Initial outreach', order: 1, emailTemplate: 'welcome' },
  { key: 'follow_up_1', label: 'Follow-up #1', order: 2, emailTemplate: 'reminder' },
  { key: 'follow_up_2', label: 'Follow-up #2', order: 3, emailTemplate: 'reminder' },
  { key: 'info_request', label: 'Request missing info', order: 4, emailTemplate: 'info_request' },
  { key: 'demo_scheduled', label: 'Demo scheduled', order: 5 },
  { key: 'proposal_sent', label: 'Proposal sent', order: 6, emailTemplate: 'template_confirm' },
  { key: 'nurturing', label: 'Long-term nurturing', order: 7 },
  { key: 'on_hold', label: 'On hold', order: 8 },
  { key: 'do_not_contact', label: 'Do not contact', order: 9 },
];
const OM_FROM_EMAIL = 'info@orthodoxmetrics.com';

router.get('/contact-phases', requireAuth, requireRole(...ADMIN_ROLES), (_req, res) => {
  res.json({ phases: CONTACT_PHASES, fromEmail: OM_FROM_EMAIL });
});

router.get('/client-summary', requireAuth, requireRole(...ADMIN_ROLES), async (_req, res) => {
  try {
    const authPool = getOmAuthPool();
    const omaiPool = getOmaiPool();
    const [csRows] = await authPool.query(
      `SELECT client_status, COUNT(*) AS count FROM churches GROUP BY client_status`
    );
    const [billRows] = await authPool.query(
      `SELECT billing_status, COUNT(*) AS count FROM churches GROUP BY billing_status`
    );
    let enrollmentPending = 0;
    try {
      const [enr] = await authPool.query(
        `SELECT COUNT(*) AS count FROM onboarding_requests WHERE status NOT IN ('active','rejected','cancelled')`
      );
      enrollmentPending = enr[0]?.count || 0;
    } catch (_) { /* ignore */ }
    const [crmPaid] = await omaiPool.query(
      `SELECT COUNT(*) AS count FROM omai_crm_leads WHERE billing_status = 'paid'`
    );
    res.json({
      clientStatus: Object.fromEntries(csRows.map(r => [r.client_status, r.count])),
      billingStatus: Object.fromEntries(billRows.map(r => [r.billing_status, r.count])),
      enrollmentPending,
      crmPaidClients: crmPaid[0]?.count || 0,
      activePaidClients: csRows.find(r => r.client_status === 'active_paid')?.count || 0,
      preOnboarded: csRows.find(r => r.client_status === 'pre_onboarded')?.count || 0,
    });
  } catch (err) {
    console.error('client-summary error:', err);
    res.status(500).json({ error: 'Failed to load client summary' });
  }
});

router.get('/unified/:id', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const raw = String(req.params.id);
    const full = req.query.full === '1' || req.query.full === 'true';
    if (full) {
      const profile = await loadOnboardingProfileFull(getAppPool(), getOmaiPool(), raw, { includeLifecycle: true });
      return res.json({ success: true, ...profile });
    }
    const isChurch = raw.startsWith('church_');
    const numericId = parseInt(isChurch ? raw.replace('church_', '') : raw, 10);
    const { state } = await loadOnboardingState(getAppPool(), getOmaiPool(), isChurch
      ? { churchId: numericId }
      : { crmLeadId: numericId });
    res.json({ success: true, state });
  } catch (err) {
    console.error('Unified onboarding state error:', err);
    res.status(500).json({ error: 'Failed to load unified onboarding state' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DETAIL — unified detail for any church (CRM lead or onboarded)
// ═══════════════════════════════════════════════════════════════

router.get('/:id', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const detail = await buildLifecycleDetail(getOmaiPool(), getOmAuthPool(), req.params.id);
    if (detail.error) {
      return res.status(detail.status || 404).json({ error: detail.error });
    }
    res.json(detail);
  } catch (err) {
    console.error('Church lifecycle detail error:', err);
    res.status(500).json({ error: 'Failed to load church detail' });
  }
});

// ═══════════════════════════════════════════════════════════════
// STAGE TRANSITION — change stage with automatic provisioning
// ═══════════════════════════════════════════════════════════════

router.put('/:id/stage', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const omaiPool = getOmaiPool();
    const authPool = getOmAuthPool();
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage) return res.status(400).json({ error: 'stage is required' });

    // Validate stage exists
    const [stageRows] = await omaiPool.query('SELECT * FROM omai_crm_pipeline_stages WHERE stage_key = ?', [stage]);
    if (!stageRows.length) return res.status(400).json({ error: `Unknown stage: ${stage}` });

    const isChurchTableId = String(id).startsWith('church_');
    const numericId = isChurchTableId ? parseInt(id.replace('church_', '')) : parseInt(id);

    if (isChurchTableId) {
      // Onboarded-only church — can only transition between onboarding stages
      if (stage === 'active_parish') {
        await authPool.query('UPDATE churches SET setup_complete = 1 WHERE id = ?', [numericId]);
      } else if (stage === 'deployment') {
        await authPool.query('UPDATE churches SET setup_complete = 0 WHERE id = ?', [numericId]);
      }
      res.json({ success: true, stage, church_table_id: numericId });
      return;
    }

    // CRM lead — update pipeline_stage
    const [existing] = await omaiPool.query('SELECT * FROM omai_crm_leads WHERE id = ?', [numericId]);
    if (!existing.length) return res.status(404).json({ error: 'Church not found' });

    const church = existing[0];

    // If transitioning TO "active_parish" and not already provisioned — unified provision
    if (stage === 'active_parish' && !church.provisioned_church_id) {
      const force = req.body.force === true;
      const provisionResult = await provisionFromCrmLead(numericId, req, { source: 'lifecycle', force });
      if (!provisionResult.success) {
        return res.status(provisionResult.status || 500).json({ error: provisionResult.error, code: provisionResult.code });
      }
      await omaiPool.query(
        'UPDATE omai_crm_leads SET pipeline_stage = ? WHERE id = ?',
        ['active_parish', numericId]
      );
      res.json({
        success: true,
        stage: 'active_parish',
        provisioned: true,
        provisioned_church_id: provisionResult.provisioned_church_id,
        registration_url: provisionResult.registration_url,
      });
      return;
    }

    // Re-provision path when linked church exists but no tenant DB
    if (stage === 'active_parish' && church.provisioned_church_id) {
      const [chRow] = await authPool.query(
        'SELECT database_name FROM churches WHERE id = ?',
        [church.provisioned_church_id]
      );
      if (!chRow.length || !chRow[0].database_name) {
        const force = req.body.force === true;
        const provisionResult = await provisionFromCrmLead(numericId, req, { source: 'lifecycle', force });
        if (!provisionResult.success) {
          return res.status(provisionResult.status || 500).json({ error: provisionResult.error, code: provisionResult.code });
        }
        res.json({
          success: true,
          stage: 'active_parish',
          provisioned: true,
          provisioned_church_id: provisionResult.provisioned_church_id,
          registration_url: provisionResult.registration_url,
        });
        return;
      }
    }

    // For post-provision onboarding stages, update the churches table
    if (['deployment', 'active_parish'].includes(stage) && church.provisioned_church_id) {
      if (stage === 'active_parish') {
        await authPool.query('UPDATE churches SET setup_complete = 1 WHERE id = ?', [church.provisioned_church_id]);
      } else {
        await authPool.query('UPDATE churches SET setup_complete = 0 WHERE id = ?', [church.provisioned_church_id]);
      }
      // Also update CRM stage for consistency
      await omaiPool.query('UPDATE omai_crm_leads SET pipeline_stage = ? WHERE id = ?', [stage, numericId]);
    } else {
      // Standard CRM stage transition
      await omaiPool.query('UPDATE omai_crm_leads SET pipeline_stage = ? WHERE id = ?', [stage, numericId]);
    }

    // Log activity
    await omaiPool.query(
      `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
       VALUES (?, 'stage_change', ?, ?, ?)`,
      [numericId, `Stage changed to: ${stage}`, JSON.stringify({ new_stage: stage }), req.session?.user?.id || req.user?.userId || req.user?.id || null]
    );

    // If moving to 'active_parish', mark as client
    if (stage === 'active_parish') {
      await omaiPool.query('UPDATE omai_crm_leads SET is_client = 1 WHERE id = ?', [numericId]);
    }

    res.json({ success: true, stage });
  } catch (err) {
    console.error('Church lifecycle stage transition error:', err);
    res.status(500).json({ error: 'Failed to transition stage' });
  }
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Derive onboarding stage from church data (legacy display — prefer unified onboarding state API).
 */
function deriveOnboardingStage(ch) {
  if (ch.setup_complete === 1) return 'setup_complete';
  if (ch.active_users > 0) return 'active';
  if (ch.pending_users > 0 || ch.active_tokens > 0) return 'onboarding';
  return 'onboarding';
}

// provisionChurch removed — use churchProvisionOrchestrator.provisionFromCrmLead

router.put('/church/:churchId/client-status', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const { client_status, billing_status, contact_phase, contact_phase_due, contact_phase_notes } = req.body || {};
    if (client_status && !CLIENT_STATUSES.includes(client_status)) {
      return res.status(400).json({ error: 'Invalid client_status' });
    }
    if (billing_status && !BILLING_STATUSES.includes(billing_status)) {
      return res.status(400).json({ error: 'Invalid billing_status' });
    }
    const sets = [];
    const params = [];
    if (client_status) { sets.push('client_status = ?'); params.push(client_status); }
    if (billing_status) { sets.push('billing_status = ?'); params.push(billing_status); }
    if (contact_phase) { sets.push('contact_phase = ?'); params.push(contact_phase); }
    if (contact_phase_due !== undefined) { sets.push('contact_phase_due = ?'); params.push(contact_phase_due || null); }
    if (contact_phase_notes !== undefined) { sets.push('contact_phase_notes = ?'); params.push(contact_phase_notes || null); }
    if (billing_status === 'paid') { sets.push('paid_at = COALESCE(paid_at, NOW())'); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(churchId);
    await getOmAuthPool().query(`UPDATE churches SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await getOmAuthPool().query('SELECT * FROM churches WHERE id = ?', [churchId]);
    res.json({ success: true, church: rows[0] });
  } catch (err) {
    console.error('client-status update error:', err);
    res.status(500).json({ error: 'Failed to update church status' });
  }
});

router.put('/crm/:leadId/contact-phase', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId, 10);
    const { contact_phase, contact_phase_due, contact_phase_notes, billing_status } = req.body || {};
    const sets = [];
    const params = [];
    if (contact_phase) { sets.push('contact_phase = ?'); params.push(contact_phase); }
    if (contact_phase_due !== undefined) { sets.push('contact_phase_due = ?'); params.push(contact_phase_due || null); }
    if (contact_phase_notes !== undefined) { sets.push('contact_phase_notes = ?'); params.push(contact_phase_notes || null); }
    if (billing_status) { sets.push('billing_status = ?'); params.push(billing_status); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(leadId);
    await getOmaiPool().query(`UPDATE omai_crm_leads SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await getOmaiPool().query(
      'SELECT id, name, contact_phase, contact_phase_due, billing_status FROM omai_crm_leads WHERE id = ?',
      [leadId],
    );
    res.json({ success: true, lead: rows[0] });
  } catch (err) {
    console.error('contact-phase update error:', err);
    res.status(500).json({ error: 'Failed to update contact phase' });
  }
});

module.exports = router;
