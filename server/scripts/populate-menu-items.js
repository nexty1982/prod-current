// Script to populate menu items in the database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function populateMenuItems() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orthodoxmetrics_db'
  });

  try {
    console.log('🔍 Checking menu_items table...');
    
    // Check if menu_items table exists
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'menu_items'",
      [process.env.DB_NAME || 'orthodoxmetrics_db']
    );
    
    if (tables.length === 0) {
      console.log('❌ menu_items table does not exist. Running migration first...');
      
      // Create the tables
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          menu_key VARCHAR(100) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          path VARCHAR(255),
          icon VARCHAR(100),
          parent_id INT NULL,
          display_order INT DEFAULT 0,
          is_system_required BOOLEAN DEFAULT FALSE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
          INDEX idx_menu_parent (parent_id),
          INDEX idx_menu_order (display_order),
          INDEX idx_menu_key (menu_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS role_menu_permissions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          role ENUM('super_admin', 'admin', 'manager', 'priest', 'deacon', 'user', 'viewer') NOT NULL,
          menu_item_id INT NOT NULL,
          is_visible BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
          UNIQUE KEY unique_role_menu (role, menu_item_id),
          INDEX idx_role_permissions (role),
          INDEX idx_menu_permissions (menu_item_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tables created successfully');
    }
    
    // Check if menu items exist
    const [existingItems] = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
    
    if (existingItems[0].count > 0) {
      console.log(`✅ Menu items already exist (${existingItems[0].count} items). Skipping population.`);
      return;
    }
    
    console.log('📝 Populating menu items...');
    
    // Insert main menu categories first
    await connection.execute(`
      INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
      ('dashboard', 'Dashboard', '/dashboard', 'IconDashboard', NULL, 1, TRUE, 'Main dashboard - always visible'),
      ('apps', 'Applications', NULL, 'IconApps', NULL, 10, FALSE, 'Application modules'),
      ('records', 'Records Management', NULL, 'IconBooks', NULL, 20, FALSE, 'Church records management'),
      ('calendar', 'Calendar', '/apps/calendar', 'IconCalendar', NULL, 30, FALSE, 'Calendar and events'),
      ('social', 'Social', NULL, 'IconUsers', NULL, 40, FALSE, 'Social features'),
      ('admin', 'Administration', NULL, 'IconSettings', NULL, 50, FALSE, 'Administrative functions'),
      ('reports', 'Reports', NULL, 'IconChartBar', NULL, 60, FALSE, 'Reports and analytics'),
      ('settings', 'Settings', '/settings', 'IconSettings', NULL, 70, FALSE, 'User settings'),
      ('profile', 'Profile', '/profile', 'IconUserCircle', NULL, 999, TRUE, 'User profile - always accessible')
    `);
    
    console.log('✅ Main menu categories created');
    
    // Get parent IDs for submenu items
    const [parents] = await connection.execute(`
      SELECT id, menu_key FROM menu_items WHERE parent_id IS NULL
    `);
    
    const parentMap = {};
    parents.forEach(p => {
      parentMap[p.menu_key] = p.id;
    });
    
    // Insert Apps submenu items
    if (parentMap.apps) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
        ('notes', 'Notes', '/apps/notes', 'IconNotes', ?, 1, FALSE, 'Notes application'),
        ('email', 'Email', '/apps/email', 'IconMail', ?, 2, FALSE, 'Email client'),
        ('chat', 'Chat', '/apps/chat', 'IconMessage', ?, 3, FALSE, 'Chat application'),
        ('contacts', 'Contacts', '/apps/contacts', 'IconUsers', ?, 4, FALSE, 'Contact management'),
        ('kanban', 'Kanban Board', '/apps/kanban', 'IconBorderAll', ?, 5, FALSE, 'Task management'),
        ('invoice', 'Invoices', '/apps/invoice', 'IconFileInvoice', ?, 6, FALSE, 'Invoice management'),
        ('ecommerce', 'E-Commerce', '/apps/ecommerce', 'IconShoppingCart', ?, 7, FALSE, 'E-commerce features')
      `, [
        parentMap.apps, parentMap.apps, parentMap.apps, parentMap.apps,
        parentMap.apps, parentMap.apps, parentMap.apps
      ]);
    }
    
    // Insert Records submenu items
    if (parentMap.records) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
        ('baptism_records', 'Baptism Records', '/records/baptism', 'IconFileCheck', ?, 1, FALSE, 'Baptism records management'),
        ('marriage_records', 'Marriage Records', '/records/marriage', 'IconHeart', ?, 2, FALSE, 'Marriage records management'),
        ('funeral_records', 'Funeral Records', '/records/funeral', 'IconFileDescription', ?, 3, FALSE, 'Funeral records management'),
        ('church_records', 'Church Records', '/pages/records', 'IconBuildingChurch', ?, 4, FALSE, 'General church records'),
        ('import_records', 'Import Records', '/records/import', 'IconUpload', ?, 5, FALSE, 'Import records from files')
      `, [
        parentMap.records, parentMap.records, parentMap.records,
        parentMap.records, parentMap.records
      ]);
    }
    
    // Insert Admin submenu items
    if (parentMap.admin) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
        ('user_management', 'User Management', '/admin/users', 'IconUsers', ?, 1, FALSE, 'Manage system users'),
        ('role_management', 'Role Management', '/admin/roles', 'IconShield', ?, 2, FALSE, 'Manage user roles'),
        ('menu_configuration', 'Menu Configuration', '/admin/menu-configuration', 'IconSettings', ?, 3, FALSE, 'Configure menu permissions'),
        ('activity_logs', 'Activity Logs', '/admin/activity-logs', 'IconActivity', ?, 4, FALSE, 'View system activity'),
        ('session_management', 'Session Management', '/admin/sessions', 'IconKey', ?, 5, FALSE, 'Manage user sessions'),
        ('system_settings', 'System Settings', '/admin/settings', 'IconAdjustments', ?, 6, FALSE, 'System configuration'),
        ('omai_logger', 'OMAI Logger', '/omai/logger', 'IconTerminal', ?, 7, FALSE, 'System logs viewer'),
        ('build_console', 'Build Console', '/admin/build', 'IconTerminal', ?, 8, FALSE, 'Build and deployment console')
      `, [
        parentMap.admin, parentMap.admin, parentMap.admin, parentMap.admin,
        parentMap.admin, parentMap.admin, parentMap.admin, parentMap.admin
      ]);
    }
    
    // Insert Social submenu items
    if (parentMap.social) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
        ('blog', 'Blog', '/social/blog', 'IconWriting', ?, 1, FALSE, 'Blog and articles'),
        ('friends', 'Friends', '/social/friends', 'IconUserPlus', ?, 2, FALSE, 'Friends network'),
        ('social_chat', 'Chat', '/social/chat', 'IconMessage', ?, 3, FALSE, 'Social chat'),
        ('notifications', 'Notifications', '/social/notifications', 'IconBell', ?, 4, FALSE, 'Social notifications')
      `, [
        parentMap.social, parentMap.social, parentMap.social, parentMap.social
      ]);
    }
    
    // Insert Reports submenu items
    if (parentMap.reports) {
      await connection.execute(`
        INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) VALUES
        ('analytics', 'Analytics', '/reports/analytics', 'IconChartLine', ?, 1, FALSE, 'Analytics dashboard'),
        ('financial', 'Financial Reports', '/reports/financial', 'IconCash', ?, 2, FALSE, 'Financial reports'),
        ('membership', 'Membership Reports', '/reports/membership', 'IconUsers', ?, 3, FALSE, 'Membership statistics'),
        ('activity_reports', 'Activity Reports', '/reports/activity', 'IconActivity', ?, 4, FALSE, 'Activity reports')
      `, [
        parentMap.reports, parentMap.reports, parentMap.reports, parentMap.reports
      ]);
    }
    
    console.log('✅ Submenu items created');
    
    // Now set default permissions for all roles
    console.log('📝 Setting default role permissions...');
    
    // Super Admin sees everything
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'super_admin', id, TRUE FROM menu_items
    `);
    
    // Admin sees most things (exclude system settings and menu configuration)
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'admin', id, TRUE FROM menu_items 
      WHERE menu_key NOT IN ('system_settings', 'menu_configuration')
    `);
    
    // Manager sees operational items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'manager', id, TRUE FROM menu_items 
      WHERE menu_key IN ('dashboard', 'profile', 'apps', 'records', 'calendar', 'reports', 
                         'notes', 'email', 'contacts', 'kanban', 'invoice',
                         'baptism_records', 'marriage_records', 'funeral_records', 'church_records',
                         'analytics', 'financial', 'membership', 'activity_reports')
    `);
    
    // Priest sees church-related items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'priest', id, TRUE FROM menu_items 
      WHERE menu_key IN ('dashboard', 'profile', 'records', 'calendar', 
                         'baptism_records', 'marriage_records', 'funeral_records', 'church_records',
                         'notes', 'contacts', 'membership')
    `);
    
    // Deacon sees limited church items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'deacon', id, TRUE FROM menu_items 
      WHERE menu_key IN ('dashboard', 'profile', 'calendar', 'notes', 'contacts')
    `);
    
    // User sees basic items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'user', id, TRUE FROM menu_items 
      WHERE menu_key IN ('dashboard', 'profile', 'calendar', 'notes', 'social', 
                         'blog', 'friends', 'social_chat', 'notifications')
    `);
    
    // Viewer sees minimal items
    await connection.execute(`
      INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
      SELECT 'viewer', id, TRUE FROM menu_items 
      WHERE menu_key IN ('dashboard', 'profile', 'calendar', 'blog')
    `);
    
    console.log('✅ Default role permissions set');
    
    // Get final counts
    const [itemCount] = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
    const [permCount] = await connection.execute('SELECT COUNT(*) as count FROM role_menu_permissions');
    
    console.log(`
✅ Menu population complete!
   - Total menu items: ${itemCount[0].count}
   - Total permissions: ${permCount[0].count}
   
You can now access the Menu Configuration page to manage permissions.
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Run the script
populateMenuItems().catch(console.error);
