#!/usr/bin/env node

import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';

class DuplicateChecker {
  constructor() {
    this.rootDir = process.cwd();
    this.frontendDir = join(this.rootDir, 'front-end/src');
    this.topImportedFiles = [
      'context/AuthContext.tsx',
      'components/shared/BlankCard.tsx',
      'components/forms/theme-elements/CustomTextField.tsx',
      'components/forms/theme-elements/CustomFormLabel.tsx',
      'components/shared/ParentCard.tsx',
      'components/container/PageContainer.tsx',
      'layouts/full/shared/breadcrumb/Breadcrumb.tsx',
      'tools/omtrace/core/logger.js',
      'components/shared/DashboardCard.tsx',
      'components/forms/theme-elements/CustomCheckbox.tsx',
      'components/forms/theme-elements/CustomSelect.tsx',
      'records/constants.js',
      'hooks/useComponentRegistry.ts',
      'types/orthodox-metrics.types.ts',
      'api/utils/axiosInstance.ts'
    ];
    this.fileHashes = new Map();
    this.duplicates = [];
  }

  async checkDuplicates() {
    console.log('🔍 Checking for Duplicates in Top Imported Files');
    console.log('='.repeat(60));
    console.log('');

    // Check each top imported file for duplicates
    for (const file of this.topImportedFiles) {
      await this.findDuplicatesForFile(file);
    }

    // Generate report
    await this.generateReport();

    console.log('\n✅ Duplicate check completed!');
  }

