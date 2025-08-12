#!/usr/bin/env node

/**
 * Database Table Checker & Migration Script
 * 
 * Checks for missing database tables and creates them if needed.
 * This addresses the menu_role_permissions table error and other potential missing tables.
 */

const { promisePool } = require('../../config/db');

class DatabaseTableChecker {
  constructor() {
    this.requiredTables = {
      'menu_role_permissions': {
        description: 'Menu role permissions for user access control',
        createSql: `
          CREATE TABLE IF NOT EXISTS menu_role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            menu_item_id INT NOT NULL,
            role ENUM('super_admin', 'admin', 'church_admin', 'user') NOT NULL,
            can_view BOOLEAN DEFAULT TRUE,
            can_edit BOOLEAN DEFAULT FALSE,
            can_delete BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            UNIQUE KEY unique_menu_role (menu_item_id, role),
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
            INDEX idx_menu_role (menu_item_id, role),
            INDEX idx_role (role)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      },
      'menu_items': {
        description: 'Menu items for navigation',
        createSql: `
          CREATE TABLE IF NOT EXISTS menu_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            menu_key VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            path VARCHAR(255),
            icon VARCHAR(100),
            parent_id INT DEFAULT NULL,
            sort_order INT DEFAULT 0,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
            INDEX idx_parent (parent_id),
            INDEX idx_sort_order (sort_order),
            INDEX idx_active (is_active)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      }
    };
    
    this.defaultMenuItems = [
      {
        menu_key: 'dashboard',
        title: 'Dashboard',
        path: '/dashboard',
        icon: 'dashboard',
        parent_id: null,
        sort_order: 1,
        description: 'Main dashboard'
      },
      {
        menu_key: 'admin',
        title: 'Administration',
        path: '/admin',
        icon: 'admin_panel_settings',
        parent_id: null,
        sort_order: 2,
        description: 'Administrative functions'
      },
      {
        menu_key: 'admin_users',
        title: 'User Management',
        path: '/admin/users',
        icon: 'people',
        parent_id: null, // Will be updated after admin is created
        sort_order: 1,
        description: 'Manage system users'
      },
      {
        menu_key: 'admin_churches',
        title: 'Church Management',
        path: '/admin/churches',
        icon: 'church',
        parent_id: null, // Will be updated after admin is created
        sort_order: 2,
        description: 'Manage churches'
      },
      {
        menu_key: 'admin_templates',
        title: 'Template Manager',
        path: '/admin/template-manager',
        icon: 'description',
        parent_id: null, // Will be updated after admin is created
        sort_order: 3,
        description: 'Manage record templates'
      },
      {
        menu_key: 'records',
        title: 'Records',
        path: '/records',
        icon: 'folder',
        parent_id: null,
        sort_order: 3,
        description: 'Church records management'
      }
    ];
    
    this.defaultPermissions = [
      { menu_key: 'dashboard', role: 'super_admin', can_view: true, can_edit: true, can_delete: true },
      { menu_key: 'dashboard', role: 'admin', can_view: true, can_edit: false, can_delete: false },
      { menu_key: 'dashboard', role: 'church_admin', can_view: true, can_edit: false, can_delete: false },
      { menu_key: 'dashboard', role: 'user', can_view: true, can_edit: false, can_delete: false },
      
      { menu_key: 'admin', role: 'super_admin', can_view: true, can_edit: true, can_delete: true },
      { menu_key: 'admin', role: 'admin', can_view: true, can_edit: false, can_delete: false },
      
      { menu_key: 'admin_users', role: 'super_admin', can_view: true, can_edit: true, can_delete: true },
      { menu_key: 'admin_users', role: 'admin', can_view: true, can_edit: false, can_delete: false },
      
      { menu_key: 'admin_churches', role: 'super_admin', can_view: true, can_edit: true, can_delete: true },
      { menu_key: 'admin_churches', role: 'admin', can_view: true, can_edit: false, can_delete: false },
      
      { menu_key: 'admin_templates', role: 'super_admin', can_view: true, can_edit: true, can_delete: true },
      { menu_key: 'admin_templates', role: 'admin', can_view: true, can_edit: false, can_delete: false },
      
      { menu_key: 'records', role: 'super_admin', can_view: true, can_edit: true, can_delete: true },
      { menu_key: 'records', role: 'admin', can_view: true, can_edit: true, can_delete: false },
      { menu_key: 'records', role: 'church_admin', can_view: true, can_edit: true, can_delete: false },
      { menu_key: 'records', role: 'user', can_view: true, can_edit: false, can_delete: false }
    ];
  }

  async checkTables() {
    console.log('🔍 Checking Database Tables');
    console.log('=' .repeat(50));
    console.log('');

    const issues = [];

    for (const [tableName, tableInfo] of Object.entries(this.requiredTables)) {
      try {
        console.log(`📋 Checking table: ${tableName}`);
        
        const [tables] = await promisePool.query(
          "SHOW TABLES LIKE ?",
          [tableName]
        );

        if (tables.length === 0) {
          console.log(`❌ Table '${tableName}' does not exist`);
          issues.push({
            table: tableName,
            issue: 'missing',
            description: tableInfo.description,
            createSql: tableInfo.createSql
          });
        } else {
          console.log(`✅ Table '${tableName}' exists`);
          
          // Check if table has data
          const [count] = await promisePool.query(
            `SELECT COUNT(*) as total FROM ${tableName}`
          );
          console.log(`   📊 Records: ${count[0].total}`);
        }
      } catch (error) {
        console.log(`❌ Error checking table '${tableName}':`, error.message);
        issues.push({
          table: tableName,
          issue: 'error',
          error: error.message
        });
      }
      
      console.log('');
    }

    return issues;
  }

