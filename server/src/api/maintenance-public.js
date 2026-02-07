const express = require('express');
const router = express.Router();
const fs = require('fs');

const MAINTENANCE_FILE = '/var/www/orthodoxmetrics/maintenance.on';

// ============================================================================
// PUBLIC MAINTENANCE STATUS ENDPOINT - NO AUTHENTICATION REQUIRED
// ============================================================================
// This endpoint is intentionally public and bypassed in auth middleware
// (see server/src/middleware/auth.js PUBLIC_SYSTEM_ROUTES allowlist).
//
// Used by:
// - Frontend to show maintenance page
// - External status pages
// - Monitoring systems
//
// Returns: Maintenance mode status (boolean, status, startTime)
// Auth: NONE - Bypassed via auth middleware allowlist
// Security: Safe - Only checks for maintenance file, no sensitive data
//
// DO NOT add auth middleware to this endpoint!
// DO NOT remove from auth middleware allowlist!
// ============================================================================
router.get('/status', (req, res) => {
  try {
    const exists = fs.existsSync(MAINTENANCE_FILE);
    let startTime = null;
    
    if (exists) {
      const stats = fs.statSync(MAINTENANCE_FILE);
      startTime = stats.mtime.toISOString();
    }
    
    res.json({
      maintenance: exists,
      status: exists ? 'updating' : 'production',
      startTime: startTime,
      message: exists ? 'System is currently under maintenance' : null
    });
  } catch (error) {
    // NEVER throw - always return a valid response
    console.error('[MAINTENANCE] Error checking maintenance status:', error);
    res.json({
      maintenance: false,
      status: 'production',
      message: null,
      error: 'Failed to check maintenance file'
    });
  }
});

// POST /api/maintenance/toggle - Toggle maintenance mode (requires auth)
router.post('/toggle', (req, res) => {
  if (!req.session?.user || req.session.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  
  const { maintenance } = req.body;
  
  try {
    if (maintenance) {
      fs.writeFileSync(MAINTENANCE_FILE, new Date().toISOString());
    } else {
      if (fs.existsSync(MAINTENANCE_FILE)) {
        fs.unlinkSync(MAINTENANCE_FILE);
      }
    }
    
    res.json({
      success: true,
      maintenance: maintenance,
      status: maintenance ? 'updating' : 'production'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
