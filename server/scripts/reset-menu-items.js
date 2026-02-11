// Script to reset and repopulate menu items in the database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetMenuItems() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orthodoxmetrics_db'
  });

  try {
    console.log('🔄 Resetting menu items...');
    
    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Clear existing data
    console.log('🗑️ Clearing existing menu data...');
    await connection.execute('TRUNCATE TABLE role_menu_permissions');
    await connection.execute('TRUNCATE TABLE menu_items');
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Existing data cleared');
    
    // Now populate with complete menu structure
    console.log('📝 Populating complete menu structure...');
    
    // Insert main menu categories
    await connection.execute(`
      INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
      ('dashboard', 'Dashboard', '/dashboard', 'IconDashboard', NULL, 1, TRUE, 'Main dashboard - always visible'),
      ('apps', 'Applications', NULL, 'IconApps', NULL, 10, FALSE, 'Application modules'),
      ('records', 'Records Management', NULL, 'IconBooks', NULL, 20, FALSE, 'Church records management'),
      ('calendar', 'Calendar', '/apps/calendar', 'IconCalendar', NULL, 30, FALSE, 'Calendar and events'),
      ('social', 'Social', NULL, 'IconUsers', NULL, 40, FALSE, 'Social features'),
      ('admin', 'Administration', NULL, 'IconSettings', NULL, 50, FALSE, 'Administrative functions'),
      ('reports', 'Reports', NULL, 'IconChartBar', NULL, 60, FALSE, 'Reports and analytics'),
      ('tools', 'Tools', NULL, 'IconTool', NULL, 70, FALSE, 'Development tools'),
      ('settings', 'Settings', '/settings', 'IconSettings', NULL, 80, FALSE, 'User settings'),
      ('profile', 'Profile', '/profile', 'IconUserCircle', NULL, 999, TRUE, 'User profile - always accessible')
    `);
    
    console.log('✅ Main categories created');
    
    // Get parent IDs
    const [parents] = await connection.execute('SELECT id, menu_key FROM menu_items WHERE parent_id IS NULL');
    const parentMap = {};
    parents.forEach(p => parentMap[p.menu_key] = p.id);
    
    // Applications submenu
    if (parentMap.apps) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description) VALUES
        ('notes', 'Notes', '/apps/notes', 'IconNotes', ?, 1, 'Notes application'),
        ('email', 'Email', '/apps/email', 'IconMail', ?, 2, 'Email client'),
        ('chat', 'Chat', '/apps/chat', 'IconMessage', ?, 3, 'Chat application'),
        ('contacts', 'Contacts', '/apps/contacts', 'IconUsers', ?, 4, 'Contact management'),
        ('kanban', 'Kanban Board', '/apps/kanban', 'IconBorderAll', ?, 5, 'Task management'),
        ('invoice', 'Invoices', '/apps/invoice', 'IconFileInvoice', ?, 6, 'Invoice management'),
        ('ecommerce', 'E-Commerce', '/apps/ecommerce', 'IconShoppingCart', ?, 7, 'E-commerce features'),
        ('liturgical_calendar', 'Orthodox Calendar', '/apps/liturgical-calendar', 'IconCalendar', ?, 8, 'Liturgical calendar')
      `, Array(8).fill(parentMap.apps));
      console.log('✅ Applications menu populated');
    }
    
    // Records Management submenu
    if (parentMap.records) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description) VALUES
        ('baptism_records', 'Baptism Records', '/records/baptism', 'IconFileCheck', ?, 1, 'Baptism records'),
        ('marriage_records', 'Marriage Records', '/records/marriage', 'IconHeart', ?, 2, 'Marriage records'),
        ('funeral_records', 'Funeral Records', '/records/funeral', 'IconFileDescription', ?, 3, 'Funeral records'),
        ('church_records', 'Church Records', '/pages/records', 'IconBuildingChurch', ?, 4, 'General church records'),
        ('import_records', 'Import Records', '/records/import', 'IconUpload', ?, 5, 'Import records'),
        ('record_management', 'Records Management', '/apps/records', 'IconDatabase', ?, 6, 'Manage all records')
      `, Array(6).fill(parentMap.records));
      console.log('✅ Records menu populated');
    }
    
    // Administration submenu
    if (parentMap.admin) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description) VALUES
        ('user_management', 'User Management', '/admin/users', 'IconUsers', ?, 1, 'Manage users'),
        ('role_management', 'Role Management', '/admin/roles', 'IconShield', ?, 2, 'Manage roles'),
        ('menu_configuration', 'Menu Configuration', '/admin/menu-configuration', 'IconMenu', ?, 3, 'Configure menus'),
        ('menu_permissions', 'Menu Permissions', '/admin/menu-permissions', 'IconLock', ?, 4, 'Menu permissions'),
        ('activity_logs', 'Activity Logs', '/admin/activity-logs', 'IconActivity', ?, 5, 'View activity'),
        ('session_management', 'Sessions', '/admin/sessions', 'IconKey', ?, 6, 'Manage sessions'),
        ('church_management', 'Churches', '/apps/church-management', 'IconBuildingChurch', ?, 7, 'Manage churches'),
        ('system_settings', 'System Settings', '/admin/settings', 'IconAdjustments', ?, 8, 'System config'),
        ('omai_logger', 'OMAI Logger', '/omai/logger', 'IconTerminal', ?, 9, 'System logs'),
        ('build_console', 'Build Console', '/admin/build', 'IconTerminal', ?, 10, 'Build console'),
        ('blog_admin', 'Blog Admin', '/admin/blog-admin', 'IconWriting', ?, 11, 'Manage blog')
      `, Array(11).fill(parentMap.admin));
      console.log('✅ Administration menu populated');
    }
    
    // Social submenu
    if (parentMap.social) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description) VALUES
        ('blog', 'Blog', '/social/blog', 'IconWriting', ?, 1, 'Blog and articles'),
        ('friends', 'Friends', '/social/friends', 'IconUserPlus', ?, 2, 'Friends network'),
        ('social_chat', 'Chat', '/social/chat', 'IconMessage', ?, 3, 'Social chat'),
        ('notifications', 'Notifications', '/social/notifications', 'IconBell', ?, 4, 'Notifications')
      `, Array(4).fill(parentMap.social));
      console.log('✅ Social menu populated');
    }
    
    // Reports submenu
    if (parentMap.reports) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description) VALUES
        ('analytics', 'Analytics', '/dashboards/analytics', 'IconChartLine', ?, 1, 'Analytics dashboard'),
        ('financial', 'Financial Reports', '/reports/financial', 'IconCash', ?, 2, 'Financial reports'),
        ('membership', 'Membership', '/reports/membership', 'IconUsers', ?, 3, 'Membership stats'),
        ('activity_reports', 'Activity', '/reports/activity', 'IconActivity', ?, 4, 'Activity reports')
      `, Array(4).fill(parentMap.reports));
      console.log('✅ Reports menu populated');
    }
    
    // Tools submenu
    if (parentMap.tools) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description) VALUES
        ('site_structure', 'Site Structure', '/tools/site-structure', 'IconSitemap', ?, 1, 'View site structure'),
        ('jit_terminal', 'JIT Terminal', '/admin/jit-terminal', 'IconTerminal', ?, 2, 'Terminal access'),
        ('site_editor', 'Site Editor', '/demos/site-editor', 'IconEdit', ?, 3, 'Edit site'),
        ('auto_fix', 'Auto Fix Demo', '/demos/auto-fix', 'IconWrench', ?, 4, 'Auto fix demo'),
        ('gitops', 'GitOps Demo', '/demos/gitops', 'IconGitBranch', ?, 5, 'GitOps demo'),
        ('vrt_demo', 'VRT Demo', '/demos/vrt', 'IconBug', ?, 6, 'VRT testing demo')
      `, Array(6).fill(parentMap.tools));
      console.log('✅ Tools menu populated');
    }
    
    // Now set comprehensive default permissions
    console.log('📝 Setting default permissions for all roles...');
    
    // Super Admin - sees everything
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'super_admin', id, TRUE FROM menu_items
    `);
    
    // Admin - sees most things except system settings and menu config
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'admin', id, TRUE FROM menu_items 
      WHERE menu_key NOT IN ('system_settings', 'menu_configuration', 'menu_permissions')
    `);
    
    // Manager - operational items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'manager', id, TRUE FROM menu_items 
      WHERE parent_id IN (
        SELECT id FROM (SELECT id FROM menu_items WHERE menu_key IN ('apps', 'records', 'reports')) AS parent_items
      ) OR menu_key IN ('dashboard', 'profile', 'apps', 'records', 'calendar', 'reports', 'settings')
    `);
    
    // Priest - church-related items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'priest', id, TRUE FROM menu_items 
      WHERE menu_key IN (
        'dashboard', 'profile', 'calendar', 'records',
        'baptism_records', 'marriage_records', 'funeral_records', 'church_records',
        'notes', 'contacts', 'membership', 'liturgical_calendar'
      )
    `);
    
    // Deacon - limited church items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'deacon', id, TRUE FROM menu_items 
      WHERE menu_key IN (
        'dashboard', 'profile', 'calendar', 
        'notes', 'contacts', 'liturgical_calendar'
      )
    `);
    
    // User - basic features
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'user', id, TRUE FROM menu_items 
      WHERE menu_key IN (
        'dashboard', 'profile', 'calendar', 'settings',
        'notes', 'social', 'blog', 'friends', 'social_chat', 'notifications',
        'apps'
      )
    `);
    
    // Viewer - minimal access
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'viewer', id, TRUE FROM menu_items 
      WHERE menu_key IN ('dashboard', 'profile', 'calendar', 'blog')
    `);
    
    console.log('✅ Default permissions set for all roles');
    
    // Show final statistics
    const [itemCount] = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
    const [permCount] = await connection.execute('SELECT COUNT(*) as count FROM role_menu_permissions');
    const [parentCount] = await connection.execute('SELECT COUNT(*) as count FROM menu_items WHERE parent_id IS NULL');
    const [childCount] = await connection.execute('SELECT COUNT(*) as count FROM menu_items WHERE parent_id IS NOT NULL');
    
    console.log(`
╔════════════════════════════════════════╗
║   Menu Reset Complete! 🎉              ║
╠════════════════════════════════════════╣
║   Total menu items: ${String(itemCount[0].count).padEnd(19)}║
║   - Parent items: ${String(parentCount[0].count).padEnd(21)}║
║   - Child items: ${String(childCount[0].count).padEnd(22)}║
║   Total permissions: ${String(permCount[0].count).padEnd(18)}║
╚════════════════════════════════════════╝

✅ The Menu Configuration page should now show all menu items.
   Navigate to: /admin/menu-configuration
    `);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await connection.end();
  }
}

// Run the script
resetMenuItems().catch(console.error);
