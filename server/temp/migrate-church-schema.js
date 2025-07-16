// Apply database migration to upgrade existing church schema
// This script will safely upgrade the existing church database

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class DatabaseMigrator {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'saints_peter_and_paul_orthodox_church_db',
      multipleStatements: true
    };
  }

  async runMigration() {
    console.log('🔄 Starting database migration...');
    
    const connection = await mysql.createConnection(this.dbConfig);
    
    try {
      // Load migration script
      const migrationPath = path.join(__dirname, 'migrations', 'upgrade-church-schema.sql');
      const migrationSql = await fs.readFile(migrationPath, 'utf8');
      
      console.log('📋 Loaded migration script');
      
      // Execute migration
      console.log('⚡ Executing migration...');
      const results = await connection.execute(migrationSql);
      
      console.log('✅ Migration completed successfully');
      
      // Verify the results
      console.log('\n📊 Verifying church_info table structure...');
      const [columns] = await connection.execute('DESCRIBE church_info');
      
      console.log('Church Info Table Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
      });
      
      // Check church data
      console.log('\n🏛️ Current church data:');
      const [churches] = await connection.execute(`
        SELECT id, church_id, name, email, phone, city, state_province, 
               country, is_active, created_at 
        FROM church_info
      `);
      
      churches.forEach(church => {
        console.log(`  Church ID: ${church.church_id}`);
        console.log(`  Name: ${church.name}`);
        console.log(`  Email: ${church.email}`);
        console.log(`  Location: ${church.city}, ${church.state_province}`);
        console.log(`  Active: ${church.is_active}`);
        console.log(`  ---`);
      });
      
      // Test the API compatibility
      console.log('\n🧪 Testing API compatibility...');
      const [testChurches] = await connection.execute(`
        SELECT id, name, church_id, is_active 
        FROM church_info 
        WHERE is_active = 1 OR is_active = TRUE
      `);
      
      console.log(`✅ Found ${testChurches.length} active churches for API`);
      testChurches.forEach(church => {
        console.log(`  - ${church.name} (ID: ${church.id}, Church ID: ${church.church_id})`);
      });
      
      return {
        success: true,
        message: 'Migration completed successfully',
        churchCount: churches.length,
        activeChurches: testChurches.length
      };
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  // Test the complete workflow after migration
  async testWorkflow() {
    console.log('\n🧪 Testing complete workflow...');
    
    const connection = await mysql.createConnection(this.dbConfig);
    
    try {
      // Test church API data format
      const [churches] = await connection.execute(`
        SELECT id, name, church_id, 
               CASE 
                 WHEN is_active = 1 OR is_active = TRUE THEN true
                 ELSE false
               END as is_active
        FROM church_info
      `);
      
      console.log('API Response Format Test:');
      console.log(JSON.stringify({
        success: true,
        churches: churches
      }, null, 2));
      
      // Test import data insertion
      console.log('\n📊 Testing record import...');
      
      const testRecord = {
        church_id: churches[0].id,
        person_name: 'Test Person',
        date_performed: '2024-12-25',
        priest_name: 'Fr. Test',
        notes: 'Test import record',
        parents: 'Test Parents',
        godparents: 'Test Godparents',
        record_source: 'import'
      };
      
      const [insertResult] = await connection.execute(`
        INSERT INTO baptism_records 
        (church_id, person_name, date_performed, priest_name, notes, parents, godparents, record_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, Object.values(testRecord));
      
      console.log(`✅ Test record inserted with ID: ${insertResult.insertId}`);
      
      // Clean up test record
      await connection.execute('DELETE FROM baptism_records WHERE id = ?', [insertResult.insertId]);
      console.log('🧹 Test record cleaned up');
      
      return {
        success: true,
        message: 'Workflow test completed successfully'
      };
      
    } finally {
      await connection.end();
    }
  }
}

// CLI usage
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    const result = await migrator.runMigration();
    console.log('\n🎉 Migration Result:', result);
    
    const testResult = await migrator.testWorkflow();
    console.log('\n🎉 Workflow Test Result:', testResult);
    
    console.log('\n✅ All tests passed! The database is ready for the import system.');
    
  } catch (error) {
    console.error('\n❌ Migration or test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;
