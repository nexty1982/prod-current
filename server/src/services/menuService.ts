/**
 * Menu Service
 * Handles menu tree building, validation, and business logic for editable menus
 */

const db = require('../config/db');

// Icon whitelist - must match frontend
export const ALLOWED_ICONS = [
  'IconLayoutDashboard',
  'IconShield',
  'IconUsers',
  'IconFileDescription',
  'IconSettings',
  'IconTerminal',
  'IconBorderAll',
  'IconEdit',
  'IconBug',
  'IconGitBranch',
  'IconSitemap',
  'IconDatabase',
  'IconRocket',
  'IconPalette',
  'IconNotes',
  'IconMessage',
  'IconBell',
  'IconUserPlus',
  'IconActivity',
  'IconCalendar',
  'IconPoint',
  'IconChartHistogram',
  'IconComponents',
  'IconForms',
  'IconLayout',
  'IconTool',
  'IconTree',
  'IconWriting',
  'OrthodoxChurchIcon',
];

// Path validation regex
export const PATH_ALLOWLIST_REGEX = /^\/(?:apps|dev|admin|devel|devel-tools|church|dashboards|tools|sandbox|social|frontend-pages|user-profile)(?:\/|$)/;

// Allowed meta keys
export const ALLOWED_META_KEYS = ['systemRequired', 'badge', 'note', 'chip', 'chipColor'];

/**
 * Normalize meta field to object or null
 * Handles string, object, null, and undefined inputs
 * 
 * @param meta - Raw meta value from request
 * @returns Normalized meta object or null
 * @throws Error if meta is invalid JSON string or wrong type
 */
export function normalizeMeta(meta: any): Record<string, any> | null {
  // Handle null/undefined
  if (meta === null || meta === undefined) {
    return null;
  }

  // Handle string (JSON)
  if (typeof meta === 'string') {
    const trimmed = meta.trim();
    
    // Empty string becomes null
    if (trimmed === '') {
      return null;
    }
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(trimmed);
      
      // Ensure parsed result is an object (not array or primitive)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('meta must be a JSON object, not array or primitive');
      }
      
      return parsed;
    } catch (e) {
      throw new Error(`meta must be valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Handle object (already parsed)
  if (typeof meta === 'object' && !Array.isArray(meta)) {
    return meta;
  }

  // Invalid type
  throw new Error('meta must be a JSON string or object');
}

export interface MenuItem {
  id?: number;
  parent_id?: number | null;
  key_name: string;
  label: string;
  icon?: string | null;
  path?: string | null;
  role: 'super_admin' | 'default';
  roles?: string | null; // JSON string of role array
  is_active: number;
  order_index: number;
  meta?: string | null; // JSON string
  version?: number;
  created_by?: string;
  created_at?: Date;
  updated_by?: string;
  updated_at?: Date;
  children?: MenuItem[];
}

export interface MenuValidationError {
  field: string;
  message: string;
  value?: any;
}

export class MenuService {
  /**
   * Build hierarchical menu tree from flat rows
   */
  static buildMenuTree(rows: MenuItem[]): MenuItem[] {
    const itemMap = new Map<number, MenuItem>();
    const rootItems: MenuItem[] = [];

    // First pass: create map and initialize children arrays
    rows.forEach(row => {
      itemMap.set(row.id!, { ...row, children: [] });
    });

    // Second pass: build tree
    rows.forEach(row => {
      const item = itemMap.get(row.id!);
      if (!item) return;

      if (!row.parent_id) {
        // Root item
        rootItems.push(item);
      } else {
        // Child item
        const parent = itemMap.get(row.parent_id);
        if (parent) {
          parent.children!.push(item);
        } else {
          // Parent not found, treat as root (orphan)
          console.warn(`Menu item ${row.id} has invalid parent_id ${row.parent_id}`);
          rootItems.push(item);
        }
      }
    });

    // Sort by order_index at each level
    const sortByOrderIndex = (items: MenuItem[]) => {
      items.sort((a, b) => a.order_index - b.order_index);
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortByOrderIndex(item.children);
        }
      });
    };

    sortByOrderIndex(rootItems);

    return rootItems;
  }

  /**
   * Detect cycles in parent_id relationships
   */
  static detectCycles(items: MenuItem[]): MenuValidationError[] {
    const errors: MenuValidationError[] = [];
    const itemMap = new Map<number, MenuItem>();
    
    // Build map
    items.forEach(item => {
      if (item.id) {
        itemMap.set(item.id, item);
      }
    });

    // Check each item for cycles
    items.forEach(item => {
      if (!item.parent_id || !item.id) return;

      const visited = new Set<number>();
      let currentId: number | null | undefined = item.parent_id;

      while (currentId) {
        if (visited.has(currentId)) {
          errors.push({
            field: 'parent_id',
            message: `Cycle detected: Item ${item.id} (${item.key_name}) creates a circular reference`,
            value: item.parent_id,
          });
          break;
        }

        if (currentId === item.id) {
          errors.push({
            field: 'parent_id',
            message: `Item ${item.id} (${item.key_name}) cannot be its own parent`,
            value: item.parent_id,
          });
          break;
        }

        visited.add(currentId);
        const parent = itemMap.get(currentId);
        currentId = parent?.parent_id;
      }
    });

    return errors;
  }

  /**
   * Validate menu items
   */
  static validateMenuItems(items: MenuItem[]): MenuValidationError[] {
    const errors: MenuValidationError[] = [];

    items.forEach((item, index) => {
      // Required fields
      if (!item.key_name || item.key_name.trim() === '') {
        errors.push({
          field: `items[${index}].key_name`,
          message: 'key_name is required',
        });
      }

      if (!item.label || item.label.trim() === '') {
        errors.push({
          field: `items[${index}].label`,
          message: 'label is required',
        });
      }

      // Path validation (if provided)
      if (item.path && item.path.trim() !== '' && item.path !== '#') {
        if (!PATH_ALLOWLIST_REGEX.test(item.path)) {
          errors.push({
            field: `items[${index}].path`,
            message: `Invalid path: ${item.path}. Must start with /apps, /admin, /devel, /church, /dashboards, /tools, /sandbox, /social, or /frontend-pages`,
            value: item.path,
          });
        }
      }

      // Icon validation (if provided)
      if (item.icon && item.icon.trim() !== '') {
        if (!ALLOWED_ICONS.includes(item.icon)) {
          errors.push({
            field: `items[${index}].icon`,
            message: `Invalid icon: ${item.icon}. Must be one of the allowed icons`,
            value: item.icon,
          });
        }
      }

      // Meta validation (if provided)
      if (item.meta !== null && item.meta !== undefined) {
        try {
          // Normalize meta (handles string, object, null)
          const metaObj = normalizeMeta(item.meta);
          
          // Validate meta keys if meta is not null
          if (metaObj !== null) {
            const metaKeys = Object.keys(metaObj);
            const invalidKeys = metaKeys.filter(key => !ALLOWED_META_KEYS.includes(key));
            
            if (invalidKeys.length > 0) {
              errors.push({
                field: `items[${index}].meta`,
                message: `Invalid meta keys: ${invalidKeys.join(', ')}. Allowed keys: ${ALLOWED_META_KEYS.join(', ')}`,
                value: invalidKeys,
              });
            }
          }
          
          // Normalize the meta field in the item for consistent downstream handling
          (item as any).metaNormalized = metaObj;
          
        } catch (e) {
          errors.push({
            field: `items[${index}].meta`,
            message: e instanceof Error ? e.message : 'meta validation failed',
            value: item.meta,
          });
        }
      } else {
        // Set normalized meta to null for consistency
        (item as any).metaNormalized = null;
      }

      // Order index validation
      if (typeof item.order_index !== 'number') {
        errors.push({
          field: `items[${index}].order_index`,
          message: 'order_index must be a number',
        });
      }
    });

    // Check for cycles
    const cycleErrors = MenuService.detectCycles(items);
    errors.push(...cycleErrors);

    return errors;
  }

  /**
   * Get all menus for a role
   */
  static async getMenusByRole(role: 'super_admin' | 'default', activeOnly: boolean = true): Promise<MenuItem[]> {
    try {
      const appDb = db.getAppPool();
      let query = 'SELECT * FROM menus WHERE role = ?';
      const params: any[] = [role];

      if (activeOnly) {
        query += ' AND is_active = 1';
      }

      query += ' ORDER BY order_index ASC, id ASC';

      const [rows] = await appDb.query(query, params);
      return rows as MenuItem[];
    } catch (error) {
      console.error('Error fetching menus:', error);
      throw error;
    }
  }

  /**
   * Upsert menu items (bulk)
   */
  static async upsertMenuItems(items: MenuItem[], userId: string): Promise<{ inserted: number; updated: number }> {
    const appDb = db.getAppPool();
    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      try {
        // Normalize meta to ensure it's stored correctly
        let metaValue: string | null = null;
        if (item.meta !== null && item.meta !== undefined) {
          try {
            const metaObj = normalizeMeta(item.meta);
            metaValue = metaObj ? JSON.stringify(metaObj) : null;
          } catch (e) {
            console.warn(`Warning: Invalid meta for item ${item.key_name}, setting to null:`, e);
            metaValue = null;
          }
        }
        
        if (item.id) {
          // Update existing
          await appDb.query(
            `UPDATE menus SET 
              parent_id = ?, key_name = ?, label = ?, icon = ?, path = ?,
              role = ?, roles = ?, is_active = ?, order_index = ?, meta = ?,
              updated_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              item.parent_id || null,
              item.key_name,
              item.label,
              item.icon || null,
              item.path || null,
              item.role,
              item.roles || null,
              item.is_active ? 1 : 0,
              item.order_index,
              metaValue,
              userId,
              item.id,
            ]
          );
          updated++;
        } else {
          // Insert new (upsert by key_name)
          await appDb.query(
            `INSERT INTO menus 
              (parent_id, key_name, label, icon, path, role, roles, is_active, order_index, meta, version, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON DUPLICATE KEY UPDATE
              parent_id = VALUES(parent_id),
              label = VALUES(label),
              icon = VALUES(icon),
              path = VALUES(path),
              role = VALUES(role),
              roles = VALUES(roles),
              is_active = VALUES(is_active),
              order_index = VALUES(order_index),
              meta = VALUES(meta),
              updated_by = VALUES(updated_by),
              updated_at = CURRENT_TIMESTAMP`,
            [
              item.parent_id || null,
              item.key_name,
              item.label,
              item.icon || null,
              item.path || null,
              item.role,
              item.roles || null,
              item.is_active ? 1 : 0,
              item.order_index,
              metaValue,
              userId,
              userId,
            ]
          );
          inserted++;
        }
      } catch (error) {
        console.error(`Error upserting menu item ${item.key_name}:`, error);
        throw error;
      }
    }

    // Log audit entry
    await MenuService.logAudit('update', userId, { inserted, updated });

    return { inserted, updated };
  }

  /**
   * Reset menus for a role (set all inactive)
   */
  static async resetMenusByRole(role: 'super_admin' | 'default', userId: string): Promise<number> {
    try {
      const appDb = db.getAppPool();
      const [result] = await appDb.query(
        'UPDATE menus SET is_active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE role = ?',
        [userId, role]
      );

      const count = (result as any).affectedRows;

      // Log audit entry
      await MenuService.logAudit('reset', userId, { role, count });

      return count;
    } catch (error) {
      console.error('Error resetting menus:', error);
      throw error;
    }
  }

  /**
   * Log audit entry
   */
  static async logAudit(action: string, userId: string, changes: any): Promise<void> {
    try {
      const appDb = db.getAppPool();
      await appDb.query(
        'INSERT INTO menu_audit (action, changed_by, changes) VALUES (?, ?, ?)',
        [action, userId, JSON.stringify(changes)]
      );
    } catch (error) {
      console.error('Error logging menu audit:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }
}

export default MenuService;
