const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runTrainingDataMigration() {
  try {
    console.log('🚀 Starting OCR Training Data Migration...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodoxapp',
      password: 'Summerof1982@!',
      database: 'orthodoxmetrics',
      multipleStatements: true
    });
    
    console.log('📡 Connected to database');
    
    const migrationPath = path.join(__dirname, 'migrations', 'create-training-data-tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration...');
    
    // Split SQL into individual statements and execute them one by one
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
          await connection.execute(statement);
        } catch (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error(`📝 Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    console.log('✅ Training data migration completed successfully');
    
    await connection.end();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTrainingDataMigration();
}

module.exports = { runTrainingDataMigration };
