#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Analyze duplicate files outside of src/features/ directory
 */

const FRONTEND_ROOT = 'UI/modernize/frontend/src';
const FEATURES_DIR = 'features';

// Patterns to search for potential duplicates
const DUPLICATE_PATTERNS = [
  '**/*User*',
  '**/*Church*', 
  '**/*Record*',
  '**/*Modal*',
  '**/*Form*',
  '**/*Table*',
  '**/*Card*',
  '**/*List*',
  '**/*Button*',
  '**/*Input*',
  '**/*Dashboard*',
  '**/*Admin*',
  '**/*Auth*',
  '**/*Login*',
  '**/*Register*'
];

class DuplicateAnalyzer {
  constructor() {
    this.duplicates = new Map();
    this.featuresFiles = new Set();
    this.outsideFiles = new Set();
  }

  async analyze() {
    console.log('🔍 Analyzing duplicate files outside src/features/...\n');
    
    // Get all files in features directory
    await this.scanFeaturesDirectory();
    
    // Get all files outside features directory
    await this.scanOutsideDirectory();
    
    // Find potential duplicates
    await this.findDuplicates();
    
    // Generate report
    this.generateReport();
  }

  async scanFeaturesDirectory() {
    console.log('📁 Scanning features directory...');
    
    const featuresPattern = `${FRONTEND_ROOT}/${FEATURES_DIR}/**/*.{tsx,ts,jsx,js}`;
    const files = await glob(featuresPattern);
    
    for (const file of files) {
      const relativePath = path.relative(FRONTEND_ROOT, file);
      const fileName = path.basename(file, path.extname(file));
      this.featuresFiles.add(fileName);
    }
    
    console.log(`   Found ${files.length} files in features directory`);
  }

  async scanOutsideDirectory() {
    console.log('📁 Scanning files outside features directory...');
    
    for (const pattern of DUPLICATE_PATTERNS) {
      const searchPattern = `${FRONTEND_ROOT}/${pattern}`;
      const files = await glob(searchPattern);
      
      for (const file of files) {
        // Skip if it's in features directory
        if (file.includes(`/${FEATURES_DIR}/`)) continue;
        
        const relativePath = path.relative(FRONTEND_ROOT, file);
        const fileName = path.basename(file, path.extname(file));
        
        this.outsideFiles.add({
          path: relativePath,
          fileName: fileName,
          fullPath: file
        });
      }
    }
    
    console.log(`   Found ${this.outsideFiles.size} files outside features directory`);
  }

  async findDuplicates() {
    console.log('🔍 Finding potential duplicates...');
    
    for (const outsideFile of this.outsideFiles) {
      const { fileName, path: filePath } = outsideFile;
      
      // Check if similar file exists in features
      if (this.featuresFiles.has(fileName)) {
        if (!this.duplicates.has(fileName)) {
          this.duplicates.set(fileName, {
            featureFiles: [],
            outsideFiles: []
          });
        }
        
        this.duplicates.get(fileName).outsideFiles.push(filePath);
      }
    }
    
    // Find corresponding feature files
    for (const [fileName, duplicateInfo] of this.duplicates) {
      const featuresPattern = `${FRONTEND_ROOT}/${FEATURES_DIR}/**/${fileName}.{tsx,ts,jsx,js}`;
      const featureFiles = await glob(featuresPattern);
      
      for (const file of featureFiles) {
        const relativePath = path.relative(FRONTEND_ROOT, file);
        duplicateInfo.featureFiles.push(relativePath);
      }
    }
  }

  generateReport() {
    console.log('\n📊 DUPLICATE ANALYSIS REPORT');
    console.log('='.repeat(50));
    
    if (this.duplicates.size === 0) {
      console.log('✅ No obvious duplicates found!');
      return;
    }
    
    console.log(`\nFound ${this.duplicates.size} potential duplicate patterns:\n`);
    
    for (const [fileName, duplicateInfo] of this.duplicates) {
      console.log(`🔸 ${fileName}`);
      console.log(`   Features: ${duplicateInfo.featureFiles.length} files`);
      duplicateInfo.featureFiles.forEach(file => {
        console.log(`     - ${file}`);
      });
      
      console.log(`   Outside: ${duplicateInfo.outsideFiles.length} files`);
      duplicateInfo.outsideFiles.forEach(file => {
        console.log(`     - ${file}`);
      });
      console.log('');
    }
    
    // Generate detailed file
    this.writeDetailedReport();
  }

  writeDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDuplicates: this.duplicates.size,
        totalOutsideFiles: this.outsideFiles.size,
        totalFeatureFiles: this.featuresFiles.size
      },
      duplicates: Object.fromEntries(this.duplicates)
    };
    
    const reportPath = '.om/duplicate-analysis.json';
    fs.mkdirSync('.om', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report written to: ${reportPath}`);
  }
}

// Run analysis
const analyzer = new DuplicateAnalyzer();
analyzer.analyze().catch(console.error);
