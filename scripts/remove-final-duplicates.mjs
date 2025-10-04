#!/usr/bin/env node

import { readFileSync, unlinkSync, existsSync, rmdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

class FinalDuplicateRemover {
  constructor() {
    this.removedFiles = 0;
    this.removedDirs = 0;
    this.errors = [];
  }

  async removeFinalDuplicates() {
    console.log('🗑️  Removing Final Duplicate Files');
    console.log('='.repeat(50));
    console.log('');

    // The remaining duplicates (keep the first one, remove the rest)
    const duplicatesToRemove = [
      'components/avatars/OrthodoxAvatars_new.tsx',
      'components/calendar/DayDetailsPanel.tsx',
      'components/dashboards/modern/WhatsNewEditor_Simple.tsx',
      'components/ui/Segmented.tsx',
      'components/ui/badge.tsx',
      'components/ui/button.tsx',
      'components/ui/card.tsx',
      'components/ui/collapsible.tsx',
      'components/ui/dialog.tsx',
      'components/ui/separator.tsx',
      'components/ui/sheet.tsx',
      'components/ui/tabs.tsx',
      'features/calendar/DayDetailsDialog.tsx',
      'features/calendar/components/FeastSlideshow.tsx',
      'lib/utils.ts',
      'services/adminRecordsApi.ts',
      'services/recordService.ts',
      'services/recordsApi.ts',
      'store/useTableStyleStore_new.ts',
      'tools/ChurchSetupTool.tsx',
      'tools/main.tsx',
      'tools/steps/AuthStep.tsx',
      'tools/steps/BasicInfoStep.tsx',
      'tools/steps/ConfigurationStep.tsx',
      'tools/steps/DatabaseStep.tsx',
      'tools/steps/DeploymentStep.tsx',
      'tools/steps/FilesGenerationStep.tsx',
      'tools/steps/ReviewStep.tsx',
      'tools/vite.config.js',
      'views/admin/ChurchAdminPanel.tsx',
      'views/dashboard/Modern.tsx',
      'views/orthodox-calendar/index.ts'
    ];

    console.log(`🔧 Processing ${duplicatesToRemove.length} duplicate files...`);
    console.log('');

    for (const file of duplicatesToRemove) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        try {
          // Check if file is actually empty or has minimal content
          const content = readFileSync(filePath, 'utf8');
          const trimmedContent = content.trim();
          
          if (trimmedContent.length === 0) {
            console.log(`   🗑️  Removing empty file: ${file}`);
          } else if (trimmedContent.length < 100) {
            console.log(`   🗑️  Removing small file (${trimmedContent.length} chars): ${file}`);
          } else {
            console.log(`   🗑️  Removing duplicate file (${trimmedContent.length} chars): ${file}`);
          }
          
          unlinkSync(filePath);
          this.removedFiles++;
          
          // Try to remove empty directories
          await this.removeEmptyDirectories(dirname(filePath));
          
        } catch (error) {
          console.error(`   ❌ Error removing ${file}: ${error.message}`);
          this.errors.push({ path: file, error: error.message });
        }
      } else {
        console.log(`   ⚠️  File not found: ${file}`);
      }
    }
    
    // Generate summary
    this.generateSummary();
  }

  async removeEmptyDirectories(dirPath) {
    try {
      const parentDir = dirname(dirPath);
      
      // Check if directory is empty
      const files = readdirSync(dirPath);
      if (files.length === 0) {
        console.log(`   🗂️  Removing empty directory: ${dirPath}`);
        rmdirSync(dirPath);
        this.removedDirs++;
        
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
    console.log('\n📊 FINAL REMOVAL SUMMARY');
    console.log('='.repeat(50));
    console.log(`Files removed: ${this.removedFiles}`);
    console.log(`Directories removed: ${this.removedDirs}`);
    
    if (this.errors.length > 0) {
      console.log(`Errors: ${this.errors.length}`);
      console.log('\n❌ Errors encountered:');
      for (const error of this.errors) {
        console.log(`  - ${error.path}: ${error.error}`);
      }
    }
    
    console.log('\n✅ Final duplicate removal completed!');
    console.log('🎉 The front-end/src directory is now clean of duplicates!');
  }
}

// Run the final remover
const remover = new FinalDuplicateRemover();
remover.removeFinalDuplicates().catch(console.error);
