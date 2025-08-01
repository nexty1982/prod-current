// Church Provisioning System
// Creates new church databases with complete schema from template

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

class ChurchProvisioner {
  constructor() {
    this.systemDbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    };
  }

  // Generate church database name from church info
  generateDbName(churchName) {
    return churchName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Remove duplicate underscores
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50) + '_db'; // Limit length and add suffix
  }

  // Create new church database and schema
  async createChurchDatabase(churchData) {
    const connection = await mysql.createConnection(this.systemDbConfig);
    
    try {
      console.log('🏛️ Starting church provisioning process...');
      
      // 1. Generate database name
      const dbName = this.generateDbName(churchData.name);
      console.log(`📋 Generated database name: ${dbName}`);
      
      // 2. Create database
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      console.log(`✅ Database "${dbName}" created successfully`);
      
      // 3. Switch to new database
      await connection.execute(`USE \`${dbName}\``);
      
      // 4. Load and execute database template
      const templatePath = path.join(__dirname, 'templates', 'church-database-template.sql');
      const templateSql = await fs.readFile(templatePath, 'utf8');
      
      console.log('📊 Executing database template...');
      await connection.execute(templateSql);
      console.log('✅ Database schema created from template');
      
      // 5. Update church_info with actual data
      const churchId = this.generateChurchId(churchData.name);
      const hashedPassword = await bcrypt.hash(churchData.adminPassword || 'DefaultPassword123!', 10);
      
      await connection.execute(`
        UPDATE church_info SET 
          church_id = ?,
          name = ?,
          email = ?,
          phone = ?,
          website = ?,
          address = ?,
          city = ?,
          state_province = ?,
          postal_code = ?,
          country = ?,
          description = ?,
          founded_year = ?,
          language_preference = ?,
          timezone = ?,
          currency = ?
        WHERE id = 1
      `, [
        churchId,
        churchData.name,
        churchData.email,
        churchData.phone || null,
        churchData.website || null,
        churchData.address || null,
        churchData.city || null,
        churchData.state_province || null,
        churchData.postal_code || null,
        churchData.country || 'United States',
        churchData.description || null,
        churchData.founded_year || null,
        churchData.language_preference || 'en',
        churchData.timezone || 'UTC',
        churchData.currency || 'USD'
      ]);
      
      // 6. Update admin user
      await connection.execute(`
        UPDATE users SET 
          name = ?,
          email = ?,
          password = ?
        WHERE id = 1
      `, [
        churchData.adminName || 'Church Administrator',
        churchData.email,
        hashedPassword
      ]);
      
      console.log('✅ Church data updated successfully');
      
      // 7. Add to global church registry
      await this.addToGlobalRegistry({
        ...churchData,
        church_id: churchId,
        database_name: dbName
      });
      
      console.log('🎉 Church provisioning completed successfully!');
      
      return {
        success: true,
        churchId: churchId,
        databaseName: dbName,
        adminEmail: churchData.email,
        message: 'Church database created and configured successfully'
      };
      
    } catch (error) {
      console.error('❌ Church provisioning failed:', error);
      
      // Cleanup: attempt to drop database if created
      try {
        await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
        console.log('🧹 Cleanup: Database removed due to error');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      }
      
      throw error;
    } finally {
      await connection.end();
    }
  }

  // Generate unique church ID
  generateChurchId(churchName) {
    const prefix = churchName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6);
    
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}_${timestamp}`;
  }

  // Add church to global registry (main database)
  async addToGlobalRegistry(churchData) {
    const mainConnection = await mysql.createConnection({
      ...this.systemDbConfig,
      database: 'orthodoxmetrics_db' // Use the correct main system database
    });
    
    try {
      // Create churches table if it doesn't exist (schema should match your main system)
      await mainConnection.execute(`
        CREATE TABLE IF NOT EXISTS churches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id VARCHAR(50) UNIQUE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          database_name VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      // Insert church record
      const insertQuery = `
        INSERT INTO churches (church_id, name, email, database_name, is_active)
        VALUES (?, ?, ?, ?, TRUE)
      `;
      const values = [
        churchData.church_id,
        churchData.name,
        churchData.email,
        churchData.database_name
      ];
      console.log('Inserting into orthodoxmetrics_db.churches:', insertQuery, values);
      const [result] = await mainConnection.execute(insertQuery, values);
      console.log('Insert result:', result);
      console.log('✅ Church added to global registry (orthodoxmetrics_db)');
    } finally {
      await mainConnection.end();
    }
  }

  // Test the provisioning system
  async testProvisioning() {
    const testChurch = {
      name: 'Holy Trinity Orthodox Church',
      email: 'admin@holytrinityorthodox.org',
      phone: '(555) 987-6543',
      website: 'https://holytrinityorthodox.org',
      address: '456 Orthodox Avenue',
      city: 'Springfield',
      state_province: 'Illinois',
      postal_code: '62702',
      country: 'United States',
      description: 'A vibrant Orthodox community serving Springfield since 1965.',
      founded_year: 1965,
      language_preference: 'en',
      timezone: 'America/Chicago',
      currency: 'USD',
      adminName: 'Father Michael Stavros',
      adminPassword: 'SecurePassword123!'
    };
    
    try {
      const result = await this.createChurchDatabase(testChurch);
      console.log('🧪 Test Result:', result);
      return result;
    } catch (error) {
      console.error('🧪 Test Failed:', error);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = ChurchProvisioner;

// CLI usage
if (require.main === module) {
  const provisioner = new ChurchProvisioner();
  
  const command = process.argv[2];
  
  if (command === 'test') {
    provisioner.testProvisioning()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('Church Provisioning System');
    console.log('Usage: node church-provisioner.js test');
    console.log('       node church-provisioner.js create');
  }
}
