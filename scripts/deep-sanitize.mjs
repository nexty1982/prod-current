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
const SANITIZE_REPORT = 'deep-sanitize-report.json';
const CONFLICTS_FILE = 'conflicts.txt';

// Comprehensive Unicode normalizations
const NORMALIZATIONS = [
  // BOM and zero-width characters
  { from: '\uFEFF', to: '', name: 'BOM' },
  { from: '\u200B', to: '', name: 'Zero Width Space' },
  { from: '\u200C', to: '', name: 'Zero Width Non-Joiner' },
  { from: '\u200D', to: '', name: 'Zero Width Joiner' },
  { from: '\u2060', to: '', name: 'Word Joiner' },
  { from: '\uFE0F', to: '', name: 'Variation Selector-16' },
  
  // Soft hyphen
  { from: '\u00AD', to: '', name: 'Soft Hyphen' },
  
  // Line separators
  { from: '\u2028', to: '\n', name: 'Line Separator' },
  { from: '\u2029', to: '\n', name: 'Paragraph Separator' },
  
  // Various space characters
  { from: '\u00A0', to: ' ', name: 'Non-breaking Space' },
  { from: '\u202F', to: ' ', name: 'Narrow No-Break Space' },
  { from: '\u3000', to: ' ', name: 'Ideographic Space' },
  { from: '\u2000', to: ' ', name: 'En Quad' },
  { from: '\u2001', to: ' ', name: 'Em Quad' },
  { from: '\u2002', to: ' ', name: 'En Space' },
  { from: '\u2003', to: ' ', name: 'Em Space' },
  { from: '\u2004', to: ' ', name: 'Three-Per-Em Space' },
  { from: '\u2005', to: ' ', name: 'Four-Per-Em Space' },
  { from: '\u2006', to: ' ', name: 'Six-Per-Em Space' },
  { from: '\u2007', to: ' ', name: 'Figure Space' },
  { from: '\u2008', to: ' ', name: 'Punctuation Space' },
  { from: '\u2009', to: ' ', name: 'Thin Space' },
  { from: '\u200A', to: ' ', name: 'Hair Space' },
  
  // Single quotes
  { from: '\u2018', to: "'", name: 'Left Single Quotation Mark' },
  { from: '\u2019', to: "'", name: 'Right Single Quotation Mark' },
  { from: '\u201A', to: "'", name: 'Single Low-9 Quotation Mark' },
  { from: '\u201B', to: "'", name: 'Single High-Reversed-9 Quotation Mark' },
  { from: '\u2032', to: "'", name: 'Prime' },
  { from: '\uFF07', to: "'", name: 'Fullwidth Apostrophe' },
  { from: '\u00B4', to: "'", name: 'Acute Accent' },
  
  // Double quotes
  { from: '\u201C', to: '"', name: 'Left Double Quotation Mark' },
  { from: '\u201D', to: '"', name: 'Right Double Quotation Mark' },
  { from: '\u201E', to: '"', name: 'Double Low-9 Quotation Mark' },
  { from: '\u2033', to: '"', name: 'Double Prime' },
  { from: '\u00AB', to: '"', name: 'Left-Pointing Double Angle Quotation Mark' },
  { from: '\u00BB', to: '"', name: 'Right-Pointing Double Angle Quotation Mark' },
  { from: '\u2039', to: '"', name: 'Single Left-Pointing Angle Quotation Mark' },
  { from: '\u203A', to: '"', name: 'Single Right-Pointing Angle Quotation Mark' },
  { from: '\uFF02', to: '"', name: 'Fullwidth Quotation Mark' },
  
  // Dashes and minus signs
  { from: '\u2010', to: '-', name: 'Hyphen' },
  { from: '\u2011', to: '-', name: 'Non-Breaking Hyphen' },
  { from: '\u2012', to: '-', name: 'Figure Dash' },
  { from: '\u2013', to: '-', name: 'En Dash' },
  { from: '\u2014', to: '-', name: 'Em Dash' },
  { from: '\u2015', to: '-', name: 'Horizontal Bar' },
  { from: '\u2212', to: '-', name: 'Minus Sign' },
  { from: '\uFE63', to: '-', name: 'Small Hyphen-Minus' },
  { from: '\uFF0D', to: '-', name: 'Fullwidth Hyphen-Minus' },
  
  // Slashes and division
  { from: '\u2215', to: '/', name: 'Division Slash' },
  { from: '\u00F7', to: '/', name: 'Division Sign' },
  { from: '\u2044', to: '/', name: 'Fraction Slash' },
  { from: '\uFF0F', to: '/', name: 'Fullwidth Solidus' },
  
  // Asterisks and multiplication
  { from: '\u2217', to: '*', name: 'Asterisk Operator' },
  { from: '\u00D7', to: '*', name: 'Multiplication Sign' },
  { from: '\u204E', to: '*', name: 'Low Asterisk' },
  
  // Arrow operators (for =>)
  { from: '\u2192', to: '=>', name: 'Rightwards Arrow' },
  { from: '\u21D2', to: '=>', name: 'Rightwards Double Arrow' },
  { from: '\u27F6', to: '=>', name: 'Long Rightwards Arrow' },
  { from: '\u2794', to: '=>', name: 'Heavy Rightwards Arrow' },
  { from: '\u27A1', to: '=>', name: 'Black Rightwards Arrow' },
  
  // Comparison operators
  { from: '\u2264', to: '<=', name: 'Less-Than Or Equal To' },
  { from: '\u2265', to: '>=', name: 'Greater-Than Or Equal To' },
  { from: '\u2260', to: '!=', name: 'Not Equal To' },
  { from: '\u2261', to: '===', name: 'Identical To' },
  
  // Ellipses
  { from: '\u2026', to: '...', name: 'Horizontal Ellipsis' },
  { from: '\u22EF', to: '...', name: 'Midline Horizontal Ellipsis' },
  { from: '\u22EE', to: '...', name: 'Vertical Ellipsis' },
  { from: '\u22F0', to: '...', name: 'Up Right Diagonal Ellipsis' },
  
  // Common emoji and symbols that cause parsing issues
  { from: '\uD83D\uDD04', to: '[refresh]', name: 'Counterclockwise Arrows Button' },
  { from: '\uD83D\uDCD6', to: '[book]', name: 'Open Book' },
  { from: '\uD83D\uDC92', to: '[church]', name: 'Wedding' },
  { from: '\u26B1', to: '[urn]', name: 'Funeral Urn' },
  { from: '\u2728', to: '[sparkles]', name: 'Sparkles' },
  { from: '\u2705', to: '[check]', name: 'Check Mark Button' },
  { from: '\u274C', to: '[cross]', name: 'Cross Mark' },
  { from: '\u26A0', to: '[warning]', name: 'Warning Sign' },
  { from: '\u2139', to: '[info]', name: 'Information' },
  { from: '\uD83D\uDE80', to: '[rocket]', name: 'Rocket' },
  { from: '\uD83D\uDCA1', to: '[bulb]', name: 'Light Bulb' },
  { from: '\uD83D\uDCC1', to: '[folder]', name: 'File Folder' },
  { from: '\uD83D\uDCC4', to: '[page]', name: 'Page Facing Up' },
  { from: '\uD83D\uDCC8', to: '[chart]', name: 'Chart Increasing' },
  { from: '\uD83D\uDCC9', to: '[chart]', name: 'Chart Decreasing' },
  { from: '\uD83D\uDCCB', to: '[clipboard]', name: 'Clipboard' },
  { from: '\uD83D\uDCDD', to: '[memo]', name: 'Memo' },
  { from: '\uD83D\uDCE0', to: '[mail]', name: 'Envelope' },
  { from: '\uD83D\uDCE1', to: '[email]', name: 'E-mail' },
  { from: '\uD83D\uDCE2', to: '[outbox]', name: 'Outbox Tray' },
  { from: '\uD83D\uDCE3', to: '[inbox]', name: 'Inbox Tray' },
  { from: '\uD83D\uDCE4', to: '[package]', name: 'Package' },
  { from: '\uD83D\uDCE5', to: '[inbox]', name: 'Inbox Tray' },
  { from: '\uD83D\uDCE6', to: '[package]', name: 'Package' },
  { from: '\uD83D\uDCE7', to: '[email]', name: 'E-mail' },
  { from: '\uD83D\uDCE8', to: '[incoming]', name: 'Incoming Envelope' },
  { from: '\uD83D\uDCE9', to: '[envelope]', name: 'Envelope with Arrow' },
  { from: '\uD83D\uDCEA', to: '[outbox]', name: 'Closed Mailbox with Lowered Flag' },
  { from: '\uD83D\uDCEB', to: '[inbox]', name: 'Closed Mailbox with Raised Flag' },
  { from: '\uD83D\uDCEC', to: '[outbox]', name: 'Open Mailbox with Raised Flag' },
  { from: '\uD83D\uDCED', to: '[inbox]', name: 'Open Mailbox with Lowered Flag' },
  { from: '\uD83D\uDCEE', to: '[postbox]', name: 'Postbox' },
  { from: '\uD83D\uDCF0', to: '[newspaper]', name: 'Newspaper' },
  { from: '\uD83D\uDCF1', to: '[mobile]', name: 'Mobile Phone' },
  { from: '\uD83D\uDCF2', to: '[mobile]', name: 'Mobile Phone with Arrow' },
  { from: '\uD83D\uDCF3', to: '[mobile]', name: 'Mobile Phone' },
  { from: '\uD83D\uDCF4', to: '[mobile]', name: 'Mobile Phone' },
  { from: '\uD83D\uDCF5', to: '[mobile]', name: 'Mobile Phone' },
  { from: '\uD83D\uDCF6', to: '[mobile]', name: 'Mobile Phone' },
  { from: '\uD83D\uDCF7', to: '[camera]', name: 'Camera' },
  { from: '\uD83D\uDCF8', to: '[camera]', name: 'Camera with Flash' },
  { from: '\uD83D\uDCF9', to: '[video]', name: 'Video Camera' },
  { from: '\uD83D\uDCFA', to: '[tv]', name: 'Television' },
  { from: '\uD83D\uDCFB', to: '[radio]', name: 'Radio' },
  { from: '\uD83D\uDCFC', to: '[video]', name: 'Videocassette' },
  { from: '\uD83D\uDCFD', to: '[film]', name: 'Film Projector' },
  { from: '\uD83D\uDCFF', to: '[prayer]', name: 'Prayer Beads' },
];

