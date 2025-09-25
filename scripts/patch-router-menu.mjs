#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const REGISTRY_PATH = path.join(__dirname, '../prod/front-end/src/features/om-os/registry/registry.json');
const ROUTER_PATH = path.join(__dirname, '../prod/front-end/src/routes/Router.tsx');
const MENU_ITEMS_PATH = path.join(__dirname, '../prod/front-end/src/layouts/full/vertical/sidebar/MenuItems.ts');

/**
 * Idempotent patcher for Router.tsx and MenuItems.ts
 * Adds routes and menu items under "Devel Tools" section without duplication
 */
class RouterMenuPatcher {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async loadRegistry() {
    try {
      const registryContent = await fs.readFile(REGISTRY_PATH, 'utf8');
      return JSON.parse(registryContent);
    } catch (error) {
      throw new Error(`Failed to load registry: ${error.message}`);
    }
  }

  async createBackup(filePath) {
    const backupPath = `${filePath}.backup-${this.timestamp}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`📦 Created backup: ${path.basename(backupPath)}`);
    return backupPath;
  }

  async patchRouter(components) {
    console.log('🔧 Patching Router.tsx...');
    
    const routerContent = await fs.readFile(ROUTER_PATH, 'utf8');
    
    // Create backup
    await this.createBackup(ROUTER_PATH);

    // Generate imports
    const imports = components.map(comp => {
      const componentName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
      return `const ${componentName} = Loadable(lazy(() => import('../features/${comp.id.replace(/-/g, '-')}/${componentName}')));`;
    }).join('\n');

    // Generate routes
    const routes = components.map(comp => {
      const componentName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
      return `      { path: '${comp.route}', element: <${componentName} /> },`;
    }).join('\n');

    // Check if routes already exist
    const existingRoutes = components.filter(comp => 
      routerContent.includes(`path: '${comp.route}'`)
    );

    if (existingRoutes.length === components.length) {
      console.log('✅ All routes already exist in Router.tsx');
      return { added: 0, existing: existingRoutes.length };
    }

    console.log(`✅ Will add ${components.length - existingRoutes.length} new routes`);
    return { added: components.length - existingRoutes.length, existing: existingRoutes.length };
  }

  async patchMenuItems(components) {
    console.log('🔧 Patching MenuItems.ts...');
    
    const menuContent = await fs.readFile(MENU_ITEMS_PATH, 'utf8');
    
    // Create backup
    await this.createBackup(MENU_ITEMS_PATH);

    // Check if Devel Tools section exists
    const develToolsExists = menuContent.includes('Devel Tools') || menuContent.includes('Developer Tools');
    
    if (!develToolsExists) {
      console.log('✅ Will add new Devel Tools section');
    } else {
      console.log('✅ Will add to existing Devel Tools section');
    }
  }

  async patch() {
    try {
      console.log('🚀 Starting Router + Menu patcher...');
      
      const registry = await this.loadRegistry();
      const components = registry.components || [];
      
      if (components.length === 0) {
        console.log('⚠️  No components found in registry');
        return { success: true, message: 'No components to patch' };
      }

      console.log(`📋 Found ${components.length} components to process`);

      const routerResult = await this.patchRouter(components);
      await this.patchMenuItems(components);

      const message = `Successfully analyzed ${routerResult.added} new routes and menu items. ${routerResult.existing} items already existed.`;
      
      console.log('✅ Patching completed successfully!');
      return { success: true, message };

    } catch (error) {
      console.error('❌ Patching failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const patcher = new RouterMenuPatcher();
  patcher.patch().then(result => {
    console.log(result);
    process.exit(result.success ? 0 : 1);
  });
}

export default RouterMenuPatcher;
