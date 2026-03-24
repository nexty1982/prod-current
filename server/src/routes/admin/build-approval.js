/**
 * Build Approval Workflow API
 *
 * Implements build conditioning (repo cleanliness gate) and approval workflow.
 * All builds must go through: preflight → request → approve/deny → execute
 *
 * Routes:
 *   GET  /api/admin/build-approval/preflight       - Git state inspection
 *   POST /api/admin/build-approval/request          - Create build request
 *   GET  /api/admin/build-approval/requests         - List requests
 *   GET  /api/admin/build-approval/requests/pending - Pending count
 *   POST /api/admin/build-approval/approve/:id      - Approve request
 *   POST /api/admin/build-approval/deny/:id         - Deny request
 *   POST /api/admin/build-approval/execute/:id      - Execute approved build
 *   POST /api/admin/build-approval/cancel/:id       - Cancel request
 *   PATCH /api/admin/build-approval/requests/:id/build-result - Link build result
 */

const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db-compat');

const execFileAsync = promisify(execFile);

// Middleware
router.use(requireAuth);
const requireAdmin = requireRole(['admin', 'super_admin']);
router.use(requireAdmin);

function db() { return getAppPool(); }

// ── Repo path mapping ────────────────────────────────────────────────────────

const REPO_PATHS = {
  'om-frontend':   '/var/www/orthodoxmetrics/prod',
  'om-server':     '/var/www/orthodoxmetrics/prod',
  'omai-frontend': '/var/www/omai',
  'omai-server':   '/var/www/omai',
};

const TARGET_LABELS = {
  'om-frontend':   'OrthodoxMetrics Frontend',
  'om-server':     'OrthodoxMetrics Server',
  'omai-frontend': 'OMAI Frontend',
  'omai-server':   'OMAI Server',
};

// ── Git state inspection ─────────────────────────────────────────────────────

async function inspectRepo(repoPath) {
  const git = async (args) => {
    try {
      const { stdout } = await execFileAsync('git', args, { cwd: repoPath, timeout: 10000 });
      return stdout.trim();
    } catch (err) {
      throw new Error(`git ${args[0]} failed: ${err.message}`);
    }
  };

  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const commitSha = await git(['rev-parse', 'HEAD']);
  const shortSha = commitSha.substring(0, 8);

  let stagedFiles = [];
  try {
    const staged = await git(['diff', '--cached', '--name-only']);
    stagedFiles = staged ? staged.split('\n').filter(Boolean) : [];
  } catch { stagedFiles = []; }

  let unstagedFiles = [];
  try {
    const unstaged = await git(['diff', '--name-only']);
    unstagedFiles = unstaged ? unstaged.split('\n').filter(Boolean) : [];
  } catch { unstagedFiles = []; }

  let untrackedFiles = [];
  try {
    const untracked = await git(['ls-files', '--others', '--exclude-standard']);
    untrackedFiles = untracked ? untracked.split('\n').filter(Boolean) : [];
  } catch { untrackedFiles = []; }

  let ahead = 0, behind = 0;
  try {
    const tracking = await git(['rev-parse', '--abbrev-ref', `${branch}@{upstream}`]);
    if (tracking) {
      const counts = await git(['rev-list', '--left-right', '--count', `${branch}...${tracking}`]);
      const [a, b] = counts.split('\t').map(Number);
      ahead = a || 0;
      behind = b || 0;
    }
  } catch { /* no tracking branch */ }

  const hasStagedChanges = stagedFiles.length > 0;
  const hasUnstagedChanges = unstagedFiles.length > 0;
  const hasUntrackedFiles = untrackedFiles.length > 0;
  const isClean = !hasStagedChanges && !hasUnstagedChanges && !hasUntrackedFiles;

  let dirtySummary = null;
  if (!isClean) {
    const parts = [];
    if (hasStagedChanges) parts.push(`${stagedFiles.length} staged`);
    if (hasUnstagedChanges) parts.push(`${unstagedFiles.length} modified`);
    if (hasUntrackedFiles) parts.push(`${untrackedFiles.length} untracked`);
    dirtySummary = parts.join(', ');
  }

  const allChangedFiles = [
    ...stagedFiles.map(f => ({ file: f, type: 'staged' })),
    ...unstagedFiles.map(f => ({ file: f, type: 'modified' })),
    ...untrackedFiles.map(f => ({ file: f, type: 'untracked' })),
  ].slice(0, 30);

  return {
    branch, commitSha, shortSha, isClean,
    hasStagedChanges, hasUnstagedChanges, hasUntrackedFiles,
    stagedCount: stagedFiles.length, unstagedCount: unstagedFiles.length, untrackedCount: untrackedFiles.length,
    dirtySummary, changedFiles: allChangedFiles, ahead, behind,
  };
}

