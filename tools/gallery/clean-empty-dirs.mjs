#!/usr/bin/env node
/**
 * Clean Empty Directories Script
 * 
 * Removes empty directories under front-end/public/images/*
 * Excludes the 6 top-level organization directories (logos, backgrounds, icons, ui, records, misc)
 * 
 * Usage:
 *   node tools/gallery/clean-empty-dirs.mjs --dry-run     # Preview what will be deleted
 *   node tools/gallery/clean-empty-dirs.mjs --apply       # Delete empty directories
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get repo root
function getRepoRoot() {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    
    if (fs.existsSync(gitRoot)) {
      return gitRoot;
    }
  } catch (error) {
    // Git not available, use fallback
  }
  
  const scriptDir = __dirname;
  const toolsDir = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(toolsDir, '..');
  
  return repoRoot;
}

const REPO_ROOT = getRepoRoot();
const IMAGES_ROOT = path.join(REPO_ROOT, 'front-end', 'public', 'images');

// Directories to preserve (even if empty)
const PRESERVE_DIRS = new Set([
  'logos',
  'backgrounds',
  'icons',
  'ui',
  'records',
  'misc'
]);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--apply') ? false : true;
const hasApply = args.includes('--apply');

console.log('🧹 Clean Empty Directories Script');
console.log(`📁 Images root: ${IMAGES_ROOT}`);
console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
console.log('');

// Verify images root exists
if (!fs.existsSync(IMAGES_ROOT)) {
  console.error(`❌ Images root does not exist: ${IMAGES_ROOT}`);
  process.exit(1);
}

/**
 * Find all empty directories recursively
 */
function findEmptyDirectories(dir, basePath = '') {
  const emptyDirs = [];
  
  if (!fs.existsSync(dir)) {
    return emptyDirs;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if directory is empty (no files, only empty subdirectories)
    const files = entries.filter(e => e.isFile());
    const dirs = entries.filter(e => e.isDirectory());
    
    // Process subdirectories first (depth-first)
    for (const entry of dirs) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      // Recursively find empty directories in subdirectories
      const subEmptyDirs = findEmptyDirectories(fullPath, relativePath);
      emptyDirs.push(...subEmptyDirs);
    }
    
    // Check if this directory itself is empty
    // (only if it's not in the preserve list and has no files)
    const dirName = path.basename(dir);
    const isPreserved = PRESERVE_DIRS.has(dirName) && basePath === '';
    
    if (files.length === 0 && !isPreserved) {
      // Double-check: verify it's truly empty (no hidden files, etc.)
      const allEntries = fs.readdirSync(dir);
      if (allEntries.length === 0 || allEntries.every(e => e.startsWith('.'))) {
        // Only empty or only hidden files
        emptyDirs.push({
          path: dir,
          relPath: basePath || dirName
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️  Error reading directory ${dir}: ${error.message}`);
  }
  
  return emptyDirs;
}

/**
 * Sort directories by depth (deepest first) so we can delete nested empty dirs
 */
function sortByDepth(dirs) {
  return dirs.sort((a, b) => {
    const depthA = a.relPath.split('/').length;
    const depthB = b.relPath.split('/').length;
    return depthB - depthA; // Deepest first
  });
}

/**
 * Main execution
 */
function main() {
  console.log('📊 Finding empty directories...');
  
  const emptyDirs = findEmptyDirectories(IMAGES_ROOT);
  const sortedDirs = sortByDepth(emptyDirs);
  
  // Filter out preserved directories (extra safety check)
  const toDelete = sortedDirs.filter(dir => {
    const parts = dir.relPath.split('/');
    const topLevel = parts[0];
    return !PRESERVE_DIRS.has(topLevel) || parts.length > 1;
  });
  
  console.log(`   Found ${toDelete.length} empty directories`);
  console.log('');
  
  if (toDelete.length === 0) {
    console.log('✅ No empty directories to clean');
    return;
  }
  
  if (isDryRun) {
    console.log('🔍 DRY RUN - Preview of directories to delete:');
    console.log('');
    toDelete.forEach((dir, idx) => {
      console.log(`   ${idx + 1}. ${dir.relPath}`);
    });
    console.log('');
    console.log('ℹ️  To delete these directories, run with --apply flag');
  } else {
    console.log('🗑️  APPLY MODE - Deleting empty directories...');
    console.log('');
    
    let deleted = 0;
    let failed = 0;
    
    for (const dir of toDelete) {
      try {
        // Double-check directory is still empty before deleting
        const entries = fs.readdirSync(dir.path);
        if (entries.length === 0 || entries.every(e => e.startsWith('.'))) {
          fs.rmdirSync(dir.path);
          console.log(`   ✅ Deleted: ${dir.relPath}`);
          deleted++;
        } else {
          console.log(`   ⚠️  Skipped (no longer empty): ${dir.relPath}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to delete ${dir.relPath}: ${error.message}`);
        failed++;
      }
    }
    
    console.log('');
    console.log(`✅ Successfully deleted: ${deleted}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
    }
    console.log('');
    console.log('✅ Process complete!');
  }
}

main();
