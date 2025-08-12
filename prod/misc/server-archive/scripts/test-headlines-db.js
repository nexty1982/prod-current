#!/usr/bin/env node
/**
 * Test Database Connection for Orthodox Headlines
 * Quick script to verify database setup and connection
 */

const mysql = require('mysql2/promise');
const readline = require('readline');

/**
 * Prompt for database credentials
 */
function promptCredentials() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        const credentials = {};
        
        console.log('\n🔐 Database Test Configuration');
        console.log('==============================');
        
        rl.question('Database Host (localhost): ', (host) => {
            credentials.host = host || 'localhost';
            
            rl.question('Database Port (3306): ', (port) => {
                credentials.port = parseInt(port) || 3306;
                
                rl.question('Database Name (orthodoxmetrics_db): ', (database) => {
                    credentials.database = database || 'orthodoxmetrics_db';
                    
                    rl.question('Database User (root): ', (user) => {
                        credentials.user = user || 'root';
                        
                        rl.question('Database Password: ', (password) => {
                            credentials.password = password;
                            rl.close();
                            resolve(credentials);
                        });
                    });
                });
            });
        });
    });
}

/**
 * Test database connection and schema
 */
async function testDatabase(credentials) {
    let connection = null;
    
    try {
        console.log('\n🔌 Testing Database Connection...');
        console.log(`   Host: ${credentials.host}:${credentials.port}`);
        console.log(`   Database: ${credentials.database}`);
        console.log(`   User: ${credentials.user}`);
        
        // Create connection
        connection = await mysql.createConnection({
            host: credentials.host,
            port: credentials.port,
            user: credentials.user,
            password: credentials.password,
            database: credentials.database,
            charset: 'utf8mb4'
        });
        
        console.log('✅ Database connection successful!');
        
        // Test basic query
        const [result1] = await connection.execute('SELECT 1 as test_connection');
        console.log('✅ Basic query test passed');
        
        // Check if news_headlines table exists
        const [tables] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = 'news_headlines'
        `, [credentials.database]);
        
        if (tables.length > 0) {
            console.log('✅ news_headlines table exists');
            
            // Get table structure
            const [columns] = await connection.execute('DESCRIBE news_headlines');
            console.log('\n📋 Table Structure:');
            columns.forEach(col => {
                console.log(`   • ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
            });
            
            // Count existing records
            const [count] = await connection.execute('SELECT COUNT(*) as total FROM news_headlines');
            console.log(`\n📊 Current records: ${count[0].total}`);
            
            // Test insert (dry run)
            console.log('\n🧪 Testing INSERT capability...');
            const testInsertSql = `
                INSERT INTO news_headlines 
                (title, url, summary, language, source, published_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const testValues = [
                'Test Headline - ' + new Date().toISOString(),
                'https://test.example.com/test-' + Date.now(),
                'This is a test summary',
                'en',
                'TEST_SOURCE',
                new Date()
            ];
            
            const [insertResult] = await connection.execute(testInsertSql, testValues);
            console.log(`✅ Test insert successful (ID: ${insertResult.insertId})`);
            
            // Clean up test record
            await connection.execute('DELETE FROM news_headlines WHERE id = ?', [insertResult.insertId]);
            console.log('✅ Test record cleaned up');
            
        } else {
            console.log('❌ news_headlines table does NOT exist');
            console.log('\n📋 To create the table, run:');
            console.log('   mysql -u root -p orthodoxmetrics_db < server/database/news-headlines-schema.sql');
        }
        
        console.log('\n🎉 Database test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Database test failed:', error.message);
        
        if (error.code) {
            console.error(`   Error Code: ${error.code}`);
        }
        if (error.errno) {
            console.error(`   Error Number: ${error.errno}`);
        }
        
        // Common error suggestions
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Suggestions:');
            console.error('   • Check username and password');
            console.error('   • Verify user has access to the database');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Suggestions:');
            console.error('   • Check if MySQL server is running');
            console.error('   • Verify host and port are correct');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\n💡 Suggestions:');
            console.error('   • Check if database exists');
            console.error('   • Create database: CREATE DATABASE orthodoxmetrics_db;');
        }
        
        return false;
        
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Connection closed');
        }
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🗞️ Orthodox Headlines - Database Connection Test');
        console.log('================================================');
        
        const credentials = await promptCredentials();
        const success = await testDatabase(credentials);
        
        if (success) {
            console.log('\n✅ Your database is ready for Orthodox Headlines!');
            console.log('\n🚀 Next steps:');
            console.log('   node scripts/fetch-headlines.js --test    # Test RSS feeds');
            console.log('   node scripts/fetch-headlines.js           # Run with database');
        } else {
            console.log('\n❌ Please fix the database issues and try again');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
} 