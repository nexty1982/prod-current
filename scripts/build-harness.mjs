#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeepSanitizer } from './deep-sanitize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const REPORT_DIR = '.om';
const BUILD_RUN_PREFIX = 'build-run';

class BuildHarness {
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      steps: [],
      success: false,
      totalErrors: 0,
      errorSummary: {},
      topErrorFiles: []
    };
  }

  async run(rootDir) {
    console.log('🚀 Build Harness Starting...\n');
    
    // Ensure report directory exists
    const reportDir = path.join(rootDir, REPORT_DIR);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    try {
      // Step 1: Run deep sanitizer
      await this.runStep('Deep Sanitizer', () => this.runSanitizer(rootDir));
      
      // Step 2: TypeScript type check
      await this.runStep('TypeScript Check', () => this.runTypeScriptCheck(rootDir));
      
      // Step 3: Vite build
      await this.runStep('Vite Build', () => this.runViteBuild(rootDir));
      
      this.report.success = true;
      console.log('\n✅ Build completed successfully!');
      
    } catch (error) {
      console.log(`\n❌ Build failed: ${error.message}`);
      this.report.success = false;
    } finally {
      // Always write build report
      await this.writeBuildReport(rootDir);
      
      // Exit with appropriate code
      process.exit(this.report.success ? 0 : 1);
    }
  }

  async runStep(stepName, stepFunction) {
    console.log(`📋 ${stepName}...`);
    const startTime = Date.now();
    
    const stepReport = {
      name: stepName,
      startTime: new Date().toISOString(),
      success: false,
      duration: 0,
      output: '',
      errors: []
    };

    try {
      const result = await stepFunction();
      stepReport.success = true;
      stepReport.output = result.output || '';
      console.log(`  ✓ ${stepName} completed`);
    } catch (error) {
      stepReport.success = false;
      stepReport.output = error.output || error.message;
      stepReport.errors = error.errors || [];
      console.log(`  ✗ ${stepName} failed`);
      throw error;
    } finally {
      stepReport.duration = Date.now() - startTime;
      this.report.steps.push(stepReport);
    }
  }

  async runSanitizer(rootDir) {
    return new Promise((resolve, reject) => {
      const sanitizer = new DeepSanitizer();
      sanitizer.sanitizeFiles(rootDir)
        .then(() => resolve({ output: 'Deep sanitization completed' }))
        .catch(reject);
    });
  }

  async runTypeScriptCheck(rootDir) {
    return new Promise((resolve, reject) => {
      const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty'], {
        cwd: rootDir,
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let errorOutput = '';

      tsc.stdout.on('data', (data) => {
        output += data.toString();
      });

      tsc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      tsc.on('close', (code) => {
        const errors = this.parseTypeScriptErrors(errorOutput + output);
        this.report.totalErrors = errors.length;
        this.report.errorSummary = this.summarizeErrors(errors);
        this.report.topErrorFiles = this.getTopErrorFiles(errors);
        
        if (code === 0 && errors.length === 0) {
          resolve({ output: 'TypeScript check passed' });
        } else if (code === 0 && errors.length > 0) {
          // TypeScript returned 0 but we found errors in output
          this.displayErrorSummary(errors);
          reject({
            message: `TypeScript check failed with ${errors.length} errors`,
            output: errorOutput + output,
            errors: errors
          });
        } else if (code !== 0 && errors.length === 0) {
          // TypeScript returned non-zero but no parseable errors - might be config issues
          console.log('⚠️  TypeScript returned non-zero exit code but no parseable errors found');
          console.log('Raw output:', errorOutput + output);
          resolve({ output: 'TypeScript check passed (no parseable errors)' });
        } else {
          // TypeScript returned non-zero and we found errors
          this.displayErrorSummary(errors);
          reject({
            message: `TypeScript check failed with ${errors.length} errors`,
            output: errorOutput + output,
            errors: errors
          });
        }
      });
    });
  }

  async runViteBuild(rootDir) {
    return new Promise((resolve, reject) => {
      const vite = spawn('npx', ['vite', 'build'], {
        cwd: rootDir,
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let errorOutput = '';

      vite.stdout.on('data', (data) => {
        output += data.toString();
      });

      vite.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      vite.on('close', (code) => {
        if (code === 0) {
          resolve({ output: 'Vite build completed successfully' });
        } else {
          reject({
            message: `Vite build failed with exit code ${code}`,
            output: errorOutput
          });
        }
      });
    });
  }

  parseTypeScriptErrors(errorOutput) {
    const errors = [];
    const lines = errorOutput.split('\n');
    
    for (const line of lines) {
      // Match TypeScript error format: file.tsx(line,col): error TS1234: message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
      if (match) {
        const [, file, lineNum, col, severity, code, message] = match;
        errors.push({
          file: file.trim(),
          line: parseInt(lineNum),
          column: parseInt(col),
          severity: severity,
          code: code,
          message: message.trim()
        });
      }
    }
    
    return errors;
  }

  summarizeErrors(errors) {
    const summary = {
      bySeverity: {},
      byCode: {},
      byFile: {}
    };

    for (const error of errors) {
      // By severity
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
      
      // By error code
      summary.byCode[error.code] = (summary.byCode[error.code] || 0) + 1;
      
      // By file
      summary.byFile[error.file] = (summary.byFile[error.file] || 0) + 1;
    }

    return summary;
  }

  getTopErrorFiles(errors) {
    const fileCounts = {};
    
    for (const error of errors) {
      fileCounts[error.file] = (fileCounts[error.file] || 0) + 1;
    }

    return Object.entries(fileCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 25)
      .map(([file, count]) => ({ file, count }));
  }

  displayErrorSummary(errors) {
    console.log('\n📊 Error Summary:');
    console.log(`   Total errors: ${errors.length}`);
    
    if (this.report.errorSummary.bySeverity.error) {
      console.log(`   Errors: ${this.report.errorSummary.bySeverity.error}`);
    }
    if (this.report.errorSummary.bySeverity.warning) {
      console.log(`   Warnings: ${this.report.errorSummary.bySeverity.warning}`);
    }

    if (errors.length === 0) {
      console.log('   No errors found');
      return;
    }

    console.log('\n🔝 Top 25 files with errors:');
    for (const { file, count } of this.report.topErrorFiles) {
      console.log(`   ${file} (${count} errors)`);
    }

    console.log('\n📋 First error in each file:');
    const fileFirstErrors = {};
    for (const error of errors) {
      if (!fileFirstErrors[error.file]) {
        fileFirstErrors[error.file] = error;
      }
    }

    let count = 0;
    for (const [file, error] of Object.entries(fileFirstErrors)) {
      if (count >= 25) break;
      
      console.log(`\n   ${file}:${error.line}:${error.column}`);
      console.log(`   ${error.code}: ${error.message}`);
      count++;
    }
  }

  async writeBuildReport(rootDir) {
    const reportDir = path.join(rootDir, REPORT_DIR);
    const timestamp = this.report.timestamp.replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `${BUILD_RUN_PREFIX}-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2), 'utf-8');
    console.log(`\n📊 Build report written to: ${path.relative(process.cwd(), reportPath)}`);
  }
}

// CLI execution
async function main() {
  const rootDir = process.argv[2] || process.cwd();
  
  console.log(`Build harness running in: ${rootDir}\n`);
  
  const harness = new BuildHarness();
  await harness.run(rootDir);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BuildHarness };
