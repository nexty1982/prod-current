#!/usr/bin/env node
/**
 * Verify Orthodox Headlines Setup
 * Checks if all components are working together
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
        
        console.log('\n🔐 Database Connection for Verification');
        console.log('======================================');
        
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
 * Verify database setup
 */
async function verifyDatabase(credentials) {
    let connection = null;
    
    try {
        console.log('\n🔍 Verifying Database Setup...');
        console.log('================================');
        
        // Create connection
        connection = await mysql.createConnection({
            host: credentials.host,
            port: credentials.port,
            user: credentials.user,
            password: credentials.password,
            database: credentials.database,
            charset: 'utf8mb4'
        });
        
        console.log('✅ Database connection successful');
        
        // Check for headlines tables
        const requiredTables = ['headlines_sources', 'headlines_categories', 'headlines_config', 'news_headlines'];
        const existingTables = [];
        
        for (const table of requiredTables) {
            const [tables] = await connection.execute(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ? AND table_name = ?
            `, [credentials.database, table]);
            
            if (tables.length > 0) {
                existingTables.push(table);
                console.log(`✅ Table ${table} exists`);
            } else {
                console.log(`❌ Table ${table} missing`);
            }
        }
        
        if (existingTables.length === requiredTables.length) {
            console.log('✅ All required tables present');
            
            // Check for sample data
            const [sources] = await connection.execute('SELECT COUNT(*) as count FROM headlines_sources');
            const [categories] = await connection.execute('SELECT COUNT(*) as count FROM headlines_categories');
            
            console.log(`📊 Headlines sources: ${sources[0].count}`);
            console.log(`📊 Headlines categories: ${categories[0].count}`);
            
            if (sources[0].count > 0 && categories[0].count > 0) {
                console.log('✅ Sample data is present');
                
                // Show some sample sources
                const [sampleSources] = await connection.execute(`
                    SELECT name, language, enabled FROM headlines_sources LIMIT 3
                `);
                
                console.log('\n📰 Sample Sources:');
                sampleSources.forEach(source => {
                    const status = source.enabled ? '✅' : '❌';
                    console.log(`   ${status} ${source.name} (${source.language})`);
                });
                
                return true;
            } else {
                console.log('⚠️ Tables exist but no sample data found');
                return false;
            }
        } else {
            console.log('❌ Some required tables are missing');
            console.log('\n💡 To create missing tables, run:');
            console.log('   mysql -u root -p orthodoxmetrics_db < server/database/headlines-config-schema.sql');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
        return false;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Test the fetch script integration
 */
async function testFetchScript() {
    console.log('\n🧪 Testing Fetch Script Integration...');
    console.log('======================================');
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
        const testProcess = spawn('node', ['scripts/fetch-headlines.js', '--test', '--use-db-config'], {
            cwd: process.cwd(),
            stdio: 'pipe'
        });
        
        let output = '';
        let errorOutput = '';
        
        testProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        testProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Fetch script test completed successfully');
                
                // Show sample output
                const lines = output.split('\n').slice(0, 10);
                console.log('\n📄 Sample Output:');
                lines.forEach(line => {
                    if (line.trim()) {
                        console.log(`   ${line.trim()}`);
                    }
                });
                resolve(true);
            } else {
                console.log('❌ Fetch script test failed');
                if (errorOutput) {
                    console.log('\n❗ Error Output:');
                    console.log(errorOutput.substring(0, 500));
                }
                resolve(false);
            }
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            testProcess.kill();
            console.log('⚠️ Fetch script test timed out');
            resolve(false);
        }, 30000);
    });
}

/**
 * Check web interface components
 */
async function checkWebInterface() {
    console.log('\n🌐 Checking Web Interface Components...');
    console.log('=======================================');
    
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
        '../front-end/src/components/headlines/HeadlineSourcePicker.tsx',
        '../routes/headlines-config.js',
        '../database/headlines-config-schema.sql'
    ];
    
    let allFilesExist = true;
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${path.basename(file)} exists`);
        } else {
            console.log(`❌ ${path.basename(file)} missing`);
            allFilesExist = false;
        }
    }
    
    if (allFilesExist) {
        console.log('✅ All web interface files present');
        return true;
    } else {
        console.log('❌ Some web interface files are missing');
        return false;
    }
}

/**
 * Main verification function
 */
async function main() {
    console.log('🗞️ Orthodox Headlines - System Verification');
    console.log('============================================');
    
    try {
        // Step 1: Check web interface files
        const webOk = await checkWebInterface();
        
        // Step 2: Check database
        const credentials = await promptCredentials();
        const dbOk = await verifyDatabase(credentials);
        
        // Step 3: Test fetch script (only if database is OK)
        let fetchOk = false;
        if (dbOk) {
            fetchOk = await testFetchScript();
        }
        
        // Summary
        console.log('\n📊 Verification Summary');
        console.log('=======================');
        console.log(`🌐 Web Interface: ${webOk ? '✅ OK' : '❌ Issues'}`);
        console.log(`🗄️ Database Setup: ${dbOk ? '✅ OK' : '❌ Issues'}`);
        console.log(`📰 Fetch Script: ${fetchOk ? '✅ OK' : '❌ Issues'}`);
        
        if (webOk && dbOk && fetchOk) {
            console.log('\n🎉 System Verification: ✅ ALL SYSTEMS GO!');
            console.log('🌐 Access your headlines configuration at:');
            console.log('   → /admin/headlines-config');
            console.log('\n🚀 Ready to aggregate Orthodox news!');
        } else {
            console.log('\n⚠️ System Verification: Issues detected');
            
            if (!dbOk) {
                console.log('\n💡 Database Issues:');
                console.log('   • Run: mysql -u root -p orthodoxmetrics_db < server/database/headlines-config-schema.sql');
                console.log('   • Verify database permissions');
            }
            
            if (!fetchOk && dbOk) {
                console.log('\n💡 Fetch Script Issues:');
                console.log('   • Check Node.js dependencies: npm install rss-parser axios cheerio');
                console.log('   • Verify network connectivity for RSS feeds');
            }
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
} 