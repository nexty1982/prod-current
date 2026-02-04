// server/controllers/healthController.js
const db = require('../db'); // Your database connection

exports.getSystemHealth = async (req, res) => {
  try {
    // 1. Check Database Connectivity
    const dbCheck = await db.query('SELECT 1');
    const isDbConnected = !!dbCheck;

    // 2. Check Maintenance State (Assuming it's stored in a config or DB)
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';

    // 3. Determine Status
    let status = 'production';
    if (isMaintenance) {
      status = 'updating';
    } else if (!isDbConnected) {
      status = 'frontend_only';
    }

    res.status(200).json({
      status,
      details: {
        server: 'online',
        database: isDbConnected ? 'connected' : 'disconnected',
        nodeVersion: process.version, // Will return v20.19.3
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'frontend_only', error: error.message });
  }
};
