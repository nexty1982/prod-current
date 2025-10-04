#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_GLOB = 'src/**/*.{ts,tsx,js,jsx}';
const REPORT_DIR = '.om';
const SANITIZE_REPORT = 'sanitize-report.json';
const CONFLICTS_FILE = 'conflicts.txt';

// Unicode characters to normalize
const NORMALIZATIONS = [
  // BOM and zero-width characters
  { from: '\uFEFF', to: '' }, // BOM
  { from: '\u200B', to: '' }, // Zero Width Space
  { from: '\u200E', to: '' }, // Left-to-Right Mark
  { from: '\u200F', to: '' }, // Right-to-Left Mark
  { from: '\u200C', to: '' }, // Zero Width Non-Joiner
  { from: '\u200D', to: '' }, // Zero Width Joiner
  { from: '\u2060', to: '' }, // Word Joiner
  { from: '\u2061', to: '' }, // Function Application
  { from: '\u2062', to: '' }, // Invisible Times
  { from: '\u2063', to: '' }, // Invisible Separator
  { from: '\u2064', to: '' }, // Invisible Plus
  
  // Non-breaking spaces
  { from: '\u00A0', to: ' ' }, // Non-breaking space
  { from: '\u2000', to: ' ' }, // En Quad
  { from: '\u2001', to: ' ' }, // Em Quad
  { from: '\u2002', to: ' ' }, // En Space
  { from: '\u2003', to: ' ' }, // Em Space
  { from: '\u2004', to: ' ' }, // Three-Per-Em Space
  { from: '\u2005', to: ' ' }, // Four-Per-Em Space
  { from: '\u2006', to: ' ' }, // Six-Per-Em Space
  { from: '\u2007', to: ' ' }, // Figure Space
  { from: '\u2008', to: ' ' }, // Punctuation Space
  { from: '\u2009', to: ' ' }, // Thin Space
  { from: '\u200A', to: ' ' }, // Hair Space
  
  // Curly quotes
  { from: '\u2018', to: "'" }, // Left single quotation mark
  { from: '\u2019', to: "'" }, // Right single quotation mark
  { from: '\u201A', to: "'" }, // Single low-9 quotation mark
  { from: '\u201B', to: "'" }, // Single high-reversed-9 quotation mark
  { from: '\u201C', to: '"' }, // Left double quotation mark
  { from: '\u201D', to: '"' }, // Right double quotation mark
  { from: '\u201E', to: '"' }, // Double low-9 quotation mark
  { from: '\u201F', to: '"' }, // Double high-reversed-9 quotation mark
  
  // Other problematic characters
  { from: '\u2028', to: '\n' }, // Line Separator
  { from: '\u2029', to: '\n' }, // Paragraph Separator
  { from: '\u202A', to: '' }, // Left-to-Right Embedding
  { from: '\u202B', to: '' }, // Right-to-Left Embedding
  { from: '\u202C', to: '' }, // Pop Directional Formatting
  { from: '\u202D', to: '' }, // Left-to-Right Override
  { from: '\u202E', to: '' }, // Right-to-Left Override
  { from: '\u202F', to: ' ' }, // Narrow No-Break Space
  { from: '\u205F', to: ' ' }, // Medium Mathematical Space
  { from: '\u3000', to: ' ' }, // Ideographic Space
];

// Merge conflict markers
const MERGE_MARKERS = [
  '<<<<<<<',
  '=======',
  '>>>>>>>'
];

