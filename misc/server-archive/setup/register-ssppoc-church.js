#!/usr/bin/env node

/**
 * Simple script to run just the church registration part of the setup wizard
 * This uses the existing addExistingChurchToRegistry method from setup-church-wizard.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.development') });

const ChurchSetupWizardSetup = require('../setup-church-wizard');

async function registerExistingChurch() {
  console.log('🏛️ Registering existing Saints Peter and Paul Orthodox Church...');
  
  try {
    // Create an instance of the setup wizard
    const setupWizard = new ChurchSetupWizardSetup();
    
    // Just run the church registration part
    console.log('📝 Adding church to central registry...');
    await setupWizard.addExistingChurchToRegistry();
    
    console.log('✅ Church registration completed successfully!');
    console.log('📌 Next steps:');
    console.log('   1. Try accessing the church admin panel');
    console.log('   2. Verify the church appears in the All Churches list');
    console.log('   3. Test the Edit Church functionality');

  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    
    // If the original method fails due to database name issue, 
    // let's try the simpler approach
    if (error.message.includes('orthodoxmetrics_main')) {
      console.log('🔄 Trying alternative registration method...');
      
      const mysql = require('mysql2/promise');
      
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'orthodoxapps',
        password: process.env.DB_PASSWORD || 'Summerof1982@!',
        port: process.env.DB_PORT || 3306
      };

      // Use orthodoxmetrics_db instead of orthodoxmetrics_main
      const mainConnection = await mysql.createConnection({
        ...dbConfig,
        database: 'orthodoxmetrics_db'
      });

      try {
        // The churches table already exists, no need to create it
        console.log('✅ Churches table already exists');

        // Get church info
        const churchConnection = await mysql.createConnection({
          ...dbConfig,
          database: 'saints_peter_and_paul_orthodox_church_db'
        });

        const [churchInfo] = await churchConnection.execute(
          'SELECT * FROM church_info WHERE church_id = ? OR id = 1 LIMIT 1',
          ['SSPPOC_001']
        );
        await churchConnection.end();

        const church = churchInfo.length > 0 ? churchInfo[0] : {
          name: 'Saints Peter and Paul Orthodox Church',
          email: 'admin@ssppoc.org'
        };

        // Check if church already exists by name or database_name
        const [existing] = await mainConnection.execute(
          'SELECT * FROM churches WHERE name = ? OR database_name = ?',
          [church.name, 'saints_peter_and_paul_orthodox_church_db']
        );

        if (existing.length > 0) {
          // Update existing church record
          await mainConnection.execute(`
            UPDATE churches 
            SET name = ?, 
                email = ?, 
                database_name = ?, 
                is_active = 1, 
                setup_complete = 1 
            WHERE id = ?
          `, [
            church.name || 'Saints Peter and Paul Orthodox Church',
            church.email || 'admin@ssppoc.org',
            'saints_peter_and_paul_orthodox_church_db',
            existing[0].id
          ]);
          console.log('✅ Updated existing church record:', existing[0].id);
        } else {
          // Insert new church record
          await mainConnection.execute(`
            INSERT INTO churches (name, email, database_name, is_active, setup_complete)
            VALUES (?, ?, ?, 1, 1)
          `, [
            church.name || 'Saints Peter and Paul Orthodox Church',
            church.email || 'admin@ssppoc.org',
            'saints_peter_and_paul_orthodox_church_db'
          ]);
          console.log('✅ Created new church record');
        }

        console.log('✅ Alternative registration successful!');

        // Verify the registration
        const [verification] = await mainConnection.execute(
          'SELECT * FROM churches WHERE database_name = ?',
          ['saints_peter_and_paul_orthodox_church_db']
        );

        if (verification.length > 0) {
          const registered = verification[0];
          console.log('✅ Church registration verified:');
          console.log('   ID:', registered.id);
          console.log('   Name:', registered.name);
          console.log('   Email:', registered.email);
          console.log('   Database:', registered.database_name);
          console.log('   Active:', registered.is_active ? 'Yes' : 'No');
          console.log('   Setup Complete:', registered.setup_complete ? 'Yes' : 'No');
          console.log('   Created:', registered.created_at);
        } else {
          throw new Error('Registration verification failed!');
        }
        
      } finally {
        await mainConnection.end();
      }
    } else {
      throw error;
    }
  }
}

// Run the registration
registerExistingChurch().catch(console.error);
