/**
 * ocr-preferences.js — Self-service proxy for church-scoped OCR settings.
 *
 * Mounted at /api/my/ocr-preferences in index.ts.
 *
 * Proxies to the tenant-DB ocr_settings table via the user's church_id.
 * Only exposes settings appropriate for church administrators (not dev internals).
 *
 * GET  / — Read current church OCR preferences (with defaults)
 * PUT  / — Update church OCR preferences (partial, non-destructive)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAppPool } = require('../config/db-compat');

// Roles that can manage OCR preferences
const OCR_ADMIN_ROLES = ['super_admin', 'admin', 'church_admin'];

// Default values (match server/src/routes/ocr/settings.ts)
const DEFAULTS = {
  language: 'eng',
  defaultLanguage: 'en',
  confidenceThreshold: 75,
  deskew: true,
  removeNoise: true,
  preprocessImages: true,
  documentProcessing: {
    spellingCorrection: 'fix',
    extractAllText: 'yes',
    improveFormatting: 'yes',
  },
  documentDeletion: {
    deleteAfter: 7,
    deleteUnit: 'days',
  },
};

// Language code mapping: ISO 639-2/T → ISO 639-1
const LANG_MAP = {
  eng: 'en', ell: 'el', grc: 'gr', rus: 'ru',
  ron: 'ro', srp: 'sr', bul: 'bg', ukr: 'uk',
};

function resolveChurchPool(churchId) {
  const { getTenantPool } = require('../config/db');
  return getTenantPool(churchId);
}

// GET /api/my/ocr-preferences
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const userRole = req.user?.role || req.session?.user?.role;
    const churchId = req.user?.church_id || req.session?.user?.church_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!churchId) {
      return res.status(400).json({ success: false, message: 'No church association' });
    }
    if (!OCR_ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // Check if OCR is enabled for this church
    const [churches] = await getAppPool().query(
      'SELECT enable_ocr FROM churches WHERE id = ?',
      [churchId]
    );
    const ocrEnabled = churches.length > 0 ? Boolean(churches[0].enable_ocr) : true;

    const db = resolveChurchPool(churchId);
    let settings = { ...DEFAULTS };

    try {
      const [rows] = await db.query(`
        SELECT engine, language, default_language, dpi, deskew, remove_noise,
               preprocess_images, confidence_threshold, settings_json
        FROM ocr_settings
        WHERE church_id = ?
        LIMIT 1
      `, [churchId]);

      if (rows.length > 0) {
        const s = rows[0];
        settings.language = s.language || DEFAULTS.language;
        settings.defaultLanguage = s.default_language || LANG_MAP[settings.language] || 'en';
        settings.confidenceThreshold = s.confidence_threshold != null
          ? Math.round(Number(s.confidence_threshold) * 100)
          : DEFAULTS.confidenceThreshold;
        settings.deskew = s.deskew != null ? Boolean(s.deskew) : DEFAULTS.deskew;
        settings.removeNoise = s.remove_noise != null ? Boolean(s.remove_noise) : DEFAULTS.removeNoise;
        settings.preprocessImages = s.preprocess_images != null ? Boolean(s.preprocess_images) : DEFAULTS.preprocessImages;

        if (s.settings_json) {
          try {
            const json = typeof s.settings_json === 'string' ? JSON.parse(s.settings_json) : s.settings_json;
            if (json.documentProcessing) settings.documentProcessing = json.documentProcessing;
            if (json.documentDeletion) settings.documentDeletion = json.documentDeletion;
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (dbErr) {
      // Table may not exist yet — return defaults
      console.warn('[OCR Preferences] ocr_settings table not found, using defaults:', dbErr.message);
    }

    res.json({ success: true, preferences: settings, ocrEnabled });
  } catch (error) {
    console.error('Error fetching OCR preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OCR preferences' });
  }
});

// PUT /api/my/ocr-preferences
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const userRole = req.user?.role || req.session?.user?.role;
    const churchId = req.user?.church_id || req.session?.user?.church_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!churchId) {
      return res.status(400).json({ success: false, message: 'No church association' });
    }
    if (!OCR_ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const body = req.body;

    // Validate language if provided
    const VALID_LANGUAGES = ['eng', 'ell', 'grc', 'rus', 'ron', 'srp', 'bul', 'ukr'];
    if (body.language !== undefined && !VALID_LANGUAGES.includes(body.language)) {
      return res.status(400).json({ success: false, message: 'Invalid language code' });
    }

    // Validate confidence threshold if provided
    if (body.confidenceThreshold !== undefined) {
      const ct = Number(body.confidenceThreshold);
      if (isNaN(ct) || ct < 0 || ct > 100) {
        return res.status(400).json({ success: false, message: 'Confidence threshold must be between 0 and 100' });
      }
    }

    // Validate document deletion if provided
    if (body.documentDeletion) {
      const { deleteAfter, deleteUnit } = body.documentDeletion;
      if (deleteUnit && !['minutes', 'hours', 'days'].includes(deleteUnit)) {
        return res.status(400).json({ success: false, message: 'Invalid deletion unit' });
      }
      if (deleteAfter !== undefined) {
        const val = Number(deleteAfter);
        if (isNaN(val) || val < 1) {
          return res.status(400).json({ success: false, message: 'Deletion period must be at least 1' });
        }
      }
    }

    const db = resolveChurchPool(churchId);

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        engine VARCHAR(50) DEFAULT 'google-vision',
        language VARCHAR(10) DEFAULT 'eng',
        default_language CHAR(2) DEFAULT 'en',
        dpi INT DEFAULT 300,
        deskew TINYINT(1) DEFAULT 1,
        remove_noise TINYINT(1) DEFAULT 1,
        preprocess_images TINYINT(1) DEFAULT 1,
        output_format VARCHAR(20) DEFAULT 'json',
        confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
        preprocessing_enabled TINYINT(1) DEFAULT 1,
        auto_contrast TINYINT(1) DEFAULT 1,
        auto_rotate TINYINT(1) DEFAULT 1,
        noise_reduction TINYINT(1) DEFAULT 1,
        settings_json JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_settings (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Build partial SET clause (only update provided fields)
    const setClauses = [];
    const params = [];

    if (body.language !== undefined) {
      setClauses.push('language = ?');
      params.push(body.language);
      setClauses.push('default_language = ?');
      params.push(LANG_MAP[body.language] || body.language.substring(0, 2));
    }
    if (body.confidenceThreshold !== undefined) {
      setClauses.push('confidence_threshold = ?');
      params.push(Number(body.confidenceThreshold) / 100);
    }
    if (body.deskew !== undefined) {
      setClauses.push('deskew = ?', 'auto_rotate = ?');
      params.push(body.deskew ? 1 : 0, body.deskew ? 1 : 0);
    }
    if (body.removeNoise !== undefined) {
      setClauses.push('remove_noise = ?', 'noise_reduction = ?');
      params.push(body.removeNoise ? 1 : 0, body.removeNoise ? 1 : 0);
    }
    if (body.preprocessImages !== undefined) {
      setClauses.push('preprocess_images = ?', 'preprocessing_enabled = ?');
      params.push(body.preprocessImages ? 1 : 0, body.preprocessImages ? 1 : 0);
    }

    // Handle settings_json (documentProcessing + documentDeletion)
    let settingsJsonUpdate = null;
    if (body.documentProcessing || body.documentDeletion) {
      // Read current settings_json first
      let current = {};
      try {
        const [existing] = await db.query('SELECT settings_json FROM ocr_settings WHERE church_id = ?', [churchId]);
        if (existing.length > 0 && existing[0].settings_json) {
          current = typeof existing[0].settings_json === 'string'
            ? JSON.parse(existing[0].settings_json) : existing[0].settings_json;
        }
      } catch { /* ignore */ }

      if (body.documentProcessing) current.documentProcessing = body.documentProcessing;
      if (body.documentDeletion) current.documentDeletion = body.documentDeletion;
      settingsJsonUpdate = JSON.stringify(current);
    }

    if (setClauses.length === 0 && !settingsJsonUpdate) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // UPSERT: insert with defaults or update existing
    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      if (settingsJsonUpdate) {
        setClauses.push('settings_json = ?');
        params.push(settingsJsonUpdate);
      }
      params.push(churchId); // for WHERE

      // Check if row exists
      const [existing] = await db.query('SELECT id FROM ocr_settings WHERE church_id = ?', [churchId]);
      if (existing.length > 0) {
        await db.query(`UPDATE ocr_settings SET ${setClauses.join(', ')} WHERE church_id = ?`, params);
      } else {
        // Insert with defaults then update
        await db.query('INSERT INTO ocr_settings (church_id) VALUES (?)', [churchId]);
        await db.query(`UPDATE ocr_settings SET ${setClauses.join(', ')} WHERE church_id = ?`, params);
      }
    } else if (settingsJsonUpdate) {
      const [existing] = await db.query('SELECT id FROM ocr_settings WHERE church_id = ?', [churchId]);
      if (existing.length > 0) {
        await db.query('UPDATE ocr_settings SET settings_json = ?, updated_at = NOW() WHERE church_id = ?', [settingsJsonUpdate, churchId]);
      } else {
        await db.query('INSERT INTO ocr_settings (church_id, settings_json) VALUES (?, ?)', [churchId, settingsJsonUpdate]);
      }
    }

    console.log(`✅ OCR preferences updated for church ${churchId} by user ${userId}`);
    res.json({ success: true, message: 'OCR preferences saved successfully' });
  } catch (error) {
    console.error('Error saving OCR preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to save OCR preferences' });
  }
});

module.exports = router;
