#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

class JSXEntityFixer {
  constructor() {
    this.rootDir = process.cwd();
    this.srcDir = join(this.rootDir, 'src');
    this.fixedFiles = 0;
    this.totalFiles = 0;
  }

  async fixJSXEntities() {
    console.log('🔧 Fixing JSX HTML Entities');
    console.log('='.repeat(40));
    console.log('');

    await this.processDirectory(this.srcDir);
    
    console.log(`\n✅ JSX entity fixing completed!`);
    console.log(`📊 Summary: ${this.fixedFiles}/${this.totalFiles} files fixed`);
  }

  async processDirectory(dirPath) {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          await this.processDirectory(itemPath);
        } else if (stat.isFile() && (extname(item) === '.tsx' || extname(item) === '.jsx')) {
          await this.fixFile(itemPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${dirPath}: ${error.message}`);
    }
  }

  async fixFile(filePath) {
    this.totalFiles++;
    
    try {
      const content = readFileSync(filePath, 'utf8');
      let fixedContent = content;
      
      // Fix HTML entities in JSX text content
      fixedContent = this.fixHTMLEntities(fixedContent);
      
      if (fixedContent !== content) {
        writeFileSync(filePath, fixedContent);
        this.fixedFiles++;
        console.log(`   🔧 Fixed: ${filePath.replace(this.rootDir + '/', '')}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error fixing file ${filePath}: ${error.message}`);
    }
  }

  fixHTMLEntities(content) {
    let fixed = content;
    
    // Fix > and < in JSX text content (not in code blocks)
    // This is a more sophisticated approach that looks for patterns in JSX text
    
    // Fix arrow operators in text content
    fixed = fixed.replace(/(<[^>]*>)([^<]*)=>([^<]*)(<\/[^>]*>)/g, (match, openTag, before, arrow, after, closeTag) => {
      // Only fix if it's in text content, not in code blocks
      if (openTag.includes('code') || openTag.includes('pre')) {
        return match; // Don't fix in code blocks
      }
      return `${openTag}${before}=&gt;${after}${closeTag}`;
    });
    
    // Fix standalone > and < in text content
    fixed = fixed.replace(/(<[^>]*>)([^<]*[><][^<]*)(<\/[^>]*>)/g, (match, openTag, text, closeTag) => {
      // Only fix if it's in text content, not in code blocks
      if (openTag.includes('code') || openTag.includes('pre')) {
        return match; // Don't fix in code blocks
      }
      
      let fixedText = text
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');
      
      return `${openTag}${fixedText}${closeTag}`;
    });
    
    // Fix specific patterns that are common issues
    fixed = fixed.replace(/([^=])>([^=])/g, '$1&gt;$2'); // > not preceded by = and not followed by =
    fixed = fixed.replace(/([^<])<([^>])/g, '$1&lt;$2'); // < not preceded by < and not followed by >
    
    // Fix specific arrow patterns in text
    fixed = fixed.replace(/(\w+)\s*=>\s*(\w+)/g, (match, before, after) => {
      // Only fix if it's in JSX text content (not in code)
      const context = fixed.substring(Math.max(0, fixed.indexOf(match) - 50), fixed.indexOf(match) + 50);
      if (context.includes('<code>') || context.includes('`')) {
        return match; // Don't fix in code blocks
      }
      return `${before} =&gt; ${after}`;
    });
    
    // Fix percentage signs that might be causing issues
    fixed = fixed.replace(/(\d+)%/g, '$1%');
    
    return fixed;
  }
}

// Run the fixer
const fixer = new JSXEntityFixer();
fixer.fixJSXEntities().catch(console.error);
