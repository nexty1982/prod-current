const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createClientDatabase(clientSlug, clientName, contactEmail) {
    const databaseName = `orthodox_${clientSlug}`;
    
    // Connect as root to create database
    const rootConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: process.env.DB_ROOT_PASSWORD
    });
    
    try {
        console.log(`Creating database: ${databaseName}`);
        
        // Create database
        await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
        
        // Read template schema
        const schemaPath = path.join(__dirname, 'clientDatabaseTemplate.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf8');
        
        // Replace placeholders
        const clientSql = schemaSql
            .replace(/{DATABASE_NAME}/g, databaseName)
            .replace(/{CLIENT_NAME}/g, clientName)
            .replace(/{CONTACT_EMAIL}/g, contactEmail);
        
        // Execute schema
        const statements = clientSql.split(';').filter(stmt => stmt.trim());
        
        await rootConnection.execute(`USE ${databaseName}`);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await rootConnection.execute(statement);
            }
        }
        
        console.log(`✅ Database ${databaseName} created successfully`);
        
        // Update client status
        const mainConnection = await mysql.createConnection({
            host: 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'orthodox'
        });
        
        await mainConnection.execute(
            'UPDATE clients SET status = "active" WHERE slug = ?',
            [clientSlug]
        );
        
        await mainConnection.end();
        
    } catch (error) {
        console.error('Error creating client database:', error);
        throw error;
    } finally {
        await rootConnection.end();
    }
}

// Usage: node createClientDatabase.js ssppoc "Saints Peter & Paul Orthodox Church" "admin@ssppoc.org"
if (require.main === module) {
    const [,, clientSlug, clientName, contactEmail] = process.argv;
    
    if (!clientSlug || !clientName || !contactEmail) {
        console.log('Usage: node createClientDatabase.js <slug> <name> <email>');
        process.exit(1);
    }
    
    createClientDatabase(clientSlug, clientName, contactEmail)
        .then(() => {
            console.log('Client database creation completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed to create client database:', error);
            process.exit(1);
        });
}

module.exports = createClientDatabase;
