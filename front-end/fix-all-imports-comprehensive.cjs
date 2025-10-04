const fs = require('fs');
const path = require('path');

console.log('Building comprehensive file map...');

// Build a complete map of all files in the project
const fileMap = new Map();
const filesByName = new Map();

function scanDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== 'dist') {
      scanDirectory(fullPath);
    } else if (item.isFile() && /\.(tsx?|jsx?|json)$/.test(item.name)) {
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

scanDirectory('src');
console.log(`Found ${fileMap.size} files`);

// Function to find the correct import path
function findCorrectPath(fromFile, importPath) {
  const fromDir = path.dirname(fromFile);
  
  // Extract the base name from the import
  let searchName = path.basename(importPath, path.extname(importPath));
  
  // Remove any ./ or ../ from the beginning for searching
  const cleanPath = importPath.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  searchName = path.basename(cleanPath, path.extname(cleanPath));
  
  // Look for files with this name
  const candidates = filesByName.get(searchName) || [];
  
  if (candidates.length === 0) {
    // Try without extension
    const possibleExts = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    for (const ext of possibleExts) {
      const withExt = filesByName.get(searchName + ext) || [];
      candidates.push(...withExt);
    }
  }
  
  // Also check if it might be an index file
  if (searchName !== 'index') {
    const indexCandidates = [];
    for (const [filePath] of fileMap) {
      if (filePath.includes(`/${searchName}/index.`)) {
        indexCandidates.push(path.dirname(filePath));
      }
    }
    candidates.push(...indexCandidates);
  }
  
  if (candidates.length === 0) return null;
  
  // Find the best candidate (prefer same directory structure)
  let bestCandidate = candidates[0];
  
  // If import contains path segments, try to match them
  if (importPath.includes('/')) {
    const importSegments = cleanPath.split('/');
    for (const candidate of candidates) {
      const candidateSegments = candidate.split('/');
      let matches = 0;
      for (let i = 0; i < importSegments.length && i < candidateSegments.length; i++) {
        if (importSegments[importSegments.length - 1 - i] === candidateSegments[candidateSegments.length - 1 - i]) {
          matches++;
        }
      }
      if (matches > 0) {
        bestCandidate = candidate;
        break;
      }
    }
  }
  
  // Calculate relative path from source to target
  const targetPath = path.resolve(process.cwd(), bestCandidate);
  const sourcePath = path.resolve(process.cwd(), fromFile);
  const sourceDir = path.dirname(sourcePath);
  
  let relativePath = path.relative(sourceDir, targetPath);
  
  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  // Remove extension for TS/JS files
  relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '');
  
  // Convert backslashes to forward slashes (Windows compatibility)
  relativePath = relativePath.replace(/\\/g, '/');
  
  return relativePath;
}

console.log('Fixing imports in all files...');

let totalFixed = 0;
let filesFixed = 0;

// Process each source file
for (const [filePath] of fileMap) {
  if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;
  
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let fileChanged = false;
  
  // Find all imports
  const importRegex = /^import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  // Process static imports
  newContent = newContent.replace(importRegex, (match, importPath) => {
    // Skip external modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      // Check if it's a path that should be relative (not in node_modules)
      if (!importPath.startsWith('@') && !fs.existsSync(path.join('node_modules', importPath.split('/')[0]))) {
        // This might be an absolute import that should be relative
        const correctPath = findCorrectPath(filePath, importPath);
        if (correctPath && correctPath !== importPath) {
          totalFixed++;
          fileChanged = true;
          return match.replace(importPath, correctPath);
        }
      }
      return match;
    }
    
    // Check if the current import resolves
    const fromDir = path.dirname(filePath);
    const fullPath = path.resolve(fromDir, importPath);
    
    // Check with various extensions
    const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    let found = false;
    
    for (const ext of exts) {
      if (fs.existsSync(fullPath + ext)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Try to find the correct path
      const correctPath = findCorrectPath(filePath, importPath);
      if (correctPath && correctPath !== importPath) {
        totalFixed++;
        fileChanged = true;
        return match.replace(importPath, correctPath);
      }
    }
    
    return match;
  });
  
  // Process dynamic imports
  newContent = newContent.replace(dynamicImportRegex, (match, importPath) => {
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      if (!importPath.startsWith('@') && !fs.existsSync(path.join('node_modules', importPath.split('/')[0]))) {
        const correctPath = findCorrectPath(filePath, importPath);
        if (correctPath && correctPath !== importPath) {
          totalFixed++;
          fileChanged = true;
          return match.replace(importPath, correctPath);
        }
      }
      return match;
    }
    
    const fromDir = path.dirname(filePath);
    const fullPath = path.resolve(fromDir, importPath);
    
    const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    let found = false;
    
    for (const ext of exts) {
      if (fs.existsSync(fullPath + ext)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      const correctPath = findCorrectPath(filePath, importPath);
      if (correctPath && correctPath !== importPath) {
        totalFixed++;
        fileChanged = true;
        return match.replace(importPath, correctPath);
      }
    }
    
    return match;
  });
  
  if (fileChanged) {
    fs.writeFileSync(filePath, newContent);
    filesFixed++;
    console.log(`Fixed imports in: ${filePath}`);
  }
}

console.log(`\nFixed ${totalFixed} imports in ${filesFixed} files!`);
