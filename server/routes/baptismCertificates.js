// Bridge route to api/baptismCertificates.js
// TEMPORARY: Returns stub router due to canvas native module compatibility issue
// TODO: After rebuilding canvas module, restore proper module loading
const express = require('express');
const router = express.Router();

// Stub router that returns 503 until canvas module is rebuilt
router.use((req, res) => {
    res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Baptism certificates module unavailable. Canvas native module needs rebuilding.',
        fix: 'Run: cd /var/www/orthodoxmetrics/prod/server && npm rebuild canvas',
        note: 'This is a temporary stub. Certificate routes will work after canvas module is rebuilt.'
    });
});

module.exports = router;
