// 📁 server/scrapers/monitoring/alert-system.js
// Step 6: Advanced Alert and Notification System

const nodemailer = require('nodemailer');
const winston = require('winston');

class AlertSystem {
    constructor(options = {}) {
        this.config = {
            email: options.email || {},
            slack: options.slack || {},
            thresholds: {
                criticalAlertCooldown: 30 * 60 * 1000, // 30 minutes
                highAlertCooldown: 60 * 60 * 1000, // 1 hour
                mediumAlertCooldown: 4 * 60 * 60 * 1000, // 4 hours
                ...options.thresholds
            }
        };
        
        this.alertHistory = new Map();
        this.setupLogger();
        this.setupEmailTransporter();
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ 
                    filename: path.join(__dirname, '../logs/alerts.log') 
                })
            ]
        });
    }

    setupEmailTransporter() {
        if (this.config.email.enabled) {
            this.emailTransporter = nodemailer.createTransporter({
                host: this.config.email.host,
                port: this.config.email.port,
                secure: this.config.email.secure,
                auth: {
                    user: this.config.email.user,
                    pass: this.config.email.password
                }
            });
        }
    }

    async sendAlert(alert) {
        const alertKey = `${alert.type}_${alert.severity}`;
        const now = Date.now();
        
        // Check cooldown period
        if (this.isInCooldown(alertKey, now, alert.severity)) {
            this.logger.debug('Alert in cooldown period, skipping', { alertKey });
            return;
        }

        // Update alert history
        this.alertHistory.set(alertKey, now);

        // Send notifications based on severity
        const notifications = [];
        
        if (alert.severity === 'critical') {
            notifications.push(this.sendEmailAlert(alert));
            notifications.push(this.sendSlackAlert(alert));
        } else if (alert.severity === 'high') {
            notifications.push(this.sendEmailAlert(alert));
        } else if (alert.severity === 'medium') {
            notifications.push(this.sendSlackAlert(alert));
        }

        try {
            await Promise.all(notifications);
            this.logger.info('Alert notifications sent', { 
                alert: alert.type, 
                severity: alert.severity,
                channels: notifications.length 
            });
        } catch (error) {
            this.logger.error('Failed to send alert notifications', { 
                error: error.message,
                alert: alert.type 
            });
        }
    }

    isInCooldown(alertKey, currentTime, severity) {
        const lastSent = this.alertHistory.get(alertKey);
        if (!lastSent) return false;

        const cooldownPeriod = this.config.thresholds[`${severity}AlertCooldown`] || 
                              this.config.thresholds.mediumAlertCooldown;
        
        return (currentTime - lastSent) < cooldownPeriod;
    }

    async sendEmailAlert(alert) {
        if (!this.config.email.enabled || !this.emailTransporter) {
            return;
        }

        const subject = `[${alert.severity.toUpperCase()}] Orthodox Metrics Alert: ${alert.title}`;
        const html = this.generateEmailHTML(alert);

        const mailOptions = {
            from: this.config.email.from,
            to: this.config.email.recipients,
            subject: subject,
            html: html
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    async sendSlackAlert(alert) {
        if (!this.config.slack.enabled || !this.config.slack.webhookUrl) {
            return;
        }

        const color = this.getSeverityColor(alert.severity);
        const slackMessage = {
            text: `Orthodox Metrics Alert: ${alert.title}`,
            attachments: [{
                color: color,
                fields: [
                    {
                        title: 'Severity',
                        value: alert.severity.toUpperCase(),
                        short: true
                    },
                    {
                        title: 'Type',
                        value: alert.type,
                        short: true
                    },
                    {
                        title: 'Description',
                        value: alert.description || alert.message,
                        short: false
                    },
                    {
                        title: 'Timestamp',
                        value: new Date().toISOString(),
                        short: true
                    }
                ]
            }]
        };

        const response = await fetch(this.config.slack.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(slackMessage)
        });

        if (!response.ok) {
            throw new Error(`Slack notification failed: ${response.statusText}`);
        }
    }

    generateEmailHTML(alert) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .alert-header { 
                    background: ${this.getSeverityColor(alert.severity)}; 
                    color: white; 
                    padding: 15px; 
                    border-radius: 5px; 
                }
                .alert-content { padding: 20px; background: #f5f5f5; border-radius: 5px; margin-top: 10px; }
                .alert-details { margin-top: 15px; }
                .alert-details table { width: 100%; border-collapse: collapse; }
                .alert-details th, .alert-details td { 
                    padding: 8px; 
                    text-align: left; 
                    border-bottom: 1px solid #ddd; 
                }
                .alert-details th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="alert-header">
                <h2>${alert.severity.toUpperCase()} ALERT: ${alert.title}</h2>
            </div>
            
            <div class="alert-content">
                <p><strong>Alert Type:</strong> ${alert.type}</p>
                <p><strong>Description:</strong> ${alert.description || alert.message}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                
                ${alert.value !== undefined ? `<p><strong>Current Value:</strong> ${alert.value}</p>` : ''}
                ${alert.threshold !== undefined ? `<p><strong>Threshold:</strong> ${alert.threshold}</p>` : ''}
                
                <div class="alert-details">
                    <h3>System Information</h3>
                    <table>
                        <tr><th>Server</th><td>Orthodox Metrics Production</td></tr>
                        <tr><th>Component</th><td>Church Directory System</td></tr>
                        <tr><th>Alert ID</th><td>${alert.id || 'N/A'}</td></tr>
                        <tr><th>Generated At</th><td>${new Date().toLocaleString()}</td></tr>
                    </table>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 5px;">
                    <strong>Recommended Actions:</strong>
                    <ul>
                        ${this.getRecommendedActions(alert.type).map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getSeverityColor(severity) {
        const colors = {
            critical: '#dc3545',
            high: '#fd7e14',
            medium: '#ffc107',
            low: '#28a745'
        };
        return colors[severity] || '#6c757d';
    }

    getRecommendedActions(alertType) {
        const actions = {
            high_failure_rate: [
                'Check scraper logs for error patterns',
                'Verify target websites are accessible',
                'Review scraper configuration and timing',
                'Consider implementing retry mechanisms'
            ],
            low_validation_rate: [
                'Review validation rules and criteria',
                'Check for data source quality issues',
                'Update validation algorithms if needed',
                'Manually verify a sample of records'
            ],
            sync_conflicts: [
                'Review conflicting records in the database',
                'Check sync operation logs for patterns',
                'Manually resolve conflicts using admin interface',
                'Update sync logic to prevent future conflicts'
            ],
            performance_degradation: [
                'Check system resources (CPU, memory, disk)',
                'Review database performance metrics',
                'Analyze scraper timing and efficiency',
                'Consider scaling or optimization measures'
            ],
            high_pending_records: [
                'Review sync queue and processing status',
                'Check for sync system blockages',
                'Manually trigger sync operations if needed',
                'Investigate pending record causes'
            ]
        };
        
        return actions[alertType] || [
            'Check system logs for more details',
            'Review related components and dependencies',
            'Contact system administrator if issue persists'
        ];
    }

    // Test alert system
    async testAlerts() {
        const testAlert = {
            type: 'test_alert',
            severity: 'medium',
            title: 'Alert System Test',
            message: 'This is a test alert to verify the notification system',
            description: 'Testing email and Slack integrations for the Orthodox Metrics monitoring system',
            value: 42,
            threshold: 50
        };

        this.logger.info('Sending test alert...');
        await this.sendAlert(testAlert);
        this.logger.info('Test alert sent successfully');
    }
}

module.exports = AlertSystem;
