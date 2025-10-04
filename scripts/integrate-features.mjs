#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { extract } from 'zip-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FEATURES_GLOB = 'src/features/**/*.{ts,tsx,js,jsx}';
const OUTSIDE_GLOBS = [
  'src/components/**/*.{ts,tsx,js,jsx}',
  'src/views/**/*.{ts,tsx,js,jsx}',
  'src/context/**/*.{ts,tsx,js,jsx}',
  'src/contexts/**/*.{ts,tsx,js,jsx}',
  'src/services/**/*.{ts,tsx,js,jsx}',
  'src/modules/**/*.{ts,tsx,js,jsx}',
  'src/pages/**/*.{ts,tsx,js,jsx}',
  'src/layouts/**/*.{ts,tsx,js,jsx}',
  'src/tools/**/*.{ts,tsx,js,jsx}',
  'src/utils/**/*.{ts,tsx,js,jsx}',
  'src/hooks/**/*.{ts,tsx,js,jsx}',
  'src/types/**/*.{ts,tsx,js,jsx}'
];

class FeatureIntegrator {
  constructor(options = {}) {
    this.options = {
      zipPath: options.zipPath,
      rootDir: options.rootDir || process.cwd(),
      apply: options.apply || false,
      dry: options.dry || false,
      preferAlias: options.preferAlias || '@',
      stubReexports: options.stubReexports || false,
      removeEmpties: options.removeEmpties || false,
      casePolicy: options.casePolicy || 'normalize',
      normalizeSimilarity: options.normalizeSimilarity || 0.98,
      ...options
    };
    
    this.report = {
      timestamp: new Date().toISOString(),
      extracted: [],
      duplicates: [],
      rewrites: [],
      removed: [],
      errors: []
    };
    
    this.featuresIndex = new Map();
    this.outsideIndex = new Map();
    this.importRewrites = new Map();
  }

