// 📁 server/scrapers/frontend/church-directory-api.js
// Step 5: API endpoints for Autonomous Frontend Visualization

const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

class ChurchDirectoryAPI {
    constructor(dbConfig, logger = console) {
        this.dbConfig = dbConfig;
        this.logger = logger;
        this.pool = null;
    }

    async initialize() {
        this.pool = mysql.createPool({
            ...this.dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        const connection = await this.pool.getConnection();
        await connection.ping();
        connection.release();

        this.logger.info('🌐 Church Directory API initialized');
    }

    setupRoutes() {
        // 1. Get all churches with filtering and pagination
        router.get('/churches', async (req, res) => {
            try {
                const {
                    jurisdiction,
                    state,
                    city,
                    establishmentYearFrom,
                    establishmentYearTo,
                    validationScore,
                    page = 1,
                    limit = 50,
                    search,
                    sortBy = 'name',
                    sortOrder = 'ASC'
                } = req.query;

                let query = `
                    SELECT id, name, jurisdiction, address, city, state, zip_code,
                           website, contact_email, contact_phone, parish_priest,
                           establishment_year, patron_saint, diocese, deanery,
                           data_quality_score, validation_score, is_validated,
                           parish_status, membership_size_category, region
                    FROM orthodox_churches 
                    WHERE parish_status = 'active'
                `;

                const params = [];

                // Apply filters
                if (jurisdiction) {
                    query += ` AND jurisdiction = ?`;
                    params.push(jurisdiction);
                }

                if (state) {
                    query += ` AND state = ?`;
                    params.push(state);
                }

                if (city) {
                    query += ` AND city LIKE ?`;
                    params.push(`%${city}%`);
                }

                if (establishmentYearFrom) {
                    query += ` AND establishment_year >= ?`;
                    params.push(parseInt(establishmentYearFrom));
                }

                if (establishmentYearTo) {
                    query += ` AND establishment_year <= ?`;
                    params.push(parseInt(establishmentYearTo));
                }

                if (validationScore) {
                    query += ` AND validation_score >= ?`;
                    params.push(parseInt(validationScore));
                }

                if (search) {
                    query += ` AND (name LIKE ? OR city LIKE ? OR parish_priest LIKE ? OR patron_saint LIKE ?)`;
                    const searchTerm = `%${search}%`;
                    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
                }

                // Add sorting
                const validSortColumns = ['name', 'jurisdiction', 'city', 'state', 'establishment_year', 'validation_score'];
                const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
                const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
                query += ` ORDER BY ${sortColumn} ${order}`;

                // Add pagination
                const offset = (parseInt(page) - 1) * parseInt(limit);
                query += ` LIMIT ? OFFSET ?`;
                params.push(parseInt(limit), offset);

                const [churches] = await this.pool.execute(query, params);

                // Get total count for pagination
                let countQuery = `
                    SELECT COUNT(*) as total 
                    FROM orthodox_churches 
                    WHERE parish_status = 'active'
                `;
                const countParams = params.slice(0, -2); // Remove limit and offset

                if (jurisdiction) countQuery += ` AND jurisdiction = ?`;
                if (state) countQuery += ` AND state = ?`;
                if (city) countQuery += ` AND city LIKE ?`;
                if (establishmentYearFrom) countQuery += ` AND establishment_year >= ?`;
                if (establishmentYearTo) countQuery += ` AND establishment_year <= ?`;
                if (validationScore) countQuery += ` AND validation_score >= ?`;
                if (search) countQuery += ` AND (name LIKE ? OR city LIKE ? OR parish_priest LIKE ? OR patron_saint LIKE ?)`;

                const [countResult] = await this.pool.execute(countQuery, countParams);
                const total = countResult[0].total;

                res.json({
                    success: true,
                    data: churches,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                });

            } catch (error) {
                this.logger.error('Error fetching churches', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch churches'
                });
            }
        });

        // 2. Get jurisdiction statistics
        router.get('/statistics/jurisdictions', async (req, res) => {
            try {
                const [stats] = await this.pool.execute(`
                    SELECT * FROM jurisdiction_stats
                    ORDER BY total_churches DESC
                `);

                res.json({
                    success: true,
                    data: stats
                });

            } catch (error) {
                this.logger.error('Error fetching jurisdiction statistics', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch jurisdiction statistics'
                });
            }
        });

        // 3. Get geographical distribution
        router.get('/statistics/geographical', async (req, res) => {
            try {
                const [distribution] = await this.pool.execute(`
                    SELECT * FROM geographical_distribution
                    ORDER BY church_count DESC
                `);

                res.json({
                    success: true,
                    data: distribution
                });

            } catch (error) {
                this.logger.error('Error fetching geographical distribution', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch geographical distribution'
                });
            }
        });

