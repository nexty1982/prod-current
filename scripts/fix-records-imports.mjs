#!/usr/bin/env node

/**
 * Records Centralized Import Fixer
 * Specifically targets the import issues in records-centralized features
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';

class RecordsImportFixer {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.srcDir = join(rootDir, 'src');
    this.fixes = [];
  }

  async fixRecordsImports() {
    console.log('🔍 Fixing records-centralized imports...');
    
    const recordsFiles = await glob('src/features/records-centralized/**/*.{ts,tsx}', { cwd: this.rootDir });
    
    for (const file of recordsFiles) {
      await this.fixFileImports(file);
    }
    
    console.log(`✅ Fixed ${this.fixes.length} import issues`);
  }

  async fixFileImports(file) {
    const fullPath = join(this.rootDir, file);
    let content = readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Fix specific patterns we've seen
    const patterns = [
      // Fix @/features/Records-centralized to @/features/records-centralized
      {
        pattern: /@\/features\/Records-centralized/g,
        replacement: '@/features/records-centralized'
      },
      // Fix ../api/ to ./ for same directory files
      {
        pattern: /from\s+['"]\.\.\/api\/([^'"]+)['"]/g,
        replacement: (match, apiFile) => {
          const fromDir = dirname(file);
          const apiPath = join(fromDir, '..', 'api', apiFile);
          const sameDirPath = join(fromDir, apiFile);
          
          // Check if file exists in same directory
          if (existsSync(join(this.rootDir, sameDirPath))) {
            return `from './${apiFile}'`;
          }
          return match;
        }
      },
      // Fix ./constants to ../constants for forms
      {
        pattern: /from\s+['"]\.\/constants['"]/g,
        replacement: (match) => {
          if (file.includes('/forms/')) {
            return `from '../constants'`;
          }
          return match;
        }
      },
      // Fix ../shared to ./ for records directory
      {
        pattern: /from\s+['"]\.\.\/shared['"]/g,
        replacement: (match) => {
          if (file.includes('/records/')) {
            return `from './useUnifiedRecords'`;
          }
          return match;
        }
      },
      // Fix ../shared to ../records/useUnifiedRecords for other components
      {
        pattern: /from\s+['"]\.\.\/shared['"]/g,
        replacement: (match) => {
          if (!file.includes('/records/') && file.includes('/components/')) {
            return `from '../records/useUnifiedRecords'`;
          }
          return match;
        }
      },
      // Fix missing extensions for known files
      {
        pattern: /from\s+['"]([^'"]+)['"]/g,
        replacement: (match, importPath) => {
          if (importPath.startsWith('.') && !importPath.match(/\.(ts|tsx|js|jsx)$/)) {
            const resolvedPath = this.resolveWithExtensions(importPath, file);
            if (resolvedPath) {
              return match.replace(importPath, resolvedPath);
            }
          }
          return match;
        }
      }
    ];
    
    for (const { pattern, replacement } of patterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      writeFileSync(fullPath, content);
      this.fixes.push(file);
      console.log(`✅ Fixed imports in ${file}`);
    }
  }

  resolveWithExtensions(importPath, fromFile) {
    if (!importPath.startsWith('.')) return null;
    
    const fromDir = dirname(fromFile);
    const basePath = join(fromDir, importPath);
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    for (const ext of extensions) {
      const testPath = basePath + ext;
      if (existsSync(join(this.rootDir, testPath))) {
        return importPath + ext;
      }
    }
    
    return null;
  }

  async run() {
    console.log('🚀 Starting Records Import Fixer');
    console.log('='.repeat(50));
    
    try {
      await this.fixRecordsImports();
      
      if (this.fixes.length > 0) {
        console.log(`\n📊 Fixed ${this.fixes.length} files:`);
        this.fixes.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log('\n✅ No import issues found in records-centralized features');
      }
      
      console.log('\n🎉 Records import fixing completed!');
      
    } catch (error) {
      console.error('❌ Error during records import fixing:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new RecordsImportFixer();
  fixer.run().catch(console.error);
}

export default RecordsImportFixer;
