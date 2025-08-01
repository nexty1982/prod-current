// 📁 server/scrapers/cli.js
// Command-line interface for running the church directory scraper

const ChurchDirectoryBuilder = require('./index');
const path = require('path');
const fs = require('fs').promises;

class ScraperCLI {
    constructor() {
        this.defaultOptions = {
            outputDir: path.join(__dirname, '../data/churches'),
            logLevel: 'info',
            maxConcurrentScrapers: 3,
            validateUrls: true,
            enableDuplicateDetection: true
        };
    }

    async run(args = []) {
        const options = this.parseArguments(args);
        
        console.log('🚀 Starting Orthodox Church Directory Builder...');
        console.log('Configuration:', options);
        
        try {
            const builder = new ChurchDirectoryBuilder(options);
            const results = await builder.runAutonomousScraping();
            
            console.log('\n✅ Scraping completed successfully!');
            console.log('📊 Results Summary:');
            console.log(`   Total Churches: ${results.statistics.totalChurches}`);
            console.log(`   Validated URLs: ${results.statistics.validatedUrls}`);
            console.log(`   Duplicates Found: ${results.statistics.duplicatesFound}`);
            console.log(`   Errors: ${results.errors.length}`);
            
            console.log('\n📈 Jurisdiction Breakdown:');
            for (const [jurisdiction, count] of Object.entries(results.statistics.jurisdictionCounts)) {
                console.log(`   ${jurisdiction}: ${count} churches`);
            }
            
            if (results.errors.length > 0) {
                console.log('\n⚠️  Errors encountered:');
                results.errors.forEach(error => {
                    console.log(`   ${error.jurisdiction}: ${error.error}`);
                });
            }
            
            console.log(`\n📁 Results saved to: ${options.outputDir}`);
            
            return results;
            
        } catch (error) {
            console.error('❌ Fatal error during scraping:', error.message);
            process.exit(1);
        }
    }

    parseArguments(args) {
        const options = { ...this.defaultOptions };
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--output':
                case '-o':
                    options.outputDir = args[++i];
                    break;
                    
                case '--log-level':
                case '-l':
                    options.logLevel = args[++i];
                    break;
                    
                case '--concurrent':
                case '-c':
                    options.maxConcurrentScrapers = parseInt(args[++i]);
                    break;
                    
                case '--no-validate-urls':
                    options.validateUrls = false;
                    break;
                    
                case '--no-duplicate-detection':
                    options.enableDuplicateDetection = false;
                    break;
                    
                case '--help':
                case '-h':
                    this.printHelp();
                    process.exit(0);
                    break;
                    
                default:
                    if (arg.startsWith('--')) {
                        console.warn(`Unknown option: ${arg}`);
                    }
            }
        }
        
        return options;
    }

    printHelp() {
        console.log(`
Orthodox Church Directory Builder CLI

Usage: node cli.js [options]

Options:
  -o, --output <dir>           Output directory for results (default: ../data/churches)
  -l, --log-level <level>      Log level: error, warn, info, debug (default: info)
  -c, --concurrent <num>       Max concurrent scrapers (default: 3)
  --no-validate-urls           Skip URL validation
  --no-duplicate-detection     Skip duplicate detection
  -h, --help                   Show this help message

Examples:
  node cli.js                                    # Run with default settings
  node cli.js -o /custom/output -l debug        # Custom output and debug logging
  node cli.js --no-validate-urls -c 5           # Skip URL validation, use 5 concurrent scrapers
        `);
    }
}

// Run CLI if this file is executed directly
if (require.main === module) {
    const cli = new ScraperCLI();
    cli.run(process.argv.slice(2));
}

module.exports = ScraperCLI;
