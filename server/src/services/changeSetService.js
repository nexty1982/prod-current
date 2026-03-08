/**
 * Change Set Service
 * Core business logic for the change_set delivery container.
 * Handles CRUD, status transitions, item management, and event logging.
 */

const { getAppPool } = require('../config/db-compat');

// ── Status lifecycle ────────────────────────────────────────────────────────

const STATUSES = [
  'draft', 'active', 'ready_for_staging', 'staged',
  'in_review', 'approved', 'promoted', 'rejected', 'rolled_back',
];

const ALLOWED_TRANSITIONS = {
  draft:              ['active'],
  active:             ['ready_for_staging'],
  ready_for_staging:  ['staged'],
  staged:             ['in_review'],
  in_review:          ['approved', 'rejected'],
  approved:           ['promoted'],
  promoted:           ['rolled_back'],
  rejected:           ['active'],
};

// OM Daily item statuses considered "complete enough" for staging
const ACCEPTABLE_ITEM_STATUSES = ['done', 'review'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateCode(id) {
  return `CS-${String(id).padStart(4, '0')}`;
}

function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed && allowed.includes(to);
}

// ── Service ─────────────────────────────────────────────────────────────────

class ChangeSetService {

  // ── CREATE ──────────────────────────────────────────────────────────────

  async create({ title, description, change_type, priority, git_branch, deployment_strategy, has_db_changes, migration_files }, userId) {
    const pool = getAppPool();

    // Validate branch uniqueness for active change_sets
    if (git_branch) {
      await this._assertBranchAvailable(git_branch, null);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(`
        INSERT INTO change_sets
          (code, title, description, change_type, priority, git_branch, deployment_strategy, has_db_changes, migration_files, created_by)
        VALUES
          ('__TEMP__', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title,
        description || null,
        change_type || 'feature',
        priority || 'medium',
        git_branch || null,
        deployment_strategy || 'stage_then_promote',
        has_db_changes ? 1 : 0,
        migration_files ? JSON.stringify(migration_files) : null,
        userId,
      ]);

      const id = result.insertId;
      const code = generateCode(id);

      await conn.query('UPDATE change_sets SET code = ? WHERE id = ?', [code, id]);

      await conn.query(`
        INSERT INTO change_set_events (change_set_id, event_type, from_status, to_status, user_id, message, metadata)
        VALUES (?, 'created', NULL, 'draft', ?, ?, NULL)
      `, [id, userId, `Change set ${code} created`]);

      await conn.commit();
      return this.getById(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ── READ ────────────────────────────────────────────────────────────────

  async getById(id) {
    const pool = getAppPool();

    const [rows] = await pool.query(`
      SELECT cs.*,
             u_created.email AS created_by_email,
             u_reviewed.email AS reviewed_by_email
      FROM change_sets cs
      LEFT JOIN users u_created ON cs.created_by = u_created.id
      LEFT JOIN users u_reviewed ON cs.reviewed_by = u_reviewed.id
      WHERE cs.id = ?
    `, [id]);

    if (!rows.length) return null;

    const cs = rows[0];
    cs.items = await this.getItems(id);
    cs.events = await this.getEvents(id);
    cs.item_count = cs.items.length;
    cs.required_item_count = cs.items.filter(i => i.is_required).length;

    return cs;
  }

  async getByCode(code) {
    const pool = getAppPool();
    const [rows] = await pool.query('SELECT id FROM change_sets WHERE code = ?', [code]);
    if (!rows.length) return null;
    return this.getById(rows[0].id);
  }

  async list({ status, change_type, priority, limit = 50, offset = 0 } = {}) {
    const pool = getAppPool();
    const conditions = [];
    const params = [];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`cs.status IN (${status.map(() => '?').join(',')})`);
        params.push(...status);
      } else {
        conditions.push('cs.status = ?');
        params.push(status);
      }
    }
    if (change_type) {
      conditions.push('cs.change_type = ?');
      params.push(change_type);
    }
    if (priority) {
      conditions.push('cs.priority = ?');
      params.push(priority);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT cs.*,
             u_created.email AS created_by_email,
             u_reviewed.email AS reviewed_by_email,
             (SELECT COUNT(*) FROM change_set_items WHERE change_set_id = cs.id) AS item_count
      FROM change_sets cs
      LEFT JOIN users u_created ON cs.created_by = u_created.id
      LEFT JOIN users u_reviewed ON cs.reviewed_by = u_reviewed.id
      ${where}
      ORDER BY
        FIELD(cs.status, 'in_review','staged','ready_for_staging','active','approved','draft','rejected','promoted','rolled_back'),
        cs.priority = 'critical' DESC,
        cs.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM change_sets cs ${where}`,
      params
    );

    return { items: rows, total: countResult[0].total };
  }

  // ── UPDATE METADATA ─────────────────────────────────────────────────────

  async update(id, fields, userId) {
    const pool = getAppPool();
    const cs = await this._getOrThrow(id);

    // Only allow metadata updates in draft or active status
    if (!['draft', 'active'].includes(cs.status)) {
      throw Object.assign(new Error(`Cannot update metadata when status is '${cs.status}'. Only draft/active change_sets can be edited.`), { status: 400 });
    }

    const allowedFields = ['title', 'description', 'change_type', 'priority', 'git_branch', 'deployment_strategy', 'has_db_changes', 'migration_files'];
    const updates = [];
    const params = [];

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        if (key === 'migration_files') {
          updates.push(`${key} = ?`);
          params.push(fields[key] ? JSON.stringify(fields[key]) : null);
        } else if (key === 'has_db_changes') {
          updates.push(`${key} = ?`);
          params.push(fields[key] ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          params.push(fields[key]);
        }
      }
    }

    if (!updates.length) {
      throw Object.assign(new Error('No valid fields to update'), { status: 400 });
    }

    // If changing branch, validate uniqueness
    if (fields.git_branch && fields.git_branch !== cs.git_branch) {
      await this._assertBranchAvailable(fields.git_branch, id);
    }

    params.push(id);
    await pool.query(`UPDATE change_sets SET ${updates.join(', ')} WHERE id = ?`, params);

    return this.getById(id);
  }

  // ── STATUS TRANSITIONS ──────────────────────────────────────────────────

  async transition(id, targetStatus, userId, { review_notes, rejection_reason, staging_build_run_id, staging_commit_sha, prod_build_run_id, prod_commit_sha } = {}) {
    const pool = getAppPool();
    const cs = await this._getOrThrow(id);

    if (!canTransition(cs.status, targetStatus)) {
      throw Object.assign(
        new Error(`Cannot transition from '${cs.status}' to '${targetStatus}'. Allowed: [${(ALLOWED_TRANSITIONS[cs.status] || []).join(', ')}]`),
        { status: 400 }
      );
    }

    // ── Per-transition validation & side effects ──

    const extraUpdates = {};

    switch (targetStatus) {
      case 'active':
        // Coming from draft or rejected — no special validation
        if (cs.status === 'rejected') {
          extraUpdates.rejected_at = null;
          extraUpdates.rejection_reason = null;
        }
        break;

      case 'ready_for_staging':
        // Validate all required items are in acceptable states
        await this._validateItemsReady(id);
        if (!cs.git_branch) {
          throw Object.assign(new Error('Cannot mark ready_for_staging without a git_branch'), { status: 400 });
        }
        break;

      case 'staged':
        if (!staging_build_run_id) {
          throw Object.assign(new Error('staging_build_run_id is required when transitioning to staged'), { status: 400 });
        }
        if (!staging_commit_sha) {
          throw Object.assign(new Error('staging_commit_sha is required when transitioning to staged'), { status: 400 });
        }
        // Enforce single staged change_set at a time
        await this._assertStagingSlotAvailable(id);
        extraUpdates.staging_build_run_id = staging_build_run_id;
        extraUpdates.staging_commit_sha = staging_commit_sha;
        extraUpdates.staged_at = new Date();
        break;

      case 'in_review':
        // Nothing extra — just moving to review
        break;

      case 'approved':
        if (!review_notes && cs.has_db_changes) {
          throw Object.assign(new Error('Review notes are required for change_sets with database changes'), { status: 400 });
        }
        // Lock approved_commit_sha to the staged commit
        extraUpdates.approved_commit_sha = cs.staging_commit_sha;
        extraUpdates.reviewed_by = userId;
        extraUpdates.review_notes = review_notes || null;
        extraUpdates.approved_at = new Date();
        break;

      case 'rejected':
        if (!rejection_reason) {
          throw Object.assign(new Error('rejection_reason is required when rejecting a change_set'), { status: 400 });
        }
        extraUpdates.reviewed_by = userId;
        extraUpdates.rejection_reason = rejection_reason;
        extraUpdates.rejected_at = new Date();
        // Clear staging data so it must be re-staged after rework
        extraUpdates.staging_build_run_id = null;
        extraUpdates.staging_commit_sha = null;
        extraUpdates.staged_at = null;
        extraUpdates.approved_commit_sha = null;
        extraUpdates.approved_at = null;
        break;

      case 'promoted':
        if (!prod_build_run_id) {
          throw Object.assign(new Error('prod_build_run_id is required when promoting'), { status: 400 });
        }
        if (!prod_commit_sha) {
          throw Object.assign(new Error('prod_commit_sha is required when promoting'), { status: 400 });
        }
        // Verify commit SHA hasn't drifted
        if (cs.approved_commit_sha && prod_commit_sha !== cs.approved_commit_sha) {
          throw Object.assign(
            new Error(`Commit SHA drift detected. Approved: ${cs.approved_commit_sha}, Promoting: ${prod_commit_sha}. Re-stage and re-approve required.`),
            { status: 409 }
          );
        }
        extraUpdates.prod_build_run_id = prod_build_run_id;
        extraUpdates.prod_commit_sha = prod_commit_sha;
        extraUpdates.promoted_at = new Date();
        break;

      case 'rolled_back':
        // No extra validation — admin decision
        break;
    }

    // Build UPDATE query
    const setClauses = ['status = ?'];
    const queryParams = [targetStatus];

    for (const [key, value] of Object.entries(extraUpdates)) {
      setClauses.push(`${key} = ?`);
      queryParams.push(value);
    }

    queryParams.push(id);

    // Log event data
    const eventType = this._statusToEventType(targetStatus);
    const message = rejection_reason || review_notes || `Status changed to ${targetStatus}`;
    const metadata = {};
    if (staging_build_run_id) metadata.staging_build_run_id = staging_build_run_id;
    if (staging_commit_sha) metadata.staging_commit_sha = staging_commit_sha;
    if (prod_build_run_id) metadata.prod_build_run_id = prod_build_run_id;
    if (prod_commit_sha) metadata.prod_commit_sha = prod_commit_sha;
    const metadataJson = Object.keys(metadata).length ? JSON.stringify(metadata) : null;

    // Atomic: status update + audit event in one transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE change_sets SET ${setClauses.join(', ')} WHERE id = ?`, queryParams);
      await conn.query(`
        INSERT INTO change_set_events (change_set_id, event_type, from_status, to_status, user_id, message, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, eventType, cs.status, targetStatus, userId || null, message, metadataJson]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return this.getById(id);
  }

  // ── ITEM MANAGEMENT ─────────────────────────────────────────────────────

  async addItem(changeSetId, omDailyItemId, { sort_order = 0, is_required = true, notes } = {}, userId) {
    const pool = getAppPool();
    const cs = await this._getOrThrow(changeSetId);

    // Only allow item changes in draft or active
    if (!['draft', 'active'].includes(cs.status)) {
      throw Object.assign(new Error(`Cannot add items when status is '${cs.status}'`), { status: 400 });
    }

    // Verify the om_daily_item exists
    const [itemRows] = await pool.query('SELECT id, title, status FROM om_daily_items WHERE id = ?', [omDailyItemId]);
    if (!itemRows.length) {
      throw Object.assign(new Error(`OM Daily item ${omDailyItemId} not found`), { status: 404 });
    }

    // Check item isn't already in another active change_set
    const [existing] = await pool.query(`
      SELECT csi.change_set_id, cs2.code, cs2.status
      FROM change_set_items csi
      JOIN change_sets cs2 ON cs2.id = csi.change_set_id
      WHERE csi.om_daily_item_id = ?
        AND cs2.status NOT IN ('promoted', 'rejected', 'rolled_back')
        AND cs2.id != ?
    `, [omDailyItemId, changeSetId]);

    if (existing.length) {
      throw Object.assign(
        new Error(`Item ${omDailyItemId} is already in active change_set ${existing[0].code} (${existing[0].status})`),
        { status: 409 }
      );
    }

    try {
      await pool.query(`
        INSERT INTO change_set_items (change_set_id, om_daily_item_id, sort_order, is_required, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [changeSetId, omDailyItemId, sort_order, is_required ? 1 : 0, notes || null]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw Object.assign(new Error(`Item ${omDailyItemId} is already in this change_set`), { status: 409 });
      }
      throw err;
    }

    await this._logEvent(changeSetId, 'item_added', null, null, userId,
      `Added item: ${itemRows[0].title}`,
      { om_daily_item_id: omDailyItemId, item_title: itemRows[0].title }
    );

    return this.getItems(changeSetId);
  }

