/**
 * Admin Auth Check Endpoint
 * 
 * Used by Nginx auth_request for protecting admin routes
 * Returns 204 if authenticated admin, 401/403 otherwise
 */

const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/auth/check
 * Auth check endpoint for Nginx auth_request
 */
router.get('/check', requireAuth, requireRole(['admin', 'super_admin']), (req, res) => {
  // User is authenticated and has admin role (middleware ensures this)
  // Return 204 No Content (standard for auth_request)
  res.status(204).send();
});

module.exports = router;
