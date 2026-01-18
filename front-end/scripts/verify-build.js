#!/usr/bin/env node
/**
 * Frontend Build Verification Script
 * Ensures dist/ folder has updated files from the build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${COLORS.reset} ${message}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

async function verifyBuild() {
  console.log('\n🔍 Frontend Build Verification\n');
  console.log('='.repeat(50));

  let errors = 0;
  let warnings = 0;

  // 1. Check dist directory exists
  if (!fs.existsSync(distDir)) {
    log(COLORS.red, '❌', `dist/ directory not found at ${distDir}`);
    process.exit(1);
  }
  log(COLORS.green, '✓', 'dist/ directory exists');

  // 2. Check for index.html
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    log(COLORS.red, '❌', 'index.html not found in dist/');
    errors++;
  } else {
    const indexStats = fs.statSync(indexPath);
    const age = Date.now() - indexStats.mtimeMs;
    log(COLORS.green, '✓', `index.html exists (${formatBytes(indexStats.size)}, modified ${formatTime(age)} ago)`);
    
    if (age > 300000) { // 5 minutes
      log(COLORS.yellow, '⚠', 'index.html is older than 5 minutes - may be stale');
      warnings++;
    }
  }

  // 3. Check for assets directory
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    log(COLORS.red, '❌', 'assets/ directory not found in dist/');
    errors++;
  } else {
    const assetFiles = fs.readdirSync(assetsDir);
    const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
    const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
    
    log(COLORS.green, '✓', `assets/ contains ${assetFiles.length} files (${jsFiles.length} JS, ${cssFiles.length} CSS)`);

    // Check for main bundle
    const mainBundle = jsFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));
    if (!mainBundle) {
      log(COLORS.yellow, '⚠', 'Main bundle (index-*.js) not found');
      warnings++;
    } else {
      const bundlePath = path.join(assetsDir, mainBundle);
      const bundleStats = fs.statSync(bundlePath);
      log(COLORS.green, '✓', `Main bundle: ${mainBundle} (${formatBytes(bundleStats.size)})`);
    }
  }

  // 4. Verify build freshness by comparing source and dist modification times
  const srcDir = path.join(rootDir, 'src');
  if (fs.existsSync(srcDir)) {
    const distMtime = getNewestFileTime(distDir);
    const srcMtime = getNewestFileTime(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
    
    if (srcMtime > distMtime) {
      const diff = srcMtime - distMtime;
      log(COLORS.yellow, '⚠', `Source files modified after build (${formatTime(diff)} newer)`);
      warnings++;
      
      // Find recently modified source files
      const recentFiles = findRecentlyModified(srcDir, distMtime, ['.ts', '.tsx', '.js', '.jsx']);
      if (recentFiles.length > 0) {
        console.log('\n  Recently modified source files:');
        recentFiles.slice(0, 5).forEach(f => {
          console.log(`    - ${path.relative(rootDir, f.path)} (${formatTime(Date.now() - f.mtime)} ago)`);
        });
        if (recentFiles.length > 5) {
          console.log(`    ... and ${recentFiles.length - 5} more`);
        }
      }
    } else {
      log(COLORS.green, '✓', 'Build is up-to-date with source files');
    }
  }

  // 5. Check critical route chunks exist
  const criticalChunks = [
    'EnhancedOCRUploader',
    'OCRStudioPage',
    'OcrUploader',
    'SuperDashboard',
    'ModernDashboard'
  ];

  console.log('\n📦 Checking route chunks:');
  const allAssets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
  
  criticalChunks.forEach(chunk => {
    const found = allAssets.some(f => f.includes(chunk));
    if (found) {
      log(COLORS.green, '  ✓', `${chunk} chunk found`);
    } else {
      log(COLORS.yellow, '  ⚠', `${chunk} chunk not found (may be bundled)`);
    }
  });

  // 6. Calculate total build size
  const totalSize = calculateDirSize(distDir);
  console.log('\n📊 Build Statistics:');
  console.log(`   Total size: ${formatBytes(totalSize)}`);
  
  const assetSize = fs.existsSync(assetsDir) ? calculateDirSize(assetsDir) : 0;
  console.log(`   Assets: ${formatBytes(assetSize)}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  if (errors > 0) {
    log(COLORS.red, '❌', `Build verification FAILED with ${errors} error(s) and ${warnings} warning(s)`);
    process.exit(1);
  } else if (warnings > 0) {
    log(COLORS.yellow, '⚠', `Build verification PASSED with ${warnings} warning(s)`);
    process.exit(0);
  } else {
    log(COLORS.green, '✓', 'Build verification PASSED');
    process.exit(0);
  }
}

function getNewestFileTime(dir, extensions = null) {
  let newest = 0;
  
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          walk(filePath);
        }
      } else {
        if (!extensions || extensions.some(ext => file.endsWith(ext))) {
          if (stat.mtimeMs > newest) {
            newest = stat.mtimeMs;
          }
        }
      }
    }
  }
  
  walk(dir);
  return newest;
}

function findRecentlyModified(dir, threshold, extensions) {
  const results = [];
  
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          walk(filePath);
        }
      } else {
        if (extensions.some(ext => file.endsWith(ext)) && stat.mtimeMs > threshold) {
          results.push({ path: filePath, mtime: stat.mtimeMs });
        }
      }
    }
  }
  
  walk(dir);
  return results.sort((a, b) => b.mtime - a.mtime);
}

function calculateDirSize(dir) {
  let size = 0;
  
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walk(filePath);
      } else {
        size += stat.size;
      }
    }
  }
  
  walk(dir);
  return size;
}

verifyBuild().catch(err => {
  console.error('Build verification error:', err);
  process.exit(1);
});