        // 4. Get data quality metrics
        router.get('/statistics/quality', async (req, res) => {
            try {
                const [quality] = await this.pool.execute(`
                    SELECT * FROM data_quality_dashboard
                    ORDER BY update_date DESC
                    LIMIT 30
                `);

                res.json({
                    success: true,
                    data: quality
                });

            } catch (error) {
                this.logger.error('Error fetching data quality metrics', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch data quality metrics'
                });
            }
        });

        // 5. Get map data for visualization
        router.get('/map-data', async (req, res) => {
            try {
                const [mapData] = await this.pool.execute(`
                    SELECT 
                        id, name, jurisdiction, city, state, zip_code,
                        COALESCE(address, CONCAT(city, ', ', state)) as location,
                        website, establishment_year, parish_priest,
                        data_quality_score, validation_score,
                        membership_size_category, region
                    FROM orthodox_churches 
                    WHERE parish_status = 'active' 
                      AND city IS NOT NULL 
                      AND state IS NOT NULL
                    ORDER BY name
                `);

                // Group by state for easier map rendering
                const byState = {};
                mapData.forEach(church => {
                    if (!byState[church.state]) {
                        byState[church.state] = [];
                    }
                    byState[church.state].push(church);
                });

                res.json({
                    success: true,
                    data: {
                        churches: mapData,
                        byState: byState,
                        summary: {
                            totalChurches: mapData.length,
                            states: Object.keys(byState).length,
                            jurisdictions: [...new Set(mapData.map(c => c.jurisdiction))].length
                        }
                    }
                });

            } catch (error) {
                this.logger.error('Error fetching map data', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch map data'
                });
            }
        });

        // 6. Get filter options for dropdowns
        router.get('/filter-options', async (req, res) => {
            try {
                const [jurisdictions] = await this.pool.execute(`
                    SELECT DISTINCT jurisdiction 
                    FROM orthodox_churches 
                    WHERE parish_status = 'active'
                    ORDER BY jurisdiction
                `);

                const [states] = await this.pool.execute(`
                    SELECT DISTINCT state, COUNT(*) as church_count
                    FROM orthodox_churches 
                    WHERE parish_status = 'active' AND state IS NOT NULL
                    GROUP BY state
                    ORDER BY state
                `);

                const [years] = await this.pool.execute(`
                    SELECT 
                        MIN(establishment_year) as min_year,
                        MAX(establishment_year) as max_year
                    FROM orthodox_churches 
                    WHERE establishment_year IS NOT NULL
                `);

                res.json({
                    success: true,
                    data: {
                        jurisdictions: jurisdictions.map(j => j.jurisdiction),
                        states: states,
                        yearRange: years[0] || { min_year: 1800, max_year: new Date().getFullYear() }
                    }
                });

            } catch (error) {
                this.logger.error('Error fetching filter options', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch filter options'
                });
            }
        });

        // 7. Get individual church details
        router.get('/churches/:id', async (req, res) => {
            try {
                const churchId = parseInt(req.params.id);

                const [church] = await this.pool.execute(`
                    SELECT * FROM orthodox_churches 
                    WHERE id = ? AND parish_status = 'active'
                `, [churchId]);

                if (church.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Church not found'
                    });
                }

                // Get change history
                const [changes] = await this.pool.execute(`
                    SELECT change_type, field_name, old_value, new_value, 
                           changed_by, change_reason, changed_at
                    FROM church_changes 
                    WHERE church_id = ?
                    ORDER BY changed_at DESC
                    LIMIT 10
                `, [churchId]);

                res.json({
                    success: true,
                    data: {
                        church: church[0],
                        changeHistory: changes
                    }
                });

            } catch (error) {
                this.logger.error('Error fetching church details', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch church details'
                });
            }
        });

        // 8. Search churches with full-text search
        router.get('/search', async (req, res) => {
            try {
                const { q, limit = 20 } = req.query;

                if (!q || q.trim().length < 3) {
                    return res.json({
                        success: true,
                        data: [],
                        message: 'Search query must be at least 3 characters'
                    });
                }

                const [results] = await this.pool.execute(`
                    SELECT id, name, jurisdiction, city, state, 
                           parish_priest, website, data_quality_score,
                           MATCH(name, city, address, clergy_contact, search_keywords) 
                           AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
                    FROM orthodox_churches 
                    WHERE parish_status = 'active'
                      AND MATCH(name, city, address, clergy_contact, search_keywords) 
                          AGAINST(? IN NATURAL LANGUAGE MODE)
                    ORDER BY relevance DESC, name ASC
                    LIMIT ?
                `, [q, q, parseInt(limit)]);

                res.json({
                    success: true,
                    data: results,
                    query: q
                });

            } catch (error) {
                this.logger.error('Error performing search', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: 'Search failed'
                });
            }
        });

        return router;
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = ChurchDirectoryAPI;
