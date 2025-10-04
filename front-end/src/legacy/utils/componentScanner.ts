/**
 * Component Scanner - Filesystem-based component discovery
 * Automatically discovers and categorizes components from multiple sources
 */

export interface ComponentInfo {
  name: string;
  path: string;
  category: 'forms' | 'layout' | 'features' | 'utilities' | 'charts' | 'data';
  source: 'core' | 'modernize' | 'raydar';
  description?: string;
  tags?: string[];
  isInternal?: boolean;
}

export interface ComponentCategory {
  name: string;
  label: string;
  icon: string;
  components: ComponentInfo[];
}

export interface ComponentSource {
  name: string;
  label: string;
  path: string;
  categories: ComponentCategory[];
}

// Manual component registry for overrides and additional metadata
export interface ComponentRegistry {
  overrides: Record<string, Partial<ComponentInfo>>;
  exclusions: string[]; // Component names to exclude from auto-discovery
  customComponents: ComponentInfo[]; // Manually defined components
}

/**
 * Scans the @om/components directory structure for available components
 */
export function scanCoreComponents(): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  
  try {
    // Scan ui/forms components
    const formsContext = require.context('../@om/shared/ui/legacy/ui/forms', false, /\.tsx$/);
    formsContext.keys().forEach(key => {
      const componentName = key.replace('./', '').replace('.tsx', '');
      if (componentName !== 'index' && !componentName.includes('.test')) {
        components.push({
          name: componentName,
          path: `/sandbox/component-preview/core-forms-${componentName.toLowerCase()}`,
          category: 'forms',
          source: 'core',
          description: `Enhanced ${componentName.replace(/([A-Z])/g, ' $1').trim()} component`,
          tags: ['form', 'input', 'validation']
        });
      }
    });

    // Scan ui/theme components
    const themeContext = require.context('../@om/shared/ui/legacy/ui/theme', false, /\.tsx$/);
    themeContext.keys().forEach(key => {
      const componentName = key.replace('./', '').replace('.tsx', '');
      if (componentName !== 'index' && !componentName.includes('.test')) {
        components.push({
          name: componentName,
          path: `/sandbox/component-preview/core-theme-${componentName.toLowerCase()}`,
          category: 'utilities',
          source: 'core',
          description: `Theme ${componentName.replace(/([A-Z])/g, ' $1').trim()} component`,
          tags: ['theme', 'customization', 'ui']
        });
      }
    });

    // Scan features/auth components
    const authContext = require.context('../@om/shared/ui/legacy/features/auth', false, /\.tsx$/);
    authContext.keys().forEach(key => {
      const componentName = key.replace('./', '').replace('.tsx', '');
      if (componentName !== 'index' && !componentName.includes('.test')) {
        components.push({
          name: componentName,
          path: `/sandbox/component-preview/core-auth-${componentName.toLowerCase()}`,
          category: 'features',
          source: 'core',
          description: `Authentication ${componentName.replace(/([A-Z])/g, ' $1').trim()} component`,
          tags: ['auth', 'user', 'management']
        });
      }
    });
  } catch (error) {
    console.warn('Error scanning core components:', error);
  }

  return components;
}

/**
 * Scans for Modernize-based components in the current codebase
 */
export function scanModernizeComponents(): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  
  // Define key Modernize components based on current structure
  const modernizeComponents = [
    {
      name: 'BigCalendar',
      path: '/apps/calendar',
      category: 'features' as const,
      description: 'React Big Calendar implementation with Material-UI theming',
      tags: ['calendar', 'events', 'scheduling']
    },
    {
      name: 'LiturgicalCalendar',
      path: '/apps/liturgical-calendar',
      category: 'features' as const,
      description: 'Orthodox Liturgical Calendar with feast days and fasting periods',
      tags: ['calendar', 'liturgical', 'orthodox']
    },
    {
      name: 'UserManagement',
      path: '/admin/user-management',
      category: 'features' as const,
      description: 'Complete user management interface with RBAC',
      tags: ['admin', 'users', 'management']
    },
    {
      name: 'ChurchSetupWizard',
      path: '/apps/church-management/setup',
      category: 'features' as const,
      description: 'Step-by-step church configuration wizard',
      tags: ['church', 'setup', 'wizard']
    },
    {
      name: 'AdvancedGridDialog',
      path: '/sandbox/component-preview/modernize-data-advancedgriddialog',
      category: 'data' as const,
      description: 'Advanced AG-Grid configuration dialog',
      tags: ['grid', 'data', 'table']
    },
    {
      name: 'OMAIUltimateLogger',
      path: '/admin/omai-logger',
      category: 'utilities' as const,
      description: 'Real-time logging and monitoring dashboard',
      tags: ['logging', 'monitoring', 'omai']
    }
  ];

  modernizeComponents.forEach(comp => {
    components.push({
      name: comp.name,
      path: comp.path,
      category: comp.category,
      source: 'modernize',
      description: comp.description,
      tags: comp.tags
    });
  });

  return components;
}

/**
 * Scans for Raydar-based components (from task node templates)
 */
