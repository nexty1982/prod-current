#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_GLOB = 'src/**/*.{ts,tsx}';

class ReturnTypeSyntaxFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  async fixFiles(rootDir) {
    console.log('🔧 Return Type Syntax Fixer Starting...\n');
    
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
    
    console.log(`\n✅ Return type syntax fixing complete!`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files fixed: ${this.fixedFiles}`);
    console.log(`   Total fixes: ${this.totalFixes}`);
  }

  async fixFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      let fixedContent = originalContent;
      let changes = 0;

      // Fix malformed return type annotations
      // Pattern: (): (TypeName: any) => { should become (): TypeName => {
      const returnTypePattern = /\(\):\s*\(([A-Za-z][A-Za-z0-9]*):\s*any\)\s*=>/g;
      
      fixedContent = fixedContent.replace(returnTypePattern, (match, typeName) => {
        changes++;
        return `(): ${typeName} =>`;
      });

      // Fix other malformed type annotations
      // Pattern: (param: TypeName: any) => should become (param: TypeName) =>
      const paramTypePattern = /\(([^)]*):\s*([A-Za-z][A-Za-z0-9]*):\s*any\)\s*=>/g;
      
      fixedContent = fixedContent.replace(paramTypePattern, (match, params, typeName) => {
        changes++;
        return `(${params}: ${typeName}) =>`;
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
  
  console.log(`Fixing return type syntax in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const fixer = new ReturnTypeSyntaxFixer();
  await fixer.fixFiles(rootDir);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ReturnTypeSyntaxFixer };
