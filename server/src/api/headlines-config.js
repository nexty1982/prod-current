const { getAppPool } = require('../config/db-compat');
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/db-compat');
const { requireAuth } = require('../middleware/auth');
const Parser = require('rss-parser');
const axios = require('axios');

// Helper function to generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// GET /api/headlines/sources/manage - Get all sources with management info
router.get('/sources/manage', requireAuth, async (req, res) => {
    try {
        console.log('📡 Fetching headlines sources for management');

        const [sources] = await getAppPool().query(`
            SELECT 
                id,
                name,
                feed_url,
                language,
                enabled,
                categories,
                description,
                last_fetch,
                article_count,
                status,
                created_at,
                updated_at
            FROM headlines_sources 
            ORDER BY name ASC
        `);

        // Parse categories JSON
        const sourcesWithCategories = sources.map(source => ({
            ...source,
            categories: source.categories ? JSON.parse(source.categories) : [],
            enabled: Boolean(source.enabled)
        }));

        console.log(`✅ Found ${sources.length} headlines sources`);

        res.json({
            success: true,
            sources: sourcesWithCategories
        });

    } catch (error) {
        console.error('❌ Error fetching headlines sources:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch headlines sources',
            error: error.message
        });
    }
});

// GET /api/headlines/categories - Get all categories
router.get('/categories', requireAuth, async (req, res) => {
    try {
        console.log('📂 Fetching headlines categories');

        const [categories] = await getAppPool().query(`
            SELECT 
                id,
                name,
                enabled,
                keywords,
                priority,
                description,
                created_at,
                updated_at
            FROM headlines_categories 
            ORDER BY priority DESC, name ASC
        `);

        // Parse keywords JSON
        const categoriesWithKeywords = categories.map(category => ({
            ...category,
            keywords: category.keywords ? JSON.parse(category.keywords) : [],
            enabled: Boolean(category.enabled)
        }));

        console.log(`✅ Found ${categories.length} headlines categories`);

        res.json({
            success: true,
            categories: categoriesWithKeywords
        });

    } catch (error) {
        console.error('❌ Error fetching headlines categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch headlines categories',
            error: error.message
        });
    }
});

// GET /api/headlines/config - Get scraping configuration
router.get('/config', requireAuth, async (req, res) => {
    try {
        console.log('⚙️ Fetching headlines configuration');

        const [configs] = await getAppPool().query(`
            SELECT * FROM headlines_config 
            WHERE user_id = ? OR user_id IS NULL 
            ORDER BY user_id DESC 
            LIMIT 1
        `, [req.session.user.id]);

        let config = {
            enabled: true,
            schedule: '0 */6 * * *',
            maxArticlesPerSource: 20,
            languages: ['en'],
            categories: [],
            sources: []
        };

        if (configs.length > 0) {
            const dbConfig = configs[0];
            config = {
                enabled: Boolean(dbConfig.enabled),
                schedule: dbConfig.schedule || '0 */6 * * *',
                maxArticlesPerSource: dbConfig.max_articles_per_source || 20,
                languages: dbConfig.languages ? JSON.parse(dbConfig.languages) : ['en'],
                categories: dbConfig.categories ? JSON.parse(dbConfig.categories) : [],
                sources: dbConfig.sources ? JSON.parse(dbConfig.sources) : []
            };
        }

        console.log('✅ Headlines configuration retrieved');

        res.json({
            success: true,
            config
        });

    } catch (error) {
        console.error('❌ Error fetching headlines configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch headlines configuration',
            error: error.message
        });
    }
});

