const { getAppPool } = require('../../config/db-compat');
// server/routes/dropdownOptions.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../../config/db-compat');

const router = express.Router();

// ─── Config path ────────────────────────────────────────────────────────────
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

// ─── POST set dropdown options for a field ───────────────────────────────────
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

// ─── GET clergy list from 3 tables ───────────────────────────────────────────
// GET /api/clergy
router.get('/clergy', async (req, res) => {
  try {
    const [rows] = await getAppPool().query(`
      SELECT DISTINCT TRIM(clergy) as clergy FROM (
        SELECT clergy FROM baptism_records
        UNION
        SELECT clergy FROM marriage_records
        UNION
        SELECT clergy FROM funeral_records
      ) AS all_clergy
      WHERE clergy IS NOT NULL AND TRIM(clergy) != ''
      ORDER BY clergy ASC
    `);
    
    // Additional deduplication in JavaScript to handle case variations
    const clergySet = new Set();
    const clergyList = [];
    
    rows.forEach(row => {
      const trimmedClergy = row.clergy.trim();
      const normalizedClergy = trimmedClergy.toLowerCase();
      
      // Check if we already have this clergy member (case-insensitive)
      if (!clergySet.has(normalizedClergy)) {
        clergySet.add(normalizedClergy);
        clergyList.push(trimmedClergy);
      }
    });
    
    // Sort alphabetically
    clergyList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    res.json(clergyList);
  } catch (err) {
    console.error('❌ Error in /api/clergy:', err.message);
    res.status(500).json({ error: 'Failed to fetch clergy list' });
  }
});

// ─── GET locations from baptism_records.birthplace ───────────────────────────
// GET /api/locations
router.get('/locations', async (req, res) => {
  try {
    const [rows] = await getAppPool().query(`
      SELECT DISTINCT birthplace AS location
      FROM baptism_records
      WHERE birthplace IS NOT NULL AND birthplace != ''
      ORDER BY location ASC
    `);
    const locations = rows.map(row => row.location);
    res.json(locations);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Server error fetching locations' });
  }
});

module.exports = router;

