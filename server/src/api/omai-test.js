const express = require('express');
const router = express.Router();

// Simple test endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'OMAI test routes working',
    timestamp: new Date().toISOString()
  });
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'OMAI routes are registered and working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 