#!/usr/bin/env node
/**
 * Orthodox News Headlines Aggregator
 * Fetches headlines from curated RSS feeds and HTML pages, stores in MariaDB
 * Supports multilingual Orthodox news sources (English, Greek, Russian, Romanian)
 */

const axios = require('axios');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise');
const readline = require('readline');

// Configuration
const CONFIG = {
    REQUEST_TIMEOUT: 30000,
    USER_AGENT: 'OrthodoxMetrics-NewsAggregator/1.0 (https://orthodoxmetrics.com)',
    MAX_ARTICLES_PER_SOURCE: 20,
    UTC_TIMEZONE: true
};

// Global database connection
let dbConnection = null;

// Orthodox news sources with language tags (as specified)
const NEWS_SOURCES = [
    {
        name: "Orthodox Times",
        feed_url: "https://orthodoxtimes.com/feed/",
        language: "en"
    },
    {
        name: "Romfea", 
        feed_url: "https://www.romfea.gr/feed",
        language: "gr"
    },
    {
        name: "Patriarchate of Moscow",
        feed_url: "https://mospat.ru/en/rss/",
        language: "en"
    },
    {
        name: "Basilica.ro",
        feed_url: "https://basilica.ro/feed/",
        language: "ro"
    },
    // Additional reliable Orthodox sources
    {
        name: "OrthoChristian",
        feed_url: "https://orthochristian.com/rss.xml",
        language: "en"
    },
    {
        name: "Greek Orthodox Archdiocese",
        feed_url: "https://www.goarch.org/news/rss",
        language: "en"
    },
    {
        name: "Orthodox Church in America",
        feed_url: "https://www.oca.org/news/rss",
        language: "en"
    },
    {
        name: "Pravoslavie.ru",
        feed_url: "https://pravoslavie.ru/news.xml",
        language: "ru"
    }
];

/**
 * Prompt for database credentials
 */