  async integrate() {
    console.log('🚀 Feature Integration Starting...\n');
    
    try {
      // Step 1: Git safety & workspace
      await this.setupWorkspace();
      
      // Step 2: Extract features.zip
      await this.extractFeatures();
      
      // Step 3: Index repo & find duplicates
      await this.indexFiles();
      await this.findDuplicates();
      
      // Step 4: Plan rewrites
      await this.planRewrites();
      
      // Step 5: Apply changes or report
      if (this.options.apply) {
        await this.applyChanges();
        await this.runBuild();
        await this.commitChanges();
      } else {
        this.generateReport();
      }
      
      console.log('\n✅ Feature integration complete!');
      
    } catch (error) {
      console.error('\n❌ Integration failed:', error.message);
      this.report.errors.push({
        step: 'integration',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async setupWorkspace() {
    console.log('📋 Setting up workspace...');
    
    // Check if working tree is clean
    try {
      const status = execSync('git status --porcelain', { 
        cwd: this.options.rootDir,
        encoding: 'utf-8' 
      });
      
      if (status.trim() && !this.options.dry) {
        throw new Error('Working tree is not clean. Please commit or stash changes first.');
      }
    } catch (error) {
      if (error.message.includes('not a git repository')) {
        console.log('⚠️  Not a git repository, skipping git checks');
      } else {
        throw error;
      }
    }
    
    // Create integration directory
    const integrateDir = path.join(this.options.rootDir, '.om', 'integrate');
    if (!fs.existsSync(integrateDir)) {
      fs.mkdirSync(integrateDir, { recursive: true });
    }
    
    // Create git branch if applying changes
    if (this.options.apply && !this.options.dry) {
      const branchName = `chore/integrate-features-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`;
      try {
        execSync(`git checkout -b ${branchName}`, { cwd: this.options.rootDir });
        console.log(`  ✓ Created branch: ${branchName}`);
      } catch (error) {
        console.log(`  ⚠️  Could not create branch: ${error.message}`);
      }
    }
  }

  async extractFeatures() {
    console.log('📦 Extracting features.zip...');
    
    if (!this.options.zipPath) {
      throw new Error('--zip path is required');
    }
    
    if (!fs.existsSync(this.options.zipPath)) {
      throw new Error(`Features zip not found: ${this.options.zipPath}`);
    }
    
    const extractDir = path.join(this.options.rootDir, '.om', 'integrate', 'features-unpacked');
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });
    
    // Extract zip
    await extract(this.options.zipPath, extractDir);
    
    // Process extracted directories
    const extractedDirs = fs.readdirSync(extractDir);
    console.log(`  ✓ Extracted ${extractedDirs.length} directories`);
    
    // Handle case collisions
    const canonicalDirs = this.resolveCaseCollisions(extractedDirs);
    
    // Copy to src/features/
    const featuresDir = path.join(this.options.rootDir, 'src', 'features');
    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
    }
    
    for (const [original, canonical] of Object.entries(canonicalDirs)) {
      const sourcePath = path.join(extractDir, original);
      const targetPath = path.join(featuresDir, canonical);
      
      if (fs.existsSync(targetPath)) {
        // Compare content and overwrite if different
        const shouldOverwrite = await this.shouldOverwrite(sourcePath, targetPath);
        if (shouldOverwrite) {
          fs.rmSync(targetPath, { recursive: true });
          fs.cpSync(sourcePath, targetPath, { recursive: true });
          this.report.extracted.push({
            original,
            canonical,
            action: 'overwritten',
            path: targetPath
          });
          console.log(`  ✓ Overwrote: ${canonical}`);
        } else {
          console.log(`  - Skipped (identical): ${canonical}`);
        }
      } else {
        fs.cpSync(sourcePath, targetPath, { recursive: true });
        this.report.extracted.push({
          original,
          canonical,
          action: 'created',
          path: targetPath
        });
        console.log(`  ✓ Created: ${canonical}`);
      }
    }
  }

  resolveCaseCollisions(dirs) {
    const canonical = {};
    const seen = new Set();
    
    for (const dir of dirs) {
      const normalized = dir.toLowerCase();
      
      if (seen.has(normalized)) {
        // Case collision - prefer the one that's already in the repo
        const existing = Object.keys(canonical).find(k => k.toLowerCase() === normalized);
        if (existing) {
          // Check which one is already used in imports
          const existingUsage = this.checkImportUsage(existing);
          const newUsage = this.checkImportUsage(dir);
          
          if (newUsage > existingUsage) {
            // New one is used more, replace
            delete canonical[existing];
            canonical[dir] = dir;
            console.log(`  ✓ Resolved case collision: ${existing} → ${dir}`);
          } else {
            console.log(`  - Resolved case collision: ${dir} → ${existing}`);
          }
        }
      } else {
        canonical[dir] = dir;
        seen.add(normalized);
      }
    }
    
    return canonical;
  }

  checkImportUsage(dirName) {
    // Simple heuristic - count occurrences in import statements
    // This could be enhanced with actual AST parsing
    return 0; // Placeholder
  }

  async shouldOverwrite(sourcePath, targetPath) {
    if (!fs.existsSync(targetPath)) return true;
    
    const sourceStats = fs.statSync(sourcePath);
    const targetStats = fs.statSync(targetPath);
    
    if (sourceStats.isDirectory() !== targetStats.isDirectory()) return true;
    
    if (sourceStats.isFile()) {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const targetContent = fs.readFileSync(targetPath, 'utf-8');
      return sourceContent !== targetContent;
    }
    
    return false;
  }

  async indexFiles() {
    console.log('📊 Indexing files...');
    
    // Index features
    const featureFiles = await glob(FEATURES_GLOB, {
      cwd: this.options.rootDir,
      absolute: true
    });
    
    for (const file of featureFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const normalized = this.normalizeContent(content);
      const hash = createHash('sha256').update(content).digest('hex');
      const normalizedHash = createHash('sha256').update(normalized).digest('hex');
      
      this.featuresIndex.set(file, {
        content,
        normalized,
        hash,
        normalizedHash,
        relativePath: path.relative(this.options.rootDir, file)
      });
    }
    
    // Index outside files
    for (const globPattern of OUTSIDE_GLOBS) {
      const files = await glob(globPattern, {
        cwd: this.options.rootDir,
        absolute: true
      });
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const normalized = this.normalizeContent(content);
        const hash = createHash('sha256').update(content).digest('hex');
        const normalizedHash = createHash('sha256').update(normalized).digest('hex');
        
        this.outsideIndex.set(file, {
          content,
          normalized,
          hash,
          normalizedHash,
          relativePath: path.relative(this.options.rootDir, file)
        });
      }
    }
    
    console.log(`  ✓ Indexed ${this.featuresIndex.size} feature files`);
    console.log(`  ✓ Indexed ${this.outsideIndex.size} outside files`);
  }

