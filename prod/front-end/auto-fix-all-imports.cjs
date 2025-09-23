#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running import checker to identify all issues...');

// Run check-imports and capture output
let checkOutput = '';
try {
  checkOutput = execSync('node check-imports.cjs', { encoding: 'utf8' });
} catch (error) {
  checkOutput = error.stdout || error.message;
}

// Parse the output to extract broken imports
const brokenImports = [];
const lines = checkOutput.split('\n');
let currentFile = null;

for (const line of lines) {
  if (line.includes('Broken imports in:')) {
    currentFile = line.replace('Broken imports in:', '').trim();
  } else if (line.includes('Line') && currentFile) {
    const lineMatch = line.match(/Line (\d+):\s*(import|require)\s*(.+)/);
    if (lineMatch) {
      const importMatch = lineMatch[3].match(/["']([^"']+)["']/);
      if (importMatch) {
        const errorLine = lines[lines.indexOf(line) + 1];
        brokenImports.push({
          file: currentFile,
          lineNum: lineMatch[1],
          type: lineMatch[2],
          importPath: importMatch[1],
          error: errorLine ? errorLine.replace('Error:', '').trim() : ''
        });
      }
    }
  }
}

console.log(`Found ${brokenImports.length} broken imports to fix\n`);

// Create a map of all available files for quick lookup
const fileMap = new Map();
const filesByName = new Map();

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== 'dist') {
      scanDirectory(fullPath);
    } else if (item.isFile()) {
      const relativePath = path.relative(process.cwd(), fullPath);
      const baseName = path.basename(item.name, path.extname(item.name));
      
      fileMap.set(relativePath, true);
      
      if (!filesByName.has(baseName)) {
        filesByName.set(baseName, []);
      }
      filesByName.get(baseName).push(relativePath);
    }
  }
}

console.log('Building file map...');
scanDirectory('src');
scanDirectory('public');

// Fix functions for different error types
const fixers = {
  'Package not installed in node_modules': (imp) => {
    console.log(`Installing missing package: ${imp.importPath}`);
    const packages = [];
    
    // Collect all missing packages
    for (const i of brokenImports) {
      if (i.error === 'Package not installed in node_modules' && !packages.includes(i.importPath)) {
        packages.push(i.importPath);
      }
    }
    
    if (packages.length > 0) {
      try {
        execSync(`npm install --save ${packages.join(' ')} --legacy-peer-deps`, { stdio: 'inherit' });
      } catch (e) {
        console.log('Some packages could not be installed');
      }
    }
    return null; // Will be fixed by package installation
  },
  
  'File or directory not found': (imp) => {
    const fileName = path.basename(imp.importPath, path.extname(imp.importPath));
    const fileDir = path.dirname(imp.file);
    
    // Special handling for CSS/style files
    if (imp.importPath.endsWith('.css') || imp.importPath.endsWith('.scss')) {
      // Create the missing CSS file
      const cssPath = path.join(path.dirname(imp.file), imp.importPath);
      const cssDir = path.dirname(cssPath);
      
      if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir, { recursive: true });
      }
      
      if (!fs.existsSync(cssPath)) {
        fs.writeFileSync(cssPath, `/* Auto-generated CSS file */\n`);
        console.log(`Created missing CSS file: ${cssPath}`);
      }
      return null;
    }
    
    // Look for the file in the project
    const candidates = filesByName.get(fileName) || [];
    
    if (candidates.length > 0) {
      // Find the best match
      let bestMatch = candidates[0];
      
      // Prefer files in similar directory structure
      for (const candidate of candidates) {
        if (imp.importPath.includes('/')) {
          const importParts = imp.importPath.split('/');
          const candidateParts = candidate.split('/');
          
          let matchScore = 0;
          for (let i = 0; i < Math.min(importParts.length, candidateParts.length); i++) {
            if (importParts[importParts.length - 1 - i] === candidateParts[candidateParts.length - 1 - i]) {
              matchScore++;
            }
          }
          
          if (matchScore > 0) {
            bestMatch = candidate;
            break;
          }
        }
      }
      
      // Calculate relative path
      const targetPath = path.resolve(process.cwd(), bestMatch);
      const sourcePath = path.resolve(process.cwd(), imp.file);
      const sourceDir = path.dirname(sourcePath);
      
      let relativePath = path.relative(sourceDir, targetPath);
      
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      // Remove extension for JS/TS files
      relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '');
      relativePath = relativePath.replace(/\\/g, '/');
      
      return relativePath;
    }
    
    return null;
  },
  
  'Module not found (not in node_modules or src)': (imp) => {
    // Handle src/ prefixed imports
    if (imp.importPath.startsWith('src/')) {
      const withoutSrc = imp.importPath.replace('src/', '');
      const fileDir = path.dirname(imp.file);
      const targetPath = path.resolve(process.cwd(), 'src', withoutSrc);
      
      if (fs.existsSync(targetPath) || fs.existsSync(targetPath + '.ts') || fs.existsSync(targetPath + '.tsx')) {
        let relativePath = path.relative(fileDir, targetPath);
        
        if (!relativePath.startsWith('.')) {
          relativePath = './' + relativePath;
        }
        
        relativePath = relativePath.replace(/\\/g, '/');
        return relativePath;
      }
    }
    
    // Try to find in local modules
    const baseName = path.basename(imp.importPath);
    const candidates = filesByName.get(baseName) || [];
    
    if (candidates.length > 0) {
      const fileDir = path.dirname(imp.file);
      const targetPath = path.resolve(process.cwd(), candidates[0]);
      
      let relativePath = path.relative(fileDir, targetPath);
      
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '');
      relativePath = relativePath.replace(/\\/g, '/');
      
      return relativePath;
    }
    
    return null;
  }
};

// Group imports by file for batch fixing
const importsByFile = {};
for (const imp of brokenImports) {
  if (!importsByFile[imp.file]) {
    importsByFile[imp.file] = [];
  }
  importsByFile[imp.file].push(imp);
}

console.log('\nFixing imports...\n');

let totalFixed = 0;

// Fix imports in each file
for (const [filePath, imports] of Object.entries(importsByFile)) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping non-existent file: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const imp of imports) {
    const fixer = fixers[imp.error];
    
    if (fixer) {
      const newPath = fixer(imp);
      
      if (newPath) {
        // Build regex to match the import statement
        const escapedPath = imp.importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
          new RegExp(`(import\\s+.*?from\\s+['"])${escapedPath}(['"])`, 'g'),
          new RegExp(`(import\\s*\\(\\s*['"])${escapedPath}(['"]\\s*\\))`, 'g'),
          new RegExp(`(require\\s*\\(\\s*['"])${escapedPath}(['"]\\s*\\))`, 'g')
        ];
        
        for (const pattern of patterns) {
          const newContent = content.replace(pattern, `$1${newPath}$2`);
          if (newContent !== content) {
            content = newContent;
            modified = true;
            totalFixed++;
            console.log(`Fixed: ${filePath} - "${imp.importPath}" -> "${newPath}"`);
            break;
          }
        }
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
  }
}

console.log(`\n✓ Fixed ${totalFixed} imports!`);

// Run check-imports again to verify
console.log('\nVerifying fixes...');
try {
  execSync('node check-imports.cjs', { stdio: 'inherit' });
  console.log('\n✓ All imports resolved successfully!');
} catch (error) {
  console.log('\n⚠ Some imports may still need manual fixing');
  console.log('Run "node check-imports.cjs" to see remaining issues');
}
