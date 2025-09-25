const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const recordRoutes = require('./records');
const omaiRoutes = require('./omai');
const teachingRoutes = require('./teaching');
const autonomyRoutes = require('./autonomy');
const analyticsRoutes = require('./analytics');
const nlpRoutes = require('./nlp'); // New import
const omOsRoutes = require('./om-os'); // OM OS Registry
const recordsSuiteRoutes = require('./records-suite'); // Records Suite

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/records', recordRoutes);
router.use('/omai', omaiRoutes);
router.use('/teaching', teachingRoutes);
router.use('/autonomy', autonomyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/nlp', nlpRoutes); // New mount
router.use('/om-os', omOsRoutes); // OM OS Registry routes
router.use('/records-suite', recordsSuiteRoutes); // Records Suite routes

module.exports = router;