#!/usr/bin/env node

/**
 * Task 132 Blog System Screenshot Capture
 * Automated visual verification of the blog system using Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../screenshots');

// Test credentials
const TEST_CREDENTIALS = {
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123'
};

// Task 132 Screenshots to capture
const SCREENSHOT_TARGETS = [
  {
    name: 'task132-01',
    path: '/admin/tools/page-editor',
    description: 'PageEditor with Content Type Toggle'
  },
  {
    name: 'task132-02',
    path: '/admin/tools/page-editor?contentType=blog',
    description: 'Blog Creation Interface'
  },
  {
    name: 'task132-03',
    path: '/admin/blog-admin',
    description: 'Blog Admin Dashboard'
  },
  {
    name: 'task132-04',
    path: '/blog',
    description: 'Public Blog Feed'
  }
];

class Task132ScreenshotCapture {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Task 132 Screenshot Capture...');
    
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
      
      // Fill login form
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

  async captureScreenshot(target) {
    console.log(`📸 Capturing: ${target.name} - ${target.description}`);
    
    try {
      // Navigate to target page
      await this.page.goto(`${BASE_URL}${target.path}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for page to fully load
      await this.page.waitForTimeout(3000);
      
      // Add URL overlay
      await this.addUrlOverlay();
      
      // Capture screenshot
      const screenshotPath = path.join(OUTPUT_DIR, `${target.name}.png`);
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

  async captureAllScreenshots() {
    console.log(`📋 Capturing ${SCREENSHOT_TARGETS.length} screenshots for Task 132...`);
    
    const results = [];
    
    for (const target of SCREENSHOT_TARGETS) {
      const result = await this.captureScreenshot(target);
      results.push(result);
      
      // Brief pause between screenshots
      await this.page.waitForTimeout(1000);
    }
    
    return results;
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
      
      // Attempt login
      await this.login();
      
      // Capture all screenshots
      const results = await this.captureAllScreenshots();
      
      // Summary
      const successful = results.filter(r => r.success).length;
      console.log(`\n🎉 Task 132 Screenshot capture complete!`);
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
  const capture = new Task132ScreenshotCapture();
  
  capture.run().then(results => {
    const successful = results.filter(r => r.success).length;
    process.exit(successful === results.length ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = Task132ScreenshotCapture; 