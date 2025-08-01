#!/usr/bin/env node
// Script to create the clients table
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

async function createClientsTable() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        
        // Create connection with individual parameters
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: process.env.DB_NAME || 'orthodoxmetrics_db',
            multipleStatements: true
        });

        console.log('✅ Connected to database successfully!');

        // Read and execute the clients schema
        const schemaPath = path.join(__dirname, 'database', 'clients_schema.sql');
        console.log(`📖 Reading schema from: ${schemaPath}`);
        
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual statements
        const statements = schema.split(';').filter(stmt => stmt.trim());

        console.log(`🚀 Executing ${statements.length} SQL statements...`);

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log('✅ Statement executed successfully');
                } catch (error) {
                    // Ignore "table already exists" and "duplicate entry" errors
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
                        error.code === 'ER_DUP_ENTRY' ||
                        error.message.includes('already exists')) {
                        console.log(`ℹ️  Skipping (already exists): ${error.message}`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log('\n🎉 Clients table created successfully!');

        // Verify the table was created
        const [tables] = await connection.execute("SHOW TABLES LIKE 'clients'");
        if (tables.length > 0) {
            console.log('✅ Clients table verified');
            
            // Show table structure
            const [columns] = await connection.execute("DESCRIBE clients");
            console.log('\n📋 Table structure:');
            columns.forEach(col => {
                console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `(${col.Key})` : ''}`);
            });
            
            // Show sample data
            const [rows] = await connection.execute("SELECT id, name, slug, status FROM clients LIMIT 3");
            if (rows.length > 0) {
                console.log('\n📋 Sample data:');
                rows.forEach(row => {
                    console.log(`   ID: ${row.id}, Name: ${row.name}, Slug: ${row.slug}, Status: ${row.status}`);
                });
            }
        } else {
            console.log('❌ Clients table verification failed');
        }

    } catch (error) {
        console.error('❌ Error creating clients table:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the script
createClientsTable();
