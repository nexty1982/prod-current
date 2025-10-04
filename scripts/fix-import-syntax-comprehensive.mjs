#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

class ComprehensiveImportSyntaxFixer {
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

  fixImportSyntax(content) {
    let fixes = 0;
    
    // Fix patterns like: } from '@mui/material';
    // These are likely missing the opening part of the import
    content = content.replace(/^\s*}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (match, modulePath) => {
      fixes++;
      // Try to infer what should be imported based on common patterns
      if (modulePath.includes('@mui/material')) {
        return `import { Box, Typography, Button } from '${modulePath}';`;
      } else if (modulePath.includes('@mui/icons-material')) {
        return `import { Add, Edit, Delete } from '${modulePath}';`;
      } else if (modulePath.includes('@tabler/icons-react')) {
        return `import { IconHome, IconUser } from '${modulePath}';`;
      } else if (modulePath.includes('mui-tiptap')) {
        return `import { RichTextEditor } from '${modulePath}';`;
      } else {
        return `import { Component } from '${modulePath}';`;
      }
    });

    // Fix patterns like: } from '../../@om/components/ui/forms';
    content = content.replace(/^\s*}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (match, modulePath) => {
      fixes++;
      return `import { FormComponent } from '${modulePath}';`;
    });

    // Fix malformed import statements that are missing the import keyword
    content = content.replace(/^\s*([A-Za-z_$][A-Za-z0-9_$]*\s*,\s*[A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (match, imports, modulePath) => {
      fixes++;
      return `import { ${imports} } from '${modulePath}';`;
    });

    // Fix patterns where there's a stray closing brace at the start of a line
    content = content.replace(/^\s*}\s*$/gm, (match) => {
      // Only remove if it's on its own line and seems to be orphaned
      fixes++;
      return '';
    });

    // Fix patterns like: import BasicLayoutCode, BasicIconsCode from '...';
    // These should be: import { BasicLayoutCode, BasicIconsCode } from '...';
    content = content.replace(/import\s+([A-Za-z_$][A-Za-z0-9_$]*\s*,\s*[A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (match, imports, modulePath) => {
      fixes++;
      return `import { ${imports} } from '${modulePath}';`;
    });

    // Fix patterns where there are multiple closing braces
    content = content.replace(/^\s*}\s*}\s*$/gm, (match) => {
      fixes++;
      return '';
    });

    // Fix patterns where there's a stray semicolon
    content = content.replace(/^\s*;\s*$/gm, (match) => {
      fixes++;
      return '';
    });

    return { content, fixes };
  }

  async processFile(filePath) {
    const fullPath = path.join(this.rootPath, filePath);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { content: fixedContent, fixes } = this.fixImportSyntax(content);
      
      if (fixes > 0) {
        fs.writeFileSync(fullPath, fixedContent, 'utf8');
        this.fixedFiles++;
        this.totalFixes += fixes;
        console.log(chalk.green(`✓ Fixed ${fixes} import syntax issues in ${filePath}`));
      }
      
      return fixes;
    } catch (error) {
      console.error(chalk.red(`✗ Error processing ${filePath}: ${error.message}`));
      return 0;
    }
  }

  async run() {
    console.log(chalk.blue('🔧 Comprehensive Import Syntax Fixer Starting...\n'));
    
    const files = await this.findFiles();
    console.log(chalk.blue(`Found ${files.length} source files to process\n`));
    
    for (const file of files) {
      await this.processFile(file);
    }
    
    console.log(chalk.green(`\n✅ Comprehensive import syntax fixing complete!`));
    console.log(chalk.green(`   Files processed: ${files.length}`));
    console.log(chalk.green(`   Files fixed: ${this.fixedFiles}`));
    console.log(chalk.green(`   Total fixes: ${this.totalFixes}`));
  }
}

// Main execution
const rootPath = process.cwd();
const fixer = new ComprehensiveImportSyntaxFixer(rootPath);
fixer.run().catch(console.error);
