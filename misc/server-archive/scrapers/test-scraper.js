// 📁 server/scrapers/test-scraper.js
// Test script for the Orthodox Church Directory Builder

require('dotenv').config();
const ChurchDirectoryBuilder = require('./index');
const path = require('path');

async function runTest() {
    console.log('🧪 Testing Orthodox Church Directory Builder...\n');
    
    const options = {
        outputDir: path.join(__dirname, '../data/test-churches'),
        logLevel: 'info',
        maxConcurrentScrapers: 2, // Lower for testing
        validateUrls: false, // Skip URL validation for faster testing
        enableDuplicateDetection: true,
        saveToDatabase: true, // Test database integration
        databaseConfig: {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'orthodoxapps',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: process.env.DB_NAME || 'orthodoxmetrics'
        }
    };
    
    try {
        const builder = new ChurchDirectoryBuilder(options);
        
        console.log('Configuration:');
        console.log('- Output Directory:', options.outputDir);
        console.log('- Max Concurrent Scrapers:', options.maxConcurrentScrapers);
        console.log('- URL Validation:', options.validateUrls ? 'Enabled' : 'Disabled');
        console.log('- Duplicate Detection:', options.enableDuplicateDetection ? 'Enabled' : 'Disabled');
        console.log('- Database Save:', options.saveToDatabase ? 'Enabled' : 'Disabled');
        console.log('');
        
        const startTime = Date.now();
        const results = await builder.runAutonomousScraping();
        const duration = (Date.now() - startTime) / 1000;
        
        console.log('\n✅ Test completed successfully!');
        console.log('📊 Results Summary:');
        console.log(`   Duration: ${duration.toFixed(2)} seconds`);
        console.log(`   Total Churches: ${results.statistics.totalChurches}`);
        console.log(`   Validated URLs: ${results.statistics.validatedUrls}`);
        console.log(`   Duplicates Found: ${results.statistics.duplicatesFound}`);
        console.log(`   Errors: ${results.errors.length}`);
        console.log(`   Session ID: ${results.sessionId || 'N/A'}`);
        
        console.log('\n📈 Jurisdiction Breakdown:');
        for (const [jurisdiction, count] of Object.entries(results.statistics.jurisdictionCounts)) {
            console.log(`   ${jurisdiction}: ${count} churches`);
        }
        
        if (results.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.jurisdiction || error.type}: ${error.error}`);
            });
        }
        
        console.log(`\n📁 Results saved to: ${options.outputDir}`);
        
        // Show sample churches
        if (results.churches.length > 0) {
            console.log('\n📍 Sample Churches:');
            results.churches.slice(0, 3).forEach((church, index) => {
                console.log(`   ${index + 1}. ${church.name}`);
                console.log(`      Jurisdiction: ${church.jurisdiction}`);
                console.log(`      Location: ${church.city}, ${church.state}`);
                console.log(`      Website: ${church.website || 'N/A'}`);
                console.log('');
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Simple CLI argument parsing for test options
function parseTestArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--no-db':
                options.saveToDatabase = false;
                break;
            case '--validate-urls':
                options.validateUrls = true;
                break;
            case '--debug':
                options.logLevel = 'debug';
                break;
            case '--quick':
                options.maxConcurrentScrapers = 1;
                options.validateUrls = false;
                break;
        }
    }
    
    return options;
}

// Performance test
async function runPerformanceTest() {
    console.log('⚡ Running performance test...\n');
    
    const testOptions = [
        { name: 'Single Scraper', maxConcurrentScrapers: 1 },
        { name: 'Three Scrapers', maxConcurrentScrapers: 3 },
        { name: 'Five Scrapers', maxConcurrentScrapers: 5 }
    ];
    
    for (const testOption of testOptions) {
        const options = {
            outputDir: path.join(__dirname, `../data/perf-test-${testOption.maxConcurrentScrapers}`),
            logLevel: 'warn', // Reduce logging for performance test
            maxConcurrentScrapers: testOption.maxConcurrentScrapers,
            validateUrls: false,
            enableDuplicateDetection: false,
            saveToDatabase: false
        };
        
        const startTime = Date.now();
        const builder = new ChurchDirectoryBuilder(options);
        const results = await builder.runAutonomousScraping();
        const duration = (Date.now() - startTime) / 1000;
        
        console.log(`${testOption.name}: ${duration.toFixed(2)}s (${results.statistics.totalChurches} churches)`);
    }
}

// Memory usage test
function logMemoryUsage(label) {
    const usage = process.memoryUsage();
    console.log(`Memory Usage (${label}):`);
    console.log(`  RSS: ${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  External: ${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`);
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--performance')) {
        runPerformanceTest().catch(console.error);
    } else {
        logMemoryUsage('Initial');
        runTest().then(() => {
            logMemoryUsage('Final');
        }).catch(console.error);
    }
}

module.exports = { runTest, runPerformanceTest };
