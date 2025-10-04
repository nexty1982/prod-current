#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

class UnterminatedStringFixer {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  async findFiles() {
    const pattern = 'src/**/*.{ts,tsx}';
    const files = await glob(pattern, { cwd: this.rootPath });
    return files;
  }

  fixUnterminatedStrings(content) {
    let fixes = 0;
    
    // Fix unterminated string literals in import statements
    // Pattern: import something from "path'; (missing closing quote)
    const unterminatedImportPattern = /import\s+[^'"]*from\s+["']([^'"]*?)['"]?;?\s*$/gm;
    
    content = content.replace(unterminatedImportPattern, (match, path) => {
      // If the path doesn't end with a quote, add the missing quote
      if (!match.endsWith('"') && !match.endsWith("'")) {
        fixes++;
        return match.replace(/;?\s*$/, '";');
      }
      return match;
    });

    // Fix more specific patterns
    // Pattern: import something from "path'; (single quote at end)
    const singleQuotePattern = /import\s+[^'"]*from\s+["']([^'"]*?)['"]?;?\s*$/gm;
    content = content.replace(singleQuotePattern, (match) => {
      if (match.includes('"') && !match.endsWith('"')) {
        fixes++;
        return match.replace(/;?\s*$/, '";');
      }
      return match;
    });

    // Fix patterns like: import something from "path'; (missing closing double quote)
    const missingDoubleQuotePattern = /import\s+[^'"]*from\s+"([^"]*?)['"]?;?\s*$/gm;
    content = content.replace(missingDoubleQuotePattern, (match, path) => {
      if (!match.endsWith('"')) {
        fixes++;
        return match.replace(/;?\s*$/, '";');
      }
      return match;
    });

    // Fix patterns where there's a stray single quote
    const strayQuotePattern = /import\s+[^'"]*from\s+["']([^'"]*?)['"]?;?\s*$/gm;
    content = content.replace(strayQuotePattern, (match) => {
      if (match.includes("'") && match.includes('"') && !match.endsWith('"')) {
        fixes++;
        return match.replace(/;?\s*$/, '";');
      }
      return match;
    });

    return { content, fixes };
  }

  async processFile(filePath) {
    const fullPath = path.join(this.rootPath, filePath);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { content: fixedContent, fixes } = this.fixUnterminatedStrings(content);
      
      if (fixes > 0) {
        fs.writeFileSync(fullPath, fixedContent, 'utf8');
        this.fixedFiles++;
        this.totalFixes += fixes;
        console.log(chalk.green(`✓ Fixed ${fixes} unterminated strings in ${filePath}`));
      }
      
      return fixes;
    } catch (error) {
      console.error(chalk.red(`✗ Error processing ${filePath}: ${error.message}`));
      return 0;
    }
  }

  async run() {
    console.log(chalk.blue('🔧 Unterminated String Fixer Starting...\n'));
    
    const files = await this.findFiles();
    console.log(chalk.blue(`Found ${files.length} source files to process\n`));
    
    for (const file of files) {
      await this.processFile(file);
    }
    
    console.log(chalk.green(`\n✅ Unterminated string fixing complete!`));
    console.log(chalk.green(`   Files processed: ${files.length}`));
    console.log(chalk.green(`   Files fixed: ${this.fixedFiles}`));
    console.log(chalk.green(`   Total fixes: ${this.totalFixes}`));
  }
}

// Main execution
const rootPath = process.cwd();
const fixer = new UnterminatedStringFixer(rootPath);
fixer.run().catch(console.error);
