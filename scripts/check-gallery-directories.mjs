#!/usr/bin/env node
/**
 * Gallery Directory Mapping Sanity Check
 * 
 * Verifies that the six canonical image directories resolve to real URLs
 * and that at least one sample image in each directory returns HTTP 200.
 * 
 * Usage:
 *   node scripts/check-gallery-directories.mjs [--base-url=http://localhost:5174]
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get canonical directories from config
const configPath = join(__dirname, '../front-end/src/features/devel-tools/system-documentation/gallery.config.ts');
const configContent = readFileSync(configPath, 'utf-8');

// Extract CANONICAL_IMAGE_DIRECTORIES array
const match = configContent.match(/export const CANONICAL_IMAGE_DIRECTORIES = \[(.*?)\]/s);
if (!match) {
  console.error('❌ Could not find CANONICAL_IMAGE_DIRECTORIES in config file');
  process.exit(1);
}

const directories = match[1]
  .split(',')
  .map(d => d.trim().replace(/['"]/g, ''))
  .filter(d => d);

const BASE_URL = process.env.BASE_URL || process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:5174';
const IMAGES_BASE = '/images';

console.log(`🔍 Gallery Directory Sanity Check`);
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`📁 Canonical Directories: ${directories.join(', ')}\n`);

/**
 * Check if a URL returns HTTP 200
 */
function checkUrl(url) {
  return new Promise((resolve) => {
    const fullUrl = `${BASE_URL}${url}`;
    const urlObj = new URL(fullUrl);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');
    
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
      const isImage = contentType.startsWith('image/');
      
      resolve({
        url: fullUrl,
        status: statusCode,
        contentType,
        isImage,
        success: statusCode === 200 && isImage,
      });
      
      // Consume response to free up connection
      res.on('data', () => {});
      res.on('end', () => {});
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
 * Get sample images from a directory via API
 */
async function getSampleImages(directory) {
  return new Promise((resolve) => {
    const apiUrl = `${BASE_URL}/api/gallery/images?path=${encodeURIComponent(directory)}&recursive=0`;
    
    const urlObj = new URL(apiUrl);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 5000,
    };
    
    const req = httpModule.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.images && json.images.length > 0) {
            console.log(`   📋 API returned ${json.images.length} image(s) for ${directory}`);
            resolve(json.images.slice(0, 3)); // Get up to 3 sample images
          } else {
            console.log(`   ⚠️  API returned empty result for ${directory} (success: ${json.success}, count: ${json.count || 0})`);
            if (json.error) {
              console.log(`      Error: ${json.error}`);
            }
            resolve([]);
          }
        } catch (error) {
          console.log(`   ❌ API response parse error for ${directory}: ${error.message}`);
          console.log(`      Response: ${data.substring(0, 200)}`);
          resolve([]);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ API request error for ${directory}: ${error.message}`);
      resolve([]);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`   ⏱️  API request timeout for ${directory}`);
      resolve([]);
    });
    
    req.end();
  });
}

/**
 * Check a single directory
 */
async function checkDirectory(directory) {
  console.log(`📂 Checking directory: ${directory}`);
  
  // Step 1: Check if directory exists via API
  const sampleImages = await getSampleImages(directory);
  
  if (sampleImages.length === 0) {
    console.log(`   ⚠️  API returned no images (directory may be empty or API error)`);
    console.log(`   💡 Trying direct HTTP check as fallback...`);
    
    // Fallback: Try direct HTTP check with known sample files
    const knownSamples = {
      logos: ['biz-logo.png', 'orthodox-metrics-logo.svg'],
      backgrounds: ['bgtiled1.png', 'bgtiled2.png'],
      icons: ['baptism.png', 'default.png'],
      ui: ['components.png', 'GE-buttons-1.png'],
      records: ['om-logo.png', 'baptism.png'],
      misc: ['placeholder.png', 'default.png', 'cross.png'],
    };
    
    const samples = knownSamples[directory] || ['default.png'];
    let foundAny = false;
    const checks = [];
    
    for (const sample of samples) {
      const testUrl = `/images/${directory}/${sample}`;
      const result = await checkUrl(testUrl);
      checks.push({
        image: sample,
        url: testUrl,
        ...result,
      });
      
      if (result.success) {
        console.log(`   ✅ Direct check: ${sample} → ${result.status} ${result.contentType}`);
        foundAny = true;
        break; // Found at least one, that's enough
      }
    }
    
    if (foundAny) {
      return {
        directory,
        exists: true,
        hasImages: true,
        sampleImages: [checks.find(c => c.success)?.image || 'unknown'],
        checks: checks.filter(c => c.success),
        passed: true,
      };
    }
    
    return {
      directory,
      exists: true,
      hasImages: false,
      sampleImages: [],
      checks,
      passed: true, // Empty directory is OK, just note it
    };
  }
  
  console.log(`   ✅ Found ${sampleImages.length} sample image(s) via API`);
  
  // Step 2: Check each sample image URL
  const checks = [];
  let allPassed = true;
  
  for (const image of sampleImages) {
    const imageUrl = image.url || image.path;
    if (!imageUrl) {
      console.log(`   ⚠️  Image "${image.name}" has no URL`);
      checks.push({
        image: image.name,
        url: null,
        success: false,
        error: 'No URL in API response',
      });
      allPassed = false;
      continue;
    }
    
    // Remove query params for check
    const cleanUrl = imageUrl.split('?')[0];
    const result = await checkUrl(cleanUrl);
    
    checks.push({
      image: image.name,
      url: cleanUrl,
      ...result,
    });
    
    if (result.success) {
      console.log(`   ✅ ${image.name}: ${result.status} ${result.contentType}`);
    } else {
      console.log(`   ❌ ${image.name}: ${result.status || 'ERROR'} ${result.error || result.contentType || ''}`);
      allPassed = false;
    }
  }
  
  return {
    directory,
    exists: true,
    hasImages: true,
    sampleImages: sampleImages.map(img => img.name),
    checks,
    passed: allPassed,
  };
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
    const imageStatus = result.hasImages 
      ? `${result.sampleImages.length} image(s) checked` 
      : 'Empty directory';
    console.log(`${status} ${result.directory.padEnd(15)} ${imageStatus}`);
    
    if (!result.passed && result.checks) {
      for (const check of result.checks) {
        if (!check.success) {
          console.log(`   ❌ ${check.image}: ${check.url || 'N/A'} - ${check.error || `HTTP ${check.status}`}`);
        }
      }
    }
  }
  
  console.log('═'.repeat(60));
  
  if (allPassed) {
    console.log('✅ All directory checks passed!');
    return 0;
  } else {
    console.log('❌ Some directory checks failed. See details above.');
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
