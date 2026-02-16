/**
 * OM Daily API Routes
 * Work pipeline management with 7/14/30/60/90 day horizons
 * Also serves as the unified backend for the Daily Tasks page
 *
 * Mounted at /api/om-daily
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

function getPool() {
  return require('../config/db').promisePool;
}

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
// OM: backlog, todo, in_progress, review, done, cancelled
const DT_STATUS_TO_OM = { pending: 'todo', in_progress: 'in_progress', blocked: 'review', completed: 'done', failed: 'cancelled', cancelled: 'cancelled' };
const OM_STATUS_TO_DT = { backlog: 'pending', todo: 'pending', in_progress: 'in_progress', review: 'in_progress', done: 'completed', cancelled: 'cancelled' };

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
       ORDER BY FIELD(horizon,'7','14','30','60','90'), FIELD(status,'backlog','todo','in_progress','review','done')`
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
// LIST — get items, filtered by horizon, status, date, task_type, etc.
// ═══════════════════════════════════════════════════════════════

router.get('/items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { horizon, status, priority, category, search, sort = 'priority', direction = 'asc', date, task_type } = req.query;

    const conditions = [];
    const params = [];

    if (horizon) { conditions.push('horizon = ?'); params.push(horizon); }
    if (status && status !== 'all') { conditions.push('status = ?'); params.push(status); }
    if (priority) { conditions.push('priority = ?'); params.push(priority); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (task_type) { conditions.push('task_type = ?'); params.push(task_type); }
    if (date) { conditions.push('DATE(created_at) = ?'); params.push(date); }
    if (search) { conditions.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = {
      priority: `FIELD(priority,'critical','high','medium','low') ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      status: `FIELD(status,'in_progress','todo','review','backlog','done','cancelled') ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      due_date: `due_date ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      created_at: `created_at ${direction === 'desc' ? 'DESC' : 'ASC'}`,
      title: `title ${direction === 'desc' ? 'DESC' : 'ASC'}`,
    };
    const orderBy = allowedSorts[sort] || allowedSorts.priority;

    const [rows] = await pool.query(
      `SELECT * FROM om_daily_items ${whereClause} ORDER BY ${orderBy}, created_at DESC`,
      params
    );

    res.json({ items: rows, total: rows.length });
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
    const { title, description, horizon = '7', status = 'todo', priority = 'medium', category, due_date, tags, task_type, source, metadata } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });

    const [result] = await pool.query(
      `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, due_date, tags, source, metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        task_type || 'task',
        description || null,
        horizon,
        status,
        priority,
        category || null,
        due_date || null,
        tags ? JSON.stringify(tags) : null,
        source || 'human',
        metadata ? JSON.stringify(metadata) : null,
        req.session?.user?.id || null,
      ]
    );

    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [result.insertId]);
    res.status(201).json({ item: item[0] });
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
    const { title, description, horizon, status, priority, category, due_date, tags, progress, task_type, source, metadata } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (horizon !== undefined) { updates.push('horizon = ?'); params.push(horizon); }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'done') { updates.push('completed_at = NOW()'); }
      if (status !== 'done') { updates.push('completed_at = NULL'); }
    }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category || null); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date || null); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (progress !== undefined) { updates.push('progress = ?'); params.push(Math.min(100, Math.max(0, parseInt(progress) || 0))); }
    if (task_type !== undefined) { updates.push('task_type = ?'); params.push(task_type); }
    if (source !== undefined) { updates.push('source = ?'); params.push(source); }
    if (metadata !== undefined) { updates.push('metadata = ?'); params.push(JSON.stringify(metadata)); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE om_daily_items SET ${updates.join(', ')} WHERE id = ?`, params);

    const [item] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [id]);
    if (!item.length) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: item[0] });
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
function buildChangelogEmailHtml(entry, pipelineItems) {
  const commits = typeof entry.commits === 'string' ? JSON.parse(entry.commits) : entry.commits;
  const filesChanged = typeof entry.files_changed === 'string' ? JSON.parse(entry.files_changed) : (entry.files_changed || {});
  const matchedItems = typeof entry.matched_items === 'string' ? JSON.parse(entry.matched_items) : (entry.matched_items || []);
  const matchCount = commits.filter(c => c.matchedItem).length;
  const matchRate = commits.length > 0 ? Math.round((matchCount / commits.length) * 100) : 0;

  const statusColor = (status) => {
    const colors = { backlog: '#9e9e9e', todo: '#2196f3', in_progress: '#ff9800', review: '#9c27b0', done: '#4caf50', cancelled: '#f44336', complete: '#4caf50' };
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

  const activeItems = (pipelineItems || []).filter(i => i.status === 'in_progress' || i.status === 'review');
  const pipelineSection = activeItems.length > 0 ? `
    <h3 style="color:#8c249d;margin-top:24px;">Active Pipeline Items</h3>
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
            <div style="font-size:24px;font-weight:700;color:#4caf50;">${filesChanged.added + filesChanged.modified + filesChanged.deleted}</div>
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

  const html = buildChangelogEmailHtml(entry, pipelineItems);
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

    const html = buildChangelogEmailHtml(entry, pipelineItems);
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

// Export cron function on the router for access from index.ts
router.generateAndEmailChangelog = generateAndEmailChangelog;

module.exports = router;
