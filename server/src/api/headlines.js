const { getAppPool } = require('../../config/db-compat');
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db-compat');
const { requireAuth } = require('../middleware/auth');
const { headlinesCache } = require('../utils/headlineCache');

// GET /api/headlines - Get Orthodox news headlines
router.get('/', requireAuth, async (req, res) => {
    try {
        const { 
            source = null, 
            lang = 'en', 
            limit = 20, 
            offset = 0 
        } = req.query;

        console.log(`📰 Fetching Orthodox headlines - Source: ${source}, Lang: ${lang}, Limit: ${limit}`);

        // Use caching for better performance
        const cacheKey = { source, lang, limit: parseInt(limit), offset: parseInt(offset) };
        
        const result = await headlinesCache.cacheHeadlines(cacheKey, async () => {
            // Build dynamic query based on filters
        let query = `
            SELECT 
                id,
                source,
                title,
                summary,
                image_url,
                url,
                language,
                published_at,
                created_at
            FROM news_headlines
            WHERE 1=1
        `;

        const params = [];

        // Filter by source if specified
        if (source && source !== 'all') {
            query += ' AND source = ?';
            params.push(source);
        }

        // Filter by language if specified
        if (lang && lang !== 'all') {
            query += ' AND language = ?';
            params.push(lang);
        }

        // Order by publication date (newest first)
        query += ' ORDER BY published_at DESC, created_at DESC';

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [headlines] = await getAppPool().query(query, params);

        // Get total count for pagination (with same filters)
        let countQuery = 'SELECT COUNT(*) as total FROM news_headlines WHERE 1=1';
        const countParams = [];

        if (source && source !== 'all') {
            countQuery += ' AND source = ?';
            countParams.push(source);
        }

        if (lang && lang !== 'all') {
            countQuery += ' AND language = ?';
            countParams.push(lang);
        }

        const [countResult] = await getAppPool().query(countQuery, countParams);
        const total = countResult[0].total;

        // Add computed fields for frontend
        const enrichedHeadlines = headlines.map(headline => ({
            ...headline,
            isNew: isWithin24Hours(headline.published_at),
            timeAgo: getTimeAgo(headline.published_at),
            hasImage: !!headline.image_url
        }));

            console.log(`✅ Found ${headlines.length} headlines (${total} total)`);

            return {
                success: true,
                headlines: enrichedHeadlines,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + headlines.length < total
                },
                filters: {
                    source: source || 'all',
                    language: lang || 'en'
                },
                lastUpdated: new Date().toISOString()
            };
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error fetching Orthodox headlines:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Orthodox headlines',
            error: error.message
        });
    }
});

// GET /api/headlines/sources - Get available news sources
router.get('/sources', requireAuth, async (req, res) => {
    try {
        const [sources] = await getAppPool().query(`
            SELECT 
                source,
                COUNT(*) as article_count,
                MAX(published_at) as latest_article
            FROM news_headlines 
            GROUP BY source 
            ORDER BY article_count DESC, source ASC
        `);

        console.log(`📋 Found ${sources.length} Orthodox news sources`);

        res.json({
            success: true,
            sources: sources.map(src => ({
                name: src.source,
                label: formatSourceLabel(src.source),
                articleCount: src.article_count,
                latestArticle: src.latest_article,
                isActive: isWithin24Hours(src.latest_article)
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching news sources:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news sources',
            error: error.message
        });
    }
});

// GET /api/headlines/languages - Get available languages
router.get('/languages', requireAuth, async (req, res) => {
    try {
        const [languages] = await getAppPool().query(`
            SELECT 
                language,
                COUNT(*) as article_count
            FROM orthodox_headlines 
            GROUP BY language 
            ORDER BY article_count DESC
        `);

        console.log(`🌐 Found ${languages.length} languages in headlines`);

        res.json({
            success: true,
            languages: languages.map(lang => ({
                code: lang.language,
                label: getLanguageLabel(lang.language),
                articleCount: lang.article_count
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching languages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch languages',
            error: error.message
        });
    }
});

// Helper Functions

/**
 * Check if a date is within the last 24 hours
 */
function isWithin24Hours(date) {
    if (!date) return false;
    const now = new Date();
    const checkDate = new Date(date);
    const diffHours = (now - checkDate) / (1000 * 60 * 60);
    return diffHours <= 24;
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
        return past.toLocaleDateString();
    }
}

/**
 * Format source name for display
 */
function formatSourceLabel(sourceName) {
    const sourceLabels = {
        'GOARCH': 'Greek Orthodox Archdiocese',
        'OCA': 'Orthodox Church in America',
        'ANTIOCH': 'Antiochian Orthodox',
        'SERBIAN': 'Serbian Orthodox Church',
        'RUSSIAN': 'Russian Orthodox Church',
        'ROMANIAN': 'Romanian Orthodox Church',
        'COPTIC': 'Coptic Orthodox Church',
        'ETHIOPIAN': 'Ethiopian Orthodox Church',
        'ORTHODOX_TIMES': 'Orthodox Times',
        'PRAVOSLAVIE': 'Pravoslavie.ru',
        'PEMPTOUSIA': 'Pemptousia'
    };
    
    return sourceLabels[sourceName] || sourceName;
}

/**
 * Get language display label
 */
function getLanguageLabel(langCode) {
    const languageLabels = {
        'en': 'English',
        'el': 'Greek',
        'ru': 'Russian',
        'sr': 'Serbian',
        'ro': 'Romanian',
        'ar': 'Arabic',
        'am': 'Amharic',
        'bg': 'Bulgarian',
        'mk': 'Macedonian'
    };
    
    return languageLabels[langCode] || langCode.toUpperCase();
}

module.exports = router; 