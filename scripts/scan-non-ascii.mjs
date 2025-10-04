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
const NON_ASCII_REPORT = 'non-ascii-after.txt';

// ASCII range: printable characters + tab, newline, carriage return
const ASCII_REGEX = /[^\x09\x0A\x0D\x20-\x7E]/;

class NonAsciiScanner {
  constructor() {
    this.findings = [];
    this.totalFiles = 0;
    this.filesWithNonAscii = 0;
  }

  async scanFiles(rootDir) {
    console.log('🔍 Non-ASCII Scanner Starting...\n');
    
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

    this.totalFiles = files.length;
    console.log(`Scanning ${files.length} source files for non-ASCII characters...\n`);

    for (const file of files) {
      await this.scanFile(file);
    }

    // Write report
    await this.writeReport(rootDir);
    
    console.log(`\n✅ Non-ASCII scan complete!`);
    console.log(`   Files scanned: ${this.totalFiles}`);
    console.log(`   Files with non-ASCII: ${this.filesWithNonAscii}`);
    console.log(`   Total findings: ${this.findings.length}`);
    
    if (this.findings.length > 0) {
      console.log(`\n⚠️  Non-ASCII characters found! Check .om/non-ascii-after.txt`);
      process.exit(1);
    } else {
      console.log(`\n✅ All files are clean ASCII!`);
      process.exit(0);
    }
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const fileFindings = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        // Check for non-ASCII characters
        if (ASCII_REGEX.test(line)) {
          // Find the specific non-ASCII characters
          const matches = line.match(ASCII_REGEX);
          if (matches) {
            const nonAsciiChars = [...new Set(matches)]; // Remove duplicates
            const charCodes = nonAsciiChars.map(char => `U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
            
            fileFindings.push({
              line: lineNum,
              content: line,
              nonAsciiChars: nonAsciiChars,
              charCodes: charCodes
            });
          }
        }
      }

      if (fileFindings.length > 0) {
        this.filesWithNonAscii++;
        this.findings.push({
          file: path.relative(process.cwd(), filePath),
          findings: fileFindings
        });
        
        console.log(`  ⚠️  ${path.relative(process.cwd(), filePath)} (${fileFindings.length} lines)`);
      }

    } catch (error) {
      console.error(`  ✗ Error scanning ${filePath}:`, error.message);
    }
  }

  async writeReport(rootDir) {
    const reportDir = path.join(rootDir, REPORT_DIR);
    const reportPath = path.join(reportDir, NON_ASCII_REPORT);
    
    let reportContent = `# Non-ASCII Characters Found\n`;
    reportContent += `# Generated: ${new Date().toISOString()}\n`;
    reportContent += `# Total files scanned: ${this.totalFiles}\n`;
    reportContent += `# Files with non-ASCII: ${this.filesWithNonAscii}\n`;
    reportContent += `# Total findings: ${this.findings.length}\n\n`;

    if (this.findings.length === 0) {
      reportContent += `✅ All files contain only ASCII characters!\n`;
    } else {
      for (const fileFinding of this.findings) {
        reportContent += `## ${fileFinding.file}\n\n`;
        
        for (const finding of fileFinding.findings) {
          reportContent += `**Line ${finding.line}:**\n`;
          reportContent += `\`\`\`\n${finding.content}\n\`\`\`\n`;
          reportContent += `**Non-ASCII characters:** ${finding.nonAsciiChars.join(', ')}\n`;
          reportContent += `**Unicode codes:** ${finding.charCodes.join(', ')}\n\n`;
        }
      }
    }
    
    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`\n📊 Report written to: ${path.relative(process.cwd(), reportPath)}`);
  }
}

// CLI execution
async function main() {
  const rootDir = process.argv[2] || process.cwd();
  
  console.log(`Scanning for non-ASCII characters in: ${rootDir}`);
  console.log(`Pattern: ${SRC_GLOB}\n`);
  
  const scanner = new NonAsciiScanner();
  await scanner.scanFiles(rootDir);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { NonAsciiScanner };
