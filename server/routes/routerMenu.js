/**
 * Router Menu Studio API Routes
 * Provides REST endpoints for managing dynamic routes and menus
 */

const express = require('express');
const router = express.Router();
const RouterMenuDal = require('../dal/routerMenuDal');
const debug = require('debug')('app:routes:router-menu');

// Initialize DAL
const routerMenuDal = new RouterMenuDal();

// Middleware to require super_admin for write operations
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.method !== 'GET' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required for write operations' });
  }
  
  next();
};

// Apply middleware to all routes
router.use(requireSuperAdmin);

// ===== ROUTES ENDPOINTS =====

/**
 * GET /api/router-menu/routes
 * List routes with optional filtering
 */
router.get('/routes', async (req, res) => {
  try {
    const { role, q } = req.query;
    const filters = {};
    
    if (role) filters.role = role;
    if (q) filters.q = q;
    
    const routes = await routerMenuDal.listRoutes(filters);
    
    res.json({
      success: true,
      data: routes,
      count: routes.length
    });
  } catch (error) {
    debug('Error listing routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list routes',
      details: error.message
    });
  }
});

/**
 * POST /api/router-menu/routes
 * Create a new route
 */
router.post('/routes', async (req, res) => {
  try {
    const routeData = req.body;
    
    // Validate required fields
    if (!routeData.path || !routeData.component_path) {
      return res.status(400).json({
        success: false,
        error: 'Path and component_path are required'
      });
    }
    
    // Validate component path security (whitelist pattern)
    const allowedPrefixes = [
      'views/',
      'components/',
      'features/',
      'pages/',
      'tools/',
      '@/features/',
      '@/views/',
      '@/components/',
      '@/pages/',
      '@/tools/'
    ];
    
    const isAllowed = allowedPrefixes.some(prefix => 
      routeData.component_path.startsWith(prefix)
    );
    
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        error: 'Invalid component_path. Must start with allowed prefix: ' + allowedPrefixes.join(', ')
      });
    }
    
    const routeId = await routerMenuDal.createRoute(routeData);
    
    res.status(201).json({
      success: true,
      data: { id: routeId },
      message: 'Route created successfully'
    });
  } catch (error) {
    debug('Error creating route:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Route path already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create route',
      details: error.message
    });
  }
});

/**
 * PATCH /api/router-menu/routes/:id
 * Update an existing route
 */
router.patch('/routes/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const updateData = req.body;
    
    if (isNaN(routeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid route ID'
      });
    }
    
    // Validate component path if provided
    if (updateData.component_path) {
      const allowedPrefixes = [
        'views/', 'components/', 'features/', 'pages/', 'tools/',
        '@/features/', '@/views/', '@/components/', '@/pages/', '@/tools/'
      ];
      
      const isAllowed = allowedPrefixes.some(prefix => 
        updateData.component_path.startsWith(prefix)
      );
      
      if (!isAllowed) {
        return res.status(400).json({
          success: false,
          error: 'Invalid component_path. Must start with allowed prefix'
        });
      }
    }
    
    const updated = await routerMenuDal.updateRoute(routeId, updateData);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Route not found or no changes made'
      });
    }
    
    res.json({
      success: true,
      message: 'Route updated successfully'
    });
  } catch (error) {
    debug('Error updating route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update route',
      details: error.message
    });
  }
});

/**
 * DELETE /api/router-menu/routes/:id
 * Delete a route
 */
router.delete('/routes/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    
    if (isNaN(routeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid route ID'
      });
    }
    
    const deleted = await routerMenuDal.deleteRoute(routeId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    debug('Error deleting route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete route',
      details: error.message
    });
  }
});

// ===== MENUS ENDPOINTS =====

/**
 * GET /api/router-menu/menus
 * List menus by role
 */
router.get('/menus', async (req, res) => {
  try {
    const { role } = req.query;
    const menus = await routerMenuDal.getMenus(role);
    
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    debug('Error listing menus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list menus',
      details: error.message
    });
  }
});

/**
 * POST /api/router-menu/menus
 * Create a new menu
 */
