/**
 * Bridge route to api/churchCertificates.js
 * Routes certificate requests to the church-specific certificate API
 */
const express = require('express');
const router = express.Router();

// Import the actual certificate API (correct path for dist)
const churchCertificates = require('../api/churchCertificates');

// Mount the church certificates router
// Routes: /api/certificates/church/:churchId/...
router.use('/church/:churchId', churchCertificates);

module.exports = router;
