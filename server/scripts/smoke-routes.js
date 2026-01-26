#!/usr/bin/env node
/**
 * Smoke test script to verify critical routes are mounted
 * Usage: node scripts/smoke-routes.js
 * Exit code: 0 if all routes exist, 1 if any are missing
 */

const path = require('path');
const fs = require('fs');

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

console.log('🔍 [Smoke Test] Checking route mounts...\n');

// Track results
const results = {
  passed: [],
  failed: []
};

// Helper to check if a route file exists
function checkRouteFile(routePath, description) {
  const fullPath = path.join(__dirname, '..', routePath);
  if (fs.existsSync(fullPath)) {
    results.passed.push({ route: routePath, description });
    console.log(`✅ ${description}: ${routePath}`);
    return true;
  } else {
    results.failed.push({ route: routePath, description });
    console.error(`❌ ${description}: ${routePath} NOT FOUND`);
    return false;
  }
}

// Helper to check if route is mounted in index file
function checkRouteMount(indexFile, routePath, mountPath, description) {
  try {
    const fullPath = path.join(__dirname, '..', indexFile);
    if (!fs.existsSync(fullPath)) {
      results.failed.push({ route: mountPath, description: `${description} (index file not found: ${indexFile})` });
      console.error(`❌ ${description}: Index file ${indexFile} not found`);
      return false;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check for route import
    const importPattern = new RegExp(`require\\(['"].*${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'i');
    const hasImport = importPattern.test(content);
    
    // Check for route mount
    const mountPattern = new RegExp(`app\\.use\\(['"]${mountPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
    const hasMount = mountPattern.test(content);
    
    if (hasImport && hasMount) {
      results.passed.push({ route: mountPath, description });
      console.log(`✅ ${description}: ${mountPath} (imported and mounted in ${indexFile})`);
      return true;
    } else {
      const issues = [];
      if (!hasImport) issues.push('not imported');
      if (!hasMount) issues.push('not mounted');
      results.failed.push({ route: mountPath, description: `${description} (${issues.join(', ')})` });
      console.error(`❌ ${description}: ${mountPath} - ${issues.join(', ')} in ${indexFile}`);
      return false;
    }
  } catch (error) {
    results.failed.push({ route: mountPath, description: `${description} (error: ${error.message})` });
    console.error(`❌ ${description}: Error checking ${indexFile} - ${error.message}`);
    return false;
  }
}

// Check critical routes
console.log('📋 Checking route files...\n');
checkRouteFile('routes/admin/templates.js', 'Admin templates route file');

console.log('\n📋 Checking route mounts in index files...\n');

// Check in server/index.js (JavaScript version)
checkRouteMount('index.js', 'routes/admin/templates', '/api/admin/templates', 'Templates route in server/index.js');

// Check in server/src/index.ts (TypeScript source - compiled to dist/index.js)
checkRouteMount('src/index.ts', 'routes/admin/templates', '/api/admin/templates', 'Templates route in server/src/index.ts');

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed checks:');
  results.failed.forEach(f => {
    console.log(`   - ${f.description}`);
  });
  console.log('\n⚠️  Route verification failed!');
  process.exit(1);
} else {
  console.log('\n✅ All route checks passed!');
  process.exit(0);
}
