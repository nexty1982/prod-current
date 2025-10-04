#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_GLOB = 'src/**/*.{ts,tsx}';

class ImportSyntaxFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  async fixFiles(rootDir) {
    console.log('🔧 Import Syntax Fixer Starting...\n');
    
    // Find all source files
    const files = await glob(SRC_GLOB, {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    console.log(`Found ${files.length} source files to process\n`);

    for (const file of files) {
      await this.fixFile(file);
    }
    
    console.log(`\n✅ Import syntax fixing complete!`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files fixed: ${this.fixedFiles}`);
    console.log(`   Total fixes: ${this.totalFixes}`);
  }

  async fixFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      let fixedContent = originalContent;
      let changes = 0;

      // Fix duplicate import statements
      const lines = fixedContent.split('\n');
      const fixedLines = [];
      let i = 0;
      
      while (i < lines.length) {
        const line = lines[i];
        
        // Check if this is an import statement
        if (line.trim().startsWith('import ')) {
          const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
          
          // Check if next line is also an import from the same module
          if (nextLine.trim().startsWith('import ') && 
              line.includes('from ') && 
              nextLine.includes('from ') &&
              line.split('from ')[1] === nextLine.split('from ')[1]) {
            
            // Merge the imports
            const firstImport = line.trim();
            const secondImport = nextLine.trim();
            
            // Extract what's being imported from each line
            const firstMatch = firstImport.match(/import\s+([^}]+)\s+from/);
            const secondMatch = secondImport.match(/import\s+([^}]+)\s+from/);
            
            if (firstMatch && secondMatch) {
              const firstImports = firstMatch[1].trim();
              const secondImports = secondMatch[1].trim();
              const modulePath = firstImport.split('from ')[1];
              
              // Combine imports
              const combinedImports = `${firstImports}, ${secondImports}`;
              const mergedLine = `import ${combinedImports} from ${modulePath}`;
              
              fixedLines.push(mergedLine);
              changes++;
              i += 2; // Skip both lines
              continue;
            }
          }
        }
        
        fixedLines.push(line);
        i++;
      }
      
      fixedContent = fixedLines.join('\n');

      // Fix malformed import statements (missing closing quote)
      const malformedImportPattern = /import\s+[^'"]*['"][^'"]*$/gm;
      fixedContent = fixedContent.replace(malformedImportPattern, (match) => {
        if (!match.includes("'") && !match.includes('"')) {
          changes++;
          return match + '";';
        }
        return match;
      });

      // Fix incomplete import statements
      const incompleteImportPattern = /import\s*{\s*$/gm;
      fixedContent = fixedContent.replace(incompleteImportPattern, (match) => {
        changes++;
        return match.replace(/\{\s*$/, '{} from "";');
      });

      // Only write if changes were made
      if (changes > 0) {
        fs.writeFileSync(filePath, fixedContent, 'utf-8');
        this.fixedFiles++;
        this.totalFixes += changes;
        console.log(`  ✓ ${path.relative(process.cwd(), filePath)} (${changes} fixes)`);
      }

    } catch (error) {
      console.error(`  ✗ Error processing ${filePath}:`, error.message);
    }
  }
}

// CLI execution
async function main() {
  const rootDir = process.argv[2] || process.cwd();
  
  console.log(`Fixing import syntax in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const fixer = new ImportSyntaxFixer();
  await fixer.fixFiles(rootDir);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ImportSyntaxFixer };
