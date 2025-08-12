#!/usr/bin/env node

/**
 * Simple script to register existing church in central database
 * This script specifically handles registering SSPPOC_001 with the saints_peter_and_paul_orthodox_church_db
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Orthodox2024!',
  port: process.env.DB_PORT || 3306
};

async function registerExistingChurch() {
  console.log('🏛️ Registering existing church in central database...');
  
  let mainConnection;
  let churchConnection;
  
  try {
    // Step 1: Connect to main database and create churches table if needed
    console.log('📊 Connecting to central database...');
    mainConnection = await mysql.createConnection({
      ...dbConfig,
      database: 'orthodoxmetrics_db'
    });

    // Create churches table if it doesn't exist
    console.log('🔧 Creating churches table if needed...');
    await mainConnection.execute(`
      CREATE TABLE IF NOT EXISTS churches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        database_name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        setup_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY uk_churches_email (email),
        UNIQUE KEY uk_churches_db (database_name),
        UNIQUE KEY uk_churches_slug (slug),
        INDEX idx_churches_active (is_active)
      )
    `);

    // Step 2: Get church info from existing church database
    console.log('📖 Reading church info from saints_peter_and_paul_orthodox_church_db...');
    churchConnection = await mysql.createConnection({
      ...dbConfig,
      database: 'saints_peter_and_paul_orthodox_church_db'
    });

    const [churchInfo] = await churchConnection.execute(
      'SELECT * FROM church_info WHERE church_id = ? OR id = 1 LIMIT 1',
      ['SSPPOC_001']
    );

    let church;
    if (churchInfo.length > 0) {
      church = churchInfo[0];
      console.log('✅ Found existing church info:', church.name);
    } else {
      // Use default values if no church_info found
      church = {
        church_id: 'SSPPOC_001',
        name: 'Saints Peter and Paul Orthodox Church',
        email: 'admin@ssppoc.org'
      };
      console.log('⚠️  No church_info found, using default values');
    }

    // Step 3: Check if church is already registered
    console.log('🔍 Checking if church is already registered...');
    const [existing] = await mainConnection.execute(
      'SELECT * FROM churches WHERE church_id = ? OR database_name = ?',
      [church.church_id || 'SSPPOC_001', 'saints_peter_and_paul_orthodox_church_db']
    );

    if (existing.length > 0) {
      console.log('✅ Church already registered:', existing[0]);
      console.log('📋 Registration details:');
      console.log('   Church ID:', existing[0].church_id);
      console.log('   Name:', existing[0].name);
      console.log('   Database:', existing[0].database_name);
      console.log('   Active:', existing[0].is_active ? 'Yes' : 'No');
    } else {
      // Step 4: Register the church
      console.log('📝 Registering church in central database...');
      await mainConnection.execute(`
        INSERT INTO churches (church_id, name, email, database_name, slug, is_active, setup_completed)
        VALUES (?, ?, ?, ?, ?, TRUE, TRUE)
      `, [
        church.church_id || 'SSPPOC_001',
        church.name || 'Saints Peter and Paul Orthodox Church',
        church.email || 'admin@ssppoc.org',
        'saints_peter_and_paul_orthodox_church_db',
        'ssppoc-001'
      ]);

      console.log('✅ Church successfully registered!');
    }

    // Step 5: Verify registration
    console.log('\n🔍 Verifying registration...');
    const [verification] = await mainConnection.execute(
      'SELECT * FROM churches WHERE church_id = ?',
      [church.church_id || 'SSPPOC_001']
    );

    if (verification.length > 0) {
      const registered = verification[0];
      console.log('✅ Church registration verified:');
      console.log('   ID:', registered.id);
      console.log('   Church ID:', registered.church_id);
      console.log('   Name:', registered.name);
      console.log('   Email:', registered.email);
      console.log('   Database:', registered.database_name);
      console.log('   Slug:', registered.slug);
      console.log('   Active:', registered.is_active ? 'Yes' : 'No');
      console.log('   Setup Complete:', registered.setup_completed ? 'Yes' : 'No');
      console.log('   Created:', registered.created_at);
    } else {
      throw new Error('Registration verification failed!');
    }

    console.log('\n🎉 Church registration completed successfully!');
    console.log('📌 Next steps:');
    console.log('   1. Try accessing the church admin panel at /admin/church/SSPPOC_001');
    console.log('   2. Verify the church appears in the All Churches list');
    console.log('   3. Test the Edit Church functionality');

  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('   SQL Message:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    // Clean up connections
    if (mainConnection) {
      await mainConnection.end();
    }
    if (churchConnection) {
      await churchConnection.end();
    }
  }
}

// Run the registration
registerExistingChurch().catch(console.error);
