// server/routes/unique-values.js
const express = require('express');
const { promisePool } = require('../config/db');
const router = express.Router();

// GET /api/unique-values?table=…&column=…
router.get('/', async (req, res) => {
  const { table, column } = req.query;
  if (!table || !column) {
    return res
      .status(400)
      .json({ error: 'Both "table" and "column" query parameters are required' });
  }

  try {
    // TODO: in production, validate table/column against a whitelist to avoid SQL injection
    const sql = `SELECT DISTINCT TRIM(\`${column}\`) AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != ''`;
    const [rows] = await promisePool.query(sql);
    
    // Additional deduplication in JavaScript to handle case variations
    const valueSet = new Set();
    const valueList = [];
    
    rows.forEach(row => {
      if (row.value) {
        const trimmedValue = row.value.trim();
        const normalizedValue = trimmedValue.toLowerCase();
        
        // Check if we already have this value (case-insensitive)
        if (!valueSet.has(normalizedValue)) {
          valueSet.add(normalizedValue);
          valueList.push(trimmedValue);
        }
      }
    });
    
    // Sort alphabetically
    valueList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    res.json({ values: valueList });
  } catch (err) {
    console.error('fetch unique-values error:', err);
    res.status(500).json({ error: 'Could not fetch unique values' });
  }
});

module.exports = router;
