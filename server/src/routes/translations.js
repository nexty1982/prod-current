/**
 * Translation Management API
 *
 * Professional translation workflow with source-versioned English text,
 * hash-based staleness detection, and per-language status tracking.
 *
 * Public endpoints:
 *   GET /api/translations/render/:lang          — Bulk fetch for page render (replaces /api/i18n/:lang)
 *   GET /api/translations/languages              — List supported languages
 *
 * Admin endpoints (super_admin):
 *   GET  /api/translations/source                — List/search source keys
 *   GET  /api/translations/source/:key           — Get single source key
 *   PUT  /api/translations/source/:key           — Update English source text
 *   POST /api/translations/source                — Create new source key
 *
 *   GET  /api/translations/localized             — List/filter translations by lang/status/namespace
 *   PUT  /api/translations/localized             — Upsert a translation
 *   PUT  /api/translations/localized/mark-current — Mark translation as current (after review)
 *
 *   GET  /api/translations/stats                 — Summary counters by language/namespace/status
 *   GET  /api/translations/changelog             — Recent English source changes
 *   POST /api/translations/bulk-status-update    — Recompute all statuses based on current hashes
 *
 * Mounted at /api/translations
 */

const express = require('express');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db');
const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────

function md5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

// In-memory cache for public render endpoint
const renderCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function invalidateRenderCache(lang) {
  if (lang) {
    // Invalidate specific language + all entries containing it
    for (const key of Object.keys(renderCache)) {
      if (key === lang || key.startsWith(lang + ':')) {
        delete renderCache[key];
      }
    }
  } else {
    // Invalidate everything
    for (const key of Object.keys(renderCache)) delete renderCache[key];
  }
}

