#!/usr/bin/env node
// Database schema fix script
const { promisePool } = require('../../config/db');
const fs = require('fs');
const path = require('path');

async function fixUserSchema() {
  try {
    console.log('🔧 Checking and fixing users table schema...');

    // First, check if users table exists
    const [tables] = await promisePool.query("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist. Creating it...');
      // Read and execute the schema file
      const schemaSQL = fs.readFileSync(path.join(__dirname, 'users_schema_fix.sql'), 'utf8');
      const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await promisePool.query(statement);
        }
      }
      console.log('✅ Users table created successfully');
    } else {
      console.log('✅ Users table exists. Checking columns...');
      
      // Check current table structure
      const [columns] = await promisePool.query("DESCRIBE users");
      const columnNames = columns.map(col => col.Field);
      
      console.log('Current columns:', columnNames);
      
      // Add missing role column
      if (!columnNames.includes('role')) {
        console.log('🔧 Adding role column...');
        await promisePool.query(`
          ALTER TABLE users 
          ADD COLUMN role ENUM('admin', 'supervisor', 'priest', 'volunteer', 'viewer') DEFAULT 'admin' AFTER email
        `);
        console.log('✅ Role column added');
      }
      
      // Add missing landing_page column
      if (!columnNames.includes('landing_page')) {
        console.log('🔧 Adding landing_page column...');
        await promisePool.query(`
          ALTER TABLE users 
          ADD COLUMN landing_page VARCHAR(255) DEFAULT '/pages/welcome' AFTER role
        `);
        console.log('✅ Landing page column added');
      }
      
      // Update existing users to have admin role if they don't have one
      await promisePool.query("UPDATE orthodoxmetrics_db.users SET role = 'admin' WHERE role IS NULL OR role = ''");
      console.log('✅ Updated existing users with admin role');
    }

    // Ensure admin user exists
    const [adminUsers] = await promisePool.query("SELECT id FROM orthodoxmetrics_db.users WHERE email = 'admin' OR username = 'admin'");
    
    if (adminUsers.length === 0) {
      console.log('🔧 Creating default admin user...');
      const bcrypt = require('bcrypt');
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      await promisePool.query(`
        INSERT INTO orthodoxmetrics_db.users (email, username, password_hash, role, landing_page) 
        VALUES ('admin', 'admin', ?, 'admin', '/pages/admin/dashboard')
      `, [adminPassword]);
      
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('🎉 Database schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixUserSchema()
    .then(() => {
      console.log('✅ Schema fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUserSchema };
