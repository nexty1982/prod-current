#!/usr/bin/env node

import { glob } from 'glob';
import { relative, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

class DirectoryComparator {
  constructor() {
    this.rootDir = process.cwd();
    this.dir1 = join(this.rootDir, 'UI/default/main/frontend/src');
    this.dir2 = join(this.rootDir, 'front-end/src');
    this.dir1Files = new Set();
    this.dir2Files = new Set();
  }

  async compare() {
    console.log('🔍 Comparing directory structures...');
    console.log(`Directory 1: ${this.dir1}`);
    console.log(`Directory 2: ${this.dir2}`);
    console.log('');

    // Get all files from both directories
    await this.scanDirectory(this.dir1, this.dir1Files, 'dir1');
    await this.scanDirectory(this.dir2, this.dir2Files, 'dir2');

    // Find files unique to each directory
    const onlyInDir1 = this.findUniqueFiles(this.dir1Files, this.dir2Files);
    const onlyInDir2 = this.findUniqueFiles(this.dir2Files, this.dir1Files);
    const commonFiles = this.findCommonFiles();

    // Generate report
    await this.generateReport(onlyInDir1, onlyInDir2, commonFiles);
  }

  async scanDirectory(baseDir, fileSet, dirName) {
    console.log(`📁 Scanning ${dirName}...`);
    
    const pattern = join(baseDir, '**/*');
    const files = await glob(pattern, { 
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
    });

    for (const file of files) {
      const relativePath = relative(baseDir, file);
      fileSet.add(relativePath);
    }

    console.log(`   Found ${files.length} files`);
  }

  findUniqueFiles(files1, files2) {
    const unique = [];
    for (const file of files1) {
      if (!files2.has(file)) {
        unique.push(file);
      }
    }
    return unique.sort();
  }

  findCommonFiles() {
    const common = [];
    for (const file of this.dir1Files) {
      if (this.dir2Files.has(file)) {
        common.push(file);
      }
    }
    return common.sort();
  }

  async generateReport(onlyInDir1, onlyInDir2, commonFiles) {
    console.log('\n📊 COMPARISON RESULTS');
    console.log('='.repeat(50));
    console.log(`Files only in UI/default/main/frontend/src: ${onlyInDir1.length}`);
    console.log(`Files only in front-end/src: ${onlyInDir2.length}`);
    console.log(`Common files: ${commonFiles.length}`);
    console.log('');

    // Show top categories for unique files
    this.showCategoryBreakdown(onlyInDir1, 'UI/default/main/frontend/src');
    this.showCategoryBreakdown(onlyInDir2, 'front-end/src');

    // Generate detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        dir1Unique: onlyInDir1.length,
        dir2Unique: onlyInDir2.length,
        common: commonFiles.length,
        dir1Total: this.dir1Files.size,
        dir2Total: this.dir2Files.size
      },
      onlyInDir1: onlyInDir1,
      onlyInDir2: onlyInDir2,
      commonFiles: commonFiles
    };

    // Write JSON report
    const reportDir = '.om/directory-comparison';
    mkdirSync(reportDir, { recursive: true });
    
    writeFileSync(
      join(reportDir, 'comparison-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    this.writeMarkdownReport(reportData, reportDir);

    console.log(`\n📄 Detailed reports written to: ${reportDir}`);
  }

  showCategoryBreakdown(files, dirName) {
    const categories = new Map();
    
    for (const file of files) {
      const category = file.split('/')[0] || 'root';
      const count = categories.get(category) || 0;
      categories.set(category, count + 1);
    }

    console.log(`\n📂 Top categories in ${dirName}:`);
    const sortedCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [category, count] of sortedCategories) {
      console.log(`   ${category}: ${count} files`);
    }
  }

  writeMarkdownReport(data, reportDir) {
    const lines = [];
    
    lines.push('# Directory Comparison Report');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Directory | Unique Files | Total Files |');
    lines.push('|-----------|--------------|-------------|');
    lines.push(`| UI/default/main/frontend/src | ${data.summary.dir1Unique} | ${data.summary.dir1Total} |`);
    lines.push(`| front-end/src | ${data.summary.dir2Unique} | ${data.summary.dir2Total} |`);
    lines.push(`| Common | ${data.summary.common} | - |`);
    lines.push('');

    // Files only in UI/default
    if (data.onlyInDir1.length > 0) {
      lines.push('## Files Only in UI/default/main/frontend/src');
      lines.push('');
      this.writeFileList(lines, data.onlyInDir1);
    }

    // Files only in front-end
    if (data.onlyInDir2.length > 0) {
      lines.push('## Files Only in front-end/src');
      lines.push('');
      this.writeFileList(lines, data.onlyInDir2);
    }

    // Common files (sample)
    if (data.commonFiles.length > 0) {
      lines.push('## Common Files (Sample)');
      lines.push('');
      lines.push(`*Showing first 50 of ${data.commonFiles.length} common files*`);
      lines.push('');
      this.writeFileList(lines, data.commonFiles.slice(0, 50));
    }

    writeFileSync(join(reportDir, 'comparison-report.md'), lines.join('\n'));
  }

  writeFileList(lines, files) {
    const categories = new Map();
    
    // Group by category
    for (const file of files) {
      const category = file.split('/')[0] || 'root';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(file);
    }

    // Write categorized list
    for (const [category, categoryFiles] of categories) {
      lines.push(`### ${category}/`);
      lines.push('');
      for (const file of categoryFiles.slice(0, 20)) { // Limit to 20 per category
        lines.push(`- \`${file}\``);
      }
      if (categoryFiles.length > 20) {
        lines.push(`- ... and ${categoryFiles.length - 20} more files`);
      }
      lines.push('');
    }
  }
}

// Run comparison
const comparator = new DirectoryComparator();
comparator.compare().catch(console.error);
