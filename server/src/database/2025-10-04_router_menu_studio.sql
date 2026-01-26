-- Router/Menu Studio - Database Schema Migration
-- Date: 2025-10-04
-- Feature: routerMenuStudio

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(255) NOT NULL,
  component VARCHAR(255) NOT NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  layout VARCHAR(64) NULL,
  roles JSON NULL,              -- e.g. ["super_admin","admin","user"]
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  tags JSON NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL,
  
  -- Indexes
  INDEX idx_routes_path_unique (path),
  INDEX idx_routes_is_active_order (is_active, order_index),
  INDEX idx_routes_layout (layout),
  INDEX idx_routes_updated_at (updated_at)
);

-- Menu tree table
CREATE TABLE IF NOT EXISTS menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  key_name VARCHAR(255) NOT NULL,   -- unique key for UI
  label VARCHAR(255) NOT NULL,
  icon VARCHAR(128) NULL,
  path VARCHAR(255) NULL,           -- link to a route path
  roles JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL,
  
  -- Foreign key constraint
  CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_menus_key_unique (key_name),
  INDEX idx_menus_parent_active_order (parent_id, is_active, order_index),
  INDEX idx_menus_path (path),
  INDEX idx_menus_updated_at (updated_at)
);

-- Seed minimal examples for the studio page itself
INSERT IGNORE INTO routes (
  path, component, title, description, layout, roles, is_active, order_index, tags, meta
) VALUES (
  '/devel/router-menu-studio', 
  'src/features/router-menu-studio/RouterMenuStudioPage', 
  'Router/Menu Studio', 
  'Studio to manage routes and menus', 
  'vertical', 
  JSON_ARRAY('super_admin'), 
  1, 
  99999, 
  JSON_ARRAY('devel-tools', 'studio'),
  JSON_OBJECT('feature', 'routerMenuStudio', 'version', '1.0')
);

INSERT IGNORE INTO menus (
  parent_id, key_name, label, icon, path, roles, is_active, order_index, meta
) VALUES (
  NULL, 
  'router-menu-studio', 
  'Router/Menu Studio', 
  'IconLayoutDashboard', 
  '/devel/router-menu-studio', 
  JSON_ARRAY('super_admin'), 
  1, 
  99999, 
  JSON_OBJECT('feature', 'routerMenuStudio', 'version', '1.0')
);

-- Seed some example routes for demonstration
INSERT IGNORE INTO routes (
  path, component, title, description, layout, roles, is_active, order_index, tags, meta
) VALUES 
(
  '/dashboard', 
  'src/pages/Dashboard', 
  'Dashboard', 
  'Main application dashboard', 
  'vertical', 
  JSON_ARRAY('user', 'admin', 'super_admin'), 
  1, 
  1,
  JSON_ARRAY('core', 'navigation'),
  JSON_OBJECT()
),
(
  '/users', 
  'src/pages/Users', 
  'Users', 
  'User management interface', 
  'vertical', 
  JSON_ARRAY('admin', 'super_admin'), 
  1, 
  2,
  JSON_ARRAY('management', 'admin'),
  JSON_OBJECT()
),
(
  '/devel-tools', 
  'src/layouts/DevTools', 
  'Developer Tools', 
  'Development tools and utilities', 
  'vertical', 
  JSON_ARRAY('super_admin'), 
  1, 
  50,
  JSON_ARRAY('devel-tools'),
  JSON_OBJECT()
);

-- Seed some example menu items for demonstration
INSERT IGNORE INTO menus (
  parent_id, key_name, label, icon, path, roles, is_active, order_index, meta
) VALUES 
( NULL, 'home', 'Home', 'IconHome', '/dashboard', JSON_ARRAY('user', 'admin', 'super_admin'), 1, 1, JSON_OBJECT() ),
( NULL, 'users', 'Users', 'IconUsers', '/users', JSON_ARRAY('admin', 'super_admin'), 1, 2, JSON_OBJECT() ),
( NULL, 'devel-tools', 'Devel Tools', 'IconSettings', NULL, JSON_ARRAY('super_admin'), 1, 99990, JSON_OBJECT() );

-- Add router-menu-studio as child of devel-tools
INSERT IGNORE INTO menus (
  parent_id, key_name, label, icon, path, roles, is_active, order_index, meta
) 
SELECT 
  (SELECT id FROM menus WHERE key_name = 'devel-tools' LIMIT 1),
  'router-menu-studio-child',
  'Router/Menu Studio',
  'IconLayoutDashboard',
  '/devel/router-menu-studio',
  JSON_ARRAY('super_admin'),
  1,
  1,
  JSON_OBJECT('feature', 'routerMenuStudio', 'version', '1.0')
WHERE EXISTS (SELECT 1 FROM menus WHERE key_name = 'devel-tools');

-- Update route (if migration completed)
UPDATE migrations SET migration_run = CURRENT_TIMESTAMP, notes = 'Router/Menu Studio schema created' 
WHERE migration_name = '2025-10-04_router_menu_studio' OR migration_name LIKE '%router_menu_studio%';

-- If migrations table doesn't exist, log success
SELECT 'Router/Menu Studio migration completed successfully' as result;
