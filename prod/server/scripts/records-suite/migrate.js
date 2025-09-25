#!/usr/bin/env node

/**
 * Records Suite Database Migration
 * Creates necessary meta tables in orthodoxmetrics_db for the Records Management Suite
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

class RecordsSuiteMigrator {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'orthodoxmetrics_db'
    };
  }

  async createConnection() {
    try {
      this.connection = await mysql.createConnection(this.dbConfig);
      console.log('✅ Connected to orthodoxmetrics_db');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async runMigration() {
    console.log('🚀 Starting Records Suite migration...');

    try {
      await this.createConnection();
      
      // Create meta tables
      await this.createRecordsTemplatesTable();
      await this.createRecordsTemplateVersionsTable();
      await this.createParishRecordProfilesTable();
      await this.createFieldMapsTable();
      await this.createThemeAssetsTable();
      
      // Insert default templates
      await this.insertDefaultTemplates();
      
      console.log('✅ Records Suite migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      if (this.connection) {
        await this.connection.end();
      }
    }
  }

  async createRecordsTemplatesTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS om_records_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category ENUM('orthodox_classic', 'minimal_clean', 'custom') DEFAULT 'custom',
        theme_vars JSON,
        css_content TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        version VARCHAR(20) DEFAULT '1.0.0',
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_published (is_published)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await this.connection.execute(sql);
    console.log('📋 Created om_records_templates table');
  }

  async createRecordsTemplateVersionsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS om_records_template_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id VARCHAR(50) NOT NULL,
        version VARCHAR(20) NOT NULL,
        theme_vars JSON,
        css_content TEXT,
        changelog TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_template_id (template_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await this.connection.execute(sql);
    console.log('📋 Created om_records_template_versions table');
  }

  async createParishRecordProfilesTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS om_parish_record_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id VARCHAR(10) NOT NULL,
        template_id VARCHAR(50),
        custom_theme_vars JSON,
        custom_css TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_profile (church_id),
        INDEX idx_church_id (church_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await this.connection.execute(sql);
    console.log('📋 Created om_parish_record_profiles table');
  }

  async createFieldMapsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS om_field_maps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id VARCHAR(10) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        custom_label VARCHAR(200),
        display_order INT DEFAULT 0,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_field_map (church_id, table_name, field_name),
        INDEX idx_church_table (church_id, table_name),
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await this.connection.execute(sql);
    console.log('📋 Created om_field_maps table');
  }

  async createThemeAssetsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS om_theme_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id VARCHAR(10),
        template_id VARCHAR(50),
        asset_type ENUM('header_image', 'left_rail', 'right_rail', 'logo', 'background') NOT NULL,
        asset_path VARCHAR(500),
        asset_url VARCHAR(500),
        file_size INT,
        mime_type VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_church_id (church_id),
        INDEX idx_template_id (template_id),
        INDEX idx_asset_type (asset_type),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await this.connection.execute(sql);
    console.log('📋 Created om_theme_assets table');
  }

  async insertDefaultTemplates() {
    const templates = [
      {
        template_id: 'orthodox-classic',
        name: 'Orthodox Classic',
        description: 'Traditional Orthodox styling with gold accents, decorative rails, and liturgical iconography.',
        category: 'orthodox_classic',
        theme_vars: JSON.stringify({
          primaryColor: '#D4AF37',
          secondaryColor: '#8B7355',
          railColor: '#8B7355',
          headerStyle: 'ornate',
          fontFamily: 'Georgia, serif',
          borderRadius: '8px'
        }),
        css_content: `.records-table { border: 2px solid #D4AF37; }`,
        is_published: true,
        version: '1.0.0',
        created_by: 'system'
      },
      {
        template_id: 'minimal-clean',
        name: 'Minimal Clean',
        description: 'Clean, modern interface with subtle rails and minimal decorative elements.',
        category: 'minimal_clean',
        theme_vars: JSON.stringify({
          primaryColor: '#2563EB',
          secondaryColor: '#E5E7EB',
          railColor: '#E5E7EB',
          headerStyle: 'simple',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '4px'
        }),
        css_content: `.records-table { border: 1px solid #E5E7EB; }`,
        is_published: true,
        version: '1.0.0',
        created_by: 'system'
      }
    ];

    for (const template of templates) {
      try {
        await this.connection.execute(`
          INSERT INTO om_records_templates 
            (template_id, name, description, category, theme_vars, css_content, is_published, version, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            updated_at = CURRENT_TIMESTAMP
        `, [
          template.template_id,
          template.name,
          template.description,
          template.category,
          template.theme_vars,
          template.css_content,
          template.is_published,
          template.version,
          template.created_by
        ]);
        
        console.log(`📝 Inserted/updated template: ${template.name}`);
      } catch (error) {
        console.warn(`⚠️  Could not insert template ${template.name}:`, error.message);
      }
    }
  }
}

// CLI execution
async function main() {
  const migrator = new RecordsSuiteMigrator();
  
  try {
    await migrator.runMigration();
  } catch (error) {
    console.error('💥 Migration script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RecordsSuiteMigrator;