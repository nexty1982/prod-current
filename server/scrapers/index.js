// 📁 server/scrapers/index.js
// Main orchestrator for Orthodox Church data acquisition

const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

// Individual jurisdiction scrapers
const OCAScaper = require('./jurisdictions/oca-scraper');
const GOARCHScraper = require('./jurisdictions/goarch-scraper');
const AntiochianScraper = require('./jurisdictions/antiochian-scraper');
const ROCORScraper = require('./jurisdictions/rocor-scraper');
const SerbianScraper = require('./jurisdictions/serbian-scraper');
const RomanianScraper = require('./jurisdictions/romanian-scraper');
const BulgarianScraper = require('./jurisdictions/bulgarian-scraper');

// Utility modules
const URLValidator = require('./utils/url-validator');
const DataCleaner = require('./utils/data-cleaner');
const DuplicateDetector = require('./utils/duplicate-detector');
const IntelligentValidator = require('./utils/intelligent-validator'); // Step 3: Intelligent Data Validation

// Database integration
const ChurchDatabase = require('./database/church-database');

class ChurchDirectoryBuilder {
    constructor(options = {}) {
        this.options = {
            outputDir: options.outputDir || path.join(__dirname, '../data/churches'),
            logLevel: options.logLevel || 'info',
            maxConcurrentScrapers: options.maxConcurrentScrapers || 3,
            validateUrls: options.validateUrls !== false,
            enableDuplicateDetection: options.enableDuplicateDetection !== false,
            saveToDatabase: options.saveToDatabase !== false,
            databaseConfig: options.databaseConfig || {},
            ...options
        };

        this.setupLogger();
        this.initializeScrapers();
        this.initializeDatabase();
        this.churches = [];
        this.errors = [];
        this.sessionId = null;
        this.statistics = {
            totalChurches: 0,
            validatedUrls: 0,
            duplicatesFound: 0,
            jurisdictionCounts: {},
            scrapeStartTime: null,
            scrapeEndTime: null
        };
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: this.options.logLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
                        Object.keys(meta).length ? JSON.stringify(meta) : ''
                    }`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ 
                    filename: path.join(__dirname, '../logs/church-scraper.log') 
                })
            ]
        });
    }

    initializeScrapers() {
        this.scrapers = [
            new OCAScaper({ logger: this.logger }),
            new GOARCHScraper({ logger: this.logger }),
            new AntiochianScraper({ logger: this.logger }),
            new ROCORScraper({ logger: this.logger }),
            new SerbianScraper({ logger: this.logger }),
            new RomanianScraper({ logger: this.logger }),
            new BulgarianScraper({ logger: this.logger })
        ];

        this.urlValidator = new URLValidator({ logger: this.logger });
        this.dataCleaner = new DataCleaner({ logger: this.logger });
        this.duplicateDetector = new DuplicateDetector({ logger: this.logger });
        this.intelligentValidator = new IntelligentValidator({ logger: this.logger }); // Step 3
    }

    initializeDatabase() {
        if (this.options.saveToDatabase) {
            this.database = new ChurchDatabase({
                logger: this.logger,
                ...this.options.databaseConfig
            });
        }
    }

    async runAutonomousScraping() {
        try {
            this.logger.info('🚀 Starting autonomous Orthodox Church directory building...');
            this.statistics.scrapeStartTime = new Date();

            // Initialize database if enabled
            if (this.database) {
                await this.database.initialize();
                this.sessionId = await this.database.startScrapingSession(this.options);
            }

            // Create output directory if it doesn't exist
            await this.ensureOutputDirectory();

            // Run all jurisdiction scrapers
            await this.runJurisdictionScrapers();

            // Clean and validate data
            await this.processCollectedData();

            // Save to database if enabled
            if (this.database) {
                await this.saveToDatabase();
            }

            // Generate final statistics and save results
            await this.finalizeResults();

            this.statistics.scrapeEndTime = new Date();
            this.logger.info('✅ Autonomous scraping completed successfully', {
                totalChurches: this.statistics.totalChurches,
                duration: `${(this.statistics.scrapeEndTime - this.statistics.scrapeStartTime) / 1000}s`
            });

            // Close database session
            if (this.database) {
                await this.database.endScrapingSession(this.sessionId, this.statistics, this.errors);
                await this.database.close();
            }

            return {
                success: true,
                churches: this.churches,
                statistics: this.statistics,
                errors: this.errors,
                sessionId: this.sessionId
            };

        } catch (error) {
            this.logger.error('❌ Fatal error during autonomous scraping', { error: error.message });
            
            // Mark session as failed if database is enabled
            if (this.database && this.sessionId) {
                try {
                    await this.database.pool.execute(`
                        UPDATE scraping_sessions SET 
                        status = 'failed', 
                        error_message = ?,
                        session_end = NOW()
                        WHERE id = ?
                    `, [error.message, this.sessionId]);
                    await this.database.close();
                } catch (dbError) {
                    this.logger.error('Error updating failed session', { error: dbError.message });
                }
            }
            
            throw error;
        }
    }

    async ensureOutputDirectory() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
            this.logger.info('📁 Output directory ready', { path: this.options.outputDir });
        } catch (error) {
            this.logger.error('Failed to create output directory', { error: error.message });
            throw error;
        }
    }

    async runJurisdictionScrapers() {
        this.logger.info('🔍 Starting jurisdiction-specific scrapers...');
        
        const scraperPromises = this.scrapers.map(async (scraper) => {
            try {
                this.logger.info(`Starting ${scraper.jurisdiction} scraper...`);
                const churches = await scraper.scrapeChurches();
                
                this.logger.info(`${scraper.jurisdiction} scraper completed`, {
                    churchCount: churches.length
                });

                this.statistics.jurisdictionCounts[scraper.jurisdiction] = churches.length;
                return churches;
            } catch (error) {
                this.logger.error(`Error in ${scraper.jurisdiction} scraper`, {
                    error: error.message
                });
                this.errors.push({
                    jurisdiction: scraper.jurisdiction,
                    error: error.message,
                    timestamp: new Date()
                });
                return [];
            }
        });

        // Wait for all scrapers to complete (with concurrency limit)
        const results = await this.limitConcurrency(scraperPromises, this.options.maxConcurrentScrapers);
        
        // Flatten all results into single array
        this.churches = results.flat();
        this.statistics.totalChurches = this.churches.length;

        this.logger.info('🏛️ All jurisdiction scrapers completed', {
            totalChurches: this.statistics.totalChurches,
            jurisdictions: Object.keys(this.statistics.jurisdictionCounts)
        });
    }

    async limitConcurrency(promises, limit) {
        const results = [];
        for (let i = 0; i < promises.length; i += limit) {
            const batch = promises.slice(i, i + limit);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
        }
        return results;
    }

    async processCollectedData() {
        this.logger.info('🧹 Processing and validating collected data...');

        // Clean and standardize data
        this.churches = await this.dataCleaner.cleanChurchData(this.churches);

        // Step 3: Intelligent Data Validation
        await this.runIntelligentValidation();

        // Validate URLs if enabled (enhanced by intelligent validation)
        if (this.options.validateUrls) {
            await this.validateChurchUrls();
        }

        // Detect and handle duplicates
        if (this.options.enableDuplicateDetection) {
            await this.handleDuplicates();
        }

        this.logger.info('✨ Data processing completed', {
            finalChurchCount: this.churches.length,
            validatedUrls: this.statistics.validatedUrls,
            duplicatesFound: this.statistics.duplicatesFound,
            validationResults: this.statistics.validationResults
        });
    }

    async validateChurchUrls() {
        this.logger.info('🔗 Validating church website URLs...');
        
        const churchesWithUrls = this.churches.filter(church => church.website);
        const validationPromises = churchesWithUrls.map(async (church) => {
            try {
                const isValid = await this.urlValidator.validateUrl(church.website);
                if (isValid) {
                    this.statistics.validatedUrls++;
                    church.website_validated = true;
                } else {
                    church.website_validated = false;
                    this.logger.warn('Invalid URL detected', {
                        church: church.name,
                        url: church.website
                    });
                }
            } catch (error) {
                church.website_validated = false;
                this.logger.warn('URL validation error', {
                    church: church.name,
                    url: church.website,
                    error: error.message
                });
            }
        });

        await this.limitConcurrency(validationPromises, 10); // Limit to 10 concurrent validations
    }

    async handleDuplicates() {
        this.logger.info('🔍 Detecting and handling duplicate churches...');
        
        const duplicateGroups = await this.duplicateDetector.findDuplicates(this.churches);
        
        for (const group of duplicateGroups) {
            this.statistics.duplicatesFound += group.length - 1;
            
            // Keep the most complete record from each duplicate group
            const bestRecord = this.duplicateDetector.selectBestRecord(group);
            
            // Remove duplicates, keep only the best record
            this.churches = this.churches.filter(church => 
                !group.includes(church) || church === bestRecord
            );
            
            this.logger.info('Duplicate resolved', {
                keptRecord: bestRecord.name,
                removedCount: group.length - 1
            });
        }
    }

    async finalizeResults() {
        this.logger.info('💾 Finalizing and saving results...');

        // Save raw church data
        const churchesFile = path.join(this.options.outputDir, 'churches.json');
        await fs.writeFile(churchesFile, JSON.stringify(this.churches, null, 2));

        // Save statistics
        const statsFile = path.join(this.options.outputDir, 'statistics.json');
        await fs.writeFile(statsFile, JSON.stringify(this.statistics, null, 2));

        // Save errors log
        const errorsFile = path.join(this.options.outputDir, 'errors.json');
        await fs.writeFile(errorsFile, JSON.stringify(this.errors, null, 2));

        // Generate CSV export
        await this.generateCSVExport();

        this.logger.info('📊 Results saved', {
            churchesFile,
            statsFile,
            errorsFile
        });
    }

    async generateCSVExport() {
        const { Parser } = require('json2csv');
        
        // Enhanced fields for Step 2: Comprehensive Data Points
        const fields = [
            // Core information
            'name', 'jurisdiction', 
            
            // Contact information
            'website', 'website_validated', 'contact_email', 'contact_phone',
            
            // Location
            'address', 'city', 'state', 'zip_code',
            
            // Clergy and leadership
            'parish_priest', 'clergy_contact', 'dean',
            
            // Church characteristics
            'establishment_year', 'patron_saint', 'feast_day',
            
            // Diocesan structure
            'diocese', 'deanery',
            
            // Services and community
            'parish_size', 'services_schedule', 'languages',
            
            // Social media
            'facebook_url', 'instagram_url', 'youtube_url',
            
            // Data quality and source
            'data_quality_score', 'source_url', 'scraper_version',
            
            // Step 3: Validation results
            'is_validated', 'validation_score', 'validation_date'
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(this.churches);

        const csvFile = path.join(this.options.outputDir, 'churches.csv');
        await fs.writeFile(csvFile, csv);

        this.logger.info('📈 CSV export generated', { file: csvFile });
    }

    async saveToDatabase() {
        if (!this.database || this.churches.length === 0) return;
        
        this.logger.info('💾 Saving churches to database...');
        
        try {
            const result = await this.database.saveChurches(this.churches);
            this.logger.info('Database save completed', result);
        } catch (error) {
            this.logger.error('Error saving to database', { error: error.message });
            this.errors.push({
                type: 'database_save',
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    async runIntelligentValidation() {
        this.logger.info('🎯 Step 3: Running Intelligent Data Validation...');
        
        try {
            const validationResults = await this.intelligentValidator.validateChurchData(this.churches);
            
            // Generate validation statistics
            const validChurches = this.churches.filter(c => c.is_validated);
            const flaggedChurches = this.churches.filter(c => c.validation_flags && c.validation_flags.length > 0);
            
            this.statistics.validationResults = {
                totalValidated: this.churches.length,
                validChurches: validChurches.length,
                flaggedChurches: flaggedChurches.length,
                validationRate: (validChurches.length / this.churches.length * 100).toFixed(1),
                averageScore: (this.churches.reduce((sum, c) => sum + (c.validation_score || 0), 0) / this.churches.length).toFixed(1)
            };
            
            // Generate validation report
            const validationReport = this.intelligentValidator.generateValidationReport(this.churches);
            
            this.logger.info('✅ Intelligent validation completed', this.statistics.validationResults);
            
            // Save validation report
            await this.saveValidationReport(validationReport);
            
            return validationResults;
            
        } catch (error) {
            this.logger.error('Intelligent validation failed', { error: error.message });
            this.errors.push({
                type: 'intelligent_validation',
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    async saveValidationReport(report) {
        try {
            const reportFile = path.join(this.options.outputDir, 'validation-report.json');
            await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
            this.logger.info('📋 Validation report saved', { file: reportFile });
        } catch (error) {
            this.logger.error('Failed to save validation report', { error: error.message });
        }
    }
}

module.exports = ChurchDirectoryBuilder;
