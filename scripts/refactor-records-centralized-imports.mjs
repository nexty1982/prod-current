#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';

class RecordsCentralizedRefactor {
  constructor() {
    this.fixedFiles = 0;
    this.totalChanges = 0;
  }

  async refactorImports() {
    console.log('🔄 Refactoring Records Centralized Imports');
    console.log('='.repeat(50));
    console.log('');

    // Find all TypeScript/TSX files in the records-centralized feature
    const files = await glob('src/features/records-centralized/**/*.{ts,tsx}', {
      cwd: process.cwd()
    });

    console.log(`📁 Found ${files.length} files to process`);
    console.log('');

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        let newContent = content;
        let changes = 0;

        // Fix theme-elements imports
        newContent = newContent.replace(
          /from ['"]\.\.\/\.\.\/theme-elements\/([^'"]+)['"]/g,
          (match, component) => {
            changes++;
            return `from '@/components/theme-elements/${component}'`;
          }
        );

        // Fix core imports
        newContent = newContent.replace(
          /from ['"]\.\.\/\.\.\/\.\.\/core['"]/g,
          (match) => {
            changes++;
            return `from '@/core'`;
          }
        );

        // Fix core types imports
        newContent = newContent.replace(
          /from ['"]\.\.\/\.\.\/\.\.\/core\/types\/([^'"]+)['"]/g,
          (match, type) => {
            changes++;
            return `from '@/core/types/${type}'`;
          }
        );

        // Fix shared imports within the feature
        newContent = newContent.replace(
          /from ['"]\.\.\/shared['"]/g,
          (match) => {
            changes++;
            return `from '../shared'`;
          }
        );

        // Fix relative imports that go too far up
        newContent = newContent.replace(
          /from ['"]\.\.\/\.\.\/\.\.\/([^'"]+)['"]/g,
          (match, path) => {
            changes++;
            return `from '@/${path}'`;
          }
        );

        // Fix relative imports that go up two levels
        newContent = newContent.replace(
          /from ['"]\.\.\/\.\.\/([^'"]+)['"]/g,
          (match, path) => {
            // Only fix if it's not already a proper relative path within the feature
            if (!path.startsWith('components/') && !path.startsWith('hooks/') && 
                !path.startsWith('services/') && !path.startsWith('types/') && 
                !path.startsWith('utils/') && !path.startsWith('constants/')) {
              changes++;
              return `from '@/${path}'`;
            }
            return match;
          }
        );

        if (changes > 0) {
          writeFileSync(file, newContent);
          console.log(`   ✅ Fixed ${changes} imports in: ${file}`);
          this.fixedFiles++;
          this.totalChanges += changes;
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${file}: ${error.message}`);
      }
    }

    this.generateSummary();
  }

  generateSummary() {
    console.log('\n📊 REFACTORING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Files processed: ${this.fixedFiles}`);
    console.log(`Total import fixes: ${this.totalChanges}`);
    console.log('\n✅ Records Centralized import refactoring completed!');
    console.log('🎯 All imports have been updated to work with the new frontend structure');
  }
}

// Run the refactor
const refactor = new RecordsCentralizedRefactor();
refactor.refactorImports().catch(console.error);
