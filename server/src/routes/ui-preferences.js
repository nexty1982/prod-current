const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const TABLE_NAME = '_ui_preferences';
const CHURCH_ID_PLACEHOLDER = 0;

/**
 * GET /api/my/ui-preferences
 * Returns the current user's UI preferences (fab positions, etc.)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const [rows] = await getAppPool().query(
      'SELECT settings_json FROM user_table_settings WHERE user_id = ? AND church_id = ? AND table_name = ? LIMIT 1',
      [userId, CHURCH_ID_PLACEHOLDER, TABLE_NAME]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const data = typeof rows[0].settings_json === 'string'
      ? JSON.parse(rows[0].settings_json)
      : rows[0].settings_json;

    res.json({ success: true, data });
  } catch (error) {
    console.error('[ui-preferences] GET error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch UI preferences' });
  }
});

/**
 * PUT /api/my/ui-preferences
 * Upserts the current user's UI preferences.
 * Body: { fabPositions: { "om-assistant": { right, bottom }, ... } }
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const preferences = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ success: false, error: 'Request body must be a JSON object' });
    }

    const settingsJson = JSON.stringify(preferences);

    const [existing] = await getAppPool().query(
      'SELECT id FROM user_table_settings WHERE user_id = ? AND church_id = ? AND table_name = ?',
      [userId, CHURCH_ID_PLACEHOLDER, TABLE_NAME]
    );

    if (existing.length > 0) {
      await getAppPool().query(
        'UPDATE user_table_settings SET settings_json = ?, updated_at = NOW() WHERE user_id = ? AND church_id = ? AND table_name = ?',
        [settingsJson, userId, CHURCH_ID_PLACEHOLDER, TABLE_NAME]
      );
    } else {
      await getAppPool().query(
        'INSERT INTO user_table_settings (user_id, church_id, table_name, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [userId, CHURCH_ID_PLACEHOLDER, TABLE_NAME, settingsJson]
      );
    }

    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('[ui-preferences] PUT error:', error);
    res.status(500).json({ success: false, error: 'Failed to save UI preferences' });
  }
});

module.exports = router;
