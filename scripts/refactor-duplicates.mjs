#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import { DuplicateIndex } from './lib/dup-index.mjs';
import { ImportRewriter } from './lib/import-rewriter.mjs';
import { FileSystemOps } from './lib/fs-ops.mjs';
import { ReportGenerator } from './lib/report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

class DuplicateRefactor {
  constructor(options) {
    this.options = options;
    this.duplicateIndex = null;
    this.importRewriter = null;
    this.fsOps = null;
    this.reportGenerator = null;
    this.workspaceRoot = process.cwd();
    this.frontendRoot = join(this.workspaceRoot, 'UI/modernize/frontend');
  }

  async run() {
    try {
      console.log('🔧 Duplicate Refactor Tool');
      console.log('='.repeat(50));
      
      // Validate inputs
      await this.validateInputs();
      
      // Initialize components
      await this.initializeComponents();
      
      // Create git branch for safety
      if (this.options.apply) {
        await this.createGitBranch();
      }
      
      // Load duplicate analysis
      await this.loadDuplicateAnalysis();
      
      // Process duplicates
      const results = await this.processDuplicates();
      
      // Generate reports
      await this.generateReports(results);
      
      // Run build checks if applying
      if (this.options.apply) {
        await this.runBuildChecks();
      }
      
      console.log('\n✅ Refactor completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Refactor failed:', error.message);
      process.exit(1);
    }
  }

  async validateInputs() {
    const mapPath = resolve(this.options.map);
    
    if (!existsSync(mapPath)) {
      throw new Error(`Duplicate analysis file not found: ${mapPath}`);
    }
    
    if (!existsSync(this.frontendRoot)) {
      throw new Error(`Frontend directory not found: ${this.frontendRoot}`);
    }
    
    console.log(`📁 Using duplicate map: ${mapPath}`);
    console.log(`📁 Frontend root: ${this.frontendRoot}`);
  }

  async initializeComponents() {
    console.log('🔧 Initializing components...');
    
    this.duplicateIndex = new DuplicateIndex(this.frontendRoot);
    this.importRewriter = new ImportRewriter(this.frontendRoot, this.options);
    this.fsOps = new FileSystemOps(this.frontendRoot, this.options);
    this.reportGenerator = new ReportGenerator(this.frontendRoot);
  }

  async createGitBranch() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const branchName = `chore/refactor-duplicates-${timestamp}`;
    
    try {
      execSync(`git checkout -b ${branchName}`, { cwd: this.workspaceRoot });
      console.log(`🌿 Created git branch: ${branchName}`);
    } catch (error) {
      console.warn(`⚠️  Could not create git branch: ${error.message}`);
    }
  }

  async loadDuplicateAnalysis() {
    console.log('📊 Loading duplicate analysis...');
    
    const mapPath = resolve(this.options.map);
    const analysisData = JSON.parse(readFileSync(mapPath, 'utf8'));
    
    await this.duplicateIndex.loadAnalysis(analysisData);
    
    console.log(`   Loaded ${this.duplicateIndex.getDuplicateCount()} duplicate patterns`);
    console.log(`   Total outside files: ${this.duplicateIndex.getOutsideFileCount()}`);
  }

  async processDuplicates() {
    console.log('🔄 Processing duplicates...');
    
    const results = {
      processed: [],
      errors: [],
      stats: {
        totalDuplicates: 0,
        totalRewrites: 0,
        totalFilesRemoved: 0,
        totalFilesStubbed: 0
      }
    };
    
    const duplicates = this.duplicateIndex.getDuplicates();
    
    for (const [key, duplicateInfo] of duplicates) {
      try {
        console.log(`\n🔸 Processing ${key}...`);
        
        const canonicalPath = duplicateInfo.featureFiles[0];
        const outsideFiles = duplicateInfo.outsideFiles;
        
        if (!canonicalPath) {
          console.warn(`   ⚠️  No canonical file found for ${key}`);
          continue;
        }
        
        console.log(`   📍 Canonical: ${canonicalPath}`);
        console.log(`   📍 Outside files: ${outsideFiles.length}`);
        
        // Rewrite imports
        const rewriteResults = await this.importRewriter.rewriteImports(
          key,
          canonicalPath,
          outsideFiles
        );
        
        // Remove or stub outside files
        const fsResults = await this.fsOps.processOutsideFiles(
          key,
          canonicalPath,
          outsideFiles
        );
        
        // Update results
        results.processed.push({
          key,
          canonicalPath,
          outsideFiles,
          rewrites: rewriteResults,
          fsOps: fsResults
        });
        
        results.stats.totalDuplicates++;
        results.stats.totalRewrites += rewriteResults.length;
        results.stats.totalFilesRemoved += fsResults.removed.length;
        results.stats.totalFilesStubbed += fsResults.stubbed.length;
        
        console.log(`   ✅ Processed: ${rewriteResults.length} rewrites, ${fsResults.removed.length} removed, ${fsResults.stubbed.length} stubbed`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${key}: ${error.message}`);
        results.errors.push({ key, error: error.message });
      }
    }
    
    return results;
  }

  async generateReports(results) {
    console.log('\n📊 Generating reports...');
    
    const reportDir = join(this.frontendRoot, '.om', 'refactor-dupes');
    await this.reportGenerator.generateReports(results, reportDir, this.options.dry);
    
    console.log(`   📄 Reports written to: ${reportDir}`);
  }

  async runBuildChecks() {
    console.log('\n🔨 Running build checks...');
    
    try {
      // TypeScript check
      console.log('   🔍 Running TypeScript check...');
      execSync('npx tsc --noEmit', { 
        cwd: this.frontendRoot,
        stdio: 'pipe'
      });
      console.log('   ✅ TypeScript check passed');
      
      // Vite build
      console.log('   🔨 Running Vite build...');
      execSync('npm run build', { 
        cwd: this.frontendRoot,
        stdio: 'pipe'
      });
      console.log('   ✅ Vite build passed');
      
    } catch (error) {
      console.error('   ❌ Build check failed:', error.message);
      throw new Error('Build checks failed');
    }
  }
}

// CLI setup
program
  .name('refactor-duplicates')
  .description('Refactor duplicate files outside src/features/')
  .version('1.0.0')
  .requiredOption('--map <path>', 'Path to duplicate-analysis.json')
  .option('--apply', 'Apply changes (default: dry run)')
  .option('--dry', 'Dry run only (default)')
  .option('--prefer-alias <alias>', 'Prefer alias imports (e.g., @)', '')
  .option('--stub-reexports', 'Create re-export stubs instead of deleting')
  .option('--remove-empties', 'Remove empty directories after deletion')
  .option('--case-policy <policy>', 'Case normalization policy', 'normalize')
  .option('--strict-extensions', 'Strict file extension handling')
  .action(async (options) => {
    // Set defaults
    if (!options.apply && !options.dry) {
      options.dry = true;
    }
    
    const refactor = new DuplicateRefactor(options);
    await refactor.run();
  });

program.parse();
