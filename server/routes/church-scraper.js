// 📁 server/routes/church-scraper.js
// API routes for Orthodox Church Directory scraper

const express = require('express');
const router = express.Router();
const ChurchDirectoryBuilder = require('../scrapers/index');
const ChurchDatabase = require('../scrapers/database/church-database');
const path = require('path');

// Get scraper status
router.get('/status', async (req, res) => {
    try {
        const database = new ChurchDatabase();
        await database.initialize();
        
        const stats = await database.getStatistics();
        const [recentSessions] = await database.pool.execute(`
            SELECT * FROM scraping_sessions 
            ORDER BY session_start DESC 
            LIMIT 5
        `);
        
        await database.close();
        
        res.json({
            success: true,
            statistics: stats,
            recentSessions: recentSessions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start a new scraping session
router.post('/scrape', async (req, res) => {
    try {
        const options = {
            outputDir: path.join(__dirname, '../data/churches'),
            logLevel: req.body.logLevel || 'info',
            maxConcurrentScrapers: req.body.maxConcurrentScrapers || 3,
            validateUrls: req.body.validateUrls !== false,
            enableDuplicateDetection: req.body.enableDuplicateDetection !== false,
            saveToDatabase: req.body.saveToDatabase !== false,
            databaseConfig: req.body.databaseConfig || {}
        };
        
        // Start scraping in background
        const scrapingPromise = startScrapingSession(options);
        
        // Return immediately with session info
        res.json({
            success: true,
            message: 'Scraping session started',
            options: options
        });
        
        // Handle completion asynchronously
        scrapingPromise.then(results => {
            console.log('Scraping session completed:', results.sessionId);
        }).catch(error => {
            console.error('Scraping session failed:', error.message);
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get churches with filtering
router.get('/churches', async (req, res) => {
    try {
        const database = new ChurchDatabase();
        await database.initialize();
        
        const {
            jurisdiction,
            state,
            city,
            search,
            limit = 50,
            offset = 0
        } = req.query;
        
        let query = 'SELECT * FROM orthodox_churches WHERE 1=1';
        let params = [];
        
        if (jurisdiction) {
            query += ' AND jurisdiction = ?';
            params.push(jurisdiction);
        }
        
        if (state) {
            query += ' AND state = ?';
            params.push(state.toUpperCase());
        }
        
        if (city) {
            query += ' AND city = ?';
            params.push(city);
        }
        
        if (search) {
            query += ` AND MATCH(name, city, address, clergy_contact, search_keywords) 
                      AGAINST(? IN NATURAL LANGUAGE MODE)`;
            params.push(search);
        }
        
        query += ' ORDER BY name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [churches] = await database.pool.execute(query, params);
        
        // Get total count for pagination
        let countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) as total FROM')
                              .replace(/ORDER BY.*$/, '');
        const countParams = params.slice(0, -2); // Remove limit and offset
        const [countResult] = await database.pool.execute(countQuery, countParams);
        
        await database.close();
        
        res.json({
            success: true,
            churches: churches,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: countResult[0].total > (parseInt(offset) + parseInt(limit))
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search churches
router.get('/churches/search', async (req, res) => {
    try {
        const { q: searchTerm, limit = 20 } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                error: 'Search term is required'
            });
        }
        
        const database = new ChurchDatabase();
        await database.initialize();
        
        const churches = await database.searchChurches(searchTerm, parseInt(limit));
        
        await database.close();
        
        res.json({
            success: true,
            searchTerm: searchTerm,
            churches: churches
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get churches by jurisdiction
router.get('/churches/jurisdiction/:jurisdiction', async (req, res) => {
    try {
        const { jurisdiction } = req.params;
        
        const database = new ChurchDatabase();
        await database.initialize();
        
        const churches = await database.getChurchesByJurisdiction(jurisdiction);
        
        await database.close();
        
        res.json({
            success: true,
            jurisdiction: jurisdiction,
            churches: churches
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get statistics
router.get('/statistics', async (req, res) => {
    try {
        const database = new ChurchDatabase();
        await database.initialize();
        
        const stats = await database.getStatistics();
        
        await database.close();
        
        res.json({
            success: true,
            statistics: stats
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get scraping sessions history
router.get('/sessions', async (req, res) => {
    try {
        const database = new ChurchDatabase();
        await database.initialize();
        
        const [sessions] = await database.pool.execute(`
            SELECT 
                ss.*,
                COUNT(se.id) as error_count
            FROM scraping_sessions ss
            LEFT JOIN scraping_errors se ON ss.id = se.session_id
            GROUP BY ss.id
            ORDER BY ss.session_start DESC
            LIMIT 20
        `);
        
        await database.close();
        
        res.json({
            success: true,
            sessions: sessions
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to start scraping session
async function startScrapingSession(options) {
    const builder = new ChurchDirectoryBuilder(options);
    return await builder.runAutonomousScraping();
}

module.exports = router;