class SyntaxSanitizer {
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      sanitizedFiles: 0,
      totalChanges: 0,
      changesByType: {},
      conflicts: [],
      fileDetails: []
    };
  }

  async sanitizeFiles(rootDir) {
    console.log('🔧 Syntax Sanitizer Starting...\n');
    
    // Ensure report directory exists
    const reportDir = path.join(rootDir, REPORT_DIR);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Find all source files
    const files = await glob(SRC_GLOB, {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    this.report.totalFiles = files.length;
    console.log(`Found ${files.length} source files to process\n`);

    for (const file of files) {
      await this.sanitizeFile(file);
    }

    // Write reports
    await this.writeReports(rootDir);
    
    console.log(`\n✅ Sanitization complete!`);
    console.log(`   Files processed: ${this.report.totalFiles}`);
    console.log(`   Files sanitized: ${this.report.sanitizedFiles}`);
    console.log(`   Total changes: ${this.report.totalChanges}`);
    console.log(`   Conflicts found: ${this.report.conflicts.length}`);
  }

  async sanitizeFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      let sanitizedContent = originalContent;
      let changes = 0;
      const changeTypes = {};

      // Check for merge conflicts first
      const conflicts = this.detectMergeConflicts(originalContent);
      if (conflicts.length > 0) {
        this.report.conflicts.push({
          file: path.relative(process.cwd(), filePath),
          conflicts: conflicts
        });
      }

      // Apply normalizations
      for (const { from, to } of NORMALIZATIONS) {
        const before = sanitizedContent;
        sanitizedContent = sanitizedContent.replace(new RegExp(from, 'g'), to);
        
        if (before !== sanitizedContent) {
          const changeCount = (before.match(new RegExp(from, 'g')) || []).length;
          changes += changeCount;
          changeTypes[from] = (changeTypes[from] || 0) + changeCount;
        }
      }

      // Only write if changes were made
      if (changes > 0) {
        fs.writeFileSync(filePath, sanitizedContent, 'utf-8');
        this.report.sanitizedFiles++;
        this.report.totalChanges += changes;
        
        // Update change types
        for (const [char, count] of Object.entries(changeTypes)) {
          this.report.changesByType[char] = (this.report.changesByType[char] || 0) + count;
        }

        console.log(`  ✓ ${path.relative(process.cwd(), filePath)} (${changes} changes)`);
      }

      // Record file details
      this.report.fileDetails.push({
        file: path.relative(process.cwd(), filePath),
        changes: changes,
        changeTypes: changeTypes,
        hasConflicts: conflicts.length > 0
      });

    } catch (error) {
      console.error(`  ✗ Error processing ${filePath}:`, error.message);
    }
  }

  detectMergeConflicts(content) {
    const conflicts = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (MERGE_MARKERS.includes(line.trim())) {
        conflicts.push({
          line: i + 1,
          marker: line.trim(),
          context: lines.slice(Math.max(0, i - 2), i + 3).join('\n')
        });
      }
    }
    
    return conflicts;
  }

  async writeReports(rootDir) {
    const reportDir = path.join(rootDir, REPORT_DIR);
    
    // Write sanitize report
    const sanitizeReportPath = path.join(reportDir, SANITIZE_REPORT);
    fs.writeFileSync(sanitizeReportPath, JSON.stringify(this.report, null, 2), 'utf-8');
    console.log(`\n📊 Report written to: ${path.relative(process.cwd(), sanitizeReportPath)}`);

    // Write conflicts file
    if (this.report.conflicts.length > 0) {
      const conflictsPath = path.join(reportDir, CONFLICTS_FILE);
      let conflictsContent = `# Merge Conflicts Detected\n`;
      conflictsContent += `# Generated: ${this.report.timestamp}\n\n`;
      
      for (const conflict of this.report.conflicts) {
        conflictsContent += `## ${conflict.file}\n`;
        for (const detail of conflict.conflicts) {
          conflictsContent += `Line ${detail.line}: ${detail.marker}\n`;
          conflictsContent += `\`\`\`\n${detail.context}\n\`\`\`\n\n`;
        }
      }
      
      fs.writeFileSync(conflictsPath, conflictsContent, 'utf-8');
      console.log(`⚠️  Conflicts written to: ${path.relative(process.cwd(), conflictsPath)}`);
    }
  }
}

// CLI execution
async function main() {
  const rootDir = process.argv[2] || process.cwd();
  
  console.log(`Sanitizing files in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const sanitizer = new SyntaxSanitizer();
  await sanitizer.sanitizeFiles(rootDir);
  
  // Exit with non-zero if conflicts found
  if (sanitizer.report.conflicts.length > 0) {
    console.log(`\n⚠️  Warning: ${sanitizer.report.conflicts.length} files contain merge conflicts`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SyntaxSanitizer };
