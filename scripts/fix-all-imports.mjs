#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_GLOB = 'src/**/*.{ts,tsx}';

class AllImportFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  async fixFiles(rootDir) {
    console.log('🔧 All Import Fixer Starting...\n');
    
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
    
    console.log(`\n✅ All import fixing complete!`);
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
      const emptyImportPattern = /import\s*\{\s*\}\s*from\s*"";?\s*\n/g;
      if (fixedContent.match(emptyImportPattern)) {
        fixedContent = fixedContent.replace(emptyImportPattern, '');
        changes++;
      }

      // Fix malformed imports where content appears after closing brace
      const malformedPattern = /(\}\s*from\s*['"][^'"]*['"];?\s*)\n\s*([A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*)/g;
      fixedContent = fixedContent.replace(malformedPattern, (match, importEnd, content) => {
        changes++;
        // Extract the module path
        const moduleMatch = importEnd.match(/from\s*(['"][^'"]*['"])/);
        if (moduleMatch) {
          const modulePath = moduleMatch[1];
          return `} from ${modulePath};\nimport {\n    ${content}`;
        }
        return match;
      });

      // Fix imports that are missing the opening brace
      const missingBracePattern = /import\s*([A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*)\s*from\s*(['"][^'"]*['"]);?\s*\n\s*([A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*)/g;
      fixedContent = fixedContent.replace(missingBracePattern, (match, firstPart, modulePath, secondPart) => {
        changes++;
        return `import {\n    ${firstPart},\n    ${secondPart}\n} from ${modulePath};`;
      });

      // Fix imports that have content floating without proper structure
      const floatingContentPattern = /(\}\s*from\s*['"][^'"]*['"];?\s*)\n\s*([A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*,\s*[A-Za-z][A-Za-z0-9]*)/g;
      fixedContent = fixedContent.replace(floatingContentPattern, (match, importEnd, content) => {
        changes++;
        const moduleMatch = importEnd.match(/from\s*(['"][^'"]*['"])/);
        if (moduleMatch) {
          const modulePath = moduleMatch[1];
          return `} from ${modulePath};\nimport {\n    ${content}`;
        }
        return match;
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
  
  console.log(`Fixing all imports in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const fixer = new AllImportFixer();
  await fixer.fixFiles(rootDir);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AllImportFixer };
