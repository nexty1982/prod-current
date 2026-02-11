// 📁 check-database-connection.js
// Database connection diagnostic tool

const mysql = require('mysql2/promise');

async function checkDatabaseConnection() {
    console.log('🔍 Database Connection Diagnostic Tool');
    console.log('═'.repeat(50));
    
    // Test different connection configurations
    const configurations = [
        {
            name: 'Original Config',
            config: {
                host: 'localhost',
                user: 'orthodoxapps',
                password: 'Summerof1982@!',
                database: 'orthodox_metrics',
                port: 3306
            }
        },
        {
            name: 'Root Connection',
            config: {
                host: 'localhost',
                user: 'root',
                password: 'Summerof1982@!',
                database: 'orthodox_metrics',
                port: 3306
            }
        },
        {
            name: 'Root No Database',
            config: {
                host: 'localhost',
                user: 'root',
                password: 'Summerof1982@!',
                port: 3306
            }
        }
    ];

    for (const { name, config } of configurations) {
        console.log(`\n🧪 Testing: ${name}`);
        console.log('─'.repeat(30));
        
        try {
            const connection = await mysql.createConnection(config);
            console.log('✅ Connection successful!');
            
            // Test basic query
            const [rows] = await connection.execute('SELECT 1 as test');
            console.log('✅ Query execution successful:', rows[0]);
            
            // Check if database exists
            if (config.database) {
                try {
                    const [dbs] = await connection.execute(`SHOW DATABASES LIKE '${config.database}'`);
                    if (dbs.length > 0) {
                        console.log(`✅ Database '${config.database}' exists`);
                    } else {
                        console.log(`❌ Database '${config.database}' does not exist`);
                    }
                } catch (error) {
                    console.log(`❌ Cannot check database: ${error.message}`);
                }
            }
            
            // Check user privileges
            try {
                const [privileges] = await connection.execute(`SHOW GRANTS FOR '${config.user}'@'localhost'`);
                console.log('📋 User privileges:');
                privileges.forEach((priv, index) => {
                    console.log(`   ${index + 1}. ${Object.values(priv)[0]}`);
                });
            } catch (error) {
                console.log(`❌ Cannot check privileges: ${error.message}`);
            }
            
            await connection.end();
            
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            
            // Provide specific suggestions based on error
            if (error.message.includes('Access denied')) {
                console.log('💡 Suggestions:');
                console.log('   - Check username and password');
                console.log('   - Verify user exists in MySQL');
                console.log('   - Check user has proper privileges');
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log('💡 Suggestions:');
                console.log('   - Check if MySQL server is running');
                console.log('   - Verify the port number (default: 3306)');
                console.log('   - Check firewall settings');
            }
        }
    }
    
    console.log('\n🛠️  Database Setup Commands');
    console.log('═'.repeat(50));
    console.log('If you need to create the user and database, run these commands in MySQL:');
    console.log('');
    console.log('-- Connect as root first');
    console.log('-- Then run:');
    console.log('');
    console.log('CREATE DATABASE IF NOT EXISTS orthodox_metrics;');
    console.log('CREATE USER IF NOT EXISTS \'orthodoxapps\'@\'localhost\' IDENTIFIED BY \'Summerof1982@!\';');
    console.log('GRANT ALL PRIVILEGES ON orthodox_metrics.* TO \'orthodoxapps\'@\'localhost\';');
    console.log('FLUSH PRIVILEGES;');
    console.log('');
    console.log('-- Or if user exists but password is wrong:');
    console.log('ALTER USER \'orthodoxapps\'@\'localhost\' IDENTIFIED BY \'Summerof1982@!\';');
    console.log('FLUSH PRIVILEGES;');
}

// Run the diagnostic
if (require.main === module) {
    checkDatabaseConnection().catch(console.error);
}

module.exports = { checkDatabaseConnection };
