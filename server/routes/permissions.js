// server/routes/permissions.js
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();
const { promisePool } = require('../config/db');

// Path to your permissionConfig.json
const CONFIG_FILE = path.join(__dirname, 'permissionConfig.json');

router.get('/', async (req, res) => {
      try {
          const [rows] = await promisePool.query(
              `SELECT
        id,
        username,
        email,
        is_admin,
        can_edit_baptism,
        can_edit_marriage,
        can_edit_funeral,
        landing_page,
        visible_menu_items
        FROM users`
          );
               res.json({ users: rows });
          } catch (err) {
                console.error('GET /users error:', err);
                res.status(500).json({ error: 'Database error fetching users' });
              }
    });

// ─── FIELDS METADATA ─────────────────────────────────────────────────────────
router.get('/fields-metadata', async (req, res) => {
      try {
            const tables = ['baptism_records', 'marriage_records', 'funeral_records'];
            const out = {};
            for (const table of tables) {
        const [rows] = await promisePool.query(
        `SELECT COLUMN_NAME
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [process.env.DB_NAME, table]
      );
      out[table.replace('_records','')] = rows
        .map(r => r.COLUMN_NAME)
        .filter(c => c !== 'id');
    }
    res.json(out);
  } catch (err) {
    console.error('fields-metadata error:', err);
    res.status(500).json({ error: 'Failed to fetch fields metadata' });
  }
});

// ─── PERMISSION CONFIG ──────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  try {
    let config = { mandatory: {}, dropdowns: {} };
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    res.json(config);
  } catch (err) {
    console.error('Failed to read permissionConfig:', err);
    res.status(500).json({ error: 'Unable to load permission config' });
  }
});

// ─── TOGGLE MANDATORY FIELD ─────────────────────────────────────────────────
router.post('/toggle-mandatory', (req, res) => {
  const { table, column, mandatory: isMandatory } = req.body;
  try {
    let config = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : { mandatory: {}, dropdowns: {} };
    config.mandatory = config.mandatory || {};
    config.mandatory[table] = config.mandatory[table] || [];
    const set = new Set(config.mandatory[table]);
    if (isMandatory) set.add(column);
    else set.delete(column);
    config.mandatory[table] = Array.from(set);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    res.json({ success: true, mandatory: config.mandatory });
  } catch (err) {
    console.error('Toggle mandatory error:', err);
    res.status(500).json({ error: 'Failed to toggle mandatory field' });
  }
});

// ─── UPDATE USER PERMISSION ─────────────────────────────────────────────────
router.post('/update-permission', (req, res) => {
  const { username, permission, value } = req.body;
  const allowed = ['can_edit_baptism','can_edit_marriage','can_edit_funeral'];
  if (!allowed.includes(permission)) {
    return res.status(400).json({ error: 'Invalid permission field' });
  }
  const sql = `UPDATE users SET \`${permission}\` = ? WHERE username = ?`;
    promisePool.query(sql, [value, username])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ success: true });
    })
    .catch(err => {
      console.error('update-permission error:', err);
      res.status(500).json({ error: 'Failed to update permission' });
    });
});

// ─── UNIQUE VALUES ──────────────────────────────────────────────────────────
router.get('/unique-values', async (req, res) => {
  const { table, column } = req.query;
  try {
      const [rows] = await promisePool.query(
      `SELECT DISTINCT \`${column}\` AS value
         FROM \`${table}\`
        WHERE \`${column}\` <> '' AND \`${column}\` IS NOT NULL
        ORDER BY \`${column}\``
    );
    const values = rows.map(r => r.value);
    res.json({ values });
  } catch (err) {
    console.error('unique-values error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
