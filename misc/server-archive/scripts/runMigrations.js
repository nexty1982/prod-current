#!/usr/bin/env node

/**
 * CLI Script for Running JSON-to-Database Migrations
 * Usage: node server/scripts/runMigrations.js [options]
 */

const path = require('path');

// Ensure we can import from the server directory
process.chdir(path.join(__dirname, '../..'));

const JsonToDatabaseMigrator = require('../utils/jsonToDatabaseMigrator');

async function main() {
  const args = process.argv.slice(2);
  const migrator = new JsonToDatabaseMigrator();

  try {
    if (args.includes('--status') || args.includes('-s')) {
      // Show migration status
      console.log('📊 Migration Status:');
      console.log('='.repeat(80));
      const status = await migrator.getMigrationStatus();
      
      if (status.length === 0) {
        console.log('No migration records found.');
        return;
      }

      status.forEach(record => {
        const statusIcon = {
          'pending': '⏳',
          'in_progress': '🔄',
          'completed': '✅',
          'failed': '❌'
        }[record.status] || '❓';

        console.log(`${statusIcon} ${record.migration_name}`);
        console.log(`   Status: ${record.status}`);
        if (record.records_migrated > 0 || record.total_records > 0) {
          console.log(`   Progress: ${record.records_migrated}/${record.total_records} records`);
        }
        if (record.started_at) {
          console.log(`   Started: ${record.started_at}`);
        }
        if (record.completed_at) {
          console.log(`   Completed: ${record.completed_at}`);
        }
        if (record.error_message) {
          console.log(`   Error: ${record.error_message}`);
        }
        console.log('');
      });

    } else if (args.includes('--help') || args.includes('-h')) {
      // Show help
      console.log('🔄 JSON-to-Database Migration Tool');
      console.log('');
      console.log('Usage: node server/scripts/runMigrations.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  --status, -s     Show migration status');
      console.log('  --run-all, -a    Run all migrations');
      console.log('  --help, -h       Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node server/scripts/runMigrations.js --status');
      console.log('  node server/scripts/runMigrations.js --run-all');

    } else if (args.includes('--run-all') || args.includes('-a') || args.length === 0) {
      // Run all migrations
      console.log('🚀 Starting JSON-to-Database Migration Process...');
      console.log('='.repeat(80));
      
      const result = await migrator.runAllMigrations();
      
      console.log('\n' + '='.repeat(80));
      console.log('🏁 Migration Process Complete!');
      console.log(`✅ Successful: ${result.successful}`);
      console.log(`❌ Failed: ${result.failed}`);
      console.log(`📈 Total: ${result.total}`);
      
      if (result.failed > 0) {
        console.log('\n⚠️  To see detailed error information, run: --status');
        process.exit(1);
      } else {
        console.log('\n🎉 All migrations completed successfully!');
        process.exit(0);
      }

    } else {
      console.error('❌ Unknown option. Use --help for usage information.');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Migration interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Migration terminated');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };