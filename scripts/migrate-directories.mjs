#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, dirname, basename, extname } from 'path';
import { createHash } from 'crypto';

class DirectoryMigrator {
  constructor() {
    this.rootDir = process.cwd();
    this.sourceDir = join(this.rootDir, 'front-end/src');
    this.targetDir = join(this.rootDir, 'UI/default/frontend/src');
    this.reportDir = join(this.rootDir, '.om/migration');
    
    // Define migration order (dependencies first, then features)
    this.migrationOrder = [
      'constants',
      'types', 
      'config',
      'utils',
      'helpers',
      'lib',
      'hooks',
      'context',
      'contexts',
      'store',
      'services',
      'api',
      'schemas',
      'components',
      'layouts',
      'pages',
      'views',
      'routes',
      'features',
      'modules',
      'tools',
      'records',
      'data',
      'demos',
      'examples',
      'sandbox',
      'styles',
      'theme',
      'theme2',
      'mui',
      'assets',
      'ai',
      'omai',
      '@om'
    ];

    this.migrationStats = {
      totalDirectories: 0,
      completedDirectories: 0,
      totalFiles: 0,
      migratedFiles: 0,
      errors: [],
      skipped: []
    };
  }

  async migrateAll() {
    console.log('🚀 Starting Systematic Directory Migration');
    console.log('='.repeat(60));
    console.log(`Source: ${this.sourceDir}`);
    console.log(`Target: ${this.targetDir}`);
    console.log('');

    // Ensure target directory exists
    mkdirSync(this.targetDir, { recursive: true });
    mkdirSync(this.reportDir, { recursive: true });

    // Get all directories from source
    const sourceDirs = await this.getSourceDirectories();
    this.migrationStats.totalDirectories = sourceDirs.length;

    console.log(`📁 Found ${sourceDirs.length} directories to migrate`);
    console.log('');

    // Migrate directories in order
    for (const dirName of this.migrationOrder) {
      if (sourceDirs.includes(dirName)) {
        await this.migrateDirectory(dirName);
      }
    }

    // Migrate any remaining directories not in our order
    for (const dirName of sourceDirs) {
      if (!this.migrationOrder.includes(dirName)) {
        console.log(`⚠️  Migrating unplanned directory: ${dirName}`);
        await this.migrateDirectory(dirName);
      }
    }

    // Generate final report
    await this.generateFinalReport();

    console.log('\n✅ Migration completed!');
    console.log(`📊 Summary: ${this.migrationStats.completedDirectories}/${this.migrationStats.totalDirectories} directories migrated`);
    console.log(`📄 Files: ${this.migrationStats.migratedFiles}/${this.migrationStats.totalFiles} files processed`);
  }

  async getSourceDirectories() {
    try {
      const items = readdirSync(this.sourceDir);
      return items
        .filter(item => {
          const itemPath = join(this.sourceDir, item);
          return statSync(itemPath).isDirectory() && !item.startsWith('.');
        })
        .sort();
    } catch (error) {
      console.error(`❌ Error reading source directory: ${error.message}`);
      return [];
    }
  }

  async migrateDirectory(dirName) {
    console.log(`📁 Migrating directory: ${dirName}`);
    console.log('-'.repeat(40));

    const sourcePath = join(this.sourceDir, dirName);
    const targetPath = join(this.targetDir, dirName);

    try {
      // Check if source exists
      if (!existsSync(sourcePath)) {
        console.log(`   ⚠️  Source directory does not exist: ${dirName}`);
        this.migrationStats.skipped.push({
          directory: dirName,
          reason: 'Source does not exist'
        });
        return;
      }

      // Check if target already exists
      if (existsSync(targetPath)) {
        console.log(`   ⚠️  Target directory already exists: ${dirName}`);
        console.log(`   🔄 Will merge with existing content`);
      }

      // Create target directory
      mkdirSync(targetPath, { recursive: true });

      // Count files in source
      const fileCount = await this.countFilesRecursively(sourcePath);
      this.migrationStats.totalFiles += fileCount;
      console.log(`   📄 Found ${fileCount} files to migrate`);

      // Migrate files recursively
      await this.migrateFilesRecursively(sourcePath, targetPath, dirName);

      this.migrationStats.completedDirectories++;
      console.log(`   ✅ Completed migration of ${dirName}`);
      console.log('');

    } catch (error) {
      console.error(`   ❌ Error migrating ${dirName}: ${error.message}`);
      this.migrationStats.errors.push({
        directory: dirName,
        error: error.message
      });
    }
  }

  async countFilesRecursively(dirPath) {
    let count = 0;
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          count += await this.countFilesRecursively(itemPath);
        } else if (stat.isFile()) {
          count++;
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return count;
  }

