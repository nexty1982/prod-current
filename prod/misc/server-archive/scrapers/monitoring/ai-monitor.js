// 📁 server/scrapers/monitoring/ai-monitor.js
// Step 6: Logging and Monitoring - AI-powered anomaly detection

const winston = require('winston');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;

class AIMonitor {
    constructor(options = {}) {
        this.dbConfig = options.dbConfig || {};
        this.alertThresholds = {
            scraperFailureRate: 0.1, // 10% failure rate
            dataQualityDrop: 0.2, // 20% drop in quality
            duplicateIncrease: 0.3, // 30% increase in duplicates
            validationFailureRate: 0.15, // 15% validation failure
            syncDelayHours: 48, // 48 hours without sync
            ...options.alertThresholds
        };
        
        this.setupLogger();
        this.pool = null;
        this.isMonitoring = false;
        this.anomalies = [];
        this.lastAnalysis = null;
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: path.join(__dirname, '../logs/ai-monitor.log') 
                }),
                new winston.transports.File({ 
                    filename: path.join(__dirname, '../logs/anomalies.log'),
                    level: 'warn'
                })
            ]
        });
    }

    async initialize() {
        try {
            this.pool = mysql.createPool({
                ...this.dbConfig,
                waitForConnections: true,
                connectionLimit: 5,
                queueLimit: 0
            });

            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            this.logger.info('🤖 AI Monitor initialized successfully');
            await this.createMonitoringTables();
            
        } catch (error) {
            this.logger.error('Failed to initialize AI Monitor', { error: error.message });
            throw error;
        }
    }

    async createMonitoringTables() {
        try {
            await this.pool.execute(`
                CREATE TABLE IF NOT EXISTS monitoring_alerts (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    alert_type VARCHAR(100) NOT NULL,
                    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    data_snapshot JSON,
                    threshold_value DECIMAL(10,4),
                    actual_value DECIMAL(10,4),
                    status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP NULL,
                    
                    INDEX idx_alert_type (alert_type),
                    INDEX idx_severity (severity),
                    INDEX idx_status (status),
                    INDEX idx_created_at (created_at)
                )
            `);

            await this.pool.execute(`
                CREATE TABLE IF NOT EXISTS monitoring_metrics (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    metric_name VARCHAR(100) NOT NULL,
                    metric_value DECIMAL(15,4) NOT NULL,
                    metric_category VARCHAR(50) NOT NULL,
                    data_context JSON,
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    INDEX idx_metric_name (metric_name),
                    INDEX idx_category (metric_category),
                    INDEX idx_recorded_at (recorded_at)
                )
            `);

            this.logger.info('📊 Monitoring tables created/verified');
            
        } catch (error) {
            this.logger.error('Failed to create monitoring tables', { error: error.message });
            throw error;
        }
    }

    async startMonitoring(intervalMinutes = 30) {
        if (this.isMonitoring) {
            this.logger.warn('Monitoring is already running');
            return;
        }

        this.isMonitoring = true;
        this.logger.info(`🔍 Starting AI monitoring with ${intervalMinutes} minute intervals`);

        // Run initial analysis
        await this.runAnalysis();

        // Set up recurring analysis
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.runAnalysis();
            } catch (error) {
                this.logger.error('Monitoring analysis failed', { error: error.message });
            }
        }, intervalMinutes * 60 * 1000);

        return this.monitoringInterval;
    }

    async runAnalysis() {
        this.logger.info('🔬 Running intelligent anomaly analysis...');
        
        try {
            const analysisResults = {
                timestamp: new Date(),
                metrics: {},
                anomalies: [],
                recommendations: []
            };

            // 1. Scraper Performance Analysis
            const scraperMetrics = await this.analyzeScraperPerformance();
            analysisResults.metrics.scraper = scraperMetrics;
            if (scraperMetrics.anomalies.length > 0) {
                analysisResults.anomalies.push(...scraperMetrics.anomalies);
            }

            // 2. Data Quality Analysis
            const qualityMetrics = await this.analyzeDataQuality();
            analysisResults.metrics.quality = qualityMetrics;
            if (qualityMetrics.anomalies.length > 0) {
                analysisResults.anomalies.push(...qualityMetrics.anomalies);
            }

            // 3. Sync System Analysis
            const syncMetrics = await this.analyzeSyncSystem();
            analysisResults.metrics.sync = syncMetrics;
            if (syncMetrics.anomalies.length > 0) {
                analysisResults.anomalies.push(...syncMetrics.anomalies);
            }

            // 4. Database Performance Analysis
            const dbMetrics = await this.analyzeDatabasePerformance();
            analysisResults.metrics.database = dbMetrics;
            if (dbMetrics.anomalies.length > 0) {
                analysisResults.anomalies.push(...dbMetrics.anomalies);
            }

            // 5. Generate AI-powered recommendations
            analysisResults.recommendations = await this.generateRecommendations(analysisResults.metrics);

            // Store metrics
            await this.storeMetrics(analysisResults.metrics);

            // Process anomalies and create alerts
            if (analysisResults.anomalies.length > 0) {
                await this.processAnomalies(analysisResults.anomalies);
            }

            this.lastAnalysis = analysisResults;
            
            this.logger.info('✅ Analysis completed', {
                metricsCollected: Object.keys(analysisResults.metrics).length,
                anomaliesDetected: analysisResults.anomalies.length,
                recommendationsGenerated: analysisResults.recommendations.length
            });

            return analysisResults;

        } catch (error) {
            this.logger.error('Analysis failed', { error: error.message });
            throw error;
        }
    }

    async analyzeScraperPerformance() {
        const metrics = {
            anomalies: [],
            stats: {}
        };

        try {
            // Get recent scraping sessions
            const [sessions] = await this.pool.execute(`
                SELECT *
                FROM scraping_sessions 
                WHERE session_start > DATE_SUB(NOW(), INTERVAL 7 DAY)
                ORDER BY session_start DESC
            `);

            if (sessions.length === 0) {
                metrics.anomalies.push({
                    type: 'scraper_silence',
                    severity: 'critical',
                    message: 'No scraping sessions found in the last 7 days'
                });
                return metrics;
            }

            const failedSessions = sessions.filter(s => s.status === 'failed');
            const failureRate = failedSessions.length / sessions.length;

            metrics.stats = {
                totalSessions: sessions.length,
                failedSessions: failedSessions.length,
                failureRate: failureRate,
                avgChurchesPerSession: sessions.reduce((sum, s) => sum + (s.total_churches_scraped || 0), 0) / sessions.length,
                avgDurationMinutes: sessions
                    .filter(s => s.session_end)
                    .reduce((sum, s) => sum + Math.abs(new Date(s.session_end) - new Date(s.session_start)), 0) / sessions.length / 1000 / 60
            };

            // Check for anomalies
            if (failureRate > this.alertThresholds.scraperFailureRate) {
                metrics.anomalies.push({
                    type: 'high_failure_rate',
                    severity: failureRate > 0.5 ? 'critical' : 'high',
                    message: `Scraper failure rate (${(failureRate * 100).toFixed(1)}%) exceeds threshold (${(this.alertThresholds.scraperFailureRate * 100).toFixed(1)}%)`,
                    value: failureRate,
                    threshold: this.alertThresholds.scraperFailureRate
                });
            }

            // Check for performance degradation
            const recentSessions = sessions.slice(0, 3);
            const olderSessions = sessions.slice(3, 6);
            
            if (recentSessions.length > 0 && olderSessions.length > 0) {
                const recentAvg = recentSessions.reduce((sum, s) => sum + (s.total_churches_scraped || 0), 0) / recentSessions.length;
                const olderAvg = olderSessions.reduce((sum, s) => sum + (s.total_churches_scraped || 0), 0) / olderSessions.length;
                
                if (recentAvg < olderAvg * 0.8) { // 20% drop
                    metrics.anomalies.push({
                        type: 'performance_degradation',
                        severity: 'medium',
                        message: `Recent scraping performance has dropped by ${((1 - recentAvg/olderAvg) * 100).toFixed(1)}%`,
                        value: recentAvg,
                        previousValue: olderAvg
                    });
                }
            }

        } catch (error) {
            this.logger.error('Scraper analysis failed', { error: error.message });
            metrics.anomalies.push({
                type: 'analysis_error',
                severity: 'medium',
                message: `Scraper analysis failed: ${error.message}`
            });
        }

        return metrics;
    }

    async analyzeDataQuality() {
        const metrics = {
            anomalies: [],
            stats: {}
        };

        try {
            // Get data quality metrics
            const [qualityData] = await this.pool.execute(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN is_validated = TRUE THEN 1 END) as validated_records,
                    AVG(validation_score) as avg_validation_score,
                    AVG(data_quality_score) as avg_data_quality_score,
                    COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as records_with_websites,
                    COUNT(CASE WHEN validation_flags IS NOT NULL AND JSON_LENGTH(validation_flags) > 0 THEN 1 END) as flagged_records
                FROM orthodox_churches 
                WHERE parish_status = 'active'
            `);

            const stats = qualityData[0];
            const validationRate = stats.validated_records / stats.total_records;

            metrics.stats = {
                totalRecords: stats.total_records,
                validationRate: validationRate,
                avgValidationScore: parseFloat(stats.avg_validation_score || 0),
                avgDataQualityScore: parseFloat(stats.avg_data_quality_score || 0),
                websiteCompleteness: stats.records_with_websites / stats.total_records,
                flaggedRecordsRate: stats.flagged_records / stats.total_records
            };

            // Check for quality degradation
            if (validationRate < 0.8) { // Less than 80% validated
                metrics.anomalies.push({
                    type: 'low_validation_rate',
                    severity: validationRate < 0.6 ? 'high' : 'medium',
                    message: `Validation rate (${(validationRate * 100).toFixed(1)}%) is below acceptable threshold`,
                    value: validationRate,
                    threshold: 0.8
                });
            }

            if (metrics.stats.avgValidationScore < 70) {
                metrics.anomalies.push({
                    type: 'low_validation_scores',
                    severity: 'medium',
                    message: `Average validation score (${metrics.stats.avgValidationScore.toFixed(1)}) is below threshold`,
                    value: metrics.stats.avgValidationScore,
                    threshold: 70
                });
            }

            // Check for unusual number of flagged records
            if (metrics.stats.flaggedRecordsRate > 0.2) { // More than 20% flagged
                metrics.anomalies.push({
                    type: 'high_flagged_rate',
                    severity: 'medium',
                    message: `High rate of flagged records (${(metrics.stats.flaggedRecordsRate * 100).toFixed(1)}%)`,
                    value: metrics.stats.flaggedRecordsRate,
                    threshold: 0.2
                });
            }

        } catch (error) {
            this.logger.error('Data quality analysis failed', { error: error.message });
            metrics.anomalies.push({
                type: 'analysis_error',
                severity: 'medium',
                message: `Data quality analysis failed: ${error.message}`
            });
        }

        return metrics;
    }

    async analyzeSyncSystem() {
        const metrics = {
            anomalies: [],
            stats: {}
        };

        try {
            // Get sync operations
            const [syncOps] = await this.pool.execute(`
                SELECT *
                FROM sync_operations 
                WHERE started_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                ORDER BY started_at DESC
            `);

            const [pendingRecords] = await this.pool.execute(`
                SELECT COUNT(*) as pending_count
                FROM orthodox_churches 
                WHERE sync_status = 'pending'
            `);

            const [conflictRecords] = await this.pool.execute(`
                SELECT COUNT(*) as conflict_count
                FROM orthodox_churches 
                WHERE sync_status = 'conflict'
            `);

            metrics.stats = {
                totalSyncOps: syncOps.length,
                failedSyncOps: syncOps.filter(op => op.status === 'failed').length,
                pendingRecords: pendingRecords[0].pending_count,
                conflictRecords: conflictRecords[0].conflict_count
            };

            // Check for sync issues
            if (metrics.stats.pendingRecords > 100) {
                metrics.anomalies.push({
                    type: 'high_pending_records',
                    severity: 'medium',
                    message: `High number of pending sync records (${metrics.stats.pendingRecords})`,
                    value: metrics.stats.pendingRecords,
                    threshold: 100
                });
            }

            if (metrics.stats.conflictRecords > 10) {
                metrics.anomalies.push({
                    type: 'sync_conflicts',
                    severity: 'high',
                    message: `Sync conflicts detected (${metrics.stats.conflictRecords} records)`,
                    value: metrics.stats.conflictRecords,
                    threshold: 10
                });
            }

            // Check for failed sync operations
            const failureRate = syncOps.length > 0 ? metrics.stats.failedSyncOps / syncOps.length : 0;
            if (failureRate > 0.1) {
                metrics.anomalies.push({
                    type: 'sync_failure_rate',
                    severity: 'medium',
                    message: `High sync operation failure rate (${(failureRate * 100).toFixed(1)}%)`,
                    value: failureRate,
                    threshold: 0.1
                });
            }

        } catch (error) {
            this.logger.error('Sync system analysis failed', { error: error.message });
            metrics.anomalies.push({
                type: 'analysis_error',
                severity: 'medium',
                message: `Sync analysis failed: ${error.message}`
            });
        }

        return metrics;
    }

    async analyzeDatabasePerformance() {
        const metrics = {
            anomalies: [],
            stats: {}
        };

        try {
            // Get database stats
            const [tableStats] = await this.pool.execute(`
                SELECT 
                    table_name,
                    table_rows,
                    data_length,
                    index_length,
                    (data_length + index_length) as total_size
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                  AND table_name IN ('orthodox_churches', 'scraping_sessions', 'sync_operations')
            `);

            metrics.stats = {
                tables: tableStats.reduce((acc, table) => {
                    acc[table.table_name] = {
                        rows: table.table_rows,
                        dataSize: table.data_length,
                        indexSize: table.index_length,
                        totalSize: table.total_size
                    };
                    return acc;
                }, {})
            };

            // Check for unusual growth patterns
            const churchTable = metrics.stats.orthodox_churches;
            if (churchTable && churchTable.rows > 50000) {
                metrics.anomalies.push({
                    type: 'large_table_size',
                    severity: 'low',
                    message: `Orthodox churches table has grown large (${churchTable.rows} rows)`,
                    value: churchTable.rows,
                    threshold: 50000
                });
            }

        } catch (error) {
            this.logger.error('Database analysis failed', { error: error.message });
            metrics.anomalies.push({
                type: 'analysis_error',
                severity: 'medium',
                message: `Database analysis failed: ${error.message}`
            });
        }

        return metrics;
    }

    async generateRecommendations(metrics) {
        const recommendations = [];

        // Scraper recommendations
        if (metrics.scraper?.stats?.failureRate > 0.05) {
            recommendations.push({
                category: 'scraper',
                priority: 'high',
                title: 'Improve Scraper Reliability',
                description: 'Consider implementing retry logic and better error handling for scrapers',
                action: 'Review recent scraper errors and implement fixes'
            });
        }

        // Data quality recommendations
        if (metrics.quality?.stats?.validationRate < 0.9) {
            recommendations.push({
                category: 'quality',
                priority: 'medium',
                title: 'Enhance Data Validation',
                description: 'Improve validation rules to increase data quality scores',
                action: 'Review and update intelligent validation algorithms'
            });
        }

        // Performance recommendations
        if (metrics.database?.stats?.tables?.orthodox_churches?.rows > 10000) {
            recommendations.push({
                category: 'performance',
                priority: 'low',
                title: 'Consider Data Archiving',
                description: 'Large dataset may benefit from archiving old records',
                action: 'Implement data archiving strategy for inactive parishes'
            });
        }

        // Sync recommendations
        if (metrics.sync?.stats?.conflictRecords > 5) {
            recommendations.push({
                category: 'sync',
                priority: 'high',
                title: 'Resolve Sync Conflicts',
                description: 'Multiple sync conflicts require immediate attention',
                action: 'Review and resolve sync conflicts manually'
            });
        }

        return recommendations;
    }

    async storeMetrics(metrics) {
        try {
            const metricsToStore = [];

            // Flatten metrics for storage
            Object.entries(metrics).forEach(([category, data]) => {
                if (data.stats) {
                    Object.entries(data.stats).forEach(([metricName, value]) => {
                        if (typeof value === 'number') {
                            metricsToStore.push([
                                `${category}_${metricName}`,
                                value,
                                category,
                                JSON.stringify({ category, metricName })
                            ]);
                        }
                    });
                }
            });

            if (metricsToStore.length > 0) {
                await this.pool.execute(`
                    INSERT INTO monitoring_metrics (metric_name, metric_value, metric_category, data_context)
                    VALUES ${metricsToStore.map(() => '(?, ?, ?, ?)').join(', ')}
                `, metricsToStore.flat());
            }

        } catch (error) {
            this.logger.error('Failed to store metrics', { error: error.message });
        }
    }

    async processAnomalies(anomalies) {
        for (const anomaly of anomalies) {
            try {
                // Check if similar alert already exists and is active
                const [existing] = await this.pool.execute(`
                    SELECT id FROM monitoring_alerts 
                    WHERE alert_type = ? AND status = 'active'
                    AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                `, [anomaly.type]);

                if (existing.length === 0) {
                    // Create new alert
                    await this.pool.execute(`
                        INSERT INTO monitoring_alerts (
                            alert_type, severity, title, description, 
                            data_snapshot, threshold_value, actual_value
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        anomaly.type,
                        anomaly.severity,
                        anomaly.message,
                        JSON.stringify(anomaly),
                        JSON.stringify({ timestamp: new Date(), anomaly }),
                        anomaly.threshold || null,
                        anomaly.value || null
                    ]);

                    this.logger.warn('🚨 Anomaly detected', anomaly);
                }

            } catch (error) {
                this.logger.error('Failed to process anomaly', { 
                    anomaly, 
                    error: error.message 
                });
            }
        }
    }

    async getMonitoringReport() {
        try {
            const [activeAlerts] = await this.pool.execute(`
                SELECT * FROM monitoring_alerts 
                WHERE status = 'active'
                ORDER BY severity DESC, created_at DESC
            `);

            const [recentMetrics] = await this.pool.execute(`
                SELECT metric_category, COUNT(*) as metric_count,
                       AVG(metric_value) as avg_value
                FROM monitoring_metrics 
                WHERE recorded_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY metric_category
            `);

            return {
                activeAlerts: activeAlerts.length,
                alertsByCategory: activeAlerts.reduce((acc, alert) => {
                    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
                    return acc;
                }, {}),
                recentMetrics: recentMetrics,
                lastAnalysis: this.lastAnalysis?.timestamp || null,
                systemStatus: activeAlerts.filter(a => a.severity === 'critical').length > 0 ? 'critical' :
                            activeAlerts.filter(a => a.severity === 'high').length > 0 ? 'warning' : 'healthy'
            };

        } catch (error) {
            this.logger.error('Failed to generate monitoring report', { error: error.message });
            throw error;
        }
    }

    async stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.logger.info('🛑 AI monitoring stopped');
    }

    async close() {
        await this.stopMonitoring();
        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = AIMonitor;
