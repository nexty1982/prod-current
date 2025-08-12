#!/usr/bin/env node

/**
 * Orthodox Metrics - Database Management Suite
 * Consolidates: setup-ocr-tables.js, fix-database-tables.js, database-ma        // NOTE: Users are stored in orthodoxmetrics_db, not in individual church databases
        // Church databases are for records only. User management is handled centrally.
        // Use the church_users junction table in orthodoxmetrics_db to assign users to churches.enance.js
 * Provides: Complete database management and maintenance
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorLog(message, color = 'white') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

class DatabaseManager {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      backup: true,
      force: false,
      ...options
    };

    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'orthodoxmetrics',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    };
  }

  async getConnection() {
    return await mysql.createConnection(this.dbConfig);
  }

  async executeQuery(connection, query, description) {
    colorLog(`   Executing: ${description}`, 'blue');
    
    if (this.options.dryRun) {
      colorLog(`   DRY RUN: ${query.substring(0, 100)}...`, 'yellow');
      return { success: true, dryRun: true };
    }

    try {
      const [result] = await connection.execute(query);
      colorLog(`   ✅ Success: ${description}`, 'green');
      return { success: true, result };
    } catch (error) {
      colorLog(`   ❌ Failed: ${description} - ${error.message}`, 'red');
      return { success: false, error };
    }
  }

  async createBackup() {
    if (!this.options.backup) {
      colorLog('⏭️  Skipping backup creation', 'yellow');
      return;
    }

    colorLog('\n💾 Creating Database Backup...', 'cyan');
    
    const connection = await this.getConnection();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // Get all tables
      const [tables] = await connection.execute('SHOW TABLES');
      const tableNames = tables.map(row => Object.values(row)[0]);
      
      let backupSql = `-- Orthodox Metrics Database Backup\n-- Created: ${new Date().toISOString()}\n\n`;
      
      for (const tableName of tableNames) {
        // Get table structure
        const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
        backupSql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        backupSql += `${createTable[0]['Create Table']};\n\n`;
        
        // Get table data
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
        if (rows.length > 0) {
          backupSql += `INSERT INTO \`${tableName}\` VALUES\n`;
          const values = rows.map(row => {
            const escapedValues = Object.values(row).map(value => {
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
              return value;
            });
            return `(${escapedValues.join(', ')})`;
          });
          backupSql += values.join(',\n') + ';\n\n';
        }
      }
      
      const backupFile = path.join(backupDir, `orthodox_backup_${timestamp}.sql`);
      await fs.writeFile(backupFile, backupSql);
      
      colorLog(`✅ Backup created: ${backupFile}`, 'green');
      
    } catch (error) {
      colorLog(`❌ Backup failed: ${error.message}`, 'red');
      throw error;
    } finally {
      await connection.end();
    }
  }

  async createSchema() {
    colorLog('\n🏗️  Creating Database Schema...', 'cyan');
    
    const connection = await this.getConnection();
    
    try {
      // Core tables
      const coreSchemas = [
        {
          name: 'church_info',
          sql: `
            CREATE TABLE IF NOT EXISTS church_info (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              address TEXT,
              phone VARCHAR(50),
              email VARCHAR(255),
              website VARCHAR(255),
              priest_name VARCHAR(255),
              parish_type ENUM('parish', 'cathedral', 'monastery') DEFAULT 'parish',
              jurisdiction VARCHAR(255),
              is_test_church BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        },
        // NOTE: Users are stored in orthodoxmetrics_db, not in individual church databases
        // Church databases are for records only. User management is handled centrally.
        // Use the church_users junction table in orthodoxmetrics_db to assign users to churches.
        {
          name: 'baptism_records',
          sql: `
            CREATE TABLE IF NOT EXISTS baptism_records (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              record_number VARCHAR(50),
              baptism_date DATE,
              child_name VARCHAR(255),
              child_birth_date DATE,
              child_birth_place VARCHAR(255),
              father_name VARCHAR(255),
              mother_name VARCHAR(255),
              godparent_1 VARCHAR(255),
              godparent_2 VARCHAR(255),
              priest_name VARCHAR(255),
              notes TEXT,
              original_language ENUM('greek', 'russian', 'romanian', 'english', 'other'),
              translation_status ENUM('original', 'translated', 'reviewed') DEFAULT 'original',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (church_id) REFERENCES church_info(id) ON DELETE CASCADE,
              INDEX idx_church_record (church_id, record_number),
              INDEX idx_baptism_date (baptism_date),
              INDEX idx_child_name (child_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        },
        {
          name: 'marriage_records',
          sql: `
            CREATE TABLE IF NOT EXISTS marriage_records (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              record_number VARCHAR(50),
              marriage_date DATE,
              groom_name VARCHAR(255),
              groom_birth_date DATE,
              groom_birth_place VARCHAR(255),
              bride_name VARCHAR(255),
              bride_birth_date DATE,
              bride_birth_place VARCHAR(255),
              witness_1 VARCHAR(255),
              witness_2 VARCHAR(255),
              priest_name VARCHAR(255),
              notes TEXT,
              original_language ENUM('greek', 'russian', 'romanian', 'english', 'other'),
              translation_status ENUM('original', 'translated', 'reviewed') DEFAULT 'original',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (church_id) REFERENCES church_info(id) ON DELETE CASCADE,
              INDEX idx_church_record (church_id, record_number),
              INDEX idx_marriage_date (marriage_date),
              INDEX idx_groom_name (groom_name),
              INDEX idx_bride_name (bride_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        },
        {
          name: 'funeral_records',
          sql: `
            CREATE TABLE IF NOT EXISTS funeral_records (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              record_number VARCHAR(50),
              death_date DATE,
              burial_date DATE,
              deceased_name VARCHAR(255),
              deceased_birth_date DATE,
              deceased_birth_place VARCHAR(255),
              age_at_death INT,
              cause_of_death VARCHAR(255),
              burial_place VARCHAR(255),
              priest_name VARCHAR(255),
              next_of_kin VARCHAR(255),
              notes TEXT,
              original_language ENUM('greek', 'russian', 'romanian', 'english', 'other'),
              translation_status ENUM('original', 'translated', 'reviewed') DEFAULT 'original',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (church_id) REFERENCES church_info(id) ON DELETE CASCADE,
              INDEX idx_church_record (church_id, record_number),
              INDEX idx_death_date (death_date),
              INDEX idx_deceased_name (deceased_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        }
      ];

      for (const schema of coreSchemas) {
        await this.executeQuery(connection, schema.sql, `Create table: ${schema.name}`);
      }

      colorLog('✅ Core schema creation completed', 'green');

    } catch (error) {
      colorLog(`❌ Schema creation failed: ${error.message}`, 'red');
      throw error;
    } finally {
      await connection.end();
    }
  }

  async setupOcrTables() {
    colorLog('\n🔍 Setting up OCR Tables...', 'cyan');
    
    const connection = await this.getConnection();
    
    try {
      const ocrSchemas = [
        {
          name: 'ocr_jobs',
          sql: `
            CREATE TABLE IF NOT EXISTS ocr_jobs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              job_id VARCHAR(100) UNIQUE NOT NULL,
              file_name VARCHAR(255),
              file_path VARCHAR(500),
              record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
              status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
              ocr_text TEXT,
              translated_text TEXT,
              confidence_score DECIMAL(5,2),
              language_detected VARCHAR(50),
              processing_time_ms INT,
              error_message TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (church_id) REFERENCES church_info(id) ON DELETE CASCADE,
              INDEX idx_job_id (job_id),
              INDEX idx_status (status),
              INDEX idx_church_type (church_id, record_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        },
        {
          name: 'ocr_field_mappings',
          sql: `
            CREATE TABLE IF NOT EXISTS ocr_field_mappings (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
              ocr_text_pattern VARCHAR(500),
              field_name VARCHAR(100),
              field_type ENUM('text', 'date', 'number') DEFAULT 'text',
              confidence_threshold DECIMAL(5,2) DEFAULT 0.8,
              validation_regex VARCHAR(500),
              is_required BOOLEAN DEFAULT FALSE,
              is_active BOOLEAN DEFAULT TRUE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (church_id) REFERENCES church_info(id) ON DELETE CASCADE,
              INDEX idx_church_type (church_id, record_type),
              INDEX idx_field_name (field_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        },
        {
          name: 'ocr_training_data',
          sql: `
            CREATE TABLE IF NOT EXISTS ocr_training_data (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT,
              record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
              language ENUM('greek', 'russian', 'romanian', 'english', 'other') NOT NULL,
              original_image_path VARCHAR(500),
              verified_text TEXT,
              field_extractions JSON,
              quality_score DECIMAL(5,2),
              reviewer_notes TEXT,
              is_validated BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (church_id) REFERENCES church_info(id) ON DELETE SET NULL,
              INDEX idx_type_language (record_type, language),
              INDEX idx_quality (quality_score),
              INDEX idx_validated (is_validated)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `
        }
      ];

      for (const schema of ocrSchemas) {
        await this.executeQuery(connection, schema.sql, `Create OCR table: ${schema.name}`);
      }

      colorLog('✅ OCR tables setup completed', 'green');

    } catch (error) {
      colorLog(`❌ OCR tables setup failed: ${error.message}`, 'red');
      throw error;
    } finally {
      await connection.end();
    }
  }

  async optimizeDatabase() {
    colorLog('\n⚡ Optimizing Database Performance...', 'cyan');
    
    const connection = await this.getConnection();
    
    try {
      // Get all tables
      const [tables] = await connection.execute('SHOW TABLES');
      const tableNames = tables.map(row => Object.values(row)[0]);
      
      for (const tableName of tableNames) {
        await this.executeQuery(connection, `OPTIMIZE TABLE \`${tableName}\``, `Optimize: ${tableName}`);
      }

      // Update table statistics
      await this.executeQuery(connection, 'ANALYZE TABLE `baptism_records`, `marriage_records`, `funeral_records`, `ocr_jobs`', 'Update table statistics');

      colorLog('✅ Database optimization completed', 'green');

    } catch (error) {
      colorLog(`❌ Database optimization failed: ${error.message}`, 'red');
      throw error;
    } finally {
      await connection.end();
    }
  }

  async validateSchema() {
    colorLog('\n✅ Validating Database Schema...', 'cyan');
    
    const connection = await this.getConnection();
    
    try {
      const requiredTables = [
        'church_info', 'baptism_records', 'marriage_records', 
        'funeral_records', 'ocr_jobs', 'ocr_field_mappings'
      ];

      const [tables] = await connection.execute('SHOW TABLES');
      const existingTables = tables.map(row => Object.values(row)[0]);
      
      let validationPassed = true;

      for (const requiredTable of requiredTables) {
        if (existingTables.includes(requiredTable)) {
          colorLog(`   ✅ Table exists: ${requiredTable}`, 'green');
        } else {
          colorLog(`   ❌ Missing table: ${requiredTable}`, 'red');
          validationPassed = false;
        }
      }

      // Check foreign key constraints
      const [constraints] = await connection.execute(`
        SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [this.dbConfig.database]);

      if (constraints.length > 0) {
        colorLog(`   ✅ Found ${constraints.length} foreign key constraints`, 'green');
      } else {
        colorLog('   ⚠️  No foreign key constraints found', 'yellow');
      }

      if (validationPassed) {
        colorLog('✅ Schema validation passed', 'green');
      } else {
        colorLog('❌ Schema validation failed', 'red');
        throw new Error('Database schema validation failed');
      }

    } catch (error) {
      colorLog(`❌ Schema validation failed: ${error.message}`, 'red');
      throw error;
    } finally {
      await connection.end();
    }
  }

  async run(command) {
    const startTime = Date.now();
    
    colorLog('🗄️  Orthodox Metrics - Database Manager', 'cyan');
    colorLog('═'.repeat(60), 'blue');
    colorLog(`Command: ${command}`, 'blue');
    
    if (this.options.dryRun) {
      colorLog('🔍 DRY RUN MODE - No changes will be made', 'yellow');
    }

    try {
      if (this.options.backup && !this.options.dryRun) {
        await this.createBackup();
      }

      switch (command) {
        case 'setup':
          await this.createSchema();
          await this.setupOcrTables();
          await this.validateSchema();
          break;
        
        case 'schema':
          await this.createSchema();
          break;
        
        case 'ocr':
          await this.setupOcrTables();
          break;
        
        case 'optimize':
          await this.optimizeDatabase();
          break;
        
        case 'validate':
          await this.validateSchema();
          break;
        
        case 'backup':
          await this.createBackup();
          break;
        
        default:
          throw new Error(`Unknown command: ${command}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      colorLog(`\n🎉 DATABASE OPERATION COMPLETED!`, 'green');
      colorLog(`⏱️  Duration: ${duration}s`, 'green');

    } catch (error) {
      colorLog(`\n💥 DATABASE OPERATION FAILED: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Orthodox Metrics Database Manager

Usage: node database-manager.js <command> [options]

Commands:
  setup       Complete database setup (schema + OCR tables)
  schema      Create core database schema only
  ocr         Setup OCR-related tables only
  optimize    Optimize database performance
  validate    Validate database schema
  backup      Create database backup

Options:
  --dry-run          Show what would be done without making changes
  --no-backup        Skip automatic backup creation
  --force            Force operation even if risky
  --help             Show this help message

Examples:
  node database-manager.js setup                    # Full setup
  node database-manager.js schema --dry-run         # Preview schema creation
  node database-manager.js optimize                 # Optimize performance
  node database-manager.js backup                   # Create backup only
    `);
    process.exit(0);
  }

  const command = args[0];
  const options = {};

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-backup':
        options.backup = false;
        break;
      case '--force':
        options.force = true;
        break;
    }
  }

  const dbManager = new DatabaseManager(options);
  await dbManager.run(command);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseManager;
