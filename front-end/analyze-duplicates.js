#!/usr/bin/env node
/**
 * Analysis script to identify duplicate code/files/directories
 * Based on Router.tsx as source of truth
 */

const fs = require('fs');
const path = require('path');

const ROUTER_FILE = 'src/routes/Router.tsx';
const SRC_DIR = 'src';

// Read Router.tsx
const routerContent = fs.readFileSync(ROUTER_FILE, 'utf8');

// Extract all import paths
const importRegex = /import\(['"]([^'"]+)['"]\)/g;
const imports = new Set();
let match;
while ((match = importRegex.exec(routerContent)) !== null) {
  imports.add(match[1]);
}

// Also get direct imports
const directImportRegex = /from\s+['"]([^'"]+)['"]/g;
while ((match = directImportRegex.exec(routerContent)) !== null) {
  imports.add(match[1]);
}

// Normalize paths (remove ../ and ./)
const normalizedImports = Array.from(imports).map(imp => {
  let normalized = imp;
  if (normalized.startsWith('../')) {
    normalized = normalized.replace(/^\.\.\//, '');
  }
  if (normalized.startsWith('./')) {
    normalized = normalized.replace(/^\.\//, '');
  }
  if (normalized.startsWith('@/')) {
    normalized = normalized.replace(/^@\//, '');
  }
  return normalized;
});

console.log('=== ROUTER IMPORTS ANALYSIS ===');
console.log(`Total unique imports: ${normalizedImports.length}`);
console.log('\nAll imports:');
normalizedImports.forEach(imp => console.log(`  - ${imp}`));

// Function to recursively get all directories
function getAllDirs(dir, baseDir = '') {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir || SRC_DIR, fullPath).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        // Skip node_modules and other common ignores
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          results.push(relativePath);
          results.push(...getAllDirs(fullPath, baseDir || SRC_DIR));
        }
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
  return results;
}

// Get all directories in src
const allDirs = getAllDirs(SRC_DIR);
const allDirsSet = new Set(allDirs);

// Get all files in src
function getAllFiles(dir, baseDir = '') {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir || SRC_DIR, fullPath).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          results.push(...getAllFiles(fullPath, baseDir || SRC_DIR));
        }
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        results.push(relativePath);
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
  return results;
}

const allFiles = getAllFiles(SRC_DIR);

// Check for legacy directory
const legacyExists = fs.existsSync('src/legacy');
const legacyDirs = legacyExists ? getAllDirs('src/legacy') : [];

console.log('\n=== DIRECTORY ANALYSIS ===');
console.log(`Total directories in src/: ${allDirs.length}`);
console.log(`Legacy directory exists: ${legacyExists}`);
if (legacyExists) {
  console.log(`Directories in legacy/: ${legacyDirs.length}`);
}

// Find potential duplicates
const potentialDuplicates = [];
const dirNames = new Map();

allDirs.forEach(dir => {
  const dirName = path.basename(dir);
  if (!dirNames.has(dirName)) {
    dirNames.set(dirName, []);
  }
  dirNames.get(dirName).push(dir);
});

dirNames.forEach((paths, name) => {
  if (paths.length > 1) {
    potentialDuplicates.push({ name, paths });
  }
});

console.log('\n=== POTENTIAL DUPLICATE DIRECTORIES ===');
potentialDuplicates.forEach(({ name, paths }) => {
  console.log(`\n"${name}" found in:`);
  paths.forEach(p => console.log(`  - ${p}`));
});

// Check for unused directories (not referenced in imports)
const usedDirs = new Set();
normalizedImports.forEach(imp => {
  const parts = imp.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const dirPath = parts.slice(0, i).join('/');
    usedDirs.add(dirPath);
  }
});

const unusedDirs = allDirs.filter(dir => {
  // Check if any part of the directory path is used
  const parts = dir.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const dirPath = parts.slice(0, i).join('/');
    if (usedDirs.has(dirPath)) {
      return false;
    }
  }
  // Also check if it's a parent of a used import
  return !normalizedImports.some(imp => imp.startsWith(dir + '/') || dir.startsWith(imp));
});

console.log('\n=== POTENTIALLY UNUSED DIRECTORIES ===');
console.log(`Found ${unusedDirs.length} potentially unused directories`);
unusedDirs.slice(0, 50).forEach(dir => console.log(`  - ${dir}`));
if (unusedDirs.length > 50) {
  console.log(`  ... and ${unusedDirs.length - 50} more`);
}

// Check for commented out imports
const commentedImports = [];
const commentedRegex = /\/\/\s*const\s+\w+\s*=\s*Loadable\(lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)\)\)/g;
while ((match = commentedRegex.exec(routerContent)) !== null) {
  commentedImports.push(match[1]);
}

console.log('\n=== COMMENTED OUT IMPORTS ===');
console.log(`Found ${commentedImports.length} commented imports:`);
commentedImports.forEach(imp => console.log(`  - ${imp}`));

// Check for duplicate route definitions
const routePaths = [];
const routePathRegex = /path:\s*['"]([^'"]+)['"]/g;
while ((match = routePathRegex.exec(routerContent)) !== null) {
  routePaths.push(match[1]);
}

const duplicateRoutes = [];
const routeCounts = new Map();
routePaths.forEach(route => {
  routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
});

routeCounts.forEach((count, route) => {
  if (count > 1) {
    duplicateRoutes.push({ route, count });
  }
});

console.log('\n=== DUPLICATE ROUTE PATHS ===');
if (duplicateRoutes.length > 0) {
  duplicateRoutes.forEach(({ route, count }) => {
    console.log(`  "${route}" appears ${count} times`);
  });
} else {
  console.log('  No duplicate routes found');
}

// Output summary
console.log('\n=== SUMMARY ===');
console.log(`Total imports in Router: ${normalizedImports.length}`);
console.log(`Total directories: ${allDirs.length}`);
console.log(`Potentially unused directories: ${unusedDirs.length}`);
console.log(`Commented out imports: ${commentedImports.length}`);
console.log(`Duplicate directory names: ${potentialDuplicates.length}`);
console.log(`Duplicate routes: ${duplicateRoutes.length}`);
console.log(`Legacy directory exists: ${legacyExists}`);

