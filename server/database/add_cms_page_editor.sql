-- Add Page Editor submenu item (assuming CMS parent already exists)
INSERT IGNORE INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
('cms_page_editor', 'Page Editor', '/apps/cms/page-editor', 'IconFileText', (SELECT id FROM menu_items WHERE menu_key = 'cms'), 1, FALSE, 'Rich text editor for creating and editing pages');

-- Grant permissions to super_admin and admin roles for both CMS and Page Editor
INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'super_admin', id, TRUE FROM menu_items WHERE menu_key IN ('cms', 'cms_page_editor');

INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'admin', id, TRUE FROM menu_items WHERE menu_key IN ('cms', 'cms_page_editor');

-- Check if the menu items were created successfully
SELECT m.id, m.menu_key, m.title, m.path, m.parent_id, p.title as parent_title
FROM menu_items m
LEFT JOIN menu_items p ON m.parent_id = p.id
WHERE m.menu_key IN ('cms', 'cms_page_editor')
ORDER BY m.parent_id, m.display_order;
