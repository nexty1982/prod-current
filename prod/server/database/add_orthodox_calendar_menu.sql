-- Add Orthodox Calendar to Menu System
-- This adds the Orthodox Calendar as a general church feature available to all clients

-- Insert Orthodox Calendar menu item
INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) 
VALUES ('orthodox-calendar', 'Orthodox Calendar', '/orthodox-calendar.html', 'IconCalendarEvent', NULL, 2, FALSE, 'Orthodox liturgical calendar with daily saints and readings')
ON DUPLICATE KEY UPDATE 
    title = 'Orthodox Calendar',
    path = '/orthodox-calendar.html',
    icon = 'IconCalendarEvent',
    display_order = 2,
    description = 'Orthodox liturgical calendar with daily saints and readings';

-- Set permissions for all roles to access Orthodox Calendar
-- This allows all church staff to view the liturgical calendar
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'super_admin', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'admin', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'manager', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'user', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'viewer', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'priest', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
SELECT 'deacon', id, TRUE FROM menu_items WHERE menu_key = 'orthodox-calendar'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

-- Update display order for other menu items to accommodate Orthodox Calendar
UPDATE menu_items SET display_order = display_order + 1 WHERE display_order >= 2 AND menu_key != 'orthodox-calendar';

-- Verify the insertion
SELECT 
    mi.menu_key,
    mi.title,
    mi.path,
    mi.display_order,
    COUNT(rmp.role) as roles_with_access
FROM menu_items mi
LEFT JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id AND rmp.is_visible = TRUE
WHERE mi.menu_key = 'orthodox-calendar'
GROUP BY mi.id;
