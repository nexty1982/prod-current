#!/usr/bin/env node

/**
 * User Management Script for OrthodoxMetrics
 * 
 * Usage:
 *   node scripts/user-management.js list
 *   node scripts/user-management.js add <email> <password> <role> [first_name] [last_name]
 *   node scripts/user-management.js set-password <email> <new_password>
 *   node scripts/user-management.js set-role <email> <new_role>
 *   node scripts/user-management.js view <email>
 *   node scripts/user-management.js activate <email>
 *   node scripts/user-management.js deactivate <email>
 * 
 * Roles: super_admin, admin, church_admin, priest, deacon, editor, viewer
 */

// Load environment variables
require('dotenv').config();

const bcrypt = require('bcrypt');
const { getAuthPool, getAppPool } = require('../config/db');

// Valid roles in the system
const VALID_ROLES = [
  'super_admin',
  'admin', 
  'church_admin',
  'priest',
  'deacon',
  'editor',
  'viewer'
];

class UserManager {
  constructor(useAppPool = false) {
    // Try auth pool first, fall back to app pool if specified
    this.pool = useAppPool ? getAppPool() : getAuthPool();
    this.poolType = useAppPool ? 'app' : 'auth';
  }

  async validateRole(role) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role. Valid roles are: ${VALID_ROLES.join(', ')}`);
    }
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async listUsers() {
    try {
      const [users] = await this.pool.query(`
        SELECT id, email, first_name, last_name, role, is_active, 
               created_at, last_login, church_id
        FROM users 
        ORDER BY created_at DESC
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
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A';
        
        console.log(`
ID: ${user.id}
Email: ${user.email}
Name: ${fullName}
Role: ${user.role}
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

  async addUser(email, password, role, firstName = '', lastName = '') {
    try {
      await this.validateRole(role);

      // Check if user already exists
      const [existing] = await this.pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        throw new Error(`User with email ${email} already exists`);
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert user
      const [result] = await this.pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [email, passwordHash, firstName, lastName, role]);

      console.log(`✅ User created successfully!`);
      console.log(`   ID: ${result.insertId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${[firstName, lastName].filter(Boolean).join(' ') || 'N/A'}`);
      console.log(`   Role: ${role}`);
      console.log(`   Status: Active`);

    } catch (error) {
      console.error('❌ Error creating user:', error.message);
    }
  }

  async setPassword(email, newPassword) {
    try {
      // Check if user exists
      const [users] = await this.pool.query(
        'SELECT id, email FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error(`User with email ${email} not found`);
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password
      await this.pool.query(
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
      const [users] = await this.pool.query(
        'SELECT id, email, role FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error(`User with email ${email} not found`);
      }

      const oldRole = users[0].role;

      // Update role
      await this.pool.query(
        'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
        [newRole, email]
      );

      console.log(`✅ Role updated successfully for ${email}`);
      console.log(`   Old role: ${oldRole}`);
      console.log(`   New role: ${newRole}`);

    } catch (error) {
      console.error('❌ Error updating role:', error.message);
    }
  }

  async viewUser(email) {
    try {
      const [users] = await this.pool.query(`
        SELECT id, email, first_name, last_name, role, is_active, 
               created_at, updated_at, last_login, church_id
        FROM users 
        WHERE email = ?
      `, [email]);

      if (users.length === 0) {
        console.log(`❌ User with email ${email} not found`);
        return;
      }

      const user = users[0];
      const status = user.is_active ? '✅ Active' : '❌ Inactive';
      const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A';
      const updated = user.updated_at ? new Date(user.updated_at).toLocaleString() : 'Never';

      console.log('\n👤 User Details');
      console.log('=' .repeat(50));
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${fullName}`);
      console.log(`Role: ${user.role}`);
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
      const [result] = await this.pool.query(
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
      const [result] = await this.pool.query(
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

  async checkDatabase() {
    try {
      const [result] = await this.pool.query('SELECT DATABASE() as db');
      console.log(`🗄️  Connected to database: ${result[0].db} (using ${this.poolType} pool)`);
      
      // Check if users table exists
      const [tables] = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'users'
      `);
      
      if (tables[0].count === 0) {
        throw new Error('Users table not found in this database');
      }
      
    } catch (error) {
      console.error(`❌ Database connection error (${this.poolType} pool):`, error.message);
      
      if (this.poolType === 'auth') {
        console.log('🔄 Retrying with app pool...');
        return false; // Indicate retry needed
      }
      
      process.exit(1);
    }
    
    return true; // Success
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    return;
  }

  let userManager = new UserManager();
  
  // Check database connection, retry with app pool if auth pool fails
  let dbConnected = await userManager.checkDatabase();
  if (!dbConnected) {
    userManager = new UserManager(true); // Use app pool
    await userManager.checkDatabase();
  }

  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case 'list':
        await userManager.listUsers();
        break;

      case 'add':
        if (args.length < 4) {
          console.log('❌ Usage: add <email> <password> <role> [first_name] [last_name]');
          showRoles();
          return;
        }
        await userManager.addUser(args[1], args[2], args[3], args[4] || '', args[5] || '');
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
  }

  process.exit(0);
}

function showUsage() {
  console.log(`
🔧 User Management Script for OrthodoxMetrics

Usage:
  node scripts/user-management.js <command> [options]

Commands:
  list                                    - List all users
  add <email> <password> <role> [name]    - Add new user
  set-password <email> <new_password>     - Change user password
  set-role <email> <new_role>             - Change user role
  view <email>                            - View user details
  activate <email>                        - Activate user account
  deactivate <email>                      - Deactivate user account

Examples:
  node scripts/user-management.js list
  node scripts/user-management.js add admin@church.com mypassword admin "John" "Doe"
  node scripts/user-management.js set-role user@church.com priest
  node scripts/user-management.js set-password user@church.com newpassword123
  node scripts/user-management.js view admin@church.com
`);
  showRoles();
}

function showRoles() {
  console.log(`
📋 Available Roles:
  - super_admin   (Full system access)
  - admin         (Site administration)
  - church_admin  (Church-level administration)
  - priest        (Priest privileges)
  - deacon        (Deacon privileges)
  - editor        (Content editing)
  - viewer        (Read-only access)
`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = UserManager;
