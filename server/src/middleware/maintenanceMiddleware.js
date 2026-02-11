// Maintenance mode middleware (placeholder)
// Enable by setting MAINTENANCE_MODE=true in environment
module.exports = function maintenanceMiddleware(req, res, next) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({ error: 'Service temporarily unavailable for maintenance' });
  }
  next();
};
