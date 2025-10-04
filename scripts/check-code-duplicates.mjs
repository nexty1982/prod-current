#!/usr/bin/env node

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';

class CodeDuplicateChecker {
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
    this.duplicates = [];
  }

  async checkCodeDuplicates() {
    console.log('🔍 Checking for Duplicate Code in Top Imported Files');
    console.log('='.repeat(60));
    console.log('');

    // Read all top imported files
    const fileContents = await this.readTopFiles();
    
    if (fileContents.length === 0) {
      console.log('❌ No top imported files found to analyze');
      return;
    }

    console.log(`📁 Analyzing ${fileContents.length} top imported files`);
    console.log('');

    // Check for exact file duplicates
    await this.checkExactDuplicates(fileContents);

    // Check for similar code patterns
    await this.checkSimilarCode(fileContents);

    // Generate report
    await this.generateReport();

    console.log('\n✅ Code duplicate analysis completed!');
  }

  async readTopFiles() {
    const fileContents = [];

    for (const file of this.topImportedFiles) {
      const filePath = join(this.frontendDir, file);
      
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          const hash = createHash('sha256').update(content).digest('hex');
          
          fileContents.push({
            file,
            path: filePath,
            content,
            hash,
            size: content.length,
            lines: content.split('\n').length
          });
          
          console.log(`   ✅ Loaded: ${file} (${content.length} chars, ${content.split('\n').length} lines)`);
        } catch (error) {
          console.log(`   ❌ Error reading ${file}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  File not found: ${file}`);
      }
    }

    return fileContents;
  }

  async checkExactDuplicates(fileContents) {
    console.log('\n🔍 Checking for exact file duplicates...');
    
    const hashMap = new Map();
    
    for (const file of fileContents) {
      if (hashMap.has(file.hash)) {
        const original = hashMap.get(file.hash);
        this.duplicates.push({
          type: 'exact_duplicate',
          original: original.file,
          duplicate: file.file,
          similarity: 100,
          description: 'Identical file content'
        });
        console.log(`   📋 Exact duplicate found: ${file.file} matches ${original.file}`);
      } else {
        hashMap.set(file.hash, file);
      }
    }

    if (this.duplicates.filter(d => d.type === 'exact_duplicate').length === 0) {
      console.log('   ✅ No exact duplicates found');
    }
  }

  async checkSimilarCode(fileContents) {
    console.log('\n🔍 Checking for similar code patterns...');
    
    let similarCount = 0;

    for (let i = 0; i < fileContents.length; i++) {
      for (let j = i + 1; j < fileContents.length; j++) {
        const file1 = fileContents[i];
        const file2 = fileContents[j];
        
        const similarity = this.calculateCodeSimilarity(file1.content, file2.content);
        
        if (similarity > 0.7) { // 70% similarity threshold
          this.duplicates.push({
            type: 'similar_code',
            original: file1.file,
            duplicate: file2.file,
            similarity: Math.round(similarity * 100),
            description: `${Math.round(similarity * 100)}% similar code content`
          });
          similarCount++;
          console.log(`   📋 Similar code: ${file2.file} is ${Math.round(similarity * 100)}% similar to ${file1.file}`);
        }
      }
    }

    if (similarCount === 0) {
      console.log('   ✅ No similar code patterns found');
    }
  }

  calculateCodeSimilarity(content1, content2) {
    // Normalize content for comparison
    const norm1 = this.normalizeCode(content1);
    const norm2 = this.normalizeCode(content2);
    
    // Split into lines and remove empty lines
    const lines1 = norm1.split('\n').filter(line => line.trim().length > 0);
    const lines2 = norm2.split('\n').filter(line => line.trim().length > 0);
    
    if (lines1.length === 0 && lines2.length === 0) return 1;
    if (lines1.length === 0 || lines2.length === 0) return 0;
    
    // Calculate Jaccard similarity
    const set1 = new Set(lines1);
    const set2 = new Set(lines2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  normalizeCode(content) {
    return content
      .replace(/\r\n/g, '\n')                    // Normalize line endings
      .replace(/\s+/g, ' ')                      // Normalize whitespace
      .replace(/\/\*[\s\S]*?\*\//g, '')          // Remove block comments
      .replace(/\/\/.*$/gm, '')                  // Remove line comments
      .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '') // Remove import statements
      .replace(/export\s+.*?;?\s*/g, '')         // Remove export statements
      .replace(/\s*{\s*/g, ' { ')               // Normalize braces
      .replace(/\s*}\s*/g, ' } ')
      .replace(/\s*\(\s*/g, ' ( ')              // Normalize parentheses
      .replace(/\s*\)\s*/g, ' ) ')
      .replace(/;\s*/g, '; ')                   // Normalize semicolons
      .trim();
  }

  async generateReport() {
    console.log('\n📊 DUPLICATE CODE ANALYSIS RESULTS');
    console.log('='.repeat(60));

    if (this.duplicates.length === 0) {
      console.log('✅ No duplicate code found in top imported files!');
      console.log('This indicates good code organization and minimal duplication.');
      return;
    }

    console.log(`Found ${this.duplicates.length} duplicate code instances:`);
    console.log('');

    // Group by type
    const exactDuplicates = this.duplicates.filter(d => d.type === 'exact_duplicate');
    const similarCode = this.duplicates.filter(d => d.type === 'similar_code');

    if (exactDuplicates.length > 0) {
      console.log('🔸 Exact Duplicates:');
      for (const dup of exactDuplicates) {
        console.log(`   📄 ${dup.duplicate} is identical to ${dup.original}`);
      }
      console.log('');
    }

    if (similarCode.length > 0) {
      console.log('🔸 Similar Code:');
      for (const dup of similarCode) {
        console.log(`   📄 ${dup.duplicate} is ${dup.similarity}% similar to ${dup.original}`);
      }
      console.log('');
    }

    // Generate detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDuplicates: this.duplicates.length,
        exactDuplicates: exactDuplicates.length,
        similarCode: similarCode.length,
        filesAnalyzed: this.topImportedFiles.length
      },
      duplicates: this.duplicates,
      analysis: {
        exactDuplicates,
        similarCode: similarCode.sort((a, b) => b.similarity - a.similarity)
      }
    };

    // Write JSON report
    const reportDir = '.om/code-duplicates';
    mkdirSync(reportDir, { recursive: true });
    
    writeFileSync(
      join(reportDir, 'code-duplicates-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    this.writeMarkdownReport(reportData, reportDir);

    console.log(`📄 Detailed reports written to: ${reportDir}`);
  }

  async writeMarkdownReport(data, reportDir) {
    const lines = [];
    
    lines.push('# Code Duplicate Analysis - Top Imported Files');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Files Analyzed:** ${data.summary.filesAnalyzed}`);
    lines.push(`- **Total Duplicates Found:** ${data.summary.totalDuplicates}`);
    lines.push(`- **Exact Duplicates:** ${data.summary.exactDuplicates}`);
    lines.push(`- **Similar Code:** ${data.summary.similarCode}`);
    lines.push('');

    if (data.duplicates.length > 0) {
      if (data.analysis.exactDuplicates.length > 0) {
        lines.push('## Exact Duplicates');
        lines.push('');
        lines.push('These files have identical content:');
        lines.push('');
        for (const dup of data.analysis.exactDuplicates) {
          lines.push(`- **${dup.duplicate}** is identical to **${dup.original}**`);
        }
        lines.push('');
      }

      if (data.analysis.similarCode.length > 0) {
        lines.push('## Similar Code');
        lines.push('');
        lines.push('These files have similar code patterns:');
        lines.push('');
        lines.push('| File | Similar To | Similarity |');
        lines.push('|------|------------|------------|');
        for (const dup of data.analysis.similarCode) {
          lines.push(`| \`${dup.duplicate}\` | \`${dup.original}\` | ${dup.similarity}% |`);
        }
        lines.push('');
      }

      lines.push('## Recommendations');
      lines.push('');
      lines.push('1. **Exact Duplicates**: Consider consolidating identical files to reduce maintenance overhead');
      lines.push('2. **Similar Code**: Extract common patterns into shared utilities or components');
      lines.push('3. **Code Review**: Review similar files to identify opportunities for refactoring');
      lines.push('');
    } else {
      lines.push('## Result');
      lines.push('');
      lines.push('✅ **No duplicate code found in the top imported files!**');
      lines.push('');
      lines.push('This indicates:');
      lines.push('- Good code organization');
      lines.push('- Minimal code duplication');
      lines.push('- Well-structured codebase');
      lines.push('- Effective use of shared components and utilities');
      lines.push('');
    }

    writeFileSync(
      join(reportDir, 'code-duplicates-report.md'),
      lines.join('\n')
    );
  }
}

// Run code duplicate check
const checker = new CodeDuplicateChecker();
checker.checkCodeDuplicates().catch(console.error);
