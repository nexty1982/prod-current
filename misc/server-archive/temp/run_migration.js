const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { promisePool } = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Use the existing database configuration
    const connection = promisePool;
    
    console.log('✅ Connected to database');
    
    const sqlFile = path.join(__dirname, 'database', 'add_markdown_fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed:', statement.trim().substring(0, 50) + '...');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Column already exists, skipping:', statement.trim().substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully');
    // Don't close the connection as it's a pool
    
    // Also need to create the uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'kanban', 'markdown');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory:', uploadsDir);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
