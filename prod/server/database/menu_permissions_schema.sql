-- Menu permissions system for role-based menu control
-- Allows super admin to control what menu items each role can see

-- Menu items table - defines all available menu items
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    menu_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(100),
    parent_id INT NULL,
    display_order INT DEFAULT 0,
    is_system_required BOOLEAN DEFAULT FALSE, -- Cannot be disabled (like logout, profile)
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    INDEX idx_menu_parent (parent_id),
    INDEX idx_menu_order (display_order)
);

-- Role menu permissions - controls which roles can see which menu items
CREATE TABLE IF NOT EXISTS role_menu_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role ENUM('super_admin', 'admin', 'manager', 'user', 'viewer', 'priest', 'deacon') NOT NULL,
    menu_item_id INT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_menu (role, menu_item_id),
    INDEX idx_role_permissions (role),
    INDEX idx_menu_permissions (menu_item_id)
);

-- Insert default menu items based on current system
INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
-- Main navigation items
('dashboard', 'Dashboard', '/dashboard', 'IconDashboard', NULL, 1, TRUE, 'Main dashboard view'),
('calendar', 'Calendar', '/calendar', 'IconCalendar', NULL, 2, FALSE, 'Calendar and events'),
('records', 'Records', NULL, 'IconBooks', NULL, 3, FALSE, 'Records management section'),
('certificates', 'Certificates', NULL, 'IconCertificate', NULL, 4, FALSE, 'Certificate management'),
('billing', 'Billing', NULL, 'IconCreditCard', NULL, 5, FALSE, 'Billing and invoicing'),
('admin', 'Administration', NULL, 'IconSettings', NULL, 6, FALSE, 'Administrative functions'),
('profile', 'Profile', '/profile', 'IconUser', NULL, 99, TRUE, 'User profile management'),

-- Records submenu
('records.baptism', 'Baptism Records', '/baptism-records', 'IconDroplet', 3, 1, FALSE, 'Baptism record management'),
('records.marriage', 'Marriage Records', '/marriage-records', 'IconHeart', 3, 2, FALSE, 'Marriage record management'),
('records.funeral', 'Funeral Records', '/funeral-records', 'IconCross', 3, 3, FALSE, 'Funeral record management'),

-- Certificates submenu  
('certificates.baptism', 'Baptism Certificates', '/certificates/baptism', 'IconCertificate', 4, 1, FALSE, 'Generate baptism certificates'),
('certificates.marriage', 'Marriage Certificates', '/certificates/marriage', 'IconCertificate', 4, 2, FALSE, 'Generate marriage certificates'),

-- Billing submenu
('billing.invoices', 'Invoices', '/billing/invoices', 'IconReceipt', 5, 1, FALSE, 'Invoice management'),
('billing.payments', 'Payments', '/billing/payments', 'IconCreditCard', 5, 2, FALSE, 'Payment tracking'),

-- Admin submenu
('admin.users', 'User Management', '/admin/users', 'IconUsers', 6, 1, FALSE, 'Manage system users'),
('admin.churches', 'Church Management', '/admin/churches', 'IconBuilding', 6, 2, FALSE, 'Manage churches'),
('admin.roles', 'Role Management', '/admin/roles', 'IconShield', 6, 3, FALSE, 'Manage user roles'),
('admin.menu', 'Menu Management', '/admin/menu', 'IconMenu', 6, 4, FALSE, 'Manage menu permissions'),
('admin.settings', 'System Settings', '/admin/settings', 'IconSettings', 6, 5, FALSE, 'System configuration'),
('admin.logs', 'System Logs', '/admin/logs', 'IconFileText', 6, 6, FALSE, 'View system logs');

-- Insert default permissions for all roles
-- Super admin gets access to everything
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'super_admin', id, TRUE FROM menu_items;

-- Admin gets access to most items except super admin specific ones
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'admin', id, 
    CASE 
        WHEN menu_key IN ('admin.menu', 'admin.churches') THEN FALSE -- Super admin only
        ELSE TRUE 
    END
FROM menu_items;

-- Manager role gets access to records and basic functions
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'manager', id,
    CASE 
        WHEN menu_key LIKE 'admin.%' THEN FALSE -- No admin access
        WHEN menu_key LIKE 'billing.%' THEN FALSE -- No billing access  
        ELSE TRUE
    END
FROM menu_items;

-- Priest role gets access to records and certificates
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'priest', id,
    CASE 
        WHEN menu_key LIKE 'admin.%' THEN FALSE -- No admin access
        WHEN menu_key LIKE 'billing.%' THEN FALSE -- No billing access
        ELSE TRUE
    END
FROM menu_items;

-- User role gets basic access
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'user', id,
    CASE 
        WHEN menu_key IN ('dashboard', 'calendar', 'profile') THEN TRUE
        ELSE FALSE
    END
FROM menu_items;

-- Viewer role gets minimal access  
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'viewer', id,
    CASE 
        WHEN menu_key IN ('dashboard', 'profile') THEN TRUE
        ELSE FALSE
    END
FROM menu_items;

-- Deacon role gets access similar to priest but more limited
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'deacon', id,
    CASE 
        WHEN menu_key LIKE 'admin.%' THEN FALSE -- No admin access
        WHEN menu_key LIKE 'billing.%' THEN FALSE -- No billing access
        WHEN menu_key LIKE 'certificates.%' THEN FALSE -- No certificate generation
        WHEN menu_key IN ('dashboard', 'calendar', 'records', 'records.baptism', 'records.marriage', 'records.funeral', 'profile') THEN TRUE
        ELSE FALSE
    END
FROM menu_items;
