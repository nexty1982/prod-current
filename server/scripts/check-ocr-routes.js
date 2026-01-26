#!/usr/bin/env node
/**
 * Check OCR Routes Registration
 * 
 * This script checks if OCR routes are properly registered by examining
 * the compiled dist/index.js file or running server.
 */

const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, '../dist/src/index.js');
const srcIndexPath = path.join(__dirname, '../src/index.ts');

console.log('='.repeat(70));
console.log('OCR Routes Registration Check');
console.log('='.repeat(70));
console.log('');

// Check if dist file exists
if (fs.existsSync(distIndexPath)) {
  console.log('✅ Found compiled file: dist/src/index.js');
  
  // Read and search for route registrations
  const distContent = fs.readFileSync(distIndexPath, 'utf8');
  
  // Check for router mount
  const hasRouterMount = distContent.includes('churchOcrRoutes') || distContent.includes('churchOcrRouter');
  console.log(`   Router mount code: ${hasRouterMount ? '✅ Found' : '❌ Not found'}`);
  
  // Check for direct routes
  const hasJobsRoute = distContent.includes('/api/church/:churchId/ocr/jobs') && 
                       distContent.includes('app.get') &&
                       !distContent.includes('/api/church/:churchId/ocr/jobs/:jobId');
  console.log(`   Direct jobs route: ${hasJobsRoute ? '✅ Found' : '❌ Not found'}`);
  
  // Check for settings route
  const hasSettingsRoute = distContent.includes('/api/church/:churchId/ocr/settings');
  console.log(`   Settings route: ${hasSettingsRoute ? '✅ Found' : '❌ Not found'}`);
  
  // Count OCR route definitions
  const ocrRouteMatches = distContent.match(/app\.(get|post|put|patch|delete)\('\/api\/church\/:churchId\/ocr/g);
  const routeCount = ocrRouteMatches ? ocrRouteMatches.length : 0;
  console.log(`   Total OCR routes found: ${routeCount}`);
  
  // Check route order (routes should be before catch-all)
  const catchAllIndex = distContent.indexOf("app.use('/api/*'");
  const jobsRouteIndex = distContent.indexOf("app.get('/api/church/:churchId/ocr/jobs'");
  
  if (catchAllIndex > 0 && jobsRouteIndex > 0) {
    const orderCorrect = jobsRouteIndex < catchAllIndex;
    console.log(`   Route order: ${orderCorrect ? '✅ Correct' : '❌ Routes after catch-all'}`);
    console.log(`      Jobs route at: ${jobsRouteIndex}`);
    console.log(`      Catch-all at: ${catchAllIndex}`);
  }
  
} else {
  console.log('⚠️  Compiled file not found: dist/src/index.js');
  console.log('   Run: npm run build:ts');
}

console.log('');
console.log('Source file check:');
if (fs.existsSync(srcIndexPath)) {
  const srcContent = fs.readFileSync(srcIndexPath, 'utf8');
  const srcOcrRoutes = srcContent.match(/app\.(get|post|put|patch|delete)\('\/api\/church\/:churchId\/ocr/g);
  const srcRouteCount = srcOcrRoutes ? srcOcrRoutes.length : 0;
  console.log(`   Total OCR routes in source: ${srcRouteCount}`);
} else {
  console.log('   Source file not found');
}

console.log('');
console.log('Next steps:');
console.log('1. If routes not found in dist, run: npm run build:ts');
console.log('2. Restart server: pm2 restart orthodox-backend');
console.log('3. Check logs: pm2 logs orthodox-backend | grep OCR');
