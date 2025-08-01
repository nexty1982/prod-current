// Example Express app integration
const express = require('express');
const app = express();

// Add maintenance middleware (should be early in middleware stack)
const maintenanceMiddleware = require('./server/middleware/maintenanceMiddleware');
app.use(maintenanceMiddleware.middleware());

// Add maintenance API routes
const maintenanceRoutes = require('./server/routes/maintenance');
app.use('/api/admin/maintenance', maintenanceRoutes);

// OMAI interface usage examples
const OMAI = {
  maintenance: require('./server/utils/omaiMaintenanceInterface')
};

// Example OMAI usage:
// await OMAI.maintenance.activate("Database upgrade", "2025-01-27T03:00:00Z", "Scheduled maintenance");
// await OMAI.maintenance.deactivate("Maintenance completed");
// const status = await OMAI.maintenance.status();

module.exports = { app, OMAI };
