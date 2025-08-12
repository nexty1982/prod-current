#!/usr/bin/env node
/**
 * Orthodox Headlines Management Script
 * Provides tools for monitoring, testing, and managing the headlines aggregation system
 */

const { promisePool } = require('../../config/db');
const { fetchAllHeadlines, CONFIG, NEWS_SOURCES } = require('../cron/fetch-headlines');
const { headlinesCache } = require('../utils/headlineCache');

// Command line colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

/**
 * Show system status
 */
async function showStatus() {
    log.title('\n📊 Orthodox Headlines System Status');
    log.title('=====================================');

    try {
        // Database statistics
        const [stats] = await promisePool.execute(`
            SELECT 
                COUNT(*) as total_articles,
                COUNT(DISTINCT source_name) as unique_sources,
                COUNT(DISTINCT language) as languages,
                MIN(pub_date) as oldest_article,
                MAX(pub_date) as newest_article,
                COUNT(CASE WHEN pub_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as recent_articles
            FROM orthodox_headlines
        `);

        const stat = stats[0];
        
        log.info(`📰 Total Articles: ${stat.total_articles}`);
        log.info(`🗞️ Unique Sources: ${stat.unique_sources}`);
        log.info(`🌐 Languages: ${stat.languages}`);
        log.info(`📅 Date Range: ${stat.oldest_article} to ${stat.newest_article}`);
        log.info(`🆕 Recent (24h): ${stat.recent_articles}`);

        // Source breakdown
        const [sources] = await promisePool.execute(`
            SELECT 
                source_name,
                COUNT(*) as article_count,
                MAX(pub_date) as latest_article,
                MIN(pub_date) as earliest_article
            FROM orthodox_headlines 
            GROUP BY source_name 
            ORDER BY article_count DESC
        `);

        log.title('\n📋 Articles by Source:');
        sources.forEach(source => {
            const status = new Date(source.latest_article) > new Date(Date.now() - 24*60*60*1000) ? '🟢' : '🟡';
            log.info(`  ${status} ${source.source_name}: ${source.article_count} articles (latest: ${source.latest_article})`);
        });

        // Language breakdown
        const [languages] = await promisePool.execute(`
            SELECT 
                language,
                COUNT(*) as article_count
            FROM orthodox_headlines 
            GROUP BY language 
            ORDER BY article_count DESC
        `);

        log.title('\n🌍 Articles by Language:');
        languages.forEach(lang => {
            log.info(`  ${lang.language}: ${lang.article_count} articles`);
        });

        // Cache statistics
        const cacheStats = headlinesCache.getStats();
        log.title('\n💾 Cache Statistics:');
        log.info(`  Hit Rate: ${cacheStats.hitRate}`);
        log.info(`  Total Hits: ${cacheStats.hits}`);
        log.info(`  Total Misses: ${cacheStats.misses}`);
        log.info(`  Memory Keys: ${cacheStats.memoryKeys}`);
        log.info(`  Redis Connected: ${cacheStats.redisConnected}`);

        // Configuration
        log.title('\n⚙️ Configuration:');
        log.info(`  Max Articles per Source: ${CONFIG.MAX_ARTICLES_PER_SOURCE}`);
        log.info(`  Article Expiry: ${CONFIG.ARTICLE_EXPIRY_DAYS} days`);
        log.info(`  Auto Translation: ${CONFIG.ENABLE_AUTO_TRANSLATION}`);
        log.info(`  Caching: ${CONFIG.ENABLE_CACHING}`);
        log.info(`  Sources Enabled: ${NEWS_SOURCES.filter(s => s.enabled).length}/${NEWS_SOURCES.length}`);

    } catch (error) {
        log.error(`Database error: ${error.message}`);
    }
}

/**
 * Test all news sources
 */
