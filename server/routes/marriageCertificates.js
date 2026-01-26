// Bridge route to api/marriageCertificates.js
// TEMPORARY: Returns stub router due to canvas native module compatibility issue
const express = require('express');
const router = express.Router();

router.use((req, res) => {
    res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Marriage certificates module unavailable. Canvas native module needs rebuilding.',
        fix: 'Run: cd /var/www/orthodoxmetrics/prod/server && npm rebuild canvas'
    });
});

module.exports = router;
