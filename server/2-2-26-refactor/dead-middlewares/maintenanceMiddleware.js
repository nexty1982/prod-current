const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class MaintenanceMiddleware {
  constructor() {
    this.flagPath = '/etc/omai/maintenance.flag';
    this.configPath = '/etc/omai/maintenance.json';
    this.backupConfigPath = path.join(process.cwd(), 'config', 'maintenance.json');
    this.maintenancePage = null;
    this.config = null;
    this.lastCheck = 0;
    this.checkInterval = 30000; // Check every 30 seconds
    
    this.loadMaintenancePage();
  }

  /**
   * Load maintenance page template
   */
  async loadMaintenancePage() {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'maintenance.html');
      this.maintenancePage = await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      logger.warn('Could not load maintenance page template, using default');
      this.maintenancePage = this.getDefaultMaintenancePage();
    }
  }

  /**
   * Get default maintenance page HTML
   */
  getDefaultMaintenancePage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Maintenance - Orthodox Metrics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .maintenance-container {
            max-width: 600px;
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 30px;
            background: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            font-weight: 700;
        }
        
        .status {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .message {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 40px;
            opacity: 0.8;
        }
        
        .countdown {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        
        .countdown h3 {
            font-size: 1.1rem;
            margin-bottom: 15px;
            opacity: 0.9;
        }
        
        .time-display {
            font-size: 2rem;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        
        .contact-info {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .contact-info p {
            margin-bottom: 10px;
            opacity: 0.7;
        }
        
        .refresh-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
        }
        
        .refresh-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
        }
        
        .admin-notice {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1000;
        }
        
        @media (max-width: 768px) {
            .maintenance-container {
                padding: 40px 20px;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .time-display {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="maintenance-container">
        <div class="logo">OM</div>
        <h1>{{title}}</h1>
        <div class="status">{{status}}</div>
        <div class="message">{{message}}</div>
        
        {{#if eta}}
        <div class="countdown">
            <h3>Estimated Time Remaining</h3>
            <div class="time-display" id="countdown">{{timeRemaining}}</div>
        </div>
        {{/if}}
        
        <button class="refresh-btn" onclick="window.location.reload()">
            Refresh Page
        </button>
        
        <div class="contact-info">
            {{#if contactEmail}}
            <p>For urgent matters, contact: <strong>{{contactEmail}}</strong></p>
            {{/if}}
            <p>We apologize for any inconvenience and appreciate your patience.</p>
        </div>
    </div>

    {{#if isAdmin}}
    <div class="admin-notice">
        You are viewing this page as an administrator. 
        <a href="/admin" style="color: #fbbf24;">Access Admin Panel</a>
    </div>
    {{/if}}

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
        
        // Countdown timer
        {{#if eta}}
        const targetTime = new Date('{{eta}}').getTime();
        
        function updateCountdown() {
            const now = new Date().getTime();
            const timeRemaining = targetTime - now;
            
            if (timeRemaining <= 0) {
                document.getElementById('countdown').textContent = 'Any moment now...';
                setTimeout(() => window.location.reload(), 5000);
                return;
            }
            
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            
            document.getElementById('countdown').textContent = 
                hours.toString().padStart(2, '0') + ':' +
                minutes.toString().padStart(2, '0') + ':' +
                seconds.toString().padStart(2, '0');
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
        {{/if}}
    </script>
</body>
</html>`;
  }

  /**
   * Check if maintenance mode is active
   */
  async isMaintenanceModeActive() {
    const now = Date.now();
    
    // Cache the check for performance
    if (now - this.lastCheck < this.checkInterval && this.config !== null) {
      return this.config !== null;
    }
    
    try {
      await fs.access(this.flagPath);
      
      // Load configuration if not already loaded or if it's time to refresh
      if (!this.config || now - this.lastCheck >= this.checkInterval) {
        await this.loadMaintenanceConfig();
      }
      
      this.lastCheck = now;
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.config = null;
        this.lastCheck = now;
        return false;
      }
      
      logger.error('Error checking maintenance mode:', error);
      return false;
    }
  }

  /**
   * Load maintenance configuration
   */
  async loadMaintenanceConfig() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Try backup location
        try {
          const backupContent = await fs.readFile(this.backupConfigPath, 'utf8');
          this.config = JSON.parse(backupContent);
        } catch (backupError) {
          logger.warn('Could not load maintenance config, using defaults');
          this.config = {
            status: 'System maintenance in progress',
            message: 'We are currently performing scheduled maintenance to improve your experience.',
            exemptRoles: ['super_admin', 'dev_admin'],
            exemptIPs: ['127.0.0.1', '::1'],
            allowlist: []
          };
        }
      } else {
        logger.error('Error loading maintenance config:', error);
        this.config = null;
      }
    }
  }

  /**
   * Check if user/IP is exempt from maintenance mode
   */
  isExempt(user, ip) {
    if (!this.config) {
      return true;
    }

    // Check exempt roles
    if (user && user.role && this.config.exemptRoles && this.config.exemptRoles.includes(user.role)) {
      return true;
    }

    // Check exempt IPs
    if (ip && this.config.exemptIPs && this.config.exemptIPs.includes(ip)) {
      return true;
    }

    // Check allowlist
    if (user && user.email && this.config.allowlist && this.config.allowlist.includes(user.email)) {
      return true;
    }

    if (ip && this.config.allowlist && this.config.allowlist.includes(ip)) {
      return true;
    }

    return false;
  }

  /**
   * Render maintenance page with dynamic content
   */
  renderMaintenancePage(user = null, ip = null) {
    if (!this.config) {
      return this.getDefaultMaintenancePage();
    }

    const isAdmin = user && ['super_admin', 'dev_admin'].includes(user.role);
    const eta = this.config.eta ? new Date(this.config.eta) : null;
    const now = new Date();
    
    let timeRemaining = 'Calculating...';
    if (eta && eta > now) {
      const diff = eta.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      timeRemaining = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (eta && eta <= now) {
      timeRemaining = 'Any moment now...';
    }

    // Simple template replacement
    let html = this.maintenancePage;
    
    const replacements = {
      '{{title}}': 'Maintenance Mode',
      '{{status}}': this.config.status || 'System maintenance in progress',
      '{{message}}': this.config.message || 'We are currently performing scheduled maintenance to improve your experience.',
      '{{timeRemaining}}': timeRemaining,
      '{{contactEmail}}': this.config.contactInfo?.email || '',
      '{{eta}}': eta ? eta.toISOString() : '',
    };

    // Handle conditional blocks
    if (eta) {
      html = html.replace(/{{#if eta}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      html = html.replace(/{{#if eta}}([\s\S]*?){{\/if}}/g, '');
    }

    if (isAdmin) {
      html = html.replace(/{{#if isAdmin}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      html = html.replace(/{{#if isAdmin}}([\s\S]*?){{\/if}}/g, '');
    }

    if (this.config.contactInfo?.email) {
      html = html.replace(/{{#if contactEmail}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      html = html.replace(/{{#if contactEmail}}([\s\S]*?){{\/if}}/g, '');
    }

    // Replace variables
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return html;
  }

  /**
   * Express middleware function
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Skip maintenance check for maintenance API routes
        if (req.path.startsWith('/api/admin/maintenance')) {
          return next();
        }

        // Skip for static assets
        if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
          return next();
        }

        const isActive = await this.isMaintenanceModeActive();
        
        if (!isActive) {
          return next();
        }

        const user = req.session?.user;
        const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

        // Check if user is exempt
        if (this.isExempt(user, userIP)) {
          // Add maintenance banner for exempt users
          res.locals.maintenanceMode = {
            active: true,
            config: this.config,
            isExempt: true
          };
          return next();
        }

        // Return maintenance page for non-exempt users
        const maintenancePage = this.renderMaintenancePage(user, userIP);
        
        res.status(503).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Retry-After': '3600' // Suggest retry after 1 hour
        }).send(maintenancePage);

      } catch (error) {
        logger.error('Error in maintenance middleware:', error);
        // If there's an error, allow the request to continue
        next();
      }
    };
  }
}

// Export singleton instance
module.exports = new MaintenanceMiddleware(); 