  async migrateFilesRecursively(sourcePath, targetPath, dirName) {
    try {
      const items = readdirSync(sourcePath);
      
      for (const item of items) {
        const sourceItemPath = join(sourcePath, item);
        const targetItemPath = join(targetPath, item);
        const stat = statSync(sourceItemPath);
        
        if (stat.isDirectory()) {
          // Create subdirectory and recurse
          mkdirSync(targetItemPath, { recursive: true });
          await this.migrateFilesRecursively(sourceItemPath, targetItemPath, dirName);
        } else if (stat.isFile()) {
          // Migrate file with refactoring
          await this.migrateFile(sourceItemPath, targetItemPath, dirName);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing directory ${sourcePath}: ${error.message}`);
    }
  }

  async migrateFile(sourcePath, targetPath, dirName) {
    try {
      const content = readFileSync(sourcePath, 'utf8');
      const ext = extname(sourcePath).toLowerCase();
      
      // Apply refactoring based on file type
      let refactoredContent = content;
      
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        refactoredContent = await this.refactorCodeFile(content, sourcePath, targetPath);
      }
      
      // Write refactored content
      writeFileSync(targetPath, refactoredContent);
      
      this.migrationStats.migratedFiles++;
      
      // Log significant changes
      if (refactoredContent !== content) {
        console.log(`   🔧 Refactored: ${relative(this.sourceDir, sourcePath)}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error migrating file ${sourcePath}: ${error.message}`);
      this.migrationStats.errors.push({
        file: relative(this.sourceDir, sourcePath),
        error: error.message
      });
    }
  }

  async refactorCodeFile(content, sourcePath, targetPath) {
    let refactored = content;
    
    // 1. Fix import paths to use new structure
    refactored = this.refactorImportPaths(refactored, sourcePath);
    
    // 2. Normalize syntax (apply deep sanitizer rules)
    refactored = this.normalizeSyntax(refactored);
    
    // 3. Update relative paths
    refactored = this.updateRelativePaths(refactored, sourcePath, targetPath);
    
    return refactored;
  }

  refactorImportPaths(content, sourcePath) {
    // Convert old import patterns to new structure
    let refactored = content;
    
    // Map old paths to new paths
    const pathMappings = {
      // Common mappings
      '../components/': '@/components/',
      './components/': '@/components/',
      '../utils/': '@/utils/',
      './utils/': '@/utils/',
      '../types/': '@/types/',
      './types/': '@/types/',
      '../hooks/': '@/hooks/',
      './hooks/': '@/hooks/',
      '../services/': '@/services/',
      './services/': '@/services/',
      '../context/': '@/context/',
      './context/': '@/context/',
      '../contexts/': '@/contexts/',
      './contexts/': '@/contexts/',
      '../constants/': '@/constants/',
      './constants/': '@/constants/',
      '../config/': '@/config/',
      './config/': '@/config/',
      '../api/': '@/api/',
      './api/': '@/api/',
      '../store/': '@/store/',
      './store/': '@/store/'
    };
    
    // Apply path mappings
    for (const [oldPath, newPath] of Object.entries(pathMappings)) {
      const regex = new RegExp(`(['"])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      refactored = refactored.replace(regex, `$1${newPath}`);
    }
    
    return refactored;
  }

  normalizeSyntax(content) {
    // Apply the same normalization as deep-sanitize.mjs
    let normalized = content;
    
    // Strip BOM
    normalized = normalized.replace(/\uFEFF/g, '');
    
    // Strip zero-width spaces
    normalized = normalized.replace(/[\u200B\u200E\u200F\u200C\u200D\u2060\uFE0F]/g, '');
    
    // Normalize NBSP and other spaces
    normalized = normalized.replace(/[\u00A0\u202F\u3000\u2000-\u200A]/g, ' ');
    
    // Normalize curly quotes
    normalized = normalized.replace(/[\u2018\u2019\u201A\u201B\u2032\uFF07\u00B4]/g, "'");
    normalized = normalized.replace(/[\u201C\u201D\u201E\u2033\u00AB\u00BB\u2039\u203A\uFF02]/g, '"');
    
    // Normalize line separators
    normalized = normalized.replace(/[\u2028\u2029]/g, '\n');
    
    // Convert dashes/minus
    normalized = normalized.replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, '-');
    
    // Convert slashes & math
    normalized = normalized.replace(/[\u2215\u00F7\u2044\uFF0F]/g, '/');
    normalized = normalized.replace(/[\u2217\u00D7\u204E]/g, '*');
    
    // Convert operators
    normalized = normalized.replace(/[\u2192\u21D2\u27F6\u2794\u27A1]/g, '=>');
    normalized = normalized.replace(/\u2264/g, '<=');
    normalized = normalized.replace(/\u2265/g, '>=');
    normalized = normalized.replace(/\u2260/g, '!=');
    normalized = normalized.replace(/\u2261/g, '===');
    
    // Convert ellipses
    normalized = normalized.replace(/[\u2026\u22EF\u22EE\u22F0]/g, '...');
    
    return normalized;
  }

  updateRelativePaths(content, sourcePath, targetPath) {
    // Update relative imports based on new directory structure
    let updated = content;
    
    // Calculate relative depth difference
    const sourceDepth = sourcePath.split('/').length - this.sourceDir.split('/').length;
    const targetDepth = targetPath.split('/').length - this.targetDir.split('/').length;
    
    // Adjust relative imports if depth changed
    if (sourceDepth !== targetDepth) {
      const depthDiff = targetDepth - sourceDepth;
      const relativeRegex = /(['"])(\.\.\/)+/g;
      
      updated = updated.replace(relativeRegex, (match, quote) => {
        const dots = match.match(/\.\.\//g);
        const newDepth = dots.length + depthDiff;
        
        if (newDepth <= 0) {
          return `${quote}./`;
        } else {
          return `${quote}${'../'.repeat(newDepth)}`;
        }
      });
    }
    
    return updated;
  }

  async generateFinalReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      source: this.sourceDir,
      target: this.targetDir,
      statistics: this.migrationStats,
      migrationOrder: this.migrationOrder,
      summary: {
        successRate: this.migrationStats.totalDirectories > 0 
          ? Math.round((this.migrationStats.completedDirectories / this.migrationStats.totalDirectories) * 100)
          : 0,
        fileSuccessRate: this.migrationStats.totalFiles > 0
          ? Math.round((this.migrationStats.migratedFiles / this.migrationStats.totalFiles) * 100)
          : 0
      }
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'migration-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    this.writeMarkdownReport(reportData);

    console.log(`📄 Migration reports written to: ${this.reportDir}`);
  }

  writeMarkdownReport(data) {
    const lines = [];
    
    lines.push('# Directory Migration Report');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push(`**Source:** ${data.source}`);
    lines.push(`**Target:** ${data.target}`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Directories Migrated:** ${data.statistics.completedDirectories}/${data.statistics.totalDirectories} (${data.summary.successRate}%)`);
    lines.push(`- **Files Migrated:** ${data.statistics.migratedFiles}/${data.statistics.totalFiles} (${data.summary.fileSuccessRate}%)`);
    lines.push('');
    
    if (data.statistics.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const error of data.statistics.errors) {
        lines.push(`- **${error.directory || error.file}:** ${error.error}`);
      }
      lines.push('');
    }
    
    if (data.statistics.skipped.length > 0) {
      lines.push('## Skipped Items');
      lines.push('');
      for (const skipped of data.statistics.skipped) {
        lines.push(`- **${skipped.directory}:** ${skipped.reason}`);
      }
      lines.push('');
    }
    
    lines.push('## Migration Order');
    lines.push('');
    lines.push('The following order was used for migration:');
    lines.push('');
    data.migrationOrder.forEach((dir, index) => {
      lines.push(`${index + 1}. ${dir}`);
    });
    lines.push('');

    writeFileSync(
      join(this.reportDir, 'migration-report.md'),
      lines.join('\n')
    );
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

const migrator = new DirectoryMigrator();

if (command === '--help' || command === '-h') {
  console.log(`
Usage: node scripts/migrate-directories.mjs [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be migrated without actually copying files
  --dir <name>   Migrate only a specific directory
  --order        Show the planned migration order

Examples:
  node scripts/migrate-directories.mjs              # Migrate all directories
  node scripts/migrate-directories.mjs --dir components  # Migrate only components
  node scripts/migrate-directories.mjs --dry-run    # Show migration plan
  node scripts/migrate-directories.mjs --order      # Show migration order
  `);
  process.exit(0);
}

if (command === '--order') {
  console.log('📋 Planned Migration Order:');
  console.log('='.repeat(40));
  migrator.migrationOrder.forEach((dir, index) => {
    console.log(`${index + 1}. ${dir}`);
  });
  process.exit(0);
}

if (command === '--dir') {
  const dirName = args[1];
  if (!dirName) {
    console.error('❌ Directory name required with --dir option');
    process.exit(1);
  }
  
  console.log(`🎯 Migrating single directory: ${dirName}`);
  migrator.migrateDirectory(dirName).then(() => {
    console.log('✅ Single directory migration completed!');
  }).catch(console.error);
} else {
  // Migrate all directories
  migrator.migrateAll().catch(console.error);
}
