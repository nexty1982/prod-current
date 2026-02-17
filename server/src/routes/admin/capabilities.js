/**
 * Admin Capabilities API
 *
 * GET /api/admin/capabilities          - List all capabilities (super_admin)
 * GET /api/admin/capabilities/summary  - Summary counts by kind/tag (super_admin)
 * POST /api/admin/capabilities/scan    - Trigger a live inventory scan (super_admin)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { promisePool } = require('../../config/db');

// Middleware: require super_admin
const requireSuperAdmin = requireRole(['super_admin']);

/**
 * GET /api/admin/capabilities
 * Returns all capabilities, optionally grouped by kind + tag.
 *
 * Query params:
 *   ?kind=route           - Filter by kind
 *   ?status=active        - Filter by status (default: active)
 *   ?tag=admin            - Filter by tag (checks tags_json)
 *   ?group=true           - Group results by kind then tag
 *   ?search=users         - Search name/path/key
 */
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { kind, status = 'active', tag, group, search } = req.query;

    let sql = 'SELECT * FROM admin_capabilities WHERE 1=1';
    const params = [];

    if (kind) {
      sql += ' AND kind = ?';
      params.push(kind);
    }

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (tag) {
      sql += ' AND JSON_CONTAINS(tags_json, ?)';
      params.push(JSON.stringify(tag));
    }

    if (search) {
      sql += ' AND (name LIKE ? OR path LIKE ? OR `key` LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY kind, path, method';

    const [rows] = await promisePool.query(sql, params);

    // Parse JSON fields
    const capabilities = rows.map(row => ({
      ...row,
      roles_json: safeParseJSON(row.roles_json, []),
      tags_json: safeParseJSON(row.tags_json, []),
    }));

    // Optionally group by kind + first tag
    if (group === 'true') {
      const grouped = {};
      for (const cap of capabilities) {
        const k = cap.kind || 'unknown';
        const t = (cap.tags_json && cap.tags_json[0]) || 'untagged';
        const groupKey = `${k}:${t}`;
        if (!grouped[groupKey]) {
          grouped[groupKey] = { kind: k, tag: t, capabilities: [] };
        }
        grouped[groupKey].capabilities.push(cap);
      }

      return res.json({
        success: true,
        count: capabilities.length,
        groups: Object.values(grouped),
      });
    }

    res.json({
      success: true,
      count: capabilities.length,
      capabilities,
    });
  } catch (error) {
    console.error('[Capabilities] Error listing capabilities:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list capabilities',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/capabilities/summary
 * Returns aggregated counts by kind, tag, auth, status.
 */
router.get('/summary', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [byKind] = await promisePool.query(
      `SELECT kind, status, COUNT(*) AS count FROM admin_capabilities GROUP BY kind, status ORDER BY kind, status`
    );
    const [byAuth] = await promisePool.query(
      `SELECT auth, COUNT(*) AS count FROM admin_capabilities WHERE status = 'active' GROUP BY auth ORDER BY auth`
    );
    const [lastRun] = await promisePool.query(
      `SELECT * FROM admin_capability_runs ORDER BY started_at DESC LIMIT 1`
    );

    res.json({
      success: true,
      summary: {
        byKind,
        byAuth,
        lastRun: lastRun[0] || null,
      },
    });
  } catch (error) {
    console.error('[Capabilities] Error getting summary:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities summary',
      message: error.message,
    });
  }
});

/**
 * Parse JSON safely, returning fallback on error.
 */
function safeParseJSON(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val; // Already parsed by mysql2
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

module.exports = router;
