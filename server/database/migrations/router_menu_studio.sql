-- Router Menu Studio Database Schema
-- Created: September 27, 2025
-- Description: Tables for dynamic router and menu management system

-- Use the main database
USE orthodoxmetrics_db;

-- menus: one row per menu set (e.g., super_admin, default)
CREATE TABLE IF NOT EXISTS menus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  role ENUM('super_admin','default') NOT NULL DEFAULT 'default',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  created_by VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- router_menu_items: hierarchical menu items for dynamic menus
CREATE TABLE IF NOT EXISTS router_menu_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT NOT NULL,
  label VARCHAR(256) NOT NULL,
  path VARCHAR(512) NULL,
  icon VARCHAR(128) NULL,
  parent_id BIGINT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_devel_tool TINYINT(1) NOT NULL DEFAULT 0,
  visible_roles JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES router_menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu_id (menu_id), 
  INDEX idx_parent_id (parent_id), 
  INDEX idx_sort_order (sort_order),
  INDEX idx_devel_tool (is_devel_tool)
);

-- routes: record SPA routes & component targets
CREATE TABLE IF NOT EXISTS routes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(512) NOT NULL UNIQUE,
  component_path VARCHAR(512) NOT NULL,  -- e.g., '@/features/admin/...'
  title VARCHAR(256) NULL,
  required_role ENUM('super_admin','default','anonymous') NOT NULL DEFAULT 'default',
  is_protected TINYINT(1) NOT NULL DEFAULT 1,
  meta JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_required_role (required_role),
  INDEX idx_is_protected (is_protected)
);

-- versions / audit
CREATE TABLE IF NOT EXISTS router_menu_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope ENUM('routes','menu') NOT NULL,
  scope_id BIGINT NULL,       -- menu_id or NULL for routes snapshot
  change_type ENUM('create','update','delete','publish','reorder','template') NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  changed_by VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scope (scope),
  INDEX idx_scope_id (scope_id),
  INDEX idx_change_type (change_type),
  INDEX idx_changed_by (changed_by)
);

-- templates: store menu/route templates
CREATE TABLE IF NOT EXISTS router_menu_templates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  description TEXT NULL,
  template_type ENUM('menu','routes','combined') NOT NULL DEFAULT 'menu',
  payload JSON NOT NULL,
  created_by VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_template_type (template_type),
  INDEX idx_created_by (created_by)
);

-- Insert default menu sets
INSERT INTO menus (name, role, is_active, version, created_by) VALUES 
('Super Admin Menu', 'super_admin', 1, 1, 'system'),
('Default Menu', 'default', 1, 1, 'system')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insert some sample routes (based on existing router structure)
INSERT IGNORE INTO routes (path, component_path, title, required_role, is_protected, meta) VALUES
('/dashboards/modern', 'views/dashboard/EnhancedModernDashboard', 'Enhanced Modern Dashboard', 'default', 1, '{"permission": "view_dashboard"}'),
('/dashboards/orthodmetrics', 'views/dashboard/OrthodoxMetrics', 'Orthodox Metrics Dashboard', 'super_admin', 1, '{"permission": "admin_dashboard"}'),
('/admin/dashboard', 'components/admin/SuperAdminDashboard', 'Super Admin Console', 'super_admin', 1, NULL),
('/apps/church-management', 'views/apps/church-management/ChurchList', 'Church Management', 'default', 1, '{"permission": "manage_churches"}'),
('/tools/site-structure', 'tools/SiteStructureVisualizer', 'Site Structure Visualizer', 'super_admin', 1, '{"permission": "admin"}'),
('/admin/users', 'views/admin/UserManagement', 'User Management', 'super_admin', 1, NULL),
('/admin/permissions', 'views/admin/PermissionsManagement', 'Permissions Management', 'super_admin', 1, NULL);

-- Insert sample menu items for super_admin
SET @super_admin_menu_id = (SELECT id FROM menus WHERE role = 'super_admin' LIMIT 1);

INSERT IGNORE INTO router_menu_items (menu_id, label, path, icon, parent_id, sort_order, is_devel_tool, visible_roles) VALUES
(@super_admin_menu_id, 'Dashboards', NULL, 'IconLayoutDashboard', NULL, 10, 0, '["super_admin", "default"]'),
(@super_admin_menu_id, 'Enhanced Modern Dashboard', '/dashboards/modern', 'IconLayoutDashboard', 
  (SELECT id FROM (SELECT id FROM router_menu_items WHERE menu_id = @super_admin_menu_id AND label = 'Dashboards') AS t), 10, 0, '["super_admin", "default"]'),
(@super_admin_menu_id, 'Admin Dashboard', '/dashboards/orthodmetrics', 'IconShield', 
  (SELECT id FROM (SELECT id FROM router_menu_items WHERE menu_id = @super_admin_menu_id AND label = 'Dashboards') AS t), 20, 0, '["super_admin"]'),
(@super_admin_menu_id, 'Developer Tools', NULL, 'IconTerminal', NULL, 100, 1, '["super_admin"]'),
(@super_admin_menu_id, 'Router/Menu Studio', '/devel/router-menu-studio', 'IconSitemap', 
  (SELECT id FROM (SELECT id FROM router_menu_items WHERE menu_id = @super_admin_menu_id AND label = 'Developer Tools') AS t), 10, 1, '["super_admin"]');

-- Insert sample menu items for default
SET @default_menu_id = (SELECT id FROM menus WHERE role = 'default' LIMIT 1);

INSERT IGNORE INTO router_menu_items (menu_id, label, path, icon, parent_id, sort_order, is_devel_tool, visible_roles) VALUES
(@default_menu_id, 'Dashboards', NULL, 'IconLayoutDashboard', NULL, 10, 0, '["default"]'),
(@default_menu_id, 'Enhanced Modern Dashboard', '/dashboards/modern', 'IconLayoutDashboard', 
  (SELECT id FROM (SELECT id FROM router_menu_items WHERE menu_id = @default_menu_id AND label = 'Dashboards') AS t), 10, 0, '["default"]'),
(@default_menu_id, 'Church', NULL, 'OrthodoxChurchIcon', NULL, 20, 0, '["default"]'),
(@default_menu_id, 'Church Management', '/apps/church-management', 'OrthodoxChurchIcon', 
  (SELECT id FROM (SELECT id FROM router_menu_items WHERE menu_id = @default_menu_id AND label = 'Church') AS t), 10, 0, '["default"]');
