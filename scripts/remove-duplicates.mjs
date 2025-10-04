#!/usr/bin/env node

import { readFileSync, unlinkSync, existsSync, rmdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

class DuplicateRemover {
  constructor() {
    this.removedFiles = 0;
    this.removedDirs = 0;
    this.errors = [];
  }

  async removeDuplicates() {
    console.log('🗑️  Removing Duplicate Files');
    console.log('='.repeat(50));
    console.log('');

    // Remove backup directories first (they contain most duplicates)
    await this.removeBackupDirectories();
    
    // Remove theme2 directory (duplicate of theme)
    await this.removeTheme2Directory();
    
    // Remove specific duplicate files
    await this.removeSpecificDuplicates();
    
    // Generate summary
    this.generateSummary();
  }

  async removeBackupDirectories() {
    console.log('🧹 Removing backup directories...');
    
    const backupDirs = [
      '.backup-userprofile-20250820-062953',
      '.backup-userprofile-20250820-063320', 
      '.backup-userprofile-20250820-064800',
      '.backup-userprofile-20250820-065012',
      '.backup-userprofile-20250820-065224'
    ];

    for (const dir of backupDirs) {
      const dirPath = join(process.cwd(), dir);
      if (existsSync(dirPath)) {
        try {
          console.log(`   🗂️  Removing: ${dir}`);
          await this.removeDirectoryRecursively(dirPath);
          this.removedDirs++;
        } catch (error) {
          console.error(`   ❌ Error removing ${dir}: ${error.message}`);
          this.errors.push({ path: dir, error: error.message });
        }
      }
    }
  }

  async removeTheme2Directory() {
    console.log('\n🎨 Removing theme2 directory (duplicate of theme)...');
    
    const theme2Path = join(process.cwd(), 'theme2');
    if (existsSync(theme2Path)) {
      try {
        console.log('   🗂️  Removing: theme2/');
        await this.removeDirectoryRecursively(theme2Path);
        this.removedDirs++;
      } catch (error) {
        console.error(`   ❌ Error removing theme2: ${error.message}`);
        this.errors.push({ path: 'theme2', error: error.message });
      }
    }
  }

  async removeSpecificDuplicates() {
    console.log('\n🔧 Removing specific duplicate files...');
    
    const duplicatesToRemove = [
      // API duplicates (keep the ones in backup directories)
      'api/admin.api.ts',
      'api/blog/blogData.ts',
      'api/chat/Chatdata.ts',
      'api/church-records.api.ts',
      'api/church-records.hooks.ts',
      'api/churches/churchData.tsx',
      'api/client-management.api.ts',
      'api/components.api.ts',
      'api/contacts/ContactsData.tsx',
      'api/eCommerce/ProductsData.ts',
      'api/email/EmailData.tsx',
      'api/invoice/invoceLists.tsx',
      'api/kanban/KanbanData.tsx',
      'api/language/LanguageData.js',
      'api/memories.api.ts',
      'api/metrics.api.ts',
      'api/mocks/browser.ts',
      'api/notes/NotesData.ts',
      'api/orthodox-metrics.api.ts',
      'api/social.api.ts',
      'api/ticket/TicketData.ts',
      'api/user.api.ts',
      'api/globalFetcher.ts',
      
      // Types duplicates
      'types/apps/blog.ts',
      'types/apps/chat.ts',
      'types/apps/contact.ts',
      'types/apps/eCommerce.ts',
      'types/apps/email.ts',
      'types/apps/icon.ts',
      'types/apps/invoice.ts',
      'types/apps/kanban.ts',
      'types/apps/notes.ts',
      'types/apps/ticket.ts',
      'types/apps/users.ts',
      
      // Component duplicates
      'components/apps/userprofile/profile/PostComments.tsx',
      'components/apps/userprofile/profile/PostTextBox.tsx',
      'components/apps/userprofile/profile/Post.tsx',
      'components/apps/ecommerce/productEdit/Media.tsx',
      'components/custom/ParishMap.tsx',
      
      // View duplicates
      'views/apps/user-profile/Followers.tsx',
      'views/apps/user-profile/Friends.tsx',
      'views/apps/user-profile/Gallery.tsx',
      
      // Legacy files
      'legacy_ChurchSetupWizard.tsx',
      
      // Page duplicates
      'pages/ch_wiz/pg_wiz_2.tsx',
      'pages/ch_wiz/pg_wiz_3.tsx',
      'pages/ch_wiz/pg_wiz_4.tsx',
      'pages/ch_wiz/pg_wiz_5.tsx',
      'pages/church-wizard/Step2Modules.tsx',
      'pages/church-wizard/Step3Accounts.tsx',
      'pages/church-wizard/ProvisionDashboard.tsx',
      'pages/church-wizard/Summary.tsx',
      
      // Feature duplicates
      'features/church-management/new_church_wizard/wizard/ChurchSetupWizard.tsx',
      'features/church-management/new_church_wizard/wizard/ProvisionDashboard.tsx',
      'features/church-management/new_church_wizard/wizard/Stepper.tsx',
      'features/church-management/new_church_wizard/wizard/Success.tsx',
      'features/church-management/new_church_wizard/wizard/Summary.tsx'
    ];

    for (const file of duplicatesToRemove) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        try {
          console.log(`   🗑️  Removing: ${file}`);
          unlinkSync(filePath);
          this.removedFiles++;
          
          // Try to remove empty directories
          await this.removeEmptyDirectories(dirname(filePath));
        } catch (error) {
          console.error(`   ❌ Error removing ${file}: ${error.message}`);
          this.errors.push({ path: file, error: error.message });
        }
      }
    }
  }

  async removeDirectoryRecursively(dirPath) {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          await this.removeDirectoryRecursively(itemPath);
        } else {
          unlinkSync(itemPath);
        }
      }
      
      rmdirSync(dirPath);
    } catch (error) {
      throw error;
    }
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
    console.log('\n📊 REMOVAL SUMMARY');
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
    
    console.log('\n✅ Duplicate removal completed!');
  }
}

// Run the remover
const remover = new DuplicateRemover();
remover.removeDuplicates().catch(console.error);
