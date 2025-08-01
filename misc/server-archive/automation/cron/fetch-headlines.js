#!/usr/bin/env node
/**
 * Orthodox Headlines News Aggregator
 * Fetches headlines from multiple Orthodox news sources every 6 hours
 * 
 * Sources:
 * - Orthodox Times (RSS)
 * - OrthoChristian (RSS)
 * - Basilica (RSS)
 * - OCA (HTML scrape)
 * - GOARCH (HTML scrape)
 * - Romfea (Greek RSS)
 * - Pravoslavie (Russian RSS)
 * - Serbian Orthodox Church
 * - Antiochian Archdiocese
 * - ROCOR
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { parseStringPromise } = require('xml2js');
const { promisePool } = require('../config/db');
const cron = require('node-cron');

// Configuration
const CONFIG = {
    // Run every 6 hours: "0 */6 * * *"
    CRON_SCHEDULE: '0 */6 * * *',
    MAX_ARTICLES_PER_SOURCE: 10,
    ARTICLE_EXPIRY_DAYS: 30,
    REQUEST_TIMEOUT: 30000,
    USER_AGENT: 'OrthodoxMetrics-NewsAggregator/1.0 (https://orthodoxmetrics.com)',
    ENABLE_AUTO_TRANSLATION: true,
    ENABLE_CACHING: true,
    CACHE_DURATION_HOURS: 6
};

// News sources configuration
const NEWS_SOURCES = [
    // RSS Sources
    {
        name: 'ORTHODOX_TIMES',
        type: 'rss',
        url: 'https://orthodoximes.com/feed/',
        language: 'en',
        enabled: true
    },
    {
        name: 'ORTHOCHRISTIAN',
        type: 'rss', 
        url: 'https://orthochristian.com/rss.xml',
        language: 'en',
        enabled: true
    },
    {
        name: 'BASILICA',
        type: 'rss',
        url: 'https://basilica.ro/en/feed/',
        language: 'en',
        enabled: true
    },
    {
        name: 'ROMFEA',
        type: 'rss',
        url: 'https://www.romfea.gr/rss.xml',
        language: 'el',
        enabled: true
    },
    {
        name: 'PRAVOSLAVIE',
        type: 'rss',
        url: 'https://pravoslavie.ru/news.xml',
        language: 'ru',
        enabled: true
    },
    {
        name: 'SERBIAN_NEWS',
        type: 'rss',
        url: 'https://www.spc.rs/sr/rss',
        language: 'sr',
        enabled: true
    },

    // HTML Scraping Sources
    {
        name: 'OCA',
        type: 'html',
        url: 'https://www.oca.org/news',
        language: 'en',
        enabled: true,
        selectors: {
            articles: '.news-item',
            title: '.news-title a',
            link: '.news-title a',
            summary: '.news-excerpt',
            date: '.news-date',
            image: '.news-image img'
        }
    },
    {
        name: 'GOARCH',
        type: 'html',
        url: 'https://www.goarch.org/news',
        language: 'en',
        enabled: true,
        selectors: {
            articles: '.article-item',
            title: '.article-title a',
            link: '.article-title a',
            summary: '.article-excerpt',
            date: '.article-date',
            image: '.article-image img'
        }
    },
    {
        name: 'ANTIOCH',
        type: 'html',
        url: 'https://www.antiochian.org/news',
        language: 'en',
        enabled: true,
        selectors: {
            articles: '.news-article',
            title: 'h3 a',
            link: 'h3 a',
            summary: '.article-summary',
            date: '.publish-date',
            image: '.article-thumb img'
        }
    },
    {
        name: 'ROCOR',
        type: 'html', 
        url: 'https://www.synod.com/synod/eng/news/',
        language: 'en',
        enabled: true,
        selectors: {
            articles: '.news-entry',
            title: '.news-title a',
            link: '.news-title a', 
            summary: '.news-content',
            date: '.news-date',
            image: '.news-img img'
        }
    }
];

/**
 * Main aggregation function
 */
