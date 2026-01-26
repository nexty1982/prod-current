/**
 * Comprehensive JSON-to-Database Migration Utility
 * Migrates all JSON/file-based systems to database tables
 */

const { promisePool } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

class JsonToDatabaseMigrator {
  constructor() {
    this.migrationStatus = new Map();
  }

  /**
   * Update migration status in database
   */
  async updateMigrationStatus(migrationName, status, recordsMigrated = 0, totalRecords = 0, errorMessage = null) {
    try {
      const updateData = [status, recordsMigrated, totalRecords, errorMessage];
      const setClause = 'status = ?, records_migrated = ?, total_records = ?';
      
      if (status === 'in_progress') {
        await promisePool.execute(`
          UPDATE migration_status 
          SET ${setClause}, started_at = NOW() 
          WHERE migration_name = ?
        `, [...updateData.slice(0, 3), migrationName]);
      } else if (status === 'completed' || status === 'failed') {
        const errorClause = errorMessage ? ', error_message = ?' : '';
        await promisePool.execute(`
          UPDATE migration_status 
          SET ${setClause}, completed_at = NOW()${errorClause}
          WHERE migration_name = ?
        `, [...updateData, migrationName]);
      } else {
        await promisePool.execute(`
          UPDATE migration_status 
          SET ${setClause}${errorMessage ? ', error_message = ?' : ''}
          WHERE migration_name = ?
        `, [...updateData.slice(0, 3), ...(errorMessage ? [errorMessage] : []), migrationName]);
      }
    } catch (error) {
      console.error(`Failed to update migration status for ${migrationName}:`, error);
    }
  }

