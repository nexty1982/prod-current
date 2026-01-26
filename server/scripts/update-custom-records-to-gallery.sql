-- Script to update "Custom Records" menu item to "Gallery"
-- Run this script if menu items are stored in the database

-- First, check if "Custom Records" exists
SELECT * FROM menu_items WHERE title LIKE '%Custom Records%' OR title LIKE '%Custom%Records%';

-- Update "Custom Records" to "Gallery" and set the path to /apps/gallery
UPDATE menu_items 
SET 
  title = 'Gallery',
  path = '/apps/gallery',
  icon = 'IconPalette',
  menu_key = 'gallery'
WHERE title LIKE '%Custom Records%' OR title LIKE '%Custom%Records%';

-- If the menu item doesn't exist, you may need to insert it
-- This assumes you know the parent_id for where it should appear
-- INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description)
-- VALUES ('gallery', 'Gallery', '/apps/gallery', 'IconPalette', NULL, 25, FALSE, 'Image gallery');

-- Make sure Gallery is visible for all roles
INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'super_admin', id, TRUE FROM menu_items WHERE menu_key = 'gallery'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'admin', id, TRUE FROM menu_items WHERE menu_key = 'gallery'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
SELECT 'user', id, TRUE FROM menu_items WHERE menu_key = 'gallery'
ON DUPLICATE KEY UPDATE is_visible = TRUE;

