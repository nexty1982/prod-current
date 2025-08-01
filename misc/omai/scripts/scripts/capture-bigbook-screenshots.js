#!/usr/bin/env node

/**
 * Big Book Custom Components Screenshot Capture
 * Automated visual verification of the system using Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../screenshots');
const TIMESTAMP = new Date().toISOString().split('T')[0];

// Test credentials (for demo/testing purposes)
const TEST_CREDENTIALS = {
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123'
};

// Screenshots to capture
const SCREENSHOT_TARGETS = [
  {
    name: 'BigBook-CustomComponents-Tab',
    path: '/admin',
    action: 'navigate-to-bigbook-custom-components',
    description: 'Big Book Custom Components Tab showing ParishMap'
  },
  {
    name: 'ParishMap-Direct-Access',
    path: '/bigbook/parish-map',
    action: 'wait-for-map-load',
    description: 'ParishMap component loaded directly via URL'
  },
  {
    name: 'BigBook-ComponentViewer',
    path: '/admin',
    action: 'open-parish-map-viewer',
    description: 'BigBookCustomComponentViewer displaying ParishMap'
  }
];

class BigBookScreenshotCapture {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Big Book Screenshot Capture...');
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent screenshots
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    console.log('✅ Browser initialized');
  }

  async login() {
    console.log('🔐 Attempting login...');
    
    try {
      await this.page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
      
      // Wait for login form
      await this.page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });
      
      // Fill login form (adjust selectors based on your login form)
      await this.page.type('input[name="username"], input[type="email"]', TEST_CREDENTIALS.username);
      await this.page.type('input[name="password"], input[type="password"]', TEST_CREDENTIALS.password);
      
      // Submit form
      await this.page.click('button[type="submit"], .login-button, .signin-button');
      
      // Wait for redirect after login
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('✅ Login successful');
      return true;
      
    } catch (error) {
      console.log('⚠️ Login failed or not required:', error.message);
      return false;
    }
  }

  async captureScreenshot(target) {
    console.log(`📸 Capturing: ${target.name}`);
    
    try {
      // Navigate to target page
      await this.page.goto(`${BASE_URL}${target.path}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Perform specific action based on target
      await this.performAction(target.action);
      
      // Add URL overlay
      await this.addUrlOverlay();
      
      // Capture screenshot
      const screenshotPath = path.join(OUTPUT_DIR, `${target.name}-${TIMESTAMP}.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });
      
      console.log(`✅ Screenshot saved: ${screenshotPath}`);
      
      return {
        success: true,
        path: screenshotPath,
        target: target.name,
        description: target.description
      };
      
    } catch (error) {
      console.error(`❌ Failed to capture ${target.name}:`, error.message);
      return {
        success: false,
        target: target.name,
        error: error.message
      };
    }
  }

  async performAction(action) {
    switch (action) {
      case 'navigate-to-bigbook-custom-components':
        // Navigate to Big Book
        await this.page.waitForSelector('a[href*="bigbook"], .bigbook-link', { timeout: 10000 });
        await this.page.click('a[href*="bigbook"], .bigbook-link');
        await this.page.waitForTimeout(2000);
        
        // Click on Custom Components tab (tab #7)
        await this.page.waitForSelector('.MuiTab-root:nth-child(7), [data-testid="custom-components-tab"]', { timeout: 10000 });
        await this.page.click('.MuiTab-root:nth-child(7), [data-testid="custom-components-tab"]');
        await this.page.waitForTimeout(3000);
        break;
        
      case 'wait-for-map-load':
        // Wait for Leaflet map to load
        await this.page.waitForSelector('.leaflet-container, .parish-map', { timeout: 15000 });
        await this.page.waitForTimeout(5000); // Allow map tiles to load
        break;
        
      case 'open-parish-map-viewer':
        // Navigate to Big Book Custom Components and click View on ParishMap
        await this.performAction('navigate-to-bigbook-custom-components');
        await this.page.waitForSelector('[data-component="parish-map"] .view-button, .parish-map-card .view-button', { timeout: 10000 });
        await this.page.click('[data-component="parish-map"] .view-button, .parish-map-card .view-button');
        await this.page.waitForTimeout(5000);
        break;
        
      default:
        // Just wait for page to stabilize
        await this.page.waitForTimeout(3000);
    }
  }

  async addUrlOverlay() {
    // Add URL overlay to screenshot
    const currentUrl = this.page.url();
    
    await this.page.evaluate((url) => {
      // Create overlay element
      const overlay = document.createElement('div');
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
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      `;
      overlay.textContent = url;
      document.body.appendChild(overlay);
    }, currentUrl);
    
    // Wait a moment for overlay to render
    await this.page.waitForTimeout(500);
  }

  async captureAllScreenshots() {
    console.log(`📋 Capturing ${SCREENSHOT_TARGETS.length} screenshots...`);
    
    const results = [];
    
    for (const target of SCREENSHOT_TARGETS) {
      const result = await this.captureScreenshot(target);
      results.push(result);
      
      // Brief pause between screenshots
      await this.page.waitForTimeout(1000);
    }
    
    return results;
  }

  async generateReport(results) {
    const reportPath = path.join(OUTPUT_DIR, `BigBook-Screenshot-Report-${TIMESTAMP}.md`);
    
    let report = `# Big Book Custom Components - Screenshot Report\n\n`;
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Base URL**: ${BASE_URL}\n\n`;
    
    report += `## Screenshots Captured\n\n`;
    
    results.forEach(result => {
      if (result.success) {
        report += `### ✅ ${result.target}\n`;
        report += `- **Description**: ${result.description}\n`;
        report += `- **File**: ${path.basename(result.path)}\n`;
        report += `- **Status**: Successfully captured\n\n`;
      } else {
        report += `### ❌ ${result.target}\n`;
        report += `- **Error**: ${result.error}\n`;
        report += `- **Status**: Failed to capture\n\n`;
      }
    });
    
    report += `## Summary\n\n`;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    report += `- **Total Screenshots**: ${results.length}\n`;
    report += `- **Successful**: ${successful}\n`;
    report += `- **Failed**: ${failed}\n\n`;
    
    if (successful === results.length) {
      report += `🎉 **All screenshots captured successfully!**\n`;
      report += `The Big Book Custom Components system appears to be working correctly.\n`;
    } else {
      report += `⚠️ **Some screenshots failed to capture.**\n`;
      report += `Please check the errors above and verify the system is running correctly.\n`;
    }
    
    await fs.writeFile(reportPath, report);
    console.log(`📄 Report generated: ${reportPath}`);
    
    return reportPath;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Attempt login (may not be required for localhost)
      await this.login();
      
      // Capture all screenshots
      const results = await this.captureAllScreenshots();
      
      // Generate report
      await this.generateReport(results);
      
      // Summary
      const successful = results.filter(r => r.success).length;
      console.log(`\n🎉 Screenshot capture complete!`);
      console.log(`✅ Successful: ${successful}/${results.length}`);
      console.log(`📁 Output directory: ${OUTPUT_DIR}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
if (require.main === module) {
  const capture = new BigBookScreenshotCapture();
  
  capture.run().then(results => {
    const successful = results.filter(r => r.success).length;
    process.exit(successful === results.length ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BigBookScreenshotCapture; 