async function testSources() {
    log.title('\n🧪 Testing All News Sources');
    log.title('==============================');

    const { fetchRSSFeed, scrapeHTML } = require('../cron/fetch-headlines');
    
    for (const source of NEWS_SOURCES) {
        if (!source.enabled) {
            log.warning(`Skipping disabled source: ${source.name}`);
            continue;
        }

        try {
            log.info(`Testing ${source.name} (${source.type})...`);
            
            let articles = [];
            const startTime = Date.now();
            
            if (source.type === 'rss') {
                articles = await fetchRSSFeed(source);
            } else if (source.type === 'html') {
                articles = await scrapeHTML(source);
            }
            
            const duration = Date.now() - startTime;
            
            if (articles.length > 0) {
                log.success(`${source.name}: ${articles.length} articles (${duration}ms)`);
                log.info(`  Latest: ${articles[0].title.substring(0, 60)}...`);
            } else {
                log.warning(`${source.name}: No articles found`);
            }
            
        } catch (error) {
            log.error(`${source.name}: ${error.message}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

/**
 * Clean database
 */
async function cleanDatabase() {
    log.title('\n🧹 Database Cleanup');
    log.title('==================');

    try {
        // Remove duplicates
        log.info('Removing duplicate articles...');
        const [duplicates] = await promisePool.execute(`
            DELETE h1 FROM orthodox_headlines h1
            INNER JOIN orthodox_headlines h2 
            WHERE h1.id > h2.id 
            AND h1.article_url = h2.article_url
        `);
        log.success(`Removed ${duplicates.affectedRows} duplicate articles`);

        // Remove old articles
        log.info(`Removing articles older than ${CONFIG.ARTICLE_EXPIRY_DAYS} days...`);
        const [old] = await promisePool.execute(`
            DELETE FROM orthodox_headlines 
            WHERE pub_date < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [CONFIG.ARTICLE_EXPIRY_DAYS]);
        log.success(`Removed ${old.affectedRows} old articles`);

        // Remove articles with broken URLs
        log.info('Checking for articles with broken URLs...');
        // This would require HTTP requests, so we'll skip for now
        log.info('URL validation skipped (would require HTTP requests)');

        // Clear cache
        log.info('Clearing cache...');
        await headlinesCache.clearAll();
        log.success('Cache cleared');

    } catch (error) {
        log.error(`Cleanup error: ${error.message}`);
    }
}

/**
 * Export database
 */
async function exportDatabase() {
    log.title('\n📤 Database Export');
    log.title('==================');

    try {
        const [articles] = await promisePool.execute(`
            SELECT * FROM orthodox_headlines 
            ORDER BY pub_date DESC
        `);

        const filename = `headlines-export-${new Date().toISOString().split('T')[0]}.json`;
        const fs = require('fs');
        
        fs.writeFileSync(filename, JSON.stringify(articles, null, 2));
        log.success(`Exported ${articles.length} articles to ${filename}`);

    } catch (error) {
        log.error(`Export error: ${error.message}`);
    }
}

/**
 * Import test data
 */
async function importTestData() {
    log.title('\n📥 Import Test Data');
    log.title('==================');

    try {
        // Run the schema file to create sample data
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../database/orthodox-headlines-schema.sql');
        
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Extract only the INSERT statements
            const insertStatements = schema.split('\n')
                .filter(line => line.trim().startsWith('INSERT INTO orthodox_headlines'))
                .join('\n');
            
            if (insertStatements) {
                await promisePool.execute(insertStatements);
                log.success('Test data imported successfully');
            } else {
                log.warning('No INSERT statements found in schema file');
            }
        } else {
            log.error('Schema file not found');
        }

    } catch (error) {
        log.error(`Import error: ${error.message}`);
    }
}

/**
 * Monitor live aggregation
 */
async function monitorLive() {
    log.title('\n👁️ Live Monitoring Mode');
    log.title('=======================');
    log.info('Press Ctrl+C to stop monitoring');

    let lastCount = 0;
    
    const monitor = setInterval(async () => {
        try {
            const [result] = await promisePool.execute('SELECT COUNT(*) as count FROM orthodox_headlines');
            const currentCount = result[0].count;
            
            if (currentCount !== lastCount) {
                const change = currentCount - lastCount;
                log.success(`Article count changed: ${lastCount} → ${currentCount} (${change > 0 ? '+' : ''}${change})`);
                lastCount = currentCount;
            }
            
            // Show timestamp
            process.stdout.write(`\r${new Date().toISOString()} - Articles: ${currentCount}`);
            
        } catch (error) {
            log.error(`Monitoring error: ${error.message}`);
        }
    }, 5000); // Check every 5 seconds

    process.on('SIGINT', () => {
        clearInterval(monitor);
        console.log('\n👋 Monitoring stopped');
        process.exit(0);
    });
}

/**
 * Show help
 */
function showHelp() {
    log.title('\n📚 Orthodox Headlines Management Tool');
    log.title('====================================');
    console.log(`
${colors.bright}Commands:${colors.reset}
  ${colors.green}status${colors.reset}      Show system status and statistics
  ${colors.green}test${colors.reset}        Test all news sources
  ${colors.green}fetch${colors.reset}       Run headline aggregation once
  ${colors.green}clean${colors.reset}       Clean database (remove duplicates and old articles)
  ${colors.green}export${colors.reset}      Export database to JSON file
  ${colors.green}import${colors.reset}      Import test data
  ${colors.green}monitor${colors.reset}     Live monitoring mode
  ${colors.green}cache${colors.reset}       Cache management
  ${colors.green}help${colors.reset}        Show this help

${colors.bright}Examples:${colors.reset}
  node headlines-management.js status
  node headlines-management.js test
  node headlines-management.js fetch
  node headlines-management.js clean
    `);
}

/**
 * Cache management
 */
async function manageCache() {
    const command = process.argv[3];
    
    switch (command) {
        case 'stats':
            log.title('\n💾 Cache Statistics');
            console.log(JSON.stringify(headlinesCache.getStats(), null, 2));
            break;
            
        case 'clear':
            log.info('Clearing cache...');
            await headlinesCache.clearAll();
            log.success('Cache cleared');
            break;
            
        case 'warm':
            log.info('Warming up cache...');
            // This would need the data loader function
            log.warning('Cache warm-up not implemented in management script');
            break;
            
        default:
            log.info('Cache commands: stats, clear, warm');
    }
}

/**
 * Main function
 */
async function main() {
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'status':
                await showStatus();
                break;
                
            case 'test':
                await testSources();
                break;
                
            case 'fetch':
                await fetchAllHeadlines();
                break;
                
            case 'clean':
                await cleanDatabase();
                break;
                
            case 'export':
                await exportDatabase();
                break;
                
            case 'import':
                await importTestData();
                break;
                
            case 'monitor':
                await monitorLive();
                break;
                
            case 'cache':
                await manageCache();
                break;
                
            case 'help':
            default:
                showHelp();
                break;
        }
    } catch (error) {
        log.error(`Command failed: ${error.message}`);
        process.exit(1);
    } finally {
        await headlinesCache.close();
        await promisePool.end();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    showStatus,
    testSources,
    cleanDatabase,
    exportDatabase,
    importTestData
}; 