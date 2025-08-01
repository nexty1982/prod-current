// Quick test with working URLs only
const ChurchDirectoryBuilder = require('./index');
const path = require('path');

async function testWorkingScrapers() {
    console.log('🧪 Testing Scrapers with Conservative Settings...\n');
    
    const options = {
        outputDir: path.join(__dirname, '../data/test-working-churches'),
        logLevel: 'info',
        maxConcurrentScrapers: 1, // Very conservative
        validateUrls: false,
        enableDuplicateDetection: false,
        saveToDatabase: true,
        databaseConfig: {
            host: 'localhost',
            user: 'orthodoxapps',
            password: 'Summerof1982@!',
            database: 'orthodoxmetrics'
        }
    };
    
    try {
        console.log('🚀 Testing with conservative settings...');
        console.log('- Concurrent scrapers: 1');
        console.log('- URL validation: disabled');
        console.log('- Duplicate detection: disabled');
        console.log('- Database save: enabled');
        console.log('');
        
        const builder = new ChurchDirectoryBuilder(options);
        const results = await builder.runAutonomousScraping();
        
        console.log('\n✅ Test Results:');
        console.log(`📊 Total Churches Found: ${results.statistics.totalChurches}`);
        console.log(`⚠️  Total Errors: ${results.errors.length}`);
        
        if (results.statistics.totalChurches > 0) {
            console.log('\n🎉 SUCCESS: Found some church data!');
            console.log('\n📈 By Jurisdiction:');
            for (const [jurisdiction, count] of Object.entries(results.statistics.jurisdictionCounts)) {
                if (count > 0) {
                    console.log(`   ✅ ${jurisdiction}: ${count} churches`);
                } else {
                    console.log(`   ❌ ${jurisdiction}: ${count} churches`);
                }
            }
        } else {
            console.log('\n⚠️  No churches found - all scrapers failed');
        }
        
        if (results.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            results.errors.slice(0, 5).forEach((error, i) => {
                console.log(`   ${i + 1}. ${error.jurisdiction}: ${error.error}`);
            });
            if (results.errors.length > 5) {
                console.log(`   ... and ${results.errors.length - 5} more errors`);
            }
        }
        
        console.log(`\n📁 Results saved to: ${options.outputDir}`);
        return results;
        
    } catch (error) {
        console.error('❌ Test failed completely:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testWorkingScrapers().catch(console.error);
}

module.exports = testWorkingScrapers;