function parseNamespaces(ns) {
  if (!ns) return null;
  const parts = String(ns).split(',').map(s => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts.sort() : null;
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /render/:lang[?ns=common,home]
 * Efficient bulk fetch for frontend rendering.
 * Returns flat { key: translatedText } with English fallback.
 */
router.get('/render/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const namespaces = parseNamespaces(req.query.ns);
    const cacheKey = namespaces ? `${lang}:${namespaces.join(',')}` : lang;

    // Check cache
    const cached = renderCache[cacheKey];
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const pool = getAppPool();

    // Build English base from translations_source
    let sourceQuery = 'SELECT translation_key, english_text FROM translations_source WHERE is_active = 1';
    const sourceParams = [];
    if (namespaces) {
      sourceQuery += ` AND namespace IN (${namespaces.map(() => '?').join(',')})`;
      sourceParams.push(...namespaces);
    }
    const [sourceRows] = await pool.query(sourceQuery, sourceParams);

    const result = {};
    for (const row of sourceRows) {
      result[row.translation_key] = row.english_text;
    }

    // If not English, overlay with localized translations
    if (lang !== 'en') {
      let locQuery = `SELECT tl.translation_key, tl.translated_text
                       FROM translations_localized tl
                       INNER JOIN translations_source ts ON ts.translation_key = tl.translation_key AND ts.is_active = 1
                       WHERE tl.language_code = ? AND tl.status IN ('current', 'review', 'outdated', 'draft')`;
      const locParams = [lang];
      if (namespaces) {
        locQuery += ` AND ts.namespace IN (${namespaces.map(() => '?').join(',')})`;
        locParams.push(...namespaces);
      }
      const [locRows] = await pool.query(locQuery, locParams);
      for (const row of locRows) {
        result[row.translation_key] = row.translated_text;
      }
    }

    // Cache
    renderCache[cacheKey] = { data: result, ts: Date.now() };
    return res.json(result);
  } catch (err) {
    console.error('[translations] render error:', err.message);
    // On error, try to return cached data or empty
    return res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

/**
 * GET /languages
 * List supported languages from the languages table.
 */
router.get('/languages', async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT code, name_native, name_english, rtl, is_active FROM languages WHERE is_active = 1 ORDER BY code'
    );
    res.json({ languages: rows });
  } catch (err) {
    console.error('[translations] languages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS — require super_admin
// ═══════════════════════════════════════════════════════════════════════

const adminAuth = [requireAuth, requireRole(['super_admin'])];

// ─── Source keys ─────────────────────────────────────────────────────

/**
 * GET /source?namespace=home&search=hero&page=1&limit=50
 * List/search English source keys.
 */
router.get('/source', adminAuth, async (req, res) => {
  try {
    const { namespace, search, page = 1, limit = 100 } = req.query;
    const pool = getAppPool();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (namespace) {
      where += ' AND namespace = ?';
      params.push(namespace);
    }
    if (search) {
      where += ' AND (translation_key LIKE ? OR english_text LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM translations_source ${where}`, params
    );

    const [rows] = await pool.query(
      `SELECT id, translation_key, namespace, english_text, english_hash, description, is_active, updated_at, updated_by
       FROM translations_source ${where}
       ORDER BY namespace, translation_key
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get namespaces for filter dropdown
    const [nsRows] = await pool.query(
      'SELECT DISTINCT namespace, COUNT(*) as count FROM translations_source GROUP BY namespace ORDER BY namespace'
    );

    res.json({ rows, total, namespaces: nsRows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[translations] source list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch source keys' });
  }
});

/**
 * GET /source/:key
 * Get single source key with all its localized translations.
 */
router.get('/source/:key(*)', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const pool = getAppPool();

    const [srcRows] = await pool.query(
      'SELECT * FROM translations_source WHERE translation_key = ?', [key]
    );
    if (srcRows.length === 0) {
      return res.status(404).json({ error: 'Source key not found' });
    }

    const [locRows] = await pool.query(
      `SELECT language_code, translated_text, translated_from_hash, status, notes, updated_at, updated_by
       FROM translations_localized WHERE translation_key = ?`, [key]
    );

    res.json({ source: srcRows[0], localizations: locRows });
  } catch (err) {
    console.error('[translations] source get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch source key' });
  }
});

/**
 * PUT /source/:key
 * Update English source text. Automatically:
 * - Recomputes hash
 * - Marks all localized entries with old hash as 'outdated'
 * - Logs change in translation_change_log
 */
router.put('/source/:key(*)', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { english_text, description } = req.body;

    if (!english_text || !english_text.trim()) {
      return res.status(400).json({ error: 'english_text is required' });
    }

    const pool = getAppPool();
    const userId = req.session?.user?.id || null;

    // Get current state
    const [existing] = await pool.query(
      'SELECT english_text, english_hash FROM translations_source WHERE translation_key = ?', [key]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Source key not found' });
    }

    const oldText = existing[0].english_text;
    const oldHash = existing[0].english_hash;
    const newText = english_text.trim();
    const newHash = md5(newText);

    // If text hasn't changed, no-op
    if (oldHash === newHash) {
      return res.json({ success: true, changed: false, message: 'Text unchanged' });
    }

    // Update source
    const updateFields = ['english_text = ?', 'english_hash = ?', 'updated_by = ?'];
    const updateParams = [newText, newHash, userId];
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    await pool.query(
      `UPDATE translations_source SET ${updateFields.join(', ')} WHERE translation_key = ?`,
      [...updateParams, key]
    );

    // Mark localized entries as outdated (only those that were 'current')
    const [outdatedResult] = await pool.query(
      `UPDATE translations_localized
       SET status = 'outdated', updated_at = NOW()
       WHERE translation_key = ? AND status = 'current'`,
      [key]
    );

    // Log the change
    await pool.query(
      `INSERT INTO translation_change_log (translation_key, old_english_text, new_english_text, old_hash, new_hash, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [key, oldText, newText, oldHash, newHash, userId]
    );

    invalidateRenderCache(null); // Invalidate all caches since English changed

    res.json({
      success: true,
      changed: true,
      old_hash: oldHash,
      new_hash: newHash,
      outdated_count: outdatedResult.affectedRows,
    });
  } catch (err) {
    console.error('[translations] source update error:', err.message);
    res.status(500).json({ error: 'Failed to update source key' });
  }
});

/**
 * POST /source
 * Create a new source key.
 */
router.post('/source', adminAuth, async (req, res) => {
  try {
    const { translation_key, english_text, namespace, description } = req.body;

    if (!translation_key || !english_text || !namespace) {
      return res.status(400).json({ error: 'translation_key, english_text, and namespace are required' });
    }

    // Validate key format
    if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*$/.test(translation_key)) {
      return res.status(400).json({ error: 'Key must be dot-namespaced lowercase (e.g., home.hero_title)' });
    }

    // Key must start with namespace
    if (!translation_key.startsWith(namespace + '.')) {
      return res.status(400).json({ error: `Key must start with namespace prefix: ${namespace}.` });
    }

    const pool = getAppPool();
    const userId = req.session?.user?.id || null;
    const hash = md5(english_text.trim());

    const [result] = await pool.query(
      `INSERT INTO translations_source (translation_key, namespace, english_text, english_hash, description, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [translation_key, namespace, english_text.trim(), hash, description || null, userId]
    );

    invalidateRenderCache(null);

    res.status(201).json({
      success: true,
      id: result.insertId,
      translation_key,
      english_hash: hash,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Translation key already exists' });
    }
    console.error('[translations] source create error:', err.message);
    res.status(500).json({ error: 'Failed to create source key' });
  }
});

// ─── Localized translations ──────────────────────────────────────────

/**
 * GET /localized?lang=el&namespace=home&status=outdated&search=hero&page=1&limit=50
 * List translations with full source context, filterable by language/status/namespace/search.
 */
router.get('/localized', adminAuth, async (req, res) => {
  try {
    const { lang, namespace, status, search, page = 1, limit = 50 } = req.query;
    const pool = getAppPool();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    if (!lang) {
      return res.status(400).json({ error: 'lang query parameter is required' });
    }

    const params = [lang];
    let where = 'WHERE ts.is_active = 1';

    // We use LEFT JOIN so we can show 'missing' translations too
    let statusFilter = '';
    if (status === 'missing') {
      // Only show keys that have NO localized entry for this language
      statusFilter = ' AND tl.id IS NULL';
    } else if (status) {
      statusFilter = ' AND tl.status = ?';
      params.push(status);
    }

    if (namespace) {
      where += ' AND ts.namespace = ?';
      params.push(namespace);
    }
    if (search) {
      where += ' AND (ts.translation_key LIKE ? OR ts.english_text LIKE ? OR tl.translated_text LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM translations_source ts
      LEFT JOIN translations_localized tl ON tl.translation_key = ts.translation_key AND tl.language_code = ?
      ${where} ${statusFilter}`;
    const [[{ total }]] = await pool.query(countSql, params);

    // Data query
    const dataSql = `
      SELECT
        ts.translation_key,
        ts.namespace,
        ts.english_text,
        ts.english_hash,
        ts.description,
        ts.updated_at as source_updated_at,
        tl.translated_text,
        tl.translated_from_hash,
        tl.status,
        tl.notes,
        tl.updated_at as translation_updated_at,
        tl.updated_by,
        CASE
          WHEN tl.id IS NULL THEN 'missing'
          WHEN tl.translated_from_hash != ts.english_hash THEN 'outdated'
          ELSE tl.status
        END as derived_status
      FROM translations_source ts
      LEFT JOIN translations_localized tl ON tl.translation_key = ts.translation_key AND tl.language_code = ?
      ${where} ${statusFilter}
      ORDER BY
        FIELD(CASE
          WHEN tl.id IS NULL THEN 'missing'
          WHEN tl.translated_from_hash != ts.english_hash THEN 'outdated'
          ELSE tl.status
        END, 'missing', 'outdated', 'draft', 'review', 'current'),
        ts.namespace, ts.translation_key
      LIMIT ? OFFSET ?`;

    const [rows] = await pool.query(dataSql, [...params, parseInt(limit), offset]);

    res.json({ rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[translations] localized list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

/**
 * PUT /localized
 * Upsert a translation for a specific key+language.
 * Body: { translation_key, language_code, translated_text, notes?, status? }
 */
router.put('/localized', adminAuth, async (req, res) => {
  try {
    const { translation_key, language_code, translated_text, notes, status } = req.body;

    if (!translation_key || !language_code || translated_text == null) {
      return res.status(400).json({ error: 'translation_key, language_code, and translated_text are required' });
    }

    const pool = getAppPool();
    const userId = req.session?.user?.id || null;

    // Verify source key exists and get current hash
    const [srcRows] = await pool.query(
      'SELECT english_hash FROM translations_source WHERE translation_key = ? AND is_active = 1',
      [translation_key]
    );
    if (srcRows.length === 0) {
      return res.status(404).json({ error: 'Source key not found or inactive' });
    }

    // Verify language is valid
    const [langRows] = await pool.query(
      'SELECT code FROM languages WHERE code = ? AND is_active = 1', [language_code]
    );
    if (langRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive language code' });
    }

    const currentHash = srcRows[0].english_hash;
    // Default status is 'draft' for new saves; if explicitly provided use it
    const saveStatus = status || 'draft';
    const validStatuses = ['draft', 'review', 'current'];
    if (!validStatuses.includes(saveStatus)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    await pool.query(
      `INSERT INTO translations_localized
         (translation_key, language_code, translated_text, translated_from_hash, status, notes, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         translated_text = VALUES(translated_text),
         translated_from_hash = VALUES(translated_from_hash),
         status = VALUES(status),
         notes = VALUES(notes),
         updated_by = VALUES(updated_by)`,
      [translation_key, language_code, translated_text.trim(), currentHash, saveStatus, notes || null, userId]
    );

    invalidateRenderCache(language_code);

    res.json({ success: true, translated_from_hash: currentHash, status: saveStatus });
  } catch (err) {
    console.error('[translations] localized upsert error:', err.message);
    res.status(500).json({ error: 'Failed to save translation' });
  }
});

/**
 * PUT /localized/mark-current
 * Mark a translation as 'current' (after review).
 * Also updates translated_from_hash to current source hash.
 * Body: { translation_key, language_code }
 */
router.put('/localized/mark-current', adminAuth, async (req, res) => {
  try {
    const { translation_key, language_code } = req.body;

    if (!translation_key || !language_code) {
      return res.status(400).json({ error: 'translation_key and language_code are required' });
    }

    const pool = getAppPool();

    // Get current source hash
    const [srcRows] = await pool.query(
      'SELECT english_hash FROM translations_source WHERE translation_key = ? AND is_active = 1',
      [translation_key]
    );
    if (srcRows.length === 0) {
      return res.status(404).json({ error: 'Source key not found' });
    }

    const [result] = await pool.query(
      `UPDATE translations_localized
       SET status = 'current', translated_from_hash = ?, updated_at = NOW()
       WHERE translation_key = ? AND language_code = ?`,
      [srcRows[0].english_hash, translation_key, language_code]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Translation not found' });
    }

    invalidateRenderCache(language_code);
    res.json({ success: true });
  } catch (err) {
    console.error('[translations] mark-current error:', err.message);
    res.status(500).json({ error: 'Failed to mark translation as current' });
  }
});

// ─── Stats & utilities ───────────────────────────────────────────────

/**
 * GET /stats?namespace=home
 * Summary counters by language and status.
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { namespace } = req.query;
    const pool = getAppPool();

    // Total active source keys
    let sourceWhere = 'WHERE is_active = 1';
    const sourceParams = [];
    if (namespace) {
      sourceWhere += ' AND namespace = ?';
      sourceParams.push(namespace);
    }
    const [[{ total_keys }]] = await pool.query(
      `SELECT COUNT(*) as total_keys FROM translations_source ${sourceWhere}`, sourceParams
    );

    // Get all active languages (non-English)
    const [langs] = await pool.query(
      "SELECT code, name_english FROM languages WHERE is_active = 1 AND code != 'en' ORDER BY code"
    );

    // Per-language stats
    const byLanguage = {};
    for (const lang of langs) {
      const params = [lang.code];
      let nsFilter = '';
      if (namespace) {
        nsFilter = ' AND ts.namespace = ?';
        params.push(namespace);
      }

      // Count by derived status
      const [statusRows] = await pool.query(`
        SELECT
          CASE
            WHEN tl.id IS NULL THEN 'missing'
            WHEN tl.translated_from_hash != ts.english_hash THEN 'outdated'
            ELSE tl.status
          END as derived_status,
          COUNT(*) as count
        FROM translations_source ts
        LEFT JOIN translations_localized tl
          ON tl.translation_key = ts.translation_key AND tl.language_code = ?
        WHERE ts.is_active = 1 ${nsFilter}
        GROUP BY derived_status`,
        params
      );

      const counts = { missing: 0, outdated: 0, draft: 0, review: 0, current: 0 };
      for (const row of statusRows) {
        counts[row.derived_status] = row.count;
      }
      byLanguage[lang.code] = {
        name: lang.name_english,
        ...counts,
        total: total_keys,
        completion_pct: total_keys > 0 ? Math.round((counts.current / total_keys) * 100) : 0,
      };
    }

    // Per-namespace breakdown
    const [nsCounts] = await pool.query(
      'SELECT namespace, COUNT(*) as count FROM translations_source WHERE is_active = 1 GROUP BY namespace ORDER BY namespace'
    );

    res.json({
      total_keys,
      by_language: byLanguage,
      namespaces: nsCounts,
    });
  } catch (err) {
    console.error('[translations] stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /changelog?key=home.hero_title&page=1&limit=20
 * Recent English source changes.
 */
router.get('/changelog', adminAuth, async (req, res) => {
  try {
    const { key, page = 1, limit = 20 } = req.query;
    const pool = getAppPool();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let where = '';

    if (key) {
      where = 'WHERE translation_key = ?';
      params.push(key);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM translation_change_log ${where}`, params
    );

    const [rows] = await pool.query(
      `SELECT * FROM translation_change_log ${where}
       ORDER BY changed_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[translations] changelog error:', err.message);
    res.status(500).json({ error: 'Failed to fetch changelog' });
  }
});

/**
 * POST /bulk-status-update
 * Recompute derived statuses for all localized entries.
 * Sets 'outdated' where translated_from_hash != current english_hash.
 * Useful after bulk English edits or migration.
 */
router.post('/bulk-status-update', adminAuth, async (req, res) => {
  try {
    const pool = getAppPool();

    // Mark as outdated where hash mismatch and currently 'current'
    const [outdated] = await pool.query(`
      UPDATE translations_localized tl
      INNER JOIN translations_source ts ON ts.translation_key = tl.translation_key
      SET tl.status = 'outdated', tl.updated_at = NOW()
      WHERE tl.translated_from_hash != ts.english_hash
        AND tl.status = 'current'
    `);

    invalidateRenderCache(null);

    res.json({
      success: true,
      outdated_count: outdated.affectedRows,
    });
  } catch (err) {
    console.error('[translations] bulk-status-update error:', err.message);
    res.status(500).json({ error: 'Failed to update statuses' });
  }
});

module.exports = router;
