#!/usr/bin/env node

/**
 * Direct User Management Script for OrthodoxMetrics
 * This version connects directly to the database without using cached pools
 * 
 * Usage:
 *   node scripts/user-management-direct.js list
 *   node scripts/user-management-direct.js add <email> <password> <role> [first_name] [last_name]
 *   node scripts/user-management-direct.js set-password <email> <new_password>
 *   node scripts/user-management-direct.js set-role <email> <new_role>
 *   node scripts/user-management-direct.js view <email>
 *   node scripts/user-management-direct.js activate <email>
 *   node scripts/user-management-direct.js deactivate <email>
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// Valid roles in the system (mapped to database role IDs)
const VALID_ROLES = {
  'superadmin': 1,
  'church_admin': 2,
  'editor': 3,
  'viewer': 4,
  'auditor': 5
};

const ROLE_NAMES = {
  1: 'superadmin',
  2: 'church_admin', 
  3: 'editor',
  4: 'viewer',
  5: 'auditor'
};

class DirectUserManager {
  constructor() {
    this.connection = null;
  }

  async connect() {
    // Try multiple database configurations
    const configs = [
      {
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'orthodoxmetrics_auth_db',
        name: 'orthodoxmetrics_auth_db'
      },
      {
        host: 'localhost',
        user: 'orthodoxapps', 
        password: 'Summerof1982@!',
        database: 'orthodoxmetrics_db',
        name: 'orthodoxmetrics_db'
      },
      {
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'omai_db',
        name: 'omai_db'
      }
    ];

    for (const config of configs) {
      try {
        console.log(`🔄 Trying to connect to ${config.name}...`);
        this.connection = await mysql.createConnection(config);
        
        // Test the connection and check for users table
        const [tables] = await this.connection.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = 'users'
        `);
        
        if (tables[0].count > 0) {
          const [dbResult] = await this.connection.query('SELECT DATABASE() as db');
          console.log(`✅ Connected to database: ${dbResult[0].db}`);
          return true;
        } else {
          console.log(`❌ No users table found in ${config.name}`);
          await this.connection.end();
          this.connection = null;
        }
        
      } catch (error) {
        console.log(`❌ Failed to connect to ${config.name}: ${error.message}`);
        if (this.connection) {
          try {
            await this.connection.end();
          } catch (e) {}
          this.connection = null;
        }
      }
    }
    
    throw new Error('Could not connect to any database with users table');
  }

  async validateRole(role) {
    if (!VALID_ROLES[role]) {
      throw new Error(`Invalid role. Valid roles are: ${Object.keys(VALID_ROLES).join(', ')}`);
    }
  }

  getRoleId(roleName) {
    return VALID_ROLES[roleName];
  }

  getRoleName(roleId) {
    return ROLE_NAMES[roleId] || 'unknown';
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async listUsers() {
    try {
      const [users] = await this.connection.query(`
        SELECT u.id, u.email, u.full_name, u.role_id, u.is_active, 
               u.created_at, u.last_login, u.church_id, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
      `);

      console.log('\n📋 User List');
      console.log('=' .repeat(80));
      
      if (users.length === 0) {
        console.log('No users found.');
        return;
      }

      users.forEach(user => {
        const status = user.is_active ? '✅ Active' : '❌ Inactive';
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
        const fullName = user.full_name || 'N/A';
        const roleName = user.role_name || this.getRoleName(user.role_id);
        
        console.log(`
ID: ${user.id}
Email: ${user.email}
Name: ${fullName}
Role: ${roleName} (ID: ${user.role_id})
Status: ${status}
Church ID: ${user.church_id || 'N/A'}
Created: ${new Date(user.created_at).toLocaleString()}
Last Login: ${lastLogin}
${'-'.repeat(40)}`);
      });

      console.log(`\nTotal users: ${users.length}`);
    } catch (error) {
      console.error('❌ Error listing users:', error.message);
    }
  }

  async addUser(email, password, role, fullName = '') {
    try {
      await this.validateRole(role);

      // Check if user already exists
      const [existing] = await this.connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        throw new Error(`User with email ${email} already exists`);
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);
      const roleId = this.getRoleId(role);

      // Insert user
      const [result] = await this.connection.query(`
        INSERT INTO users (email, password_hash, full_name, role_id, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [email, passwordHash, fullName, roleId]);

      console.log(`✅ User created successfully!`);
      console.log(`   ID: ${result.insertId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${fullName || 'N/A'}`);
      console.log(`   Role: ${role} (ID: ${roleId})`);
      console.log(`   Status: Active`);

    } catch (error) {
      console.error('❌ Error creating user:', error.message);
    }
  }

  async setPassword(email, newPassword) {
    try {
      // Check if user exists
      const [users] = await this.connection.query(
        'SELECT id, email FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error(`User with email ${email} not found`);
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password
      await this.connection.query(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
        [passwordHash, email]
      );

      console.log(`✅ Password updated successfully for ${email}`);

    } catch (error) {
      console.error('❌ Error updating password:', error.message);
    }
  }

  async setRole(email, newRole) {
    try {
      await this.validateRole(newRole);

      // Check if user exists
      const [users] = await this.connection.query(
        'SELECT id, email, role_id FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error(`User with email ${email} not found`);
      }

      const oldRoleId = users[0].role_id;
      const oldRoleName = this.getRoleName(oldRoleId);
      const newRoleId = this.getRoleId(newRole);

      // Update role
      await this.connection.query(
        'UPDATE users SET role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
        [newRoleId, email]
      );

      console.log(`✅ Role updated successfully for ${email}`);
      console.log(`   Old role: ${oldRoleName} (ID: ${oldRoleId})`);
      console.log(`   New role: ${newRole} (ID: ${newRoleId})`);

    } catch (error) {
      console.error('❌ Error updating role:', error.message);
    }
  }

  async viewUser(email) {
    try {
      const [users] = await this.connection.query(`
        SELECT u.id, u.email, u.full_name, u.role_id, u.is_active, 
               u.created_at, u.updated_at, u.last_login, u.church_id, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = ?
      `, [email]);

      if (users.length === 0) {
        console.log(`❌ User with email ${email} not found`);
        return;
      }

      const user = users[0];
      const status = user.is_active ? '✅ Active' : '❌ Inactive';
      const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
      const fullName = user.full_name || 'N/A';
      const updated = user.updated_at ? new Date(user.updated_at).toLocaleString() : 'Never';
      const roleName = user.role_name || this.getRoleName(user.role_id);

      console.log('\n👤 User Details');
      console.log('=' .repeat(50));
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${fullName}`);
      console.log(`Role: ${roleName} (ID: ${user.role_id})`);
      console.log(`Status: ${status}`);
      console.log(`Church ID: ${user.church_id || 'N/A'}`);
      console.log(`Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`Updated: ${updated}`);
      console.log(`Last Login: ${lastLogin}`);

    } catch (error) {
      console.error('❌ Error viewing user:', error.message);
    }
  }

  async activateUser(email) {
    try {
      const [result] = await this.connection.query(
        'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
        [email]
      );

      if (result.affectedRows === 0) {
        console.log(`❌ User with email ${email} not found`);
        return;
      }

      console.log(`✅ User ${email} activated successfully`);

    } catch (error) {
      console.error('❌ Error activating user:', error.message);
    }
  }

  async deactivateUser(email) {
    try {
      const [result] = await this.connection.query(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
        [email]
      );

      if (result.affectedRows === 0) {
        console.log(`❌ User with email ${email} not found`);
        return;
      }

      console.log(`✅ User ${email} deactivated successfully`);

    } catch (error) {
      console.error('❌ Error deactivating user:', error.message);
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    return;
  }

  const userManager = new DirectUserManager();
  
  try {
    // Connect to database
    await userManager.connect();

    const command = args[0].toLowerCase();

    switch (command) {
      case 'list':
        await userManager.listUsers();
        break;

      case 'add':
        if (args.length < 4) {
          console.log('❌ Usage: add <email> <password> <role> [full_name]');
          showRoles();
          return;
        }
        await userManager.addUser(args[1], args[2], args[3], args[4] || '');
        break;

      case 'set-password':
        if (args.length < 3) {
          console.log('❌ Usage: set-password <email> <new_password>');
          return;
        }
        await userManager.setPassword(args[1], args[2]);
        break;

      case 'set-role':
        if (args.length < 3) {
          console.log('❌ Usage: set-role <email> <new_role>');
          showRoles();
          return;
        }
        await userManager.setRole(args[1], args[2]);
        break;

      case 'view':
        if (args.length < 2) {
          console.log('❌ Usage: view <email>');
          return;
        }
        await userManager.viewUser(args[1]);
        break;

      case 'activate':
        if (args.length < 2) {
          console.log('❌ Usage: activate <email>');
          return;
        }
        await userManager.activateUser(args[1]);
        break;

      case 'deactivate':
        if (args.length < 2) {
          console.log('❌ Usage: deactivate <email>');
          return;
        }
        await userManager.deactivateUser(args[1]);
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        showUsage();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userManager.close();
  }
}

function showUsage() {
  console.log(`
🔧 Direct User Management Script for OrthodoxMetrics

Usage:
  node scripts/user-management-direct.js <command> [options]

Commands:
  list                                    - List all users
  add <email> <password> <role> [name]    - Add new user
  set-password <email> <new_password>     - Change user password
  set-role <email> <new_role>             - Change user role
  view <email>                            - View user details
  activate <email>                        - Activate user account
  deactivate <email>                      - Deactivate user account

Examples:
  node scripts/user-management-direct.js list
  node scripts/user-management-direct.js add admin@church.com mypassword superadmin "John Doe"
  node scripts/user-management-direct.js set-role user@church.com church_admin
  node scripts/user-management-direct.js set-password user@church.com newpassword123
  node scripts/user-management-direct.js view admin@church.com
`);
  showRoles();
}

function showRoles() {
  console.log(`
📋 Available Roles:
  - superadmin    (Full access to all churches and system-wide settings)
  - church_admin  (Admin for a specific church, can manage users and records)
  - editor        (Can add and edit records for their church)
  - viewer        (Read-only access to records)
  - auditor       (Can view logs and historical records, no editing allowed)
`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DirectUserManager;
