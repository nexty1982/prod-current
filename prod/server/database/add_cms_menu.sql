-- Add CMS menu item to the menu_items table
INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
('cms', 'CMS', '/apps/cms', 'IconEdit', NULL, 15, FALSE, 'Content Management System - Edit pages and manage content');

-- Add Page Editor submenu item
INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
('cms_page_editor', 'Page Editor', '/apps/cms/page-editor', 'IconFileText', (SELECT id FROM menu_items WHERE menu_key = 'cms'), 1, FALSE, 'Rich text editor for creating and editing pages');

-- Grant permissions to super_admin and admin roles
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'super_admin', id, TRUE FROM menu_items WHERE menu_key IN ('cms', 'cms_page_editor');

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'admin', id, TRUE FROM menu_items WHERE menu_key IN ('cms', 'cms_page_editor');

-- Check if the menu items were created successfully
SELECT * FROM menu_items WHERE menu_key IN ('cms', 'cms_page_editor');
