// server/src/routes/systemRoutes.js
const express = require('express');
const router = express.Router();
const os = require('os');
const db = require('../db'); // Your canonical DB utility
const maintenanceController = require('../controllers/maintenanceController');
const { isSuperAdmin } = require('../middleware/authMiddleware'); // Ensure only you can toggle this

router.get('/health', systemHealthController.getHealth);
// Maintenance management
router.get('/maintenance', maintenanceController.getMaintenanceStatus);
router.post('/maintenance/toggle', isSuperAdmin, maintenanceController.toggleMaintenance);

router.get('/health', async (req, res) => {
  try {
    // 1. MariaDB Connectivity Check
    // Uses the lightweight query to verify the 'Production Sync' dot
    const [dbResult] = await db.query('SELECT 1 AS health_check');
    const isDbConnected = !!dbResult;

    // 2. Check Maintenance State
    // This drives the 2-dot 'Updating' state
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';

    // 3. Status Mapping for the 3-Dot Indicator
    let status = 'production';
    if (!isDbConnected) {
      status = 'frontend_only'; // 1 Green Dot
    } else if (isMaintenance) {
      status = 'updating';      // 2 Green Dots
    }

    // 4. Metadata for the Monitoring Tab
    // Ensuring these match the values from the /admin/settings audit
    res.json({
      status,
      metadata: {
        nodeVersion: process.version, // Returns v20.19.3
        uptime: Math.floor(process.uptime()),
        hostname: os.hostname(),
        platform: `${os.type()} (${os.arch()})`,
        cpuCores: os.cpus().length,
        loadAvg: os.loadavg()[0].toFixed(2), // Matches '0.12%' style
        memory: {
          total: (os.totalmem() / (1024 ** 3)).toFixed(1), // Matches '11.5 GB'
          free: (os.freemem() / (1024 ** 3)).toFixed(1)
        }
      }
    });
  } catch (error) {
    // Fail-safe status if the API logic itself crashes
    res.status(500).json({ status: 'frontend_only', error: error.message });
  }
});

module.exports = router;