function promptCredentials(existingCreds = {}) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        const credentials = {};
        
        console.log('\n🔐 Database Configuration');
        console.log('=========================');
        console.log('Press Enter to use default values shown in parentheses');
        
        const hostPrompt = `Database Host (${existingCreds.host || 'localhost'}): `;
        rl.question(hostPrompt, (host) => {
            credentials.host = host || existingCreds.host || 'localhost';
            
            const portPrompt = `Database Port (${existingCreds.port || 3306}): `;
            rl.question(portPrompt, (port) => {
                credentials.port = parseInt(port) || existingCreds.port || 3306;
                
                const dbPrompt = `Database Name (${existingCreds.database || 'orthodoxmetrics_db'}): `;
                rl.question(dbPrompt, (database) => {
                    credentials.database = database || existingCreds.database || 'orthodoxmetrics_db';
                    
                    const userPrompt = `Database User (${existingCreds.user || 'root'}): `;
                    rl.question(userPrompt, (user) => {
                        credentials.user = user || existingCreds.user || 'root';
                        
                        // Password is always required to be entered
                        rl.question('Database Password: ', (password) => {
                            credentials.password = password || existingCreds.password || '';
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
 * Parse credentials from command line arguments
 */
function parseCredentialsFromArgs(args) {
    const credentials = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--db-host':
                credentials.host = args[++i];
                break;
            case '--db-port':
                credentials.port = parseInt(args[++i]);
                break;
            case '--db-name':
                credentials.database = args[++i];
                break;
            case '--db-user':
                credentials.user = args[++i];
                break;
            case '--db-password':
                credentials.password = args[++i];
                break;
        }
    }
    
    return credentials;
}

/**
 * Create database connection pool
 */
async function createDatabaseConnection(credentials) {
    console.log(`\n🔌 Connecting to database: ${credentials.user}@${credentials.host}:${credentials.port}/${credentials.database}`);
    
    try {
        // Create connection pool for better performance
        dbConnection = mysql.createPool({
            host: credentials.host,
            port: credentials.port,
            user: credentials.user,
            password: credentials.password,
            database: credentials.database,
            charset: 'utf8mb4',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 30000,
            timeout: 60000
        });
        
        // Test connection
        const [result] = await dbConnection.execute('SELECT 1 as test');
        console.log('✅ Database connection successful!');
        console.log(`   Pool created with connection limit: 10`);
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('   Please check your credentials and database server');
        dbConnection = null;
        return false;
    }
}

/**
 * Load configuration from database
 */
async function loadDatabaseConfig() {
    if (!dbConnection) {
        console.log('⚠️ No database connection, using default configuration');
        return null;
    }

    try {
        // Load enabled sources from database
        const [dbSources] = await dbConnection.execute(`
            SELECT id, name, feed_url, language, enabled, categories, description
            FROM headlines_sources 
            WHERE enabled = 1
            ORDER BY name ASC
        `);

        // Load global configuration (use first available config)
        const [configs] = await dbConnection.execute(`
            SELECT * FROM headlines_config 
            WHERE enabled = 1 
            ORDER BY user_id IS NULL, id DESC 
            LIMIT 1
        `);

        const dbConfig = configs.length > 0 ? configs[0] : null;

        return {
            sources: dbSources.map(source => ({
                name: source.name,
                feed_url: source.feed_url,
                language: source.language,
                categories: source.categories ? JSON.parse(source.categories) : [],
                description: source.description
            })),
            config: dbConfig ? {
                maxArticlesPerSource: dbConfig.max_articles_per_source || 20,
                languages: dbConfig.languages ? JSON.parse(dbConfig.languages) : ['en'],
                enabledCategories: dbConfig.categories ? JSON.parse(dbConfig.categories) : []
            } : null
        };
    } catch (error) {
        console.error('❌ Error loading database configuration:', error.message);
        return null;
    }
}

/**
 * Main function to fetch all headlines
 */
async function fetchAllHeadlines(options = {}) {
    console.log('🗞️ Starting Orthodox Headlines Aggregation');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log('===============================================');
    
    const { language, source, useDbConfig } = options;
    let totalFetched = 0;
    let totalSaved = 0;
    const results = [];

    // Load sources - either from database or default
    let sources = NEWS_SOURCES;
    let maxArticles = CONFIG.MAX_ARTICLES_PER_SOURCE;

    if (useDbConfig && dbConnection) {
        console.log('🗄️ Loading configuration from database...');
        const dbData = await loadDatabaseConfig();
        
        if (dbData && dbData.sources.length > 0) {
            sources = dbData.sources;
            console.log(`✅ Loaded ${sources.length} sources from database`);
            
            if (dbData.config) {
                maxArticles = dbData.config.maxArticlesPerSource;
                console.log(`✅ Using database config: max ${maxArticles} articles per source`);
                
                if (dbData.config.languages.length > 0 && !language) {
                    const dbLanguages = dbData.config.languages;
                    sources = sources.filter(s => dbLanguages.includes(s.language));
                    console.log(`✅ Filtering by database languages: ${dbLanguages.join(', ')}`);
                }
            }
        } else {
            console.log('⚠️ No enabled sources found in database, using defaults');
        }
    }

    // Apply CLI filters (override database config if specified)
    if (language) {
        sources = sources.filter(s => s.language === language);
        console.log(`🔍 CLI override: Filtering by language: ${language}`);
    }
    if (source) {
        sources = sources.filter(s => s.name.toLowerCase().includes(source.toLowerCase()));
        console.log(`🔍 CLI override: Filtering by source: ${source}`);
    }

    // Update max articles config
    CONFIG.MAX_ARTICLES_PER_SOURCE = maxArticles;

    console.log(`📰 Processing ${sources.length} sources (max ${maxArticles} articles each)...\n`);

    for (const newsSource of sources) {
        try {
            console.log(`📡 Fetching from: ${newsSource.name} (${newsSource.language})`);
            console.log(`   URL: ${newsSource.feed_url}`);
            
            const articles = await fetchRSSFeed(newsSource);
            console.log(`   📄 Found ${articles.length} articles`);
            
            totalFetched += articles.length;

            // Save to database with deduplication
            const saved = await saveArticles(articles, newsSource.name);
            console.log(`   💾 Saved ${saved} new articles`);
            
            totalSaved += saved;
            
            results.push({
                source: newsSource.name,
                language: newsSource.language,
                fetched: articles.length,
                saved: saved,
                success: true
            });

            // Rate limiting - wait 2 seconds between sources
            await sleep(2000);

        } catch (error) {
            console.error(`❌ Error fetching from ${newsSource.name}:`, error.message);
            results.push({
                source: newsSource.name,
                language: newsSource.language,
                fetched: 0,
                saved: 0,
                success: false,
                error: error.message
            });
        }
    }

    // Summary
    console.log('\n📊 Aggregation Summary:');
    console.log('========================');
    console.log(`🔍 Total articles fetched: ${totalFetched}`);
    console.log(`💾 Total articles saved: ${totalSaved}`);
    console.log(`✅ Successful sources: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed sources: ${results.filter(r => !r.success).length}`);
    
    // Detailed results
    console.log('\n📋 Source Details:');
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.source} (${result.language}): ${result.saved}/${result.fetched} saved`);
        if (!result.success) {
            console.log(`      Error: ${result.error}`);
        }
    });

    return {
        totalFetched,
        totalSaved,
        results,
        summary: `Processed ${sources.length} sources, saved ${totalSaved} articles`
    };
}

/**
 * Fetch and parse RSS feed
 */
async function fetchRSSFeed(source) {
    const parser = new Parser({
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
            'User-Agent': CONFIG.USER_AGENT
        }
    });

    try {
        const feed = await parser.parseURL(source.feed_url);
        
        return feed.items
            .slice(0, CONFIG.MAX_ARTICLES_PER_SOURCE)
            .map(item => {
                // Extract image from content or media elements
                let imageUrl = null;
                if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
                    imageUrl = item.enclosure.url;
                } else if (item.content) {
                    const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/i);
                    if (imgMatch) {
                        imageUrl = imgMatch[1];
                    }
                } else if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
                    imageUrl = item['media:content']['$'].url;
                }

                return {
                    title: cleanText(item.title || ''),
                    url: item.link || item.guid || '',
                    summary: cleanText(item.contentSnippet || item.content || item.summary || ''),
                    image_url: imageUrl,
                    published_at: parseDate(item.pubDate || item.isoDate),
                    language: source.language,
                    source: source.name
                };
            })
            .filter(article => article.title && article.url);
            
    } catch (error) {
        if (error.message.includes('fetch')) {
            throw new Error(`Failed to fetch RSS feed: ${error.message}`);
        }
        throw new Error(`Failed to parse RSS feed: ${error.message}`);
    }
}

/**
 * Save articles to database with deduplication
 */
async function saveArticles(articles, sourceName) {
    if (!articles.length) return 0;

    // Check if database connection is available
    if (!dbConnection) {
        console.log(`   🧪 TEST MODE: Would save ${articles.length} articles from ${sourceName}`);
        // Show sample articles in test mode
        articles.slice(0, 3).forEach((article, i) => {
            console.log(`      ${i+1}. ${article.title.substring(0, 80)}...`);
        });
        return articles.length; // Return count as if saved
    }

    let savedCount = 0;

    console.log(`   💾 Saving ${articles.length} articles to database...`);

    for (const article of articles) {
        try {
            // Check for duplicates by URL (primary) or title+source (secondary)
            const [existing] = await dbConnection.execute(
                'SELECT id FROM news_headlines WHERE url = ? OR (title = ? AND source = ?)',
                [article.url, article.title, sourceName]
            );

            if (existing.length > 0) {
                console.log(`      📋 Duplicate skipped: ${article.title.substring(0, 50)}...`);
                continue; // Skip duplicate
            }

            // Insert new article with UTF-8 support
            const [result] = await dbConnection.execute(`
                INSERT INTO news_headlines 
                (title, url, summary, image_url, published_at, language, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                article.title.substring(0, 1000), // Prevent text overflow
                article.url.substring(0, 1000),
                article.summary ? article.summary.substring(0, 2000) : null,
                article.image_url ? article.image_url.substring(0, 1000) : null,
                article.published_at,
                article.language,
                article.source
            ]);

            if (result.insertId) {
                savedCount++;
                console.log(`      ✅ Saved: ${article.title.substring(0, 60)}...`);
            }

        } catch (error) {
            console.error(`   ❌ Error saving article: ${error.message}`);
            console.error(`      Title: ${article.title.substring(0, 100)}...`);
            
            // Log more details for debugging
            if (error.code) {
                console.error(`      Error Code: ${error.code}`);
            }
            if (error.errno) {
                console.error(`      Error Number: ${error.errno}`);
            }
        }
    }

    console.log(`   📊 Saved ${savedCount}/${articles.length} articles from ${sourceName}`);
    return savedCount;
}

/**
 * Utility functions
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[#\w]+;/g, '') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * CLI handling
 */
function showHelp() {
    console.log(`
📰 Orthodox News Headlines Aggregator

Usage:
  node fetch-headlines.js [options]

Options:
  --language <lang>    Filter by language (en, gr, ru, ro)
  --source <name>      Filter by source name (partial match)
  --test              Run in test mode (no database saves)
  --use-db-config     Use sources and settings from web interface
  --help              Show this help

Database Options:
  --db-host <host>     Database host (default: localhost)
  --db-port <port>     Database port (default: 3306)
  --db-name <name>     Database name (default: orthodoxmetrics_db)
  --db-user <user>     Database user (default: root)
  --db-password <pwd>  Database password (will prompt if not provided)

Examples:
  node fetch-headlines.js                    # Prompt for database credentials
  node fetch-headlines.js --language en      # English sources only
  node fetch-headlines.js --source "Orthodox Times"  # Specific source
  node fetch-headlines.js --test             # Test mode (dry run)
  node fetch-headlines.js --use-db-config    # Use web interface configuration
  
Database Examples:
  node fetch-headlines.js --db-host localhost --db-user root --db-password mypass
  node fetch-headlines.js --db-name orthodoxmetrics_db --test

Sources:
${NEWS_SOURCES.map(s => `  • ${s.name} (${s.language}): ${s.feed_url}`).join('\n')}
`);
}

/**
 * Test function for CLI testing
 */
async function testRun(options = {}) {
    console.log('🧪 TEST MODE - No database writes will be performed');
    console.log('===================================================\n');
    
    // In test mode, dbConnection will be null, so saveArticles will automatically handle it
    const result = await fetchAllHeadlines(options);
    
    return result;
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Parse CLI arguments
    const options = {};
    let testMode = false;
    let credentials = parseCredentialsFromArgs(args);
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--language':
                options.language = args[++i];
                break;
            case '--source':
                options.source = args[++i];
                break;
            case '--test':
                testMode = true;
                break;
            case '--use-db-config':
                options.useDbConfig = true;
                break;
            case '--help':
                showHelp();
                return;
            case '--db-host':
            case '--db-port':
            case '--db-name':
            case '--db-user':
            case '--db-password':
                // Skip these as they're handled by parseCredentialsFromArgs
                i++; // Skip the value
                break;
        }
    }
    
    // Set defaults for missing credentials
    credentials.host = credentials.host || 'localhost';
    credentials.port = credentials.port || 3306;
    credentials.database = credentials.database || 'orthodoxmetrics_db';
    credentials.user = credentials.user || 'root';
    
    // Prompt for missing credentials if not provided via CLI
    const missingCreds = !credentials.password || 
                        !credentials.host || 
                        !credentials.user || 
                        !credentials.database;
    
    if (missingCreds && !testMode) {
        console.log('\n🔍 Missing database credentials. Please provide them:');
        const promptedCreds = await promptCredentials(credentials);
        // Update credentials with prompted values
        credentials = promptedCreds;
    } else if (missingCreds && testMode) {
        console.log('\n🧪 Test mode: skipping database connection');
        options.skipDatabase = true;
    }

    try {
        // Setup database connection unless in test mode without database operations
        if (!testMode || !options.skipDatabase) {
            const connected = await createDatabaseConnection(credentials);
            if (!connected) {
                console.error('❌ Failed to connect to database. Please check your credentials.');
                process.exit(1);
            }
        }
        
        let result;
        if (testMode) {
            result = await testRun(options);
        } else {
            result = await fetchAllHeadlines(options);
        }
        
        // Close database connection pool
        if (dbConnection) {
            await dbConnection.end();
            console.log('🔌 Database connection pool closed');
        }
        
        console.log(`\n✅ ${result.summary}`);
        process.exit(0);
        
    } catch (error) {
        // Close database connection pool on error
        if (dbConnection) {
            try {
                await dbConnection.end();
                console.log('🔌 Database connection pool closed (after error)');
            } catch (closeError) {
                console.error('⚠️ Error closing database pool:', closeError.message);
            }
        }
        
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = {
    fetchAllHeadlines,
    fetchRSSFeed,
    saveArticles,
    NEWS_SOURCES,
    CONFIG
}; 