  async fixTables(issues) {
    console.log('🔧 Fixing Database Issues');
    console.log('=' .repeat(50));
    console.log('');

    const fixed = [];
    const failed = [];

    for (const issue of issues) {
      if (issue.issue === 'missing' && issue.createSql) {
        try {
          console.log(`🔨 Creating table: ${issue.table}`);
          console.log(`   ${issue.description}`);
          
          await promisePool.query(issue.createSql);
          console.log(`✅ Table '${issue.table}' created successfully`);
          fixed.push(issue.table);
          
        } catch (error) {
          console.log(`❌ Failed to create table '${issue.table}':`, error.message);
          failed.push({ table: issue.table, error: error.message });
        }
        
        console.log('');
      }
    }

    return { fixed, failed };
  }

  async populateMenuData() {
    console.log('📋 Populating Menu Data');
    console.log('=' .repeat(50));
    console.log('');

    try {
      // Check if menu_items table has data
      const [menuCount] = await promisePool.query(
        'SELECT COUNT(*) as total FROM menu_items'
      );

      if (menuCount[0].total === 0) {
        console.log('📝 Inserting default menu items...');
        
        // Insert menu items
        for (const item of this.defaultMenuItems) {
          try {
            const [result] = await promisePool.query(
              `INSERT INTO menu_items (menu_key, title, path, icon, parent_id, sort_order, description) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [item.menu_key, item.title, item.path, item.icon, item.parent_id, item.sort_order, item.description]
            );
            console.log(`✅ Created menu item: ${item.title}`);
          } catch (error) {
            console.log(`❌ Failed to create menu item '${item.title}':`, error.message);
          }
        }
        
        // Update parent relationships
        const [adminItem] = await promisePool.query(
          'SELECT id FROM menu_items WHERE menu_key = ?', ['admin']
        );
        
        if (adminItem.length > 0) {
          const adminId = adminItem[0].id;
          await promisePool.query(
            'UPDATE menu_items SET parent_id = ? WHERE menu_key IN (?, ?, ?)',
            [adminId, 'admin_users', 'admin_churches', 'admin_templates']
          );
          console.log('✅ Updated parent relationships for admin submenu items');
        }
        
      } else {
        console.log(`✅ Menu items already exist (${menuCount[0].total} items)`);
      }

      // Check if menu_role_permissions table has data
      const [permCount] = await promisePool.query(
        'SELECT COUNT(*) as total FROM menu_role_permissions'
      );

      if (permCount[0].total === 0) {
        console.log('🔐 Inserting default menu permissions...');
        
        for (const perm of this.defaultPermissions) {
          try {
            // Get menu item ID
            const [menuItem] = await promisePool.query(
              'SELECT id FROM menu_items WHERE menu_key = ?',
              [perm.menu_key]
            );
            
            if (menuItem.length > 0) {
              await promisePool.query(
                `INSERT INTO menu_role_permissions (menu_item_id, role, can_view, can_edit, can_delete) 
                 VALUES (?, ?, ?, ?, ?)`,
                [menuItem[0].id, perm.role, perm.can_view, perm.can_edit, perm.can_delete]
              );
              console.log(`✅ Created permission: ${perm.menu_key} -> ${perm.role}`);
            }
          } catch (error) {
            console.log(`❌ Failed to create permission for '${perm.menu_key}' -> '${perm.role}':`, error.message);
          }
        }
      } else {
        console.log(`✅ Menu permissions already exist (${permCount[0].total} permissions)`);
      }

    } catch (error) {
      console.log('❌ Error populating menu data:', error.message);
    }
  }

  async run() {
    console.log('🚀 Database Table Checker & Migration');
    console.log('=' .repeat(60));
    console.log('');

    try {
      // Test database connection
      console.log('🔌 Testing database connection...');
      const [result] = await promisePool.query('SELECT 1 as test');
      console.log('✅ Database connection successful');
      console.log('');

      // Check for missing tables
      const issues = await this.checkTables();

      if (issues.length > 0) {
        console.log('🚨 Issues Found:');
        issues.forEach(issue => {
          console.log(`   • ${issue.table}: ${issue.issue}`);
        });
        console.log('');

        // Fix the issues
        const { fixed, failed } = await this.fixTables(issues);

        if (fixed.length > 0) {
          console.log('✅ Successfully created tables:', fixed.join(', '));
          
          // Populate menu data if menu tables were created
          if (fixed.includes('menu_items') || fixed.includes('menu_role_permissions')) {
            await this.populateMenuData();
          }
        }

        if (failed.length > 0) {
          console.log('❌ Failed to create tables:');
          failed.forEach(fail => {
            console.log(`   • ${fail.table}: ${fail.error}`);
          });
        }

      } else {
        console.log('✅ All required tables exist');
        
        // Still check if menu data needs to be populated
        await this.populateMenuData();
      }

      console.log('');
      console.log('🎉 Database check and migration complete!');
      console.log('💡 You can now re-run your API tests to see if the menu permission errors are resolved.');

    } catch (error) {
      console.error('❌ Database migration failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new DatabaseTableChecker();
  checker.run().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = DatabaseTableChecker;
