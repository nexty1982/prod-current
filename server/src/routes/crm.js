/**
 * CRM API Routes
 * Full customer relationship management for US Orthodox Churches
 *
 * Mounted at /api/crm
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

const requireAdmin = requireRole(['admin', 'super_admin']);

function getPool() {
  return require('../config/db').promisePool;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — aggregate stats for the CRM home page
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    // Pipeline counts
    const [pipelineCounts] = await pool.query(
      `SELECT uc.pipeline_stage, ps.label, ps.color, ps.sort_order, COUNT(*) as count
       FROM us_churches uc
       LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       GROUP BY uc.pipeline_stage, ps.label, ps.color, ps.sort_order
       ORDER BY ps.sort_order`
    );

    // Overdue follow-ups
    const [overdue] = await pool.query(
      `SELECT COUNT(*) as count FROM crm_follow_ups WHERE status = 'pending' AND due_date < CURDATE()`
    );

    // Today's follow-ups
    const [todayFollowups] = await pool.query(
      `SELECT COUNT(*) as count FROM crm_follow_ups WHERE status = 'pending' AND due_date = CURDATE()`
    );

    // Upcoming follow-ups (next 7 days)
    const [upcoming] = await pool.query(
      `SELECT f.*, uc.name as church_name, uc.state_code, uc.city
       FROM crm_follow_ups f
       JOIN us_churches uc ON f.church_id = uc.id
       WHERE f.status = 'pending' AND f.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY f.due_date ASC
       LIMIT 20`
    );

    // Recent activity (last 20)
    const [recentActivity] = await pool.query(
      `SELECT a.*, uc.name as church_name, uc.state_code
       FROM crm_activities a
       JOIN us_churches uc ON a.church_id = uc.id
       ORDER BY a.created_at DESC
       LIMIT 20`
    );

    // Total churches, total clients
    const [totals] = await pool.query(
      `SELECT COUNT(*) as total, SUM(is_client) as clients FROM us_churches`
    );

    // Churches by state (top 10 by pipeline activity — non-new_lead)
    const [activeStates] = await pool.query(
      `SELECT state_code, COUNT(*) as count
       FROM us_churches
       WHERE pipeline_stage != 'new_lead'
       GROUP BY state_code
       ORDER BY count DESC
       LIMIT 10`
    );

    res.json({
      pipeline: pipelineCounts,
      overdue: overdue[0].count,
      todayFollowups: todayFollowups[0].count,
      upcomingFollowups: upcoming,
      recentActivity,
      totalChurches: totals[0].total,
      totalClients: totals[0].clients || 0,
      activeStates,
    });
  } catch (err) {
    console.error('CRM dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE STAGES — list and manage
// ═══════════════════════════════════════════════════════════════

router.get('/pipeline-stages', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM crm_pipeline_stages ORDER BY sort_order');
    res.json({ stages: rows });
  } catch (err) {
    console.error('Pipeline stages error:', err);
    res.status(500).json({ error: 'Failed to load pipeline stages' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CHURCHES — list, search, detail, update pipeline stage
// ═══════════════════════════════════════════════════════════════

// List churches with CRM data, filters, search, pagination
router.get('/churches', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      limit = 25,
      search = '',
      state = '',
      pipeline_stage = '',
      jurisdiction = '',
      priority = '',
      sort = 'name',
      direction = 'asc',
    } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(uc.name LIKE ? OR uc.city LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (state) {
      conditions.push('uc.state_code = ?');
      params.push(state);
    }
    if (pipeline_stage) {
      conditions.push('uc.pipeline_stage = ?');
      params.push(pipeline_stage);
    }
    if (jurisdiction) {
      conditions.push('uc.jurisdiction = ?');
      params.push(jurisdiction);
    }
    if (priority) {
      conditions.push('uc.priority = ?');
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sort fields
    const allowedSorts = ['name', 'state_code', 'city', 'jurisdiction', 'pipeline_stage', 'priority', 'last_contacted_at', 'next_follow_up'];
    const sortField = allowedSorts.includes(sort) ? `uc.${sort}` : 'uc.name';
    const sortDir = direction === 'desc' ? 'DESC' : 'ASC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM us_churches uc ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT uc.*, ps.label as stage_label, ps.color as stage_color,
              (SELECT COUNT(*) FROM crm_contacts cc WHERE cc.church_id = uc.id) as contact_count,
              (SELECT COUNT(*) FROM crm_activities ca WHERE ca.church_id = uc.id) as activity_count,
              (SELECT COUNT(*) FROM crm_follow_ups cf WHERE cf.church_id = uc.id AND cf.status = 'pending') as pending_followups
       FROM us_churches uc
       LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       ${whereClause}
       ORDER BY ${sortField} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      churches: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('CRM churches list error:', err);
    res.status(500).json({ error: 'Failed to load churches' });
  }
});

// Get single church detail with contacts, recent activities, follow-ups
router.get('/churches/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [churchRows] = await pool.query(
      `SELECT uc.*, ps.label as stage_label, ps.color as stage_color
       FROM us_churches uc
       LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       WHERE uc.id = ?`,
      [id]
    );
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    const [contacts] = await pool.query('SELECT * FROM crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name', [id]);
    const [activities] = await pool.query(
      'SELECT * FROM crm_activities WHERE church_id = ? ORDER BY created_at DESC LIMIT 50', [id]
    );
    const [followUps] = await pool.query(
      'SELECT * FROM crm_follow_ups WHERE church_id = ? ORDER BY due_date ASC', [id]
    );

    res.json({
      church: churchRows[0],
      contacts,
      activities,
      followUps,
    });
  } catch (err) {
    console.error('CRM church detail error:', err);
    res.status(500).json({ error: 'Failed to load church detail' });
  }
});

// Update church CRM fields (pipeline stage, priority, notes, etc.)
router.put('/churches/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { pipeline_stage, priority, crm_notes, assigned_to, next_follow_up, tags } = req.body;

    const updates = [];
    const params = [];

    if (pipeline_stage !== undefined) { updates.push('pipeline_stage = ?'); params.push(pipeline_stage); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (crm_notes !== undefined) { updates.push('crm_notes = ?'); params.push(crm_notes); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (next_follow_up !== undefined) { updates.push('next_follow_up = ?'); params.push(next_follow_up || null); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE us_churches SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log stage change as activity
    if (pipeline_stage !== undefined) {
      await pool.query(
        `INSERT INTO crm_activities (church_id, activity_type, subject, metadata, created_by)
         VALUES (?, 'stage_change', ?, ?, ?)`,
        [id, `Pipeline stage changed to: ${pipeline_stage}`, JSON.stringify({ new_stage: pipeline_stage }), req.session?.user?.id || null]
      );

      // If moved to 'won', mark as client
      if (pipeline_stage === 'won') {
        await pool.query('UPDATE us_churches SET is_client = 1 WHERE id = ?', [id]);
      }
    }

    const [updated] = await pool.query('SELECT * FROM us_churches WHERE id = ?', [id]);
    res.json({ church: updated[0] });
  } catch (err) {
    console.error('CRM church update error:', err);
    res.status(500).json({ error: 'Failed to update church' });
  }
});

// Bulk update pipeline stage
router.put('/churches/bulk/pipeline', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { church_ids, pipeline_stage } = req.body;
    if (!church_ids?.length || !pipeline_stage) return res.status(400).json({ error: 'church_ids and pipeline_stage required' });

    const placeholders = church_ids.map(() => '?').join(',');
    await pool.query(`UPDATE us_churches SET pipeline_stage = ? WHERE id IN (${placeholders})`, [pipeline_stage, ...church_ids]);

    // Log activities
    for (const cid of church_ids) {
      await pool.query(
        `INSERT INTO crm_activities (church_id, activity_type, subject, metadata, created_by) VALUES (?, 'stage_change', ?, ?, ?)`,
        [cid, `Bulk pipeline stage changed to: ${pipeline_stage}`, JSON.stringify({ new_stage: pipeline_stage, bulk: true }), req.session?.user?.id || null]
      );
    }

    res.json({ updated: church_ids.length });
  } catch (err) {
    console.error('CRM bulk update error:', err);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CONTACTS — CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/churches/:churchId/contacts', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT * FROM crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name', [req.params.churchId]
    );
    res.json({ contacts: rows });
  } catch (err) {
    console.error('CRM contacts list error:', err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

router.post('/churches/:churchId/contacts', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { churchId } = req.params;
    const { first_name, last_name, role, email, phone, is_primary, notes } = req.body;
    if (!first_name) return res.status(400).json({ error: 'first_name required' });

    // If setting as primary, unset other primaries
    if (is_primary) {
      await pool.query('UPDATE crm_contacts SET is_primary = 0 WHERE church_id = ?', [churchId]);
    }

    const [result] = await pool.query(
      `INSERT INTO crm_contacts (church_id, first_name, last_name, role, email, phone, is_primary, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [churchId, first_name, last_name || null, role || null, email || null, phone || null, is_primary ? 1 : 0, notes || null]
    );

    // Log activity
    await pool.query(
      `INSERT INTO crm_activities (church_id, contact_id, activity_type, subject, created_by)
       VALUES (?, ?, 'note', ?, ?)`,
      [churchId, result.insertId, `Contact added: ${first_name} ${last_name || ''}`.trim(), req.session?.user?.id || null]
    );

    const [contact] = await pool.query('SELECT * FROM crm_contacts WHERE id = ?', [result.insertId]);
    res.status(201).json({ contact: contact[0] });
  } catch (err) {
    console.error('CRM contact create error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.put('/contacts/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { first_name, last_name, role, email, phone, is_primary, notes } = req.body;

    const [existing] = await pool.query('SELECT * FROM crm_contacts WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Contact not found' });

    if (is_primary) {
      await pool.query('UPDATE crm_contacts SET is_primary = 0 WHERE church_id = ?', [existing[0].church_id]);
    }

    await pool.query(
      `UPDATE crm_contacts SET first_name = ?, last_name = ?, role = ?, email = ?, phone = ?, is_primary = ?, notes = ? WHERE id = ?`,
      [first_name || existing[0].first_name, last_name, role, email, phone, is_primary ? 1 : 0, notes, id]
    );

    const [updated] = await pool.query('SELECT * FROM crm_contacts WHERE id = ?', [id]);
    res.json({ contact: updated[0] });
  } catch (err) {
    console.error('CRM contact update error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/contacts/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM crm_contacts WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Contact not found' });

    await pool.query('DELETE FROM crm_contacts WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('CRM contact delete error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITIES — log and list
// ═══════════════════════════════════════════════════════════════

router.get('/churches/:churchId/activities', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type = '' } = req.query;
    let sql = 'SELECT * FROM crm_activities WHERE church_id = ?';
    const params = [req.params.churchId];
    if (type) { sql += ' AND activity_type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await getPool().query(sql, params);
    res.json({ activities: rows });
  } catch (err) {
    console.error('CRM activities list error:', err);
    res.status(500).json({ error: 'Failed to load activities' });
  }
});

router.post('/churches/:churchId/activities', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { churchId } = req.params;
    const { activity_type, subject, body, contact_id, metadata } = req.body;
    if (!activity_type || !subject) return res.status(400).json({ error: 'activity_type and subject required' });

    const [result] = await pool.query(
      `INSERT INTO crm_activities (church_id, contact_id, activity_type, subject, body, metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [churchId, contact_id || null, activity_type, subject, body || null, metadata ? JSON.stringify(metadata) : null, req.session?.user?.id || null]
    );

    // Update last_contacted_at if it's a contact-type activity
    if (['call', 'email', 'meeting'].includes(activity_type)) {
      await pool.query('UPDATE us_churches SET last_contacted_at = NOW() WHERE id = ?', [churchId]);
    }

    const [activity] = await pool.query('SELECT * FROM crm_activities WHERE id = ?', [result.insertId]);
    res.status(201).json({ activity: activity[0] });
  } catch (err) {
    console.error('CRM activity create error:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FOLLOW-UPS — CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/follow-ups', requireAuth, async (req, res) => {
  try {
    const { status = 'pending', limit = 50 } = req.query;
    let sql = `SELECT f.*, uc.name as church_name, uc.state_code, uc.city, uc.pipeline_stage
               FROM crm_follow_ups f
               JOIN us_churches uc ON f.church_id = uc.id`;
    const params = [];

    if (status && status !== 'all') {
      sql += ' WHERE f.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY f.due_date ASC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await getPool().query(sql, params);

    // Mark overdue
    const now = new Date().toISOString().split('T')[0];
    rows.forEach(r => {
      if (r.status === 'pending' && r.due_date && r.due_date.toISOString().split('T')[0] < now) {
        r.is_overdue = true;
      }
    });

    res.json({ followUps: rows });
  } catch (err) {
    console.error('CRM follow-ups list error:', err);
    res.status(500).json({ error: 'Failed to load follow-ups' });
  }
});

router.post('/churches/:churchId/follow-ups', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { churchId } = req.params;
    const { due_date, subject, description, assigned_to } = req.body;
    if (!due_date || !subject) return res.status(400).json({ error: 'due_date and subject required' });

    const [result] = await pool.query(
      `INSERT INTO crm_follow_ups (church_id, assigned_to, due_date, subject, description)
       VALUES (?, ?, ?, ?, ?)`,
      [churchId, assigned_to || null, due_date, subject, description || null]
    );

    // Update next_follow_up on church
    await pool.query(
      `UPDATE us_churches SET next_follow_up = (
         SELECT MIN(due_date) FROM crm_follow_ups WHERE church_id = ? AND status = 'pending'
       ) WHERE id = ?`,
      [churchId, churchId]
    );

    const [followUp] = await pool.query('SELECT * FROM crm_follow_ups WHERE id = ?', [result.insertId]);
    res.status(201).json({ followUp: followUp[0] });
  } catch (err) {
    console.error('CRM follow-up create error:', err);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

router.put('/follow-ups/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { status, due_date, subject, description } = req.body;

    const [existing] = await pool.query('SELECT * FROM crm_follow_ups WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Follow-up not found' });

    const updates = [];
    const params = [];
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') { updates.push('completed_at = NOW()'); }
    }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
    if (subject !== undefined) { updates.push('subject = ?'); params.push(subject); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE crm_follow_ups SET ${updates.join(', ')} WHERE id = ?`, params);

    // Refresh next_follow_up on church
    const churchId = existing[0].church_id;
    await pool.query(
      `UPDATE us_churches SET next_follow_up = (
         SELECT MIN(due_date) FROM crm_follow_ups WHERE church_id = ? AND status = 'pending'
       ) WHERE id = ?`,
      [churchId, churchId]
    );

    const [updated] = await pool.query('SELECT * FROM crm_follow_ups WHERE id = ?', [id]);
    res.json({ followUp: updated[0] });
  } catch (err) {
    console.error('CRM follow-up update error:', err);
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

router.delete('/follow-ups/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM crm_follow_ups WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Follow-up not found' });

    await pool.query('DELETE FROM crm_follow_ups WHERE id = ?', [req.params.id]);

    // Refresh next_follow_up on church
    const churchId = existing[0].church_id;
    await pool.query(
      `UPDATE us_churches SET next_follow_up = (
         SELECT MIN(due_date) FROM crm_follow_ups WHERE church_id = ? AND status = 'pending'
       ) WHERE id = ?`,
      [churchId, churchId]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error('CRM follow-up delete error:', err);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROVISION — initiate church provisioning from CRM data
// ═══════════════════════════════════════════════════════════════

router.post('/churches/:id/provision', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [churchRows] = await pool.query('SELECT * FROM us_churches WHERE id = ?', [id]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });
    const church = churchRows[0];

    if (church.provisioned_church_id) {
      return res.status(400).json({ error: 'Church already provisioned', provisioned_church_id: church.provisioned_church_id });
    }

    // Get primary contact
    const [contacts] = await pool.query('SELECT * FROM crm_contacts WHERE church_id = ? AND is_primary = 1 LIMIT 1', [id]);
    const primaryContact = contacts.length > 0 ? contacts[0] : null;

    // Insert into churches table
    const [insertResult] = await pool.query(
      `INSERT INTO churches (church_name, location, contact_email, phone, website, street_address, city, state, zip_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        church.name,
        church.city && church.state_code ? `${church.city}, ${church.state_code}` : church.state_code,
        primaryContact?.email || null,
        church.phone || primaryContact?.phone || null,
        church.website || null,
        church.street || null,
        church.city || null,
        church.state_code || null,
        church.zip || null,
      ]
    );

    const newChurchId = insertResult.insertId;

    // Link back to CRM
    await pool.query(
      'UPDATE us_churches SET provisioned_church_id = ?, is_client = 1, pipeline_stage = ? WHERE id = ?',
      [newChurchId, 'won', id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO crm_activities (church_id, activity_type, subject, metadata, created_by)
       VALUES (?, 'provision', ?, ?, ?)`,
      [id, `Church provisioned as OrthodoxMetrics client (ID: ${newChurchId})`,
       JSON.stringify({ provisioned_church_id: newChurchId }), req.session?.user?.id || null]
    );

    res.status(201).json({
      success: true,
      provisioned_church_id: newChurchId,
      message: `${church.name} has been provisioned as church #${newChurchId}`,
    });
  } catch (err) {
    console.error('CRM provision error:', err);
    res.status(500).json({ error: 'Failed to provision church' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MAP DATA — pipeline-enriched church counts by state
// ═══════════════════════════════════════════════════════════════

router.get('/map-data', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    // State-level pipeline breakdown
    const [stateData] = await pool.query(
      `SELECT state_code, pipeline_stage, COUNT(*) as count
       FROM us_churches
       GROUP BY state_code, pipeline_stage
       ORDER BY state_code`
    );

    // Aggregate by state
    const states = {};
    for (const row of stateData) {
      if (!states[row.state_code]) {
        states[row.state_code] = { total: 0, pipeline: {} };
      }
      states[row.state_code].total += row.count;
      states[row.state_code].pipeline[row.pipeline_stage] = row.count;
    }

    res.json({ states });
  } catch (err) {
    console.error('CRM map data error:', err);
    res.status(500).json({ error: 'Failed to load map data' });
  }
});

module.exports = router;
