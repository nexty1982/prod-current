/**
 * Admin Settings API
 *
 * GET    /api/admin/settings          — list/search settings (registry + effective values)
 * PUT    /api/admin/settings          — upsert an override
 * DELETE /api/admin/settings          — remove an override (revert to default)
 * GET    /api/admin/settings/audit    — audit trail for a key
 * GET    /api/admin/settings/categories — distinct categories
 *
 * All endpoints require super_admin role.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { promisePool } = require('../../config/db');

const requireSuperAdmin = requireRole(['super_admin']);

// ─────────────────────────────────────────────────────────────
// Helper: getEffectiveSetting(key, { churchId? })
// Returns the effective value for a single key with short cache.
// ─────────────────────────────────────────────────────────────
const _settingsCache = new Map(); // key => { value, expires }
const CACHE_TTL = 30_000; // 30 seconds

async function getEffectiveSetting(key, { churchId } = {}) {
    const cacheKey = `${key}:${churchId || 'global'}`;
    const cached = _settingsCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    // Look for override: church scope first, then global, then default
    let value;

    if (churchId) {
        const [rows] = await promisePool.query(
            `SELECT value FROM settings_overrides WHERE \`key\` = ? AND scope = 'church' AND scope_id = ? LIMIT 1`,
            [key, churchId]
        );
        if (rows.length) value = rows[0].value;
    }

    if (value === undefined) {
        const [rows] = await promisePool.query(
            `SELECT value FROM settings_overrides WHERE \`key\` = ? AND scope = 'global' LIMIT 1`,
            [key]
        );
        if (rows.length) value = rows[0].value;
    }

    if (value === undefined) {
        const [rows] = await promisePool.query(
            `SELECT default_value FROM settings_registry WHERE \`key\` = ? LIMIT 1`,
            [key]
        );
        if (rows.length) value = rows[0].default_value;
    }

    _settingsCache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL });
    return value;
}

// Export helper for other server modules
router.getEffectiveSetting = getEffectiveSetting;

// ─────────────────────────────────────────────────────────────
// GET /api/admin/settings
// ─────────────────────────────────────────────────────────────
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { q, category, scope, churchId } = req.query;

        // Build registry query
        let sql = `SELECT r.\`key\`, r.\`type\`, r.category, r.description,
                          r.default_value, r.enum_values_json, r.is_sensitive,
                          r.created_at, r.updated_at
                   FROM settings_registry r WHERE 1=1`;
        const params = [];

        if (q) {
            sql += ` AND (r.\`key\` LIKE ? OR r.description LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        if (category) {
            sql += ` AND r.category = ?`;
            params.push(category);
        }

        sql += ` ORDER BY r.category, r.\`key\``;

        const [registryRows] = await promisePool.query(sql, params);

        // Fetch all overrides (optionally filtered by scope)
        let overrideSql = `SELECT \`key\`, scope, scope_id, value, updated_by, updated_at
                           FROM settings_overrides WHERE 1=1`;
        const overrideParams = [];

        if (scope === 'church' && churchId) {
            overrideSql += ` AND ((scope = 'church' AND scope_id = ?) OR scope = 'global')`;
            overrideParams.push(churchId);
        } else if (scope === 'global') {
            overrideSql += ` AND scope = 'global'`;
        }
        // else: fetch all overrides

        const [overrideRows] = await promisePool.query(overrideSql, overrideParams);

        // Build lookup maps
        const globalOverrides = new Map();
        const churchOverrides = new Map();
        for (const ov of overrideRows) {
            if (ov.scope === 'global') {
                globalOverrides.set(ov.key, ov);
            } else if (ov.scope === 'church') {
                churchOverrides.set(`${ov.key}:${ov.scope_id}`, ov);
            }
        }

        // Compose response rows
        const rows = registryRows.map(reg => {
            let effectiveValue = reg.default_value;
            let overridden = false;
            let overrideScope = null;
            let overrideScopeId = null;
            let overrideUpdatedAt = null;
            let overrideUpdatedBy = null;

            // Church override wins over global
            if (scope === 'church' && churchId) {
                const ck = `${reg.key}:${churchId}`;
                if (churchOverrides.has(ck)) {
                    const co = churchOverrides.get(ck);
                    effectiveValue = co.value;
                    overridden = true;
                    overrideScope = 'church';
                    overrideScopeId = co.scope_id;
                    overrideUpdatedAt = co.updated_at;
                    overrideUpdatedBy = co.updated_by;
                } else if (globalOverrides.has(reg.key)) {
                    const go = globalOverrides.get(reg.key);
                    effectiveValue = go.value;
                    overridden = true;
                    overrideScope = 'global';
                    overrideScopeId = null;
                    overrideUpdatedAt = go.updated_at;
                    overrideUpdatedBy = go.updated_by;
                }
            } else {
                // Global-only view
                if (globalOverrides.has(reg.key)) {
                    const go = globalOverrides.get(reg.key);
                    effectiveValue = go.value;
                    overridden = true;
                    overrideScope = 'global';
                    overrideScopeId = null;
                    overrideUpdatedAt = go.updated_at;
                    overrideUpdatedBy = go.updated_by;
                }
            }

            return {
                key: reg.key,
                type: reg.type,
                category: reg.category,
                description: reg.description,
                default_value: reg.default_value,
                enum_values_json: reg.enum_values_json,
                effective_value: reg.is_sensitive ? '••••••••' : effectiveValue,
                overridden,
                override_scope: overrideScope,
                override_scope_id: overrideScopeId,
                override_updated_at: overrideUpdatedAt,
                override_updated_by: overrideUpdatedBy,
                is_sensitive: !!reg.is_sensitive,
                updated_at: reg.updated_at,
            };
        });

        res.json({ success: true, rows, total: rows.length });
    } catch (err) {
        console.error('[Admin Settings] GET error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/settings  — upsert override
// ─────────────────────────────────────────────────────────────
router.put('/', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { key, scope = 'global', scope_id = null, value, reason } = req.body;
        const userId = req.session?.user?.id || null;

        if (!key) return res.status(400).json({ success: false, error: 'key is required' });

        // Validate key exists in registry
        const [regRows] = await promisePool.query(
            `SELECT \`type\`, enum_values_json FROM settings_registry WHERE \`key\` = ?`, [key]
        );
        if (!regRows.length) {
            return res.status(404).json({ success: false, error: `Unknown setting key: ${key}` });
        }

        const regType = regRows[0].type;

        // Type validation
        if (regType === 'bool' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
            return res.status(400).json({ success: false, error: 'Bool settings must be true/false' });
        }
        if (regType === 'number' && isNaN(Number(value))) {
            return res.status(400).json({ success: false, error: 'Number settings must be numeric' });
        }
        if (regType === 'json') {
            try { JSON.parse(value); } catch {
                return res.status(400).json({ success: false, error: 'JSON settings must be valid JSON' });
            }
        }
        if (regType === 'enum' && regRows[0].enum_values_json) {
            const allowed = JSON.parse(regRows[0].enum_values_json);
            if (!allowed.includes(value)) {
                return res.status(400).json({ success: false, error: `Value must be one of: ${allowed.join(', ')}` });
            }
        }

        // Fetch old value for audit
        const scopeId = scope === 'church' ? scope_id : null;
        const [oldRows] = await promisePool.query(
            `SELECT value FROM settings_overrides WHERE \`key\` = ? AND scope = ? AND scope_id <=> ?`,
            [key, scope, scopeId]
        );
        const oldValue = oldRows.length ? oldRows[0].value : null;

        // Upsert override
        await promisePool.query(`
            INSERT INTO settings_overrides (\`key\`, scope, scope_id, value, updated_by)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)
        `, [key, scope, scopeId, String(value), userId]);

        // Write audit
        await promisePool.query(`
            INSERT INTO settings_audit (\`key\`, scope, scope_id, old_value, new_value, changed_by, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [key, scope, scopeId, oldValue, String(value), userId, reason || null]);

        // Invalidate cache
        _settingsCache.delete(`${key}:${scopeId || 'global'}`);
        _settingsCache.delete(`${key}:global`);

        res.json({ success: true, message: `Setting ${key} updated` });
    } catch (err) {
        console.error('[Admin Settings] PUT error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/settings  — remove override (revert to default)
// ─────────────────────────────────────────────────────────────
router.delete('/', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { key, scope = 'global', scope_id = null, reason } = req.body;
        const userId = req.session?.user?.id || null;

        if (!key) return res.status(400).json({ success: false, error: 'key is required' });

        const scopeId = scope === 'church' ? scope_id : null;

        // Fetch old value for audit
        const [oldRows] = await promisePool.query(
            `SELECT value FROM settings_overrides WHERE \`key\` = ? AND scope = ? AND scope_id <=> ?`,
            [key, scope, scopeId]
        );
        if (!oldRows.length) {
            return res.status(404).json({ success: false, error: 'No override found for this key/scope' });
        }

        const oldValue = oldRows[0].value;

        // Delete override
        await promisePool.query(
            `DELETE FROM settings_overrides WHERE \`key\` = ? AND scope = ? AND scope_id <=> ?`,
            [key, scope, scopeId]
        );

        // Write audit
        await promisePool.query(`
            INSERT INTO settings_audit (\`key\`, scope, scope_id, old_value, new_value, changed_by, reason)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
        `, [key, scope, scopeId, oldValue, userId, reason || 'Reverted to default']);

        // Invalidate cache
        _settingsCache.delete(`${key}:${scopeId || 'global'}`);
        _settingsCache.delete(`${key}:global`);

        res.json({ success: true, message: `Override for ${key} removed` });
    } catch (err) {
        console.error('[Admin Settings] DELETE error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/settings/audit?key=...&limit=50
// ─────────────────────────────────────────────────────────────
router.get('/audit', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { key, limit = 50 } = req.query;

        let sql = `SELECT * FROM settings_audit WHERE 1=1`;
        const params = [];

        if (key) {
            sql += ` AND \`key\` = ?`;
            params.push(key);
        }

        sql += ` ORDER BY changed_at DESC LIMIT ?`;
        params.push(Number(limit));

        const [rows] = await promisePool.query(sql, params);
        res.json({ success: true, rows });
    } catch (err) {
        console.error('[Admin Settings] Audit GET error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/settings/categories
// ─────────────────────────────────────────────────────────────
router.get('/categories', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT DISTINCT category FROM settings_registry WHERE category IS NOT NULL ORDER BY category`
        );
        res.json({ success: true, categories: rows.map(r => r.category) });
    } catch (err) {
        console.error('[Admin Settings] Categories GET error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
