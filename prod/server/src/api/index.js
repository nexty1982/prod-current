const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const recordRoutes = require('./records');
const recordsExplorerRoutes = require('../server/records/explorer'); // Records Explorer
const omaiRoutes = require('./omai');
const teachingRoutes = require('./teaching');
const autonomyRoutes = require('./autonomy');
const analyticsRoutes = require('./analytics');
const nlpRoutes = require('./nlp'); // New import

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/records', recordRoutes);
router.use('/records', recordsExplorerRoutes); // Dynamic Records Explorer
router.use('/omai', omaiRoutes);
router.use('/teaching', teachingRoutes);
router.use('/autonomy', autonomyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/nlp', nlpRoutes); // New mount

module.exports = router; 