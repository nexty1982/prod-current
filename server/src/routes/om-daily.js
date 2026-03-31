/**
 * OM Daily API Routes — LEGACY / NOT MOUNTED
 *
 * This file is NOT mounted in the OM backend (see index.ts line ~852).
 * The canonical OM Daily routes live in OMAI: /var/www/omai/_runtime/server/src/api-ops/om-daily.js
 * All om_daily_items data lives in omai_db (NOT orthodoxmetrics_db).
 *
 * DO NOT re-mount this file. If OM-side OM Daily access is needed, use getOmaiPool().
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

function getPool() {
  return require('../config/db').promisePool;
}

// ── Attachment storage config ──────────────────────────────────
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads/om-daily');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp',
  '.pdf', '.doc', '.docx', '.txt', '.md',
  '.xls', '.xlsx', '.csv',
]);
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}

const attachmentStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const itemId = req.params.id;
    const dir = path.join(UPLOADS_ROOT, String(itemId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `${unique}${ext}`);
  },
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return cb(new Error(`File type ${ext} not allowed`));
    if (!ALLOWED_MIMES.has(file.mimetype)) return cb(new Error(`MIME type ${file.mimetype} not allowed`));
    cb(null, true);
  },
});

// ── Helpers ──────────────────────────────────────────────────

// Parse metadata/tags JSON safely
const parseMeta = (val) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return {}; }
};

// Map DailyTasks priority (1-5 numeric) ↔ OM Daily priority (enum string)
const PRIORITY_NUM_TO_STR = { 1: 'critical', 2: 'high', 3: 'medium', 4: 'low', 5: 'low' };
const PRIORITY_STR_TO_NUM = { critical: 1, high: 2, medium: 3, low: 4 };

// DailyTasks status mapping → OM Daily status
// DT: pending, in_progress, blocked, completed, failed, cancelled
// OM: backlog, in_progress, self_review, review, staging, done, blocked, cancelled
const DT_STATUS_TO_OM = { pending: 'backlog', in_progress: 'in_progress', blocked: 'blocked', completed: 'done', failed: 'cancelled', cancelled: 'cancelled' };
const OM_STATUS_TO_DT = { backlog: 'pending', in_progress: 'in_progress', self_review: 'in_progress', review: 'in_progress', staging: 'in_progress', done: 'completed', blocked: 'pending', cancelled: 'cancelled' };

// ── SDLC Git-to-Status Mapping ──────────────────────────────────────────
// 1. Backlog      → Task creation (manual)
// 2. In Progress  → Branch created
// 3. Review & QA  → PR opened (draft → ready)
// 4. Staging      → PR approved / CI pass
// 5. Done         → PR merged into main
const SDLC_STAGES = {
  BACKLOG: 'backlog',
  IN_PROGRESS: 'in_progress',
  SELF_REVIEW: 'self_review',
  REVIEW: 'review',
  STAGING: 'staging',
  DONE: 'done',
};

// Slugify a title for use in branch names
function slugify(str, maxLen = 50) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLen)
    .replace(/-$/, '');
}

// Extract OM Daily item ID from branch name.
// Authoritative format: feature/omd-412/2026-03-31/slug  →  412
// Legacy format:        feat/636-some-description        →  636
// Also handles:         fix/omd-413/2026-03-31/slug      →  413
const BRANCH_TASK_ID_REGEX_STANDARD = /^(?:feature|fix|chore)\/omd-([0-9]+)\//;
const BRANCH_TASK_ID_REGEX_LEGACY = /^(?:feat|enh|fix|ref|mig|chore|spike|docs)\/([0-9]+)(?:-|$)/;
function extractTaskIdFromBranch(branchName) {
  // Try authoritative format first
  let m = branchName.match(BRANCH_TASK_ID_REGEX_STANDARD);
  if (m) return parseInt(m[1], 10);
  // Fall back to legacy format
  m = branchName.match(BRANCH_TASK_ID_REGEX_LEGACY);
  return m ? parseInt(m[1], 10) : null;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — aggregate stats across all horizons
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    const [horizonStats] = await pool.query(
      `SELECT horizon, status, COUNT(*) as count
       FROM om_daily_items
       WHERE status != 'cancelled'
       GROUP BY horizon, status
       ORDER BY FIELD(horizon,'1','2','7','14','30','60','90'), FIELD(status,'backlog','in_progress','self_review','review','staging','done','blocked')`
    );

    const [overdue] = await pool.query(
      `SELECT COUNT(*) as count FROM om_daily_items
       WHERE due_date < CURDATE() AND status NOT IN ('done','cancelled')`
    );

    const [dueToday] = await pool.query(
      `SELECT COUNT(*) as count FROM om_daily_items
       WHERE due_date = CURDATE() AND status NOT IN ('done','cancelled')`
    );

    const [recentlyCompleted] = await pool.query(
      `SELECT COUNT(*) as count FROM om_daily_items
       WHERE status = 'done' AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    const [totalActive] = await pool.query(
      `SELECT COUNT(*) as count FROM om_daily_items WHERE status NOT IN ('done','cancelled')`
    );

    const horizons = {};
    for (const row of horizonStats) {
      if (!horizons[row.horizon]) {
        horizons[row.horizon] = { total: 0, statuses: {} };
      }
      horizons[row.horizon].total += row.count;
      horizons[row.horizon].statuses[row.status] = row.count;
    }

    res.json({
      horizons,
      overdue: overdue[0].count,
      dueToday: dueToday[0].count,
      recentlyCompleted: recentlyCompleted[0].count,
      totalActive: totalActive[0].count,
    });
  } catch (err) {
    console.error('OM Daily dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXTENDED DASHBOARD — richer stats for enhanced overview
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard/extended', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const repo = req.query.repo_target; // optional: 'omai' | 'orthodoxmetrics'
    const repoFilter = repo ? ` AND repo_target = ?` : '';
    const repoParam = repo ? [repo] : [];

    // Status distribution across ALL items (not cancelled)
    const [statusDist] = await pool.query(
      `SELECT status, COUNT(*) as count FROM om_daily_items WHERE status != 'cancelled'${repoFilter} GROUP BY status ORDER BY FIELD(status,'in_progress','self_review','review','staging','backlog','done','blocked')`,
      repoParam
    );

    // Priority distribution
    const [priorityDist] = await pool.query(
      `SELECT priority, COUNT(*) as count FROM om_daily_items WHERE status NOT IN ('done','cancelled')${repoFilter} GROUP BY priority ORDER BY FIELD(priority,'critical','high','medium','low')`,
      repoParam
    );

    // Category breakdown (active items only)
    const [categoryDist] = await pool.query(
      `SELECT COALESCE(category, 'Uncategorized') as category, COUNT(*) as count, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count FROM om_daily_items WHERE status != 'cancelled'${repoFilter} GROUP BY category ORDER BY count DESC LIMIT 15`,
      repoParam
    );

    // Recently completed items (last 14 days, with details)
    const [recentCompleted] = await pool.query(
      `SELECT id, title, category, horizon, completed_at, priority, repo_target FROM om_daily_items WHERE status = 'done' AND completed_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)${repoFilter} ORDER BY completed_at DESC LIMIT 15`,
      repoParam
    );

    // Currently in-progress items
    const [inProgressItems] = await pool.query(
      `SELECT id, title, description, category, horizon, priority, due_date, agent_tool, branch_type, repo_target, updated_at FROM om_daily_items WHERE status = 'in_progress'${repoFilter} ORDER BY FIELD(priority,'critical','high','medium','low'), updated_at DESC LIMIT 20`,
      repoParam
    );

    // Items due soon (next 7 days)
    const [dueSoon] = await pool.query(
      `SELECT id, title, status, priority, due_date, horizon, category, repo_target FROM om_daily_items WHERE due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('done','cancelled')${repoFilter} ORDER BY due_date ASC LIMIT 15`,
      repoParam
    );

    // Completion velocity — done items per day over last 14 days
    const [velocity] = await pool.query(
      `SELECT DATE(completed_at) as date, COUNT(*) as count FROM om_daily_items WHERE status = 'done' AND completed_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)${repoFilter} GROUP BY DATE(completed_at) ORDER BY date ASC`,
      repoParam
    );

    // Items created per day over last 14 days
    const [created] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM om_daily_items WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)${repoFilter} GROUP BY DATE(created_at) ORDER BY date ASC`,
      repoParam
    );

    // Phase groups — items sharing the same source metadata
    const [phaseGroups] = await pool.query(
      `SELECT source, category, COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count, SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_count, GROUP_CONCAT(CONCAT(id, ':', title, ':', status, ':', priority) ORDER BY FIELD(status,'in_progress','self_review','review','staging','backlog','done','blocked'), FIELD(priority,'critical','high','medium','low') SEPARATOR '||') as items_summary FROM om_daily_items WHERE source IS NOT NULL AND source != 'human' AND status != 'cancelled'${repoFilter} GROUP BY source, category HAVING total > 1 AND SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) > 0 ORDER BY active_count DESC, total DESC`,
      repoParam
    );

    // Repo distribution (always unfiltered — for the repo tabs)
    const [repoDist] = await pool.query(
      `SELECT COALESCE(repo_target, 'orthodoxmetrics') as repo_target, COUNT(*) as count, SUM(CASE WHEN status NOT IN ('done','cancelled') THEN 1 ELSE 0 END) as active_count FROM om_daily_items WHERE status != 'cancelled' GROUP BY repo_target`
    );

    res.json({
      statusDistribution: statusDist,
      priorityDistribution: priorityDist,
      categoryBreakdown: categoryDist,
      recentCompleted,
      inProgressItems,
      dueSoon,
      velocity,
      created,
      phaseGroups,
      repoDistribution: repoDist,
    });
  } catch (err) {
    console.error('OM Daily extended dashboard error:', err);
    res.status(500).json({ error: 'Failed to load extended dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SYNC COMMITS → 24-hour items  (auto-import today's git commits)
// ═══════════════════════════════════════════════════════════════

router.post('/sync-commits', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];

    // Get commits for the day
    let logOutput = '';
    try {
      logOutput = execSync(
        `git log --since="${dateStr} 00:00:00" --until="${dateStr} 23:59:59" --pretty=format:"%H|%an|%s|%aI" --no-merges`,
        { cwd: REPO_DIR, encoding: 'utf-8' }
      ).trim();
    } catch { logOutput = ''; }

    if (!logOutput) return res.json({ synced: 0, total: 0 });

    const lines = logOutput.split('\n').filter(Boolean);
    let synced = 0;

    for (const line of lines) {
      const [hash, author, message] = line.split('|');
      if (!hash || !message) continue;
      const shortHash = hash.substring(0, 8);

      // Skip if we already have an item for this commit
      const [existing] = await pool.query(
        `SELECT id FROM om_daily_items WHERE JSON_EXTRACT(metadata, '$.commitHash') = ?`,
        [shortHash]
      );
      if (existing.length > 0) continue;

      // Create a 24-hour item from the commit
      await pool.query(
        `INSERT INTO om_daily_items (title, description, horizon, status, priority, category, source, metadata, created_by)
         VALUES (?, ?, '1', 'done', 'medium', 'Commits', 'system', ?, NULL)`,
        [
          message.length > 200 ? message.substring(0, 200) + '...' : message,
          `Git commit ${shortHash} by ${author}`,
          JSON.stringify({ commitHash: shortHash, author, date: dateStr }),
        ]
      );
      synced++;
    }

    res.json({ synced, total: lines.length });
  } catch (err) {
    console.error('[OM Daily] sync-commits error:', err);
    res.status(500).json({ error: 'Failed to sync commits' });
  }
});

// ═══════════════════════════════════════════════════════════════
// LIST — get items, filtered by horizon, status, date, task_type, etc.
// ═══════════════════════════════════════════════════════════════

router.get('/items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { horizon, status, priority, category, search, sort = 'priority', direction = 'asc', date, task_type, due } = req.query;

    const conditions = [];
    const params = [];

    if (horizon) { conditions.push('horizon = ?'); params.push(horizon); }
    if (status && status !== 'all') { conditions.push('status = ?'); params.push(status); }
    if (priority) { conditions.push('priority = ?'); params.push(priority); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (task_type) { conditions.push('task_type = ?'); params.push(task_type); }
    if (date) { conditions.push('DATE(created_at) = ?'); params.push(date); }
    if (search) {
      // Sophisticated search: supports #ID, CS-XXXX, field:value, -exclude, and free text
      const tokens = search.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      for (const raw of tokens) {
        const token = raw.replace(/^"|"$/g, '');
        // #ID or bare number → exact item ID
        if (/^#?\d+$/.test(token)) {
          conditions.push('id = ?');
          params.push(parseInt(token.replace('#', ''), 10));
        }
        // CS-XXXX → search by change set code (handled in post-query enrichment)
        else if (/^CS-\d+$/i.test(token)) {
          // Will be filtered client-side via enrichment; add a loose title match as fallback
          conditions.push('(title LIKE ? OR description LIKE ?)');
          params.push(`%${token}%`, `%${token}%`);
        }
        // field:value filters
        else if (/^(status|priority|category|horizon|source|type):(.+)$/i.test(token)) {
          const m = token.match(/^(status|priority|category|horizon|source|type):(.+)$/i);
          const field = m[1].toLowerCase();
          const val = m[2];
          if (field === 'type') { conditions.push('task_type = ?'); params.push(val); }
          else if (field === 'status') { conditions.push('status = ?'); params.push(val); }
          else if (field === 'priority') { conditions.push('priority = ?'); params.push(val); }
          else if (field === 'category') { conditions.push('LOWER(category) = LOWER(?)'); params.push(val); }
          else if (field === 'horizon') { conditions.push('horizon = ?'); params.push(val); }
          else if (field === 'source') { conditions.push('source = ?'); params.push(val); }
        }
        // -term → exclude from title/description
        else if (token.startsWith('-') && token.length > 1) {
          const exclude = token.substring(1);
          conditions.push('(title NOT LIKE ? AND (description IS NULL OR description NOT LIKE ?))');
          params.push(`%${exclude}%`, `%${exclude}%`);
        }
        // Free text → title OR description match
        else {
          conditions.push('(title LIKE ? OR description LIKE ?)');
          params.push(`%${token}%`, `%${token}%`);
        }
      }
    }
    if (due === 'overdue') { conditions.push("due_date < CURDATE() AND status NOT IN ('done','cancelled')"); }
    if (due === 'today') { conditions.push("due_date = CURDATE() AND status NOT IN ('done','cancelled')"); }
    if (due === 'soon') { conditions.push("due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('done','cancelled')"); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = {
      priority: `FIELD(priority,'critical','high','medium','low') ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      status: `FIELD(status,'in_progress','self_review','review','staging','backlog','done','blocked','cancelled') ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      due_date: `due_date ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      created_at: `created_at ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      title: `title ${direction === 'desc' ? 'DESC' : 'ASC'}`,
    };
    const orderBy = allowedSorts[sort] || allowedSorts.priority;

    const [rows] = await pool.query(
      `SELECT * FROM om_daily_items ${whereClause} ORDER BY FIELD(status,'in_progress','self_review','review','staging','backlog','done','blocked','cancelled'), ${orderBy}, created_at DESC`,
      params
    );

    // Enrich with change_set membership (computed, not denormalized)
    let enrichedRows = rows;
    try {
      if (rows.length > 0) {
        const changeSetService = require('../services/changeSetService');
        const itemIds = rows.map(r => r.id);
        const memberships = await changeSetService.getChangeSetMemberships(itemIds);
        enrichedRows = rows.map(r => ({
          ...r,
          change_set: memberships[r.id] || null,
        }));
      }
    } catch (csErr) {
      // Non-fatal: if change_set service fails, items still return without membership
      console.warn('Change set membership enrichment failed:', csErr.message);
    }

    res.json({ items: enrichedRows, total: enrichedRows.length });
  } catch (err) {
    console.error('OM Daily list error:', err);
    res.status(500).json({ error: 'Failed to load items' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATE — add a new pipeline item
// ═══════════════════════════════════════════════════════════════

router.post('/items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { title, description, horizon = '7', status = 'backlog', priority = 'medium', category, due_date, tags, task_type, source, metadata, agent_tool, branch_type, conversation_ref, repo_target, milestone_id } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });

    const [result] = await pool.query(
      `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, due_date, tags, source, agent_tool, branch_type, conversation_ref, metadata, repo_target, milestone_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        task_type || 'chore',
        description || null,
        horizon,
        status,
        priority,
        category || null,
        due_date || null,
        tags ? JSON.stringify(tags) : null,
        source || 'human',
        agent_tool || null,
        branch_type || null,
        conversation_ref || null,
        metadata ? JSON.stringify(metadata) : null,
        repo_target || 'orthodoxmetrics',
        milestone_id || null,
        req.session?.user?.id || req.user?.id || null,
      ]
    );

    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [result.insertId]);
    const createdItem = item[0];

    // Auto-sync to GitHub and create branch when agent_tool + branch_type are set
    let syncResult = null;
    if (createdItem.agent_tool && createdItem.branch_type) {
      try {
        syncResult = await syncItemToGitHub(createdItem);
      } catch (syncErr) {
        console.error('[Auto-sync] Failed on create:', syncErr.message);
      }
    }

    // Re-read to get updated github fields
    const [final] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [result.insertId]);
    res.status(201).json({ item: final[0], sync: syncResult });
  } catch (err) {
    console.error('OM Daily create error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UPDATE — modify an existing item
// ═══════════════════════════════════════════════════════════════

router.put('/items/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { title, description, horizon, status, priority, category, due_date, tags, progress, task_type, source, metadata, agent_tool, branch_type, conversation_ref } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (horizon !== undefined) { updates.push('horizon = ?'); params.push(horizon); }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'done') { updates.push('completed_at = NOW()'); updates.push('progress = 100'); }
      if (status !== 'done') { updates.push('completed_at = NULL'); }
    }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category || null); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date || null); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (progress !== undefined) { updates.push('progress = ?'); params.push(Math.min(100, Math.max(0, parseInt(progress) || 0))); }
    if (task_type !== undefined) { updates.push('task_type = ?'); params.push(task_type); }
    if (source !== undefined) { updates.push('source = ?'); params.push(source); }
    if (agent_tool !== undefined) { updates.push('agent_tool = ?'); params.push(agent_tool || null); }
    if (branch_type !== undefined) { updates.push('branch_type = ?'); params.push(branch_type || null); }
    if (conversation_ref !== undefined) { updates.push('conversation_ref = ?'); params.push(conversation_ref || null); }
    if (metadata !== undefined) { updates.push('metadata = ?'); params.push(JSON.stringify(metadata)); }
    if (req.body.milestone_id !== undefined) { updates.push('milestone_id = ?'); params.push(req.body.milestone_id || null); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE om_daily_items SET ${updates.join(', ')} WHERE id = ?`, params);

    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
    if (!item.length) return res.status(404).json({ error: 'Item not found' });

    const updatedItem = item[0];
    // Auto-create branch if agent_tool + branch_type are now set but no branch exists yet
    let syncResult = null;
    if (updatedItem.agent_tool && updatedItem.branch_type && !updatedItem.github_branch) {
      try {
        if (!updatedItem.github_issue_number) {
          syncResult = await syncItemToGitHub(updatedItem);
        } else {
          const branchName = await createTaskBranch(updatedItem);
          if (branchName) {
            syncResult = { action: 'branch_created', branch: branchName };
            // Update issue body with branch info
            const [refreshed] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
            if (refreshed.length) {
              const updatedBody = buildIssueBody(refreshed[0]);
              try {
                execSync(
                  `gh issue edit ${updatedItem.github_issue_number} --repo ${GITHUB_REPO} --body "${updatedBody.replace(/"/g, '\\"')}"`,
                  { encoding: 'utf-8', cwd: REPO_DIR }
                );
              } catch { /* non-critical */ }
            }
          }
        }
      } catch (syncErr) {
        console.error('[Auto-sync] Failed on update:', syncErr.message);
      }
    }

    const [final] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
    res.json({ item: final[0], sync: syncResult });
  } catch (err) {
    console.error('OM Daily update error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE — remove an item
// ═══════════════════════════════════════════════════════════════

router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const [existing] = await getPool().query('SELECT id FROM om_daily_items WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Item not found' });

    await getPool().query('DELETE FROM om_daily_items WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('OM Daily delete error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES — distinct categories for filtering
// ═══════════════════════════════════════════════════════════════

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT DISTINCT category FROM om_daily_items WHERE category IS NOT NULL AND category != '' ORDER BY category`
    );
    res.json({ categories: rows.map(r => r.category) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DATES — list dates that have items (for Daily Tasks history)
// ═══════════════════════════════════════════════════════════════

router.get('/dates', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM om_daily_items
       GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 90`
    );
    res.json({ dates: rows });
  } catch (err) {
    console.error('OM Daily dates error:', err);
    res.status(500).json({ error: 'Failed to load dates' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EMAIL — send daily task summary to tasks@orthodoxmetrics.com
// ═══════════════════════════════════════════════════════════════

router.post('/email', requireAuth, async (req, res) => {
  try {
    const { category, importance, created_at, date, markdown } = req.body;

    if (!markdown || typeof markdown !== 'string' || !markdown.trim()) {
      return res.status(400).json({ error: 'markdown is required' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }

    const safeCategory = category || 'daily';
    const safeImportance = importance || 'normal';
    const dateCreated = created_at
      ? new Date(created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const subject = `TASK ${safeCategory}-${dateCreated}-${safeImportance}`;

    // Lazy-load nodemailer and email config
    const nodemailer = require('nodemailer');
    let getActiveEmailConfig;
    try { getActiveEmailConfig = require('../api/settings').getActiveEmailConfig; } catch { getActiveEmailConfig = null; }

    let transporterConfig;
    if (getActiveEmailConfig) {
      try {
        const dbConfig = await getActiveEmailConfig();
        if (dbConfig) {
          transporterConfig = {
            host: dbConfig.smtp_host,
            port: dbConfig.smtp_port,
            secure: dbConfig.smtp_secure,
          };
          if (dbConfig.smtp_user && dbConfig.smtp_pass && dbConfig.smtp_pass.trim() !== '') {
            transporterConfig.auth = { user: dbConfig.smtp_user, pass: dbConfig.smtp_pass };
          }
        }
      } catch (cfgErr) {
        console.warn('[OM Daily] Could not load DB email config:', cfgErr.message);
      }
    }

    if (!transporterConfig) {
      transporterConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    let senderName = 'Orthodox Metrics Tasks';
    let senderEmail = transporterConfig.auth?.user || process.env.SMTP_USER || process.env.EMAIL_USER;
    if (getActiveEmailConfig) {
      try {
        const dbConfig = await getActiveEmailConfig();
        if (dbConfig) {
          senderName = dbConfig.sender_name || senderName;
          senderEmail = dbConfig.sender_email || senderEmail;
        }
      } catch (_) { /* use defaults */ }
    }

    const filename = `DAILY_TASKS_${date}.md`;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'tasks@orthodoxmetrics.com',
      subject,
      text: markdown,
      attachments: [{ filename, content: Buffer.from(markdown, 'utf-8'), contentType: 'text/markdown' }],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[OM Daily] Email sent | subject=${subject} | messageId=${info.messageId}`);
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('[OM Daily] POST /email error:', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CHANGELOG — git-based daily commit tracking matched to pipeline items
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');

const REPO_DIR = '/var/www/orthodoxmetrics/prod';

/**
 * Generate a changelog for a given date by reading git commits
 * and matching them to active pipeline items.
 */
async function generateChangelog(dateStr) {
  const pool = getPool();

  // Get commits for the day
  const gitLogCmd = `git log --since="${dateStr} 00:00:00" --until="${dateStr} 23:59:59" --pretty=format:"%H|%an|%s|%aI" --no-merges`;
  let logOutput = '';
  try {
    logOutput = execSync(gitLogCmd, { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
  } catch {
    logOutput = '';
  }

  if (!logOutput) {
    // No commits — upsert empty entry
    await pool.query(
      `INSERT INTO om_daily_changelog (date, commits, files_changed, summary, status_breakdown, matched_items)
       VALUES (?, '[]', '{}', ?, '{}', '[]')
       ON DUPLICATE KEY UPDATE commits = '[]', files_changed = '{}', summary = VALUES(summary), status_breakdown = '{}', matched_items = '[]'`,
      [dateStr, `No commits on ${dateStr}.`]
    );
    const [row] = await pool.query('SELECT * FROM om_daily_changelog WHERE date = ?', [dateStr]);
    return row[0] || null;
  }

  const lines = logOutput.split('\n').filter(Boolean);
  const commits = [];
  const allFiles = { added: 0, modified: 0, deleted: 0, list: [] };

  for (const line of lines) {
    const [hash, author, message, timestamp] = line.split('|');
    if (!hash) continue;

    // Get files changed in this commit
    let diffOutput = '';
    try {
      diffOutput = execSync(`git diff-tree --no-commit-id --name-status -r ${hash}`, { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
    } catch { diffOutput = ''; }

    const files = [];
    for (const fLine of diffOutput.split('\n').filter(Boolean)) {
      const [status, ...pathParts] = fLine.split('\t');
      const filePath = pathParts.join('\t');
      if (!filePath) continue;
      const fileStatus = status.startsWith('A') ? 'added' : status.startsWith('D') ? 'deleted' : 'modified';
      files.push({ status: fileStatus, path: filePath });
      allFiles[fileStatus] = (allFiles[fileStatus] || 0) + 1;
      allFiles.list.push({ status: fileStatus, path: filePath, commit: hash.substring(0, 7) });
    }

    commits.push({ hash: hash.substring(0, 7), fullHash: hash, author, message, timestamp, files });
  }

  // Fetch active pipeline items (updated in last 7 days, not cancelled)
  const [activeItems] = await pool.query(
    `SELECT id, title, status, priority, horizon FROM om_daily_items
     WHERE status != 'cancelled' AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY FIELD(priority,'critical','high','medium','low')`
  );

  // Match commits to items by case-insensitive substring (4+ char words from title)
  const matchedItems = [];
  for (const commit of commits) {
    const msgLower = commit.message.toLowerCase();
    let matched = false;
    for (const item of activeItems) {
      const titleWords = item.title.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
      const hasMatch = titleWords.some(word => msgLower.includes(word));
      if (hasMatch) {
        commit.matchedItem = { id: item.id, title: item.title, status: item.status };
        if (!matchedItems.find(m => m.id === item.id)) {
          matchedItems.push({ id: item.id, title: item.title, status: item.status });
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      commit.matchedItem = null;
    }
  }

  // Build status breakdown
  const statusBreakdown = {};
  for (const commit of commits) {
    const st = commit.matchedItem ? commit.matchedItem.status : 'complete';
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
  }

  // Build summary
  const matchCount = commits.filter(c => c.matchedItem).length;
  const summary = `${commits.length} commit(s) on ${dateStr}. ${allFiles.added + allFiles.modified + allFiles.deleted} file(s) changed (${allFiles.added} added, ${allFiles.modified} modified, ${allFiles.deleted} deleted). ${matchCount}/${commits.length} matched to pipeline items.`;

  // Upsert
  await pool.query(
    `INSERT INTO om_daily_changelog (date, commits, files_changed, summary, status_breakdown, matched_items)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE commits = VALUES(commits), files_changed = VALUES(files_changed), summary = VALUES(summary), status_breakdown = VALUES(status_breakdown), matched_items = VALUES(matched_items)`,
    [dateStr, JSON.stringify(commits), JSON.stringify(allFiles), summary, JSON.stringify(statusBreakdown), JSON.stringify(matchedItems)]
  );

  const [row] = await pool.query('SELECT * FROM om_daily_changelog WHERE date = ?', [dateStr]);
  return row[0] || null;
}

/**
 * Build branded HTML email for a changelog entry
 */
function buildChangelogEmailHtml(entry, pipelineItems, changeSets = [], unassignedItems = []) {
  const commits = typeof entry.commits === 'string' ? JSON.parse(entry.commits) : entry.commits;
  const filesChanged = typeof entry.files_changed === 'string' ? JSON.parse(entry.files_changed) : (entry.files_changed || {});
  const matchedItems = typeof entry.matched_items === 'string' ? JSON.parse(entry.matched_items) : (entry.matched_items || []);
  const matchCount = commits.filter(c => c.matchedItem).length;
  const matchRate = commits.length > 0 ? Math.round((matchCount / commits.length) * 100) : 0;

  const statusColor = (status) => {
    const colors = { backlog: '#9e9e9e', in_progress: '#ffa726', self_review: '#ab47bc', review: '#26c6da', staging: '#66bb6a', done: '#4caf50', blocked: '#ef5350', cancelled: '#bdbdbd', complete: '#4caf50' };
    return colors[status] || '#9e9e9e';
  };

  const commitRows = commits.map(c => {
    const st = c.matchedItem ? c.matchedItem.status : 'complete';
    const stLabel = c.matchedItem ? c.matchedItem.status : 'unmatched';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#8c249d;">${c.hash}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${c.message}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#666;">${(c.files || []).length}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;"><span style="background:${statusColor(st)};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${stLabel}</span></td>
    </tr>`;
  }).join('');

  // ── Change Sets section ──
  const csStatusColor = (status) => {
    const colors = { in_review: '#9c27b0', staged: '#2196f3', ready_for_staging: '#009688', active: '#ff9800', draft: '#9e9e9e' };
    return colors[status] || '#9e9e9e';
  };
  const csStatusLabel = (status) => status.replace(/_/g, ' ');

  const changeSetSection = changeSets.length > 0 ? `
    <h3 style="color:#8c249d;margin-top:24px;">Change Sets</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f5f5f5;">
        <th style="text-align:left;padding:8px;font-size:12px;">Code</th>
        <th style="text-align:left;padding:8px;font-size:12px;">Title</th>
        <th style="text-align:left;padding:8px;font-size:12px;">Status</th>
        <th style="text-align:left;padding:8px;font-size:12px;">Items</th>
        <th style="text-align:left;padding:8px;font-size:12px;">Branch</th>
      </tr>
      ${changeSets.map(cs => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#8c249d;">${cs.code}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${cs.title}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;"><span style="background:${csStatusColor(cs.status)};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${csStatusLabel(cs.status)}</span></td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${cs.item_count}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px;font-family:monospace;color:#666;">${cs.git_branch || '—'}</td>
      </tr>`).join('')}
    </table>` : '';

  const unassignedSection = unassignedItems.length > 0 ? `
    <h3 style="color:#ff9800;margin-top:24px;">Unassigned Pipeline Items</h3>
    <p style="font-size:12px;color:#666;margin:4px 0 8px;">These items are not assigned to any change set.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f5f5f5;"><th style="text-align:left;padding:8px;font-size:12px;">Item</th><th style="text-align:left;padding:8px;font-size:12px;">Status</th><th style="text-align:left;padding:8px;font-size:12px;">Priority</th></tr>
      ${unassignedItems.map(i => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${i.title}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;"><span style="background:${statusColor(i.status)};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${i.status}</span></td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">${i.priority || ''}</td>
      </tr>`).join('')}
    </table>` : '';

  const activeItems = (pipelineItems || []).filter(i => i.status === 'in_progress' || i.status === 'review');
  const pipelineSection = activeItems.length > 0 ? `
    <h3 style="color:#8c249d;margin-top:24px;">All Active Pipeline Items</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f5f5f5;"><th style="text-align:left;padding:8px;font-size:12px;">Item</th><th style="text-align:left;padding:8px;font-size:12px;">Status</th><th style="text-align:left;padding:8px;font-size:12px;">Priority</th></tr>
      ${activeItems.map(i => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${i.title}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;"><span style="background:${statusColor(i.status)};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${i.status}</span></td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">${i.priority || ''}</td>
      </tr>`).join('')}
    </table>` : '';

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9f9f9;">
    <div style="max-width:640px;margin:0 auto;background:#fff;">
      <div style="background:#8c249d;padding:20px 24px;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">OrthodoxMetrics Daily Changelog</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">${entry.date}</p>
      </div>
      <div style="padding:24px;">
        <div style="display:flex;gap:16px;margin-bottom:20px;">
          <div style="flex:1;background:#f5f0f7;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#8c249d;">${commits.length}</div>
            <div style="font-size:12px;color:#666;">Commits</div>
          </div>
          <div style="flex:1;background:#f0f5f0;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#4caf50;">${(filesChanged.added || 0) + (filesChanged.modified || 0) + (filesChanged.deleted || 0)}</div>
            <div style="font-size:12px;color:#666;">Files Changed</div>
          </div>
          <div style="flex:1;background:#f5f5f0;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#ff9800;">${matchRate}%</div>
            <div style="font-size:12px;color:#666;">Match Rate</div>
          </div>
        </div>
        <h3 style="color:#8c249d;margin-bottom:8px;">Commits</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background:#f5f5f5;"><th style="text-align:left;padding:8px;font-size:12px;">Hash</th><th style="text-align:left;padding:8px;font-size:12px;">Message</th><th style="text-align:left;padding:8px;font-size:12px;">Files</th><th style="text-align:left;padding:8px;font-size:12px;">Status</th></tr>
          ${commitRows}
        </table>
        ${changeSetSection}
        ${unassignedSection}
        ${pipelineSection}
      </div>
      <div style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#999;">OrthodoxMetrics &mdash; Daily Changelog</div>
    </div>
  </body></html>`;
}

/**
 * Generate today's changelog and email it (called by cron at 11 PM)
 */
async function generateAndEmailChangelog() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[Changelog] Generating for ${today}...`);

  const entry = await generateChangelog(today);
  if (!entry) {
    console.log('[Changelog] No entry generated');
    return;
  }

  const pool = getPool();

  // Get active pipeline items for the email
  const [pipelineItems] = await pool.query(
    `SELECT id, title, status, priority, horizon FROM om_daily_items
     WHERE status NOT IN ('done','cancelled') ORDER BY FIELD(priority,'critical','high','medium','low')`
  );

  // Get active change sets
  const [changeSets] = await pool.query(`
    SELECT cs.id, cs.code, cs.title, cs.status, cs.priority, cs.git_branch, cs.change_type,
           (SELECT COUNT(*) FROM change_set_items WHERE change_set_id = cs.id) AS item_count
    FROM change_sets cs
    WHERE cs.status NOT IN ('promoted', 'rejected', 'rolled_back')
    ORDER BY FIELD(cs.status, 'in_review','staged','ready_for_staging','active','draft'),
             cs.updated_at DESC
  `);

  // Find unassigned pipeline items
  const assignedItemIds = new Set();
  if (changeSets.length) {
    const csIds = changeSets.map(cs => cs.id);
    const [assigned] = await pool.query(
      `SELECT DISTINCT om_daily_item_id FROM change_set_items WHERE change_set_id IN (${csIds.map(() => '?').join(',')})`,
      csIds
    );
    assigned.forEach(r => assignedItemIds.add(r.om_daily_item_id));
  }
  const unassignedItems = pipelineItems.filter(i => !assignedItemIds.has(i.id));

  const html = buildChangelogEmailHtml(entry, pipelineItems, changeSets, unassignedItems);
  const plainText = entry.summary || `Changelog for ${today}`;

  // Send email
  const nodemailer = require('nodemailer');
  let getActiveEmailConfig;
  try { getActiveEmailConfig = require('../api/settings').getActiveEmailConfig; } catch { getActiveEmailConfig = null; }

  let transporterConfig;
  if (getActiveEmailConfig) {
    try {
      const dbConfig = await getActiveEmailConfig();
      if (dbConfig) {
        transporterConfig = {
          host: dbConfig.smtp_host,
          port: dbConfig.smtp_port,
          secure: dbConfig.smtp_secure,
        };
        if (dbConfig.smtp_user && dbConfig.smtp_pass && dbConfig.smtp_pass.trim() !== '') {
          transporterConfig.auth = { user: dbConfig.smtp_user, pass: dbConfig.smtp_pass };
        }
      }
    } catch (cfgErr) {
      console.warn('[Changelog] Could not load DB email config:', cfgErr.message);
    }
  }

  if (!transporterConfig) {
    transporterConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    };
  }

  const transporter = nodemailer.createTransport(transporterConfig);

  let senderName = 'OrthodoxMetrics Changelog';
  let senderEmail = transporterConfig.auth?.user || process.env.SMTP_USER || process.env.EMAIL_USER;
  if (getActiveEmailConfig) {
    try {
      const dbConfig = await getActiveEmailConfig();
      if (dbConfig) {
        senderName = dbConfig.sender_name || senderName;
        senderEmail = dbConfig.sender_email || senderEmail;
      }
    } catch (_) { /* use defaults */ }
  }

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: 'info@orthodoxmetrics.com',
    subject: `Daily Changelog — ${today}`,
    text: plainText,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Changelog] Email sent | messageId=${info.messageId}`);

  // Update email_sent_at
  await pool.query('UPDATE om_daily_changelog SET email_sent_at = NOW() WHERE date = ?', [today]);
}

// ── Changelog Routes ──────────────────────────────────────────

// List changelog entries
router.get('/changelog', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { start, end, limit = '30' } = req.query;
    const conditions = [];
    const params = [];

    if (start) { conditions.push('date >= ?'); params.push(start); }
    if (end) { conditions.push('date <= ?'); params.push(end); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(
      `SELECT * FROM om_daily_changelog ${whereClause} ORDER BY date DESC LIMIT ?`,
      params
    );
    res.json({ entries: rows });
  } catch (err) {
    console.error('[Changelog] GET /changelog error:', err);
    res.status(500).json({ error: 'Failed to load changelog' });
  }
});

// Get single day's changelog
router.get('/changelog/:date', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM om_daily_changelog WHERE date = ?', [req.params.date]);
    if (!rows.length) return res.status(404).json({ error: 'No changelog for this date' });
    res.json({ entry: rows[0] });
  } catch (err) {
    console.error('[Changelog] GET /changelog/:date error:', err);
    res.status(500).json({ error: 'Failed to load changelog entry' });
  }
});

