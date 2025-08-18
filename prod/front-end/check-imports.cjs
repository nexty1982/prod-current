#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const targetDir = process.argv[2] || 'src';
const rootDir = process.cwd();
const targetPath = path.join(rootDir, targetDir);

// Colors for terminal output (basic ANSI codes)
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
};

// Check if directory exists
if (!fs.existsSync(targetPath)) {
  console.error(colors.red(`Error: Directory "${targetPath}" does not exist`));
  process.exit(1);
}

let brokenImports = [];
let totalFiles = 0;
let totalImports = 0;

// Extensions to try when resolving
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ''];
const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

// Function to recursively get all source files
function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        getAllFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Only process source files
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

// Function to extract imports from file content
function extractImports(content, filePath) {
  const imports = [];
  
  // Match ES6 imports (including dynamic imports)
  // import ... from '...'
  // import('...')
  const es6ImportRegex = /import\s*(?:type\s+)?(?:[\s\S]*?from\s+)?['"](.*?)['"]/g;
  const dynamicImportRegex = /import\s*\(['"](.*?)['"]\)/g;
  
  // Match CommonJS requires
  const requireRegex = /require\s*\(['"](.*?)['"]\)/g;
  
  let match;
  
  // Skip type-only imports
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip type-only imports
    if (line.includes('import type') || line.includes('import { type')) {
      continue;
    }
    
    // Extract ES6 imports
    const es6Matches = line.matchAll(/import\s*(?:[\s\S]*?from\s+)?['"](.*?)['"]/g);
    for (const m of es6Matches) {
      if (m[1]) {
        imports.push({
          path: m[1],
          line: i + 1,
          type: 'import'
        });
      }
    }
    
    // Extract dynamic imports
    const dynamicMatches = line.matchAll(/import\s*\(['"](.*?)['"]\)/g);
    for (const m of dynamicMatches) {
      if (m[1]) {
        imports.push({
          path: m[1],
          line: i + 1,
          type: 'dynamic'
        });
      }
    }
    
    // Extract requires
    const requireMatches = line.matchAll(/require\s*\(['"](.*?)['"]\)/g);
    for (const m of requireMatches) {
      if (m[1]) {
        imports.push({
          path: m[1],
          line: i + 1,
          type: 'require'
        });
      }
    }
  }
  
  return imports;
}

// Function to resolve import path
function resolveImport(importPath, fromFile) {
  const fileDir = path.dirname(fromFile);
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const absolutePath = path.resolve(fileDir, importPath);
    
    // Try with different extensions
    for (const ext of extensions) {
      const testPath = absolutePath + ext;
      if (fs.existsSync(testPath)) {
        const stat = fs.statSync(testPath);
        if (stat.isFile()) {
          return { resolved: true, path: testPath };
        }
      }
    }
    
    // Try as directory with index file
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
      for (const indexFile of indexFiles) {
        const indexPath = path.join(absolutePath, indexFile);
        if (fs.existsSync(indexPath)) {
          return { resolved: true, path: indexPath };
        }
      }
    }
    
    return { resolved: false, reason: 'File or directory not found' };
  }
  
  // Handle absolute imports (from src) or node_modules
  if (!importPath.startsWith('@') && !importPath.includes('/')) {
    // This is likely a node_modules package
    try {
      // Check if package exists in node_modules
      const packagePath = path.join(rootDir, 'node_modules', importPath);
      if (fs.existsSync(packagePath)) {
        return { resolved: true, path: packagePath };
      }
      return { resolved: false, reason: 'Package not installed in node_modules' };
    } catch (e) {
      return { resolved: false, reason: 'Package not found' };
    }
  }
  
  // Handle scoped packages
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      const scopedPackage = parts.slice(0, 2).join('/');
      const packagePath = path.join(rootDir, 'node_modules', scopedPackage);
      if (fs.existsSync(packagePath)) {
        return { resolved: true, path: packagePath };
      }
      return { resolved: false, reason: 'Scoped package not installed' };
    }
  }
  
  // Handle absolute imports from src (without ./ or ../)
  // These might be using baseUrl or paths from tsconfig
  const srcPath = path.join(rootDir, 'src', importPath);
  for (const ext of extensions) {
    const testPath = srcPath + ext;
    if (fs.existsSync(testPath)) {
      const stat = fs.statSync(testPath);
      if (stat.isFile()) {
        return { resolved: true, path: testPath };
      }
    }
  }
  
  // Try as directory with index
  if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
    for (const indexFile of indexFiles) {
      const indexPath = path.join(srcPath, indexFile);
      if (fs.existsSync(indexPath)) {
        return { resolved: true, path: indexPath };
      }
    }
  }
  
  return { resolved: false, reason: 'Module not found (not in node_modules or src)' };
}

// Main processing
console.log(colors.blue(`\nScanning ${targetPath} for import errors...\n`));

const files = getAllFiles(targetPath);
totalFiles = files.length;

console.log(colors.gray(`Found ${totalFiles} source files to check\n`));

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const imports = extractImports(content, file);
  totalImports += imports.length;
  
  for (const imp of imports) {
    const result = resolveImport(imp.path, file);
    
    if (!result.resolved) {
      const relativePath = path.relative(rootDir, file);
      brokenImports.push({
        file: relativePath,
        import: imp.path,
        line: imp.line,
        type: imp.type,
        reason: result.reason
      });
    }
  }
}

// Print results
console.log(colors.blue('\n=== Import Check Results ===\n'));
console.log(`Total files scanned: ${colors.yellow(totalFiles)}`);
console.log(`Total imports found: ${colors.yellow(totalImports)}`);

if (brokenImports.length === 0) {
  console.log(colors.green('\n✓ All imports resolved successfully!\n'));
  process.exit(0);
} else {
  console.log(colors.red(`\n✗ Found ${brokenImports.length} broken imports:\n`));
  
  // Group by file for better readability
  const byFile = {};
  for (const broken of brokenImports) {
    if (!byFile[broken.file]) {
      byFile[broken.file] = [];
    }
    byFile[broken.file].push(broken);
  }
  
  for (const [file, issues] of Object.entries(byFile)) {
    console.log(colors.yellow(`\nBroken imports in: ${file}`));
    for (const issue of issues) {
      console.log(colors.gray(`  Line ${issue.line}:`) + ` ${issue.type} "${colors.red(issue.import)}"`);
      console.log(colors.gray(`    Error: ${issue.reason}`));
    }
  }
  
  console.log(colors.red(`\n✗ Fix ${brokenImports.length} import errors before building.\n`));
  process.exit(1);
}
