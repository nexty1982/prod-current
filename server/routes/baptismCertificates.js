/**
 * Baptism Certificates Route
 * Routes to the church-specific certificate API for baptism certificates
 */
const express = require('express');
const router = express.Router();

// Import the actual certificate API (correct path for dist)
const churchCertificates = require('../api/churchCertificates');

// Mount for baptism-specific routes
router.use('/', (req, res, next) => {
  const churchId = req.query.churchId || req.body?.churchId || req.params.churchId;
  if (churchId) {
    req.params.churchId = churchId;
  }
  next();
}, churchCertificates);

module.exports = router;