export function scanRaydarComponents(): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  
  // Define key Raydar components based on template structure
  const raydarComponents = [
    {
      name: 'RaydarCalendar',
      path: '/sandbox/component-preview/raydar-calendar-fullcalendar',
      category: 'features' as const,
      description: 'FullCalendar implementation with Raydar styling',
      tags: ['calendar', 'fullcalendar', 'events']
    },
    {
      name: 'ComponentContainerCard',
      path: '/sandbox/component-preview/raydar-layout-componentcontainer',
      category: 'layout' as const,
      description: 'Reusable container card for component demos',
      tags: ['layout', 'container', 'demo']
    },
    {
      name: 'PageBreadcrumb',
      path: '/sandbox/component-preview/raydar-layout-pagebreadcrumb',
      category: 'layout' as const,
      description: 'Breadcrumb navigation component',
      tags: ['navigation', 'breadcrumb', 'layout']
    },
    {
      name: 'ThemeCustomizer',
      path: '/sandbox/component-preview/raydar-theme-themecustomizer',
      category: 'utilities' as const,
      description: 'Advanced theme customization panel',
      tags: ['theme', 'customization', 'settings']
    },
    {
      name: 'FlatPicker',
      path: '/sandbox/component-preview/raydar-forms-flatpicker',
      category: 'forms' as const,
      description: 'Date/time picker with multiple configurations',
      tags: ['forms', 'date', 'time', 'picker']
    }
  ];

  raydarComponents.forEach(comp => {
    components.push({
      name: comp.name,
      path: comp.path,
      category: comp.category,
      source: 'raydar',
      description: comp.description,
      tags: comp.tags
    });
  });

  return components;
}

/**
 * Categorizes components by type
 */
export function categorizeComponents(components: ComponentInfo[]): ComponentCategory[] {
  const categoryMap: Record<string, ComponentCategory> = {
    forms: {
      name: 'forms',
      label: 'Form Components',
      icon: 'IconForms',
      components: []
    },
    layout: {
      name: 'layout',
      label: 'Layout Components',
      icon: 'IconLayout',
      components: []
    },
    features: {
      name: 'features',
      label: 'Feature Components',
      icon: 'IconApps',
      components: []
    },
    utilities: {
      name: 'utilities',
      label: 'Utility Components',
      icon: 'IconTool',
      components: []
    },
    charts: {
      name: 'charts',
      label: 'Chart Components',
      icon: 'IconChartBar',
      components: []
    },
    data: {
      name: 'data',
      label: 'Data Components',
      icon: 'IconDatabase',
      components: []
    }
  };

  components.forEach(component => {
    if (categoryMap[component.category]) {
      categoryMap[component.category].components.push(component);
    }
  });

  // Filter out empty categories
  return Object.values(categoryMap).filter(category => category.components.length > 0);
}

/**
 * Main component scanner function
 */
export function scanAllComponents(registry?: ComponentRegistry): ComponentSource[] {
  const sources: ComponentSource[] = [];

  // Scan core components
  const coreComponents = scanCoreComponents();
  if (coreComponents.length > 0) {
    sources.push({
      name: 'core',
      label: 'Core Components',
      path: '/sandbox/component-preview/core',
      categories: categorizeComponents(coreComponents)
    });
  }

  // Scan Modernize components
  const modernizeComponents = scanModernizeComponents();
  if (modernizeComponents.length > 0) {
    sources.push({
      name: 'modernize',
      label: 'Modernize Components',
      path: '/sandbox/component-preview/modernize',
      categories: categorizeComponents(modernizeComponents)
    });
  }

  // Scan Raydar components
  const raydarComponents = scanRaydarComponents();
  if (raydarComponents.length > 0) {
    sources.push({
      name: 'raydar',
      label: 'Raydar Components',
      path: '/sandbox/component-preview/raydar',
      categories: categorizeComponents(raydarComponents)
    });
  }

  // Apply registry overrides and exclusions if provided
  if (registry) {
    sources.forEach(source => {
      source.categories.forEach(category => {
        // Apply exclusions
        category.components = category.components.filter(
          comp => !registry.exclusions.includes(comp.name)
        );
        
        // Apply overrides
        category.components = category.components.map(comp => ({
          ...comp,
          ...registry.overrides[comp.name]
        }));
      });
    });
    
    // Add custom components
    if (registry.customComponents.length > 0) {
      const customSource = {
        name: 'custom',
        label: 'Custom Components',
        path: '/sandbox/component-preview/custom',
        categories: categorizeComponents(registry.customComponents)
      };
      sources.push(customSource);
    }
  }

  return sources;
}

/**
 * Get component info by name across all sources
 */
export function findComponent(name: string, sources?: ComponentSource[]): ComponentInfo | null {
  const allSources = sources || scanAllComponents();
  
  for (const source of allSources) {
    for (const category of source.categories) {
      const component = category.components.find(comp => comp.name === name);
      if (component) {
        return component;
      }
    }
  }
  
  return null;
}

/**
 * Get all components flattened into a single array
 */
export function getAllComponents(sources?: ComponentSource[]): ComponentInfo[] {
  const allSources = sources || scanAllComponents();
  const components: ComponentInfo[] = [];
  
  allSources.forEach(source => {
    source.categories.forEach(category => {
      components.push(...category.components);
    });
  });
  
  return components;
}