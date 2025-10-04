#!/usr/bin/env node

/**
 * Check for circular dependencies in the codebase
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

class CircularDependencyChecker {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.srcDir = join(rootDir, 'src');
    this.dependencies = new Map();
    this.visited = new Set();
    this.recursionStack = new Set();
  }

  async check() {
    console.log('🔍 Checking for circular dependencies...');
    
    // Get all source files
    const files = await glob('src/**/*.{ts,tsx,js,jsx}', { cwd: this.rootDir });
    
    // Build dependency graph
    for (const file of files) {
      this.dependencies.set(file, this.getImports(file));
    }
    
    // Check for cycles
    const cycles = [];
    for (const file of files) {
      const cycle = this.findCycle(file, []);
      if (cycle) {
        cycles.push(cycle);
      }
    }
    
    if (cycles.length > 0) {
      console.log('❌ Found circular dependencies:');
      cycles.forEach((cycle, index) => {
        console.log(`\nCycle ${index + 1}:`);
        cycle.forEach((file, i) => {
          console.log(`  ${i + 1}. ${file}`);
        });
      });
    } else {
      console.log('✅ No circular dependencies found');
    }
    
    return cycles;
  }

  getImports(file) {
    const fullPath = join(this.rootDir, file);
    if (!existsSync(fullPath)) return [];
    
    const content = readFileSync(fullPath, 'utf8');
    const imports = [];
    
    // Find import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip external dependencies
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        continue;
      }
      
      // Resolve import path
      const resolvedPath = this.resolveImportPath(importPath, file);
      if (resolvedPath) {
        imports.push(resolvedPath);
      }
    }
    
    return imports;
  }

  resolveImportPath(importPath, fromFile) {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    
    if (importPath.startsWith('@/')) {
      return importPath.replace('@/', 'src/');
    }
    
    if (importPath.startsWith('.')) {
      const resolved = this.resolveRelativePath(importPath, fromDir);
      return resolved;
    }
    
    return null;
  }

  resolveRelativePath(importPath, fromDir) {
    const parts = importPath.split('/');
    let currentDir = fromDir;
    
    for (const part of parts) {
      if (part === '..') {
        currentDir = currentDir.substring(0, currentDir.lastIndexOf('/'));
      } else if (part !== '.') {
        currentDir = currentDir + '/' + part;
      }
    }
    
    // Try with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    
    for (const ext of extensions) {
      const candidate = currentDir + ext;
      if (this.dependencies.has(candidate)) {
        return candidate;
      }
    }
    
    return currentDir;
  }

  findCycle(file, path) {
    if (this.recursionStack.has(file)) {
      const cycleStart = path.indexOf(file);
      return path.slice(cycleStart).concat([file]);
    }
    
    if (this.visited.has(file)) {
      return null;
    }
    
    this.visited.add(file);
    this.recursionStack.add(file);
    
    const imports = this.dependencies.get(file) || [];
    for (const importFile of imports) {
      const cycle = this.findCycle(importFile, [...path, file]);
      if (cycle) {
        return cycle;
      }
    }
    
    this.recursionStack.delete(file);
    return null;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new CircularDependencyChecker();
  checker.check().catch(console.error);
}

export default CircularDependencyChecker;
