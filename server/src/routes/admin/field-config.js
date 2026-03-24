/**
 * Field Config — stub router
 * Canonical field configuration management for admin.
 */
const express = require('express');
const router = express.Router();

// GET /api/admin/field-config — list field configurations
router.get('/', async (req, res) => {
  res.json({ items: [], message: 'Field config not yet implemented' });
});

module.exports = router;
