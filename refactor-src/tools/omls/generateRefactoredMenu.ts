#!/usr/bin/env tsx

/**
 * Component Validator & Superadmin Menu Refresher
 * 
 * This script:
 * 1. Scans the entire frontend for components
 * 2. Identifies duplicate component names
 * 3. Generates a REFACTORED menu hierarchy for superadmins
 * 4. Updates the menu configuration
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ComponentInfo {
  name: string;
  path: string;
  relativePath: string;
  isDuplicate: boolean;
  duplicateIndex?: number;
  previewPath?: string;
}

interface MenuItem {
  label: string;
  path: string;
  section: string;
  roles?: string[];
  hidden?: boolean;
  children?: MenuItem[];
}

interface ScanOptions {
  dryRun?: boolean;
  verbose?: boolean;
  outputFile?: string;
}

class ComponentValidator {
  private projectRoot: string;
  private components: ComponentInfo[] = [];
  private duplicates: Map<string, ComponentInfo[]> = new Map();
  private excludedDirs: string[] = [
    'node_modules',
    'dist',
    '.cache',
    'test/fixtures',
    '__tests__',
    'stories',
    'mock',
    'test-utils'
  ];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check if a path should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    return this.excludedDirs.some(dir => filePath.includes(dir));
  }

  /**
   * Extract component name from filename
   */
  private extractComponentName(filename: string): string {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(tsx|jsx|ts|js)$/, '');
    
    // Handle special cases
    if (nameWithoutExt.includes('.')) {
      return nameWithoutExt.split('.')[0];
    }
    
    return nameWithoutExt;
  }

  /**
   * Generate preview path for component
   */
  private generatePreviewPath(componentPath: string): string | undefined {
    const relativePath = path.relative(this.projectRoot, componentPath);
    
    // Try to find a preview/test page
    const dir = path.dirname(componentPath);
    const possiblePreviewFiles = [
      'preview.tsx',
      'Preview.tsx',
      'test.tsx',
      'Test.tsx',
      'demo.tsx',
      'Demo.tsx',
      'example.tsx',
      'Example.tsx'
    ];

    for (const previewFile of possiblePreviewFiles) {
      const previewPath = path.join(dir, previewFile);
      if (fs.existsSync(previewPath)) {
        const relativePreviewPath = path.relative(this.projectRoot, previewPath);
        return `/${relativePreviewPath.replace(/\\/g, '/').replace(/\.(tsx|jsx|ts|js)$/, '')}`;
      }
    }

    // If no preview file found, try to create a generic preview route
    const componentName = path.basename(componentPath, path.extname(componentPath));
    return `/preview/${componentName}`;
  }

  /**
   * Scan for components recursively
   */
  async scanComponents(): Promise<ComponentInfo[]> {
    console.log('🔍 Scanning for components...');
    
    const componentPatterns = [
      '**/components/**/*.tsx',
      '**/components/**/*.jsx',
      '**/components/**/*.ts',
      '**/components/**/*.js'
    ];

    const allFiles: string[] = [];
    
    for (const pattern of componentPatterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: this.excludedDirs.map(dir => `**/${dir}/**`)
      });
      allFiles.push(...files);
    }

    console.log(`📁 Found ${allFiles.length} potential component files`);

    // Process each file
    for (const filePath of allFiles) {
      if (this.shouldExclude(filePath)) {
        continue;
      }

      const filename = path.basename(filePath);
      const componentName = this.extractComponentName(filename);
      const relativePath = path.relative(this.projectRoot, filePath);
      const previewPath = this.generatePreviewPath(filePath);

      const componentInfo: ComponentInfo = {
        name: componentName,
        path: filePath,
        relativePath,
        isDuplicate: false,
        previewPath
      };

      this.components.push(componentInfo);
    }

    // Identify duplicates
    this.identifyDuplicates();
    
    console.log(`✅ Scan complete. Found ${this.components.length} components`);
    return this.components;
  }

  /**
   * Identify duplicate component names
   */
  private identifyDuplicates(): void {
    const nameMap = new Map<string, ComponentInfo[]>();

    // Group by component name
    for (const component of this.components) {
      if (!nameMap.has(component.name)) {
        nameMap.set(component.name, []);
      }
      nameMap.get(component.name)!.push(component);
    }

    // Process duplicates
    for (const [name, components] of nameMap) {
      if (components.length > 1) {
        this.duplicates.set(name, components);
        
        // Mark as duplicates and assign indices
        components.forEach((component, index) => {
          component.isDuplicate = true;
          component.duplicateIndex = index + 1;
        });

        console.log(`⚠️  Found duplicate: ${name} (${components.length} instances)`);
      }
    }

    const duplicateCount = this.duplicates.size;
    if (duplicateCount > 0) {
      console.log(`⚠️  Total duplicates found: ${duplicateCount}`);
    } else {
      console.log('✅ No duplicate component names found');
    }
  }

  /**
   * Generate menu structure for components
   */
  generateMenuStructure(): MenuItem[] {
    console.log('🗂️  Generating menu structure...');

    const menuItems: MenuItem[] = [];
    
    // Group components by directory
    const componentGroups = new Map<string, ComponentInfo[]>();
    
    for (const component of this.components) {
      const dir = path.dirname(component.relativePath);
      if (!componentGroups.has(dir)) {
        componentGroups.set(dir, []);
      }
      componentGroups.get(dir)!.push(component);
    }

    // Create menu items
    for (const [dir, components] of componentGroups) {
      const dirName = path.basename(dir);
      const displayName = this.formatDisplayName(dirName);
      
      const menuItem: MenuItem = {
        label: displayName,
        path: `#${dir}`,
        section: 'refactored',
        roles: ['super_admin'],
        hidden: false,
        children: []
      };

      // Add components as children
      for (const component of components) {
        const displayLabel = component.isDuplicate 
          ? `${component.name}_dup${component.duplicateIndex}`
          : component.name;

        const childItem: MenuItem = {
          label: displayLabel,
          path: component.previewPath || `#${component.relativePath}`,
          section: 'refactored',
          roles: ['super_admin'],
          hidden: false
        };

        menuItem.children!.push(childItem);
      }

      menuItems.push(menuItem);
    }

    console.log(`✅ Generated menu structure with ${menuItems.length} groups`);
    return menuItems;
  }

  /**
   * Format display name for menu
   */
  private formatDisplayName(dirName: string): string {
    return dirName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Update menu configuration
   */
  async updateMenuConfig(menuItems: MenuItem[], options: ScanOptions = {}): Promise<void> {
    const menuConfigPath = path.join(this.projectRoot, 'src', 'menuConfig.ts');
    
    if (!fs.existsSync(menuConfigPath)) {
      console.log('⚠️  menuConfig.ts not found, creating new file...');
      await this.createNewMenuConfig(menuItems);
      return;
    }

    console.log('📝 Updating existing menu configuration...');
    
    let menuConfigContent = fs.readFileSync(menuConfigPath, 'utf-8');
    
    // Remove old REFACTORED section
    const oldRefactoredRegex = /\/\/\s*REFACTORED\s*SECTION\s*START[\s\S]*?\/\/\s*REFACTORED\s*SECTION\s*END/g;
    menuConfigContent = menuConfigContent.replace(oldRefactoredRegex, '');

    // Add new REFACTORED section
    const refactoredSection = this.generateRefactoredSection(menuItems);
    
    // Insert before the last export
    const lastExportIndex = menuConfigContent.lastIndexOf('export');
    if (lastExportIndex !== -1) {
      const beforeExport = menuConfigContent.substring(0, lastExportIndex);
      const afterExport = menuConfigContent.substring(lastExportIndex);
      menuConfigContent = beforeExport + refactoredSection + '\n\n' + afterExport;
    } else {
      menuConfigContent += '\n\n' + refactoredSection;
    }

    if (!options.dryRun) {
      fs.writeFileSync(menuConfigPath, menuConfigContent, 'utf-8');
      console.log('✅ Menu configuration updated successfully');
    } else {
      console.log('🔍 DRY RUN: Menu configuration would be updated');
    }
  }

  /**
   * Create new menu configuration file
   */
  private async createNewMenuConfig(menuItems: MenuItem[]): Promise<void> {
    const refactoredSection = this.generateRefactoredSection(menuItems);
    
    const newMenuConfig = `// Menu configuration
export const menuConfig = [
  {
    label: "Dashboard",
    path: "/dashboard",
    section: "main",
  },
  {
    label: "Tools",
    path: "/tools",
    section: "tools",
  },
  {
    label: "Assign Task",
    path: "/assign-task",
    section: "tools",
    roles: ["user"],
    hidden: false,
  },
  {
    label: "Assign Task",
    path: "/assign-task",
    section: "tools",
    roles: ["super_admin"],
    hidden: false,
  },
${refactoredSection}
];

export default menuConfig;
`;

    const menuConfigPath = path.join(this.projectRoot, 'src', 'menuConfig.ts');
    fs.writeFileSync(menuConfigPath, newMenuConfig, 'utf-8');
    console.log('✅ New menu configuration file created');
  }

  /**
   * Generate REFACTORED section for menu config
   */
  private generateRefactoredSection(menuItems: MenuItem[]): string {
    let section = '  // REFACTORED SECTION START\n';
    section += '  // Auto-generated component menu for superadmins\n';
    
    for (const item of menuItems) {
      section += this.generateMenuItemString(item, 2);
    }
    
    section += '  // REFACTORED SECTION END';
    return section;
  }

  /**
   * Generate menu item string representation
   */
  private generateMenuItemString(item: MenuItem, indent: number): string {
    const spaces = ' '.repeat(indent);
    let result = `${spaces}{\n`;
    result += `${spaces}  label: "${item.label}",\n`;
    result += `${spaces}  path: "${item.path}",\n`;
    result += `${spaces}  section: "${item.section}",\n`;
    
    if (item.roles) {
      result += `${spaces}  roles: [${item.roles.map(r => `"${r}"`).join(', ')}],\n`;
    }
    
    if (item.hidden !== undefined) {
      result += `${spaces}  hidden: ${item.hidden},\n`;
    }
    
    if (item.children && item.children.length > 0) {
      result += `${spaces}  children: [\n`;
      for (const child of item.children) {
        result += this.generateMenuItemString(child, indent + 4);
      }
      result += `${spaces}  ],\n`;
    }
    
    result += `${spaces}},\n`;
    return result;
  }

  /**
   * Save component list to JSON file
   */
  async saveComponentList(options: ScanOptions = {}): Promise<void> {
    if (!options.outputFile) {
      options.outputFile = 'omls/component-list.json';
    }

    const outputPath = path.join(this.projectRoot, options.outputFile);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const componentData = {
      scanDate: new Date().toISOString(),
      totalComponents: this.components.length,
      duplicateCount: this.duplicates.size,
      components: this.components,
      duplicates: Object.fromEntries(this.duplicates),
      menuStructure: this.generateMenuStructure()
    };

    if (!options.dryRun) {
      fs.writeFileSync(outputPath, JSON.stringify(componentData, null, 2), 'utf-8');
      console.log(`💾 Component list saved to ${options.outputFile}`);
    } else {
      console.log(`🔍 DRY RUN: Component list would be saved to ${options.outputFile}`);
    }
  }

  /**
   * Print scan summary
   */
  printSummary(): void {
    console.log('\n📊 SCAN SUMMARY');
    console.log('================');
    console.log(`Total Components: ${this.components.length}`);
    console.log(`Duplicate Names: ${this.duplicates.size}`);
    
    if (this.duplicates.size > 0) {
      console.log('\n⚠️  DUPLICATE COMPONENTS:');
      for (const [name, components] of this.duplicates) {
        console.log(`  ${name}:`);
        components.forEach(comp => {
          console.log(`    - ${comp.relativePath}`);
        });
      }
    }

    console.log('\n🗂️  COMPONENT GROUPS:');
    const groups = new Map<string, number>();
    for (const component of this.components) {
      const dir = path.dirname(component.relativePath);
      groups.set(dir, (groups.get(dir) || 0) + 1);
    }
    
    for (const [dir, count] of groups) {
      console.log(`  ${dir}: ${count} components`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const options: ScanOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1]
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Component Validator & Superadmin Menu Refresher

Usage: tsx generateRefactoredMenu.ts [options]

Options:
  --dry-run          Show what would be changed without making changes
  --verbose          Show detailed output
  --output=FILE      Specify output file for component list (default: omls/component-list.json)
  --help, -h         Show this help message

Examples:
  tsx generateRefactoredMenu.ts
  tsx generateRefactoredMenu.ts --dry-run --verbose
  tsx generateRefactoredMenu.ts --output=components.json
`);
    return;
  }

  try {
    const projectRoot = process.cwd();
    console.log(`🚀 Starting component validation in: ${projectRoot}`);
    
    const validator = new ComponentValidator(projectRoot);
    
    // Scan for components
    await validator.scanComponents();
    
    // Generate menu structure
    const menuItems = validator.generateMenuStructure();
    
    // Update menu configuration
    await validator.updateMenuConfig(menuItems, options);
    
    // Save component list
    await validator.saveComponentList(options);
    
    // Print summary
    validator.printSummary();
    
    console.log('\n🎉 Component validation complete!');
    
    if (options.dryRun) {
      console.log('🔍 This was a dry run. No files were modified.');
    } else {
      console.log('✅ Files have been updated. Restart your application to see changes.');
    }
    
  } catch (error) {
    console.error('❌ Error during component validation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { ComponentValidator, ComponentInfo, MenuItem, ScanOptions };
