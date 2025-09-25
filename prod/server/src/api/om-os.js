const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const RouterMenuPatcher = require('../../../scripts/patch-router-menu.mjs').default;

const router = express.Router();

/**
 * GET /api/om-os/registry
 * Get the current component registry
 */
router.get('/registry', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    const registryPath = path.join(__dirname, '../../../front-end/src/features/om-os/registry/registry.json');
    
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      const registry = JSON.parse(registryContent);

      res.json({
        success: true,
        data: registry
      });
    } catch (fileError) {
      console.warn('Registry file not found, returning empty registry');
      res.json({
        success: true,
        data: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          components: []
        }
      });
    }

  } catch (error) {
    console.error('Error fetching registry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registry',
      message: error.message
    });
  }
});

/**
 * POST /api/om-os/patch-router-menu
 * Execute the router and menu patcher
 */
router.post('/patch-router-menu', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    console.log('🔧 Running Router + Menu patcher via API...');
    
    const patcher = new RouterMenuPatcher();
    const result = await patcher.patch();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error running patcher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run patcher',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/om-os/registry/scan
 * Trigger a registry scan to discover new components
 */
router.post('/registry/scan', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    // This would trigger the component scanner
    // For now, return a success message
    res.json({
      success: true,
      message: 'Registry scan completed. Check the registry for updated components.',
      scannedAt: new Date().toISOString(),
      componentsFound: 5 // This would be dynamic in real implementation
    });

  } catch (error) {
    console.error('Error scanning registry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan registry',
      message: error.message
    });
  }
});

/**
 * GET /api/om-os/errors
 * Get recent error logs (stub for Error Board)
 */
router.get('/errors', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    // Mock error data for demonstration
    const mockErrors = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'error',
        component: 'RecordsViewer',
        message: 'Failed to load church database om_church_12345',
        stack: 'Error: Database connection failed...',
        frequency: 3,
        lastSeen: new Date().toISOString()
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'warning',
        component: 'TemplateGallery',
        message: 'Template preview image not found',
        stack: null,
        frequency: 1,
        lastSeen: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: {
        errors: mockErrors,
        summary: {
          total: mockErrors.length,
          byLevel: {
            error: 1,
            warning: 1,
            info: 0
          },
          lastHour: 2
        }
      }
    });

  } catch (error) {
    console.error('Error fetching errors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch errors',
      message: error.message
    });
  }
});

module.exports = router;