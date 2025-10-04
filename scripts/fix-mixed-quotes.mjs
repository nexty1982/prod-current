#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

class MixedQuotesFixer {
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

  fixMixedQuotes(content) {
    let fixes = 0;
    
    // Fix patterns like: import React from 'react'";
    content = content.replace(/import\s+([^'"]*?)\s+from\s+['"]([^'"]*?)['"]\s*";/g, (match, imports, path) => {
      fixes++;
      return `import ${imports} from '${path}';`;
    });

    // Fix patterns like: import PaymentGateways from "@/components/dashboards/ecommerce/PaymentGateways'"";";
    content = content.replace(/import\s+([^'"]*?)\s+from\s+["']([^'"]*?)['"]\s*["']\s*["']\s*";/g, (match, imports, path) => {
      fixes++;
      return `import ${imports} from "${path}";`;
    });

    // Fix patterns like: import { Grid } from '@mui/material'";
    content = content.replace(/import\s+([^'"]*?)\s+from\s+['"]([^'"]*?)['"]\s*";/g, (match, imports, path) => {
      fixes++;
      return `import ${imports} from '${path}';`;
    });

    // Fix patterns with extra quotes at the end
    content = content.replace(/import\s+([^'"]*?)\s+from\s+["']([^'"]*?)['"]\s*["']\s*";/g, (match, imports, path) => {
      fixes++;
      return `import ${imports} from "${path}";`;
    });

    // Fix patterns with mixed quotes and extra quotes
    content = content.replace(/import\s+([^'"]*?)\s+from\s+["']([^'"]*?)['"]\s*["']\s*["']\s*";/g, (match, imports, path) => {
      fixes++;
      return `import ${imports} from "${path}";`;
    });

    return { content, fixes };
  }

  async processFile(filePath) {
    const fullPath = path.join(this.rootPath, filePath);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { content: fixedContent, fixes } = this.fixMixedQuotes(content);
      
      if (fixes > 0) {
        fs.writeFileSync(fullPath, fixedContent, 'utf8');
        this.fixedFiles++;
        this.totalFixes += fixes;
        console.log(chalk.green(`✓ Fixed ${fixes} mixed quote issues in ${filePath}`));
      }
      
      return fixes;
    } catch (error) {
      console.error(chalk.red(`✗ Error processing ${filePath}: ${error.message}`));
      return 0;
    }
  }

  async run() {
    console.log(chalk.blue('🔧 Mixed Quotes Fixer Starting...\n'));
    
    const files = await this.findFiles();
    console.log(chalk.blue(`Found ${files.length} source files to process\n`));
    
    for (const file of files) {
      await this.processFile(file);
    }
    
    console.log(chalk.green(`\n✅ Mixed quotes fixing complete!`));
    console.log(chalk.green(`   Files processed: ${files.length}`));
    console.log(chalk.green(`   Files fixed: ${this.fixedFiles}`));
    console.log(chalk.green(`   Total fixes: ${this.totalFixes}`));
  }
}

// Main execution
const rootPath = process.cwd();
const fixer = new MixedQuotesFixer(rootPath);
fixer.run().catch(console.error);
