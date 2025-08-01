// 📁 server/scrapers/database/church-database.js
// Database integration for Orthodox Church Directory

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class ChurchDatabase {
    constructor(options = {}) {
        this.dbConfig = {
            host: options.host || process.env.DB_HOST || 'localhost',
            user: options.user || process.env.DB_USER || 'orthodoxapps',
            password: options.password || process.env.DB_PASSWORD || 'Summerof1982@!',
            database: options.database || process.env.DB_NAME || 'orthodoxmetrics',
            charset: 'utf8mb4',
            ...options.dbConfig
        };
        
        this.logger = options.logger || console;
        this.pool = null;
    }

    async initialize() {
        try {
            // Create connection pool
            this.pool = mysql.createPool({
                ...this.dbConfig,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                acquireTimeout: 60000,
                timeout: 60000
            });

            // Test connection
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            this.logger.info('Database connection established');
            
            // Initialize schema if needed
            await this.initializeSchema();
            
        } catch (error) {
            this.logger.error('Failed to initialize database', { error: error.message });
            throw error;
        }
    }

    async initializeSchema() {
        try {
            // Check if churches table exists
            const [rows] = await this.pool.execute(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = ? AND table_name = 'orthodox_churches'
            `, [this.dbConfig.database]);

            if (rows[0].count === 0) {
                this.logger.info('Churches table not found, creating schema...');
                await this.createSchema();
            } else {
                this.logger.info('Churches table already exists');
            }
        } catch (error) {
            this.logger.error('Error checking schema', { error: error.message });
            throw error;
        }
    }

    async createSchema() {
        try {
            const schemaPath = path.join(__dirname, '../schema/churches-schema.sql');
            const schemaSql = await fs.readFile(schemaPath, 'utf8');
            
            // Split by delimiter and execute each statement
            const statements = schemaSql
                .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not in quotes
                .filter(stmt => stmt.trim().length > 0);

            for (const statement of statements) {
                if (statement.trim()) {
                    await this.pool.execute(statement);
                }
            }

            this.logger.info('Database schema created successfully');
        } catch (error) {
            this.logger.error('Error creating schema', { error: error.message });
            throw error;
        }
    }

    async startScrapingSession(config = {}) {
        try {
            const [result] = await this.pool.execute(`
                INSERT INTO scraping_sessions (
                    session_start, 
                    scraper_version, 
                    config_options, 
                    status
                ) VALUES (NOW(), ?, ?, 'running')
            `, ['1.0.0', JSON.stringify(config)]);

            const sessionId = result.insertId;
            this.logger.info('Scraping session started', { sessionId });
            return sessionId;
        } catch (error) {
            this.logger.error('Error starting scraping session', { error: error.message });
            throw error;
        }
    }

    async endScrapingSession(sessionId, statistics, errors = []) {
        try {
            await this.pool.execute(`
                UPDATE scraping_sessions SET
                    session_end = NOW(),
                    total_churches_scraped = ?,
                    total_churches_saved = ?,
                    duplicates_found = ?,
                    urls_validated = ?,
                    errors_count = ?,
                    jurisdiction_breakdown = ?,
                    status = 'completed'
                WHERE id = ?
            `, [
                statistics.totalChurches,
                statistics.totalChurches - statistics.duplicatesFound,
                statistics.duplicatesFound,
                statistics.validatedUrls,
                errors.length,
                JSON.stringify(statistics.jurisdictionCounts),
                sessionId
            ]);

            // Insert errors
            if (errors.length > 0) {
                await this.insertScrapingErrors(sessionId, errors);
            }

            this.logger.info('Scraping session completed', { sessionId });
        } catch (error) {
            this.logger.error('Error ending scraping session', { error: error.message });
            throw error;
        }
    }

    async insertScrapingErrors(sessionId, errors) {
        if (errors.length === 0) return;

        try {
            const values = errors.map(error => [
                sessionId,
                error.jurisdiction,
                error.type || 'scraping_error',
                error.error || error.message,
                error.url || null
            ]);

            await this.pool.execute(`
                INSERT INTO scraping_errors (session_id, jurisdiction, error_type, error_message, url)
                VALUES ${values.map(() => '(?, ?, ?, ?, ?)').join(', ')}
            `, values.flat());

        } catch (error) {
            this.logger.error('Error inserting scraping errors', { error: error.message });
        }
    }

    async saveChurches(churches) {
        if (churches.length === 0) return;

        this.logger.info('Saving churches to database', { count: churches.length });

        const connection = await this.pool.getConnection();
        await connection.beginTransaction();

        try {
            let savedCount = 0;
            let duplicateCount = 0;

            for (const church of churches) {
                const existing = await this.findExistingChurch(connection, church);
                
                if (existing) {
                    // Update existing record
                    await this.updateChurch(connection, existing.id, church);
                    duplicateCount++;
                } else {
                    // Insert new record
                    await this.insertChurch(connection, church);
                    savedCount++;
                }
            }

            await connection.commit();
            this.logger.info('Churches saved successfully', { 
                saved: savedCount, 
                updated: duplicateCount 
            });

            return { saved: savedCount, updated: duplicateCount };

        } catch (error) {
            await connection.rollback();
            this.logger.error('Error saving churches', { error: error.message });
            throw error;
        } finally {
            connection.release();
        }
    }

    async findExistingChurch(connection, church) {
        // Look for existing church by name and location
        const [rows] = await connection.execute(`
            SELECT id, name, city, state, website, contact_phone
            FROM orthodox_churches
            WHERE (
                (name = ? OR name_normalized = ?) OR
                (website IS NOT NULL AND website = ?) OR
                (contact_phone IS NOT NULL AND contact_phone = ?)
            ) AND (
                city = ? OR state = ?
            )
            LIMIT 1
        `, [
            church.name,
            church.name_normalized,
            church.website,
            church.contact_phone,
            church.city,
            church.state
        ]);

        return rows.length > 0 ? rows[0] : null;
    }

    async insertChurch(connection, church) {
        const [result] = await connection.execute(`
            INSERT INTO orthodox_churches (
                name, name_normalized, jurisdiction, address, city, state, zip_code,
                full_address, website, website_validated, contact_email, contact_phone,
                establishment_year, clergy_contact, search_keywords, source_url,
                source_urls, scraper_version, merged_from, merge_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            church.name,
            church.name_normalized,
            church.jurisdiction,
            church.address,
            church.city,
            church.state,
            church.zip_code,
            church.full_address,
            church.website,
            church.website_validated,
            church.contact_email,
            church.contact_phone,
            church.establishment_year,
            church.clergy_contact,
            church.search_keywords,
            church.source_url,
            church.source_urls ? JSON.stringify(church.source_urls) : null,
            church.scraper_version || '1.0.0',
            church.merged_from,
            church.merge_date
        ]);

        return result.insertId;
    }

    async updateChurch(connection, churchId, church) {
        await connection.execute(`
            UPDATE orthodox_churches SET
                name = COALESCE(?, name),
                name_normalized = COALESCE(?, name_normalized),
                jurisdiction = COALESCE(?, jurisdiction),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                zip_code = COALESCE(?, zip_code),
                full_address = COALESCE(?, full_address),
                website = COALESCE(?, website),
                website_validated = COALESCE(?, website_validated),
                contact_email = COALESCE(?, contact_email),
                contact_phone = COALESCE(?, contact_phone),
                establishment_year = COALESCE(?, establishment_year),
                clergy_contact = COALESCE(?, clergy_contact),
                search_keywords = COALESCE(?, search_keywords),
                source_url = COALESCE(?, source_url),
                last_updated = NOW()
            WHERE id = ?
        `, [
            church.name,
            church.name_normalized,
            church.jurisdiction,
            church.address,
            church.city,
            church.state,
            church.zip_code,
            church.full_address,
            church.website,
            church.website_validated,
            church.contact_email,
            church.contact_phone,
            church.establishment_year,
            church.clergy_contact,
            church.search_keywords,
            church.source_url,
            churchId
        ]);
    }

    async saveUrlValidations(validations) {
        if (validations.length === 0) return;

        try {
            const values = validations.map(validation => [
                validation.church_id,
                validation.url,
                validation.isValid,
                validation.status,
                validation.responseTime,
                validation.redirectUrl,
                validation.error
            ]);

            await this.pool.execute(`
                INSERT INTO url_validations (
                    church_id, url, is_valid, status_code, response_time, redirect_url, error_message
                ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}
                ON DUPLICATE KEY UPDATE
                    is_valid = VALUES(is_valid),
                    status_code = VALUES(status_code),
                    response_time = VALUES(response_time),
                    redirect_url = VALUES(redirect_url),
                    error_message = VALUES(error_message),
                    validated_at = NOW()
            `, values.flat());

            this.logger.info('URL validations saved', { count: validations.length });
        } catch (error) {
            this.logger.error('Error saving URL validations', { error: error.message });
        }
    }

    async getChurchesByJurisdiction(jurisdiction) {
        try {
            const [rows] = await this.pool.execute(`
                SELECT * FROM orthodox_churches 
                WHERE jurisdiction = ? 
                ORDER BY state, city, name
            `, [jurisdiction]);

            return rows;
        } catch (error) {
            this.logger.error('Error getting churches by jurisdiction', { error: error.message });
            throw error;
        }
    }

    async searchChurches(searchTerm, limit = 50) {
        try {
            const [rows] = await this.pool.execute(`
                SELECT *, 
                       MATCH(name, city, address, clergy_contact, search_keywords) 
                       AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                FROM orthodox_churches 
                WHERE MATCH(name, city, address, clergy_contact, search_keywords) 
                      AGAINST(? IN NATURAL LANGUAGE MODE)
                ORDER BY relevance_score DESC
                LIMIT ?
            `, [searchTerm, searchTerm, limit]);

            return rows;
        } catch (error) {
            this.logger.error('Error searching churches', { error: error.message });
            throw error;
        }
    }

    async getStatistics() {
        try {
            const [stats] = await this.pool.execute(`
                SELECT 
                    COUNT(*) as total_churches,
                    COUNT(DISTINCT jurisdiction) as total_jurisdictions,
                    COUNT(website) as churches_with_websites,
                    COUNT(CASE WHEN website_validated = 1 THEN 1 END) as validated_websites,
                    COUNT(contact_email) as churches_with_email,
                    COUNT(contact_phone) as churches_with_phone,
                    AVG(CASE WHEN establishment_year IS NOT NULL THEN establishment_year END) as avg_establishment_year,
                    MAX(last_updated) as last_scrape_update
                FROM orthodox_churches
            `);

            const [jurisdictionStats] = await this.pool.execute(`
                SELECT jurisdiction, COUNT(*) as count
                FROM orthodox_churches
                GROUP BY jurisdiction
                ORDER BY count DESC
            `);

            const [stateStats] = await this.pool.execute(`
                SELECT state, COUNT(*) as count
                FROM orthodox_churches
                WHERE state IS NOT NULL
                GROUP BY state
                ORDER BY count DESC
            `);

            return {
                overall: stats[0],
                byJurisdiction: jurisdictionStats,
                byState: stateStats
            };
        } catch (error) {
            this.logger.error('Error getting statistics', { error: error.message });
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.logger.info('Database connection closed');
        }
    }
}

module.exports = ChurchDatabase;
