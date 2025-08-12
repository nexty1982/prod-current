// 📁 server/scrapers/monitoring/dashboard-api.js
// Step 6: Monitoring Dashboard API endpoints

const express = require('express');
const router = express.Router();

class MonitoringDashboard {
    constructor(aiMonitor) {
        this.monitor = aiMonitor;
        this.setupRoutes();
    }

    setupRoutes() {
        // Get overall system health
        router.get('/health', async (req, res) => {
            try {
                const report = await this.monitor.getMonitoringReport();
                res.json({
                    status: 'success',
                    data: {
                        systemStatus: report.systemStatus,
                        activeAlerts: report.activeAlerts,
                        lastCheck: report.lastAnalysis,
                        uptime: process.uptime(),
                        timestamp: new Date()
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to get system health',
                    error: error.message
                });
            }
        });

        // Get detailed monitoring report
        router.get('/report', async (req, res) => {
            try {
                const report = await this.monitor.getMonitoringReport();
                res.json({
                    status: 'success',
                    data: report
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to generate monitoring report',
                    error: error.message
                });
            }
        });

        // Get active alerts
        router.get('/alerts', async (req, res) => {
            try {
                const { severity, limit = 50 } = req.query;
                
                let query = `
                    SELECT * FROM monitoring_alerts 
                    WHERE status = 'active'
                `;
                const params = [];

                if (severity) {
                    query += ` AND severity = ?`;
                    params.push(severity);
                }

                query += ` ORDER BY severity DESC, created_at DESC LIMIT ?`;
                params.push(parseInt(limit));

                const [alerts] = await this.monitor.pool.execute(query, params);
                
                res.json({
                    status: 'success',
                    data: {
                        alerts,
                        count: alerts.length
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to get alerts',
                    error: error.message
                });
            }
        });

        // Get metrics history
        router.get('/metrics', async (req, res) => {
            try {
                const { 
                    category, 
                    metric, 
                    hours = 24, 
                    granularity = 'hourly' 
                } = req.query;
                
                let query = `
                    SELECT 
                        metric_name,
                        metric_value,
                        metric_category,
                        recorded_at
                    FROM monitoring_metrics 
                    WHERE recorded_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
                `;
                const params = [parseInt(hours)];

                if (category) {
                    query += ` AND metric_category = ?`;
                    params.push(category);
                }

                if (metric) {
                    query += ` AND metric_name = ?`;
                    params.push(metric);
                }

                query += ` ORDER BY recorded_at DESC`;

                const [metrics] = await this.monitor.pool.execute(query, params);
                
                // Group by granularity if requested
                const groupedMetrics = this.groupMetricsByTime(metrics, granularity);
                
                res.json({
                    status: 'success',
                    data: {
                        metrics: groupedMetrics,
                        count: metrics.length,
                        timeRange: `${hours} hours`,
                        granularity
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to get metrics',
                    error: error.message
                });
            }
        });

        // Acknowledge alert
        router.put('/alerts/:id/acknowledge', async (req, res) => {
            try {
                const { id } = req.params;
                
                await this.monitor.pool.execute(`
                    UPDATE monitoring_alerts 
                    SET status = 'acknowledged' 
                    WHERE id = ?
                `, [id]);
                
                res.json({
                    status: 'success',
                    message: 'Alert acknowledged'
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to acknowledge alert',
                    error: error.message
                });
            }
        });

        // Resolve alert
        router.put('/alerts/:id/resolve', async (req, res) => {
            try {
                const { id } = req.params;
                
                await this.monitor.pool.execute(`
                    UPDATE monitoring_alerts 
                    SET status = 'resolved', resolved_at = NOW() 
                    WHERE id = ?
                `, [id]);
                
                res.json({
                    status: 'success',
                    message: 'Alert resolved'
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to resolve alert',
                    error: error.message
                });
            }
        });

        // Trigger manual analysis
        router.post('/analyze', async (req, res) => {
            try {
                const analysis = await this.monitor.runAnalysis();
                res.json({
                    status: 'success',
                    message: 'Analysis completed',
                    data: {
                        timestamp: analysis.timestamp,
                        anomaliesFound: analysis.anomalies.length,
                        recommendationsGenerated: analysis.recommendations.length
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Analysis failed',
                    error: error.message
                });
            }
        });

        // Get system statistics
        router.get('/stats', async (req, res) => {
            try {
                const [churchStats] = await this.monitor.pool.execute(`
                    SELECT 
                        COUNT(*) as total_churches,
                        COUNT(CASE WHEN parish_status = 'active' THEN 1 END) as active_churches,
                        COUNT(CASE WHEN is_validated = TRUE THEN 1 END) as validated_churches,
                        AVG(validation_score) as avg_validation_score,
                        COUNT(CASE WHEN last_updated > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recently_updated
                    FROM orthodox_churches
                `);

                const [scraperStats] = await this.monitor.pool.execute(`
                    SELECT 
                        COUNT(*) as total_sessions,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_sessions,
                        AVG(total_churches_scraped) as avg_churches_per_session,
                        MAX(session_start) as last_session
                    FROM scraping_sessions 
                    WHERE session_start > DATE_SUB(NOW(), INTERVAL 30 DAY)
                `);

                const [alertStats] = await this.monitor.pool.execute(`
                    SELECT 
                        COUNT(*) as total_alerts,
                        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts
                    FROM monitoring_alerts 
                    WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                `);

                res.json({
                    status: 'success',
                    data: {
                        churches: churchStats[0],
                        scraper: scraperStats[0],
                        alerts: alertStats[0],
                        systemUptime: process.uptime(),
                        timestamp: new Date()
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to get system statistics',
                    error: error.message
                });
            }
        });

        return router;
    }

    groupMetricsByTime(metrics, granularity) {
        const grouped = {};
        
        metrics.forEach(metric => {
            let timeKey;
            const date = new Date(metric.recorded_at);
            
            switch (granularity) {
                case 'hourly':
                    timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
                    break;
                case 'daily':
                    timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    break;
                default:
                    timeKey = metric.recorded_at;
            }
            
            if (!grouped[timeKey]) {
                grouped[timeKey] = [];
            }
            grouped[timeKey].push(metric);
        });
        
        return grouped;
    }

    getRouter() {
        return router;
    }
}

module.exports = MonitoringDashboard;