// Manual generate
router.post('/changelog/generate', requireAuth, async (req, res) => {
  try {
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    const entry = await generateChangelog(dateStr);
    res.json({ entry });
  } catch (err) {
    console.error('[Changelog] POST /changelog/generate error:', err);
    res.status(500).json({ error: 'Failed to generate changelog' });
  }
});

// Manual email send
router.post('/changelog/email/:date', requireAuth, async (req, res) => {
  try {
    const dateStr = req.params.date;
    const pool = getPool();

    const [rows] = await pool.query('SELECT * FROM om_daily_changelog WHERE date = ?', [dateStr]);
    if (!rows.length) return res.status(404).json({ error: 'No changelog for this date. Generate first.' });

    const entry = rows[0];

    // Get active pipeline items for email
    const [pipelineItems] = await pool.query(
      `SELECT id, title, status, priority, horizon FROM om_daily_items
       WHERE status NOT IN ('done','cancelled') ORDER BY FIELD(priority,'critical','high','medium','low')`
    );

    // Get active change sets
    const [changeSets] = await pool.query(`
      SELECT cs.id, cs.code, cs.title, cs.status, cs.priority, cs.git_branch, cs.change_type,
             (SELECT COUNT(*) FROM change_set_items WHERE change_set_id = cs.id) AS item_count
      FROM change_sets cs
      WHERE cs.status NOT IN ('promoted', 'rejected', 'rolled_back')
      ORDER BY FIELD(cs.status, 'in_review','staged','ready_for_staging','active','draft'),
               cs.updated_at DESC
    `);

    // Find unassigned pipeline items
    const assignedItemIds = new Set();
    if (changeSets.length) {
      const csIds = changeSets.map(cs => cs.id);
      const [assigned] = await pool.query(
        `SELECT DISTINCT om_daily_item_id FROM change_set_items WHERE change_set_id IN (${csIds.map(() => '?').join(',')})`,
        csIds
      );
      assigned.forEach(r => assignedItemIds.add(r.om_daily_item_id));
    }
    const unassignedItems = pipelineItems.filter(i => !assignedItemIds.has(i.id));

    const html = buildChangelogEmailHtml(entry, pipelineItems, changeSets, unassignedItems);
    const plainText = entry.summary || `Changelog for ${dateStr}`;

    const nodemailer = require('nodemailer');
    let getActiveEmailConfig;
    try { getActiveEmailConfig = require('../api/settings').getActiveEmailConfig; } catch { getActiveEmailConfig = null; }

    let transporterConfig;
    if (getActiveEmailConfig) {
      try {
        const dbConfig = await getActiveEmailConfig();
        if (dbConfig) {
          transporterConfig = {
            host: dbConfig.smtp_host,
            port: dbConfig.smtp_port,
            secure: dbConfig.smtp_secure,
          };
          if (dbConfig.smtp_user && dbConfig.smtp_pass && dbConfig.smtp_pass.trim() !== '') {
            transporterConfig.auth = { user: dbConfig.smtp_user, pass: dbConfig.smtp_pass };
          }
        }
      } catch (cfgErr) {
        console.warn('[Changelog] Could not load DB email config:', cfgErr.message);
      }
    }

    if (!transporterConfig) {
      transporterConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    let senderName = 'OrthodoxMetrics Changelog';
    let senderEmail = transporterConfig.auth?.user || process.env.SMTP_USER || process.env.EMAIL_USER;
    if (getActiveEmailConfig) {
      try {
        const dbConfig = await getActiveEmailConfig();
        if (dbConfig) {
          senderName = dbConfig.sender_name || senderName;
          senderEmail = dbConfig.sender_email || senderEmail;
        }
      } catch (_) { /* use defaults */ }
    }

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'info@orthodoxmetrics.com',
      subject: `Daily Changelog — ${dateStr}`,
      text: plainText,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    await pool.query('UPDATE om_daily_changelog SET email_sent_at = NOW() WHERE date = ?', [dateStr]);

    console.log(`[Changelog] Manual email sent for ${dateStr} | messageId=${info.messageId}`);
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('[Changelog] POST /changelog/email error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GITHUB ISSUE SYNC — bi-directional sync with GitHub Issues
// ═══════════════════════════════════════════════════════════════

const GITHUB_REPO = 'nexty1982/prod-current';

const PRIORITY_LABELS = { critical: 'P:critical', high: 'P:high', medium: 'P:medium', low: 'P:low' };
const HORIZON_LABELS_GH = { '1': 'H:24hr', '2': 'H:48hr', '7': 'H:7day', '14': 'H:14day', '30': 'H:30day', '60': 'H:60day', '90': 'H:90day' };
const SOURCE_LABELS = { agent: 'source:agent', human: 'source:human' };
const STATUS_LABELS_GH = { in_progress: 'status:in_progress', self_review: 'status:self_review', review: 'status:review', staging: 'status:staging', backlog: 'status:backlog', done: 'status:done', blocked: 'status:blocked' };
const BRANCH_TYPE_LABELS = { feature: 'type:feature', enhancement: 'type:enhancement', bugfix: 'type:bugfix', refactor: 'type:refactor', migration: 'type:migration', chore: 'type:chore', spike: 'type:spike', docs: 'type:docs' };
// Authoritative branch prefix mapping — long-form only.
// All branch_type values map to one of three standard prefixes.
const BRANCH_TYPE_PREFIXES = { feature: 'feature', enhancement: 'feature', bugfix: 'fix', refactor: 'chore', migration: 'chore', chore: 'chore', spike: 'feature', docs: 'chore' };
const AGENT_TOOL_SHORT = { windsurf: 'windsurf', claude_cli: 'claude-cli', cursor: 'cursor', github_copilot: 'gh-copilot' };

// Cache of labels known to exist in the repo (populated lazily)
let _knownLabels = null;
let _knownLabelsAt = 0;

async function getKnownLabels() {
  // Refresh every 5 minutes
  if (_knownLabels && Date.now() - _knownLabelsAt < 300000) return _knownLabels;
  try {
    const json = execSync(
      `gh api repos/${GITHUB_REPO}/labels --paginate --jq '.[].name'`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    );
    _knownLabels = new Set(json.trim().split('\n').filter(Boolean));
    _knownLabelsAt = Date.now();
  } catch {
    _knownLabels = _knownLabels || new Set();
  }
  return _knownLabels;
}

async function ensureLabel(name, color = 'ededed') {
  const known = await getKnownLabels();
  if (known.has(name)) return;
  try {
    execSync(
      `gh api repos/${GITHUB_REPO}/labels -f name="${name}" -f color="${color}" -f description=""`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    );
    known.add(name);
    console.log(`[GitHub Sync] Created label: ${name}`);
  } catch (err) {
    // Label might already exist (race condition) — that's fine
    if (!err.message.includes('already_exists')) {
      console.warn(`[GitHub Sync] Could not create label '${name}':`, err.message);
    } else {
      known.add(name);
    }
  }
}

const LABEL_COLORS = {
  'P:': 'e11d48', 'H:': '0ea5e9', 'source:': '8b5cf6',
  'status:': 'f59e0b', 'cat:': '6366f1', 'type:': '10b981',
};
function labelColor(name) {
  for (const [prefix, color] of Object.entries(LABEL_COLORS)) {
    if (name.startsWith(prefix)) return color;
  }
  return 'ededed';
}

function buildLabels(item) {
  const labels = [];
  if (PRIORITY_LABELS[item.priority]) labels.push(PRIORITY_LABELS[item.priority]);
  if (HORIZON_LABELS_GH[item.horizon]) labels.push(HORIZON_LABELS_GH[item.horizon]);
  if (SOURCE_LABELS[item.source]) labels.push(SOURCE_LABELS[item.source]);
  if (STATUS_LABELS_GH[item.status]) labels.push(STATUS_LABELS_GH[item.status]);
  if (item.category) labels.push(`cat:${item.category}`);
  if (BRANCH_TYPE_LABELS[item.branch_type]) labels.push(BRANCH_TYPE_LABELS[item.branch_type]);
  return labels;
}

function buildIssueBody(item) {
  const meta = parseMeta(item.metadata);
  let body = '';
  if (item.description) body += item.description + '\n\n';
  body += '---\n';
  body += `**OM Daily ID:** ${item.id}\n`;
  body += `**Status:** ${item.status}\n`;
  body += `**Priority:** ${item.priority}\n`;
  body += `**Horizon:** ${item.horizon} day\n`;
  if (item.category) body += `**Category:** ${item.category}\n`;
  if (item.source) body += `**Source:** ${item.source}\n`;
  if (meta.agent) body += `**Agent:** ${meta.agent}\n`;
  if (meta.commitHash) body += `**Commit:** ${meta.commitHash}\n`;
  if (item.agent_tool) body += `**Agent Tool:** ${item.agent_tool}\n`;
  if (item.branch_type) body += `**Branch Type:** ${item.branch_type}\n`;
  if (item.github_branch) body += `**Branch:** \`${item.github_branch}\`\n`;
  if (item.conversation_ref) body += `**Conversation:** ${item.conversation_ref}\n`;
  return body;
}

/**
 * Ensure the monthly dev branch exists: om-dev-MM-YYYY
 * Creates from main if it doesn't exist yet.
 * Returns the branch name.
 */
function ensureMonthlyBranch(date) {
  const d = date ? new Date(date) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const branchName = `om-dev-${mm}-${yyyy}`;

  try {
    // Check if branch exists on remote
    const check = execSync(
      `gh api repos/${GITHUB_REPO}/branches/${branchName} --jq '.name' 2>/dev/null`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    ).trim();
    if (check === branchName) {
      console.log(`[Branch] Monthly branch ${branchName} already exists`);
      return branchName;
    }
  } catch {
    // Branch doesn't exist, create it
  }

  try {
    // Get main branch SHA
    const mainSha = execSync(
      `gh api repos/${GITHUB_REPO}/git/ref/heads/main --jq '.object.sha'`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    ).trim();

    // Create the branch via API
    execSync(
      `gh api repos/${GITHUB_REPO}/git/refs -f ref="refs/heads/${branchName}" -f sha="${mainSha}"`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    );
    console.log(`[Branch] Created monthly branch ${branchName} from main (${mainSha.slice(0, 8)})`);
    return branchName;
  } catch (err) {
    console.error(`[Branch] Failed to create monthly branch ${branchName}:`, err.message);
    return null;
  }
}

/**
 * Create a task branch from main using authoritative naming convention.
 * Format: <type>/omd-<id>/<yyyy-mm-dd>/<slug>
 * Example: feature/omd-636/2026-03-31/migration-logic
 * Returns the branch name or null on failure.
 */
async function createTaskBranch(item) {
  if (!item.branch_type) return null;
  if (item.github_branch) return item.github_branch; // already created

  const prefix = BRANCH_TYPE_PREFIXES[item.branch_type];
  if (!prefix) return null;

  const slug = slugify(item.title);
  const today = new Date().toISOString().slice(0, 10);
  const taskBranch = `${prefix}/omd-${item.id}/${today}/${slug}`;

  try {
    // Check if task branch already exists on remote
    try {
      const check = execSync(
        `gh api repos/${GITHUB_REPO}/branches/${encodeURIComponent(taskBranch)} --jq '.name' 2>/dev/null`,
        { encoding: 'utf-8', cwd: REPO_DIR }
      ).trim();
      if (check) {
        console.log(`[Branch] Task branch ${taskBranch} already exists on remote`);
        const pool = getPool();
        await pool.query('UPDATE om_daily_items SET github_branch = ? WHERE id = ?', [taskBranch, item.id]);
        return taskBranch;
      }
    } catch {
      // Branch doesn't exist, proceed to create
    }

    // Get main branch SHA
    const mainSha = execSync(
      `gh api repos/${GITHUB_REPO}/git/ref/heads/main --jq '.object.sha'`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    ).trim();

    // Create task branch from main
    execSync(
      `gh api repos/${GITHUB_REPO}/git/refs -f ref="refs/heads/${taskBranch}" -f sha="${mainSha}"`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    );
    console.log(`[Branch] Created task branch ${taskBranch} from main (${mainSha.slice(0, 8)})`);

    // Save to DB
    const pool = getPool();
    await pool.query('UPDATE om_daily_items SET github_branch = ? WHERE id = ?', [taskBranch, item.id]);
    return taskBranch;
  } catch (err) {
    console.error(`[Branch] Failed to create task branch ${taskBranch}:`, err.message);
    return null;
  }
}

/**
 * Sync a single OM Daily item → GitHub Issue
 */
async function syncItemToGitHub(item) {
  const pool = getPool();

  if (!item.github_issue_number) {
    // Create new issue
    const labels = buildLabels(item);
    const body = buildIssueBody(item);

    // Ensure all labels exist in the repo before using them
    for (const label of labels) {
      await ensureLabel(label, labelColor(label));
    }

    const labelArg = labels.length > 0 ? `--label "${labels.join(',')}"` : '';

    try {
      const title = item.title.replace(/"/g, '\\"');
      const result = execSync(
        `gh issue create --repo ${GITHUB_REPO} --title "${title}" --body "${body.replace(/"/g, '\\"')}" ${labelArg}`,
        { encoding: 'utf-8', cwd: REPO_DIR }
      ).trim();

      // gh issue create returns the URL, extract issue number
      const issueNumMatch = result.match(/\/issues\/(\d+)/);
      if (issueNumMatch) {
        const issueNum = parseInt(issueNumMatch[1], 10);
        await pool.query(
          'UPDATE om_daily_items SET github_issue_number = ?, github_synced_at = NOW() WHERE id = ?',
          [issueNum, item.id]
        );
        console.log(`[GitHub Sync] Created issue #${issueNum} for item #${item.id}`);

        // Auto-create task branch if agent_tool and branch_type are set
        let branchName = null;
        if (item.agent_tool && item.branch_type && !item.github_branch) {
          item.github_issue_number = issueNum; // needed for unique branch naming
          branchName = await createTaskBranch(item);
          if (branchName) {
            // Re-read item to get updated github_branch, then update issue body with branch info
            const [updated] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [item.id]);
            if (updated.length) {
              const updatedBody = buildIssueBody(updated[0]);
              try {
                execSync(
                  `gh issue edit ${issueNum} --repo ${GITHUB_REPO} --body "${updatedBody.replace(/"/g, '\\"')}"`,
                  { encoding: 'utf-8', cwd: REPO_DIR }
                );
              } catch { /* non-critical */ }
            }
          }
        }

        return { action: 'created', issueNumber: issueNum, branch: branchName };
      }
    } catch (err) {
      console.error(`[GitHub Sync] Failed to create issue for item #${item.id}:`, err.message);
      return { action: 'error', error: err.message };
    }
  } else {
    // Update existing issue
    const issueNum = item.github_issue_number;
    try {
      // Close/reopen based on status
      if (item.status === 'done' || item.status === 'cancelled') {
        execSync(`gh issue close ${issueNum} --repo ${GITHUB_REPO}`, { encoding: 'utf-8', cwd: REPO_DIR });
      } else {
        // Try reopening (ignore error if already open)
        try {
          execSync(`gh issue reopen ${issueNum} --repo ${GITHUB_REPO}`, { encoding: 'utf-8', cwd: REPO_DIR });
        } catch { /* already open */ }
      }

      // Update labels
      const labels = buildLabels(item);
      if (labels.length > 0) {
        // Ensure all labels exist in the repo
        for (const label of labels) {
          await ensureLabel(label, labelColor(label));
        }

        // Remove old managed labels first, then add new ones
        const allManagedPrefixes = ['P:', 'H:', 'source:', 'status:', 'cat:'];
        try {
          const existingJson = execSync(
            `gh issue view ${issueNum} --repo ${GITHUB_REPO} --json labels`,
            { encoding: 'utf-8', cwd: REPO_DIR }
          );
          const existing = JSON.parse(existingJson);
          const toRemove = (existing.labels || [])
            .filter(l => allManagedPrefixes.some(p => l.name.startsWith(p)))
            .map(l => l.name);
          for (const label of toRemove) {
            try {
              execSync(`gh issue edit ${issueNum} --repo ${GITHUB_REPO} --remove-label "${label}"`, { encoding: 'utf-8', cwd: REPO_DIR });
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }

        execSync(
          `gh issue edit ${issueNum} --repo ${GITHUB_REPO} --add-label "${labels.join(',')}"`,
          { encoding: 'utf-8', cwd: REPO_DIR }
        );
      }

      await pool.query('UPDATE om_daily_items SET github_synced_at = NOW() WHERE id = ?', [item.id]);
      console.log(`[GitHub Sync] Updated issue #${issueNum} for item #${item.id}`);
      return { action: 'updated', issueNumber: issueNum };
    } catch (err) {
      console.error(`[GitHub Sync] Failed to update issue #${issueNum}:`, err.message);
      return { action: 'error', error: err.message };
    }
  }
  return { action: 'noop' };
}

/**
 * Pull GitHub state changes back to DB
 */
async function syncGitHubToItems() {
  const pool = getPool();
  let changes = 0;

  try {
    const issuesJson = execSync(
      `gh issue list --repo ${GITHUB_REPO} --state all --json number,title,state,labels,closedAt --limit 100`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    );
    const issues = JSON.parse(issuesJson);

    // Get all items with github_issue_number
    const [items] = await pool.query(
      'SELECT id, status, github_issue_number FROM om_daily_items WHERE github_issue_number IS NOT NULL'
    );
    const itemsByIssue = {};
    for (const item of items) {
      itemsByIssue[item.github_issue_number] = item;
    }

    for (const issue of issues) {
      const item = itemsByIssue[issue.number];
      if (!item) continue;

      if (issue.state === 'CLOSED' && item.status !== 'done' && item.status !== 'cancelled') {
        await pool.query(
          'UPDATE om_daily_items SET status = ?, completed_at = NOW(), github_synced_at = NOW() WHERE id = ?',
          ['done', item.id]
        );
        console.log(`[GitHub Sync] Issue #${issue.number} closed on GitHub → item #${item.id} marked done`);
        changes++;
      } else if (issue.state === 'OPEN' && (item.status === 'done' || item.status === 'cancelled')) {
        await pool.query(
          'UPDATE om_daily_items SET status = ?, completed_at = NULL, github_synced_at = NOW() WHERE id = ?',
          ['in_progress', item.id]
        );
        console.log(`[GitHub Sync] Issue #${issue.number} reopened on GitHub → item #${item.id} marked in_progress`);
        changes++;
      }
    }
  } catch (err) {
    console.error('[GitHub Sync] Error pulling from GitHub:', err.message);
  }

  return changes;
}

// ── Sync progress tracking ──────────────────────────────────
let syncProgress = {
  running: false,
  phase: '',        // 'creating' | 'updating' | 'pulling' | 'done'
  current: 0,
  total: 0,
  summary: { created: 0, updated: 0, pulled: 0, errors: 0 },
  startedAt: null,
  completedAt: null,
  error: null,
};

/**
 * Full bi-directional sync — exported for cron
 */
async function fullSync() {
  console.log('[GitHub Sync] Starting full sync...');
  const pool = getPool();
  syncProgress.summary = { created: 0, updated: 0, pulled: 0, errors: 0 };
  syncProgress.error = null;
  syncProgress.completedAt = null;
  syncProgress.startedAt = new Date().toISOString();
  syncProgress.running = true;

  try {
    // 1. Create issues for items without github_issue_number
    const [unsynced] = await pool.query(
      'SELECT * FROM om_daily_items WHERE github_issue_number IS NULL AND status != ?',
      ['cancelled']
    );
    syncProgress.phase = 'creating';
    syncProgress.total = unsynced.length;
    syncProgress.current = 0;

    for (const item of unsynced) {
      const result = await syncItemToGitHub(item);
      if (result.action === 'created') syncProgress.summary.created++;
      else if (result.action === 'error') syncProgress.summary.errors++;
      syncProgress.current++;
    }

    // 2. Update issues where status changed since last sync
    const [needsUpdate] = await pool.query(
      `SELECT * FROM om_daily_items
       WHERE github_issue_number IS NOT NULL
         AND (github_synced_at IS NULL OR updated_at > github_synced_at)`
    );
    syncProgress.phase = 'updating';
    syncProgress.total = needsUpdate.length;
    syncProgress.current = 0;

    for (const item of needsUpdate) {
      const result = await syncItemToGitHub(item);
      if (result.action === 'updated') syncProgress.summary.updated++;
      else if (result.action === 'error') syncProgress.summary.errors++;
      syncProgress.current++;
    }

    // 3. Pull GitHub state back
    syncProgress.phase = 'pulling';
    syncProgress.current = 0;
    syncProgress.total = 0;
    syncProgress.summary.pulled = await syncGitHubToItems();

    syncProgress.phase = 'done';
    syncProgress.completedAt = new Date().toISOString();
    console.log(`[GitHub Sync] Complete: ${syncProgress.summary.created} created, ${syncProgress.summary.updated} updated, ${syncProgress.summary.pulled} pulled, ${syncProgress.summary.errors} errors`);
  } catch (err) {
    syncProgress.error = err.message;
    syncProgress.phase = 'done';
    syncProgress.completedAt = new Date().toISOString();
    console.error('[GitHub Sync] Fatal error:', err.message);
  } finally {
    syncProgress.running = false;
  }

  return syncProgress.summary;
}

// ── GitHub Sync Routes ──────────────────────────────────────────

router.post('/github/sync', requireAuth, async (req, res) => {
  if (syncProgress.running) {
    return res.json({ ok: true, already_running: true, progress: syncProgress });
  }
  // Fire and forget — run in background
  fullSync().catch(err => console.error('[GitHub Sync] Background sync error:', err));
  // Return immediately
  res.json({ ok: true, started: true, message: 'Sync started in background' });
});

router.get('/github/sync/progress', requireAuth, (req, res) => {
  res.json({
    running: syncProgress.running,
    phase: syncProgress.phase,
    current: syncProgress.current,
    total: syncProgress.total,
    summary: syncProgress.summary,
    startedAt: syncProgress.startedAt,
    completedAt: syncProgress.completedAt,
    error: syncProgress.error,
  });
});

router.post('/github/sync/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    const result = await syncItemToGitHub(rows[0]);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[GitHub Sync] POST /github/sync/:id error:', err);
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

router.get('/github/status', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [unsynced] = await pool.query(
      'SELECT COUNT(*) as count FROM om_daily_items WHERE github_issue_number IS NULL AND status != ?',
      ['cancelled']
    );
    const [lastSync] = await pool.query(
      'SELECT MAX(github_synced_at) as last_sync FROM om_daily_items WHERE github_synced_at IS NOT NULL'
    );
    res.json({
      unsyncedCount: unsynced[0].count,
      lastSync: lastSync[0].last_sync,
      repoUrl: `https://github.com/${GITHUB_REPO}`,
      issuesUrl: `https://github.com/${GITHUB_REPO}/issues`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// ═══════════════════════════════════════════════════════════════
// BUILD INFO & PUSH TO ORIGIN
// ═══════════════════════════════════════════════════════════════

const ROOT_PATH = '/var/www/orthodoxmetrics/prod';
const BUILD_INFO_FILE = path.join(ROOT_PATH, '.build-info');

/**
 * GET /api/om-daily/build-info
 * Returns version and build number
 */
router.get('/build-info', requireAuth, async (req, res) => {
  try {
    let buildInfo = {
      version: '1.0.0',
      buildNumber: 0,
      buildDate: null,
      branch: 'unknown',
      commit: 'unknown',
      fullVersion: '1.0.0.0'
    };

    // Read from .build-info file if it exists
    if (fs.existsSync(BUILD_INFO_FILE)) {
      const content = fs.readFileSync(BUILD_INFO_FILE, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key === 'APP_VERSION') buildInfo.version = value;
        if (key === 'BUILD_NUMBER') buildInfo.buildNumber = parseInt(value, 10) || 0;
        if (key === 'BUILD_DATE') buildInfo.buildDate = value;
        if (key === 'GIT_BRANCH') buildInfo.branch = value;
        if (key === 'GIT_COMMIT') buildInfo.commit = value;
      }
    } else {
      // Fallback: read version from package.json
      const pkgPath = path.join(ROOT_PATH, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        buildInfo.version = pkg.version || '1.0.0';
      }
    }

    buildInfo.fullVersion = `${buildInfo.version}.${buildInfo.buildNumber}`;

    res.json(buildInfo);
  } catch (err) {
    console.error('[Build Info] Error:', err);
    res.status(500).json({ error: 'Failed to get build info' });
  }
});

/**
 * POST /api/om-daily/push-to-origin
 * Pushes current branch to origin and resets build number
 */
router.post('/push-to-origin', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_PATH, encoding: 'utf8' }).trim();
    
    // Get status before push
    const status = execSync('git status --porcelain', { cwd: ROOT_PATH, encoding: 'utf8' }).trim();
    const hasUncommitted = status.length > 0;

    if (hasUncommitted) {
      return res.status(400).json({ 
        error: 'Cannot push: uncommitted changes exist',
        status: status.split('\n').slice(0, 10) // Show first 10 changed files
      });
    }

    // Push to origin
    const pushResult = execSync(`git push origin ${branch}`, { cwd: ROOT_PATH, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

    // Reset build number after successful push
    if (fs.existsSync(BUILD_INFO_FILE)) {
      const content = fs.readFileSync(BUILD_INFO_FILE, 'utf8');
      const newContent = content.replace(/BUILD_NUMBER=\d+/, 'BUILD_NUMBER=0');
      fs.writeFileSync(BUILD_INFO_FILE, newContent);
    }

    res.json({ 
      success: true, 
      branch,
      message: `Successfully pushed to origin/${branch}`,
      buildNumberReset: true
    });
  } catch (err) {
    console.error('[Push to Origin] Error:', err);
    res.status(500).json({ 
      error: 'Push failed: ' + (err.message || 'Unknown error'),
      stderr: err.stderr?.toString() || ''
    });
  }
});

/**
 * Send staging review notifications to all super_admins (called by cron at 8 AM)
 */
async function sendStagingReviewNotifications() {
  const pool = getPool();
  const { sendNotification } = require('../utils/notifications');

  // Gather change set stats
  const [readyForStaging] = await pool.query(
    `SELECT code, title FROM change_sets WHERE status = 'ready_for_staging'`
  );
  const [inReview] = await pool.query(
    `SELECT code, title FROM change_sets WHERE status IN ('staged', 'in_review')`
  );
  const [active] = await pool.query(
    `SELECT code, title FROM change_sets WHERE status = 'active'`
  );

  // Count unassigned in_progress/review pipeline items
  const [unassignedResult] = await pool.query(`
    SELECT COUNT(*) AS cnt FROM om_daily_items odi
    WHERE odi.status IN ('in_progress', 'review')
      AND odi.id NOT IN (
        SELECT csi.om_daily_item_id FROM change_set_items csi
        JOIN change_sets cs ON cs.id = csi.change_set_id
        WHERE cs.status NOT IN ('promoted', 'rejected', 'rolled_back')
      )
  `);

  // Build message
  const parts = [];
  if (readyForStaging.length) {
    parts.push(`${readyForStaging.length} change set(s) ready for staging: ${readyForStaging.map(c => c.code).join(', ')}`);
  }
  if (inReview.length) {
    parts.push(`${inReview.length} change set(s) in review: ${inReview.map(c => c.code).join(', ')}`);
  }
  if (active.length) {
    parts.push(`${active.length} active change set(s)`);
  }
  if (unassignedResult[0].cnt > 0) {
    parts.push(`${unassignedResult[0].cnt} pipeline item(s) not assigned to any change set`);
  }

  if (parts.length === 0) {
    console.log('[Staging Review] No actionable items — skipping notification');
    return;
  }

  const message = parts.join('. ') + '.';

  // Get all super_admin users
  const [superAdmins] = await pool.query("SELECT id FROM users WHERE role = 'super_admin'");

  for (const admin of superAdmins) {
    try {
      await sendNotification(admin.id, 'system_alert', 'Daily SDLC Review', message, {
        priority: readyForStaging.length > 0 ? 'high' : 'normal',
        actionUrl: '/admin/control-panel/om-daily/change-sets',
        actionText: 'Review Change Sets',
      });
    } catch (err) {
      console.error(`[Staging Review] Failed to notify user ${admin.id}:`, err.message);
    }
  }

  console.log(`[Staging Review] Notified ${superAdmins.length} super_admin(s): ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Branch Lifecycle Endpoints — explicit start-work / complete-work actions
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/om-daily/items/:id/start-work
 *
 * Explicit action to begin work on an OM Daily item.
 *   1. Validates item has branch_type (required) and agent_tool
 *   2. Fetches latest main
 *   3. Creates a local branch from main (naming: PREFIX_agent_YYYY-MM-DD[_itemId])
 *   4. Pushes branch to origin with tracking
 *   5. Updates item: status → in_progress, github_branch → branch name
 *
 * Does NOT auto-trigger on status change — must be called explicitly.
 */
router.post('/items/:id/start-work', requireAuth, async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { agent_tool: reqAgent, branch_type: reqBranchType } = req.body;

  try {
    // 1. Load item
    const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    const item = rows[0];

    // Allow overriding agent_tool/branch_type from request body
    const agentTool = reqAgent || item.agent_tool;
    const branchType = reqBranchType || item.branch_type;

    if (!branchType) {
      return res.status(400).json({
        error: 'branch_type is required (feature | enhancement | bugfix | refactor | migration | chore | spike | docs)',
        hint: 'Pass branch_type in the request body or set it on the item first',
      });
    }
    if (!agentTool) {
      return res.status(400).json({
        error: 'agent_tool is required (claude_cli | windsurf | cursor | github_copilot)',
        hint: 'Pass agent_tool in the request body or set it on the item first',
      });
    }

    // 2. Check if work already started (branch exists)
    if (item.github_branch) {
      // Branch already exists — check if it exists locally
      try {
        execSync(`git rev-parse --verify ${item.github_branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
        // Already checked out locally
        return res.json({
          success: true,
          branch: item.github_branch,
          action: 'already_active',
          message: `Branch ${item.github_branch} already exists and is available locally`,
        });
      } catch {
        // Branch exists in DB but not locally — try to check it out from remote
        try {
          execSync('git fetch origin', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
          execSync(`git checkout -b ${item.github_branch} origin/${item.github_branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
          return res.json({
            success: true,
            branch: item.github_branch,
            action: 'checked_out_existing',
            message: `Checked out existing branch ${item.github_branch} from origin`,
          });
        } catch (coErr) {
          // Remote branch gone — clear it and create fresh
          console.warn(`[start-work] Branch ${item.github_branch} in DB but not on remote, creating fresh`);
        }
      }
    }

    // 3. Build branch name: type/omd-<id>/<date>/<slug>
    const prefix = BRANCH_TYPE_PREFIXES[branchType];
    if (!prefix) {
      return res.status(400).json({ error: `Invalid branch_type: ${branchType}` });
    }
    const slug = slugify(item.title);
    const today = new Date().toISOString().slice(0, 10);
    let branchName = `${prefix}/omd-${item.id}/${today}/${slug}`;

    // 4. Fetch latest main and create branch
    execSync('git fetch origin main', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });

    // Stash any uncommitted changes before switching
    const status = execSync('git status --porcelain', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
    let didStash = false;
    if (status.length > 0) {
      execSync('git stash push -m "start-work auto-stash"', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
      didStash = true;
    }

    try {
      // Create and switch to new branch from origin/main
      execSync(`git checkout -b ${branchName} origin/main`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });

      // Push to origin with tracking
      execSync(`git push -u origin ${branchName}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
    } catch (gitErr) {
      // Restore previous branch if branch creation fails
      if (didStash) {
        try { execSync('git stash pop', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' }); } catch { /* ignore */ }
      }
      throw gitErr;
    }

    // Pop stash onto new branch if we stashed
    if (didStash) {
      try {
        execSync('git stash pop', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
      } catch {
        console.warn('[start-work] Stash pop had conflicts — changes are in stash, resolve manually');
      }
    }

    // 5. Update item in DB
    const updateFields = [
      'github_branch = ?',
      'status = ?',
    ];
    const updateValues = [branchName, 'in_progress'];

    if (!item.agent_tool && agentTool) {
      updateFields.push('agent_tool = ?');
      updateValues.push(agentTool);
    }
    if (!item.branch_type && branchType) {
      updateFields.push('branch_type = ?');
      updateValues.push(branchType);
    }

    updateValues.push(id);
    await pool.query(
      `UPDATE om_daily_items SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    console.log(`[start-work] Item #${id}: created branch ${branchName} from main, checked out locally`);

    res.json({
      success: true,
      branch: branchName,
      action: 'created',
      message: `Created and checked out branch ${branchName} from main`,
      stashed: didStash,
    });
  } catch (err) {
    console.error(`[start-work] Item #${id} error:`, err.message);
    res.status(500).json({
      error: 'Failed to start work',
      detail: err.message,
      stderr: err.stderr?.toString() || '',
    });
  }
});

/**
 * POST /api/om-daily/items/:id/complete-work
 *
 * Explicit action to complete work on an OM Daily item.
 *   1. Validates item has github_branch and is in_progress
 *   2. Requires clean working tree (all changes committed)
 *   3. Pushes branch to origin
 *   4. Switches to main, pulls latest
 *   5. Attempts fast-forward-only merge
 *   6. Pushes main to origin
 *   7. Deletes branch (local + remote)
 *   8. Updates item: status → done, progress → 100
 *
 * Returns error if fast-forward is not possible (main has diverged).
 * Does NOT force-merge. The caller must rebase and retry.
 */
router.post('/items/:id/complete-work', requireAuth, async (req, res) => {
  const pool = getPool();
  const { id } = req.params;

  try {
    // 1. Load item
    const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    const item = rows[0];

    if (!item.github_branch) {
      return res.status(400).json({
        error: 'No branch associated with this item',
        hint: 'Call POST /items/:id/start-work first to create a branch',
      });
    }

    const branch = item.github_branch;

    // 2. Check we're on the right branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
    if (currentBranch !== branch) {
      return res.status(400).json({
        error: `Currently on branch '${currentBranch}', expected '${branch}'`,
        hint: `Checkout the work branch first: git checkout ${branch}`,
      });
    }

    // 3. Require clean working tree
    const status = execSync('git status --porcelain', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
    if (status.length > 0) {
      return res.status(400).json({
        error: 'Working tree is not clean — commit or stash all changes before completing work',
        uncommitted: status.split('\n').slice(0, 15),
      });
    }

    // 4. Push branch to origin (ensure remote is up to date)
    execSync(`git push origin ${branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });

    // 5. Switch to main and pull latest
    execSync('git checkout main', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
    execSync('git pull origin main', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });

    // 6. Fast-forward-only merge
    try {
      execSync(`git merge --ff-only ${branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
    } catch (mergeErr) {
      // FF failed — switch back to the work branch so the user isn't stranded on main
      execSync(`git checkout ${branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
      return res.status(409).json({
        error: 'Fast-forward merge not possible — main has diverged',
        hint: `Rebase your branch onto main first:\n  git checkout ${branch}\n  git rebase main\n  # resolve any conflicts\n  Then call complete-work again`,
        branch,
        detail: mergeErr.stderr?.toString() || mergeErr.message,
      });
    }

    // 7. Push main
    execSync('git push origin main', { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });

    // 8. Delete branch (local + remote)
    try {
      execSync(`git branch -d ${branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      console.warn(`[complete-work] Could not delete local branch ${branch} (may already be gone)`);
    }
    try {
      execSync(`git push origin --delete ${branch}`, { cwd: REPO_DIR, encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      console.warn(`[complete-work] Could not delete remote branch ${branch} (may already be gone)`);
    }

    // 9. Update item in DB
    await pool.query(
      `UPDATE om_daily_items SET status = 'done', progress = 100, completed_at = NOW() WHERE id = ?`,
      [id]
    );

    // Close linked GitHub issue if exists
    if (item.github_issue_number) {
      try {
        execSync(
          `gh issue close ${item.github_issue_number} --repo ${GITHUB_REPO} -c "Work completed and merged to main via fast-forward"`,
          { encoding: 'utf-8', cwd: REPO_DIR, stdio: 'pipe' }
        );
      } catch {
        console.warn(`[complete-work] Could not close GitHub issue #${item.github_issue_number}`);
      }
    }

    const mergeCommit = execSync('git rev-parse HEAD', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();

    console.log(`[complete-work] Item #${id}: merged ${branch} → main (ff), deleted branch, commit ${mergeCommit.slice(0, 8)}`);

    res.json({
      success: true,
      action: 'merged_and_cleaned',
      branch,
      merged_to: 'main',
      merge_type: 'fast-forward',
      commit: mergeCommit,
      branch_deleted: true,
      message: `Branch ${branch} merged to main (fast-forward) and deleted`,
    });
  } catch (err) {
    console.error(`[complete-work] Item #${id} error:`, err.message);
    res.status(500).json({
      error: 'Failed to complete work',
      detail: err.message,
      stderr: err.stderr?.toString() || '',
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Agent Complete — lightweight completion signal for AI agents
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/om-daily/items/:id/agent-complete
 *
 * Lightweight endpoint for AI agents (Claude CLI, etc.) to signal work completion.
 * Transitions: in_progress → self_review (or review if using old status model).
 * Safe to call multiple times (idempotent if already past in_progress).
 *
 * Body (optional):
 *   agent_tool: string  — e.g. 'claude_cli'
 *   summary: string     — brief completion summary
 *   files_changed: string[] — list of changed files
 */
router.post('/items/:id/agent-complete', requireAuth, async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { agent_tool, summary, files_changed } = req.body || {};

  try {
    const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
    if (!rows.length) {
      console.error(`[agent-complete] Item #${id} not found`);
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = rows[0];
    const fromStatus = item.status;

    // Already completed or past in_progress — idempotent success
    const pastStatuses = ['self_review', 'review', 'staging', 'done'];
    if (pastStatuses.includes(fromStatus)) {
      return res.json({
        success: true,
        action: 'already_past',
        status: fromStatus,
        message: `Item #${id} is already at '${fromStatus}' — no transition needed`,
      });
    }

    // Only transition from in_progress
    if (fromStatus !== 'in_progress') {
      return res.status(422).json({
        error: `Cannot complete from '${fromStatus}' — item must be in_progress`,
        current_status: fromStatus,
        item_id: id,
      });
    }

    const toStatus = 'self_review';
    const actor = agent_tool || item.agent_tool || 'agent';

    // Update status and progress
    await pool.query(
      'UPDATE om_daily_items SET status = ?, progress = 100 WHERE id = ?',
      [toStatus, id]
    );

    console.log(`[agent-complete] Item #${id}: ${fromStatus} → ${toStatus} by ${actor}`);

    res.json({
      success: true,
      action: 'transitioned',
      from: fromStatus,
      to: toStatus,
      item_id: parseInt(id),
      message: `Item #${id} moved from In Progress to Self Review`,
    });
  } catch (err) {
    console.error(`[agent-complete] Item #${id} error:`, err.message);
    res.status(500).json({
      error: 'Failed to complete agent work',
      detail: err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GITHUB WEBHOOK — receive PR events and auto-update SDLC status
// ════════════════════════════════════════════════════════════════════════════
//
// Configure in GitHub repo → Settings → Webhooks:
//   Payload URL:  https://orthodoxmetrics.com/api/om-daily/webhooks/github
//   Content type: application/json
//   Secret:       (set GITHUB_WEBHOOK_SECRET env var)
//   Events:       Pull requests, Pull request reviews
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verify GitHub webhook signature (HMAC SHA-256).
 * Returns true if valid or if no secret is configured (dev mode).
 */
function verifyWebhookSignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] GITHUB_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * POST /api/om-daily/webhooks/github
 *
 * GitHub webhook handler. No auth required (uses signature verification).
 * Handles:
 *   pull_request: opened/ready_for_review → review
 *   pull_request: closed + merged → done
 *   pull_request_review: approved → staging
 *
 * Extracts task ID from branch name: type/TASK_ID-description
 */
router.post('/webhooks/github', async (req, res) => {
  // Verify signature
  if (!verifyWebhookSignature(req)) {
    console.warn('[Webhook] Invalid signature — rejecting');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  // Only handle pull_request and pull_request_review events
  if (event !== 'pull_request' && event !== 'pull_request_review') {
    return res.json({ ok: true, skipped: true, reason: `Unhandled event: ${event}` });
  }

  const pool = getPool();

  try {
    if (event === 'pull_request') {
      const pr = payload.pull_request;
      const action = payload.action;
      const branchName = pr.head.ref;
      const prNumber = pr.number;
      const prUrl = pr.html_url;
      const merged = pr.merged || false;
      const isDraft = pr.draft || false;

      // Extract task ID from branch name
      const taskId = extractTaskIdFromBranch(branchName);
      if (!taskId) {
        console.log(`[Webhook] PR #${prNumber} branch '${branchName}' — no task ID found, skipping`);
        return res.json({ ok: true, skipped: true, reason: 'No task ID in branch name' });
      }

      // Verify item exists
      const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [taskId]);
      if (!rows.length) {
        console.log(`[Webhook] PR #${prNumber} references task #${taskId} but item not found`);
        return res.json({ ok: true, skipped: true, reason: `Item #${taskId} not found` });
      }

      const item = rows[0];
      let newStatus = null;
      let logAction = '';

      if (action === 'closed' && merged) {
        // PR merged → Done
        newStatus = SDLC_STAGES.DONE;
        logAction = 'PR merged → done';
        await pool.query(
          `UPDATE om_daily_items SET status = ?, progress = 100, completed_at = NOW(),
           github_pr_number = ?, github_pr_url = ?, github_pr_state = 'merged' WHERE id = ?`,
          [newStatus, prNumber, prUrl, taskId]
        );

        // Close linked GitHub issue if exists
        if (item.github_issue_number) {
          try {
            execSync(
              `gh issue close ${item.github_issue_number} --repo ${GITHUB_REPO} -c "PR #${prNumber} merged"`,
              { encoding: 'utf-8', cwd: REPO_DIR, stdio: 'pipe' }
            );
          } catch { /* non-critical */ }
        }

      } else if (action === 'closed' && !merged) {
        // PR closed without merge — update PR state but don't change task status
        await pool.query(
          `UPDATE om_daily_items SET github_pr_number = ?, github_pr_url = ?, github_pr_state = 'closed' WHERE id = ?`,
          [prNumber, prUrl, taskId]
        );
        logAction = 'PR closed (not merged)';

      } else if ((action === 'opened' || action === 'ready_for_review') && !isDraft) {
        // PR opened (non-draft) or moved from draft to ready → Review & QA
        newStatus = SDLC_STAGES.REVIEW;
        logAction = `PR ${action} → review`;
        await pool.query(
          `UPDATE om_daily_items SET status = ?, github_pr_number = ?, github_pr_url = ?, github_pr_state = 'open' WHERE id = ?`,
          [newStatus, prNumber, prUrl, taskId]
        );

      } else if (action === 'opened' && isDraft) {
        // Draft PR opened — track PR but keep status as self_review
        await pool.query(
          `UPDATE om_daily_items SET github_pr_number = ?, github_pr_url = ?, github_pr_state = 'draft' WHERE id = ?`,
          [prNumber, prUrl, taskId]
        );
        logAction = 'Draft PR opened (status unchanged)';

      } else if (action === 'reopened') {
        // PR reopened → back to review
        newStatus = SDLC_STAGES.REVIEW;
        logAction = 'PR reopened → review';
        await pool.query(
          `UPDATE om_daily_items SET status = ?, completed_at = NULL, github_pr_state = 'open' WHERE id = ?`,
          [newStatus, taskId]
        );
      }

      console.log(`[Webhook] PR #${prNumber} (${action}) → task #${taskId}: ${logAction || 'no action'}`);
      return res.json({ ok: true, taskId, prNumber, action: logAction || action, newStatus });
    }

    if (event === 'pull_request_review') {
      const review = payload.review;
      const pr = payload.pull_request;
      const branchName = pr.head.ref;
      const prNumber = pr.number;

      // Only care about approved reviews
      if (review.state !== 'approved') {
        return res.json({ ok: true, skipped: true, reason: `Review state: ${review.state}` });
      }

      const taskId = extractTaskIdFromBranch(branchName);
      if (!taskId) {
        return res.json({ ok: true, skipped: true, reason: 'No task ID in branch name' });
      }

      const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [taskId]);
      if (!rows.length) {
        return res.json({ ok: true, skipped: true, reason: `Item #${taskId} not found` });
      }

      // PR approved → Staging/Ready
      await pool.query(
        `UPDATE om_daily_items SET status = ?, github_pr_state = 'approved' WHERE id = ?`,
        [SDLC_STAGES.STAGING, taskId]
      );

      console.log(`[Webhook] PR #${prNumber} approved → task #${taskId}: review → staging`);
      return res.json({ ok: true, taskId, prNumber, action: 'PR approved → staging', newStatus: SDLC_STAGES.STAGING });
    }

  } catch (err) {
    console.error('[Webhook] Error processing GitHub event:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed', detail: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DUAL-REPO ORCHESTRATION — repository_dispatch support
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/om-daily/dispatch/:repo
 *
 * Send a repository_dispatch event to another repo.
 * Used to signal cross-repo dependencies (e.g., OMAI → OM).
 *
 * Body: { event_type: string, client_payload: object }
 */
router.post('/dispatch/:repo', requireAuth, async (req, res) => {
  const { repo } = req.params;
  const { event_type, client_payload = {} } = req.body;

  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  // Allowed repos for dispatch
  const ALLOWED_REPOS = {
    orthodoxmetrics: GITHUB_REPO,
    omai: 'nexty1982/omai',
  };

  const targetRepo = ALLOWED_REPOS[repo];
  if (!targetRepo) {
    return res.status(400).json({ error: `Unknown repo: ${repo}. Allowed: ${Object.keys(ALLOWED_REPOS).join(', ')}` });
  }

  try {
    const payloadJson = JSON.stringify(client_payload).replace(/"/g, '\\"');
    execSync(
      `gh api repos/${targetRepo}/dispatches -f event_type="${event_type}" -f client_payload="${payloadJson}"`,
      { encoding: 'utf-8', cwd: REPO_DIR }
    );

    console.log(`[Dispatch] Sent '${event_type}' to ${targetRepo}`);
    res.json({ ok: true, repo: targetRepo, event_type });
  } catch (err) {
    console.error(`[Dispatch] Failed to send '${event_type}' to ${targetRepo}:`, err.message);
    res.status(500).json({ error: 'Dispatch failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// MILESTONES — workplan / version tracking
// ═══════════════════════════════════════════════════════════════

/**
 * Check whether every task in a milestone is done.
 * Returns { total, completed, percent, ready }.
 */
async function checkMilestoneCompletion(milestoneId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'done') AS completed
     FROM om_daily_items
     WHERE milestone_id = ?`,
    [milestoneId]
  );
  const { total, completed } = rows[0];
  const ready = total > 0 && Number(total) === Number(completed);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (ready) {
    console.log(`[Milestone] #${milestoneId} is release-ready (${total}/${total} done)`);
  }
  return { total: Number(total), completed: Number(completed), percent, ready };
}

/**
 * GET /milestones — list all milestones with task counts
 */
router.get('/milestones', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [milestones] = await pool.query(
      `SELECT m.*,
              COUNT(i.id) AS task_count,
              SUM(i.status = 'done') AS tasks_done
       FROM om_milestones m
       LEFT JOIN om_daily_items i ON i.milestone_id = m.id
       GROUP BY m.id
       ORDER BY FIELD(m.status, 'active', 'planned', 'released'), m.created_at DESC`
    );
    res.json({ milestones });
  } catch (err) {
    console.error('[Milestones] list error:', err);
    res.status(500).json({ error: 'Failed to list milestones' });
  }
});

/**
 * GET /milestones/:id — single milestone with its tasks
 */
router.get('/milestones/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [ms] = await pool.query('SELECT * FROM om_milestones WHERE id = ?', [req.params.id]);
    if (!ms.length) return res.status(404).json({ error: 'Milestone not found' });

    const [items] = await pool.query(
      `SELECT * FROM om_daily_items WHERE milestone_id = ?
       ORDER BY FIELD(status, 'backlog','in_progress','self_review','review','staging','done','blocked','cancelled'), priority ASC`,
      [req.params.id]
    );

    const completion = await checkMilestoneCompletion(req.params.id);
    res.json({ milestone: ms[0], items, completion });
  } catch (err) {
    console.error('[Milestones] get error:', err);
    res.status(500).json({ error: 'Failed to get milestone' });
  }
});

/**
 * POST /milestones — create a milestone
 */
router.post('/milestones', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { version_tag, title, description, status, target_date } = req.body;

    if (!version_tag || !title) {
      return res.status(400).json({ error: 'version_tag and title are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO om_milestones (version_tag, title, description, status, target_date)
       VALUES (?, ?, ?, ?, ?)`,
      [version_tag, title, description || null, status || 'planned', target_date || null]
    );

    const [ms] = await pool.query('SELECT * FROM om_milestones WHERE id = ?', [result.insertId]);
    res.status(201).json({ milestone: ms[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `version_tag '${req.body.version_tag}' already exists` });
    }
    console.error('[Milestones] create error:', err);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

/**
 * PUT /milestones/:id — update a milestone
 */
router.put('/milestones/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { version_tag, title, description, status, target_date } = req.body;
    const updates = [];
    const params = [];

    if (version_tag !== undefined) { updates.push('version_tag = ?'); params.push(version_tag); }
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) {
      updates.push('status = ?'); params.push(status);
      if (status === 'released') { updates.push('released_at = NOW()'); }
    }
    if (target_date !== undefined) { updates.push('target_date = ?'); params.push(target_date || null); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE om_milestones SET ${updates.join(', ')} WHERE id = ?`, params);

    const [ms] = await pool.query('SELECT * FROM om_milestones WHERE id = ?', [req.params.id]);
    if (!ms.length) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ milestone: ms[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `version_tag already exists` });
    }
    console.error('[Milestones] update error:', err);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

/**
 * DELETE /milestones/:id — delete a milestone (FK SET NULL unlinks tasks)
 */
router.delete('/milestones/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM om_milestones WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Milestone not found' });
    await pool.query('DELETE FROM om_milestones WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Milestones] delete error:', err);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

/**
 * POST /milestones/:id/items — bulk-assign tasks to a milestone
 * Body: { item_ids: [1, 2, 3] }
 */
router.post('/milestones/:id/items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ error: 'item_ids array is required' });
    }

    const [ms] = await pool.query('SELECT id FROM om_milestones WHERE id = ?', [req.params.id]);
    if (!ms.length) return res.status(404).json({ error: 'Milestone not found' });

    await pool.query(
      `UPDATE om_daily_items SET milestone_id = ? WHERE id IN (?)`,
      [req.params.id, item_ids]
    );

    const completion = await checkMilestoneCompletion(req.params.id);
    res.json({ ok: true, assigned: item_ids.length, completion });
  } catch (err) {
    console.error('[Milestones] bulk-assign error:', err);
    res.status(500).json({ error: 'Failed to assign items' });
  }
});

/**
 * DELETE /milestones/:id/items/:itemId — remove a task from a milestone
 */
router.delete('/milestones/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE om_daily_items SET milestone_id = NULL WHERE id = ? AND milestone_id = ?`,
      [req.params.itemId, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Milestones] remove-item error:', err);
    res.status(500).json({ error: 'Failed to remove item from milestone' });
  }
});

/**
 * GET /milestones/:id/status — completion stats
 */
router.get('/milestones/:id/status', requireAuth, async (req, res) => {
  try {
    const [ms] = await getPool().query('SELECT * FROM om_milestones WHERE id = ?', [req.params.id]);
    if (!ms.length) return res.status(404).json({ error: 'Milestone not found' });

    const completion = await checkMilestoneCompletion(req.params.id);
    res.json({ milestone: ms[0], completion });
  } catch (err) {
    console.error('[Milestones] status error:', err);
    res.status(500).json({ error: 'Failed to get milestone status' });
  }
});

/**
 * POST /milestones/:id/release — promote milestone to production
 * Dispatches 'promote-to-production' event to the repo and marks milestone as released.
 */
router.post('/milestones/:id/release', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [ms] = await pool.query('SELECT * FROM om_milestones WHERE id = ?', [req.params.id]);
    if (!ms.length) return res.status(404).json({ error: 'Milestone not found' });

    const milestone = ms[0];
    if (milestone.status === 'released') {
      return res.status(400).json({ error: 'Milestone is already released' });
    }

    const completion = await checkMilestoneCompletion(req.params.id);
    if (!completion.ready) {
      return res.status(400).json({
        error: `Milestone is not ready: ${completion.completed}/${completion.total} tasks done (${completion.percent}%)`,
        completion,
      });
    }

    // Dispatch promote-to-production event to GitHub
    const payloadJson = JSON.stringify({
      version: milestone.version_tag,
      milestone_id: milestone.id,
      title: milestone.title,
    }).replace(/"/g, '\\"');

    try {
      execSync(
        `gh api repos/${GITHUB_REPO}/dispatches -f event_type="promote-to-production" -f client_payload="${payloadJson}"`,
        { encoding: 'utf-8', cwd: REPO_DIR }
      );
      console.log(`[Milestone] Dispatched promote-to-production for ${milestone.version_tag}`);
    } catch (ghErr) {
      console.error('[Milestone] GitHub dispatch failed:', ghErr.message);
      return res.status(500).json({ error: 'GitHub dispatch failed', detail: ghErr.message });
    }

    // Mark milestone as released
    await pool.query(
      `UPDATE om_milestones SET status = 'released', released_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM om_milestones WHERE id = ?', [req.params.id]);
    res.json({ ok: true, milestone: updated[0], completion });
  } catch (err) {
    console.error('[Milestones] release error:', err);
    res.status(500).json({ error: 'Failed to release milestone' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DRAFTS — server-backed draft lifecycle
// ═══════════════════════════════════════════════════════════════

// POST /items/draft — create a new draft
router.post('/items/draft', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session?.user?.id || req.user?.id || null;
    const { title, description, task_type, priority, horizon, category, due_date, agent_tool, branch_type, repo_target } = req.body;

    const [result] = await pool.query(
      `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, due_date, source, agent_tool, branch_type, repo_target, created_by, draft_saved_at)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, 'human', ?, ?, ?, ?, NOW())`,
      [
        title || '', task_type || 'chore', description || null, horizon || '7',
        priority || 'medium', category || null, due_date || null,
        agent_tool || null, branch_type || null, repo_target || 'orthodoxmetrics',
        userId,
      ]
    );

    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [result.insertId]);
    console.log(`[OM Daily] Draft created #${result.insertId} by user ${userId}`);
    res.status(201).json({ success: true, item: item[0] });
  } catch (err) {
    console.error('[OM Daily] Draft create error:', err);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

// PATCH /items/:id/draft — auto-save draft fields
router.patch('/items/:id/draft', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session?.user?.id || req.user?.id || null;

    // Verify item exists and is a draft
    const [existing] = await pool.query('SELECT id, status, created_by FROM om_daily_items WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Item not found' });
    if (existing[0].status !== 'draft') return res.status(400).json({ error: 'Item is not a draft' });

    const allowed = ['title', 'description', 'task_type', 'priority', 'horizon', 'category', 'due_date', 'agent_tool', 'branch_type', 'repo_target'];
    const updates = []; const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(req.body[key] === '' && key !== 'title' ? null : req.body[key]);
      }
    }
    if (!updates.length) return res.json({ success: true, message: 'Nothing to update' });

    updates.push('draft_saved_at = NOW()');
    updates.push('updated_by = ?'); values.push(userId);
    values.push(req.params.id);

    await pool.query(`UPDATE om_daily_items SET ${updates.join(', ')} WHERE id = ?`, values);
    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [req.params.id]);
    res.json({ success: true, item: item[0] });
  } catch (err) {
    console.error('[OM Daily] Draft save error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// GET /items/draft/current — get the user's current in-progress draft (most recent)
router.get('/items/draft/current', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session?.user?.id || req.user?.id || null;
    if (!userId) return res.json({ success: true, draft: null });

    const [drafts] = await pool.query(
      `SELECT d.*, (SELECT COUNT(*) FROM om_daily_item_attachments a WHERE a.work_item_id = d.id AND a.is_deleted = 0) AS attachment_count
       FROM om_daily_items d WHERE d.status = 'draft' AND d.created_by = ? ORDER BY d.draft_saved_at DESC LIMIT 1`,
      [userId]
    );
    res.json({ success: true, draft: drafts[0] || null });
  } catch (err) {
    console.error('[OM Daily] Draft fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// DELETE /items/:id/draft — discard a draft (hard delete + cleanup attachments)
router.delete('/items/:id/draft', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id, status FROM om_daily_items WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Item not found' });
    if (existing[0].status !== 'draft') return res.status(400).json({ error: 'Item is not a draft' });

    // Remove attachment files from disk
    const itemDir = path.join(UPLOADS_ROOT, String(req.params.id));
    try { fs.rmSync(itemDir, { recursive: true, force: true }); } catch { /* ok */ }

    // DB cascade will handle om_daily_item_attachments via FK
    await pool.query('DELETE FROM om_daily_items WHERE id = ? AND status = ?', [req.params.id, 'draft']);
    console.log(`[OM Daily] Draft #${req.params.id} discarded`);
    res.json({ success: true, message: 'Draft discarded' });
  } catch (err) {
    console.error('[OM Daily] Draft discard error:', err);
    res.status(500).json({ error: 'Failed to discard draft' });
  }
});

// POST /items/:id/submit — promote draft to active item (backlog)
router.post('/items/:id/submit', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session?.user?.id || req.user?.id || null;

    const [existing] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Item not found' });
    if (existing[0].status !== 'draft') return res.status(400).json({ error: 'Item is not a draft' });
    if (!existing[0].title || !existing[0].title.trim()) return res.status(400).json({ error: 'Title is required to submit' });

    await pool.query(
      `UPDATE om_daily_items SET status = 'backlog', submitted_at = NOW(), updated_by = ?, draft_saved_at = NULL WHERE id = ?`,
      [userId, req.params.id]
    );

    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [req.params.id]);
    const createdItem = item[0];

    // Auto-sync to GitHub if agent_tool + branch_type are set
    if (createdItem.agent_tool && createdItem.branch_type) {
      try { await syncItemToGitHub(createdItem); } catch (syncErr) {
        console.error('[Auto-sync] Failed on submit:', syncErr.message);
      }
    }

    const [final] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [req.params.id]);
    console.log(`[OM Daily] Draft #${req.params.id} submitted as active item by user ${userId}`);
    res.json({ success: true, item: final[0] });
  } catch (err) {
    console.error('[OM Daily] Draft submit error:', err);
    res.status(500).json({ error: 'Failed to submit draft' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS — file upload/download/delete for work items
// ═══════════════════════════════════════════════════════════════

// POST /items/:id/attachments — upload files to a work item or draft
router.post('/items/:id/attachments', requireAuth, (req, res) => {
  const upload = attachmentUpload.array('files', 10);
  upload(req, res, async (multerErr) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
      return res.status(400).json({ error: multerErr.message });
    }
    try {
      const pool = getPool();
      const userId = req.session?.user?.id || req.user?.id || null;

      // Verify item exists
      const [existing] = await pool.query('SELECT id, status FROM om_daily_items WHERE id = ?', [req.params.id]);
      if (!existing.length) {
        // Cleanup uploaded files
        (req.files || []).forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
        return res.status(404).json({ error: 'Work item not found' });
      }

      const attachments = [];
      for (const file of (req.files || [])) {
        const ext = path.extname(file.originalname).toLowerCase();
        const [insertResult] = await pool.query(
          `INSERT INTO om_daily_item_attachments (work_item_id, original_filename, stored_filename, storage_path, mime_type, file_size_bytes, file_extension, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            sanitizeFilename(file.originalname),
            file.filename,
            path.join(String(req.params.id), file.filename),
            file.mimetype,
            file.size,
            ext,
            userId,
          ]
        );
        attachments.push({
          id: insertResult.insertId,
          original_filename: sanitizeFilename(file.originalname),
          stored_filename: file.filename,
          mime_type: file.mimetype,
          file_size_bytes: file.size,
          file_extension: ext,
        });
      }

      console.log(`[OM Daily] ${attachments.length} attachment(s) uploaded to item #${req.params.id} by user ${userId}`);
      res.status(201).json({ success: true, attachments });
    } catch (err) {
      console.error('[OM Daily] Attachment upload error:', err);
      res.status(500).json({ error: 'Failed to upload attachments' });
    }
  });
});

// GET /items/:id/attachments — list attachments for a work item
router.get('/items/:id/attachments', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [attachments] = await pool.query(
      `SELECT id, work_item_id, original_filename, stored_filename, mime_type, file_size_bytes, file_extension, uploaded_by, uploaded_at, label, sort_order
       FROM om_daily_item_attachments WHERE work_item_id = ? AND is_deleted = 0 ORDER BY sort_order, uploaded_at`,
      [req.params.id]
    );
    res.json({ success: true, attachments });
  } catch (err) {
    console.error('[OM Daily] Attachment list error:', err);
    res.status(500).json({ error: 'Failed to list attachments' });
  }
});

// GET /attachments/:attachmentId/download — download/view an attachment
router.get('/attachments/:attachmentId/download', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM om_daily_item_attachments WHERE id = ? AND is_deleted = 0',
      [req.params.attachmentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Attachment not found' });

    const att = rows[0];
    const filePath = path.join(UPLOADS_ROOT, att.storage_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    // Prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOADS_ROOT))) return res.status(403).json({ error: 'Access denied' });

    const isInline = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(att.mime_type);
    res.setHeader('Content-Type', att.mime_type);
    res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${att.original_filename}"`);
    res.setHeader('Content-Length', att.file_size_bytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[OM Daily] Attachment download error:', err);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// DELETE /attachments/:attachmentId — soft-delete an attachment
router.delete('/attachments/:attachmentId', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM om_daily_item_attachments WHERE id = ? AND is_deleted = 0',
      [req.params.attachmentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Attachment not found' });

    // Soft-delete in DB
    await pool.query('UPDATE om_daily_item_attachments SET is_deleted = 1 WHERE id = ?', [req.params.attachmentId]);

    // Remove file from disk
    const att = rows[0];
    const filePath = path.join(UPLOADS_ROOT, att.storage_path);
    try { fs.unlinkSync(filePath); } catch { /* ok if already gone */ }

    console.log(`[OM Daily] Attachment #${req.params.attachmentId} deleted from item #${att.work_item_id}`);
    res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    console.error('[OM Daily] Attachment delete error:', err);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// Export cron functions on the router for access from index.ts
router.generateAndEmailChangelog = generateAndEmailChangelog;
router.fullSync = fullSync;
router.sendStagingReviewNotifications = sendStagingReviewNotifications;

module.exports = router;
