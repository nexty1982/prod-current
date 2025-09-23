// server/routes/dropdownOptions.js
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();

// Path to your permissionConfig.json
const CONFIG_FILE = path.join(__dirname, 'permissionConfig.json');

// ─── GET current dropdown config ─────────────────────────────────────────────
// GET /api/dropdown-config
router.get('/dropdown-config', (req, res) => {
  try {
    let config = { mandatory: {}, dropdowns: {} };
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    res.json({ dropdowns: config.dropdowns || {} });
  } catch (err) {
    console.error('Failed to read dropdown config:', err);
    res.status(500).json({ error: 'Unable to load dropdown config' });
  }
});

// ─── POST set dropdown options for a field ─────────────────────────────────
// POST /api/set-dropdown-options
router.post('/set-dropdown-options', (req, res) => {
  const { table, column, options } = req.body;
  if (!table || !column || !Array.isArray(options)) {
    return res.status(400).json({ error: 'table, column and options[] are required' });
  }
  try {
    let config = { mandatory: {}, dropdowns: {} };
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    config.dropdowns = config.dropdowns || {};
    const key = `${table}.${column}`;
    if (options.length > 0) {
      config.dropdowns[key] = options;
    } else {
      delete config.dropdowns[key];
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    res.json({ success: true, dropdowns: config.dropdowns });
  } catch (err) {
    console.error('Failed to set dropdown options:', err);
    res.status(500).json({ error: 'Unable to save dropdown options' });
  }
});

module.exports = router;
