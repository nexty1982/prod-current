/**
 * Church Lifecycle API — Unified CRM + Onboarding Pipeline
 *
 * Facade over omai_crm_leads (CRM leads) and churches (onboarded) tables.
 * Presents a single pipeline from first contact through active church status.
 *
 * Mounted at /api/admin/church-lifecycle
 * PP-0003 Step 2 | CS-0050
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const ADMIN_ROLES = ['super_admin', 'admin'];

// ═══════════════════════════════════════════════════════════════
// PIPELINE STAGES — full lifecycle stages list
// ═══════════════════════════════════════════════════════════════

router.get('/stages', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const [stages] = await getAppPool().query(
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

router.get('/dashboard', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();

    // CRM pipeline counts (stages 1-7 + terminal)
    const [crmCounts] = await pool.query(
      `SELECT uc.pipeline_stage, ps.label, ps.color, ps.sort_order, COUNT(*) as count
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       GROUP BY uc.pipeline_stage, ps.label, ps.color, ps.sort_order
       ORDER BY ps.sort_order`
    );

    // Onboarding counts (from churches table — derive stage)
    const [onboardedChurches] = await pool.query(`
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
        SELECT church_id,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
        FROM users WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
    `);

    const onboardingCounts = { onboarding: 0, active: 0, setup_complete: 0 };
    for (const ch of onboardedChurches) {
      const stage = deriveOnboardingStage(ch);
      if (onboardingCounts[stage] !== undefined) onboardingCounts[stage]++;
      else onboardingCounts.onboarding++;
    }

    // Merge into unified pipeline
    const [allStages] = await pool.query('SELECT * FROM omai_crm_pipeline_stages ORDER BY sort_order');
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
    const [overdue] = await pool.query(
      "SELECT COUNT(*) as count FROM omai_crm_followups WHERE status = 'pending' AND due_date < CURDATE()"
    );
    const [todayFollowups] = await pool.query(
      "SELECT COUNT(*) as count FROM omai_crm_followups WHERE status = 'pending' AND due_date = CURDATE()"
    );
    const [upcomingFollowups] = await pool.query(
      `SELECT f.*, uc.name as church_name, uc.state_code, uc.city
       FROM omai_crm_followups f
       JOIN omai_crm_leads uc ON f.church_id = uc.id
       WHERE f.status = 'pending' AND f.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY f.due_date ASC LIMIT 20`
    );

    // Totals
    const [crmTotals] = await pool.query('SELECT COUNT(*) as total FROM omai_crm_leads');
    const [onboardedTotal] = await pool.query('SELECT COUNT(*) as total FROM churches');

    res.json({
      pipeline,
      overdue: overdue[0].count,
      todayFollowups: todayFollowups[0].count,
      upcomingFollowups,
      totalCrmLeads: crmTotals[0].total,
      totalOnboarded: onboardedTotal[0].total,
    });
  } catch (err) {
    console.error('Church lifecycle dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE — unified list of all churches across full lifecycle
// ═══════════════════════════════════════════════════════════════

router.get('/pipeline', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
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
    if (stage && !['onboarding', 'active', 'setup_complete'].includes(stage)) {
      crmConditions.push('uc.pipeline_stage = ?');
      crmParams.push(stage);
    }

    const crmWhere = crmConditions.length > 0 ? `WHERE ${crmConditions.join(' AND ')}` : '';

    // Skip CRM query if filtering for onboarding-only stages
    let crmRows = [];
    if (!stage || !['onboarding', 'active', 'setup_complete'].includes(stage)) {
      const [rows] = await pool.query(
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
          j.name AS jurisdiction_name,
          (SELECT COUNT(*) FROM omai_crm_contacts cc WHERE cc.church_id = uc.id) AS contact_count,
          (SELECT COUNT(*) FROM omai_crm_followups cf WHERE cf.church_id = uc.id AND cf.status = 'pending') AS pending_followups
        FROM omai_crm_leads uc
        LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
        LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
        ${crmWhere}
        ORDER BY uc.name ASC`,
        crmParams
      );

      crmRows = rows.map(r => ({
        ...r,
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

    const [churchRows] = await pool.query(`
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
    const [onboardingStages] = await pool.query(
      "SELECT * FROM omai_crm_pipeline_stages WHERE stage_key IN ('onboarding', 'active', 'setup_complete')"
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

// ═══════════════════════════════════════════════════════════════
// DETAIL — unified detail for any church (CRM lead or onboarded)
// ═══════════════════════════════════════════════════════════════

router.get('/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { id } = req.params;

    // Check if this is a church_## ID (onboarded-only) or a numeric CRM ID
    const isChurchTableId = String(id).startsWith('church_');
    const numericId = isChurchTableId ? parseInt(id.replace('church_', '')) : parseInt(id);

    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    let crmChurch = null;
    let onboardedChurch = null;
    let contacts = [];
    let activities = [];
    let followUps = [];
    let members = [];
    let tokens = [];

    if (isChurchTableId) {
      // Direct lookup in churches table
      const [rows] = await pool.query('SELECT * FROM churches WHERE id = ?', [numericId]);
      if (!rows.length) return res.status(404).json({ error: 'Church not found' });
      onboardedChurch = rows[0];
    } else {
      // Lookup in omai_crm_leads (CRM)
      const [crmRows] = await pool.query(
        `SELECT uc.*, ps.label AS stage_label, ps.color AS stage_color
         FROM omai_crm_leads uc
         LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
         WHERE uc.id = ?`,
        [numericId]
      );
      if (!crmRows.length) return res.status(404).json({ error: 'Church not found' });
      crmChurch = crmRows[0];

      // CRM data
      const [c] = await pool.query('SELECT * FROM omai_crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name', [numericId]);
      contacts = c;
      const [a] = await pool.query('SELECT * FROM omai_crm_activities WHERE church_id = ? ORDER BY created_at DESC LIMIT 50', [numericId]);
      activities = a;
      const [f] = await pool.query('SELECT * FROM omai_crm_followups WHERE church_id = ? ORDER BY due_date ASC', [numericId]);
      followUps = f;

      // If provisioned, also get onboarded data
      if (crmChurch.provisioned_church_id) {
        const [oRows] = await pool.query('SELECT * FROM churches WHERE id = ?', [crmChurch.provisioned_church_id]);
        if (oRows.length) onboardedChurch = oRows[0];
      }
    }

    // If we have an onboarded church, get tokens and members
    const churchId = onboardedChurch?.id;
    if (churchId) {
      const [m] = await pool.query(
        `SELECT id, email, first_name, last_name, full_name, role, is_locked, lockout_reason, created_at
         FROM users WHERE church_id = ? ORDER BY created_at DESC`,
        [churchId]
      );
      members = m;

      const [t] = await pool.query(
        `SELECT crt.id, crt.token, crt.is_active, crt.created_at, u.email AS created_by
         FROM church_registration_tokens crt
         LEFT JOIN users u ON crt.created_by = u.id
         WHERE crt.church_id = ? ORDER BY crt.created_at DESC`,
        [churchId]
      );
      tokens = t;
    }

    // Derive unified stage
    let unified_stage, source;
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

    // Onboarding checklist (if applicable)
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

    res.json({
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
    });
  } catch (err) {
    console.error('Church lifecycle detail error:', err);
    res.status(500).json({ error: 'Failed to load church detail' });
  }
});

// ═══════════════════════════════════════════════════════════════
// STAGE TRANSITION — change stage with automatic provisioning
// ═══════════════════════════════════════════════════════════════

router.put('/:id/stage', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage) return res.status(400).json({ error: 'stage is required' });

    // Validate stage exists
    const [stageRows] = await pool.query('SELECT * FROM omai_crm_pipeline_stages WHERE stage_key = ?', [stage]);
    if (!stageRows.length) return res.status(400).json({ error: `Unknown stage: ${stage}` });

    const isChurchTableId = String(id).startsWith('church_');
    const numericId = isChurchTableId ? parseInt(id.replace('church_', '')) : parseInt(id);

    if (isChurchTableId) {
      // Onboarded-only church — can only transition between onboarding stages
      if (stage === 'setup_complete') {
        await pool.query('UPDATE churches SET setup_complete = 1 WHERE id = ?', [numericId]);
      } else if (stage === 'active' || stage === 'onboarding') {
        await pool.query('UPDATE churches SET setup_complete = 0 WHERE id = ?', [numericId]);
      }
      res.json({ success: true, stage, church_table_id: numericId });
      return;
    }

    // CRM lead — update pipeline_stage
    const [existing] = await pool.query('SELECT * FROM omai_crm_leads WHERE id = ?', [numericId]);
    if (!existing.length) return res.status(404).json({ error: 'Church not found' });

    const church = existing[0];

    // If transitioning TO "won" and not already provisioned — trigger provision
    if (stage === 'won' && !church.provisioned_church_id) {
      // Delegate to the existing CRM provision endpoint logic
      // We import and call it inline to avoid duplication
      const provisionResult = await provisionChurch(pool, numericId, req);
      if (provisionResult.error) {
        return res.status(500).json({ error: provisionResult.error });
      }
      res.json({
        success: true,
        stage: 'won',
        provisioned: true,
        provisioned_church_id: provisionResult.provisioned_church_id,
        registration_url: provisionResult.registration_url,
      });
      return;
    }

    // For post-provision onboarding stages, update the churches table
    if (['onboarding', 'active', 'setup_complete'].includes(stage) && church.provisioned_church_id) {
      if (stage === 'setup_complete') {
        await pool.query('UPDATE churches SET setup_complete = 1 WHERE id = ?', [church.provisioned_church_id]);
      } else {
        await pool.query('UPDATE churches SET setup_complete = 0 WHERE id = ?', [church.provisioned_church_id]);
      }
      // Also update CRM stage for consistency
      await pool.query('UPDATE omai_crm_leads SET pipeline_stage = ? WHERE id = ?', [stage, numericId]);
    } else {
      // Standard CRM stage transition
      await pool.query('UPDATE omai_crm_leads SET pipeline_stage = ? WHERE id = ?', [stage, numericId]);
    }

    // Log activity to CRM activities
    const actorId = req.session?.user?.id || req.user?.userId || null;
    await pool.query(
      `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
       VALUES (?, 'stage_change', ?, ?, ?)`,
      [numericId, `Stage changed to: ${stage}`, JSON.stringify({ new_stage: stage, previous_stage: church.pipeline_stage }), actorId]
    );

    // Also log to onboarding activity log for unified timeline
    await pool.query(
      `INSERT INTO onboarding_activity_log (onboarding_id, activity_type, actor_user_id, summary, details_json)
       VALUES (?, ?, ?, ?, ?)`,
      [numericId, 'stage_change', actorId, `Pipeline stage changed: ${church.pipeline_stage || 'none'} → ${stage}`,
       JSON.stringify({ previous_stage: church.pipeline_stage, new_stage: stage })]
    );

    // If moving to 'won', mark as client
    if (stage === 'won') {
      await pool.query('UPDATE omai_crm_leads SET is_client = 1 WHERE id = ?', [numericId]);
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
 * Derive onboarding stage from church data
 */
