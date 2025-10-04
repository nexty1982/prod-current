#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_GLOB = 'src/**/*.{ts,tsx}';

class MalformedImportFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  async fixFiles(rootDir) {
    console.log('🔧 Malformed Import Fixer Starting...\n');
    
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
    
    console.log(`\n✅ Malformed import fixing complete!`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files fixed: ${this.fixedFiles}`);
    console.log(`   Total fixes: ${this.totalFixes}`);
  }

  async fixFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      let fixedContent = originalContent;
      let changes = 0;

      // Fix empty import statements
      fixedContent = fixedContent.replace(/import\s*\{\s*\}\s*from\s*"";?\s*\n/g, '');
      if (fixedContent !== originalContent) changes++;

      // Fix malformed import statements with missing closing brace
      fixedContent = fixedContent.replace(/import\s*\{\s*$/gm, (match, offset) => {
        // Find the next line that has a closing brace
        const lines = fixedContent.split('\n');
        const currentLineIndex = fixedContent.substring(0, offset).split('\n').length - 1;
        
        for (let i = currentLineIndex + 1; i < lines.length; i++) {
          if (lines[i].trim().startsWith('} from ')) {
            // This is a proper closing, leave it alone
            return match;
          }
          if (lines[i].trim().startsWith('import ')) {
            // Found another import, this one is malformed
            changes++;
            return match.replace(/\{\s*$/, '{} from "";');
          }
        }
        return match;
      });

      // Fix imports that are missing the 'from' part
      fixedContent = fixedContent.replace(/import\s*\{\s*[^}]*\}\s*;\s*$/gm, (match) => {
        if (!match.includes(' from ')) {
          changes++;
          return match.replace(/\}\s*;\s*$/, '} from "";');
        }
        return match;
      });

      // Fix imports that have content after the closing brace but before 'from'
      fixedContent = fixedContent.replace(/import\s*\{\s*[^}]*\}\s*([^f][^r][^o][^m][^ ]*)\s*from/g, (match, extra) => {
        changes++;
        return match.replace(/\}\s*[^f][^r][^o][^m][^ ]*\s*from/, '} from');
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
  
  console.log(`Fixing malformed imports in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const fixer = new MalformedImportFixer();
  await fixer.fixFiles(rootDir);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MalformedImportFixer };
