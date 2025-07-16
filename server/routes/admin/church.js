// routes/admin/church.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/churchAdminController');

// Middleware to ensure admin authentication (add your auth middleware here)
// const requireAuth = require('../../middleware/auth');
// router.use(requireAuth);

/**
 * GET /api/admin/church/:id/overview
 * Get comprehensive church overview including metadata, users, counts, logs, and invoices
 */
router.get('/:id/overview', controller.getChurchOverview);

/**
 * POST /api/admin/church/:id/reset-password
 * Reset a user's password in the church database
 * Body: { userId: number, newPassword: string }
 */
router.post('/:id/reset-password', controller.resetUserPassword);

/**
 * GET /api/admin/church/:id/records/:recordType
 * Get church records by type (baptism, marriage, funeral) with pagination
 * Query params: page, limit
 */
router.get('/:id/records/:recordType', controller.getChurchRecords);

module.exports = router;
