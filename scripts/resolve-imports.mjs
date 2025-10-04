#!/usr/bin/env node

/**
 * Comprehensive Import Resolution System
 * Resolves import errors flagged by import/no-unresolved and tsc --noEmit
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, resolve, extname } from 'path';
import { glob } from 'glob';
import { Project } from 'ts-morph';
import { createHash } from 'crypto';

class ImportResolver {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.srcDir = join(rootDir, 'src');
    this.project = new Project({
      tsConfigFilePath: join(rootDir, 'tsconfig.json'),
    });
    this.fileIndex = new Map();
    this.symbolIndex = new Map();
    this.tsconfigPaths = new Map();
    this.resolvedImports = new Map();
    this.rewrites = [];
  }

  async buildFileIndex() {
    console.log('🔍 Building file index...');
    
    // Get all source files
    const files = await glob('src/**/*.{ts,tsx,js,jsx}', { cwd: this.rootDir });
    
    for (const file of files) {
      const fullPath = join(this.rootDir, file);
      const relativePath = file;
      
      try {
        const sourceFile = this.project.addSourceFileAtPath(fullPath);
        const exports = this.extractExports(sourceFile);
        
        this.fileIndex.set(relativePath, {
          fullPath,
          sourceFile,
          exports,
          isDirectory: false
        });
        
        // Index by symbol name
        for (const [symbolName, exportInfo] of exports) {
          if (!this.symbolIndex.has(symbolName)) {
            this.symbolIndex.set(symbolName, []);
          }
          this.symbolIndex.get(symbolName).push({
            file: relativePath,
            ...exportInfo
          });
        }
        
      } catch (error) {
        console.warn(`⚠️  Could not parse ${file}: ${error.message}`);
      }
    }
    
    // Add directory entries for index files
    this.addDirectoryEntries();
    
    console.log(`✅ Indexed ${this.fileIndex.size} files with ${this.symbolIndex.size} unique symbols`);
  }

  extractExports(sourceFile) {
    const exports = new Map();
    
    try {
      // Default exports
      const defaultExport = sourceFile.getDefaultExportSymbol();
      if (defaultExport) {
        exports.set('default', {
          type: 'default',
          name: 'default',
          isDefault: true
        });
      }
      
      // Named exports
      const namedExports = sourceFile.getExportedDeclarations();
      for (const [name, declarations] of namedExports) {
        if (name !== 'default') {
          exports.set(name, {
            type: 'named',
            name,
            isDefault: false
          });
        }
      }
      
      // Re-exports
      const reExports = sourceFile.getExportDeclarations();
      for (const reExport of reExports) {
        const moduleSpecifier = reExport.getModuleSpecifierValue();
        if (moduleSpecifier && !moduleSpecifier.startsWith('.')) {
          // External dependency, skip
          continue;
        }
        
        const namedExports = reExport.getNamedExports();
        for (const namedExport of namedExports) {
          const name = namedExport.getName();
          exports.set(name, {
            type: 're-export',
            name,
            isDefault: false,
            from: moduleSpecifier
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Error extracting exports from ${sourceFile.getFilePath()}: ${error.message}`);
    }
    
    return exports;
  }

  addDirectoryEntries() {
    // Add directory entries for potential index files
    const directories = new Set();
    
    for (const file of this.fileIndex.keys()) {
      const dir = dirname(file);
      if (dir !== 'src') {
        directories.add(dir);
      }
    }
    
    for (const dir of directories) {
      const indexFiles = [
        join(dir, 'index.ts'),
        join(dir, 'index.tsx'),
        join(dir, 'index.js'),
        join(dir, 'index.jsx')
      ];
      
      for (const indexFile of indexFiles) {
        if (this.fileIndex.has(indexFile)) {
          this.fileIndex.set(dir, {
            ...this.fileIndex.get(indexFile),
            isDirectory: true
          });
          break;
        }
      }
    }
  }

  loadTsconfigPaths() {
    try {
      const tsconfigPath = join(this.rootDir, 'tsconfig.json');
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
      
      const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
      const paths = tsconfig.compilerOptions?.paths || {};
      
      for (const [pattern, mappings] of Object.entries(paths)) {
        for (const mapping of mappings) {
          this.tsconfigPaths.set(pattern, {
            baseUrl,
            mapping: mapping.replace('*', '')
          });
        }
      }
      
      console.log(`✅ Loaded ${this.tsconfigPaths.size} tsconfig paths`);
    } catch (error) {
      console.warn(`⚠️  Could not load tsconfig.json: ${error.message}`);
    }
  }

  async resolveImport(importPath, fromFile) {
    const fromDir = dirname(fromFile);
    
    // 1. Try tsconfig paths + baseUrl
    const tsconfigMatch = this.resolveTsconfigPath(importPath);
    if (tsconfigMatch) {
      return tsconfigMatch;
    }
    
    // 2. Check same-dir and sibling paths
    const siblingMatch = this.resolveSiblingPath(importPath, fromDir);
    if (siblingMatch) {
      return siblingMatch;
    }
    
    // 3. Try with common extensions
    const extensionMatch = this.resolveWithExtensions(importPath, fromDir);
    if (extensionMatch) {
      return extensionMatch;
    }
    
    // 4. Resolve @/* alias
    if (importPath.startsWith('@/')) {
      const aliasPath = importPath.replace('@/', 'src/');
      if (this.fileIndex.has(aliasPath)) {
        return aliasPath;
      }
    }
    
    return null;
  }

  resolveTsconfigPath(importPath) {
    for (const [pattern, config] of this.tsconfigPaths) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (importPath.startsWith(prefix)) {
          const suffix = importPath.slice(prefix.length);
          const resolvedPath = join(config.baseUrl, config.mapping, suffix);
          if (this.fileIndex.has(resolvedPath)) {
            return resolvedPath;
          }
        }
      } else if (pattern === importPath) {
        const resolvedPath = join(config.baseUrl, config.mapping);
        if (this.fileIndex.has(resolvedPath)) {
          return resolvedPath;
        }
      }
    }
    return null;
  }

  resolveSiblingPath(importPath, fromDir) {
    if (!importPath.startsWith('.')) {
      return null;
    }
    
    const candidates = [
      join(fromDir, importPath),
      join(fromDir, importPath, 'index'),
      join(fromDir, importPath, importPath.split('/').pop())
    ];
    
    for (const candidate of candidates) {
      if (this.fileIndex.has(candidate)) {
        return candidate;
      }
    }
    
    return null;
  }

  resolveWithExtensions(importPath, fromDir) {
    if (!importPath.startsWith('.')) {
      return null;
    }
    
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const basePath = join(fromDir, importPath);
    
    for (const ext of extensions) {
      const candidate = basePath + ext;
      if (this.fileIndex.has(candidate)) {
        return candidate;
      }
    }
    
    return null;
  }

  async findUnresolvedImports() {
    console.log('🔍 Finding unresolved imports...');
    const unresolved = [];
    
    for (const [file, fileInfo] of this.fileIndex) {
      if (fileInfo.isDirectory) continue;
      
      try {
        const sourceFile = fileInfo.sourceFile;
        const importDeclarations = sourceFile.getImportDeclarations();
        
        for (const importDecl of importDeclarations) {
          const moduleSpecifier = importDecl.getModuleSpecifierValue();
          
          // Skip external dependencies
          if (!moduleSpecifier.startsWith('.')) {
            continue;
          }
          
          const resolved = await this.resolveImport(moduleSpecifier, file);
          if (!resolved) {
            unresolved.push({
              file,
              importPath: moduleSpecifier,
              importDecl,
              line: importDecl.getStartLineNumber()
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️  Error processing imports in ${file}: ${error.message}`);
      }
    }
    
    console.log(`❌ Found ${unresolved.length} unresolved imports`);
    return unresolved;
  }

  async rewriteImports(unresolvedImports) {
    console.log('✏️  Rewriting imports...');
    
    for (const { file, importPath, importDecl, line } of unresolvedImports) {
      const resolved = await this.resolveImport(importPath, file);
      
      if (resolved) {
        const newPath = this.calculateRelativePath(file, resolved);
        
        try {
          importDecl.setModuleSpecifier(newPath);
          
          this.rewrites.push({
            file,
            line,
            oldPath: importPath,
            newPath,
            resolved
          });
          
          console.log(`✅ ${file}:${line} ${importPath} → ${newPath}`);
        } catch (error) {
          console.warn(`⚠️  Could not rewrite import in ${file}:${line}: ${error.message}`);
        }
      } else {
        console.log(`❌ No resolution found for ${file}:${line} ${importPath}`);
      }
    }
  }

  calculateRelativePath(fromFile, toFile) {
    const fromDir = dirname(fromFile);
    const relativePath = relative(fromDir, toFile);
    
    // Ensure relative path starts with ./
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  }

  async runLinting() {
    console.log('🔧 Running linting and type checking...');
    
    try {
      // Run ESLint
      const { execSync } = await import('child_process');
      execSync('npx eslint --fix src/', { cwd: this.rootDir, stdio: 'pipe' });
      console.log('✅ ESLint fixes applied');
    } catch (error) {
      console.warn(`⚠️  ESLint had issues: ${error.message}`);
    }
    
    try {
      // Run TypeScript check
      const { execSync } = await import('child_process');
      execSync('npx tsc --noEmit', { cwd: this.rootDir, stdio: 'pipe' });
      console.log('✅ TypeScript check passed');
    } catch (error) {
      console.warn(`⚠️  TypeScript check had issues: ${error.message}`);
    }
  }

  generateDiffSummary() {
    console.log('\n📊 Import Resolution Summary');
    console.log('='.repeat(50));
    
    if (this.rewrites.length === 0) {
      console.log('No imports were rewritten.');
      return;
    }
    
    console.log(`Total rewrites: ${this.rewrites.length}`);
    console.log('\nRewrites by file:');
    
    const byFile = new Map();
    for (const rewrite of this.rewrites) {
      if (!byFile.has(rewrite.file)) {
        byFile.set(rewrite.file, []);
      }
      byFile.get(rewrite.file).push(rewrite);
    }
    
    for (const [file, rewrites] of byFile) {
      console.log(`\n${file}:`);
      for (const rewrite of rewrites) {
        console.log(`  Line ${rewrite.line}: ${rewrite.oldPath} → ${rewrite.newPath}`);
      }
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      totalRewrites: this.rewrites.length,
      rewrites: this.rewrites,
      summary: {
        byFile: Object.fromEntries(byFile)
      }
    };
    
    writeFileSync(
      join(this.rootDir, '.om', 'import-resolution-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📄 Detailed report saved to .om/import-resolution-report.json`);
  }

  async run() {
    console.log('🚀 Starting Import Resolution System');
    console.log('='.repeat(50));
    
    try {
      // Ensure .om directory exists
      const { mkdirSync } = await import('fs');
      mkdirSync(join(this.rootDir, '.om'), { recursive: true });
      
      await this.buildFileIndex();
      this.loadTsconfigPaths();
      
      const unresolvedImports = await this.findUnresolvedImports();
      
      if (unresolvedImports.length === 0) {
        console.log('✅ No unresolved imports found!');
        return;
      }
      
      await this.rewriteImports(unresolvedImports);
      await this.runLinting();
      this.generateDiffSummary();
      
      console.log('\n🎉 Import resolution completed!');
      
    } catch (error) {
      console.error('❌ Error during import resolution:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Import Resolution System');
  const resolver = new ImportResolver();
  resolver.run().catch(console.error);
}

export default ImportResolver;
