import mysql from 'mysql2/promise';
import type { RouteRecord, MenuNode, RoutesListQuery, MenusListQuery, ReorderMenusInput } from './types.js';

let connection: mysql.Connection;

async function getConnection(): Promise<mysql.Connection> {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  }
  return connection;
}

export class RoutesRepo {
  async list(query: RoutesListQuery = {}): Promise<RouteRecord[]> {
    const conn = await getConnection();
    let sql = 'SELECT * FROM routes WHERE 1=1';
    const params: any[] = [];

    if (query.q) {
      sql += ' AND (path LIKE ? OR component LIKE ? OR title LIKE ?)';
      const search = `%${query.q}%`;
      params.push(search, search, search);
    }

    if (query.is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(query.is_active === '1' ? 1 : 0);
    }

    const sortField = query.sort || 'order_index';
    const direction = query.dir || 'asc';
    sql += ` ORDER BY ${sortField} ${direction.toUpperCase()}`;

    if (query.limit || query.offset) {
      const limit = parseInt(query.limit || '20');
      const offset = parseInt(query.offset || '0');
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await conn.execute(sql, params);
    return (rows as any[]).map(mapRoute);
  }

  async create(opts: any, updated_by?: string): Promise<RouteRecord> {
    const conn = await getConnection();
    const data = {
      ...opts,
      roles: JSON.stringify(opts.roles || []),
      tags: opts.tags ? JSON.stringify(opts.tags) : null,
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
      updated_by
    };

    const sql = `
      INSERT INTO routes 
      (path, component, title, description, layout, roles, is_active, order_index, tags, meta, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.path, data.component, data.title, data.description, data.layout,
      data.roles, data.is_active ? 1 : 0, data.order_index, data.tags, data.meta, data.updated_by
    ];

    const [result] = await conn.execute(sql, params);
    const newId = (result as any).insertId;

    // Fetch the created record
    const [rows] = await conn.execute('SELECT * FROM routes WHERE id = ?', [newId]);
    return mapRoute((rows as any[])[0]);
  }

  async update(id: number, opts: any, updated_by?: string): Promise<RouteRecord | null> {
    const conn = await getConnection();
    
    const updates: string[] = [];
    const params: any[] = [];

    Object.entries(opts).forEach(([key, value]) => {
      if (value !== undefined) {
        let dbValue = value;
        if (key === 'roles') dbValue = JSON.stringify(value);
        if (key === 'tags') dbValue = value ? JSON.stringify(value) : null;
        if (key === 'meta') dbValue = value ? JSON.stringify(value) : null;
        if (key === 'is_active') dbValue = value ? 1 : 0;
        
        updates.push(`${key} = ?`);
        params.push(dbValue);
      }
    });

    if (updates.length === 0) {
      // No updates to return the current record
      const [rows] = await conn.execute('SELECT * FROM routes WHERE id = ?', [id]);
      return (rows as any[]).length ? mapRoute((rows as any[])[0]) : null;
    }

    updates.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
    params.push(updated_by, id);

    const sql = `UPDATE routes SET ${updates.join(', ')} WHERE id = ?`;
    
    const [result] = await conn.execute(sql, params);
    if ((result as any).affectedRows === 0) {
      return null;
    }

    // Fetch updated record
    const [rows] = await conn.execute('SELECT * FROM routes WHERE id = ?', [id]);
    return mapRoute((rows as any[])[0]);
  }

  async delete(id: number, hard = false): Promise<boolean> {
    const conn = await getConnection();
    
    if (hard) {
      const [result] = await conn.execute('DELETE FROM routes WHERE id = ?', [id]);
      return (result as any).affectedRows > 0;
    } else {
      const [result] = await conn.execute('UPDATE routes SET is_active = 0 WHERE id = ?', [id]);
      return (result as any).affectedRows > 0;
    }
  }
}

export class MenusRepo {
  async tree(): Promise<MenuNode[]> {
    const conn = await getConnection();
    const [rows] = await conn.execute(`
      SELECT * FROM menus 
      WHERE is_active = 1 
      ORDER BY parent_id ASC, order_index ASC
    `);
    
    const menuItems = (rows as any[]).map(mapMenu);
    
    // Build tree structure
    const menuMap = new Map<number, MenuNode>();
    const rootMenus: MenuNode[] = [];

    // First pass: create all nodes
    menuItems.forEach(menu => {
      menuMap.set(menu.id!, menu);
      (menu as any).children = [];
    });

    // Second pass: build hierarchy
    menuItems.forEach(menu => {
      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        menuMap.get(menu.parent_id)!.children!.push(menu);
      } else {
        rootMenus.push(menu);
      }
    });

    // Sort children recursively
    const sortChildren = (menus: MenuNode[]) => {
      menus.sort((a, b) => a.order_index - b.order_index);
      menus.forEach(menu => {
        if (menu.children && menu.children.length > 0) {
          sortChildren(menu.children);
        }
      });
    };

    sortChildren(rootMenus);
    return rootMenus;
  }

  async list(query: MenusListQuery = {}): Promise<MenuNode[]> {
    const conn = await getConnection();
    let sql = 'SELECT * FROM menus WHERE 1=1';
    const params: any[] = [];

    if (query.q) {
      sql += ' AND (label LIKE ? OR key_name LIKE ?)';
      const search = `%${query.q}%`;
      params.push(search, search);
    }

    if (query.is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(query.is_active === '1' ? 1 : 0);
    }

    const sortField = query.sort || 'order_index';
    const direction = query.dir || 'asc';
    sql += ` ORDER BY ${sortField} ${direction.toUpperCase()}`;

    if (query.limit || query.offset) {
      const limit = parseInt(query.limit || '20');
      const offset = parseInt(query.offset || '0');
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await conn.execute(sql, params);
    return (rows as any[]).map(mapMenu);
  }

  async create(opts: any, updated_by?: string): Promise<MenuNode> {
    const conn = await getConnection();
    const data = {
      ...opts,
      roles: JSON.stringify(opts.roles || []),
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
      updated_by
    };

    const sql = `
      INSERT INTO menus 
      (parent_id, key_name, label, icon, path, roles, is_active, order_index, meta, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.parent_id || null, data.key_name, data.label, data.icon,
      data.path, data.roles, data.is_active ? 1 : 0, data.order_index, data.meta, data.updated_by
    ];

    const [result] = await conn.execute(sql, params);
    const newId = (result as any).insertId;

    // Fetch the created record
    const [rows] = await conn.execute('SELECT * FROM menus WHERE id = ?', [newId]);
    return mapMenu((rows as any[])[0]);
  }

  async update(id: number, opts: any, updated_by?: string): Promise<MenuNode | null> {
    const conn = await getConnection();
    
    const updates: string[] = [];
    const params: any[] = [];

    Object.entries(opts).forEach(([key, value]) => {
      if (value !== undefined) {
        let dbValue = value;
        if (key === 'roles') dbValue = JSON.stringify(value);
        if (key === 'meta') dbValue = value ? JSON.stringify(value) : null;
        if (key === 'is_active') dbValue = value ? 1 : 0;
        if (key === 'parent_id') dbValue = value || null;
        
        updates.push(`${key} = ?`);
        params.push(dbValue);
      }
    });

    if (updates.length === 0) {
      // No updates to make, return current record
      const [rows] = await conn.execute('SELECT * FROM menus WHERE id = ?', [id]);
      return (rows as any[]).length ? mapMenu((rows as any[])[0]) : null;
    }

    updates.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
    params.push(updated_by, id);

    const sql = `UPDATE menus SET ${updates.join(', ')} WHERE id = ?`;
    
    const [result] = await conn.execute(sql, params);
    if ((result as any).affectedRows === 0) {
      return null;
    }

    // Fetch updated record
    const [rows] = await conn.execute('SELECT * FROM menus WHERE id = ?', [id]);
    return mapMenu((rows as any[])[0]);
  }

  async delete(id: number, hard = false): Promise<boolean> {
    const conn = await getConnection();
    
    if (hard) {
      const [result] = await conn.execute('DELETE FROM menus WHERE id = ?', [id]);
      return (result as any).affectedRows > 0;
    } else {
      const [result] = await conn.execute('UPDATE menus SET is_active = 0 WHERE id = ?', [id]);
      return (result as any).affectedRows > 0;
    }
  }

  async reorder(input: ReorderMenusInput): Promise<void> {
    const conn = await getConnection();
    
    for (const item of input.items) {
      await conn.execute(
        'UPDATE menus SET parent_id = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [item.parent_id || null, item.order_index, item.id]
      );
    }
  }
}

function mapRoute(row: any): RouteRecord {
  let roles: string[] = [];
  try { roles = JSON.parse(row.roles || '[]'); } catch {}
  if (!Array.isArray(roles)) roles = [];

  let tags: string[] | null = null;
  try { tags = row.tags ? JSON.parse(row.tags) : null; } catch {}
  if (!Array.isArray(tags)) tags = null;

  let meta: Record<string, unknown> | null = null;
  try { meta = row.meta ? JSON.parse(row.meta) : null; } catch {}
  if (typeof meta !== 'object') meta = null;

  return {
    id: row.id,
    path: row.path,
    component: row.component,
    title: row.title,
    description: row.description,
    layout: row.layout,
    roles,
    is_active: Boolean(row.is_active),
    order_index: row.order_index,
    tags,
    meta,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by
  };
}function mapMenu(row: any): MenuNode {
  let roles: string[] = [];
  try { roles = JSON.parse(row.roles || '[]'); } catch {}
  if (!Array.isArray(roles)) roles = [];

  let meta: Record<string, unknown> | null = null;
  try { meta = row.meta ? JSON.parse(row.meta) : null; } catch {}
  if (typeof meta !== 'object') meta = null;

  return {
    id: row.id,
    parent_id: row.parent_id,
    key_name: row.key_name,
    label: row.label,
    icon: row.icon,
    path: row.path,
    roles,
    is_active: Boolean(row.is_active),
    order_index: row.order_index,
    meta,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
    children: [] // Will be populated by tree method
  };
}
