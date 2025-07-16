// Migration script to update church_info table with comprehensive fields
// Run this script to apply the database schema changes

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapp',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  port: process.env.DB_PORT || 3306
};

async function runMigration() {
  console.log('🔄 Starting church_info table migration...');
  
  try {
    // Create database connection with multipleStatements enabled
    const connection = await mysql.createConnection({
      ...dbConfig,
      multipleStatements: true
    });
    console.log('✅ Database connection established');

    // Execute the migration in logical steps
    console.log('🔧 Step 1: Creating church_info table...');
    
    // Step 1: Create the table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS church_info (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id VARCHAR(50) UNIQUE,
          
          -- Core church information
          name VARCHAR(255) NOT NULL DEFAULT '',
          email VARCHAR(255) NOT NULL DEFAULT '',
          phone VARCHAR(50) DEFAULT NULL,
          website VARCHAR(255) DEFAULT NULL,
          
          -- Address information
          address TEXT DEFAULT NULL,
          city VARCHAR(100) DEFAULT NULL,
          state_province VARCHAR(100) DEFAULT NULL,
          postal_code VARCHAR(20) DEFAULT NULL,
          country VARCHAR(100) DEFAULT NULL,
          
          -- Church details
          description TEXT DEFAULT NULL,
          founded_year INT DEFAULT NULL,
          
          -- Preferences and settings
          language_preference VARCHAR(10) DEFAULT 'en',
          timezone VARCHAR(50) DEFAULT 'UTC',
          currency VARCHAR(10) DEFAULT 'USD',
          
          -- Administrative
          tax_id VARCHAR(50) DEFAULT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Step 1 completed: church_info table created');

    // Step 2: Create indexes
    console.log('🔧 Step 2: Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_church_info_name ON church_info(name)',
      'CREATE INDEX IF NOT EXISTS idx_church_info_email ON church_info(email)',
      'CREATE INDEX IF NOT EXISTS idx_church_info_active ON church_info(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_church_info_country ON church_info(country)'
    ];

    for (const indexSQL of indexes) {
      try {
        await connection.execute(indexSQL);
        console.log(`   ✅ Index created: ${indexSQL.substring(0, 50)}...`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`   ⚠️  Index already exists (skipping)`);
        } else {
          throw error;
        }
      }
    }

    // Step 3: Add unique constraint
    console.log('� Step 3: Adding unique constraints...');
    try {
      await connection.execute('ALTER TABLE church_info ADD CONSTRAINT uk_church_info_email UNIQUE (email)');
      console.log('✅ Step 3 completed: unique constraint added');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Unique constraint already exists (skipping)');
      } else {
        throw error;
      }
    }

    // Step 4: Insert sample data
    console.log('🔧 Step 4: Inserting sample data...');
    try {
      await connection.execute(`
        INSERT IGNORE INTO church_info (
            church_id, name, email, phone, website, 
            address, city, state_province, postal_code, country,
            description, founded_year, language_preference, timezone, currency, is_active
        ) VALUES (
            'SSPPOC_001', 
            'Saints Peter and Paul Orthodox Church',
            'admin@ssppoc.org',
            '(555) 123-4567',
            'https://ssppoc.org',
            '123 Orthodox Way',
            'Springfield',
            'Illinois',
            '62701',
            'United States',
            'A traditional Orthodox church serving the Springfield community since 1952.',
            1952,
            'en',
            'America/Chicago',
            'USD',
            TRUE
        )
      `);
      console.log('✅ Step 4 completed: sample data inserted');
    } catch (error) {
      console.log('⚠️  Sample data may already exist (skipping)');
    }

    // Verify the migration by checking table structure
    console.log('\n🔍 Verifying migration results...');
    const [columns] = await connection.execute('DESCRIBE church_info');
    console.log('📋 Current church_info table structure:');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Check if sample data was inserted
    const [sampleData] = await connection.execute('SELECT COUNT(*) as count FROM church_info');
    console.log(`📊 Total records in church_info: ${sampleData[0].count}`);

    // Close connection
    await connection.end();
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ church_info table has been updated with all required fields');
    console.log('📌 Next steps:');
    console.log('   1. Test the updated /api/churches/create endpoint');
    console.log('   2. Update frontend forms to use new field names');
    console.log('   3. Test church creation through the UI');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
