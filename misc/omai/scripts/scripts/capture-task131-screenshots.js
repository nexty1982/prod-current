#!/usr/bin/env node

/**
 * Task 131 OMSiteSurvey Screenshot Capture
 * Automated visual verification of the OMSiteSurvey system using Puppeteer
 */

const ScreenshotUtility = require('./screenshot-utility');

// Task 131 Screenshots to capture
const task131Screenshots = [
  {
    route: '/admin/tools/survey',
    description: 'OMSiteSurvey Main Interface with Access Control'
  },
  {
    route: '/admin/tools/survey?tab=filesystem',
    description: 'Filesystem Analysis Tab with File Scanning Results'
  },
  {
    route: '/admin/tools/survey?tab=menu',
    description: 'Menu Audit Tab with Role-based Visibility Analysis'
  },
  {
    route: '/admin/tools/survey?tab=roles',
    description: 'User Role Matrix and Access Control Analysis'
  }
];

// Create utility instance
const utility = new ScreenshotUtility({
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  outputDir: require('path').join(__dirname, '../screenshots')
});

// Execute screenshot capture for Task 131
utility.run(131, task131Screenshots)
  .then(({ summary }) => {
    console.log('\n🎯 Task 131 OMSiteSurvey screenshots captured!');
    console.log(`✅ Success rate: ${summary.successful}/${summary.total}`);
    
    if (summary.successful === summary.total) {
      console.log('🚀 Task 131 ready for completion!');
    }
    
    process.exit(summary.successful === summary.total ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Task 131 screenshot capture failed:', error);
    process.exit(1);
  }); 