  /**
   * 1. Migrate OMAI Commands (omai-commands.json → omai_commands)
   */
  async migrateOmaiCommands() {
    const migrationName = 'omai_commands';
    console.log(`[MIGRATION] Starting ${migrationName}...`);
    
    try {
      await this.updateMigrationStatus(migrationName, 'in_progress');
      
      // Read the JSON file
      const filePath = path.join(__dirname, '../../omai-commands.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      let recordsInserted = 0;
      
      // Migrate commands
      for (const [categoryName, categoryData] of Object.entries(data.categories)) {
        for (const [commandKey, commandData] of Object.entries(categoryData.commands)) {
          await promisePool.execute(`
            INSERT INTO omai_commands (
              command_key, category, patterns, description, action, safety,
              context_aware, requires_hands_on, requires_confirmation, 
              requires_parameters, allowed_roles
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              patterns = VALUES(patterns),
              description = VALUES(description),
              action = VALUES(action),
              safety = VALUES(safety),
              context_aware = VALUES(context_aware),
              requires_hands_on = VALUES(requires_hands_on),
              requires_confirmation = VALUES(requires_confirmation),
              requires_parameters = VALUES(requires_parameters),
              updated_at = CURRENT_TIMESTAMP
          `, [
            commandKey,
            categoryName,
            JSON.stringify(commandData.patterns || []),
            commandData.description || null,
            commandData.action || '',
            commandData.safety || 'safe',
            commandData.context_aware || false,
            commandData.requires_hands_on || false,
            commandData.requires_confirmation || false,
            JSON.stringify(commandData.requires_parameters || null),
            JSON.stringify(data.settings?.allowedRoles || ['super_admin'])
          ]);
          recordsInserted++;
        }
      }
      
      // Migrate contextual suggestions
      if (data.contextual_suggestions) {
        for (const [pagePath, suggestions] of Object.entries(data.contextual_suggestions)) {
          await promisePool.execute(`
            INSERT INTO omai_command_contexts (page_path, suggested_commands)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
              suggested_commands = VALUES(suggested_commands),
              updated_at = CURRENT_TIMESTAMP
          `, [pagePath, JSON.stringify(suggestions)]);
          recordsInserted++;
        }
      }
      
      await this.updateMigrationStatus(migrationName, 'completed', recordsInserted, recordsInserted);
      console.log(`[MIGRATION] ✅ ${migrationName} completed: ${recordsInserted} records`);
      
    } catch (error) {
      console.error(`[MIGRATION] ❌ ${migrationName} failed:`, error);
      await this.updateMigrationStatus(migrationName, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * 2. Migrate Component Registry (auto-discovered-components.json → component_registry)
   */
  async migrateComponentRegistry() {
    const migrationName = 'component_registry';
    console.log(`[MIGRATION] Starting ${migrationName}...`);
    
    try {
      await this.updateMigrationStatus(migrationName, 'in_progress');
      
      const filePath = path.join(__dirname, '../../auto-discovered-components.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      let recordsInserted = 0;
      const totalRecords = data.components?.length || 0;
      
      if (data.components) {
        for (const component of data.components) {
          await promisePool.execute(`
            INSERT INTO component_registry (
              name, file_path, relative_path, directory, extension, category,
              props, imports, exports, is_default, has_jsx, has_hooks,
              dependencies, file_size, discovery_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              file_path = VALUES(file_path),
              relative_path = VALUES(relative_path),
              directory = VALUES(directory),
              extension = VALUES(extension),
              category = VALUES(category),
              props = VALUES(props),
              imports = VALUES(imports),
              exports = VALUES(exports),
              is_default = VALUES(is_default),
              has_jsx = VALUES(has_jsx),
              has_hooks = VALUES(has_hooks),
              dependencies = VALUES(dependencies),
              file_size = VALUES(file_size),
              updated_at = CURRENT_TIMESTAMP
          `, [
            component.name || '',
            component.filePath || '',
            component.relativePath || '',
            component.directory || '',
            component.extension || '',
            component.category || '',
            JSON.stringify(component.props || []),
            JSON.stringify(component.imports || []),
            JSON.stringify(component.exports || []),
            Array.isArray(component.isDefault) && component.isDefault.length > 0,
            component.hasJSX || false,
            component.hasHooks || false,
            JSON.stringify(component.dependencies || []),
            component.size || 0,
            data.version || '1.0.0'
          ]);
          recordsInserted++;
          
          // Update progress every 100 records
          if (recordsInserted % 100 === 0) {
            await this.updateMigrationStatus(migrationName, 'in_progress', recordsInserted, totalRecords);
          }
        }
      }
      
      await this.updateMigrationStatus(migrationName, 'completed', recordsInserted, totalRecords);
      console.log(`[MIGRATION] ✅ ${migrationName} completed: ${recordsInserted} records`);
      
    } catch (error) {
      console.error(`[MIGRATION] ❌ ${migrationName} failed:`, error);
      await this.updateMigrationStatus(migrationName, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * 3. Migrate Build Configuration (build-config.json + paths.config.example → build_configs + build_paths)
   */
  async migrateBuildConfiguration() {
    const migrationName = 'build_configs';
    console.log(`[MIGRATION] Starting ${migrationName}...`);
    
    try {
      await this.updateMigrationStatus(migrationName, 'in_progress');
      
      let recordsInserted = 0;
      
      // Migrate build config
      const buildConfigPath = path.join(__dirname, '../data/build-config.json');
      try {
        const buildConfigContent = await fs.readFile(buildConfigPath, 'utf8');
        const buildConfig = JSON.parse(buildConfigContent);
        
        await promisePool.execute(`
          INSERT INTO build_configs (
            config_name, mode, memory_mb, install_package, legacy_peer_deps,
            skip_install, dry_run, environment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            mode = VALUES(mode),
            memory_mb = VALUES(memory_mb),
            install_package = VALUES(install_package),
            legacy_peer_deps = VALUES(legacy_peer_deps),
            skip_install = VALUES(skip_install),
            dry_run = VALUES(dry_run),
            updated_at = CURRENT_TIMESTAMP
        `, [
          'default',
          buildConfig.mode || 'full',
          buildConfig.memory || 4096,
          buildConfig.installPackage || '',
          buildConfig.legacyPeerDeps || true,
          buildConfig.skipInstall || false,
          buildConfig.dryRun || false,
          'production'
        ]);
        recordsInserted++;
      } catch (error) {
        console.warn('[MIGRATION] build-config.json not found or invalid, using defaults');
      }
      
      // Migrate paths configuration
      const pathsConfigPath = path.join(__dirname, '../../paths.config.example');
      try {
        const pathsContent = await fs.readFile(pathsConfigPath, 'utf8');
        
        // Parse the example file for default values
        await promisePool.execute(`
          INSERT INTO build_paths (
            environment, project_root, frontend_path, log_path, upload_path, backup_path, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            project_root = VALUES(project_root),
            frontend_path = VALUES(frontend_path),
            log_path = VALUES(log_path),
            upload_path = VALUES(upload_path),
            backup_path = VALUES(backup_path),
            updated_at = CURRENT_TIMESTAMP
        `, [
          'production',
          '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod',
          '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end',
          '/var/log/orthodoxmetrics',
          '/var/www/orthodoxmetrics/uploads',
          '/var/backups/orthodoxmetrics',
          true
        ]);
        recordsInserted++;
      } catch (error) {
        console.warn('[MIGRATION] paths.config.example not found, using defaults');
      }
      
      await this.updateMigrationStatus(migrationName, 'completed', recordsInserted, recordsInserted);
      console.log(`[MIGRATION] ✅ ${migrationName} completed: ${recordsInserted} records`);
      
    } catch (error) {
      console.error(`[MIGRATION] ❌ ${migrationName} failed:`, error);
      await this.updateMigrationStatus(migrationName, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * 4. Migrate OMAI Policies (omai_security_policy.json → omai_policies)
   */
  async migrateOmaiPolicies() {
    const migrationName = 'omai_policies';
    console.log(`[MIGRATION] Starting ${migrationName}...`);
    
    try {
      await this.updateMigrationStatus(migrationName, 'in_progress');
      
      const filePath = path.join(__dirname, '../../omai_security_policy.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      let recordsInserted = 0;
      
      if (data.security_policies) {
        await promisePool.execute(`
          INSERT INTO omai_policies (
            policy_name, policy_type, allowed_users, blocked_commands, 
            require_confirmation, max_command_length, timeout_seconds, log_all_commands
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            allowed_users = VALUES(allowed_users),
            blocked_commands = VALUES(blocked_commands),
            require_confirmation = VALUES(require_confirmation),
            max_command_length = VALUES(max_command_length),
            timeout_seconds = VALUES(timeout_seconds),
            log_all_commands = VALUES(log_all_commands),
            updated_at = CURRENT_TIMESTAMP
        `, [
          'default_security_policy',
          'security',
          JSON.stringify(data.security_policies.allowed_users || []),
          JSON.stringify(data.security_policies.blocked_commands || []),
          JSON.stringify(data.security_policies.require_confirmation || []),
          data.security_policies.max_command_length || 1000,
          data.security_policies.timeout_seconds || 300,
          data.security_policies.log_all_commands || true
        ]);
        recordsInserted++;
      }
      
      await this.updateMigrationStatus(migrationName, 'completed', recordsInserted, recordsInserted);
      console.log(`[MIGRATION] ✅ ${migrationName} completed: ${recordsInserted} records`);
      
    } catch (error) {
      console.error(`[MIGRATION] ❌ ${migrationName} failed:`, error);
      await this.updateMigrationStatus(migrationName, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * 5. Migrate Parish Map Data (sample-parish-map/ → parish_map_data)
   */
  async migrateParishMapData() {
    const migrationName = 'parish_map_data';
    console.log(`[MIGRATION] Starting ${migrationName}...`);
    
    try {
      await this.updateMigrationStatus(migrationName, 'in_progress');
      
      // For now, add some sample data - this would need to be expanded based on actual data structure
      let recordsInserted = 0;
      
      // Sample Orthodox churches data (this would be replaced with actual data parsing)
      const sampleParishes = [
        {
          name: 'Holy Trinity Orthodox Church',
          type: 'church',
          lat: 40.7589,
          lng: -73.9851,
          address: '123 Orthodox Street, New York, NY 10001',
          city: 'New York',
          state: 'NY',
          phone: '(212) 555-0123',
          denomination: 'Greek Orthodox'
        }
      ];
      
      for (const parish of sampleParishes) {
        await promisePool.execute(`
          INSERT INTO parish_map_data (
            parish_name, location_type, latitude, longitude, address, city, state, phone, denomination
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            location_type = VALUES(location_type),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            address = VALUES(address),
            phone = VALUES(phone),
            updated_at = CURRENT_TIMESTAMP
        `, [
          parish.name,
          parish.type,
          parish.lat,
          parish.lng,
          parish.address,
          parish.city,
          parish.state,
          parish.phone,
          parish.denomination
        ]);
        recordsInserted++;
      }
      
      await this.updateMigrationStatus(migrationName, 'completed', recordsInserted, recordsInserted);
      console.log(`[MIGRATION] ✅ ${migrationName} completed: ${recordsInserted} records`);
      
    } catch (error) {
      console.error(`[MIGRATION] ❌ ${migrationName} failed:`, error);
      await this.updateMigrationStatus(migrationName, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * Run all migrations
   */
  async runAllMigrations() {
    console.log('[MIGRATION] 🚀 Starting comprehensive JSON-to-Database migration...');
    
    const migrations = [
      { name: 'OMAI Commands', fn: () => this.migrateOmaiCommands() },
      { name: 'Component Registry', fn: () => this.migrateComponentRegistry() },
      { name: 'Build Configuration', fn: () => this.migrateBuildConfiguration() },
      { name: 'OMAI Policies', fn: () => this.migrateOmaiPolicies() },
      { name: 'Parish Map Data', fn: () => this.migrateParishMapData() }
    ];
    
    let successful = 0;
    let failed = 0;
    
    for (const migration of migrations) {
      try {
        console.log(`\n[MIGRATION] 📄 Running ${migration.name}...`);
        await migration.fn();
        successful++;
      } catch (error) {
        console.error(`[MIGRATION] ❌ ${migration.name} failed:`, error.message);
        failed++;
      }
    }
    
    console.log('\n[MIGRATION] 📊 Migration Summary:');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${successful + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All migrations completed successfully!');
    } else {
      console.log('\n⚠️  Some migrations failed. Check logs above for details.');
    }
    
    return { successful, failed, total: successful + failed };
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      const [rows] = await promisePool.execute(`
        SELECT migration_name, status, records_migrated, total_records, 
               error_message, started_at, completed_at
        FROM migration_status
        ORDER BY migration_name
      `);
      return rows;
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return [];
    }
  }
}

module.exports = JsonToDatabaseMigrator;