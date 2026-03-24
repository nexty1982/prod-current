/**
 * Change Sets API Routes
 * RESTful endpoints for the change_set delivery container.
 * Mounted at /api/admin/change-sets
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const changeSetService = require('../../services/changeSetService');

const requireSuperAdmin = requireRole(['super_admin']);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserId(req) {
  const user = req.session?.user || req.user;
  return user?.id;
}

function handleError(res, err) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) console.error('[change-sets]', err);
  res.status(status).json({ success: false, error: message });
}

// ── LIST / FILTER ────────────────────────────────────────────────────────────

router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { status, change_type, priority, limit, offset } = req.query;
    const statusFilter = status ? status.split(',') : undefined;
    const result = await changeSetService.list({
      status: statusFilter,
      change_type,
      priority,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

// ── RELEASE HISTORY ──────────────────────────────────────────────────────────

router.get('/releases', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const result = await changeSetService.getReleaseHistory(
      parseInt(limit) || 25,
      parseInt(offset) || 0
    );
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

// ── MEMBERSHIP LOOKUP (for OM Daily integration) ─────────────────────────────

router.post('/memberships', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || !item_ids.length) {
      return res.status(400).json({ success: false, error: 'item_ids array is required' });
    }
    const memberships = await changeSetService.getChangeSetMemberships(item_ids);
    res.json({ success: true, memberships });
  } catch (err) {
    handleError(res, err);
  }
});

// ── GET SINGLE ───────────────────────────────────────────────────────────────

router.get('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      // Try by code
      const cs = await changeSetService.getByCode(req.params.id);
      if (!cs) return res.status(404).json({ success: false, error: 'Change set not found' });
      return res.json({ success: true, change_set: cs });
    }
    const cs = await changeSetService.getById(id);
    if (!cs) return res.status(404).json({ success: false, error: 'Change set not found' });
    res.json({ success: true, change_set: cs });
  } catch (err) {
    handleError(res, err);
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────

router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, description, change_type, priority, git_branch, deployment_strategy, has_db_changes, migration_files, target_start_date, target_end_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }

    const cs = await changeSetService.create({
      title: title.trim(),
      description,
      change_type,
      priority,
      git_branch,
      deployment_strategy,
      has_db_changes,
      migration_files,
      target_start_date,
      target_end_date,
    }, userId);

    res.status(201).json({ success: true, change_set: cs });
  } catch (err) {
    handleError(res, err);
  }
});

// ── UPDATE METADATA ──────────────────────────────────────────────────────────

router.put('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const userId = getUserId(req);
    const cs = await changeSetService.update(id, req.body, userId);
    res.json({ success: true, change_set: cs });
  } catch (err) {
    handleError(res, err);
  }
});

// ── STATUS TRANSITIONS ──────────────────────────────────────────────────────

router.post('/:id/transition', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const { status: targetStatus, review_notes, rejection_reason, staging_build_run_id, staging_commit_sha, prod_build_run_id, prod_commit_sha } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const userId = getUserId(req);
    const cs = await changeSetService.transition(id, targetStatus, userId, {
      review_notes,
      rejection_reason,
      staging_build_run_id,
      staging_commit_sha,
      prod_build_run_id,
      prod_commit_sha,
    });

    res.json({ success: true, change_set: cs });
  } catch (err) {
    handleError(res, err);
  }
});

// ── FAST FORWARD ────────────────────────────────────────────────────────────

router.post('/:id/fast-forward', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const { staging_build_run_id, staging_commit_sha, prod_build_run_id, prod_commit_sha } = req.body;
    const userId = getUserId(req);

    const cs = await changeSetService.fastForward(id, userId, {
      staging_build_run_id,
      staging_commit_sha,
      prod_build_run_id,
      prod_commit_sha,
    });

    // Push to origin if branch is set
    if (cs.git_branch) {
      const { execSync } = require('child_process');
      const REPO_DIR = '/var/www/orthodoxmetrics/prod';
      try {
        execSync(`git push origin ${cs.git_branch}`, {
          cwd: REPO_DIR,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return res.json({ success: true, change_set: cs, push_success: true, push_branch: cs.git_branch });
      } catch (pushErr) {
        return res.json({ success: true, change_set: cs, push_success: false, push_error: pushErr.message });
      }
    }

    res.json({ success: true, change_set: cs });
  } catch (err) {
    handleError(res, err);
  }
});

// ── PROMOTE AND PUSH ────────────────────────────────────────────────────────

router.post('/:id/promote-and-push', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const { prod_build_run_id, prod_commit_sha } = req.body;
    const userId = getUserId(req);

    // Transition to promoted
    const cs = await changeSetService.transition(id, 'promoted', userId, {
      prod_build_run_id,
      prod_commit_sha,
    });

    // Push to origin
    const { execSync } = require('child_process');
    const REPO_DIR = '/var/www/orthodoxmetrics/prod';
    let pushResult = '';

    if (cs.git_branch) {
      try {
        pushResult = execSync(`git push origin ${cs.git_branch}`, {
          cwd: REPO_DIR,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (pushErr) {
        // Promotion succeeded but push failed — still return success with warning
        return res.json({
          success: true,
          change_set: cs,
          push_success: false,
          push_error: pushErr.message,
        });
      }
    }

    res.json({
      success: true,
      change_set: cs,
      push_success: true,
      push_branch: cs.git_branch,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ── ADD ITEM ─────────────────────────────────────────────────────────────────

router.post('/:id/items', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const changeSetId = parseInt(req.params.id);
    if (isNaN(changeSetId)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const { om_daily_item_id, sort_order, is_required, notes } = req.body;
    if (!om_daily_item_id) {
      return res.status(400).json({ success: false, error: 'om_daily_item_id is required' });
    }

    const userId = getUserId(req);
    const items = await changeSetService.addItem(changeSetId, om_daily_item_id, { sort_order, is_required, notes }, userId);
    res.status(201).json({ success: true, items });
  } catch (err) {
    handleError(res, err);
  }
});

// ── REMOVE ITEM ──────────────────────────────────────────────────────────────

router.delete('/:id/items/:itemId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const changeSetId = parseInt(req.params.id);
    const omDailyItemId = parseInt(req.params.itemId);
    if (isNaN(changeSetId) || isNaN(omDailyItemId)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const userId = getUserId(req);
    const items = await changeSetService.removeItem(changeSetId, omDailyItemId, userId);
    res.json({ success: true, items });
  } catch (err) {
    handleError(res, err);
  }
});

// ── ADD NOTE ─────────────────────────────────────────────────────────────────

router.post('/:id/notes', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const changeSetId = parseInt(req.params.id);
    if (isNaN(changeSetId)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const userId = getUserId(req);
    const events = await changeSetService.addNote(changeSetId, userId, message.trim());
    res.json({ success: true, events });
  } catch (err) {
    handleError(res, err);
  }
});

// ── GET EVENTS ───────────────────────────────────────────────────────────────

router.get('/:id/events', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const changeSetId = parseInt(req.params.id);
    if (isNaN(changeSetId)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const events = await changeSetService.getEvents(changeSetId);
    res.json({ success: true, events });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
