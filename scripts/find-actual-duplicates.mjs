#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { createHash } from 'crypto';

class ActualDuplicateFinder {
  constructor() {
    this.srcDir = process.cwd();
    this.fileHashes = new Map();
    this.duplicates = [];
  }

  async findDuplicates() {
    console.log('🔍 Finding Actual Duplicates in Current Directory');
    console.log('='.repeat(60));
    console.log(`Scanning: ${this.srcDir}`);
    console.log('');

    // Scan all files recursively
    await this.scanDirectory(this.srcDir);
    
    // Find duplicates
    this.findDuplicateGroups();
    
    // Display results
    this.displayResults();
  }

  async scanDirectory(dirPath) {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          await this.scanDirectory(itemPath);
        } else if (stat.isFile() && this.isSourceFile(item)) {
          await this.processFile(itemPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }

  isSourceFile(filePath) {
    const ext = extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  async processFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const hash = createHash('sha256').update(content).digest('hex');
      const relativePath = filePath.replace(this.srcDir + '/', '');
      
      if (this.fileHashes.has(hash)) {
        // Found a duplicate
        const originalFile = this.fileHashes.get(hash);
        this.duplicates.push({
          hash,
          original: originalFile,
          duplicate: relativePath
        });
      } else {
        this.fileHashes.set(hash, relativePath);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  findDuplicateGroups() {
    // Group duplicates by hash
    const groups = new Map();
    
    for (const dup of this.duplicates) {
      if (!groups.has(dup.hash)) {
        groups.set(dup.hash, [dup.original]);
      }
      groups.get(dup.hash).push(dup.duplicate);
    }
    
    this.duplicateGroups = Array.from(groups.values());
  }

  displayResults() {
    console.log(`📊 Found ${this.duplicates.length} duplicate files in ${this.duplicateGroups.length} groups`);
    console.log('');
    
    if (this.duplicateGroups.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    console.log('🔸 Duplicate Groups:');
    console.log('');
    
    for (let i = 0; i < this.duplicateGroups.length; i++) {
      const group = this.duplicateGroups[i];
      console.log(`Group ${i + 1}:`);
      for (const file of group) {
        console.log(`  - ${file}`);
      }
      console.log('');
    }
    
    // Generate removal suggestions
    this.generateRemovalSuggestions();
  }

  generateRemovalSuggestions() {
    console.log('🗑️  Suggested Actions:');
    console.log('');
    
    for (let i = 0; i < this.duplicateGroups.length; i++) {
      const group = this.duplicateGroups[i];
      const original = group[0];
      const duplicates = group.slice(1);
      
      console.log(`Group ${i + 1}: Keep "${original}", Remove:`);
      for (const dup of duplicates) {
        console.log(`  rm "${dup}"`);
      }
      console.log('');
    }
  }
}

// Run the finder
const finder = new ActualDuplicateFinder();
finder.findDuplicates().catch(console.error);
