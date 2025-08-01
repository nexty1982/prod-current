#!/usr/bin/env node

/**
 * Component Manifest Generator for OrthodoxMetrics
 * 
 * Scans the codebase to automatically discover components and generate
 * a comprehensive component manifest for the admin panel.
 * 
 * Usage: node scripts/generateComponentManifest.js
 * Or via npm: npm run generate-manifest
 */

const fs = require('fs').promises;
const path = require('path');

class ComponentManifestGenerator {
  constructor() {
    this.manifestPath = path.join(__dirname, '../server/data/componentManifest.json');
    this.scanPaths = [
      {
        path: 'front-end/src/components',
        type: 'frontend-component',
        category: 'frontend'
      },
      {
        path: 'front-end/src/views/apps',
        type: 'frontend-app',
        category: 'application'
      },
      {
        path: 'server/routes',
        type: 'backend-route',
        category: 'backend'
      }
    ];
    this.discoveredComponents = [];
  }

  /**
   * Main execution function
   */
  async generate() {
    console.log('🔍 Starting component discovery...');
    
    try {
      // Scan all configured paths
      for (const scanConfig of this.scanPaths) {
        await this.scanDirectory(scanConfig);
      }

      // Generate the manifest
      const manifest = await this.buildManifest();
      
      // Save to file
      await this.saveManifest(manifest);
      
      // Update documentation
      await this.updateDocumentation();
      
      console.log('✅ Component manifest generated successfully!');
      console.log(`📄 Found ${this.discoveredComponents.length} components`);
      console.log(`💾 Saved to: ${this.manifestPath}`);
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Error generating component manifest:', error);
      process.exit(1);
    }
  }

  /**
   * Scan a directory for components
   */
  async scanDirectory(scanConfig) {
    const fullPath = path.join(process.cwd(), scanConfig.path);
    
    try {
      const exists = await this.pathExists(fullPath);
      if (!exists) {
        console.log(`⚠️  Directory not found: ${scanConfig.path}`);
        return;
      }

      console.log(`🔎 Scanning: ${scanConfig.path}`);
      await this.recursiveScan(fullPath, scanConfig);
      
    } catch (error) {
      console.warn(`⚠️  Error scanning ${scanConfig.path}:`, error.message);
    }
  }

