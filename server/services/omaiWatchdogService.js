const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class OMAIWatchdogService extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.isMonitoring = false;
    this.watchedFiles = new Map();
    this.lastPositions = new Map();
    this.alerts = [];
    this.dailySummary = null;
    
    // Configuration
    this.config = {
      enabled: false,
      alertLevel: 'warning', // info, warning, error, critical
      scanFrequency: '5m', // 5m, 15m, 1h, daily
      quietHours: { start: '01:00', end: '06:00' },
      maxAlerts: 100,
      allowedFiles: [
        '/var/log/syslog',
        '/var/log/auth.log',
        '/var/log/kern.log',
        '/var/log/apache2/error.log',
        '/var/log/nginx/error.log',
        '/var/log/mysql/error.log',
        '/var/log/mysql/mysql.log',
        '/var/log/pm2/pm2.log',
        '/var/log/omai/watchdog.log',
        '/var/log/omai/maintenance.log'
      ],
      blockedPatterns: [
        'password',
        'secret',
        'token',
        'key',
        'credential'
      ],
      severityPatterns: {
        critical: [
          'panic', 'fatal', 'emergency', 'segfault', 'kernel panic',
          'out of memory', 'disk full', 'filesystem full', 'service died',
          'crash', 'abort', 'failed to start', 'cannot allocate memory'
        ],
        error: [
          'error', 'err', 'fail', 'failed', 'exception', 'denied',
          'refused', 'timeout', 'unreachable', 'connection lost',
          'invalid', 'corrupt', 'broken', 'authentication failure'
        ],
        warning: [
          'warn', 'warning', 'deprecated', 'slow', 'retry', 'fallback',
          'degraded', 'limit exceeded', 'threshold', 'suspicious'
        ],
        info: [
          'info', 'notice', 'start', 'stop', 'restart', 'reload',
          'connect', 'disconnect', 'login', 'logout'
        ]
      },
      systemChecks: {
        diskSpace: { enabled: true, threshold: 85 },
        memoryUsage: { enabled: true, threshold: 90 },
        cpuUsage: { enabled: true, threshold: 95 },
        loadAverage: { enabled: true, threshold: 8.0 },
        failedLogins: { enabled: true, threshold: 10 },
        serviceHealth: { enabled: true, services: ['nginx', 'mysql', 'pm2'] }
      }
    };
    
    this.patterns = this.compilePatterns();
    this.initialize();
  }

  /**
   * Initialize the watchdog service
   */
  async initialize() {
    try {
      await this.loadConfiguration();
      await this.setupLogDirectories();
      
      if (this.config.enabled) {
        await this.startMonitoring();
      }
      
      logger.info('OMAI Watchdog Service initialized', {
        enabled: this.config.enabled,
        alertLevel: this.config.alertLevel,
        watchedFiles: this.config.allowedFiles.length
      });
    } catch (error) {
      logger.error('Failed to initialize OMAI Watchdog Service:', error);
    }
  }

  /**
   * Load watchdog configuration
   */
  async loadConfiguration() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'watchdog.json');
      const configContent = await fs.readFile(configPath, 'utf8');
      const savedConfig = JSON.parse(configContent);
      
      this.config = { ...this.config, ...savedConfig };
      this.patterns = this.compilePatterns();
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to load watchdog configuration:', error.message);
      }
      // Use default configuration
    }
  }

  /**
   * Save watchdog configuration
   */
  async saveConfiguration() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'watchdog.json');
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
      logger.info('Watchdog configuration saved');
    } catch (error) {
      logger.error('Failed to save watchdog configuration:', error);
      throw error;
    }
  }

  /**
   * Setup log directories
   */
  async setupLogDirectories() {
    const logDir = '/var/log/omai';
    try {
      await fs.mkdir(logDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      logger.warn('Could not create OMAI log directory:', error.message);
    }
  }

  /**
   * Compile regex patterns for efficiency
   */
  compilePatterns() {
    const compiled = {};
    
    for (const [level, patterns] of Object.entries(this.config.severityPatterns)) {
      compiled[level] = new RegExp(patterns.join('|'), 'i');
    }
    
    // Blocked patterns
    compiled.blocked = new RegExp(this.config.blockedPatterns.join('|'), 'i');
    
    return compiled;
  }

  /**
   * Start monitoring all configured log files
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    logger.info('Starting OMAI Watchdog monitoring');
    
    // Initialize file positions
    await this.initializeFilePositions();
    
    // Start monitoring each file
    for (const filePath of this.config.allowedFiles) {
      this.monitorFile(filePath);
    }
    
    // Start system health checks
    this.startSystemHealthChecks();
    
    // Schedule daily summary
    this.scheduleDailySummary();
    
    this.emit('monitoring_started');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    // Clear all file watchers
    for (const [filePath, watcher] of this.watchedFiles) {
      if (watcher && watcher.kill) {
        watcher.kill();
      }
    }
    this.watchedFiles.clear();
    
    logger.info('OMAI Watchdog monitoring stopped');
    this.emit('monitoring_stopped');
  }

  /**
   * Initialize file reading positions
   */
  async initializeFilePositions() {
    for (const filePath of this.config.allowedFiles) {
      try {
        const stats = await fs.stat(filePath);
        this.lastPositions.set(filePath, stats.size);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn(`Could not stat log file ${filePath}:`, error.message);
        }
        this.lastPositions.set(filePath, 0);
      }
    }
  }

  /**
   * Monitor a specific log file
   */
  monitorFile(filePath) {
    try {
      // Use tail -f to follow the file
      const tailProcess = spawn('tail', ['-f', filePath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      tailProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          this.processLogLine(filePath, line);
        }
      });
      
      tailProcess.stderr.on('data', (data) => {
        logger.warn(`Tail error for ${filePath}:`, data.toString());
      });
      
      tailProcess.on('error', (error) => {
        logger.error(`Failed to monitor ${filePath}:`, error);
      });
      
      tailProcess.on('exit', (code) => {
        if (this.isMonitoring && code !== 0) {
          logger.warn(`Tail process exited for ${filePath} with code ${code}`);
          // Restart monitoring after a delay
          setTimeout(() => {
            if (this.isMonitoring) {
              this.monitorFile(filePath);
            }
          }, 5000);
        }
      });
      
      this.watchedFiles.set(filePath, tailProcess);
      
    } catch (error) {
      logger.error(`Failed to start monitoring ${filePath}:`, error);
    }
  }

  /**
   * Process a single log line
   */
  processLogLine(filePath, line) {
    try {
      // Check for blocked patterns (sensitive data)
      if (this.patterns.blocked.test(line)) {
        return; // Skip sensitive lines
      }
      
      const logEntry = this.parseLogLine(filePath, line);
      
      if (logEntry && this.shouldAlert(logEntry)) {
        this.createAlert(logEntry);
      }
      
      // Store for daily summary
      this.addToDailySummary(logEntry);
      
    } catch (error) {
      logger.error('Error processing log line:', error);
    }
  }

  /**
   * Parse log line and extract information
   */
  parseLogLine(filePath, line) {
    const timestamp = new Date().toISOString();
    const severity = this.detectSeverity(line);
    
    // Extract IP addresses, service names, error codes
    const ipMatch = line.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
    const serviceMatch = line.match(/\b(nginx|apache|mysql|mariadb|pm2|ssh|sudo)\b/i);
    const errorCodeMatch = line.match(/\b(404|500|403|401|502|503)\b/);
    
    return {
      timestamp,
      filePath,
      severity,
      message: line,
      ip: ipMatch ? ipMatch[0] : null,
      service: serviceMatch ? serviceMatch[1].toLowerCase() : null,
      errorCode: errorCodeMatch ? parseInt(errorCodeMatch[0]) : null,
      category: this.categorizeLogEntry(line, filePath)
    };
  }

  /**
   * Detect severity level
   */
  detectSeverity(line) {
    for (const [level, pattern] of Object.entries(this.patterns)) {
      if (level !== 'blocked' && pattern.test(line)) {
        return level;
      }
    }
    return 'info';
  }

  /**
   * Categorize log entry
   */
  categorizeLogEntry(line, filePath) {
    if (filePath.includes('auth.log')) return 'authentication';
    if (filePath.includes('nginx') || filePath.includes('apache')) return 'webserver';
    if (filePath.includes('mysql') || filePath.includes('mariadb')) return 'database';
    if (filePath.includes('kern.log')) return 'kernel';
    if (filePath.includes('pm2')) return 'application';
    if (filePath.includes('omai')) return 'omai';
    
    return 'system';
  }

  /**
   * Check if we should alert for this entry
   */
  shouldAlert(logEntry) {
    const alertLevels = ['info', 'warning', 'error', 'critical'];
    const configLevel = alertLevels.indexOf(this.config.alertLevel);
    const entryLevel = alertLevels.indexOf(logEntry.severity);
    
    if (entryLevel < configLevel) {
      return false;
    }
    
    // Check quiet hours
    if (this.isQuietHours()) {
      return logEntry.severity === 'critical';
    }
    
    return true;
  }

  /**
   * Check if current time is in quiet hours
   */
  isQuietHours() {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    const { start, end } = this.config.quietHours;
    
    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Spans midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Create an alert
   */
  createAlert(logEntry) {
    const alert = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      severity: logEntry.severity,
      category: logEntry.category,
      title: this.generateAlertTitle(logEntry),
      message: this.generateAlertMessage(logEntry),
      source: logEntry.filePath,
      details: logEntry,
      acknowledged: false,
      actions: this.generateSuggestedActions(logEntry)
    };
    
    this.alerts.unshift(alert);
    
    // Keep only the most recent alerts
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.config.maxAlerts);
    }
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Log alert
    logger.warn('OMAI Watchdog Alert:', {
      severity: alert.severity,
      title: alert.title,
      category: alert.category
    });
    
    return alert;
  }

  /**
   * Generate alert title
   */
  generateAlertTitle(logEntry) {
    const { severity, category, service, errorCode } = logEntry;
    
    if (category === 'authentication' && logEntry.message.includes('failed')) {
      return `Authentication failure detected`;
    }
    
    if (errorCode) {
      return `HTTP ${errorCode} error in ${service || 'web server'}`;
    }
    
    if (severity === 'critical') {
      return `Critical system issue detected`;
    }
    
    if (service) {
      return `${service.toUpperCase()} ${severity} event`;
    }
    
    return `${category} ${severity} detected`;
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(logEntry) {
    const { severity, service, ip, errorCode, message } = logEntry;
    
    let alertMessage = '';
    
    if (ip) {
      alertMessage += `IP address ${ip} `;
    }
    
    if (logEntry.category === 'authentication' && message.includes('failed')) {
      alertMessage += `attempted failed authentication`;
    } else if (errorCode) {
      alertMessage += `triggered HTTP ${errorCode} error`;
    } else if (severity === 'critical') {
      alertMessage += `caused a critical system event`;
    } else {
      alertMessage += `generated a ${severity} level event`;
    }
    
    if (service) {
      alertMessage += ` in ${service}`;
    }
    
    // Truncate the original message
    const truncatedMessage = message.length > 200 ? 
      message.substring(0, 200) + '...' : message;
    
    alertMessage += `\n\nOriginal log: ${truncatedMessage}`;
    
    return alertMessage;
  }

  /**
   * Generate suggested actions
   */
  generateSuggestedActions(logEntry) {
    const actions = [];
    
    if (logEntry.category === 'authentication' && logEntry.message.includes('failed')) {
      actions.push({
        type: 'block_ip',
        title: 'Block IP Address',
        description: `Block ${logEntry.ip} using fail2ban`,
        command: `sudo fail2ban-client set sshd banip ${logEntry.ip}`
      });
    }
    
    if (logEntry.service === 'nginx' && logEntry.errorCode >= 500) {
      actions.push({
        type: 'restart_service',
        title: 'Restart Nginx',
        description: 'Restart the Nginx web server',
        command: 'sudo systemctl restart nginx'
      });
    }
    
    if (logEntry.service === 'mysql' && logEntry.severity === 'error') {
      actions.push({
        type: 'check_mysql',
        title: 'Check MySQL Status',
        description: 'Check MySQL service status and logs',
        command: 'sudo systemctl status mysql && sudo tail -n 50 /var/log/mysql/error.log'
      });
    }
    
    if (logEntry.severity === 'critical') {
      actions.push({
        type: 'system_status',
        title: 'Check System Status',
        description: 'Run comprehensive system health check',
        command: 'df -h && free -h && top -bn1 | head -20'
      });
    }
    
    return actions;
  }

  /**
   * Start system health checks
   */
  startSystemHealthChecks() {
    const checkInterval = this.parseFrequency(this.config.scanFrequency);
    
    setInterval(() => {
      this.performSystemHealthCheck();
    }, checkInterval);
    
    // Initial check
    setTimeout(() => {
      this.performSystemHealthCheck();
    }, 5000);
  }

  /**
   * Parse frequency string to milliseconds
   */
  parseFrequency(frequency) {
    const match = frequency.match(/^(\d+)([mhd])$/);
    if (!match) return 300000; // Default 5 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 300000;
    }
  }

  /**
   * Perform system health check
   */
  async performSystemHealthCheck() {
    try {
      const checks = this.config.systemChecks;
      
      if (checks.diskSpace.enabled) {
        await this.checkDiskSpace();
      }
      
      if (checks.memoryUsage.enabled) {
        await this.checkMemoryUsage();
      }
      
      if (checks.cpuUsage.enabled) {
        await this.checkCPUUsage();
      }
      
      if (checks.loadAverage.enabled) {
        await this.checkLoadAverage();
      }
      
      if (checks.failedLogins.enabled) {
        await this.checkFailedLogins();
      }
      
      if (checks.serviceHealth.enabled) {
        await this.checkServiceHealth();
      }
      
    } catch (error) {
      logger.error('System health check failed:', error);
    }
  }

  /**
   * Check disk space usage
   */
  async checkDiskSpace() {
    try {
      const output = execSync('df -h | grep -E "/$|/var|/home"', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const usage = parseInt(parts[4]);
        const mountPoint = parts[5];
        
        if (usage >= this.config.systemChecks.diskSpace.threshold) {
          this.createAlert({
            timestamp: new Date().toISOString(),
            filePath: 'system_check',
            severity: usage >= 95 ? 'critical' : 'warning',
            message: `Disk space usage on ${mountPoint} is ${usage}%`,
            category: 'system',
            service: 'disk'
          });
        }
      }
    } catch (error) {
      logger.error('Disk space check failed:', error);
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    try {
      const output = execSync('free | grep Mem', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const usage = Math.round((used / total) * 100);
      
      if (usage >= this.config.systemChecks.memoryUsage.threshold) {
        this.createAlert({
          timestamp: new Date().toISOString(),
          filePath: 'system_check',
          severity: usage >= 95 ? 'critical' : 'warning',
          message: `Memory usage is ${usage}% (${Math.round(used/1024/1024)}GB used of ${Math.round(total/1024/1024)}GB)`,
          category: 'system',
          service: 'memory'
        });
      }
    } catch (error) {
      logger.error('Memory usage check failed:', error);
    }
  }

  /**
   * Check CPU usage
   */
  async checkCPUUsage() {
    try {
      const output = execSync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1', { encoding: 'utf8' });
      const usage = parseFloat(output.trim());
      
      if (usage >= this.config.systemChecks.cpuUsage.threshold) {
        this.createAlert({
          timestamp: new Date().toISOString(),
          filePath: 'system_check',
          severity: usage >= 98 ? 'critical' : 'warning',
          message: `CPU usage is ${usage.toFixed(1)}%`,
          category: 'system',
          service: 'cpu'
        });
      }
    } catch (error) {
      logger.error('CPU usage check failed:', error);
    }
  }

  /**
   * Check load average
   */
  async checkLoadAverage() {
    try {
      const output = execSync('uptime | awk -F\'load average:\' \'{print $2}\' | cut -d\',\' -f1', { encoding: 'utf8' });
      const loadAvg = parseFloat(output.trim());
      
      if (loadAvg >= this.config.systemChecks.loadAverage.threshold) {
        this.createAlert({
          timestamp: new Date().toISOString(),
          filePath: 'system_check',
          severity: loadAvg >= 10 ? 'critical' : 'warning',
          message: `System load average is ${loadAvg.toFixed(2)}`,
          category: 'system',
          service: 'load'
        });
      }
    } catch (error) {
      logger.error('Load average check failed:', error);
    }
  }

  /**
   * Check failed logins
   */
  async checkFailedLogins() {
    try {
      const output = execSync('grep "Failed password" /var/log/auth.log | tail -100 | wc -l', { encoding: 'utf8' });
      const failedLogins = parseInt(output.trim());
      
      if (failedLogins >= this.config.systemChecks.failedLogins.threshold) {
        this.createAlert({
          timestamp: new Date().toISOString(),
          filePath: 'system_check',
          severity: failedLogins >= 50 ? 'critical' : 'warning',
          message: `${failedLogins} failed login attempts detected in recent logs`,
          category: 'authentication',
          service: 'ssh'
        });
      }
    } catch (error) {
      logger.error('Failed logins check failed:', error);
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth() {
    const services = this.config.systemChecks.serviceHealth.services;
    
    for (const service of services) {
      try {
        const output = execSync(`systemctl is-active ${service}`, { encoding: 'utf8' });
        const status = output.trim();
        
        if (status !== 'active') {
          this.createAlert({
            timestamp: new Date().toISOString(),
            filePath: 'system_check',
            severity: 'error',
            message: `Service ${service} is ${status}`,
            category: 'service',
            service: service
          });
        }
      } catch (error) {
        this.createAlert({
          timestamp: new Date().toISOString(),
          filePath: 'system_check',
          severity: 'error',
          message: `Service ${service} check failed: ${error.message}`,
          category: 'service',
          service: service
        });
      }
    }
  }

  /**
   * Add to daily summary
   */
  addToDailySummary(logEntry) {
    if (!logEntry) return;
    
    const today = new Date().toDateString();
    
    if (!this.dailySummary || this.dailySummary.date !== today) {
      this.dailySummary = {
        date: today,
        events: {
          critical: 0,
          error: 0,
          warning: 0,
          info: 0
        },
        categories: {},
        services: {},
        topIPs: {},
        trends: []
      };
    }
    
    // Count by severity
    this.dailySummary.events[logEntry.severity]++;
    
    // Count by category
    if (!this.dailySummary.categories[logEntry.category]) {
      this.dailySummary.categories[logEntry.category] = 0;
    }
    this.dailySummary.categories[logEntry.category]++;
    
    // Count by service
    if (logEntry.service) {
      if (!this.dailySummary.services[logEntry.service]) {
        this.dailySummary.services[logEntry.service] = 0;
      }
      this.dailySummary.services[logEntry.service]++;
    }
    
    // Count by IP
    if (logEntry.ip) {
      if (!this.dailySummary.topIPs[logEntry.ip]) {
        this.dailySummary.topIPs[logEntry.ip] = 0;
      }
      this.dailySummary.topIPs[logEntry.ip]++;
    }
  }

  /**
   * Schedule daily summary
   */
  scheduleDailySummary() {
    // Schedule for 8 AM every day
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(8, 0, 0, 0);
    
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    const delay = scheduled.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateDailySummary();
      
      // Schedule for next day
      setInterval(() => {
        this.generateDailySummary();
      }, 24 * 60 * 60 * 1000);
    }, delay);
  }

  /**
   * Generate daily summary
   */
  generateDailySummary() {
    if (!this.dailySummary) {
      return;
    }
    
    const summary = {
      ...this.dailySummary,
      generatedAt: new Date().toISOString(),
      narrative: this.generateSummaryNarrative(this.dailySummary)
    };
    
    this.emit('daily_summary', summary);
    
    logger.info('Daily summary generated:', {
      events: summary.events,
      categories: Object.keys(summary.categories).length,
      services: Object.keys(summary.services).length
    });
    
    return summary;
  }

  /**
   * Generate narrative summary
   */
  generateSummaryNarrative(summary) {
    const { events, categories, services, topIPs } = summary;
    const totalEvents = Object.values(events).reduce((a, b) => a + b, 0);
    
    let narrative = `Daily System Report for ${summary.date}\n\n`;
    
    narrative += `📊 **Event Summary:**\n`;
    narrative += `• Total events processed: ${totalEvents}\n`;
    narrative += `• Critical: ${events.critical}, Errors: ${events.error}, Warnings: ${events.warning}, Info: ${events.info}\n\n`;
    
    if (events.critical > 0) {
      narrative += `🚨 **Critical Issues:** ${events.critical} critical events require immediate attention\n`;
    }
    
    if (events.error > 10) {
      narrative += `⚠️ **Error Activity:** ${events.error} errors detected, higher than normal\n`;
    }
    
    const topCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topCategories.length > 0) {
      narrative += `\n📂 **Top Activity Categories:**\n`;
      topCategories.forEach(([cat, count]) => {
        narrative += `• ${cat}: ${count} events\n`;
      });
    }
    
    const topServices = Object.entries(services)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topServices.length > 0) {
      narrative += `\n🔧 **Most Active Services:**\n`;
      topServices.forEach(([service, count]) => {
        narrative += `• ${service}: ${count} events\n`;
      });
    }
    
    const suspiciousIPs = Object.entries(topIPs)
      .filter(([,count]) => count > 10)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (suspiciousIPs.length > 0) {
      narrative += `\n🌐 **High Activity IPs:**\n`;
      suspiciousIPs.forEach(([ip, count]) => {
        narrative += `• ${ip}: ${count} events\n`;
      });
    }
    
    narrative += `\n💡 **Recommendations:**\n`;
    
    if (events.critical > 0) {
      narrative += `• Review and resolve ${events.critical} critical issues immediately\n`;
    }
    
    if (suspiciousIPs.length > 0) {
      narrative += `• Investigate high-activity IP addresses for potential security threats\n`;
    }
    
    if (events.error > 50) {
      narrative += `• High error count suggests system instability - consider maintenance\n`;
    }
    
    narrative += `• All events are logged in Big Book > System Logs > Watchdog for detailed analysis\n`;
    
    return narrative;
  }

  /**
   * Get current alerts
   */
  getAlerts(options = {}) {
    const { 
      severity = null, 
      category = null, 
      acknowledged = null, 
      limit = 50 
    } = options;
    
    let filtered = [...this.alerts];
    
    if (severity) {
      filtered = filtered.filter(alert => alert.severity === severity);
    }
    
    if (category) {
      filtered = filtered.filter(alert => alert.category === category);
    }
    
    if (acknowledged !== null) {
      filtered = filtered.filter(alert => alert.acknowledged === acknowledged);
    }
    
    return filtered.slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      isActive: this.isActive,
      isMonitoring: this.isMonitoring,
      config: this.config,
      activeAlerts: this.getAlerts({ acknowledged: false }).length,
      totalAlerts: this.alerts.length,
      dailySummary: this.dailySummary,
      watchedFiles: Array.from(this.watchedFiles.keys()),
      uptime: process.uptime()
    };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig) {
    const wasMonitoring = this.isMonitoring;
    
    if (wasMonitoring) {
      await this.stopMonitoring();
    }
    
    this.config = { ...this.config, ...newConfig };
    this.patterns = this.compilePatterns();
    
    await this.saveConfiguration();
    
    if (this.config.enabled && wasMonitoring) {
      await this.startMonitoring();
    }
    
    this.emit('config_updated', this.config);
  }

  /**
   * Execute suggested action
   */
  async executeSuggestedAction(alertId, actionType) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    const action = alert.actions.find(a => a.type === actionType);
    if (!action) {
      throw new Error('Action not found');
    }
    
    try {
      const result = execSync(action.command, { encoding: 'utf8' });
      
      // Log the action execution
      logger.info('Executed watchdog action:', {
        alertId,
        actionType,
        command: action.command,
        success: true
      });
      
      return {
        success: true,
        output: result,
        executedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to execute watchdog action:', {
        alertId,
        actionType,
        command: action.command,
        error: error.message
      });
      
      throw new Error(`Action execution failed: ${error.message}`);
    }
  }
}

module.exports = OMAIWatchdogService; 