  normalizeContent(content) {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\s+$/gm, '') // Remove trailing whitespace
      .replace(/^\s+/gm, '') // Remove leading whitespace
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\n\s*\n/g, '\n') // Collapse multiple newlines
      .trim();
  }

  async findDuplicates() {
    console.log('🔍 Finding duplicates...');
    
    for (const [outsidePath, outsideData] of this.outsideIndex) {
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const [featurePath, featureData] of this.featuresIndex) {
        // Check for identical content
        if (outsideData.hash === featureData.hash) {
          bestMatch = { path: featurePath, similarity: 1.0, type: 'identical' };
          break;
        }
        
        // Check for normalized similarity
        if (outsideData.normalizedHash === featureData.normalizedHash) {
          bestMatch = { path: featurePath, similarity: 1.0, type: 'normalized' };
          break;
        }
        
        // Calculate similarity
        const similarity = this.calculateSimilarity(outsideData.normalized, featureData.normalized);
        if (similarity >= this.options.normalizeSimilarity && similarity > bestSimilarity) {
          bestMatch = { path: featurePath, similarity, type: 'similar' };
          bestSimilarity = similarity;
        }
      }
      
      if (bestMatch) {
        this.report.duplicates.push({
          outsidePath,
          featurePath: bestMatch.path,
          similarity: bestMatch.similarity,
          type: bestMatch.type
        });
      }
    }
    
    console.log(`  ✓ Found ${this.report.duplicates.length} duplicates`);
  }

  calculateSimilarity(str1, str2) {
    const lines1 = str1.split('\n');
    const lines2 = str2.split('\n');
    
    const maxLines = Math.max(lines1.length, lines2.length);
    if (maxLines === 0) return 1.0;
    
    let matches = 0;
    const minLines = Math.min(lines1.length, lines2.length);
    
    for (let i = 0; i < minLines; i++) {
      if (lines1[i] === lines2[i]) {
        matches++;
      }
    }
    
    return matches / maxLines;
  }

  async planRewrites() {
    console.log('📝 Planning import rewrites...');
    
    for (const duplicate of this.report.duplicates) {
      const outsidePath = duplicate.outsidePath;
      const featurePath = duplicate.featurePath;
      
      // Find all files that import the outside path
      const importers = await this.findImporters(outsidePath);
      
      for (const importer of importers) {
        const newImportPath = this.calculateNewImportPath(importer, outsidePath, featurePath);
        
        if (!this.importRewrites.has(importer)) {
          this.importRewrites.set(importer, []);
        }
        
        this.importRewrites.get(importer).push({
          oldPath: outsidePath,
          newPath: newImportPath,
          featurePath
        });
      }
    }
    
    console.log(`  ✓ Planned rewrites for ${this.importRewrites.size} files`);
  }

  async findImporters(targetPath) {
    const importers = [];
    const relativePath = path.relative(this.options.rootDir, targetPath);
    
    // Search all TypeScript/JavaScript files
    const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: this.options.rootDir,
      absolute: true,
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });
    
    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for various import patterns
        const importPatterns = [
          new RegExp(`from\\s+['"]\\.?/?${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
          new RegExp(`import\\s+['"]\\.?/?${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
          new RegExp(`require\\(['"]\\.?/?${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g')
        ];
        
        for (const pattern of importPatterns) {
          if (pattern.test(content)) {
            importers.push(file);
            break;
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return importers;
  }

  calculateNewImportPath(importerPath, oldPath, newPath) {
    const importerDir = path.dirname(importerPath);
    const relativeToImporter = path.relative(importerDir, newPath);
    
    // Convert to forward slashes for imports
    let importPath = relativeToImporter.replace(/\\/g, '/');
    
    // Add leading dot if not present
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    // Handle alias preference
    if (this.options.preferAlias && this.hasAliasSupport()) {
      const aliasPath = this.convertToAlias(newPath);
      if (aliasPath) {
        importPath = aliasPath;
      }
    }
    
    return importPath;
  }

  hasAliasSupport() {
    // Check if tsconfig.json has alias configuration
    const tsconfigPath = path.join(this.options.rootDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
        return tsconfig.compilerOptions?.paths?.['@/*'];
      } catch (error) {
        // Ignore parse errors
      }
    }
    return false;
  }

  convertToAlias(filePath) {
    const relativePath = path.relative(path.join(this.options.rootDir, 'src'), filePath);
    if (relativePath && !relativePath.startsWith('..')) {
      return `@/${relativePath.replace(/\\/g, '/')}`;
    }
    return null;
  }

  async applyChanges() {
    console.log('🔧 Applying changes...');
    
    // Apply import rewrites
    for (const [filePath, rewrites] of this.importRewrites) {
      await this.rewriteImports(filePath, rewrites);
    }
    
    // Remove or stub duplicate files
    for (const duplicate of this.report.duplicates) {
      await this.handleDuplicate(duplicate);
    }
    
    // Remove empty directories if requested
    if (this.options.removeEmpties) {
      await this.removeEmptyDirectories();
    }
  }

  async rewriteImports(filePath, rewrites) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    
    for (const rewrite of rewrites) {
      const oldRelative = path.relative(path.dirname(filePath), rewrite.oldPath);
      const newRelative = rewrite.newPath;
      
      // Replace various import patterns
      const patterns = [
        new RegExp(`from\\s+['"]${oldRelative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        new RegExp(`import\\s+['"]${oldRelative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        new RegExp(`require\\(['"]${oldRelative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g')
      ];
      
      for (const pattern of patterns) {
        const newContent = content.replace(pattern, (match) => {
          return match.replace(oldRelative, newRelative);
        });
        
        if (newContent !== content) {
          content = newContent;
          changed = true;
        }
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf-8');
      this.report.rewrites.push({
        file: filePath,
        rewrites: rewrites.length
      });
      console.log(`  ✓ Updated imports in ${path.relative(this.options.rootDir, filePath)}`);
    }
  }

  async handleDuplicate(duplicate) {
    const outsidePath = duplicate.outsidePath;
    
    if (this.options.stubReexports) {
      // Create re-export stub
      const featureRelative = path.relative(path.dirname(outsidePath), duplicate.featurePath);
      const stubContent = `export * from '${featureRelative.replace(/\\/g, '/')}';\nexport { default } from '${featureRelative.replace(/\\/g, '/')}';`;
      
      fs.writeFileSync(outsidePath, stubContent, 'utf-8');
      console.log(`  ✓ Created re-export stub: ${path.relative(this.options.rootDir, outsidePath)}`);
    } else {
      // Delete the file
      fs.unlinkSync(outsidePath);
      this.report.removed.push(outsidePath);
      console.log(`  ✓ Removed duplicate: ${path.relative(this.options.rootDir, outsidePath)}`);
    }
  }

  async removeEmptyDirectories() {
    // Find and remove empty directories
    const dirsToCheck = new Set();
    
    for (const duplicate of this.report.duplicates) {
      let dir = path.dirname(duplicate.outsidePath);
      while (dir !== this.options.rootDir && dir.length > this.options.rootDir.length) {
        dirsToCheck.add(dir);
        dir = path.dirname(dir);
      }
    }
    
    for (const dir of dirsToCheck) {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        console.log(`  ✓ Removed empty directory: ${path.relative(this.options.rootDir, dir)}`);
      }
    }
  }

  async runBuild() {
    console.log('🔨 Running build...');
    
    try {
      // Run TypeScript check
      execSync('npx tsc --noEmit', { 
        cwd: this.options.rootDir,
        stdio: 'pipe'
      });
      console.log('  ✓ TypeScript check passed');
      
      // Run Vite build
      execSync('npx vite build', { 
        cwd: this.options.rootDir,
        stdio: 'pipe'
      });
      console.log('  ✓ Vite build passed');
      
      this.report.buildStatus = 'success';
    } catch (error) {
      console.log('  ⚠️  Build failed:', error.message);
      this.report.buildStatus = 'failed';
      this.report.buildError = error.message;
    }
  }

  async commitChanges() {
    console.log('💾 Committing changes...');
    
    try {
      const message = `feat(features): integrate features.zip & replace duplicates outside src/features (${this.report.rewrites.length} rewrites)`;
      execSync(`git add .`, { cwd: this.options.rootDir });
      execSync(`git commit -m "${message}"`, { cwd: this.options.rootDir });
      console.log('  ✓ Changes committed');
    } catch (error) {
      console.log('  ⚠️  Could not commit:', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Integration Report:');
    console.log('='.repeat(50));
    
    console.log(`\n📦 Extracted: ${this.report.extracted.length} directories`);
    for (const item of this.report.extracted) {
      console.log(`  ${item.action}: ${item.canonical}`);
    }
    
    console.log(`\n🔍 Duplicates: ${this.report.duplicates.length} files`);
    for (const dup of this.report.duplicates) {
      const similarity = dup.type === 'identical' ? '100%' : `${Math.round(dup.similarity * 100)}%`;
      console.log(`  ${path.relative(this.options.rootDir, dup.outsidePath)} → ${path.relative(this.options.rootDir, dup.featurePath)} (${similarity})`);
    }
    
    console.log(`\n📝 Import rewrites: ${this.report.rewrites.length} files`);
    for (const rewrite of this.report.rewrites) {
      console.log(`  ${path.relative(this.options.rootDir, rewrite.file)} (${rewrite.rewrites} changes)`);
    }
    
    if (this.report.removed.length > 0) {
      console.log(`\n🗑️  Removed: ${this.report.removed.length} files`);
      for (const removed of this.report.removed) {
        console.log(`  ${path.relative(this.options.rootDir, removed)}`);
      }
    }
    
    // Write detailed report
    const reportPath = path.join(this.options.rootDir, '.om', 'integrate', 'integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2), 'utf-8');
    console.log(`\n📄 Detailed report: ${path.relative(this.options.rootDir, reportPath)}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--zip':
        options.zipPath = args[++i];
        break;
      case '--root':
        options.rootDir = args[++i];
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--dry':
        options.dry = true;
        break;
      case '--prefer-alias':
        options.preferAlias = args[++i];
        break;
      case '--stub-reexports':
        options.stubReexports = true;
        break;
      case '--remove-empties':
        options.removeEmpties = true;
        break;
      case '--case-policy':
        options.casePolicy = args[++i];
        break;
      case '--normalize-similarity':
        options.normalizeSimilarity = parseFloat(args[++i]);
        break;
    }
  }
  
  if (!options.zipPath) {
    console.error('Error: --zip path is required');
    process.exit(1);
  }
  
  const integrator = new FeatureIntegrator(options);
  await integrator.integrate();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FeatureIntegrator };
