const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class BigBookWatchdogIntegration {
  constructor() {
    this.bigBookPath = '/mnt/bigbook_secure/System_Logs/Watchdog';
    this.indexPath = path.join(this.bigBookPath, 'index.json');
    this.alertsPath = path.join(this.bigBookPath, 'alerts');
    this.summariesPath = path.join(this.bigBookPath, 'daily_summaries');
    this.trendsPath = path.join(this.bigBookPath, 'trends');
    
    this.initialize();
  }

  /**
   * Initialize Big Book integration
   */
  async initialize() {
    try {
      await this.ensureDirectoryStructure();
      await this.createIndex();
      logger.info('Big Book Watchdog integration initialized');
    } catch (error) {
      logger.error('Failed to initialize Big Book Watchdog integration:', error);
    }
  }

  /**
   * Ensure directory structure exists
   */
  async ensureDirectoryStructure() {
    const directories = [
      this.bigBookPath,
      this.alertsPath,
      this.summariesPath,
      this.trendsPath
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: 0o755 });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          logger.warn(`Could not create directory ${dir}:`, error.message);
        }
      }
    }
  }

  /**
   * Create or update index file
   */
  async createIndex() {
    try {
      let index = {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        description: 'OMAI Watchdog System Logs and Analytics',
        structure: {
          alerts: 'Individual alert files organized by date',
          daily_summaries: 'Daily summary reports with analytics',
          trends: 'Long-term trend analysis and patterns'
        },
        statistics: {
          totalAlerts: 0,
          totalSummaries: 0,
          dateRange: {
            earliest: null,
            latest: null
          }
        }
      };

      try {
        const existingIndex = await fs.readFile(this.indexPath, 'utf8');
        const existing = JSON.parse(existingIndex);
        index = { ...existing, lastUpdated: new Date().toISOString() };
      } catch (error) {
        // Index doesn't exist, use new one
      }

      await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      logger.error('Failed to create/update Big Book index:', error);
    }
  }

  /**
   * Store an alert in Big Book
   */
  async storeAlert(alert) {
    try {
      const date = new Date(alert.timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const alertDir = path.join(this.alertsPath, dateStr);
      
      await fs.mkdir(alertDir, { recursive: true, mode: 0o755 });
      
      const alertFile = path.join(alertDir, `${alert.id}.json`);
      const alertData = {
        ...alert,
        storedAt: new Date().toISOString(),
        bigBookMetadata: {
          category: 'watchdog_alert',
          severity: alert.severity,
          source: 'omai_watchdog',
          tags: [alert.category, alert.severity, ...(alert.details?.service ? [alert.details.service] : [])]
        }
      };

      await fs.writeFile(alertFile, JSON.stringify(alertData, null, 2));
      
      // Update statistics
      await this.updateStatistics('alert', alertData);
      
      logger.debug('Alert stored in Big Book:', { id: alert.id, date: dateStr });
    } catch (error) {
      logger.error('Failed to store alert in Big Book:', error);
    }
  }

  /**
   * Store daily summary in Big Book
   */
  async storeDailySummary(summary) {
    try {
      const date = summary.date;
      const summaryFile = path.join(this.summariesPath, `${date}.json`);
      
      const summaryData = {
        ...summary,
        storedAt: new Date().toISOString(),
        bigBookMetadata: {
          category: 'watchdog_summary',
          source: 'omai_watchdog',
          tags: ['daily_summary', 'system_health', 'analytics']
        },
        analytics: this.generateSummaryAnalytics(summary)
      };

      await fs.writeFile(summaryFile, JSON.stringify(summaryData, null, 2));
      
      // Generate markdown report
      await this.generateMarkdownReport(summaryData);
      
      // Update statistics
      await this.updateStatistics('summary', summaryData);
      
      logger.info('Daily summary stored in Big Book:', { date });
    } catch (error) {
      logger.error('Failed to store daily summary in Big Book:', error);
    }
  }

  /**
   * Generate analytics for summary
   */
  generateSummaryAnalytics(summary) {
    const { events, categories, services, topIPs } = summary;
    const totalEvents = Object.values(events).reduce((a, b) => a + b, 0);
    
    const analytics = {
      totalEvents,
      errorRate: totalEvents > 0 ? ((events.error + events.critical) / totalEvents * 100).toFixed(2) : 0,
      topCategory: this.getTopEntry(categories),
      topService: this.getTopEntry(services),
      suspiciousActivity: {
        highVolumeIPs: Object.entries(topIPs)
          .filter(([, count]) => count > 20)
          .map(([ip, count]) => ({ ip, count })),
        criticalAlerts: events.critical,
        errorSpikes: events.error > 50
      },
      healthScore: this.calculateHealthScore(events),
      recommendations: this.generateRecommendations(summary)
    };

    return analytics;
  }

  /**
   * Get top entry from object
   */
  getTopEntry(obj) {
    if (!obj || Object.keys(obj).length === 0) return null;
    
    const entries = Object.entries(obj);
    entries.sort(([,a], [,b]) => b - a);
    return { name: entries[0][0], count: entries[0][1] };
  }

  /**
   * Calculate system health score (0-100)
   */
  calculateHealthScore(events) {
    const total = Object.values(events).reduce((a, b) => a + b, 0);
    if (total === 0) return 100;
    
    const weights = { critical: 10, error: 5, warning: 2, info: 1 };
    const weightedScore = Object.entries(events).reduce((score, [level, count]) => {
      return score + (count * weights[level]);
    }, 0);
    
    // Normalize to 0-100 scale
    const maxPossibleScore = total * weights.critical;
    const healthScore = Math.max(0, 100 - (weightedScore / maxPossibleScore * 100));
    
    return Math.round(healthScore);
  }

  /**
   * Generate recommendations based on summary
   */
  generateRecommendations(summary) {
    const recommendations = [];
    const { events, categories, services, topIPs } = summary;
    
    if (events.critical > 0) {
      recommendations.push({
        priority: 'high',
        type: 'critical_issues',
        message: `${events.critical} critical issues detected - immediate attention required`,
        action: 'Review and resolve critical alerts immediately'
      });
    }
    
    if (events.error > 50) {
      recommendations.push({
        priority: 'medium',
        type: 'error_volume',
        message: `High error volume (${events.error}) suggests system instability`,
        action: 'Consider system maintenance or investigation'
      });
    }
    
    const suspiciousIPs = Object.entries(topIPs).filter(([, count]) => count > 20);
    if (suspiciousIPs.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'security',
        message: `${suspiciousIPs.length} IP addresses with high activity detected`,
        action: 'Investigate potential security threats or unusual traffic patterns'
      });
    }
    
    if (categories.authentication > 20) {
      recommendations.push({
        priority: 'medium',
        type: 'authentication',
        message: `High authentication activity (${categories.authentication} events)`,
        action: 'Review authentication logs for potential brute force attempts'
      });
    }
    
    const topService = this.getTopEntry(services);
    if (topService && topService.count > 100) {
      recommendations.push({
        priority: 'low',
        type: 'service_monitoring',
        message: `Service ${topService.name} generated ${topService.count} events`,
        action: `Monitor ${topService.name} for potential issues or optimization opportunities`
      });
    }
    
    return recommendations;
  }

  /**
   * Generate markdown report
   */
  async generateMarkdownReport(summaryData) {
    try {
      const { date, events, analytics, narrative } = summaryData;
      
      const markdown = `# OMAI Watchdog Daily Report - ${date}

## Executive Summary

**Health Score:** ${analytics.healthScore}/100  
**Total Events:** ${analytics.totalEvents}  
**Error Rate:** ${analytics.errorRate}%

## Event Breakdown

| Severity | Count |
|----------|-------|
| Critical | ${events.critical} |
| Error    | ${events.error} |
| Warning  | ${events.warning} |
| Info     | ${events.info} |

## Key Insights

${analytics.topCategory ? `**Most Active Category:** ${analytics.topCategory.name} (${analytics.topCategory.count} events)` : ''}
${analytics.topService ? `**Most Active Service:** ${analytics.topService.name} (${analytics.topService.count} events)` : ''}

## Security Analysis

${analytics.suspiciousActivity.highVolumeIPs.length > 0 ? `
**High Volume IP Addresses:**
${analytics.suspiciousActivity.highVolumeIPs.map(item => `- ${item.ip}: ${item.count} events`).join('\n')}
` : 'No suspicious IP activity detected.'}

## Recommendations

${analytics.recommendations.length > 0 ? analytics.recommendations.map((rec, index) => `
${index + 1}. **${rec.type.toUpperCase()}** (${rec.priority.toUpperCase()})
   - ${rec.message}
   - Action: ${rec.action}
`).join('\n') : 'No specific recommendations at this time.'}

## Detailed Analysis

${narrative}

---
*Generated by OMAI Watchdog on ${new Date().toISOString()}*
`;

      const markdownFile = path.join(this.summariesPath, `${date}.md`);
      await fs.writeFile(markdownFile, markdown);
      
    } catch (error) {
      logger.error('Failed to generate markdown report:', error);
    }
  }

  /**
   * Update statistics in index
   */
  async updateStatistics(type, data) {
    try {
      const index = JSON.parse(await fs.readFile(this.indexPath, 'utf8'));
      
      if (type === 'alert') {
        index.statistics.totalAlerts = (index.statistics.totalAlerts || 0) + 1;
      } else if (type === 'summary') {
        index.statistics.totalSummaries = (index.statistics.totalSummaries || 0) + 1;
      }
      
      // Update date range
      const timestamp = data.timestamp || data.storedAt;
      if (!index.statistics.dateRange.earliest || timestamp < index.statistics.dateRange.earliest) {
        index.statistics.dateRange.earliest = timestamp;
      }
      if (!index.statistics.dateRange.latest || timestamp > index.statistics.dateRange.latest) {
        index.statistics.dateRange.latest = timestamp;
      }
      
      index.lastUpdated = new Date().toISOString();
      
      await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      logger.error('Failed to update statistics:', error);
    }
  }

  /**
   * Get alerts by date range
   */
  async getAlertsByDateRange(startDate, endDate) {
    try {
      const alerts = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const alertDir = path.join(this.alertsPath, dateStr);
        
        try {
          const files = await fs.readdir(alertDir);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const alertPath = path.join(alertDir, file);
              const alertData = JSON.parse(await fs.readFile(alertPath, 'utf8'));
              alerts.push(alertData);
            }
          }
        } catch (error) {
          // Directory doesn't exist for this date, skip
          continue;
        }
      }
      
      return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      logger.error('Failed to get alerts by date range:', error);
      return [];
    }
  }

  /**
   * Generate trend analysis
   */
  async generateTrendAnalysis(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const alerts = await this.getAlertsByDateRange(startDate, endDate);
      
      const trends = {
        generatedAt: new Date().toISOString(),
        period: { start: startDate.toISOString(), end: endDate.toISOString(), days },
        totalAlerts: alerts.length,
        dailyAverages: {},
        patterns: {},
        anomalies: [],
        recommendations: []
      };
      
      // Calculate daily patterns
      const dailyData = {};
      alerts.forEach(alert => {
        const date = alert.timestamp.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { critical: 0, error: 0, warning: 0, info: 0, total: 0 };
        }
        dailyData[date][alert.severity]++;
        dailyData[date].total++;
      });
      
      // Calculate averages
      const totalDays = Object.keys(dailyData).length || 1;
      trends.dailyAverages = {
        critical: alerts.filter(a => a.severity === 'critical').length / totalDays,
        error: alerts.filter(a => a.severity === 'error').length / totalDays,
        warning: alerts.filter(a => a.severity === 'warning').length / totalDays,
        info: alerts.filter(a => a.severity === 'info').length / totalDays,
        total: alerts.length / totalDays
      };
      
      // Detect patterns
      trends.patterns = this.detectPatterns(alerts, dailyData);
      
      // Detect anomalies
      trends.anomalies = this.detectAnomalies(dailyData, trends.dailyAverages);
      
      // Generate recommendations
      trends.recommendations = this.generateTrendRecommendations(trends);
      
      // Store trend analysis
      const trendFile = path.join(this.trendsPath, `trend_${days}d_${endDate.toISOString().split('T')[0]}.json`);
      await fs.writeFile(trendFile, JSON.stringify(trends, null, 2));
      
      logger.info('Trend analysis generated:', { days, totalAlerts: alerts.length });
      
      return trends;
    } catch (error) {
      logger.error('Failed to generate trend analysis:', error);
      return null;
    }
  }

  /**
   * Detect patterns in alert data
   */
  detectPatterns(alerts, dailyData) {
    const patterns = {
      peakHours: {},
      categories: {},
      services: {},
      ipPatterns: {}
    };
    
    // Peak hours analysis
    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).getHours();
      patterns.peakHours[hour] = (patterns.peakHours[hour] || 0) + 1;
    });
    
    // Category patterns
    alerts.forEach(alert => {
      patterns.categories[alert.category] = (patterns.categories[alert.category] || 0) + 1;
    });
    
    // Service patterns
    alerts.forEach(alert => {
      if (alert.details?.service) {
        patterns.services[alert.details.service] = (patterns.services[alert.details.service] || 0) + 1;
      }
    });
    
    // IP patterns
    alerts.forEach(alert => {
      if (alert.details?.ip) {
        patterns.ipPatterns[alert.details.ip] = (patterns.ipPatterns[alert.details.ip] || 0) + 1;
      }
    });
    
    return patterns;
  }

  /**
   * Detect anomalies in daily data
   */
  detectAnomalies(dailyData, averages) {
    const anomalies = [];
    const threshold = 2; // 2x above average
    
    Object.entries(dailyData).forEach(([date, data]) => {
      if (data.critical > averages.critical * threshold) {
        anomalies.push({
          date,
          type: 'critical_spike',
          value: data.critical,
          expected: averages.critical,
          severity: 'high'
        });
      }
      
      if (data.total > averages.total * threshold) {
        anomalies.push({
          date,
          type: 'volume_spike',
          value: data.total,
          expected: averages.total,
          severity: 'medium'
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Generate trend-based recommendations
   */
  generateTrendRecommendations(trends) {
    const recommendations = [];
    
    if (trends.dailyAverages.critical > 5) {
      recommendations.push({
        priority: 'high',
        type: 'critical_trend',
        message: `High average of critical alerts (${trends.dailyAverages.critical.toFixed(1)}/day)`,
        action: 'Investigate root causes of critical issues and implement preventive measures'
      });
    }
    
    if (trends.anomalies.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'anomaly_detection',
        message: `${trends.anomalies.length} anomalies detected in the analysis period`,
        action: 'Review anomalous days for patterns and potential causes'
      });
    }
    
    // Check for peak hour patterns
    const peakHour = Object.entries(trends.patterns.peakHours)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (peakHour && peakHour[1] > trends.totalAlerts * 0.2) {
      recommendations.push({
        priority: 'low',
        type: 'peak_hours',
        message: `Peak alert activity at hour ${peakHour[0]} (${peakHour[1]} alerts)`,
        action: 'Consider scheduling maintenance or monitoring during off-peak hours'
      });
    }
    
    return recommendations;
  }

  /**
   * Get Big Book statistics
   */
  async getStatistics() {
    try {
      const index = JSON.parse(await fs.readFile(this.indexPath, 'utf8'));
      return index.statistics;
    } catch (error) {
      logger.error('Failed to get Big Book statistics:', error);
      return null;
    }
  }

  /**
   * Search alerts by criteria
   */
  async searchAlerts(criteria = {}) {
    try {
      const { 
        severity, 
        category, 
        dateFrom, 
        dateTo, 
        limit = 100 
      } = criteria;
      
      const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      const endDate = dateTo ? new Date(dateTo) : new Date();
      
      let alerts = await this.getAlertsByDateRange(startDate, endDate);
      
      // Apply filters
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }
      
      if (category) {
        alerts = alerts.filter(alert => alert.category === category);
      }
      
      // Limit results
      alerts = alerts.slice(0, limit);
      
      return alerts;
    } catch (error) {
      logger.error('Failed to search alerts:', error);
      return [];
    }
  }
}

module.exports = BigBookWatchdogIntegration; 