async function fetchAllHeadlines() {
    console.log('🗞️ Starting Orthodox Headlines aggregation...');
    console.log(`📅 ${new Date().toISOString()}`);
    
    let totalFetched = 0;
    let totalSaved = 0;
    const results = [];

    for (const source of NEWS_SOURCES) {
        if (!source.enabled) {
            console.log(`⏭️ Skipping disabled source: ${source.name}`);
            continue;
        }

        try {
            console.log(`\n📰 Fetching from ${source.name} (${source.type})...`);
            
            let articles = [];
            if (source.type === 'rss') {
                articles = await fetchRSSFeed(source);
            } else if (source.type === 'html') {
                articles = await scrapeHTML(source);
            }

            console.log(`   Found ${articles.length} articles`);
            totalFetched += articles.length;

            // Save articles to database
            const saved = await saveArticles(articles, source.name);
            totalSaved += saved;
            
            results.push({
                source: source.name,
                fetched: articles.length,
                saved: saved,
                success: true
            });

            // Rate limiting - wait 2 seconds between sources
            await sleep(2000);

        } catch (error) {
            console.error(`❌ Error fetching from ${source.name}:`, error.message);
            results.push({
                source: source.name,
                fetched: 0,
                saved: 0,
                success: false,
                error: error.message
            });
        }
    }

    // Cleanup old articles
    await cleanupOldArticles();

    // Summary
    console.log('\n📊 Aggregation Summary:');
    console.log('========================');
    console.log(`🔍 Total articles fetched: ${totalFetched}`);
    console.log(`💾 Total articles saved: ${totalSaved}`);
    console.log(`✅ Successful sources: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed sources: ${results.filter(r => !r.success).length}`);
    
    // Detailed results
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.source}: ${result.saved}/${result.fetched} saved`);
        if (!result.success) {
            console.log(`      Error: ${result.error}`);
        }
    });

    console.log(`\n🕐 Next run scheduled in 6 hours`);
    return results;
}

/**
 * Fetch and parse RSS feed
 */
async function fetchRSSFeed(source) {
    const response = await axios.get(source.url, {
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
            'User-Agent': CONFIG.USER_AGENT,
            'Accept': 'application/rss+xml, application/xml, text/xml'
        }
    });

    const parsed = await parseStringPromise(response.data);
    const items = parsed.rss?.channel?.[0]?.item || parsed.feed?.entry || [];

    return items.slice(0, CONFIG.MAX_ARTICLES_PER_SOURCE).map(item => {
        // Handle different RSS formats
        const title = extractText(item.title);
        const description = extractText(item.description || item.summary);
        const link = extractText(item.link) || item.id?.[0];
        const pubDate = extractText(item.pubDate || item.published);
        
        // Extract image from enclosure or description
        let imageUrl = null;
        if (item.enclosure && item.enclosure[0] && item.enclosure[0].$.type?.startsWith('image/')) {
            imageUrl = item.enclosure[0].$.url;
        } else if (description) {
            const imgMatch = description.match(/<img[^>]+src="([^"]+)"/i);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }
        }

        return {
            title: cleanTitle(title),
            summary: cleanSummary(description),
            article_url: link,
            image_url: imageUrl,
            pub_date: parseDate(pubDate),
            language: source.language
        };
    }).filter(article => article.title && article.article_url);
}

/**
 * Scrape HTML website for news articles
 */
async function scrapeHTML(source) {
    const response = await axios.get(source.url, {
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
            'User-Agent': CONFIG.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $(source.selectors.articles).slice(0, CONFIG.MAX_ARTICLES_PER_SOURCE).each((i, elem) => {
        try {
            const $elem = $(elem);
            
            const title = $elem.find(source.selectors.title).text().trim();
            const link = $elem.find(source.selectors.link).attr('href');
            const summary = $elem.find(source.selectors.summary).text().trim();
            const dateText = $elem.find(source.selectors.date).text().trim();
            const imageUrl = $elem.find(source.selectors.image).attr('src');

            // Make relative URLs absolute
            const absoluteLink = link?.startsWith('http') ? link : new URL(link, source.url).href;
            const absoluteImageUrl = imageUrl?.startsWith('http') ? imageUrl : 
                imageUrl ? new URL(imageUrl, source.url).href : null;

            if (title && absoluteLink) {
                articles.push({
                    title: cleanTitle(title),
                    summary: cleanSummary(summary),
                    article_url: absoluteLink,
                    image_url: absoluteImageUrl,
                    pub_date: parseDate(dateText) || new Date(),
                    language: source.language
                });
            }
        } catch (error) {
            console.error(`Error parsing article ${i}:`, error.message);
        }
    });

    return articles;
}

/**
 * Save articles to database with duplicate detection
 */
async function saveArticles(articles, sourceName) {
    if (!articles.length) return 0;

    let savedCount = 0;

    for (const article of articles) {
        try {
            // Check for duplicates by URL or title
            const [existing] = await promisePool.execute(
                'SELECT id FROM orthodox_headlines WHERE article_url = ? OR (title = ? AND source_name = ?)',
                [article.article_url, article.title, sourceName]
            );

            if (existing.length > 0) {
                console.log(`   📋 Duplicate skipped: ${article.title.substring(0, 50)}...`);
                continue;
            }

            // Auto-translation tagging
            let language = article.language;
            if (CONFIG.ENABLE_AUTO_TRANSLATION && isNonEnglish(article.title)) {
                language = detectLanguage(article.title);
            }

            // Insert new article
            await promisePool.execute(`
                INSERT INTO orthodox_headlines 
                (source_name, title, summary, image_url, article_url, language, pub_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                sourceName,
                article.title.substring(0, 500), // Truncate to fit column
                article.summary ? article.summary.substring(0, 2000) : null,
                article.image_url,
                article.article_url,
                language,
                article.pub_date
            ]);

            savedCount++;
            console.log(`   💾 Saved: ${article.title.substring(0, 50)}...`);

        } catch (error) {
            console.error(`   ❌ Error saving article: ${error.message}`);
            console.error(`      Title: ${article.title}`);
        }
    }

    return savedCount;
}