  async findDuplicatesForFile(targetFile) {
    const targetPath = join(this.frontendDir, targetFile);
    
    if (!existsSync(targetPath)) {
      console.log(`⚠️  File not found: ${targetFile}`);
      return;
    }

    console.log(`🔍 Checking duplicates for: ${targetFile}`);
    
    const targetHash = this.getFileHash(targetPath);
    const duplicates = [];

    // Search for files with similar names or content
    const searchPatterns = this.generateSearchPatterns(targetFile);
    
    for (const pattern of searchPatterns) {
      const matches = await this.findFilesByPattern(pattern);
      
      for (const match of matches) {
        if (match !== targetFile) {
          const matchPath = join(this.frontendDir, match);
          if (existsSync(matchPath)) {
            const matchHash = this.getFileHash(matchPath);
            
            if (matchHash === targetHash) {
              duplicates.push({
                original: targetFile,
                duplicate: match,
                hash: targetHash,
                type: 'exact_match'
              });
            } else {
              // Check for similar content (normalized)
              const similarity = this.calculateSimilarity(targetPath, matchPath);
              if (similarity > 0.8) {
                duplicates.push({
                  original: targetFile,
                  duplicate: match,
                  hash: matchHash,
                  type: 'similar_content',
                  similarity: Math.round(similarity * 100)
                });
              }
            }
          }
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(`   📋 Found ${duplicates.length} duplicates:`);
      for (const dup of duplicates) {
        console.log(`      - ${dup.duplicate} (${dup.type}${dup.similarity ? `, ${dup.similarity}% similar` : ''})`);
      }
      this.duplicates.push(...duplicates);
    } else {
      console.log(`   ✅ No duplicates found`);
    }
    console.log('');
  }

  generateSearchPatterns(filePath) {
    const fileName = filePath.split('/').pop().replace(/\.[^.]+$/, '');
    const dirName = filePath.split('/').slice(0, -1).join('/');
    
    return [
      // Exact filename in different directories
      `**/${fileName}.*`,
      // Similar filenames
      `**/*${fileName}*.*`,
      // Same directory with variations
      `${dirName}/**/*${fileName}*.*`,
      // Common duplicate patterns
      `**/${fileName}.backup.*`,
      `**/${fileName}.old.*`,
      `**/${fileName}.copy.*`,
      `**/${fileName}_backup.*`,
      `**/${fileName}_old.*`,
      `**/${fileName}_copy.*`,
      `**/${fileName}-backup.*`,
      `**/${fileName}-old.*`,
      `**/${fileName}-copy.*`
    ];
  }

  async findFilesByPattern(pattern) {
    const { glob } = await import('glob');
    const fullPattern = join(this.frontendDir, pattern);
    const files = await glob(fullPattern);
    
    return files.map(file => relative(this.frontendDir, file));
  }

  getFileHash(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      return createHash('sha256').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  calculateSimilarity(file1, file2) {
    try {
      const content1 = readFileSync(file1, 'utf8');
      const content2 = readFileSync(file2, 'utf8');
      
      // Normalize content for comparison
      const norm1 = this.normalizeContent(content1);
      const norm2 = this.normalizeContent(content2);
      
      // Simple similarity calculation based on common lines
      const lines1 = norm1.split('\n');
      const lines2 = norm2.split('\n');
      
      let commonLines = 0;
      const maxLines = Math.max(lines1.length, lines2.length);
      
      for (const line of lines1) {
        if (lines2.includes(line)) {
          commonLines++;
        }
      }
      
      return commonLines / maxLines;
    } catch {
      return 0;
    }
  }

  normalizeContent(content) {
    return content
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  async generateReport() {
    console.log('\n📊 DUPLICATE ANALYSIS RESULTS');
    console.log('='.repeat(60));

    if (this.duplicates.length === 0) {
      console.log('✅ No duplicates found in top imported files!');
      return;
    }

    console.log(`Found ${this.duplicates.length} duplicate files:`);
    console.log('');

    // Group by original file
    const groupedDuplicates = new Map();
    for (const dup of this.duplicates) {
      if (!groupedDuplicates.has(dup.original)) {
        groupedDuplicates.set(dup.original, []);
      }
      groupedDuplicates.get(dup.original).push(dup);
    }

    for (const [original, dups] of groupedDuplicates) {
      console.log(`🔸 ${original}:`);
      for (const dup of dups) {
        console.log(`   📄 ${dup.duplicate} (${dup.type}${dup.similarity ? `, ${dup.similarity}% similar` : ''})`);
      }
      console.log('');
    }

    // Generate detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDuplicates: this.duplicates.length,
        filesWithDuplicates: groupedDuplicates.size,
        exactMatches: this.duplicates.filter(d => d.type === 'exact_match').length,
        similarMatches: this.duplicates.filter(d => d.type === 'similar_content').length
      },
      duplicates: this.duplicates,
      groupedByOriginal: Object.fromEntries(groupedDuplicates)
    };

    // Write JSON report
    const reportDir = '.om/duplicate-check';
    mkdirSync(reportDir, { recursive: true });
    
    writeFileSync(
      join(reportDir, 'top-imports-duplicates.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    this.writeMarkdownReport(reportData, reportDir);

    console.log(`📄 Detailed reports written to: ${reportDir}`);
  }

  writeMarkdownReport(data, reportDir) {
    const lines = [];
    
    lines.push('# Top Imported Files Duplicate Analysis');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Duplicates Found:** ${data.summary.totalDuplicates}`);
    lines.push(`- **Files with Duplicates:** ${data.summary.filesWithDuplicates}`);
    lines.push(`- **Exact Matches:** ${data.summary.exactMatches}`);
    lines.push(`- **Similar Content:** ${data.summary.similarMatches}`);
    lines.push('');

    if (data.duplicates.length > 0) {
      lines.push('## Duplicate Files by Original');
      lines.push('');
      
      for (const [original, dups] of Object.entries(data.groupedByOriginal)) {
        lines.push(`### ${original}`);
        lines.push('');
        lines.push(`**Duplicates found:** ${dups.length}`);
        lines.push('');
        
        for (const dup of dups) {
          lines.push(`- \`${dup.duplicate}\` (${dup.type}${dup.similarity ? `, ${dup.similarity}% similar` : ''})`);
        }
        lines.push('');
      }
    } else {
      lines.push('## Result');
      lines.push('');
      lines.push('✅ **No duplicates found in the top imported files!**');
      lines.push('');
      lines.push('This indicates that the most critical files in the codebase are unique and well-maintained.');
    }

    writeFileSync(
      join(reportDir, 'top-imports-duplicates.md'),
      lines.join('\n')
    );
  }
}

// Run duplicate check
const checker = new DuplicateChecker();
checker.checkDuplicates().catch(console.error);
