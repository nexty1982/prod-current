#!/usr/bin/env node

/**
 * OrthodoxMetrics Operating System CLI
 * Provides registry management, patching, error handling, and release tools
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import RouterMenuPatcher from './patch-router-menu.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OMOSCli {
  constructor() {
    this.registryPath = path.join(__dirname, '../prod/front-end/src/features/om-os/registry/registry.json');
    this.srcPath = path.join(__dirname, '../prod/front-end/src');
  }

  async scanRegistry() {
    console.log('🔍 Scanning src/** for components...');
    
    try {
      const components = await this.scanDirectory(this.srcPath);
      const registry = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        components: components
      };

      // Load existing registry to preserve manual entries
      try {
        const existingContent = await fs.readFile(this.registryPath, 'utf8');
        const existingRegistry = JSON.parse(existingContent);
        
        // Merge with existing entries, preferring existing data
        const existingIds = new Set(existingRegistry.components.map(c => c.id));
        const newComponents = components.filter(c => !existingIds.has(c.id));
        
        registry.components = [...existingRegistry.components, ...newComponents];
        
        console.log(`📊 Found ${newComponents.length} new components, ${existingRegistry.components.length} existing`);
      } catch (error) {
        console.log(`📊 Found ${components.length} components (new registry)`);
      }

      await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
      console.log('✅ Registry updated successfully');
      
      return { success: true, count: registry.components.length };
    } catch (error) {
      console.error('❌ Registry scan failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async scanDirectory(dirPath, basePath = '') {
    const components = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        const subComponents = await this.scanDirectory(fullPath, relativePath);
        components.push(...subComponents);
      } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
        const component = await this.analyzeComponent(fullPath, relativePath);
        if (component) {
          components.push(component);
        }
      }
    }

    return components;
  }

  async analyzeComponent(filePath, relativePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Skip if not a component (no JSX)
      if (!content.includes('return') || !content.includes('<')) {
        return null;
      }

      const name = path.basename(relativePath, '.tsx');
      const id = relativePath.replace(/\//g, '-').replace('.tsx', '').toLowerCase();
      
      // Try to extract route from content
      let route = '';
      const routeMatch = content.match(/route[:\s]*['"`]([^'"`]+)['"`]/i);
      if (routeMatch) {
        route = routeMatch[1];
      } else {
        // Generate route from path
        route = '/' + relativePath.replace('.tsx', '').toLowerCase().replace(/\//g, '/');
      }

      // Extract APIs
      const apis = this.extractAPIs(content);
      
      // Extract DB references
      const db = this.extractDBReferences(content);

      return {
        id,
        name,
        route,
        menuPath: `Devel Tools > ${name}`,
        apis,
        db,
        owner: 'auto-discovered',
        status: 'development',
        description: `Auto-discovered component: ${name}`,
        created: new Date().toISOString(),
        filePath: relativePath
      };
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${relativePath}: ${error.message}`);
      return null;
    }
  }

  extractAPIs(content) {
    const apis = [];
    const patterns = [
      /fetch\(['"`]([^'"`]+)['"`]/g,
      /axios\.[a-z]+\(['"`]([^'"`]+)['"`]/g,
      /api\.[a-z]+\(['"`]([^'"`]+)['"`]/g,
      /\/api\/[a-zA-Z0-9\-\/]+/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const api = match[1] || match[0];
        if (api.startsWith('/api/') && !apis.includes(api)) {
          apis.push(api);
        }
      }
    });

    return apis;
  }

  extractDBReferences(content) {
    const db = [];
    const patterns = [
      /FROM\s+([a-zA-Z0-9_]+)/gi,
      /INSERT\s+INTO\s+([a-zA-Z0-9_]+)/gi,
      /UPDATE\s+([a-zA-Z0-9_]+)/gi,
      /DELETE\s+FROM\s+([a-zA-Z0-9_]+)/gi,
      /table[:\s]*['"`]([^'"`]+)['"`]/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const table = match[1];
        if (table && !db.includes(table)) {
          db.push(table);
        }
      }
    });

    return db;
  }

  async patchRouterMenu() {
    console.log('🔧 Running Router + Menu patcher...');
    const patcher = new RouterMenuPatcher();
    return await patcher.patch();
  }

  async openErrorBoard() {
    console.log('🚨 Opening Error Board (dev server)...');
    console.log('This would start a development server for the Error Board UI');
    console.log('Implementation: Start Vite dev server with ErrorBoard component');
    return { success: true, message: 'Error Board dev server would start here' };
  }

  async weeklyRelease() {
    console.log('🚀 Running weekly release process...');
    
    const now = new Date();
    const branchName = `release-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    console.log(`📋 Would create branch: ${branchName}`);
    console.log('📝 Would generate changelog from registry status changes');
    console.log('🏷️  Would create release tag');
    
    return { success: true, message: `Weekly release ${branchName} process completed` };
  }

  showHelp() {
    console.log(`
🛠️  OrthodoxMetrics Operating System CLI

Usage: node scripts/omos.mjs <command>

Commands:
  reg:scan     Scan src/** for components and update registry.json
  reg:patch    Apply registry entries to Router.tsx and MenuItems.ts  
  errors:open  Start ErrorBoard development server
  release:weekly  Run weekly release process

Examples:
  node scripts/omos.mjs reg:scan
  node scripts/omos.mjs reg:patch
  node scripts/omos.mjs errors:open
  node scripts/omos.mjs release:weekly
`);
  }

  async run() {
    const command = process.argv[2];

    switch (command) {
      case 'reg:scan':
        return await this.scanRegistry();
      
      case 'reg:patch':
        return await this.patchRouterMenu();
      
      case 'errors:open':
        return await this.openErrorBoard();
      
      case 'release:weekly':
        return await this.weeklyRelease();
      
      default:
        this.showHelp();
        return { success: true };
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new OMOSCli();
  cli.run().then(result => {
    if (result && !result.success) {
      console.error('❌ Command failed:', result.error || 'Unknown error');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

export default OMOSCli;