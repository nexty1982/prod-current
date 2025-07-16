const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

async function runMigration() {
    try {
        // Create connection with individual parameters
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: process.env.DB_NAME || 'orthodoxmetrics_db',
            multipleStatements: true
        });

        console.log('Connected to MySQL database');

        // Read and execute the schema
        const schemaPath = path.join(__dirname, 'database', 'notifications_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual statements
        const statements = schema.split(';').filter(stmt => stmt.trim());

        console.log(`Executing ${statements.length} SQL statements...`);

        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
            }
        }

        console.log('Notification schema created successfully');

        // Insert default notification types
        const defaultTypes = [
            ['system_maintenance', 'System maintenance notifications', 'system'],
            ['backup_complete', 'Backup completion notifications', 'backup'],
            ['backup_failed', 'Backup failure notifications', 'backup'],
            ['user_registered', 'New user registration notifications', 'user'],
            ['certificate_expiry', 'Certificate expiry warnings', 'certificates'],
            ['security_alert', 'Security alert notifications', 'security'],
            ['reminder', 'General reminder notifications', 'reminders'],
            ['admin_alert', 'Admin alert notifications', 'admin']
        ];

        for (const [name, description, category] of defaultTypes) {
            await connection.execute(
                'INSERT IGNORE INTO notification_types (name, description, category) VALUES (?, ?, ?)',
                [name, description, category]
            );
        }

        console.log('Default notification types inserted');

        await connection.end();
        console.log('Migration completed successfully');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