function deriveOnboardingStage(ch) {
  if (ch.setup_complete === 1) return 'setup_complete';
  if (ch.active_users > 0) return 'active';
  if (ch.pending_users > 0 || ch.active_tokens > 0) return 'onboarding';
  return 'onboarding'; // Default for provisioned churches with no activity yet
}

/**
 * Provision a CRM lead into an onboarded church
 * Extracted from /api/crm/churches/:id/provision to share logic
 */
async function provisionChurch(pool, crmChurchId, req) {
  try {
    const crypto = require('crypto');

    const [churchRows] = await pool.query(
      `SELECT uc.*, j.calendar_type AS jurisdiction_calendar, j.name AS jurisdiction_name
       FROM omai_crm_leads uc
       LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
       WHERE uc.id = ?`,
      [crmChurchId]
    );
    if (!churchRows.length) return { error: 'Church not found' };
    const church = churchRows[0];

    if (church.provisioned_church_id) {
      return { error: 'Church already provisioned', provisioned_church_id: church.provisioned_church_id };
    }

    // Get primary contact
    const [contacts] = await pool.query(
      'SELECT * FROM omai_crm_contacts WHERE church_id = ? AND is_primary = 1 LIMIT 1', [crmChurchId]
    );
    const primaryContact = contacts.length > 0 ? contacts[0] : null;
    const contactEmail = primaryContact?.email || null;
    const calendarType = church.jurisdiction_calendar || null;

    // 1. Insert into churches table
    const [insertResult] = await pool.query(
      `INSERT INTO churches (name, email, phone, website, address, city, state_province, postal_code, country,
                             jurisdiction, jurisdiction_id, calendar_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'United States', ?, ?, ?, TRUE)`,
      [
        church.name, contactEmail,
        church.phone || primaryContact?.phone || null,
        church.website || null, church.street || null,
        church.city || null, church.state_code || null, church.zip || null,
        church.jurisdiction || church.jurisdiction_name || null,
        church.jurisdiction_id || null, calendarType,
      ]
    );

    const newChurchId = insertResult.insertId;

    // 2. Create tenant database
    let dbResult = null;
    try {
      const ChurchProvisioner = require('../../services/church-provisioner');
      const provisioner = new ChurchProvisioner();
      dbResult = await provisioner.createChurchDatabase({
        name: church.name,
        email: contactEmail || `admin@church${newChurchId}.orthodoxmetrics.com`,
        phone: church.phone || null, website: church.website || null,
        address: church.street || null, city: church.city || null,
        state_province: church.state_code || null, postal_code: church.zip || null,
        country: 'United States',
      });
      if (dbResult?.databaseName) {
        await pool.query('UPDATE churches SET database_name = ? WHERE id = ?', [dbResult.databaseName, newChurchId]);
      }
    } catch (provisionErr) {
      console.error('ChurchProvisioner failed (non-fatal):', provisionErr.message);
    }

    // 3. Generate registration token
    let registrationToken = null;
    let registrationUrl = null;
    try {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'INSERT INTO church_registration_tokens (church_id, token, created_by) VALUES (?, ?, ?)',
        [newChurchId, token, req.session?.user?.id || req.user?.userId || 0]
      );
      registrationToken = token;
      const encodedName = encodeURIComponent(church.name);
      registrationUrl = `https://orthodoxmetrics.com/auth/register?token=${token}&church=${encodedName}`;
    } catch (tokenErr) {
      console.error('Token generation failed (non-fatal):', tokenErr.message);
    }

    // 4. Link back to CRM
    await pool.query(
      'UPDATE omai_crm_leads SET provisioned_church_id = ?, is_client = 1, pipeline_stage = ? WHERE id = ?',
      [newChurchId, 'won', crmChurchId]
    );

    // 5. Log activity
    await pool.query(
      `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
       VALUES (?, 'provision', ?, ?, ?)`,
      [crmChurchId, `Church provisioned (ID: ${newChurchId})`,
       JSON.stringify({ provisioned_church_id: newChurchId, database_name: dbResult?.databaseName || null }),
       req.session?.user?.id || req.user?.userId || null]
    );

    return {
      provisioned_church_id: newChurchId,
      database_name: dbResult?.databaseName || null,
      registration_url: registrationUrl,
    };
  } catch (err) {
    console.error('Provision error:', err);
    return { error: 'Failed to provision church' };
  }
}

module.exports = router;
