// Church Setup Wizard - Complete Integration Script
// Run this script to set up the church wizard system

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class ChurchSetupWizardSetup {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'orthodoxapp',
      password: process.env.DB_PASSWORD || 'Summerof1982@!',
      multipleStatements: true
    };
  }

  async setupSystem() {
    console.log('🏛️ Setting up Church Setup Wizard System...\n');

    try {
      // Step 1: Create main system database and tables
      await this.createMainSystemTables();
      
      // Step 2: Update existing church database
      await this.updateExistingChurchDatabase();
      
      // Step 3: Test the system
      await this.testSystem();
      
      console.log('\n🎉 Church Setup Wizard System is ready!');
      console.log('\n📋 Next Steps:');
      console.log('1. Start your server with the new routes');
      console.log('2. Access /add-church to create new churches');
      console.log('3. Access /church-setup-wizard to configure churches');
      console.log('4. Test the complete workflow');

    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  async createMainSystemTables() {
    console.log('1️⃣ Creating main system tables...');
    
    const connection = await mysql.createConnection(this.dbConfig);
    
    try {
      // Load and execute main system schema
      const schemaPath = path.join(__dirname, 'migrations', 'church-setup-wizard-schema.sql');
      const schemaSql = await fs.readFile(schemaPath, 'utf8');
      
      await connection.execute(schemaSql);
      console.log('✅ Main system tables created');
      
    } finally {
      await connection.end();
    }
  }

  async updateExistingChurchDatabase() {
    console.log('\n2️⃣ Updating existing church database...');
    
    const connection = await mysql.createConnection({
      ...this.dbConfig,
      database: 'saints_peter_and_paul_orthodox_church_db'
    });
    
    try {
      // Add new tables to existing church database
      console.log('   Adding clergy table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS clergy (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          name VARCHAR(255) NOT NULL,
          title VARCHAR(100) DEFAULT '',
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50) DEFAULT '',
          role VARCHAR(100) NOT NULL,
          position_description TEXT DEFAULT NULL,
          start_date DATE DEFAULT NULL,
          end_date DATE DEFAULT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_clergy_church_id (church_id),
          INDEX idx_clergy_active (is_active),
          INDEX idx_clergy_role (role),
          INDEX idx_clergy_name (name)
        )
      `);

      console.log('   Adding branding table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS branding (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          logo_path VARCHAR(500) DEFAULT NULL,
          logo_original_name VARCHAR(255) DEFAULT NULL,
          primary_color VARCHAR(7) DEFAULT '#1976d2',
          secondary_color VARCHAR(7) DEFAULT '#dc004e',
          accent_color VARCHAR(7) DEFAULT NULL,
          ag_grid_theme VARCHAR(50) DEFAULT 'ag-theme-alpine',
          custom_css TEXT DEFAULT NULL,
          theme_preferences JSON DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY uk_branding_church (church_id)
        )
      `);

      console.log('   Adding church settings table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS church_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          setting_key VARCHAR(100) NOT NULL,
          setting_value TEXT DEFAULT NULL,
          setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
          description TEXT DEFAULT NULL,
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY uk_settings_church_key (church_id, setting_key),
          INDEX idx_settings_church (church_id),
          INDEX idx_settings_public (is_public)
        )
      `);

      console.log('   Adding setup wizard progress table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS setup_wizard_progress (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          current_step INT DEFAULT 0,
          steps_completed JSON DEFAULT NULL,
          wizard_data JSON DEFAULT NULL,
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY uk_wizard_church (church_id)
        )
      `);

      // Insert default data
      console.log('   Inserting default settings...');
      await connection.execute(`
        INSERT IGNORE INTO branding (church_id, primary_color, secondary_color, ag_grid_theme) 
        VALUES (1, '#1976d2', '#dc004e', 'ag-theme-alpine')
      `);

      await connection.execute(`
        INSERT IGNORE INTO church_settings (church_id, setting_key, setting_value, setting_type, description, is_public)
        VALUES 
        (1, 'records_per_page', '25', 'number', 'Default number of records to display per page', TRUE),
        (1, 'enable_notifications', 'true', 'boolean', 'Enable system notifications', FALSE),
        (1, 'default_record_language', 'en', 'string', 'Default language for new records', TRUE),
        (1, 'allow_record_imports', 'true', 'boolean', 'Allow importing records from JSON files', FALSE),
        (1, 'max_import_records', '1000', 'number', 'Maximum records per import batch', FALSE),
        (1, 'enable_ocr_processing', 'true', 'boolean', 'Enable OCR document processing', FALSE)
      `);

      await connection.execute(`
        INSERT IGNORE INTO setup_wizard_progress (church_id, current_step, steps_completed, wizard_data)
        VALUES (1, 5, '[1,2,3,4,5]', '{"completed": true}')
      `);

      console.log('✅ Existing church database updated');

      // Add existing church to main registry
      await this.addExistingChurchToRegistry();

    } finally {
      await connection.end();
    }
  }

  async addExistingChurchToRegistry() {
    console.log('   Adding existing church to main registry...');
    
    const mainConnection = await mysql.createConnection({
      ...this.dbConfig,
      database: 'orthodoxmetrics_main'
    });

    try {
      // Get church info from existing database
      const churchConnection = await mysql.createConnection({
        ...this.dbConfig,
        database: 'saints_peter_and_paul_orthodox_church_db'
      });

      const [churchInfo] = await churchConnection.execute(
        'SELECT * FROM church_info WHERE id = 1'
      );
      await churchConnection.end();

      if (churchInfo.length > 0) {
        const church = churchInfo[0];
        
        await mainConnection.execute(`
          INSERT IGNORE INTO churches (church_id, name, email, database_name, slug, is_active, setup_completed)
          VALUES (?, ?, ?, ?, ?, TRUE, TRUE)
        `, [
          church.church_id || 'SSPPOC_001',
          church.name || 'Saints Peter and Paul Orthodox Church',
          church.email || 'admin@ssppoc.org',
          'saints_peter_and_paul_orthodox_church_db',
          'ssppoc-001'
        ]);

        console.log('✅ Existing church added to registry');
      }

    } finally {
      await mainConnection.end();
    }
  }

  async testSystem() {
    console.log('\n3️⃣ Testing system...');
    
    try {
      // Test main system database
      const mainConnection = await mysql.createConnection({
        ...this.dbConfig,
        database: 'orthodoxmetrics_main'
      });

      const [churches] = await mainConnection.execute('SELECT COUNT(*) as count FROM churches');
      console.log(`   Churches in registry: ${churches[0].count}`);
      await mainConnection.end();

      // Test existing church database
      const churchConnection = await mysql.createConnection({
        ...this.dbConfig,
        database: 'saints_peter_and_paul_orthodox_church_db'
      });

      const [tables] = await churchConnection.execute('SHOW TABLES');
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      const requiredTables = ['clergy', 'branding', 'church_settings', 'setup_wizard_progress'];
      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length === 0) {
        console.log('✅ All required tables present');
      } else {
        console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      }

      await churchConnection.end();

      console.log('✅ System test completed');

    } catch (error) {
      console.error('❌ System test failed:', error);
      throw error;
    }
  }

  async createUploadDirectories() {
    console.log('\n4️⃣ Creating upload directories...');
    
    const uploadDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'uploads', 'logos'),
      path.join(__dirname, 'uploads', 'documents')
    ];

    for (const dir of uploadDirs) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`   Created: ${dir}`);
    }

    console.log('✅ Upload directories created');
  }
}

// CLI usage
async function main() {
  const setup = new ChurchSetupWizardSetup();
  
  try {
    await setup.setupSystem();
    await setup.createUploadDirectories();
    
    console.log('\n🎊 Setup completed successfully!');
    console.log('\n📁 Files created:');
    console.log('   • ChurchSetupWizard.tsx (Frontend component)');
    console.log('   • AddChurchPage.tsx (Add church page)');
    console.log('   • churchSetupWizard.js (Backend API routes)');
    console.log('   • church-setup-wizard-schema.sql (Database schema)');
    console.log('\n🚀 Ready to integrate into your application!');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ChurchSetupWizardSetup;
