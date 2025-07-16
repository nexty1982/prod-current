// 📁 server/scrapers/monitoring/monitoring-integration.js
// Step 6: Integration of monitoring system with main server

const AIMonitor = require('./ai-monitor');
const MonitoringDashboard = require('./dashboard-api');
const AlertSystem = require('./alert-system');
const winston = require('winston');
const path = require('path');

class MonitoringIntegration {
    constructor(options = {}) {
        this.dbConfig = options.dbConfig || {};
        this.alertConfig = options.alertConfig || {};
        this.monitoringConfig = options.monitoringConfig || {};
        
        this.aiMonitor = null;
        this.alertSystem = null;
        this.dashboard = null;
        this.isInitialized = false;
        
        this.setupLogger();
    }

    setupLogger() {
        // Ensure logs directory exists
        const logsDir = path.join(__dirname, '../logs');
        require('fs').mkdirSync(logsDir, { recursive: true });

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
                        winston.format.printf(({ timestamp, level, message, ...meta }) => {
                            return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                        })
                    )
                }),
                new winston.transports.File({ 
                    filename: path.join(logsDir, 'monitoring-integration.log'),
                    maxsize: 10485760, // 10MB
                    maxFiles: 5,
                    tailable: true
                }),
                new winston.transports.File({ 
                    filename: path.join(logsDir, 'monitoring-errors.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 3
                })
            ]
        });
    }

    async initialize() {
        try {
            this.logger.info('🚀 Initializing Orthodox Metrics Monitoring System...');

            // Initialize AI Monitor
            this.aiMonitor = new AIMonitor({
                dbConfig: this.dbConfig,
                alertThresholds: this.monitoringConfig.thresholds || {}
            });
            await this.aiMonitor.initialize();
            this.logger.info('✅ AI Monitor initialized');

            // Initialize Alert System
            this.alertSystem = new AlertSystem({
                email: this.alertConfig.email || {},
                slack: this.alertConfig.slack || {},
                thresholds: this.alertConfig.thresholds || {}
            });
            this.logger.info('✅ Alert System initialized');

            // Initialize Monitoring Dashboard
            this.dashboard = new MonitoringDashboard(this.aiMonitor);
            this.logger.info('✅ Monitoring Dashboard initialized');

            // Connect alert system to AI monitor
            this.connectAlertSystem();

            this.isInitialized = true;
            this.logger.info('🎯 Orthodox Metrics Monitoring System fully initialized');

            return true;

        } catch (error) {
            this.logger.error('❌ Failed to initialize monitoring system', { 
                error: error.message,
                stack: error.stack 
            });
            throw error;
        }
    }

    connectAlertSystem() {
        // Override the AI monitor's processAnomalies method to include alert sending
        const originalProcessAnomalies = this.aiMonitor.processAnomalies.bind(this.aiMonitor);
        
        this.aiMonitor.processAnomalies = async (anomalies) => {
            // Process anomalies normally (store in database)
            await originalProcessAnomalies(anomalies);
            
            // Send alerts for each anomaly
            for (const anomaly of anomalies) {
                try {
                    await this.alertSystem.sendAlert({
                        id: `${anomaly.type}_${Date.now()}`,
                        type: anomaly.type,
                        severity: anomaly.severity,
                        title: this.generateAlertTitle(anomaly),
                        message: anomaly.message,
                        description: this.generateAlertDescription(anomaly),
                        value: anomaly.value,
                        threshold: anomaly.threshold,
                        timestamp: new Date()
                    });
                } catch (alertError) {
                    this.logger.error('Failed to send alert', { 
                        anomaly: anomaly.type,
                        error: alertError.message 
                    });
                }
            }
        };
    }

    generateAlertTitle(anomaly) {
        const titles = {
            high_failure_rate: 'High Scraper Failure Rate Detected',
            low_validation_rate: 'Data Validation Rate Below Threshold',
            sync_conflicts: 'Database Sync Conflicts Detected',
            performance_degradation: 'System Performance Degradation',
            high_pending_records: 'High Number of Pending Sync Records',
            scraper_silence: 'Scraper System Inactive',
            low_validation_scores: 'Low Data Validation Scores',
            high_flagged_rate: 'High Rate of Flagged Records',
            sync_failure_rate: 'High Sync Operation Failure Rate',
            large_table_size: 'Database Table Size Growing Large'
        };
        
        return titles[anomaly.type] || `System Alert: ${anomaly.type}`;
    }

    generateAlertDescription(anomaly) {
        const baseDescription = anomaly.message || 'System anomaly detected requiring attention.';
        
        let description = baseDescription;
        
        if (anomaly.value !== undefined && anomaly.threshold !== undefined) {
            description += ` Current value: ${anomaly.value}, Threshold: ${anomaly.threshold}.`;
        }
        
        description += ' Please review the monitoring dashboard for more details and take appropriate action.';
        
        return description;
    }

    async startMonitoring(intervalMinutes = 30) {
        if (!this.isInitialized) {
            throw new Error('Monitoring system not initialized. Call initialize() first.');
        }

        this.logger.info(`📊 Starting continuous monitoring (${intervalMinutes} minute intervals)`);
        
        // Start AI monitoring
        await this.aiMonitor.startMonitoring(intervalMinutes);
        
        this.logger.info('🔄 Continuous monitoring active');
        
        return {
            status: 'active',
            interval: intervalMinutes,
            startTime: new Date()
        };
    }

    async stopMonitoring() {
        if (this.aiMonitor) {
            await this.aiMonitor.stopMonitoring();
        }
        this.logger.info('🛑 Monitoring stopped');
    }

    getDashboardRouter() {
        if (!this.dashboard) {
            throw new Error('Dashboard not initialized');
        }
        return this.dashboard.getRouter();
    }

    async getSystemStatus() {
        if (!this.isInitialized) {
            return {
                status: 'not_initialized',
                message: 'Monitoring system not initialized'
            };
        }

        try {
            const report = await this.aiMonitor.getMonitoringReport();
            
            return {
                status: 'operational',
                systemHealth: report.systemStatus,
                activeAlerts: report.activeAlerts,
                lastAnalysis: report.lastAnalysis,
                uptime: process.uptime(),
                components: {
                    aiMonitor: this.aiMonitor.isMonitoring ? 'active' : 'inactive',
                    alertSystem: 'active',
                    dashboard: 'active'
                },
                timestamp: new Date()
            };
            
        } catch (error) {
            this.logger.error('Failed to get system status', { error: error.message });
            return {
                status: 'error',
                message: 'Failed to retrieve system status',
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    async runManualAnalysis() {
        if (!this.aiMonitor) {
            throw new Error('AI Monitor not initialized');
        }

        this.logger.info('🔍 Running manual analysis...');
        const results = await this.aiMonitor.runAnalysis();
        this.logger.info('✅ Manual analysis completed', {
            anomalies: results.anomalies.length,
            recommendations: results.recommendations.length
        });
        
        return results;
    }

    async testAlertSystem() {
        if (!this.alertSystem) {
            throw new Error('Alert system not initialized');
        }

        this.logger.info('🧪 Testing alert system...');
        await this.alertSystem.testAlerts();
        this.logger.info('✅ Alert system test completed');
    }

    async shutdown() {
        this.logger.info('🔌 Shutting down monitoring system...');
        
        try {
            await this.stopMonitoring();
            
            if (this.aiMonitor) {
                await this.aiMonitor.close();
            }
            
            this.logger.info('✅ Monitoring system shutdown complete');
            
        } catch (error) {
            this.logger.error('Error during shutdown', { error: error.message });
        }
    }

    // Health check endpoint helper
    async healthCheck() {
        try {
            const status = await this.getSystemStatus();
            
            return {
                healthy: status.status === 'operational' && status.systemHealth !== 'critical',
                status: status.systemHealth || 'unknown',
                details: {
                    activeAlerts: status.activeAlerts || 0,
                    lastCheck: status.lastAnalysis,
                    uptime: status.uptime || 0,
                    components: status.components || {}
                },
                timestamp: new Date()
            };
            
        } catch (error) {
            return {
                healthy: false,
                status: 'error',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

module.exports = MonitoringIntegration;