// ── GET /preflight ───────────────────────────────────────────────────────────

router.get('/preflight', async (req, res) => {
  try {
    const { target } = req.query;
    if (!target || !REPO_PATHS[target]) {
      return res.status(400).json({ success: false, error: 'Invalid build target' });
    }
    const repoState = await inspectRepo(REPO_PATHS[target]);
    res.json({ success: true, target, label: TARGET_LABELS[target], ...repoState });
  } catch (error) {
    console.error('Preflight error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /request ────────────────────────────────────────────────────────────

router.post('/request', async (req, res) => {
  try {
    const { target, action = 'build', note } = req.body;
    if (!target || !REPO_PATHS[target]) {
      return res.status(400).json({ success: false, error: 'Invalid build target' });
    }

    const validActions = ['build', 'rebuild_no_cache', 'server_build', 'restart'];
    const buildAction = validActions.includes(action) ? action : 'build';
    const repoState = await inspectRepo(REPO_PATHS[target]);

    const requestId = `br_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const user = req.session?.user || {};
    const requestedBy = user.email || 'unknown';
    const requestedById = user.id || null;
    const status = repoState.isClean ? 'pending_approval' : 'blocked_dirty_repo';

    await db().query(
      `INSERT INTO build_approval_requests
        (request_id, requested_by_id, requested_by, repo_target, build_action,
         branch, commit_sha, repo_clean, dirty_summary, status, request_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, requestedById, requestedBy, target, buildAction,
       repoState.branch, repoState.commitSha, repoState.isClean ? 1 : 0,
       repoState.dirtySummary, status, note || null]
    );

    const [[record]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );

    res.json({
      success: true, status, request: record, repoState,
      message: status === 'blocked_dirty_repo'
        ? `Build blocked: repo has uncommitted changes (${repoState.dirtySummary}). Commit your changes and retry.`
        : 'Build request created. Awaiting approval.',
    });
  } catch (error) {
    console.error('Build request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /requests ────────────────────────────────────────────────────────────

router.get('/requests', async (req, res) => {
  try {
    const { status, target, limit = 50 } = req.query;
    let sql = 'SELECT * FROM build_approval_requests';
    const params = [];
    const conditions = [];
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (target) { conditions.push('repo_target = ?'); params.push(target); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit) || 50);

    const [rows] = await db().query(sql, params);
    const [[{ pending_count }]] = await db().query(
      'SELECT COUNT(*) as pending_count FROM build_approval_requests WHERE status = ?',
      ['pending_approval']
    );
    res.json({ success: true, requests: rows, pending_count });
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /requests/pending ────────────────────────────────────────────────────

router.get('/requests/pending', async (req, res) => {
  try {
    const [rows] = await db().query(
      'SELECT * FROM build_approval_requests WHERE status = ? ORDER BY created_at DESC',
      ['pending_approval']
    );
    res.json({ success: true, requests: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /approve/:requestId ─────────────────────────────────────────────────

router.post('/approve/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const user = req.session?.user || {};
    const reviewerEmail = user.email || 'unknown';
    const reviewerId = user.id || null;
    const reviewerRole = user.role || '';

    if (reviewerRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Only super_admin can approve build requests' });
    }

    const [[request]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    if (!request) return res.status(404).json({ success: false, error: 'Build request not found' });
    if (request.status !== 'pending_approval') {
      return res.status(400).json({ success: false, error: `Cannot approve request in status: ${request.status}` });
    }

    // Self-approval check
    if (request.requested_by_id && request.requested_by_id === reviewerId) {
      return res.status(403).json({ success: false, error: 'Cannot self-approve build requests' });
    }

    // Re-verify repo state
    const currentState = await inspectRepo(REPO_PATHS[request.repo_target]);

    if (currentState.commitSha !== request.commit_sha) {
      await db().query(
        `UPDATE build_approval_requests SET status = 'invalidated',
         reviewed_by_id = ?, reviewed_by = ?, reviewed_at = NOW(), review_decision = 'denied',
         denial_reason = ? WHERE request_id = ?`,
        [reviewerId, reviewerEmail,
         `Commit SHA changed (was ${request.commit_sha.substring(0,8)}, now ${currentState.shortSha}). New request required.`,
         requestId]
      );
      return res.json({ success: false, error: 'invalidated',
        message: `Repo state changed. SHA was ${request.commit_sha.substring(0,8)}, now ${currentState.shortSha}. Request invalidated.` });
    }

    if (!currentState.isClean) {
      await db().query(
        `UPDATE build_approval_requests SET status = 'invalidated',
         reviewed_by_id = ?, reviewed_by = ?, reviewed_at = NOW(), review_decision = 'denied',
         denial_reason = ? WHERE request_id = ?`,
        [reviewerId, reviewerEmail,
         `Repo became dirty (${currentState.dirtySummary}). New request required.`, requestId]
      );
      return res.json({ success: false, error: 'invalidated',
        message: `Repo became dirty (${currentState.dirtySummary}). Request invalidated.` });
    }

    await db().query(
      `UPDATE build_approval_requests SET status = 'approved',
       reviewed_by_id = ?, reviewed_by = ?, reviewed_at = NOW(),
       review_decision = 'approved', execution_sha = ? WHERE request_id = ?`,
      [reviewerId, reviewerEmail, currentState.commitSha, requestId]
    );

    const [[updated]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    res.json({ success: true, message: 'Build request approved.', request: updated });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /deny/:requestId ────────────────────────────────────────────────────

router.post('/deny/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const user = req.session?.user || {};

    if (user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Only super_admin can deny build requests' });
    }

    const [[request]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    if (!request) return res.status(404).json({ success: false, error: 'Not found' });
    if (request.status !== 'pending_approval') {
      return res.status(400).json({ success: false, error: `Cannot deny request in status: ${request.status}` });
    }

    await db().query(
      `UPDATE build_approval_requests SET status = 'denied',
       reviewed_by_id = ?, reviewed_by = ?, reviewed_at = NOW(),
       review_decision = 'denied', denial_reason = ? WHERE request_id = ?`,
      [user.id, user.email, reason || null, requestId]
    );

    const [[updated]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    res.json({ success: true, message: 'Build request denied.', request: updated });
  } catch (error) {
    console.error('Deny error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /execute/:requestId ─────────────────────────────────────────────────

router.post('/execute/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const [[request]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    if (!request) return res.status(404).json({ success: false, error: 'Not found' });
    if (!['approved', 'queued'].includes(request.status)) {
      return res.status(400).json({ success: false,
        error: `Cannot execute in status: ${request.status}. Only approved requests can be executed.` });
    }

    // Final integrity check
    const currentState = await inspectRepo(REPO_PATHS[request.repo_target]);
    if (currentState.commitSha !== (request.execution_sha || request.commit_sha)) {
      await db().query(
        `UPDATE build_approval_requests SET status = 'invalidated',
         denial_reason = ? WHERE request_id = ?`,
        [`Commit changed between approval and execution`, requestId]
      );
      return res.status(409).json({ success: false, error: 'invalidated',
        message: 'Repo state changed after approval. Request invalidated.' });
    }
    if (!currentState.isClean) {
      await db().query(
        `UPDATE build_approval_requests SET status = 'invalidated',
         denial_reason = ? WHERE request_id = ?`,
        [`Repo dirty after approval (${currentState.dirtySummary})`, requestId]
      );
      return res.status(409).json({ success: false, error: 'invalidated',
        message: `Repo became dirty after approval. Request invalidated.` });
    }

    await db().query(
      `UPDATE build_approval_requests SET status = 'queued' WHERE request_id = ?`, [requestId]
    );

    const [[updated]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    res.json({ success: true, message: 'Build execution authorized.', request: updated });
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /cancel/:requestId ─────────────────────────────────────────────────

router.post('/cancel/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const [[request]] = await db().query(
      'SELECT * FROM build_approval_requests WHERE request_id = ?', [requestId]
    );
    if (!request) return res.status(404).json({ success: false, error: 'Not found' });

    const cancellable = ['pending_approval', 'approved', 'blocked_dirty_repo'];
    if (!cancellable.includes(request.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel in status: ${request.status}` });
    }

    await db().query(
      `UPDATE build_approval_requests SET status = 'cancelled' WHERE request_id = ?`, [requestId]
    );
    res.json({ success: true, message: 'Cancelled.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PATCH /requests/:requestId/build-result ──────────────────────────────────

router.patch('/requests/:requestId/build-result', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { buildId, success, duration } = req.body;
    const finalStatus = success ? 'completed' : 'failed';

    await db().query(
      `UPDATE build_approval_requests SET status = ?, build_id = ?, build_success = ?, build_duration = ?
       WHERE request_id = ?`,
      [finalStatus, buildId || null, success ? 1 : 0, duration || null, requestId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