router.post('/menus', async (req, res) => {
  try {
    const menuData = {
      ...req.body,
      created_by: req.user.username || req.user.email
    };
    
    if (!menuData.name) {
      return res.status(400).json({
        success: false,
        error: 'Menu name is required'
      });
    }
    
    const menuId = await routerMenuDal.createMenu(menuData);
    
    res.status(201).json({
      success: true,
      data: { id: menuId },
      message: 'Menu created successfully'
    });
  } catch (error) {
    debug('Error creating menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create menu',
      details: error.message
    });
  }
});

/**
 * PATCH /api/router-menu/menus/:id
 * Update menu metadata
 */
router.patch('/menus/:id', async (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const updateData = req.body;
    
    if (isNaN(menuId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu ID'
      });
    }
    
    const updated = await routerMenuDal.updateMenu(menuId, updateData);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Menu not found or no changes made'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu updated successfully'
    });
  } catch (error) {
    debug('Error updating menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update menu',
      details: error.message
    });
  }
});

// ===== MENU ITEMS ENDPOINTS =====

/**
 * GET /api/router-menu/menus/:id/items
 * Get menu items tree for a menu
 */
router.get('/menus/:id/items', async (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    
    if (isNaN(menuId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu ID'
      });
    }
    
    const items = await routerMenuDal.getMenuItems(menuId);
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    debug('Error getting menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get menu items',
      details: error.message
    });
  }
});

/**
 * POST /api/router-menu/menus/:id/items
 * Bulk upsert menu items (replaces all items)
 */
router.post('/menus/:id/items', async (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const { items } = req.body;
    
    if (isNaN(menuId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu ID'
      });
    }
    
    const userId = req.user.username || req.user.email;
    const success = await routerMenuDal.upsertMenuItems(menuId, items, userId);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update menu items'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu items updated successfully'
    });
  } catch (error) {
    debug('Error updating menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update menu items',
      details: error.message
    });
  }
});

/**
 * POST /api/router-menu/menus/:id/publish
 * Publish menu (create version snapshot)
 */
router.post('/menus/:id/publish', async (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    
    if (isNaN(menuId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu ID'
      });
    }
    
    const userId = req.user.username || req.user.email;
    const success = await routerMenuDal.publishMenu(menuId, userId);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to publish menu'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu published successfully'
    });
  } catch (error) {
    debug('Error publishing menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish menu',
      details: error.message
    });
  }
});

// ===== VERSIONS ENDPOINTS =====

/**
 * GET /api/router-menu/versions
 * Get version history
 */
router.get('/versions', async (req, res) => {
  try {
    const { scope, scope_id } = req.query;
    
    if (!scope || !['routes', 'menu'].includes(scope)) {
      return res.status(400).json({
        success: false,
        error: 'Valid scope (routes or menu) is required'
      });
    }
    
    const scopeId = scope_id ? parseInt(scope_id) : null;
    const versions = await routerMenuDal.getVersions(scope, scopeId);
    
    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    debug('Error getting versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get versions',
      details: error.message
    });
  }
});

// ===== TEMPLATES ENDPOINTS =====

/**
 * POST /api/router-menu/templates
 * Save a template
 */
router.post('/templates', async (req, res) => {
  try {
    const { name, payload, template_type = 'menu', description } = req.body;
    
    if (!name || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Name and payload are required'
      });
    }
    
    const userId = req.user.username || req.user.email;
    const templateId = await routerMenuDal.saveTemplate(name, payload, template_type, userId);
    
    res.status(201).json({
      success: true,
      data: { id: templateId },
      message: 'Template saved successfully'
    });
  } catch (error) {
    debug('Error saving template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save template',
      details: error.message
    });
  }
});

/**
 * GET /api/router-menu/templates
 * List templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { template_type } = req.query;
    const templates = await routerMenuDal.getTemplates(template_type);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    debug('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list templates',
      details: error.message
    });
  }
});

/**
 * POST /api/router-menu/templates/:id/apply
 * Apply template to a role's menu
 */
router.post('/templates/:id/apply', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { role } = req.query;
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }
    
    if (!role || !['super_admin', 'default'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role (super_admin or default) is required'
      });
    }
    
    const userId = req.user.username || req.user.email;
    const success = await routerMenuDal.applyTemplate(templateId, role, userId);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to apply template'
      });
    }
    
    res.json({
      success: true,
      message: 'Template applied successfully'
    });
  } catch (error) {
    debug('Error applying template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply template',
      details: error.message
    });
  }
});

module.exports = router;