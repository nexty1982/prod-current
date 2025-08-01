#!/usr/bin/env node

/**
 * OrthodoxMetrics Universal Screenshot Utility
 * AI Agent-friendly screenshot automation with fallbacks
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ScreenshotUtility {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.BASE_URL || 'http://localhost:3000';
    this.outputDir = options.outputDir || path.join(__dirname, '../screenshots');
    this.credentials = {
      username: options.username || process.env.TEST_USERNAME || 'admin',
      password: options.password || process.env.TEST_PASSWORD || 'admin123'
    };
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Screenshot Utility...');
    
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Launch browser with optimal settings
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set optimal viewport
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Set longer timeouts for complex pages
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(30000);
    
    console.log('✅ Screenshot utility ready');
  }

  async login() {
    console.log('🔐 Attempting authentication...');
    
    try {
      await this.page.goto(`${this.baseUrl}/auth/login`, { 
        waitUntil: 'networkidle2' 
      });
      
      // Wait for login form elements
      await this.page.waitForSelector('input[name="username"], input[type="email"], #username, #email');
      
      // Try different common selectors
      const usernameSelector = await this.page.$('input[name="username"]') ? 'input[name="username"]' :
                              await this.page.$('input[type="email"]') ? 'input[type="email"]' :
                              await this.page.$('#username') ? '#username' : '#email';
      
      const passwordSelector = await this.page.$('input[name="password"]') ? 'input[name="password"]' :
                              await this.page.$('input[type="password"]') ? 'input[type="password"]' : '#password';
      
      // Fill credentials
      await this.page.type(usernameSelector, this.credentials.username);
      await this.page.type(passwordSelector, this.credentials.password);
      
      // Submit form - try different button selectors
      const submitSelector = await this.page.$('button[type="submit"]') ? 'button[type="submit"]' :
                            await this.page.$('.login-button') ? '.login-button' :
                            await this.page.$('.signin-button') ? '.signin-button' : 'button';
      
      await this.page.click(submitSelector);
      
      // Wait for navigation or success indicator
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('✅ Authentication successful');
      return true;
      
    } catch (error) {
      console.log('⚠️ Authentication skipped:', error.message);
      return false;
    }
  }

  async addUrlOverlay(customText = null) {
    const currentUrl = this.page.url();
    const displayText = customText || currentUrl;
    
    await this.page.evaluate((text) => {
      // Remove any existing overlay
      const existing = document.getElementById('screenshot-overlay');
      if (existing) existing.remove();
      
      // Create new overlay
      const overlay = document.createElement('div');
      overlay.id = 'screenshot-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
      `;
      overlay.textContent = text;
      document.body.appendChild(overlay);
    }, displayText);
    
    // Wait for overlay to render
    await this.page.waitForTimeout(500);
  }

  async captureScreenshot(taskId, screenshotIndex, route, description = '') {
    const filename = `task${taskId}-${screenshotIndex.toString().padStart(2, '0')}.png`;
    const filepath = path.join(this.outputDir, filename);
    
    console.log(`📸 Capturing: ${filename} - ${description}`);
    console.log(`🌐 Route: ${route}`);
    
    try {
      // Navigate to target route
      const fullUrl = `${this.baseUrl}${route}`;
      await this.page.goto(fullUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for page stabilization
      await this.page.waitForTimeout(3000);
      
      // Wait for common framework elements
      try {
        await this.page.waitForSelector('.MuiBox-root, .app-content, #root > div', { timeout: 5000 });
      } catch (e) {
        console.log('⚠️ Framework elements not found, proceeding anyway...');
      }
      
      // Add URL overlay
      await this.addUrlOverlay();
      
      // Take screenshot
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });
      
      console.log(`✅ Screenshot saved: ${filepath}`);
      
      return {
        success: true,
        filename,
        filepath,
        route,
        description,
        url: fullUrl
      };
      
    } catch (error) {
      console.error(`❌ Failed to capture ${filename}:`, error.message);
      
      return {
        success: false,
        filename,
        route,
        error: error.message
      };
    }
  }

  async captureTaskScreenshots(taskId, screenshots) {
    console.log(`📋 Capturing ${screenshots.length} screenshots for Task ${taskId}...`);
    
    const results = [];
    
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const result = await this.captureScreenshot(
        taskId,
        i + 1,
        screenshot.route,
        screenshot.description
      );
      
      results.push(result);
      
      // Brief pause between screenshots
      await this.page.waitForTimeout(1000);
    }
    
    return results;
  }

  async generateReport(taskId, results) {
    const reportPath = path.join(this.outputDir, `Task-${taskId}-Screenshot-Report.md`);
    
    let report = `# Task ${taskId} - Screenshot Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Base URL**: ${this.baseUrl}\n\n`;
    
    report += `## Screenshots Captured\n\n`;
    
    results.forEach((result, index) => {
      if (result.success) {
        report += `### ✅ ${result.filename}\n`;
        report += `- **Route**: ${result.route}\n`;
        report += `- **Description**: ${result.description}\n`;
        report += `- **URL**: ${result.url}\n`;
        report += `- **Status**: Successfully captured\n\n`;
      } else {
        report += `### ❌ ${result.filename}\n`;
        report += `- **Route**: ${result.route}\n`;
        report += `- **Error**: ${result.error}\n`;
        report += `- **Status**: Failed to capture\n\n`;
      }
    });
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    report += `## Summary\n\n`;
    report += `- **Total**: ${results.length}\n`;
    report += `- **Successful**: ${successful}\n`;
    report += `- **Failed**: ${failed}\n\n`;
    
    if (successful === results.length) {
      report += `🎉 **All screenshots captured successfully!**\n`;
    } else {
      report += `⚠️ **${failed} screenshot(s) failed to capture.**\n`;
    }
    
    await fs.writeFile(reportPath, report);
    console.log(`📄 Report generated: ${reportPath}`);
    
    return { reportPath, successful, failed, total: results.length };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async run(taskId, screenshots) {
    try {
      await this.initialize();
      await this.login();
      
      const results = await this.captureTaskScreenshots(taskId, screenshots);
      const summary = await this.generateReport(taskId, results);
      
      console.log(`\n🎉 Task ${taskId} screenshot capture complete!`);
      console.log(`✅ Successful: ${summary.successful}/${summary.total}`);
      console.log(`📁 Screenshots saved to: ${this.outputDir}`);
      
      if (summary.successful === summary.total) {
        console.log('🚀 All screenshots ready - task can be marked complete!');
      }
      
      return { results, summary };
      
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in other scripts
module.exports = ScreenshotUtility;

// CLI execution when run directly
if (require.main === module) {
  // Example usage for Task 132
  const task132Screenshots = [
    {
      route: '/admin/tools/page-editor',
      description: 'PageEditor with Content Type Toggle'
    },
    {
      route: '/admin/tools/page-editor?contentType=blog',
      description: 'Blog Creation Interface'
    },
    {
      route: '/admin/blog-admin',
      description: 'Blog Admin Dashboard'
    },
    {
      route: '/blog',
      description: 'Public Blog Feed'
    }
  ];
  
  const utility = new ScreenshotUtility();
  
  utility.run(132, task132Screenshots)
    .then(({ summary }) => {
      process.exit(summary.successful === summary.total ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} 