/**
 * Version Switcher API Routes
 * Provides endpoints for managing front-end version switching
 */

const express = require('express');
const { 
  getAvailableVersions, 
  switchVersion,
  AVAILABLE_VERSIONS,
  DEFAULT_VERSION 
} = require('../middleware/versionSwitcher');

const router = express.Router();

/**
 * GET /api/version/info
 * Get information about available versions and current selection
 */
router.get('/info', getAvailableVersions);

/**
 * POST /api/version/switch
 * Switch to a different version
 * Body: { version: 'production|beta|staging|development|experimental' }
 */
router.post('/switch', switchVersion);

/**
 * GET /api/version/current
 * Get the currently selected version for the session
 */
router.get('/current', (req, res) => {
  const user = req.session && req.session.user;
  const isSuperAdmin = user && user.role === 'super_admin';
  
  if (!isSuperAdmin) {
    return res.json({ 
      success: true,
      version: DEFAULT_VERSION,
      message: 'Default version (non-superadmin)' 
    });
  }

  const selectedVersion = req.query.version || req.cookies.om_version || DEFAULT_VERSION;
  const validVersion = AVAILABLE_VERSIONS[selectedVersion] ? selectedVersion : DEFAULT_VERSION;

  res.json({
    success: true,
    version: validVersion,
    available: Object.keys(AVAILABLE_VERSIONS),
    isSuperAdmin: true
  });
});

/**
 * DELETE /api/version/reset
 * Reset to default version (clears cookie)
 */
router.delete('/reset', (req, res) => {
  const user = req.session && req.session.user;
  const isSuperAdmin = user && user.role === 'super_admin';
  
  if (!isSuperAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Superadmin role required.' 
    });
  }

  // Clear the version cookie
  res.clearCookie('om_version');

  console.log(`🔄 Version reset to "${DEFAULT_VERSION}" by superadmin ${user.email}`);

  res.json({
    success: true,
    message: 'Reset to default version',
    version: DEFAULT_VERSION
  });
});

module.exports = router;
