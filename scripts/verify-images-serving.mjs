#!/usr/bin/env node
/**
 * Verify Images Serving - Direct HTTP Check
 * 
 * This script directly checks HTTP access to images, bypassing the API.
 * It verifies that /images/* URLs return 200 OK with correct content-types.
 * 
 * Usage:
 *   node scripts/verify-images-serving.mjs [--base-url=https://orthodoxmetrics.com]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get canonical directories from config
const configPath = join(__dirname, '../front-end/src/features/devel-tools/system-documentation/gallery.config.ts');
const configContent = readFileSync(configPath, 'utf-8');

const match = configContent.match(/export const CANONICAL_IMAGE_DIRECTORIES = \[(.*?)\]/s);
if (!match) {
  console.error('❌ Could not find CANONICAL_IMAGE_DIRECTORIES in config file');
  process.exit(1);
}

const directories = match[1]
  .split(',')
  .map(d => d.trim().replace(/['"]/g, ''))
  .filter(d => d);

const BASE_URL = process.env.BASE_URL || process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'https://orthodoxmetrics.com';
const isHttps = BASE_URL.startsWith('https');
const httpModule = isHttps ? https : http;

// Sample images to test (one per directory)
const SAMPLE_IMAGES = {
  logos: 'biz-logo.png',
  backgrounds: 'bgtiled1.png',
  icons: 'baptism.png',
  ui: 'components.png',
  records: 'om-logo.png',
  misc: 'placeholder.png', // Fallback if this doesn't exist, we'll try others
};

console.log(`🔍 Images Serving Verification`);
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`📁 Canonical Directories: ${directories.join(', ')}\n`);

/**
 * Check if a URL returns HTTP 200 with image content-type
 */
function checkImageUrl(url) {
  return new Promise((resolve) => {
    const fullUrl = `${BASE_URL}${url}`;
    const urlObj = new URL(fullUrl);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD', // Use HEAD to avoid downloading full file
      timeout: 5000,
    };
    
    const req = httpModule.request(options, (res) => {
      const statusCode = res.statusCode;
      const contentType = res.headers['content-type'] || '';
      const contentLength = res.headers['content-length'] || 'unknown';
      const isImage = contentType.startsWith('image/');
      
      // Consume response to free up connection
      res.on('data', () => {});
      res.on('end', () => {});
      
      resolve({
        url: fullUrl,
        status: statusCode,
        contentType,
        contentLength,
        isImage,
        success: statusCode === 200 && isImage,
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url: fullUrl,
        status: 0,
        error: error.message,
        success: false,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url: fullUrl,
        status: 0,
        error: 'Request timeout',
        success: false,
      });
    });
    
    req.end();
  });
}

/**
 * Check a single directory
 */
async function checkDirectory(directory) {
  console.log(`📂 Checking directory: ${directory}`);
  
  // Try sample image
  const sampleFile = SAMPLE_IMAGES[directory] || 'default.png';
  const imageUrl = `/images/${directory}/${sampleFile}`;
  
  const result = await checkImageUrl(imageUrl);
  
  if (result.success) {
    console.log(`   ✅ ${sampleFile}: ${result.status} ${result.contentType} (${result.contentLength} bytes)`);
    return {
      directory,
      sampleFile,
      ...result,
      passed: true,
    };
  } else {
    // Try alternative files if first one fails
    const alternatives = directory === 'misc' 
      ? ['default.png', 'default.jpg', 'default.svg', 'cross.png']
      : ['default.png', 'default.jpg'];
    
    let found = false;
    for (const alt of alternatives) {
      const altUrl = `/images/${directory}/${alt}`;
      const altResult = await checkImageUrl(altUrl);
      if (altResult.success) {
        console.log(`   ✅ ${alt}: ${altResult.status} ${altResult.contentType} (${altResult.contentLength} bytes)`);
        found = true;
        return {
          directory,
          sampleFile: alt,
          ...altResult,
          passed: true,
        };
      }
    }
    
    // None worked
    console.log(`   ❌ ${sampleFile}: ${result.status || 'ERROR'} ${result.error || result.contentType || ''}`);
    if (result.status === 404) {
      console.log(`      → File not found. Check if ${imageUrl} exists on disk.`);
    } else if (result.status === 200 && !result.isImage) {
      console.log(`      → Wrong content-type: ${result.contentType} (expected image/*)`);
      console.log(`      → This suggests the request is being handled by API/SPA fallback, not static file serving.`);
    }
    
    return {
      directory,
      sampleFile,
      ...result,
      passed: false,
    };
  }
}

/**
 * Main check function
 */
async function runChecks() {
  const results = [];
  let allPassed = true;
  
  for (const directory of directories) {
    const result = await checkDirectory(directory);
    results.push(result);
    
    if (!result.passed) {
      allPassed = false;
    }
    
    console.log(''); // Empty line between directories
  }
  
  // Print summary
  console.log('═'.repeat(60));
  console.log('📊 Summary');
  console.log('═'.repeat(60));
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const details = result.passed
      ? `${result.status} ${result.contentType}`
      : `${result.status || 'ERROR'} ${result.error || result.contentType || 'N/A'}`;
    console.log(`${status} ${result.directory.padEnd(15)} ${result.sampleFile.padEnd(20)} ${details}`);
  }
  
  console.log('═'.repeat(60));
  
  if (allPassed) {
    console.log('✅ All image checks passed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Verify images display correctly on real pages');
    console.log('   2. Check browser DevTools Network tab for any 404s');
    return 0;
  } else {
    console.log('❌ Some image checks failed. See details above.');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check if Nginx has location ^~ /images/ block');
    console.log('   2. Verify files exist in front-end/dist/images/<dir>/');
    console.log('   3. Check backend logs for image serving errors');
    console.log('   4. Run: curl -I ' + BASE_URL + '/images/logos/biz-logo.png');
    return 1;
  }
}

// Run checks
runChecks()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