// Merge conflict markers
const MERGE_MARKERS = [
  '<<<<<<<',
  '=======',
  '>>>>>>>'
];

class DeepSanitizer {
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
    console.log('🔧 Deep Sanitizer Starting...\n');
    
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
    
    console.log(`\n✅ Deep sanitization complete!`);
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
        console.log(`  ⚠️  ${path.relative(process.cwd(), filePath)} (merge conflicts - skipped)`);
        
        // Record file details but don't modify
        this.report.fileDetails.push({
          file: path.relative(process.cwd(), filePath),
          changes: 0,
          changeTypes: {},
          hasConflicts: true
        });
        return;
      }

      // Apply normalizations
      for (const { from, to, name } of NORMALIZATIONS) {
        const before = sanitizedContent;
        sanitizedContent = sanitizedContent.replace(new RegExp(from, 'g'), to);
        
        if (before !== sanitizedContent) {
          const changeCount = (before.match(new RegExp(from, 'g')) || []).length;
          changes += changeCount;
          changeTypes[from] = (changeTypes[from] || 0) + changeCount;
        }
      }

      // Handle any remaining non-ASCII characters with a catch-all regex
      const beforeCatchAll = sanitizedContent;
      // Match any character outside ASCII printable range (0x20-0x7E) except newlines and tabs
      sanitizedContent = sanitizedContent.replace(/[^\x20-\x7E\x09\x0A\x0D]/g, (match) => {
        const charCode = match.charCodeAt(0);
        if (charCode >= 0x80) {
          return `[U+${charCode.toString(16).toUpperCase().padStart(4, '0')}]`;
        }
        return match;
      });
      
      if (beforeCatchAll !== sanitizedContent) {
        const remainingNonAscii = (beforeCatchAll.match(/[^\x20-\x7E\x09\x0A\x0D]/g) || []).length;
        changes += remainingNonAscii;
        changeTypes['[remaining-non-ascii]'] = (changeTypes['[remaining-non-ascii]'] || 0) + remainingNonAscii;
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
        hasConflicts: false
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
  
  console.log(`Deep sanitizing files in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const sanitizer = new DeepSanitizer();
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

export { DeepSanitizer };