  async removeItem(changeSetId, omDailyItemId, userId) {
    const pool = getAppPool();
    const cs = await this._getOrThrow(changeSetId);

    if (!['draft', 'active'].includes(cs.status)) {
      throw Object.assign(new Error(`Cannot remove items when status is '${cs.status}'`), { status: 400 });
    }

    // Get item title for logging
    const [itemRows] = await pool.query('SELECT title FROM om_daily_items WHERE id = ?', [omDailyItemId]);
    const itemTitle = itemRows.length ? itemRows[0].title : `#${omDailyItemId}`;

    const [result] = await pool.query(
      'DELETE FROM change_set_items WHERE change_set_id = ? AND om_daily_item_id = ?',
      [changeSetId, omDailyItemId]
    );

    if (result.affectedRows === 0) {
      throw Object.assign(new Error(`Item ${omDailyItemId} is not in this change_set`), { status: 404 });
    }

    await this._logEvent(changeSetId, 'item_removed', null, null, userId,
      `Removed item: ${itemTitle}`,
      { om_daily_item_id: omDailyItemId }
    );

    return this.getItems(changeSetId);
  }

  async getItems(changeSetId) {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT csi.*, odi.title AS item_title, odi.status AS item_status,
             odi.priority AS item_priority, odi.category AS item_category,
             odi.github_issue_number, odi.github_branch AS item_branch,
             odi.branch_type
      FROM change_set_items csi
      JOIN om_daily_items odi ON odi.id = csi.om_daily_item_id
      WHERE csi.change_set_id = ?
      ORDER BY csi.sort_order ASC, csi.added_at ASC
    `, [changeSetId]);
    return rows;
  }

  // ── EVENTS ──────────────────────────────────────────────────────────────

  async getEvents(changeSetId, limit = 100) {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT cse.*, u.email AS user_email
      FROM change_set_events cse
      LEFT JOIN users u ON u.id = cse.user_id
      WHERE cse.change_set_id = ?
      ORDER BY cse.created_at DESC
      LIMIT ?
    `, [changeSetId, limit]);
    return rows;
  }

  async addNote(changeSetId, userId, message) {
    const cs = await this._getOrThrow(changeSetId);
    await this._logEvent(changeSetId, 'note_added', null, null, userId, message);
    return this.getEvents(changeSetId);
  }

  // ── OM Daily membership lookup (for OM Daily API integration) ───────────

  async getChangeSetForItem(omDailyItemId) {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT cs.id, cs.code, cs.title, cs.status, cs.git_branch
      FROM change_set_items csi
      JOIN change_sets cs ON cs.id = csi.change_set_id
      WHERE csi.om_daily_item_id = ?
        AND cs.status NOT IN ('promoted', 'rejected', 'rolled_back')
      LIMIT 1
    `, [omDailyItemId]);
    return rows.length ? rows[0] : null;
  }

  async getChangeSetMemberships(omDailyItemIds) {
    if (!omDailyItemIds.length) return {};
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT csi.om_daily_item_id, cs.id AS change_set_id, cs.code, cs.title, cs.status
      FROM change_set_items csi
      JOIN change_sets cs ON cs.id = csi.change_set_id
      WHERE csi.om_daily_item_id IN (${omDailyItemIds.map(() => '?').join(',')})
        AND cs.status NOT IN ('promoted', 'rejected', 'rolled_back')
    `, omDailyItemIds);

    const map = {};
    for (const row of rows) {
      map[row.om_daily_item_id] = {
        change_set_id: row.change_set_id,
        code: row.code,
        title: row.title,
        status: row.status,
      };
    }
    return map;
  }

  // ── Release history ─────────────────────────────────────────────────────

  async getReleaseHistory(limit = 25, offset = 0) {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT cs.*,
             u_created.email AS created_by_email,
             u_reviewed.email AS reviewed_by_email,
             (SELECT COUNT(*) FROM change_set_items WHERE change_set_id = cs.id) AS item_count
      FROM change_sets cs
      LEFT JOIN users u_created ON cs.created_by = u_created.id
      LEFT JOIN users u_reviewed ON cs.reviewed_by = u_reviewed.id
      WHERE cs.status IN ('promoted', 'rolled_back')
      ORDER BY cs.promoted_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await pool.query(
      "SELECT COUNT(*) AS total FROM change_sets WHERE status IN ('promoted', 'rolled_back')"
    );

    return { items: rows, total: countResult[0].total };
  }

  // ── PRIVATE ─────────────────────────────────────────────────────────────

  async _getOrThrow(id) {
    const pool = getAppPool();
    const [rows] = await pool.query('SELECT * FROM change_sets WHERE id = ?', [id]);
    if (!rows.length) {
      throw Object.assign(new Error(`Change set ${id} not found`), { status: 404 });
    }
    return rows[0];
  }

  async _assertBranchAvailable(branch, excludeId) {
    const pool = getAppPool();
    const excludeClause = excludeId ? 'AND id != ?' : '';
    const params = [branch];
    if (excludeId) params.push(excludeId);

    const [rows] = await pool.query(`
      SELECT id, code, status FROM change_sets
      WHERE git_branch = ? AND status NOT IN ('promoted', 'rejected', 'rolled_back')
      ${excludeClause}
    `, params);

    if (rows.length) {
      throw Object.assign(
        new Error(`Branch '${branch}' is already assigned to active change_set ${rows[0].code} (${rows[0].status})`),
        { status: 409 }
      );
    }
  }

  async _assertStagingSlotAvailable(excludeId) {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT id, code FROM change_sets
      WHERE status IN ('staged', 'in_review')
        AND id != ?
    `, [excludeId]);

    if (rows.length) {
      throw Object.assign(
        new Error(`Staging slot occupied by ${rows[0].code}. Only one change_set can be staged at a time. Promote or reject ${rows[0].code} first.`),
        { status: 409 }
      );
    }
  }

  async _validateItemsReady(changeSetId) {
    const pool = getAppPool();
    const [items] = await pool.query(`
      SELECT csi.om_daily_item_id, odi.title, odi.status AS item_status, csi.is_required
      FROM change_set_items csi
      JOIN om_daily_items odi ON odi.id = csi.om_daily_item_id
      WHERE csi.change_set_id = ?
    `, [changeSetId]);

    if (!items.length) {
      throw Object.assign(new Error('Cannot stage an empty change_set — add at least one OM Daily item'), { status: 400 });
    }

    const blockers = items.filter(
      i => i.is_required && !ACCEPTABLE_ITEM_STATUSES.includes(i.item_status)
    );

    if (blockers.length) {
      const details = blockers.map(b => `  - "${b.title}" (status: ${b.item_status})`).join('\n');
      throw Object.assign(
        new Error(`${blockers.length} required item(s) not ready. Required status: [${ACCEPTABLE_ITEM_STATUSES.join(', ')}].\n${details}`),
        { status: 400 }
      );
    }
  }

  async _logEvent(changeSetId, eventType, fromStatus, toStatus, userId, message, metadata) {
    const pool = getAppPool();
    await pool.query(`
      INSERT INTO change_set_events (change_set_id, event_type, from_status, to_status, user_id, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      changeSetId,
      eventType,
      fromStatus || null,
      toStatus || null,
      userId || null,
      message || null,
      metadata ? JSON.stringify(metadata) : null,
    ]);
  }

  _statusToEventType(status) {
    const map = {
      active: 'status_changed',
      ready_for_staging: 'status_changed',
      staged: 'staged',
      in_review: 'review_started',
      approved: 'approved',
      rejected: 'rejected',
      promoted: 'promoted',
      rolled_back: 'rolled_back',
    };
    return map[status] || 'status_changed';
  }
}

module.exports = new ChangeSetService();