/**
 * Clean up articles older than configured days
 */
async function cleanupOldArticles() {
    try {
        const [result] = await promisePool.execute(
            'DELETE FROM orthodox_headlines WHERE pub_date < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [CONFIG.ARTICLE_EXPIRY_DAYS]
        );

        if (result.affectedRows > 0) {
            console.log(`\n🧹 Cleaned up ${result.affectedRows} old articles`);
        }
    } catch (error) {
        console.error('❌ Error cleaning up old articles:', error.message);
    }
}

// Utility Functions

function extractText(field) {
    if (!field) return '';
    if (Array.isArray(field)) return field[0] || '';
    if (typeof field === 'object' && field._) return field._;
    return String(field);
}

function cleanTitle(title) {
    return title
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

function cleanSummary(summary) {
    if (!summary) return '';
    return summary
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\[.*?\]/g, '') // Remove brackets
        .trim()
        .substring(0, 500); // Limit length
}

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        // Try common Orthodox date formats
        const cleaned = dateStr.replace(/\s+/g, ' ').trim();
        const parsed = new Date(cleaned);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return date;
}

function isNonEnglish(text) {
    // Simple check for non-Latin scripts
    return /[^\u0000-\u007F]/.test(text);
}

function detectLanguage(text) {
    // Basic language detection
    if (/[α-ωΑ-Ω]/.test(text)) return 'el'; // Greek
    if (/[а-яА-Я]/.test(text)) return 'ru'; // Russian
    if (/[а-шљњћџА-ШЉЊЋЏ]/.test(text)) return 'sr'; // Serbian
    if (/[ăâîșțĂÂÎȘȚ]/.test(text)) return 'ro'; // Romanian
    return 'en'; // Default to English
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test function to run aggregation once
 */
async function testAggregation() {
    console.log('🧪 Running test aggregation...');
    try {
        await fetchAllHeadlines();
        console.log('✅ Test completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

/**
 * Start the cron job
 */
function startCronJob() {
    console.log('🚀 Starting Orthodox Headlines aggregation service...');
    console.log(`📅 Schedule: ${CONFIG.CRON_SCHEDULE} (every 6 hours)`);
    console.log(`🔗 Monitoring ${NEWS_SOURCES.filter(s => s.enabled).length} sources`);
    
    // Run immediately on startup
    console.log('\n🎬 Running initial aggregation...');
    fetchAllHeadlines().catch(error => {
        console.error('❌ Initial aggregation failed:', error);
    });

    // Schedule recurring runs
    cron.schedule(CONFIG.CRON_SCHEDULE, () => {
        console.log('\n⏰ Scheduled aggregation starting...');
        fetchAllHeadlines().catch(error => {
            console.error('❌ Scheduled aggregation failed:', error);
        });
    }, {
        scheduled: true,
        timezone: "UTC"
    });

    console.log('✅ Cron job started successfully');
    console.log('📊 Service is running... Press Ctrl+C to stop');
}

// Command line handling
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'test':
            testAggregation();
            break;
        case 'start':
        default:
            startCronJob();
            break;
    }
}

module.exports = {
    fetchAllHeadlines,
    startCronJob,
    testAggregation,
    CONFIG,
    NEWS_SOURCES
}; 