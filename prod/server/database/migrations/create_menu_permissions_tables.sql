-- Migration: Create Menu Permissions Tables
-- Date: 2025-01-09
-- Purpose: Support role-based menu configuration for super admins

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS role_menu_permissions;
-- DROP TABLE IF EXISTS menu_items;

-- Create menu_items table if not exists
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    menu_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(100),
    parent_id INT NULL,
    display_order INT DEFAULT 0,
    is_system_required BOOLEAN DEFAULT FALSE COMMENT 'Cannot be disabled (like logout, profile)',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    INDEX idx_menu_parent (parent_id),
    INDEX idx_menu_order (display_order),
    INDEX idx_menu_key (menu_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create role_menu_permissions table if not exists
CREATE TABLE IF NOT EXISTS role_menu_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role ENUM('super_admin', 'admin', 'manager', 'priest', 'deacon', 'user', 'viewer') NOT NULL,
    menu_item_id INT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE COMMENT 'For future use - whether the item is enabled/clickable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_role_menu (role, menu_item_id),
    INDEX idx_role_permissions (role),
    INDEX idx_menu_permissions (menu_item_id),
    INDEX idx_visibility (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default menu items (main navigation structure)
INSERT IGNORE INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
-- Core items (system required)
('dashboard', 'Dashboard', '/dashboard', 'IconDashboard', NULL, 1, TRUE, 'Main dashboard - always visible'),
('profile', 'Profile', '/profile', 'IconUserCircle', NULL, 999, TRUE, 'User profile - always accessible'),

-- Main sections
('apps', 'Applications', NULL, 'IconApps', NULL, 10, FALSE, 'Application modules'),
('records', 'Records', NULL, 'IconBooks', NULL, 20, FALSE, 'Records management'),
('calendar', 'Calendar', '/apps/calendar', 'IconCalendar', NULL, 30, FALSE, 'Calendar and events'),
('social', 'Social', NULL, 'IconUsers', NULL, 40, FALSE, 'Social features'),
('admin', 'Administration', NULL, 'IconSettings', NULL, 50, FALSE, 'Administrative functions'),
('reports', 'Reports', NULL, 'IconChartBar', NULL, 60, FALSE, 'Reports and analytics'),
('settings', 'Settings', '/settings', 'IconSettings', NULL, 70, FALSE, 'System settings'),

-- Apps submenu
('notes', 'Notes', '/apps/notes', 'IconNotes', (SELECT id FROM menu_items WHERE menu_key = 'apps'), 1, FALSE, 'Notes application'),
('email', 'Email', '/apps/email', 'IconMail', (SELECT id FROM menu_items WHERE menu_key = 'apps'), 2, FALSE, 'Email client'),
('chat', 'Chat', '/apps/chat', 'IconMessage', (SELECT id FROM menu_items WHERE menu_key = 'apps'), 3, FALSE, 'Chat application'),
('contacts', 'Contacts', '/apps/contacts', 'IconUsers', (SELECT id FROM menu_items WHERE menu_key = 'apps'), 4, FALSE, 'Contact management'),
('kanban', 'Kanban Board', '/apps/kanban', 'IconBorderAll', (SELECT id FROM menu_items WHERE menu_key = 'apps'), 5, FALSE, 'Task management'),

-- Records submenu
('baptism_records', 'Baptism Records', '/records/baptism', 'IconFileCheck', (SELECT id FROM menu_items WHERE menu_key = 'records'), 1, FALSE, 'Baptism records management'),
('marriage_records', 'Marriage Records', '/records/marriage', 'IconHeart', (SELECT id FROM menu_items WHERE menu_key = 'records'), 2, FALSE, 'Marriage records management'),
('funeral_records', 'Funeral Records', '/records/funeral', 'IconFileDescription', (SELECT id FROM menu_items WHERE menu_key = 'records'), 3, FALSE, 'Funeral records management'),

-- Admin submenu
('user_management', 'User Management', '/admin/users', 'IconUsers', (SELECT id FROM menu_items WHERE menu_key = 'admin'), 1, FALSE, 'Manage system users'),
('role_management', 'Role Management', '/admin/roles', 'IconShield', (SELECT id FROM menu_items WHERE menu_key = 'admin'), 2, FALSE, 'Manage user roles'),
('menu_configuration', 'Menu Configuration', '/admin/menu-configuration', 'IconSettings', (SELECT id FROM menu_items WHERE menu_key = 'admin'), 3, FALSE, 'Configure menu permissions'),
('activity_logs', 'Activity Logs', '/admin/activity-logs', 'IconActivity', (SELECT id FROM menu_items WHERE menu_key = 'admin'), 4, FALSE, 'View system activity'),
('system_settings', 'System Settings', '/admin/settings', 'IconAdjustments', (SELECT id FROM menu_items WHERE menu_key = 'admin'), 5, FALSE, 'System configuration'),

-- Social submenu
('blog', 'Blog', '/social/blog', 'IconWriting', (SELECT id FROM menu_items WHERE menu_key = 'social'), 1, FALSE, 'Blog and articles'),
('friends', 'Friends', '/social/friends', 'IconUserPlus', (SELECT id FROM menu_items WHERE menu_key = 'social'), 2, FALSE, 'Friends network'),
('notifications', 'Notifications', '/social/notifications', 'IconBell', (SELECT id FROM menu_items WHERE menu_key = 'social'), 3, FALSE, 'Social notifications');

-- Set default permissions for roles
-- Super Admin sees everything
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'super_admin', id, TRUE FROM menu_items;

-- Admin sees most things (exclude system settings)
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'admin', id, TRUE FROM menu_items 
WHERE menu_key NOT IN ('system_settings', 'menu_configuration');

-- Manager sees operational items
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'manager', id, TRUE FROM menu_items 
WHERE menu_key IN ('dashboard', 'profile', 'apps', 'records', 'calendar', 'reports', 
                   'notes', 'email', 'contacts', 'kanban',
                   'baptism_records', 'marriage_records', 'funeral_records');

-- Priest sees church-related items
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'priest', id, TRUE FROM menu_items 
WHERE menu_key IN ('dashboard', 'profile', 'records', 'calendar', 
                   'baptism_records', 'marriage_records', 'funeral_records',
                   'notes', 'contacts');

-- Deacon sees limited church items
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'deacon', id, TRUE FROM menu_items 
WHERE menu_key IN ('dashboard', 'profile', 'calendar', 'notes');

-- User sees basic items
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'user', id, TRUE FROM menu_items 
WHERE menu_key IN ('dashboard', 'profile', 'calendar', 'notes', 'social', 'blog', 'friends', 'notifications');

-- Viewer sees minimal items
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'viewer', id, TRUE FROM menu_items 
WHERE menu_key IN ('dashboard', 'profile', 'calendar');

-- Grant to existing super_admin user ability to configure menus
-- This ensures the feature is accessible after migration
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@orthodoxmetrics.com' 
  AND role = 'admin'
LIMIT 1;

-- Add comment to tables
ALTER TABLE menu_items COMMENT = 'Defines all menu items in the application with hierarchical structure';
ALTER TABLE role_menu_permissions COMMENT = 'Controls which menu items are visible to each user role';

-- Success message
SELECT 'Menu permissions tables created successfully!' as message,
       (SELECT COUNT(*) FROM menu_items) as total_menu_items,
       (SELECT COUNT(*) FROM role_menu_permissions) as total_permissions,
       (SELECT COUNT(DISTINCT role) FROM role_menu_permissions) as configured_roles;
