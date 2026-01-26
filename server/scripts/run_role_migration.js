#!/usr/bin/env node

/**
 * Orthodox Metrics - Role Migration Execution Script
 * 
 * This script safely executes the role simplification migration on the database.
 * It includes comprehensive backup, validation, and rollback capabilities.
 * 
 * Usage:
 *   node server/scripts/run_role_migration.js [--dry-run] [--force] [--rollback]
 * 
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --force      Skip confirmation prompts (use with caution)
 *   --rollback   Restore from migration backup (emergency use only)
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { validateRoleMigration } = require('./validate_role_migration');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');
const isRollback = args.includes('--rollback');

class RoleMigrationRunner {
  constructor() {
    this.connection = null;
    this.migrationStartTime = new Date();
    this.backupTableCreated = false;
  }

  async initialize() {
    console.log('🔄 Orthodox Metrics - Role Migration Script');
    console.log('==========================================\n');

    // Verify environment
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      throw new Error('Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD');
    }

    // Create database connection
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'orthodoxmetrics_db',
      multipleStatements: true
    });

    console.log('✅ Database connection established');
  }

  async checkPrerequisites() {
    console.log('\n🧪 Checking Migration Prerequisites...\n');

    // Check if users table exists
    const [tables] = await this.connection.execute(
      "SHOW TABLES LIKE 'users'"
    );
    
    if (tables.length === 0) {
      throw new Error('Users table not found - cannot proceed with migration');
    }

    // Check current role column structure
    const [columns] = await this.connection.execute(
      "SHOW COLUMNS FROM orthodoxmetrics_db.users LIKE 'role'"
    );
    
    if (columns.length === 0) {
      throw new Error('Role column not found in users table');
    }

    const roleColumn = columns[0];
    console.log(`📋 Current role column: ${roleColumn.Type}`);

    // Check if migration has already been run
    const [migrationCheck] = await this.connection.execute(
      "SHOW TABLES LIKE 'role_migration_backup'"
    );

    if (migrationCheck.length > 0 && !isRollback) {
      const [backupCount] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM role_migration_backup'
      );
      
      if (backupCount[0].count > 0) {
        console.log('⚠️  Migration backup table exists with data');
        console.log('   This suggests migration may have already been run');
        
        if (!isForced) {
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise(resolve => {
            readline.question('Continue anyway? (y/N): ', resolve);
          });
          
          readline.close();
          
          if (answer.toLowerCase() !== 'y') {
            throw new Error('Migration cancelled by user');
          }
        }
      }
    }

    // Get current role distribution
    const [currentRoles] = await this.connection.execute(`
      SELECT role, COUNT(*) as count 
      FROM orthodoxmetrics_db.users 
      WHERE role IS NOT NULL 
      GROUP BY role 
      ORDER BY count DESC
    `);

    console.log('📊 Current Role Distribution:');
    currentRoles.forEach(role => {
      console.log(`   ${role.role}: ${role.count} users`);
    });

    // Check for potentially problematic legacy roles
    const legacyRoles = currentRoles
      .map(r => r.role)
      .filter(role => !['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor', 'viewer', 'guest'].includes(role));

    if (legacyRoles.length > 0) {
      console.log('\n🔍 Legacy roles to be migrated:');
      legacyRoles.forEach(role => {
        const count = currentRoles.find(r => r.role === role)?.count || 0;
        console.log(`   ${role}: ${count} users`);
      });
    }

    console.log('\n✅ Prerequisites check completed');
  }

  async loadMigrationScript() {
    const migrationPath = path.join(__dirname, '../database/migrations/role_simplification_migration.sql');
    
    try {
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      return migrationSQL;
    } catch (error) {
      throw new Error(`Failed to load migration script: ${error.message}`);
    }
  }

  async executeMigration(migrationSQL) {
    console.log('\n🚀 Executing Role Migration...\n');

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('Migration script loaded successfully');
      console.log(`Script size: ${migrationSQL.length} characters`);
      return;
    }

    // Begin transaction
    await this.connection.beginTransaction();

    try {
      // Execute migration script
      console.log('📝 Executing migration SQL...');
      await this.connection.query(migrationSQL);
      
      // Commit transaction
      await this.connection.commit();
      console.log('✅ Migration completed successfully');

    } catch (error) {
      // Rollback on error
      await this.connection.rollback();
      console.error('❌ Migration failed, rolled back transaction');
      throw error;
    }
  }

  async executeRollback() {
    console.log('\n🔄 Executing Rollback...\n');

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - Would restore from backup');
      return;
    }

    // Check if backup exists
    const [backupCheck] = await this.connection.execute(
      'SELECT COUNT(*) as count FROM role_migration_backup'
    );

    if (backupCheck[0].count === 0) {
      throw new Error('No migration backup found - cannot rollback');
    }

    console.log(`📦 Found ${backupCheck[0].count} backed up role records`);

    // Begin transaction
    await this.connection.beginTransaction();

    try {
      // Add temporary column for original roles
      await this.connection.execute(`
        ALTER TABLE users ADD COLUMN original_role VARCHAR(50)
      `);

      // Restore original roles from backup
      await this.connection.execute(`
        UPDATE orthodoxmetrics_db.users u
        JOIN role_migration_backup rmb ON u.id = rmb.user_id
        SET u.original_role = rmb.original_role
      `);

      // Drop current role column
      await this.connection.execute(`
        ALTER TABLE users DROP COLUMN role
      `);

      // Rename original_role back to role
      await this.connection.execute(`
        ALTER TABLE users CHANGE original_role role VARCHAR(50)
      `);

      // Remove profile_attributes column if it exists
      try {
        await this.connection.execute(`
          ALTER TABLE users DROP COLUMN profile_attributes
        `);
      } catch (error) {
        console.log('⚠️  Profile attributes column not found (ok)');
      }

      // Commit transaction
      await this.connection.commit();
      console.log('✅ Rollback completed successfully');

    } catch (error) {
      // Rollback on error
      await this.connection.rollback();
      console.error('❌ Rollback failed');
      throw error;
    }
  }

  async validateResults() {
    console.log('\n🧪 Validating Migration Results...\n');

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - Skipping validation');
      return;
    }

    // Run validation script
    const validationPassed = await validateRoleMigration();
    
    if (validationPassed) {
      console.log('✅ Migration validation passed');
    } else {
      console.error('❌ Migration validation failed');
      console.log('Consider running rollback if issues are critical');
    }

    return validationPassed;
  }

  async generateReport() {
    console.log('\n📋 Migration Report');
    console.log('===================\n');

    const endTime = new Date();
    const duration = Math.round((endTime - this.migrationStartTime) / 1000);

    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📅 Started: ${this.migrationStartTime.toISOString()}`);
    console.log(`📅 Completed: ${endTime.toISOString()}`);

    if (!isDryRun && !isRollback) {
      // Show final role distribution
      const [finalRoles] = await this.connection.execute(`
        SELECT role, COUNT(*) as count 
        FROM orthodoxmetrics_db.users 
        GROUP BY role 
        ORDER BY 
          CASE role
            WHEN 'super_admin' THEN 8
            WHEN 'admin' THEN 7
            WHEN 'church_admin' THEN 6
            WHEN 'priest' THEN 5
            WHEN 'deacon' THEN 4
            WHEN 'editor' THEN 3
            WHEN 'viewer' THEN 2
            WHEN 'guest' THEN 1
            ELSE 0
          END DESC
      `);

      console.log('📊 Final Role Distribution:');
      finalRoles.forEach(role => {
        console.log(`   ${role.role}: ${role.count} users`);
      });

      // Show backup information
      const [backupInfo] = await this.connection.execute(
        'SELECT COUNT(*) as backup_count FROM role_migration_backup'
      );
      
      console.log(`💾 Backup records: ${backupInfo[0].backup_count}`);
    }

    console.log('\n🎉 Migration process completed!');
  }

  async cleanup() {
    if (this.connection) {
      await this.connection.end();
      console.log('📡 Database connection closed');
    }
  }

  async confirmAction() {
    if (isForced) return true;

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const actionType = isRollback ? 'ROLLBACK' : 'MIGRATION';
    const warning = isRollback ? 
      'This will restore original roles and may cause data loss!' :
      'This will permanently change the role system!';

    console.log(`\n⚠️  CONFIRMATION REQUIRED`);
    console.log(`Action: ${actionType}`);
    console.log(`Warning: ${warning}`);
    console.log(`Database: ${process.env.DB_NAME || 'orthodoxmetrics_db'}`);
    
    if (isDryRun) {
      console.log('Mode: DRY RUN (no actual changes)');
    }

    const answer = await new Promise(resolve => {
      readline.question('\nProceed? (yes/N): ', resolve);
    });

    readline.close();

    return answer.toLowerCase() === 'yes';
  }
}

// Main execution function
async function main() {
  const runner = new RoleMigrationRunner();

  try {
    // Load environment variables
    require('dotenv').config();

    // Initialize
    await runner.initialize();

    // Confirm action
    const confirmed = await runner.confirmAction();
    if (!confirmed) {
      console.log('❌ Operation cancelled by user');
      process.exit(0);
    }

    // Check prerequisites (skip for rollback)
    if (!isRollback) {
      await runner.checkPrerequisites();
    }

    if (isRollback) {
      // Execute rollback
      await runner.executeRollback();
    } else {
      // Execute migration
      const migrationSQL = await runner.loadMigrationScript();
      await runner.executeMigration(migrationSQL);
      
      // Validate results
      await runner.validateResults();
    }

    // Generate report
    await runner.generateReport();

    console.log('\n✅ Process completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Migration Error:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check database connection settings');
    console.log('2. Verify user has sufficient database privileges');
    console.log('3. Ensure backup exists before rollback');
    console.log('4. Check migration script syntax');
    
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Received interrupt signal');
  console.log('Cleaning up...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received terminate signal');
  console.log('Cleaning up...');
  process.exit(1);
});

// Run the migration
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { RoleMigrationRunner };