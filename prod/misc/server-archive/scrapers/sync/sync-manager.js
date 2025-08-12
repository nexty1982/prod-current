// 📁 server/scrapers/sync/sync-manager.js
// Step 4: Automated Data Synchronization System

const cron = require('node-cron');
const mysql = require('mysql2/promise');
const ChurchDirectoryBuilder = require('../index');

class SyncManager {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.dbConfig = options.dbConfig || {};
        this.syncSchedules = new Map();
        this.isRunning = false;
        this.pool = null;
        
        // Default sync configurations
        this.defaultSchedules = [
            {
                name: 'daily_incremental',
                cron: '0 2 * * *', // Daily at 2 AM
                operation: 'incremental',
                jurisdictions: ['all']
            },
            {
                name: 'weekly_full_sync',
                cron: '0 1 * * 0', // Weekly on Sunday at 1 AM
                operation: 'full_sync',
                jurisdictions: ['all']
            },
            {
                name: 'daily_validation',
                cron: '0 3 * * *', // Daily at 3 AM
                operation: 'validation_only',
                jurisdictions: ['all']
            }
        ];
    }

    async initialize() {
        try {
            // Initialize database connection
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

            this.logger.info('🔄 Sync Manager initialized');
            
            // Load sync schedules from database
            await this.loadSyncSchedules();
            
            // Start the sync scheduler
            await this.startScheduler();
            
        } catch (error) {
            this.logger.error('Failed to initialize Sync Manager', { error: error.message });
            throw error;
        }
    }

    async loadSyncSchedules() {
        try {
            const [schedules] = await this.pool.execute(`
                SELECT * FROM sync_schedules 
                WHERE is_active = TRUE
                ORDER BY schedule_name
            `);

            // If no schedules exist, create default ones
            if (schedules.length === 0) {
                this.logger.info('No sync schedules found, creating defaults...');
                await this.createDefaultSchedules();
                return this.loadSyncSchedules();
            }

            // Load schedules into memory
            for (const schedule of schedules) {
                this.syncSchedules.set(schedule.schedule_name, {
                    ...schedule,
                    source_jurisdictions: JSON.parse(schedule.source_jurisdictions || '["all"]'),
                    config_options: JSON.parse(schedule.config_options || '{}')
                });
            }

            this.logger.info(`📅 Loaded ${schedules.length} sync schedules`);
            
        } catch (error) {
            this.logger.error('Failed to load sync schedules', { error: error.message });
            throw error;
        }
    }

    async createDefaultSchedules() {
        for (const schedule of this.defaultSchedules) {
            await this.pool.execute(`
                INSERT INTO sync_schedules (
                    schedule_name, operation_type, cron_expression, 
                    source_jurisdictions, config_options
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                schedule.name,
                schedule.operation,
                schedule.cron,
                JSON.stringify(schedule.jurisdictions),
                JSON.stringify({})
            ]);
        }
        
        this.logger.info('✅ Default sync schedules created');
    }

    async startScheduler() {
        if (this.isRunning) {
            this.logger.warn('Sync scheduler is already running');
            return;
        }

        this.isRunning = true;
        this.logger.info('🚀 Starting automated sync scheduler...');

        // Schedule each sync operation
        for (const [name, schedule] of this.syncSchedules) {
            this.logger.info(`📅 Scheduling: ${name} (${schedule.cron_expression})`);
            
            cron.schedule(schedule.cron_expression, async () => {
                await this.executeSyncOperation(schedule);
            }, {
                scheduled: true,
                timezone: "America/New_York" // Adjust as needed
            });
        }

        // Update next run times in database
        await this.updateNextRunTimes();
        
        this.logger.info('✅ Sync scheduler started successfully');
    }

    async executeSyncOperation(schedule) {
        const operationId = await this.startSyncOperation(schedule);
        
        try {
            this.logger.info(`🔄 Starting sync operation: ${schedule.schedule_name}`);
            
            let result;
            
            switch (schedule.operation_type) {
                case 'full_sync':
                    result = await this.performFullSync(schedule, operationId);
                    break;
                case 'incremental':
                    result = await this.performIncrementalSync(schedule, operationId);
                    break;
                case 'validation_only':
                    result = await this.performValidationSync(schedule, operationId);
                    break;
                default:
                    throw new Error(`Unknown operation type: ${schedule.operation_type}`);
            }
            
            await this.completeSyncOperation(operationId, result);
            await this.updateLastRunTime(schedule.id);
            
            this.logger.info(`✅ Sync operation completed: ${schedule.schedule_name}`, result);
            
        } catch (error) {
            this.logger.error(`❌ Sync operation failed: ${schedule.schedule_name}`, { 
                error: error.message 
            });
            await this.failSyncOperation(operationId, error.message);
        }
    }

    async performFullSync(schedule, operationId) {
        this.logger.info('🔄 Performing full synchronization...');
        
        // Create new directory builder instance
        const builder = new ChurchDirectoryBuilder({
            logger: this.logger,
            saveToDatabase: true,
            databaseConfig: this.dbConfig,
            validateUrls: true,
            enableDuplicateDetection: true
        });

        // Run complete scraping and validation
        const result = await builder.runAutonomousScraping();
        
        // Update sync operation stats
        await this.pool.execute(`
            UPDATE sync_operations 
            SET records_processed = ?, records_updated = ?, records_added = ?
            WHERE id = ?
        `, [
            result.statistics.totalChurches,
            result.statistics.totalChurches, // For full sync, consider all as updates
            0, // New records handled by scraper
            operationId
        ]);

        return {
            type: 'full_sync',
            totalChurches: result.statistics.totalChurches,
            validationRate: result.statistics.validationResults?.validationRate || 'N/A',
            duration: `${(result.statistics.scrapeEndTime - result.statistics.scrapeStartTime) / 1000}s`
        };
    }

    async performIncrementalSync(schedule, operationId) {
        this.logger.info('🔄 Performing incremental synchronization...');
        
        // Detect changes since last sync
        await this.pool.execute('CALL DetectChangesForSync()');
        
        // Get records that need syncing
        const [pendingRecords] = await this.pool.execute(`
            SELECT id, name, jurisdiction, sync_status 
            FROM orthodox_churches 
            WHERE sync_status = 'pending'
            LIMIT 1000
        `);

        let updatedCount = 0;
        
        // Process pending records (simplified - in production, would re-scrape specific churches)
        for (const record of pendingRecords) {
            try {
                // Update sync hash and mark as synced
                await this.pool.execute('CALL CalculateSyncHash(?)', [record.id]);
                
                await this.pool.execute(`
                    UPDATE orthodox_churches 
                    SET sync_status = 'synced', last_sync_date = NOW()
                    WHERE id = ?
                `, [record.id]);
                
                updatedCount++;
            } catch (error) {
                this.logger.warn(`Failed to sync record ${record.id}`, { error: error.message });
                
                await this.pool.execute(`
                    UPDATE orthodox_churches 
                    SET sync_status = 'error'
                    WHERE id = ?
                `, [record.id]);
            }
        }

        // Update sync operation stats
        await this.pool.execute(`
            UPDATE sync_operations 
            SET records_processed = ?, records_updated = ?
            WHERE id = ?
        `, [pendingRecords.length, updatedCount, operationId]);

        return {
            type: 'incremental',
            recordsProcessed: pendingRecords.length,
            recordsUpdated: updatedCount,
            recordsSkipped: pendingRecords.length - updatedCount
        };
    }

    async performValidationSync(schedule, operationId) {
        this.logger.info('🔄 Performing validation-only synchronization...');
        
        // Get records that need validation
        const [records] = await this.pool.execute(`
            SELECT * FROM orthodox_churches 
            WHERE validation_date IS NULL 
               OR validation_date < DATE_SUB(NOW(), INTERVAL 30 DAY)
            LIMIT 500
        `);

        if (records.length === 0) {
            return {
                type: 'validation_only',
                recordsProcessed: 0,
                message: 'All records are up to date'
            };
        }

        // Create intelligent validator
        const IntelligentValidator = require('../utils/intelligent-validator');
        const validator = new IntelligentValidator({ logger: this.logger });
        
        // Run validation on records
        const validationResults = await validator.validateChurchData(records);
        
        let validatedCount = 0;
        
        // Update validation results in database
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const validation = validationResults[i];
            
            try {
                await this.pool.execute(`
                    UPDATE orthodox_churches 
                    SET is_validated = ?, validation_score = ?, 
                        validation_flags = ?, validation_date = NOW()
                    WHERE id = ?
                `, [
                    validation.isValid,
                    validation.score,
                    JSON.stringify(validation.flags),
                    record.id
                ]);
                
                validatedCount++;
            } catch (error) {
                this.logger.warn(`Failed to update validation for record ${record.id}`, { 
                    error: error.message 
                });
            }
        }

        // Update sync operation stats
        await this.pool.execute(`
            UPDATE sync_operations 
            SET records_processed = ?, records_updated = ?
            WHERE id = ?
        `, [records.length, validatedCount, operationId]);

        return {
            type: 'validation_only',
            recordsProcessed: records.length,
            recordsValidated: validatedCount,
            averageScore: validationResults.reduce((sum, v) => sum + v.score, 0) / validationResults.length
        };
    }

    async startSyncOperation(schedule) {
        const [result] = await this.pool.execute(`
            INSERT INTO sync_operations (
                operation_type, source_system, target_system, status
            ) VALUES (?, ?, ?, ?)
        `, [
            schedule.operation_type,
            'church_scraper',
            'orthodoxmetrics_db',
            'running'
        ]);
        
        return result.insertId;
    }

    async completeSyncOperation(operationId, result) {
        await this.pool.execute(`
            UPDATE sync_operations 
            SET status = 'completed', completed_at = NOW()
            WHERE id = ?
        `, [operationId]);
    }

    async failSyncOperation(operationId, errorMessage) {
        await this.pool.execute(`
            UPDATE sync_operations 
            SET status = 'failed', completed_at = NOW(), error_message = ?
            WHERE id = ?
        `, [errorMessage, operationId]);
    }

    async updateLastRunTime(scheduleId) {
        await this.pool.execute(`
            UPDATE sync_schedules 
            SET last_run = NOW()
            WHERE id = ?
        `, [scheduleId]);
    }

    async updateNextRunTimes() {
        // This is a simplified version - in production, you'd calculate actual next run times
        for (const [name, schedule] of this.syncSchedules) {
            await this.pool.execute(`
                UPDATE sync_schedules 
                SET next_run = DATE_ADD(NOW(), INTERVAL 1 DAY)
                WHERE id = ?
            `, [schedule.id]);
        }
    }

    async getSyncStatus() {
        const [operations] = await this.pool.execute(`
            SELECT operation_type, status, COUNT(*) as count,
                   AVG(TIMESTAMPDIFF(MINUTE, started_at, completed_at)) as avg_duration_minutes
            FROM sync_operations 
            WHERE started_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY operation_type, status
            ORDER BY operation_type, status
        `);

        const [schedules] = await this.pool.execute(`
            SELECT schedule_name, operation_type, last_run, next_run, is_active
            FROM sync_schedules
            ORDER BY schedule_name
        `);

        return {
            recentOperations: operations,
            schedules: schedules,
            schedulerStatus: this.isRunning ? 'running' : 'stopped'
        };
    }

    async stopScheduler() {
        this.isRunning = false;
        this.logger.info('🛑 Sync scheduler stopped');
    }

    async close() {
        await this.stopScheduler();
        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = SyncManager;
