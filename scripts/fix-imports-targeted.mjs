#!/usr/bin/env node

/**
 * Targeted Import Fixer
 * Focuses on the specific import issues we've identified
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';

class TargetedImportFixer {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.srcDir = join(rootDir, 'src');
    this.fixes = [];
  }

  async findProblematicImports() {
    console.log('🔍 Finding problematic imports...');
    
    const patterns = [
      // Common problematic patterns
      "src/features/records-centralized/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/views/**/*.{ts,tsx}"
    ];
    
    const files = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.rootDir });
      files.push(...matches);
    }
    
    const problematic = [];
    
    for (const file of files) {
      const fullPath = join(this.rootDir, file);
      const content = readFileSync(fullPath, 'utf8');
      
      // Find import statements
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        // Check if this is a problematic import
        if (this.isProblematicImport(importPath, file)) {
          problematic.push({
            file,
            importPath,
            lineNumber,
            fullMatch: match[0]
          });
        }
      }
    }
    
    console.log(`❌ Found ${problematic.length} problematic imports`);
    return problematic;
  }

  isProblematicImport(importPath, fromFile) {
    // Skip external dependencies
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      return false;
    }
    
    // Check if the import path exists
    const resolvedPath = this.resolveImportPath(importPath, fromFile);
    return !resolvedPath || !existsSync(join(this.rootDir, resolvedPath));
  }

  resolveImportPath(importPath, fromFile) {
    const fromDir = dirname(fromFile);
    
    if (importPath.startsWith('@/')) {
      return importPath.replace('@/', 'src/');
    }
    
    if (importPath.startsWith('.')) {
      return join(fromDir, importPath);
    }
    
    return null;
  }

  async fixImports(problematicImports) {
    console.log('✏️  Fixing imports...');
    
    for (const { file, importPath, lineNumber } of problematicImports) {
      const fixedPath = await this.findCorrectPath(importPath, file);
      
      if (fixedPath) {
        await this.applyFix(file, importPath, fixedPath);
        this.fixes.push({
          file,
          lineNumber,
          oldPath: importPath,
          newPath: fixedPath
        });
        console.log(`✅ ${file}:${lineNumber} ${importPath} → ${fixedPath}`);
      } else {
        console.log(`❌ No fix found for ${file}:${lineNumber} ${importPath}`);
      }
    }
  }

  async findCorrectPath(importPath, fromFile) {
    const fromDir = dirname(fromFile);
    
    // Common fixes based on patterns we've seen
    const fixes = [
      // Fix @/features/Records-centralized to @/features/records-centralized
      {
        pattern: /@\/features\/Records-centralized/,
        replacement: '@/features/records-centralized'
      },
      // Fix ../api/ to ./ for same directory
      {
        pattern: /\.\.\/api\//,
        replacement: './'
      },
      // Fix ./constants to ../constants for forms
      {
        pattern: /\.\/constants$/,
        replacement: '../constants',
        condition: (file) => file.includes('/forms/')
      },
      // Fix missing extensions
      {
        pattern: /^([^'"]+)$/,
        replacement: '$1',
        addExtensions: ['.ts', '.tsx', '.js', '.jsx']
      }
    ];
    
    for (const fix of fixes) {
      if (fix.condition && !fix.condition(fromFile)) {
        continue;
      }
      
      if (fix.pattern.test(importPath)) {
        let newPath = importPath.replace(fix.pattern, fix.replacement);
        
        if (fix.addExtensions) {
          for (const ext of fix.addExtensions) {
            const testPath = this.resolveImportPath(newPath + ext, fromFile);
            if (testPath && existsSync(join(this.rootDir, testPath))) {
              return newPath + ext;
            }
          }
        } else {
          const testPath = this.resolveImportPath(newPath, fromFile);
          if (testPath && existsSync(join(this.rootDir, testPath))) {
            return newPath;
          }
        }
      }
    }
    
    return null;
  }

  async applyFix(file, oldPath, newPath) {
    const fullPath = join(this.rootDir, file);
    let content = readFileSync(fullPath, 'utf8');
    
    // Replace the import path
    const importRegex = new RegExp(`import\\s+.*?\\s+from\\s+['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    content = content.replace(importRegex, (match) => {
      return match.replace(oldPath, newPath);
    });
    
    writeFileSync(fullPath, content);
  }

  generateReport() {
    console.log('\n📊 Import Fix Summary');
    console.log('='.repeat(50));
    
    if (this.fixes.length === 0) {
      console.log('No imports were fixed.');
      return;
    }
    
    console.log(`Total fixes: ${this.fixes.length}`);
    
    // Group by file
    const byFile = new Map();
    for (const fix of this.fixes) {
      if (!byFile.has(fix.file)) {
        byFile.set(fix.file, []);
      }
      byFile.get(fix.file).push(fix);
    }
    
    console.log('\nFixes by file:');
    for (const [file, fixes] of byFile) {
      console.log(`\n${file}:`);
      for (const fix of fixes) {
        console.log(`  Line ${fix.lineNumber}: ${fix.oldPath} → ${fix.newPath}`);
      }
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      totalFixes: this.fixes.length,
      fixes: this.fixes
    };
    
    writeFileSync(
      join(this.rootDir, '.om', 'import-fixes-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📄 Report saved to .om/import-fixes-report.json`);
  }

  async run() {
    console.log('🚀 Starting Targeted Import Fixer');
    console.log('='.repeat(50));
    
    try {
      // Ensure .om directory exists
      const { mkdirSync } = await import('fs');
      mkdirSync(join(this.rootDir, '.om'), { recursive: true });
      
      const problematicImports = await this.findProblematicImports();
      
      if (problematicImports.length === 0) {
        console.log('✅ No problematic imports found!');
        return;
      }
      
      await this.fixImports(problematicImports);
      this.generateReport();
      
      console.log('\n🎉 Import fixing completed!');
      
    } catch (error) {
      console.error('❌ Error during import fixing:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new TargetedImportFixer();
  fixer.run().catch(console.error);
}

export default TargetedImportFixer;
