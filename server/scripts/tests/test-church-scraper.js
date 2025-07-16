// 📁 server/test-church-scraper.js
// Simple test script to verify church scraper setup

const ChurchDirectoryBuilder = require('./scrapers/index');

async function testChurchScraper() {
    try {
        console.log('🧪 Testing Church Directory Builder setup...');
        
        // Test with database disabled for initial testing
        const options = {
            saveToDatabase: false,
            logLevel: 'info',
            maxConcurrentScrapers: 1,
            validateUrls: false, // Skip URL validation for faster testing
            enableDuplicateDetection: false
        };
        
        const builder = new ChurchDirectoryBuilder(options);
        console.log('✅ ChurchDirectoryBuilder instantiated successfully');
        
        // Test logger
        builder.logger.info('Test logger message');
        console.log('✅ Logger working');
        
        // Test scrapers initialization
        console.log(`📋 Initialized ${builder.scrapers.length} jurisdiction scrapers:`);
        builder.scrapers.forEach(scraper => {
            console.log(`   - ${scraper.jurisdiction}`);
        });
        
        // Test utility modules
        console.log('🔧 Testing utility modules...');
        console.log(`   - URLValidator: ${builder.urlValidator ? '✅' : '❌'}`);
        console.log(`   - DataCleaner: ${builder.dataCleaner ? '✅' : '❌'}`);
        console.log(`   - DuplicateDetector: ${builder.duplicateDetector ? '✅' : '❌'}`);
        
        console.log('\n🎉 All church scraper components loaded successfully!');
        console.log('\n📝 To run the actual scraper:');
        console.log('   node scrapers/cli.js --help');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testChurchScraper();
