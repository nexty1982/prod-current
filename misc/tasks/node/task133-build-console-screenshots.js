#!/usr/bin/env node

/**
 * Task 133: Build Console UI Redesign - Screenshot Documentation
 * Captures screenshots of the redesigned build console interface
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

// Ensure screenshots directory exists
async function ensureScreenshotDir() {
  try {
    await fs.access(SCREENSHOT_DIR);
  } catch {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  }
}

// Screenshots to capture
const screenshots = [
  {
    name: 'task133-01-build-console-redesign',
    url: '/admin/build',
    description: 'Redesigned Build Console with improved workflow layout',
    waitFor: '[data-testid="build-console"], .MuiGrid-container',
    fullPage: true,
    actions: async (page) => {
      // Wait for the page to fully load
      await page.waitForTimeout(2000);
    }
  },
  {
    name: 'task133-02-config-section',
    url: '/admin/build',
    description: 'Build Configuration section - Full width top with gradient background',
    waitFor: '[data-testid="build-config"], .MuiTextField-root',
    viewport: { width: 1400, height: 600 },
    actions: async (page) => {
      // Focus on configuration section
      await page.evaluate(() => {
        document.querySelector('h5')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      await page.waitForTimeout(1000);
    }
  },
  {
    name: 'task133-03-actions-history',
    url: '/admin/build',
    description: 'Build Actions and History side-by-side layout',
    waitFor: '.MuiChip-root, .MuiButton-contained',
    viewport: { width: 1400, height: 800 },
    actions: async (page) => {
      // Scroll to actions/history section
      await page.evaluate(() => {
        const element = document.querySelector('[data-testid="build-actions"], .MuiChip-root');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      await page.waitForTimeout(1000);
    }
  },
  {
    name: 'task133-04-console-output',
    url: '/admin/build',
    description: 'Prominent console output section with GitHub-style terminal',
    waitFor: '[data-testid="console-output"], .MuiPaper-root',
    viewport: { width: 1400, height: 900 },
    actions: async (page) => {
      // Scroll to console output section
      await page.evaluate(() => {
        const consoleSection = Array.from(document.querySelectorAll('h5'))
          .find(el => el.textContent?.includes('Console Output'));
        if (consoleSection) {
          consoleSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      await page.waitForTimeout(1000);
    }
  },
  {
    name: 'task133-05-responsive-mobile',
    url: '/admin/build',
    description: 'Mobile responsive layout of redesigned Build Console',
    viewport: { width: 375, height: 812 },
    waitFor: '.MuiGrid-container',
    fullPage: true,
    actions: async (page) => {
      await page.waitForTimeout(2000);
    }
  }
];

async function takeScreenshot(screenshot) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport if specified
    if (screenshot.viewport) {
      await page.setViewport(screenshot.viewport);
    } else {
      await page.setViewport({ width: 1400, height: 900 });
    }

    console.log(`📸 Capturing: ${screenshot.description}`);
    
    // Navigate to the page
    await page.goto(`${BASE_URL}${screenshot.url}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for specific elements
    try {
      if (screenshot.waitFor) {
        await page.waitForSelector(screenshot.waitFor, { timeout: 10000 });
      }
    } catch (error) {
      console.warn(`⚠️  Element ${screenshot.waitFor} not found, proceeding anyway`);
    }

    // Perform custom actions
    if (screenshot.actions) {
      await screenshot.actions(page);
    }

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${screenshot.name}.png`);
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: screenshot.fullPage || false,
      quality: 90
    });

    console.log(`✅ Saved: ${screenshot.name}.png`);
    
    // Add URL overlay (simulate browser address bar)
    console.log(`🔗 URL: ${BASE_URL}${screenshot.url}`);
    
  } catch (error) {
    console.error(`❌ Failed to capture ${screenshot.name}:`, error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 Starting Build Console Redesign Screenshot Documentation...\n');
  
  await ensureScreenshotDir();
  
  for (const screenshot of screenshots) {
    await takeScreenshot(screenshot);
    // Small delay between screenshots
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Build Console Screenshot Documentation Complete!');
  console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
}

// Run the script
main().catch(console.error);