  /**
   * Recursively scan directories
   */
  async recursiveScan(dirPath, scanConfig, relativePath = '') {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const currentRelativePath = path.join(relativePath, item.name);
        
        if (item.isDirectory()) {
          // Check if this directory represents a component
          const componentInfo = await this.analyzeComponent(itemPath, currentRelativePath, scanConfig);
          if (componentInfo) {
            this.discoveredComponents.push(componentInfo);
          }
          
          // Continue recursive scanning (skip node_modules and hidden dirs)
          if (!item.name.startsWith('.') && item.name !== 'node_modules') {
            await this.recursiveScan(itemPath, scanConfig, currentRelativePath);
          }
        } else if (item.isFile()) {
          // Check if this file represents a component
          const componentInfo = await this.analyzeFileComponent(itemPath, currentRelativePath, scanConfig);
          if (componentInfo) {
            this.discoveredComponents.push(componentInfo);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error scanning directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Analyze a directory to see if it's a component
   */
  async analyzeComponent(dirPath, relativePath, scanConfig) {
    try {
      const files = await fs.readdir(dirPath);
      
      // Look for index files
      const indexFiles = files.filter(file => 
        /^index\.(tsx|ts|js|jsx)$/.test(file)
      );
      
      // Look for component.meta.json
      const hasMetaFile = files.includes('component.meta.json');
      
      if (indexFiles.length > 0 || hasMetaFile) {
        let componentInfo = {
          id: this.slugify(path.basename(dirPath)),
          name: this.formatName(path.basename(dirPath)),
          type: scanConfig.type,
          category: scanConfig.category,
          path: relativePath,
          discovered: new Date().toISOString()
        };

        // Load meta file if it exists
        if (hasMetaFile) {
          const metaInfo = await this.loadMetaFile(path.join(dirPath, 'component.meta.json'));
          componentInfo = { ...componentInfo, ...metaInfo };
        }

        // Analyze the main file for additional info
        if (indexFiles.length > 0) {
          const mainFile = path.join(dirPath, indexFiles[0]);
          const fileInfo = await this.analyzeFile(mainFile, scanConfig);
          componentInfo = { ...componentInfo, ...fileInfo };
        }

        return this.enrichComponentInfo(componentInfo, scanConfig);
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️  Error analyzing component ${dirPath}:`, error.message);
      return null;
    }
  }

  /**
   * Analyze a standalone file as a component
   */
  async analyzeFileComponent(filePath, relativePath, scanConfig) {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(fileName);
    const baseName = path.basename(fileName, fileExt);
    
    // Check if this is a component file
    if (this.isComponentFile(fileName, scanConfig)) {
      try {
        const componentInfo = {
          id: this.slugify(baseName),
          name: this.formatName(baseName),
          type: scanConfig.type,
          category: scanConfig.category,
          path: relativePath,
          discovered: new Date().toISOString()
        };

        const fileInfo = await this.analyzeFile(filePath, scanConfig);
        const enrichedInfo = { ...componentInfo, ...fileInfo };
        
        return this.enrichComponentInfo(enrichedInfo, scanConfig);
      } catch (error) {
        console.warn(`⚠️  Error analyzing file ${filePath}:`, error.message);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Check if a file is a component file
   */
  isComponentFile(fileName, scanConfig) {
    if (scanConfig.type === 'backend-route') {
      return /\.js$/.test(fileName) && !fileName.includes('.test.') && !fileName.includes('.spec.');
    } else {
      return /\.(tsx|ts|jsx)$/.test(fileName) && 
             !fileName.includes('.test.') && 
             !fileName.includes('.spec.') &&
             !fileName.includes('.stories.');
    }
  }

  /**
   * Analyze a file for component information
   */
  async analyzeFile(filePath, scanConfig) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileInfo = {
        fileType: path.extname(filePath),
        fileSize: content.length
      };

      // Extract dependencies from imports
      const dependencies = this.extractDependencies(content, scanConfig);
      if (dependencies.length > 0) {
        fileInfo.dependencies = dependencies;
      }

      // Extract version if available
      const version = this.extractVersion(content);
      if (version) {
        fileInfo.version = version;
      }

      // Extract description from comments
      const description = this.extractDescription(content);
      if (description) {
        fileInfo.description = description;
      }

      // Extract ports for backend routes
      if (scanConfig.type === 'backend-route') {
        const ports = this.extractPorts(content);
        if (ports.length > 0) {
          fileInfo.ports = ports;
        }
      }

      return fileInfo;
    } catch (error) {
      console.warn(`⚠️  Error analyzing file ${filePath}:`, error.message);
      return {};
    }
  }

  /**
   * Extract dependencies from file content
   */
  extractDependencies(content, scanConfig) {
    const dependencies = [];
    
    if (scanConfig.type === 'backend-route') {
      // Extract require statements
      const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g);
      if (requireMatches) {
        requireMatches.forEach(match => {
          const dep = match.match(/require\(['"`]([^'"`]+)['"`]\)/)?.[1];
          if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
            dependencies.push(dep);
          }
        });
      }
    } else {
      // Extract import statements
      const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const dep = match.match(/from\s+['"`]([^'"`]+)['"`]/)?.[1];
          if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
            dependencies.push(dep);
          }
        });
      }
    }
    
    return [...new Set(dependencies)].slice(0, 10); // Limit and dedupe
  }

  /**
   * Extract version information
   */
  extractVersion(content) {
    const versionMatches = content.match(/version['":\s]+['"`]([^'"`]+)['"`]/i);
    if (versionMatches) {
      return versionMatches[1];
    }
    
    const commentVersionMatches = content.match(/@version\s+([^\s\n]+)/i);
    if (commentVersionMatches) {
      return commentVersionMatches[1];
    }
    
    return null;
  }

  /**
   * Extract description from comments
   */
  extractDescription(content) {
    // Look for JSDoc description
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^@\n]*)/);
    if (jsdocMatch) {
      return jsdocMatch[1].trim();
    }
    
    // Look for comment at top of file
    const commentMatch = content.match(/^\/\*\*?\s*\n?\s*\*?\s*([^\n*]+)/);
    if (commentMatch) {
      return commentMatch[1].trim();
    }
    
    return null;
  }

  /**
   * Extract port numbers from backend routes
   */
  extractPorts(content) {
    const ports = [];
    const portMatches = content.match(/(?:port|PORT)['":\s]*(\d+)/g);
    
    if (portMatches) {
      portMatches.forEach(match => {
        const port = match.match(/(\d+)/)?.[1];
        if (port) {
          ports.push(parseInt(port));
        }
      });
    }
    
    return [...new Set(ports)];
  }

  /**
   * Load component.meta.json file
   */
  async loadMetaFile(metaPath) {
    try {
      const content = await fs.readFile(metaPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Error loading meta file ${metaPath}:`, error.message);
      return {};
    }
  }

  /**
   * Enrich component info with defaults and computed values
   */
  enrichComponentInfo(componentInfo, scanConfig) {
    const now = new Date().toISOString();
    
    const enriched = {
      id: componentInfo.id,
      name: componentInfo.name,
      description: componentInfo.description || `${componentInfo.name} component`,
      enabled: componentInfo.enabled !== undefined ? componentInfo.enabled : true,
      health: componentInfo.health || 'healthy',
      category: componentInfo.category,
      type: componentInfo.type,
      path: componentInfo.path,
      version: componentInfo.version || '1.0.0',
      lastUpdated: componentInfo.lastUpdated || now,
      lastHealthCheck: componentInfo.lastHealthCheck || now,
      discovered: componentInfo.discovered,
      ...componentInfo
    };

    // Add default dependencies if none found
    if (!enriched.dependencies) {
      enriched.dependencies = this.getDefaultDependencies(scanConfig);
    }

    // Add default ports if none found
    if (!enriched.ports) {
      enriched.ports = this.getDefaultPorts(scanConfig);
    }

    return enriched;
  }

  /**
   * Get default dependencies based on component type
   */
  getDefaultDependencies(scanConfig) {
    switch (scanConfig.type) {
      case 'backend-route':
        return ['express'];
      case 'frontend-component':
        return ['react'];
      case 'frontend-app':
        return ['react', 'react-router'];
      default:
        return [];
    }
  }

  /**
   * Get default ports based on component type
   */
  getDefaultPorts(scanConfig) {
    switch (scanConfig.type) {
      case 'backend-route':
        return [3001];
      case 'frontend-component':
      case 'frontend-app':
        return [3000];
      default:
        return [];
    }
  }

  /**
   * Build the final manifest structure
   */
  async buildManifest() {
    // Sort components by category and name
    const sortedComponents = this.discoveredComponents.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    return sortedComponents;
  }

  /**
   * Save manifest to file
   */
  async saveManifest(manifest) {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.manifestPath), { recursive: true });
      
      // Write formatted JSON
      await fs.writeFile(
        this.manifestPath, 
        JSON.stringify(manifest, null, 2) + '\n'
      );
    } catch (error) {
      throw new Error(`Failed to save manifest: ${error.message}`);
    }
  }

  /**
   * Update documentation
   */
  async updateDocumentation() {
    const docPath = path.join(__dirname, '../server/docs/components-api.md');
    
    try {
      let content = await fs.readFile(docPath, 'utf8');
      
      // Add generation note if not already present
      const note = '\n## Manifest Generation\n\nComponent manifest is now generated via script. To update, run `npm run generate-manifest`.\n\n';
      
      if (!content.includes('Manifest Generation')) {
        // Insert after the overview section
        content = content.replace(
          '## Authentication',
          note + '## Authentication'
        );
        
        await fs.writeFile(docPath, content);
        console.log('📚 Updated documentation');
      }
    } catch (error) {
      console.warn('⚠️  Could not update documentation:', error.message);
    }
  }

  /**
   * Print summary of discovered components
   */
  printSummary() {
    const summary = {};
    
    this.discoveredComponents.forEach(component => {
      const key = `${component.category} (${component.type})`;
      summary[key] = (summary[key] || 0) + 1;
    });

    console.log('\n📊 Component Summary:');
    Object.entries(summary).forEach(([key, count]) => {
      console.log(`   ${key}: ${count} components`);
    });

    console.log('\n🔧 Discovered Components:');
    this.discoveredComponents
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(component => {
        const status = component.enabled ? '✅' : '❌';
        const health = component.health === 'healthy' ? '🟢' : 
                     component.health === 'degraded' ? '🟡' : '🔴';
        console.log(`   ${status} ${health} ${component.name} (${component.category})`);
      });
  }

  /**
   * Utility functions
   */
  slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  formatName(str) {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\.(tsx|ts|jsx|js)$/, '');
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const generator = new ComponentManifestGenerator();
  generator.generate().catch(console.error);
}

module.exports = ComponentManifestGenerator;