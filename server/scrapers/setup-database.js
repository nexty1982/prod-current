// 📁 server/scrapers/setup-database.js
// Database setup script for Orthodox Church Directory

require('dotenv').config();
const ChurchDatabase = require('./database/church-database');

async function setupDatabase() {
    console.log('🗄️  Setting up Orthodox Church Directory database...\n');
    
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'orthodoxmetrics'
    };
    
    console.log('Database Configuration:');
    console.log(`- Host: ${dbConfig.host}`);
    console.log(`- User: ${dbConfig.user}`);
    console.log(`- Database: ${dbConfig.database}`);
    console.log('');
    
    try {
        const database = new ChurchDatabase({ ...dbConfig });
        
        console.log('Connecting to database...');
        await database.initialize();
        
        console.log('✅ Database setup completed successfully!');
        console.log('');
        console.log('Tables created:');
        console.log('- orthodox_churches');
        console.log('- scraping_sessions');
        console.log('- scraping_errors');
        console.log('- url_validations');
        console.log('- duplicate_groups');
        console.log('');
        console.log('Views created:');
        console.log('- v_churches_by_jurisdiction');
        console.log('- v_churches_by_state');
        console.log('- v_recent_scraping_activity');
        console.log('');
        console.log('Stored procedures created:');
        console.log('- GetChurchesByJurisdiction');
        console.log('- GetChurchesByLocation');
        console.log('- SearchChurches');
        console.log('- GetScrapingStatistics');
        
        await database.close();
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

// Verify database connection
async function verifyConnection() {
    console.log('🔍 Verifying database connection...\n');
    
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'orthodoxmetrics'
    };
    
    try {
        const database = new ChurchDatabase({ ...dbConfig });
        await database.initialize();
        
        // Test basic queries
        const stats = await database.getStatistics();
        console.log('📊 Current Statistics:');
        console.log(`- Total Churches: ${stats.overall.total_churches}`);
        console.log(`- Total Jurisdictions: ${stats.overall.total_jurisdictions}`);
        console.log(`- Churches with Websites: ${stats.overall.churches_with_websites}`);
        
        if (stats.byJurisdiction.length > 0) {
            console.log('\n📈 By Jurisdiction:');
            stats.byJurisdiction.forEach(j => {
                console.log(`   ${j.jurisdiction}: ${j.count}`);
            });
        }
        
        await database.close();
        console.log('\n✅ Database connection verified!');
        
    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
        process.exit(1);
    }
}

// Reset database (WARNING: This will delete all data)
async function resetDatabase() {
    console.log('⚠️  WARNING: This will delete all Orthodox Church Directory data!');
    console.log('Type "CONFIRM" to proceed: ');
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        readline.question('', async (answer) => {
            readline.close();
            
            if (answer !== 'CONFIRM') {
                console.log('Reset cancelled.');
                return resolve();
            }
            
            try {
                const dbConfig = {
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_NAME || 'orthodoxmetrics'
                };
                
                const database = new ChurchDatabase({ ...dbConfig });
                await database.initialize();
                
                // Drop all tables
                const dropTables = [
                    'DROP VIEW IF EXISTS v_recent_scraping_activity',
                    'DROP VIEW IF EXISTS v_churches_by_state',
                    'DROP VIEW IF EXISTS v_churches_by_jurisdiction',
                    'DROP TABLE IF EXISTS duplicate_groups',
                    'DROP TABLE IF EXISTS url_validations',
                    'DROP TABLE IF EXISTS scraping_errors',
                    'DROP TABLE IF EXISTS scraping_sessions',
                    'DROP TABLE IF EXISTS orthodox_churches'
                ];
                
                for (const sql of dropTables) {
                    await database.pool.execute(sql);
                }
                
                console.log('🗑️  All tables dropped.');
                
                // Recreate schema
                await database.createSchema();
                console.log('✅ Database reset completed!');
                
                await database.close();
                
            } catch (error) {
                console.error('❌ Database reset failed:', error.message);
                process.exit(1);
            }
            
            resolve();
        });
    });
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--verify')) {
        verifyConnection();
    } else if (args.includes('--reset')) {
        resetDatabase();
    } else {
        console.log('Usage:');
        console.log('  node setup-database.js          # Setup database schema');
        console.log('  node setup-database.js --verify # Verify connection and show stats');
        console.log('  node setup-database.js --reset  # Reset database (WARNING: deletes all data)');
        console.log('');
        setupDatabase();
    }
}

module.exports = { setupDatabase, verifyConnection, resetDatabase };
