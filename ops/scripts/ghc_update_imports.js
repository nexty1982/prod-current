#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to update import statements after file moves
 * Looks for relative imports that should be converted to @ aliases
 */

function getAllTsJsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and other excluded directories
      if (!['node_modules', 'dist', '.git', 'logs'].includes(entry.name)) {
        getAllTsJsFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Include TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function updateImportsInFile(filePath, projectRoot) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    const updates = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match import/require statements with relative paths
      const importMatch = line.match(/^(\s*(?:import|export).*from\s+['"])([^'"]+)(['"].*)/);
      const requireMatch = line.match(/^(\s*.*require\s*\(\s*['"])([^'"]+)(['"].*)/);
      
      const match = importMatch || requireMatch;
      if (match) {
        const [, prefix, importPath, suffix] = match;
        
        // Only update relative imports that go up directories
        if (importPath.startsWith('../')) {
          // Convert relative path to absolute path relative to project root
          const fileDir = path.dirname(filePath);
          const absoluteImportPath = path.resolve(fileDir, importPath);
          const relativeToRoot = path.relative(projectRoot, absoluteImportPath);
          
          // Convert to @ import if it's within the project
          if (!relativeToRoot.startsWith('..')) {
            const aliasImport = '@/' + relativeToRoot.replace(/\\/g, '/');
            const newLine = prefix + aliasImport + suffix;
            
            if (newLine !== line) {
              lines[i] = newLine;
              modified = true;
              updates.push({
                line: i + 1,
                from: importPath,
                to: aliasImport
              });
            }
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'));
      return updates;
    }
    
    return [];
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return [];
  }
}

function updateImports() {
  const prodDir = path.join(__dirname, '..', 'prod');
  const frontendDir = path.join(prodDir, 'front-end');
  const serverDir = path.join(prodDir, 'server');
  
  const report = {
    frontend: { filesProcessed: 0, filesUpdated: 0, totalUpdates: 0, updates: [] },
    server: { filesProcessed: 0, filesUpdated: 0, totalUpdates: 0, updates: [] }
  };
  
  console.log('Updating import statements to use @ aliases...\n');
  
  // Process frontend files
  if (fs.existsSync(frontendDir)) {
    console.log('Processing front-end files...');
    const frontendFiles = getAllTsJsFiles(frontendDir);
    
    for (const filePath of frontendFiles) {
      report.frontend.filesProcessed++;
      const updates = updateImportsInFile(filePath, frontendDir);
      
      if (updates.length > 0) {
        report.frontend.filesUpdated++;
        report.frontend.totalUpdates += updates.length;
        const relativePath = path.relative(prodDir, filePath);
        report.frontend.updates.push({ file: relativePath, updates });
        console.log(`  ✓ ${relativePath} (${updates.length} imports updated)`);
      }
    }
  }
  
  // Process server files
  if (fs.existsSync(serverDir)) {
    console.log('\nProcessing server files...');
    const serverFiles = getAllTsJsFiles(serverDir);
    
    for (const filePath of serverFiles) {
      report.server.filesProcessed++;
      const updates = updateImportsInFile(filePath, serverDir);
      
      if (updates.length > 0) {
        report.server.filesUpdated++;
        report.server.totalUpdates += updates.length;
        const relativePath = path.relative(prodDir, filePath);
        report.server.updates.push({ file: relativePath, updates });
        console.log(`  ✓ ${relativePath} (${updates.length} imports updated)`);
      }
    }
  }
  
  // Write report
  const reportPath = path.join(__dirname, 'ghc_import_updates_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n=== IMPORT UPDATE SUMMARY ===');
  console.log(`Frontend: ${report.frontend.filesUpdated}/${report.frontend.filesProcessed} files updated (${report.frontend.totalUpdates} imports)`);
  console.log(`Server: ${report.server.filesUpdated}/${report.server.filesProcessed} files updated (${report.server.totalUpdates} imports)`);
  console.log(`\nDetailed report written to: ${reportPath}`);
  
  return report;
}

if (require.main === module) {
  updateImports();
}

module.exports = { updateImports };
