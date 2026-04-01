/**
 * /api/admin/nginx — Nginx proxy entry registry
 *
 * CRUD for managed proxy location blocks + config generation
 * for inner (.239) and outer (.221) nginx servers.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db');

const requireSuperAdmin = requireRole(['super_admin']);

// ─── Config generation helpers ─────────────────────────────

function generateInnerBlock(entry) {
  const mod = entry.location_modifier ? `${entry.location_modifier} ` : '';
  const targetPath = entry.target_path || entry.location_path;
  const lines = [];

  lines.push(`    location ${mod}${entry.location_path} {`);
  lines.push(`        proxy_pass         http://127.0.0.1:${entry.backend_port}${targetPath};`);
  lines.push(`        proxy_http_version 1.1;`);
  lines.push(`        proxy_set_header   Host $host;`);
  lines.push(`        proxy_set_header   X-Real-IP $remote_addr;`);
  lines.push(`        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;`);
  lines.push(`        proxy_set_header   X-Forwarded-Proto https;`);

  if (entry.is_websocket) {
    lines.push(`        proxy_set_header   Upgrade $http_upgrade;`);
    lines.push(`        proxy_set_header   Connection "upgrade";`);
  }

  // Default buffering off unless overridden by inner_extra
  if (!entry.inner_extra || !entry.inner_extra.includes('proxy_buffering')) {
    lines.push(`        proxy_buffering    off;`);
  }

  if (entry.cookie_forwarding) {
    lines.push(`        proxy_set_header   Cookie $http_cookie;`);
    lines.push(`        proxy_pass_header  Set-Cookie;`);
    lines.push(`        proxy_cookie_path  / /;`);
  }

  if (entry.cookie_domain_rewrite) {
    lines.push(`        proxy_cookie_domain 127.0.0.1 orthodoxmetrics.com;`);
    lines.push(`        proxy_cookie_domain localhost orthodoxmetrics.com;`);
  }

  if (entry.client_max_body) {
    lines.push(`        client_max_body_size ${entry.client_max_body};`);
  }

  lines.push(`        proxy_connect_timeout ${entry.connect_timeout};`);
  lines.push(`        proxy_send_timeout    ${entry.send_timeout};`);
  lines.push(`        proxy_read_timeout    ${entry.read_timeout};`);

  if (entry.inner_extra) {
    lines.push(`        ${entry.inner_extra.replace(/\n/g, '\n        ')}`);
  }

  lines.push(`    }`);
  return lines.join('\n');
}

function generateOuterBlock(entry) {
  const mod = entry.location_modifier ? `${entry.location_modifier} ` : '';
  const targetPath = entry.target_path || entry.location_path;
  const outerPort = entry.outer_mode === 'via_inner' ? 80 : entry.backend_port;
  const lines = [];

  lines.push(`    location ${mod}${entry.location_path} {`);

  if (entry.intercept_errors_off) {
    lines.push(`        proxy_intercept_errors off;`);
  }

  lines.push(`        proxy_pass         http://192.168.1.239:${outerPort}${targetPath};`);
  lines.push(`        proxy_http_version 1.1;`);
  lines.push(`        proxy_set_header   Host $host;`);
  lines.push(`        proxy_set_header   X-Real-IP $remote_addr;`);
  lines.push(`        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;`);
  lines.push(`        proxy_set_header   X-Forwarded-Proto $scheme;`);

  if (entry.is_websocket) {
    lines.push(`        proxy_set_header   Upgrade $http_upgrade;`);
    lines.push(`        proxy_set_header   Connection "upgrade";`);
  }

  if (!entry.outer_extra || !entry.outer_extra.includes('proxy_buffering')) {
    lines.push(`        proxy_buffering    off;`);
  }

  if (entry.client_max_body) {
    lines.push(`        client_max_body_size ${entry.client_max_body};`);
  }

  if (entry.cookie_forwarding) {
    lines.push(`        proxy_set_header   Cookie $http_cookie;`);
    lines.push(`        proxy_pass_header  Set-Cookie;`);
    lines.push(`        proxy_cookie_path  / /;`);
  }

  lines.push(`        proxy_connect_timeout ${entry.connect_timeout};`);
  lines.push(`        proxy_send_timeout    ${entry.send_timeout};`);
  lines.push(`        proxy_read_timeout    ${entry.read_timeout};`);

  if (entry.outer_extra) {
    lines.push(`        ${entry.outer_extra.replace(/\n/g, '\n        ')}`);
  }

  lines.push(`    }`);
  return lines.join('\n');
}

// ─── Routes ────────────────────────────────────────────────

// GET /api/admin/nginx — list all entries with sync status
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [entries] = await pool.query(`
      SELECT *,
        CASE WHEN inner_applied_at IS NOT NULL AND inner_applied_at >= updated_at THEN 1 ELSE 0 END AS inner_synced,
        CASE WHEN outer_applied_at IS NOT NULL AND outer_applied_at >= updated_at THEN 1 ELSE 0 END AS outer_synced
      FROM nginx_proxy_entries
      WHERE enabled = 1
      ORDER BY is_catch_all ASC, sort_order ASC
    `);

    const stats = {
      total: entries.length,
      inner_synced: entries.filter(e => e.scope !== 'outer_only' && e.inner_synced).length,
      outer_synced: entries.filter(e => e.scope !== 'inner_only' && e.outer_synced).length,
      inner_total: entries.filter(e => e.scope !== 'outer_only').length,
      outer_total: entries.filter(e => e.scope !== 'inner_only').length,
      out_of_sync: entries.filter(e =>
        (e.scope !== 'outer_only' && !e.inner_synced) ||
        (e.scope !== 'inner_only' && !e.outer_synced)
      ).length,
    };

    res.json({ success: true, entries, stats });
  } catch (error) {
    console.error('[nginx] List error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/nginx/:id — single entry
router.get('/:id(\\d+)', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query('SELECT * FROM nginx_proxy_entries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Entry not found' });
    res.json({ success: true, entry: rows[0] });
  } catch (error) {
    console.error('[nginx] Get error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/nginx — create entry
router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name, location_path, location_modifier, description,
      backend_port, target_path, outer_mode,
      is_websocket, cookie_forwarding, cookie_domain_rewrite, intercept_errors_off,
      client_max_body, connect_timeout, send_timeout, read_timeout,
      inner_extra, outer_extra,
      scope, sort_order, is_catch_all,
    } = req.body;

    if (!name || !location_path || !backend_port) {
      return res.status(400).json({ success: false, error: 'name, location_path, and backend_port are required' });
    }
    if (!location_path.startsWith('/')) {
      return res.status(400).json({ success: false, error: 'location_path must start with /' });
    }

    const pool = getAppPool();
    const [result] = await pool.query(
      `INSERT INTO nginx_proxy_entries
        (name, location_path, location_modifier, description,
         backend_port, target_path, outer_mode,
         is_websocket, cookie_forwarding, cookie_domain_rewrite, intercept_errors_off,
         client_max_body, connect_timeout, send_timeout, read_timeout,
         inner_extra, outer_extra, scope, sort_order, is_catch_all)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, location_path, location_modifier || null, description || null,
        backend_port, target_path || null, outer_mode || 'via_inner',
        is_websocket ? 1 : 0, cookie_forwarding !== false ? 1 : 0,
        cookie_domain_rewrite ? 1 : 0, intercept_errors_off !== false ? 1 : 0,
        client_max_body || null, connect_timeout || '300s', send_timeout || '300s', read_timeout || '300s',
        inner_extra || null, outer_extra || null,
        scope || 'both', sort_order || 100, is_catch_all ? 1 : 0,
      ]
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'An entry with that location_path already exists' });
    }
    console.error('[nginx] Create error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/nginx/:id — update entry
router.put('/:id(\\d+)', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [existing] = await pool.query('SELECT id FROM nginx_proxy_entries WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Entry not found' });

    const fields = [
      'name', 'location_path', 'location_modifier', 'description',
      'backend_port', 'target_path', 'outer_mode',
      'is_websocket', 'cookie_forwarding', 'cookie_domain_rewrite', 'intercept_errors_off',
      'client_max_body', 'connect_timeout', 'send_timeout', 'read_timeout',
      'inner_extra', 'outer_extra', 'scope', 'sort_order', 'is_catch_all',
    ];

    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(req.params.id);
    await pool.query(`UPDATE nginx_proxy_entries SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Updated' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'An entry with that location_path already exists' });
    }
    console.error('[nginx] Update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/nginx/:id
router.delete('/:id(\\d+)', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [result] = await pool.query('DELETE FROM nginx_proxy_entries WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Entry not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('[nginx] Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/nginx/generate/:server — generate full config block
router.get('/generate/:server', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { server } = req.params;
    if (!['inner', 'outer'].includes(server)) {
      return res.status(400).json({ success: false, error: 'server must be "inner" or "outer"' });
    }

    const scopeFilter = server === 'inner'
      ? "scope IN ('both', 'inner_only')"
      : "scope IN ('both', 'outer_only')";

    const pool = getAppPool();
    const [entries] = await pool.query(
      `SELECT * FROM nginx_proxy_entries WHERE enabled = 1 AND ${scopeFilter}
       ORDER BY is_catch_all ASC, sort_order ASC`
    );

    const generator = server === 'inner' ? generateInnerBlock : generateOuterBlock;
    const header = server === 'inner'
      ? '    # ─── Managed Proxy Entries (Inner .239) ───────────────────────'
      : '    # ─── Managed Proxy Entries (Outer .221) ───────────────────────';

    const blocks = entries.map(e => {
      const comment = `    # ${e.name}${e.description ? ' — ' + e.description : ''}`;
      return comment + '\n' + generator(e);
    });

    const config = header + '\n\n' + blocks.join('\n\n') + '\n';

    res.json({ success: true, server, config, count: entries.length });
  } catch (error) {
    console.error('[nginx] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/nginx/mark-applied — mark entries as applied
router.post('/mark-applied', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { server, ids } = req.body;
    if (!['inner', 'outer', 'both'].includes(server)) {
      return res.status(400).json({ success: false, error: 'server must be "inner", "outer", or "both"' });
    }

    const pool = getAppPool();
    const updates = [];
    if (server === 'inner' || server === 'both') updates.push('inner_applied_at = NOW()');
    if (server === 'outer' || server === 'both') updates.push('outer_applied_at = NOW()');

    let query = `UPDATE nginx_proxy_entries SET ${updates.join(', ')} WHERE enabled = 1`;
    const params = [];

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query += ` AND id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }

    const [result] = await pool.query(query, params);
    res.json({ success: true, affected: result.affectedRows });
  } catch (error) {
    console.error('[nginx] Mark applied error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
