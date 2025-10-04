#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

class SimpleDuplicateRefactor {
  constructor() {
    this.duplicateMap = null;
    this.processedFiles = 0;
    this.removedFiles = 0;
    this.rewrittenFiles = 0;
  }

  async run() {
    console.log('🔧 Simple Duplicate Refactor Tool');
    console.log('='.repeat(50));
    
    // Load duplicate analysis
    await this.loadDuplicateAnalysis();
    
    // Process each duplicate group
    await this.processDuplicates();
    
    // Generate summary
    this.generateSummary();
  }

  async loadDuplicateAnalysis() {
    const mapPath = join(process.cwd(), '../../.om/duplicate-analysis.json');
    
    if (!existsSync(mapPath)) {
      throw new Error(`Duplicate analysis file not found: ${mapPath}`);
    }
    
    const content = readFileSync(mapPath, 'utf8');
    this.duplicateMap = JSON.parse(content);
    
    console.log(`📊 Loaded ${Object.keys(this.duplicateMap.duplicates).length} duplicate groups`);
  }

  async processDuplicates() {
    for (const [componentName, duplicateInfo] of Object.entries(this.duplicateMap.duplicates)) {
      console.log(`\n🔸 Processing ${componentName}...`);
      
      const featureFiles = duplicateInfo.featureFiles || [];
      const outsideFiles = duplicateInfo.outsideFiles || [];
      
      if (featureFiles.length === 0 || outsideFiles.length === 0) {
        console.log(`   ⚠️  Skipping ${componentName} - no feature files or outside files`);
        continue;
      }
      
      // Use the first feature file as canonical
      const canonicalFile = featureFiles[0];
      console.log(`   📍 Canonical: ${canonicalFile}`);
      console.log(`   📍 Outside files: ${outsideFiles.length}`);
      
      // Process each outside file
      for (const outsideFile of outsideFiles) {
        await this.processOutsideFile(outsideFile, canonicalFile, componentName);
      }
    }
  }

  async processOutsideFile(outsideFile, canonicalFile, componentName) {
    const outsidePath = join(process.cwd(), outsideFile);
    
    if (!existsSync(outsidePath)) {
      console.log(`     ⚠️  File not found: ${outsideFile}`);
      return;
    }
    
    console.log(`     🔄 Processing: ${outsideFile}`);
    
    try {
      // Read the outside file content
      const outsideContent = readFileSync(outsidePath, 'utf8');
      
      // Check if it's actually a duplicate by comparing content
      const canonicalPath = join(process.cwd(), canonicalFile);
      if (!existsSync(canonicalPath)) {
        console.log(`     ⚠️  Canonical file not found: ${canonicalFile}`);
        return;
      }
      
      const canonicalContent = readFileSync(canonicalPath, 'utf8');
      
      // Simple content comparison (normalize whitespace)
      const normalizedOutside = outsideContent.replace(/\s+/g, ' ').trim();
      const normalizedCanonical = canonicalContent.replace(/\s+/g, ' ').trim();
      
      if (normalizedOutside === normalizedCanonical) {
        console.log(`     ✅ Confirmed duplicate - removing: ${outsideFile}`);
        
        // Remove the duplicate file
        unlinkSync(outsidePath);
        this.removedFiles++;
        
        // Try to remove empty directories
        await this.removeEmptyDirectories(dirname(outsidePath));
        
      } else {
        console.log(`     ⚠️  Content differs - keeping: ${outsideFile}`);
      }
      
      this.processedFiles++;
      
    } catch (error) {
      console.error(`     ❌ Error processing ${outsideFile}: ${error.message}`);
    }
  }

  async removeEmptyDirectories(dirPath) {
    try {
      const parentDir = dirname(dirPath);
      
      // Check if directory is empty
      const files = readdirSync(dirPath);
      if (files.length === 0) {
        console.log(`     🗂️  Removing empty directory: ${dirPath}`);
        const { rmdirSync } = await import('fs');
        rmdirSync(dirPath);
        
        // Recursively check parent directory
        if (parentDir !== dirPath) {
          await this.removeEmptyDirectories(parentDir);
        }
      }
    } catch (error) {
      // Ignore errors when removing directories
    }
  }

  generateSummary() {
    console.log('\n📊 REFACTOR SUMMARY');
    console.log('='.repeat(50));
    console.log(`Files processed: ${this.processedFiles}`);
    console.log(`Files removed: ${this.removedFiles}`);
    console.log(`Files rewritten: ${this.rewrittenFiles}`);
    console.log('\n✅ Duplicate refactoring completed!');
  }
}

// CLI interface
const args = process.argv.slice(2);
const apply = args.includes('--apply');

if (!apply) {
  console.log('⚠️  This is a dry run. Use --apply to actually remove files.');
  console.log('Usage: node scripts/refactor-duplicates-simple.mjs --apply');
  process.exit(0);
}

// Run the refactor
const refactor = new SimpleDuplicateRefactor();
refactor.run().catch(console.error);
