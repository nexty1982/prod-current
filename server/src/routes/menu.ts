/**
 * Menu API Routes
 * Provides endpoints for super_admin editable navigation menus
 */

import express, { Request, Response } from 'express';
import MenuService, { MenuItem, ALLOWED_ICONS, PATH_ALLOWLIST_REGEX, normalizeMeta } from '../services/menuService';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/ui/menu
 * Frontend menu loader - returns DB menu for super_admin, static indicator for others
 */
router.get('/ui/menu', async (req: Request, res: Response) => {
  try {
    const user = (req as any).session?.user;

    // Non-super_admin users should use static menu
    if (!user || user.role !== 'super_admin') {
      return res.json({
        source: 'static',
        message: 'Use static MenuItems.ts',
      });
    }

    // Fetch super_admin menus from DB
    const rows = await MenuService.getMenusByRole('super_admin', true);

    if (rows.length === 0) {
      return res.json({
        source: 'static',
        message: 'No DB menus found, use static MenuItems.ts',
      });
    }

    // Build tree
    const tree = MenuService.buildMenuTree(rows);

    // Calculate version hash (for caching)
    const version = rows.reduce((max, row) => Math.max(max, row.version || 0), 0);

    return res.json({
      source: 'db',
      role: 'super_admin',
      version,
      items: tree,
      count: rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching UI menu:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menu',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/menus
 * Returns all menus (including inactive) for editing
 * Super admin only
 */
router.get('/admin/menus', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active_only === 'true';
    const rows = await MenuService.getMenusByRole('super_admin', activeOnly);

    // Build tree for preview
    const tree = MenuService.buildMenuTree(rows);

    return res.json({
      success: true,
      items: rows, // Flat list for editing
      tree,        // Hierarchical for preview
      count: rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin menus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menus',
      message: error.message,
    });
  }
});

/**
 * PUT /api/admin/menus
 * Bulk update/insert menu items
 * Super admin only
 */
router.put('/admin/menus', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'items array is required',
      });
    }

    // Set role to super_admin for all items
    const menuItems: MenuItem[] = items.map(item => ({
      ...item,
      role: 'super_admin',
    }));

    // Validate all items
    const validationErrors = MenuService.validateMenuItems(menuItems);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    // Upsert items
    const user = (req as any).session?.user;
    const userId = user?.email || user?.username || 'unknown';
    const result = await MenuService.upsertMenuItems(menuItems, userId);

    return res.json({
      success: true,
      message: `Successfully saved ${result.inserted + result.updated} menu items`,
      inserted: result.inserted,
      updated: result.updated,
    });
  } catch (error: any) {
    console.error('Error updating menus:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      error: 'Failed to update menus',
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/menus/seed
 * Seed menus from frontend payload (converted from MenuItems.ts)
 * Super admin only
 */
router.post('/admin/menus/seed', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'items array is required',
      });
    }

    // Seed items (upsert by key_name)
    const menuItems: MenuItem[] = items.map(item => ({
      ...item,
      role: 'super_admin',
      is_active: item.is_active !== undefined ? item.is_active : 1,
    }));

    // Validate
    const validationErrors = MenuService.validateMenuItems(menuItems);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    // Upsert
    const user = (req as any).session?.user;
    const userId = user?.email || user?.username || 'unknown';
    const result = await MenuService.upsertMenuItems(menuItems, userId);

    // Log seed action
    await MenuService.logAudit('seed', userId, { 
      count: items.length, 
      inserted: result.inserted,
      updated: result.updated 
    });

    return res.json({
      success: true,
      message: `Successfully seeded ${result.inserted + result.updated} menu items (${result.inserted} inserted, ${result.updated} updated)`,
      inserted: result.inserted,
      updated: result.updated,
    });
  } catch (error: any) {
    console.error('Error seeding menus:', error);
    
    // Check if it's a validation error that somehow got through
    if (error.message && error.message.includes('meta')) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Meta validation failed',
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      error: 'Failed to seed menus',
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/menus/reset
 * Reset super_admin menus (set all inactive)
 * Super admin only
 */
router.post('/admin/menus/reset', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).session?.user;
    const userId = user?.email || user?.username || 'unknown';

    const count = await MenuService.resetMenusByRole('super_admin', userId);

    return res.json({
      success: true,
      message: `Successfully reset ${count} menu items (set to inactive)`,
      count,
    });
  } catch (error: any) {
    console.error('Error resetting menus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset menus',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/menus/constants
 * Returns validation constants (icon whitelist, path regex, etc.)
 * Super admin only
 */
router.get('/admin/menus/constants', requireRole(['super_admin']), (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      constants: {
        allowed_icons: ALLOWED_ICONS,
        path_regex: PATH_ALLOWLIST_REGEX.source,
        allowed_meta_keys: ['systemRequired', 'badge', 'note', 'chip', 'chipColor'],
      },
    });
  } catch (error: any) {
    console.error('Error fetching constants:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch constants',
      message: error.message,
    });
  }
});

// CommonJS export for compatibility with require() in index.ts
module.exports = router;
