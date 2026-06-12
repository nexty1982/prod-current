/**
 * Public billing API — /api/billing
 */
const express = require('express');
const router = express.Router();
const stripeBilling = require('../services/stripeBillingService');

router.get('/config', (_req, res) => {
  res.json({ success: true, ...stripeBilling.publicConfig() });
});

module.exports = router;
module.exports.webhookHandler = stripeBilling.webhookHandler;
