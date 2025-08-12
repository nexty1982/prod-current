const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '0.0.0.0',
  user: process.env.DB_USER || 'ssppoc_user',
  password: process.env.DB_PASSWORD || 'tN7afy5SzhNH6pJWU7ka%c',
  database: process.env.DB_NAME || 'ssppoc_records_db',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

console.log('🔧 Database configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Password: ${dbConfig.password ? '***set***' : 'NOT SET'}`);

async function runSQLFile(connection, filePath) {
  try {
    console.log(`\n📄 Running SQL file: ${path.basename(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          await getAppPool().query(trimmedStatement);
          console.log(`✅ Executed: ${trimmedStatement.substring(0, 50)}...`);
        } catch (error) {
          // Only log error if it's not about table already existing
          if (!error.message.includes('already exists')) {
            console.log(`⚠️  Error in statement: ${error.message}`);
          } else {
            console.log(`ℹ️  Table already exists, skipping...`);
          }
        }
      }
    }
    
    console.log(`✅ Completed: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${filePath}:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully!');

    // Define the order of schema files to run
    const schemaFiles = [
      'users_schema_fix.sql',           // Ensure users table is correct
      'churches_schema_update.sql',     // Create churches table
      'billing_schema.sql',             // Create billing-related tables
      'billing_history_schema.sql',     // Create billing history table
      'church_provisioning_schema.sql', // Create provisioning tables
      'church_records_schema.sql',      // Create baptism/marriage/funeral records tables
      'ocr_sessions_schema.sql',        // Create OCR sessions table
      'liturgical_calendar_schema.sql'  // Create liturgical calendar table
    ];

    console.log('\n🚀 Setting up database schema...');
    console.log('='.repeat(50));

    const databaseDir = path.join(__dirname, 'database');
    let successCount = 0;

    for (const schemaFile of schemaFiles) {
      const filePath = path.join(databaseDir, schemaFile);
      const success = await runSQLFile(connection, filePath);
      if (success) successCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🎉 Database setup completed!`);
    console.log(`📊 Successfully processed ${successCount}/${schemaFiles.length} schema files`);

    // Verify critical tables exist
    console.log('\n🔍 Verifying critical tables...');
    const criticalTables = ['users', 'churches', 'subscriptions', 'billing_history', 'church_provision_queue', 'baptism_records', 'marriage_records', 'funeral_records'];
    
    for (const table of criticalTables) {
      try {
        const [rows] = await getAppPool().query(`SHOW TABLES LIKE '${table}'`);
        if (rows.length > 0) {
          console.log(`✅ Table '${table}' exists`);
        } else {
          console.log(`❌ Table '${table}' missing`);
        }
      } catch (error) {
        console.log(`❌ Error checking table '${table}': ${error.message}`);
      }
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Test login with: admin@test.com / admin123');
    console.log('3. Try accessing billing and church management features');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
setupDatabase().catch(console.error);