// PUT /api/headlines/config - Save scraping configuration
router.put('/config', requireAuth, async (req, res) => {
    try {
        const { config } = req.body;
        console.log('💾 Saving headlines configuration');

        // Validate config
        if (!config || typeof config !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid configuration data'
            });
        }

        // Check if config exists for user
        const [existing] = await getAppPool().query(`
            SELECT id FROM headlines_config WHERE user_id = ?
        `, [req.session.user.id]);

        if (existing.length > 0) {
            // Update existing
            await getAppPool().query(`
                UPDATE headlines_config 
                SET 
                    enabled = ?,
                    schedule = ?,
                    max_articles_per_source = ?,
                    languages = ?,
                    categories = ?,
                    sources = ?,
                    updated_at = NOW()
                WHERE user_id = ?
            `, [
                config.enabled ? 1 : 0,
                config.schedule || '0 */6 * * *',
                config.maxArticlesPerSource || 20,
                JSON.stringify(config.languages || ['en']),
                JSON.stringify(config.categories || []),
                JSON.stringify(config.sources || []),
                req.session.user.id
            ]);
        } else {
            // Create new
            await getAppPool().query(`
                INSERT INTO headlines_config 
                (user_id, enabled, schedule, max_articles_per_source, languages, categories, sources)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.session.user.id,
                config.enabled ? 1 : 0,
                config.schedule || '0 */6 * * *',
                config.maxArticlesPerSource || 20,
                JSON.stringify(config.languages || ['en']),
                JSON.stringify(config.categories || []),
                JSON.stringify(config.sources || [])
            ]);
        }

        console.log('✅ Headlines configuration saved');

        res.json({
            success: true,
            message: 'Configuration saved successfully'
        });

    } catch (error) {
        console.error('❌ Error saving headlines configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save headlines configuration',
            error: error.message
        });
    }
});

// POST /api/headlines/sources - Add new source
router.post('/sources', requireAuth, async (req, res) => {
    try {
        const { name, feed_url, language, enabled, categories, description } = req.body;
        console.log(`📡 Adding new headlines source: ${name}`);

        // Validate required fields
        if (!name || !feed_url) {
            return res.status(400).json({
                success: false,
                message: 'Name and Feed URL are required'
            });
        }

        // Generate unique ID
        const id = generateId();

        // Insert new source
        await getAppPool().query(`
            INSERT INTO headlines_sources 
            (id, name, feed_url, language, enabled, categories, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'inactive')
        `, [
            id,
            name,
            feed_url,
            language || 'en',
            enabled ? 1 : 0,
            JSON.stringify(categories || []),
            description || null
        ]);

        // Get the created source
        const [newSource] = await getAppPool().query(`
            SELECT * FROM headlines_sources WHERE id = ?
        `, [id]);

        const source = {
            ...newSource[0],
            categories: newSource[0].categories ? JSON.parse(newSource[0].categories) : [],
            enabled: Boolean(newSource[0].enabled)
        };

        console.log(`✅ Source added: ${name}`);

        res.json({
            success: true,
            message: 'Source added successfully',
            source
        });

    } catch (error) {
        console.error('❌ Error adding headlines source:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add headlines source',
            error: error.message
        });
    }
});

// POST /api/headlines/sources/:id/test - Test a source
router.post('/sources/:id/test', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🧪 Testing headlines source: ${id}`);

        // Get source details
        const [sources] = await getAppPool().query(`
            SELECT * FROM headlines_sources WHERE id = ?
        `, [id]);

        if (sources.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Source not found'
            });
        }

        const source = sources[0];

        // Test RSS feed
        const parser = new Parser({
            timeout: 15000,
            headers: {
                'User-Agent': 'OrthodoxMetrics-NewsAggregator/1.0 (https://orthodoxmetrics.com)'
            }
        });

        try {
            const feed = await parser.parseURL(source.feed_url);
            const articleCount = feed.items ? feed.items.length : 0;

            // Update source status and article count
            await getAppPool().query(`
                UPDATE headlines_sources 
                SET 
                    status = 'active',
                    article_count = ?,
                    last_fetch = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `, [articleCount, id]);

            console.log(`✅ Source test successful: ${source.name} (${articleCount} articles)`);

            res.json({
                success: true,
                sourceName: source.name,
                articleCount,
                message: 'Test successful'
            });

        } catch (feedError) {
            // Update source status to error
            await getAppPool().query(`
                UPDATE headlines_sources 
                SET 
                    status = 'error',
                    updated_at = NOW()
                WHERE id = ?
            `, [id]);

            console.error(`❌ Source test failed: ${source.name} - ${feedError.message}`);

            res.status(400).json({
                success: false,
                message: `RSS feed test failed: ${feedError.message}`
            });
        }

    } catch (error) {
        console.error('❌ Error testing headlines source:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test headlines source',
            error: error.message
        });
    }
});

// PUT /api/headlines/sources/bulk-update - Bulk update sources
router.put('/sources/bulk-update', requireAuth, async (req, res) => {
    try {
        const { sources } = req.body;
        console.log(`📝 Bulk updating ${sources.length} headlines sources`);

        if (!Array.isArray(sources)) {
            return res.status(400).json({
                success: false,
                message: 'Sources must be an array'
            });
        }

        // Update each source
        for (const source of sources) {
            await getAppPool().query(`
                UPDATE headlines_sources 
                SET 
                    name = ?,
                    feed_url = ?,
                    language = ?,
                    enabled = ?,
                    categories = ?,
                    description = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                source.name,
                source.feed_url,
                source.language,
                source.enabled ? 1 : 0,
                JSON.stringify(source.categories || []),
                source.description || null,
                source.id
            ]);
        }

        console.log('✅ Bulk update completed');

        res.json({
            success: true,
            message: 'Sources updated successfully'
        });

    } catch (error) {
        console.error('❌ Error bulk updating headlines sources:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update headlines sources',
            error: error.message
        });
    }
});

// PUT /api/headlines/categories/bulk-update - Bulk update categories
router.put('/categories/bulk-update', requireAuth, async (req, res) => {
    try {
        const { categories } = req.body;
        console.log(`📝 Bulk updating ${categories.length} headlines categories`);

        if (!Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                message: 'Categories must be an array'
            });
        }

        // Update each category
        for (const category of categories) {
            await getAppPool().query(`
                UPDATE headlines_categories 
                SET 
                    name = ?,
                    enabled = ?,
                    keywords = ?,
                    priority = ?,
                    description = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                category.name,
                category.enabled ? 1 : 0,
                JSON.stringify(category.keywords || []),
                category.priority || 0,
                category.description || null,
                category.id
            ]);
        }

        console.log('✅ Categories bulk update completed');

        res.json({
            success: true,
            message: 'Categories updated successfully'
        });

    } catch (error) {
        console.error('❌ Error bulk updating headlines categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update headlines categories',
            error: error.message
        });
    }
});

// DELETE /api/headlines/sources/:id - Delete a source
router.delete('/sources/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ Deleting headlines source: ${id}`);

        const [result] = await getAppPool().query(`
            DELETE FROM headlines_sources WHERE id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Source not found'
            });
        }

        console.log('✅ Source deleted');

        res.json({
            success: true,
            message: 'Source deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting headlines source:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete headlines source',
            error: error.message
        });
    }
});

module.exports = router; 