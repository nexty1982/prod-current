/**
 * Shared settings helper — getEffectiveSetting(key, { churchId })
 *
 * Resolves the effective value for a settings_registry key:
 *   church override → global override → registry default
 *
 * Includes a short in-memory cache (30 s) to avoid per-request DB hits.
 */

const { promisePool } = require('../config/db');

const _settingsCache = new Map(); // key => { value, expires }
const CACHE_TTL = 30_000; // 30 seconds

/**
 * @param {string} key   — registry key, e.g. 'records.search.baptism.last_name'
 * @param {{ churchId?: number|string }} [opts]
 * @returns {Promise<string|undefined>} the effective value as a string, or undefined if key unknown
 */
async function getEffectiveSetting(key, { churchId } = {}) {
    const cacheKey = `${key}:${churchId || 'global'}`;
    const cached = _settingsCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    let value;

    // 1. Church-scoped override
    if (churchId) {
        const [rows] = await promisePool.query(
            `SELECT value FROM settings_overrides WHERE \`key\` = ? AND scope = 'church' AND scope_id = ? LIMIT 1`,
            [key, churchId]
        );
        if (rows.length) value = rows[0].value;
    }

    // 2. Global override
    if (value === undefined) {
        const [rows] = await promisePool.query(
            `SELECT value FROM settings_overrides WHERE \`key\` = ? AND scope = 'global' LIMIT 1`,
            [key]
        );
        if (rows.length) value = rows[0].value;
    }

    // 3. Registry default
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

/**
 * Invalidate cached entries for a key (all scopes).
 */
function invalidateSettingCache(key, scopeId) {
    _settingsCache.delete(`${key}:${scopeId || 'global'}`);
    _settingsCache.delete(`${key}:global`);
}

module.exports = { getEffectiveSetting, invalidateSettingCache, _settingsCache };
