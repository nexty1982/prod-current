const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class ComponentDiscovery {
  constructor() {
    this.frontendRoot = path.join(process.cwd(), 'front-end', 'src');
    this.components = new Map();
    this.menuReferences = new Map();
    this.routeReferences = new Map();
    
    // Component categories based on functionality
    this.categories = {
      navigation: ['router', 'nav', 'menu', 'sidebar', 'header', 'footer', 'breadcrumb', 'tab'],
      data: ['table', 'list', 'grid', 'form', 'input', 'select', 'picker', 'upload'],
      display: ['card', 'modal', 'dialog', 'tooltip', 'badge', 'avatar', 'image', 'chart'],
      action: ['button', 'link', 'dropdown', 'toggle', 'switch', 'slider', 'progress']
    };
    
    // File extensions to scan
    this.componentExtensions = ['.tsx', '.jsx', '.ts', '.js', '.vue'];
  }

  /**
   * Main discovery method
   */
  async discoverAllComponents() {
    try {
      logger.info('Starting component discovery...');
      
      // Clear previous results
      this.components.clear();
      this.menuReferences.clear();
      this.routeReferences.clear();
      
      // Scan all directories
      await this.scanDirectory(this.frontendRoot);
      
      // Cross-reference with menu system
      await this.crossReferenceWithMenu();
      
      // Cross-reference with routes
      await this.crossReferenceWithRoutes();
      
      // Generate component metadata
      const discoveredComponents = await this.generateComponentMetadata();
      
      logger.info(`Discovery complete. Found ${discoveredComponents.length} components.`);
      
      return {
        components: discoveredComponents,
        summary: this.generateSummary(discoveredComponents),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Component discovery failed:', error);
      throw error;
    }
  }

  /**
   * Recursively scan directory for component files
   */
  async scanDirectory(dirPath, relativePath = '') {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip certain directories
          const skipDirs = ['node_modules', 'dist', 'build', '.git', 'logs'];
          if (!skipDirs.includes(entry.name)) {
            await this.scanDirectory(fullPath, relativeFilePath);
          }
        } else if (entry.isFile()) {
          const extension = path.extname(entry.name);
          if (this.componentExtensions.includes(extension)) {
            await this.analyzeComponentFile(fullPath, relativeFilePath);
          }
        }
      }
    } catch (error) {
      logger.warn(`Could not scan directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Analyze a single component file
   */
  async analyzeComponentFile(filePath, relativePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract components from the file
      const components = this.extractComponentsFromContent(content, filePath, relativePath);
      
      // Store discovered components
      for (const component of components) {
        this.components.set(component.name, component);
      }
    } catch (error) {
      logger.warn(`Could not analyze file ${filePath}:`, error.message);
    }
  }

  /**
   * Extract React components from file content
   */
  extractComponentsFromContent(content, filePath, relativePath) {
    const components = [];
    
    // Patterns to match different component definitions
    const patterns = [
      // Function components: export function ComponentName
      /export\s+function\s+([A-Z][a-zA-Z0-9_]*)\s*\(/g,
      // Arrow function components: export const ComponentName = 
      /export\s+const\s+([A-Z][a-zA-Z0-9_]*)\s*[:=]\s*(?:\([^)]*\)\s*)?=>/g,
      // Default exports: export default function ComponentName
      /export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]*)/g,
      // React.FC components: const ComponentName: React.FC
      /(?:const|let)\s+([A-Z][a-zA-Z0-9_]*)\s*:\s*React\.FC/g,
      // Class components: class ComponentName extends
      /class\s+([A-Z][a-zA-Z0-9_]*)\s+extends\s+(?:React\.)?Component/g,
      // React.Component: export class ComponentName
      /export\s+class\s+([A-Z][a-zA-Z0-9_]*)\s+extends/g,
      // Forwardref components
      /const\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*(?:React\.)?forwardRef/g
    ];
    
    const foundComponents = new Set();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const componentName = match[1];
        
        // Skip if already found or if it's not a valid component name
        if (foundComponents.has(componentName) || !this.isValidComponentName(componentName)) {
          continue;
        }
        
        foundComponents.add(componentName);
        
        const component = {
          name: componentName,
          filePath: filePath,
          relativePath: relativePath,
          directory: path.dirname(relativePath),
          extension: path.extname(filePath),
          category: this.categorizeComponent(componentName, relativePath, content),
          props: this.extractProps(content, componentName),
          imports: this.extractImports(content),
          exports: this.extractExports(content),
          isDefault: this.isDefaultExport(content, componentName),
          hasJSX: this.hasJSXContent(content),
          hasHooks: this.hasReactHooks(content),
          dependencies: this.extractDependencies(content),
          size: content.length,
          lines: content.split('\n').length,
          createdAt: new Date().toISOString()
        };
        
        components.push(component);
      }
    }
    
    return components;
  }

  /**
   * Check if component name is valid
   */
  isValidComponentName(name) {
    // Must start with capital letter and be reasonable length
    return /^[A-Z][a-zA-Z0-9_]*$/.test(name) && name.length >= 2 && name.length <= 50;
  }

  /**
   * Categorize component based on name and context
   */
  categorizeComponent(name, path, content) {
    const lowercaseName = name.toLowerCase();
    const lowercasePath = path.toLowerCase();
    const lowercaseContent = content.toLowerCase();
    
    // Check each category
    for (const [category, keywords] of Object.entries(this.categories)) {
      for (const keyword of keywords) {
        if (lowercaseName.includes(keyword) || 
            lowercasePath.includes(keyword) ||
            lowercaseContent.includes(`<${keyword}`) ||
            lowercaseContent.includes(`${keyword}component`)) {
          return category;
        }
      }
    }
    
    // Special categorization based on directory structure
    if (lowercasePath.includes('pages/') || lowercasePath.includes('views/')) {
      return 'navigation';
    }
    if (lowercasePath.includes('forms/') || lowercasePath.includes('inputs/')) {
      return 'data';
    }
    if (lowercasePath.includes('ui/') || lowercasePath.includes('components/')) {
      return 'display';
    }
    if (lowercasePath.includes('buttons/') || lowercasePath.includes('actions/')) {
      return 'action';
    }
    
    // Default categorization
    return 'display';
  }

  /**
   * Extract props interface from component
   */
  extractProps(content, componentName) {
    const props = [];
    
    // Look for interface or type definitions
    const interfacePattern = new RegExp(`(?:interface|type)\\s+${componentName}Props\\s*[=\\{]([^}]+)\\}`, 's');
    const interfaceMatch = content.match(interfacePattern);
    
    if (interfaceMatch) {
      const propsContent = interfaceMatch[1];
      
      // Extract individual props
      const propPattern = /(\w+)(\?)?:\s*([^;,\n]+)/g;
      let propMatch;
      
      while ((propMatch = propPattern.exec(propsContent)) !== null) {
        props.push({
          name: propMatch[1],
          optional: !!propMatch[2],
          type: propMatch[3].trim(),
          description: this.extractPropDescription(content, propMatch[1])
        });
      }
    }
    
    // Also look for destructured props in function parameters
    const funcPropPattern = new RegExp(`${componentName}\\s*=\\s*\\(\\s*\\{([^}]+)\\}`, 's');
    const funcMatch = content.match(funcPropPattern);
    
    if (funcMatch && props.length === 0) {
      const destructured = funcMatch[1];
      const propNames = destructured.split(',').map(p => p.trim().split(':')[0].trim());
      
      for (const propName of propNames) {
        if (propName && !props.find(p => p.name === propName)) {
          props.push({
            name: propName,
            optional: false,
            type: 'any',
            description: ''
          });
        }
      }
    }
    
    return props;
  }

  /**
   * Extract prop description from comments
   */
  extractPropDescription(content, propName) {
    // Look for JSDoc comments above prop
    const commentPattern = new RegExp(`\\/\\*\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\/\\s*${propName}`, 'g');
    const match = content.match(commentPattern);
    
    if (match && match[0]) {
      return match[0].replace(/\/\*\*|\*\/|\*/g, '').trim();
    }
    
    return '';
  }

  /**
   * Extract imports from file
   */
  extractImports(content) {
    const imports = [];
    const importPattern = /import\s+(?:.*?)\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Extract exports from file
   */
  extractExports(content) {
    const exports = [];
    const exportPattern = /export\s+(?:default\s+)?(?:const|function|class|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    
    let match;
    while ((match = exportPattern.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * Check if component is default export
   */
  isDefaultExport(content, componentName) {
    return content.includes(`export default ${componentName}`) ||
           content.match(new RegExp(`export\\s+default\\s+function\\s+${componentName}`));
  }

  /**
   * Check if file contains JSX
   */
  hasJSXContent(content) {
    return /<[A-Z]/.test(content) || /React\.createElement/.test(content);
  }

  /**
   * Check if component uses React hooks
   */
  hasReactHooks(content) {
    const hooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'];
    return hooks.some(hook => content.includes(hook));
  }

  /**
   * Extract component dependencies
   */
  extractDependencies(content) {
    const dependencies = [];
    
    // Extract Material-UI components
    const muiPattern = /@mui\/([^'"`\s]+)/g;
    let match;
    while ((match = muiPattern.exec(content)) !== null) {
      dependencies.push(`@mui/${match[1]}`);
    }
    
    // Extract other common libraries
    const commonLibs = ['react-router', 'framer-motion', 'lodash', 'axios', 'date-fns'];
    for (const lib of commonLibs) {
      if (content.includes(lib)) {
        dependencies.push(lib);
      }
    }
    
    return [...new Set(dependencies)];
  }

  /**
   * Cross-reference components with menu system
   */
  async crossReferenceWithMenu() {
    try {
      // Look for menu configuration files
      const menuFiles = [
        'src/routes/Router.tsx',
        'src/components/navigation/Sidebar.tsx',
        'src/components/layout/MainLayout.tsx',
        'src/config/menu.ts',
        'src/config/routes.ts'
      ];
      
      for (const menuFile of menuFiles) {
        const fullPath = path.join(process.cwd(), 'front-end', menuFile);
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          this.extractMenuReferences(content, menuFile);
        } catch (error) {
          // File might not exist, continue
        }
      }
    } catch (error) {
      logger.warn('Could not cross-reference with menu system:', error.message);
    }
  }

  /**
   * Extract menu references from content
   */
  extractMenuReferences(content, filePath) {
    // Look for component imports and route definitions
    const routePattern = /(?:path|component):\s*['"`]?([^'"`\s,}]+)['"`]?/g;
    const importPattern = /import\s+([A-Z][a-zA-Z0-9_]*)\s+from/g;
    
    let match;
    
    // Extract route paths
    while ((match = routePattern.exec(content)) !== null) {
      this.routeReferences.set(match[1], {
        file: filePath,
        type: 'route'
      });
    }
    
    // Extract imported components
    while ((match = importPattern.exec(content)) !== null) {
      this.menuReferences.set(match[1], {
        file: filePath,
        type: 'menu_import'
      });
    }
  }

  /**
   * Cross-reference with route definitions
   */
  async crossReferenceWithRoutes() {
    try {
      const routerFile = path.join(process.cwd(), 'front-end', 'src', 'routes', 'Router.tsx');
      const content = await fs.readFile(routerFile, 'utf8');
      
      // Extract route definitions and component usage
      const routeComponentPattern = /<Route[^>]*component={([^}]+)}/g;
      const elementPattern = /<Route[^>]*element={<([A-Z][a-zA-Z0-9_]*)/g;
      
      let match;
      
      while ((match = routeComponentPattern.exec(content)) !== null) {
        this.routeReferences.set(match[1], {
          type: 'route_component',
          file: 'Router.tsx'
        });
      }
      
      while ((match = elementPattern.exec(content)) !== null) {
        this.routeReferences.set(match[1], {
          type: 'route_element',
          file: 'Router.tsx'
        });
      }
    } catch (error) {
      logger.warn('Could not analyze routes:', error.message);
    }
  }

  /**
   * Generate final component metadata
   */
  async generateComponentMetadata() {
    const components = [];
    
    for (const [name, component] of this.components.entries()) {
      const metadata = {
        ...component,
        usage: {
          inMenu: this.menuReferences.has(name),
          inRoutes: this.routeReferences.has(name),
          menuContext: this.menuReferences.get(name)?.file || null,
          routeContext: this.routeReferences.get(name)?.file || null
        },
        icon: this.generateDefaultIcon(component.category, name),
        displayName: this.generateDisplayName(name),
        description: this.generateDescription(component),
        tags: this.generateTags(component)
      };
      
      components.push(metadata);
    }
    
    // Sort by category and name
    return components.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Generate default icon for component
   */
  generateDefaultIcon(category, name) {
    const iconMap = {
      navigation: 'Navigation',
      data: 'Database',
      display: 'Layout',
      action: 'MousePointer'
    };
    
    // Special cases based on name
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('button')) return 'Button';
    if (lowercaseName.includes('form')) return 'FileText';
    if (lowercaseName.includes('table')) return 'Table';
    if (lowercaseName.includes('modal')) return 'Square';
    if (lowercaseName.includes('card')) return 'Card';
    if (lowercaseName.includes('header')) return 'Header';
    if (lowercaseName.includes('footer')) return 'Footer';
    if (lowercaseName.includes('sidebar')) return 'Sidebar';
    
    return iconMap[category] || 'Component';
  }

  /**
   * Generate display name from component name
   */
  generateDisplayName(name) {
    // Convert PascalCase to Title Case
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Generate component description
   */
  generateDescription(component) {
    const { name, category, directory, hasHooks, props } = component;
    
    let description = `${this.generateDisplayName(name)} component`;
    
    if (category !== 'display') {
      description += ` (${category})`;
    }
    
    if (hasHooks) {
      description += ' with React hooks';
    }
    
    if (props.length > 0) {
      description += ` - ${props.length} props`;
    }
    
    return description;
  }

  /**
   * Generate tags for component
   */
  generateTags(component) {
    const tags = [component.category];
    
    if (component.hasHooks) tags.push('hooks');
    if (component.hasJSX) tags.push('jsx');
    if (component.isDefault) tags.push('default-export');
    if (component.props.length > 0) tags.push('configurable');
    if (component.dependencies.length > 0) tags.push('dependencies');
    
    // Add directory-based tags
    const dir = component.directory.toLowerCase();
    if (dir.includes('admin')) tags.push('admin');
    if (dir.includes('auth')) tags.push('auth');
    if (dir.includes('ui')) tags.push('ui');
    if (dir.includes('layout')) tags.push('layout');
    
    return tags;
  }

  /**
   * Generate discovery summary
   */
  generateSummary(components) {
    const summary = {
      totalComponents: components.length,
      categories: {},
      directories: {},
      inMenu: 0,
      inRoutes: 0,
      withProps: 0,
      withHooks: 0,
      extensions: {}
    };
    
    for (const component of components) {
      // Category counts
      summary.categories[component.category] = (summary.categories[component.category] || 0) + 1;
      
      // Directory counts
      const topDir = component.directory.split('/')[0];
      summary.directories[topDir] = (summary.directories[topDir] || 0) + 1;
      
      // Extension counts
      summary.extensions[component.extension] = (summary.extensions[component.extension] || 0) + 1;
      
      // Usage counts
      if (component.usage.inMenu) summary.inMenu++;
      if (component.usage.inRoutes) summary.inRoutes++;
      if (component.props.length > 0) summary.withProps++;
      if (component.hasHooks) summary.withHooks++;
    }
    
    return summary;
  }
}

module.exports = ComponentDiscovery; 