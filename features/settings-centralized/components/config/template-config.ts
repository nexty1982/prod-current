/**
 * Orthodox Metrics - Template Configuration System
 * Centralized configuration for different UI templates (Berry, MUI, Ant Design, etc.)
 */

export type UITemplate = 'mui' | 'berry' | 'antd' | 'chakra' | 'custom';

export interface TemplateConfig {
  name: string;
  displayName: string;
  version: string;
  description: string;
  uiLibrary: string;
  themeProvider: string;
  componentPrefix: string;
  iconLibrary: string;
  stylingSolution: 'emotion' | 'styled-components' | 'css-modules' | 'tailwind';
  features: {
    darkMode: boolean;
    rtl: boolean;
    responsive: boolean;
    accessibility: boolean;
    animations: boolean;
    theming: boolean;
  };
  paths: {
    components: string;
    themes: string;
    layouts: string;
    pages: string;
  };
  imports: {
    core: string;
    ui: string;
    themes: string;
  };
}

export const TEMPLATE_CONFIGS: Record<UITemplate, TemplateConfig> = {
  mui: {
    name: 'mui',
    displayName: 'Material-UI',
    version: '5.14.0',
    description: 'Material-UI (MUI) template with Material Design components',
    uiLibrary: '@mui/material',
    themeProvider: '@mui/material/styles',
    componentPrefix: 'Mui',
    iconLibrary: '@mui/icons-material',
    stylingSolution: 'emotion',
    features: {
      darkMode: true,
      rtl: true,
      responsive: true,
      accessibility: true,
      animations: true,
      theming: true
    },
    paths: {
      components: 'ui/components/mui',
      themes: 'ui/themes/mui-theme',
      layouts: 'ui/layouts',
      pages: 'pages/mui'
    },
    imports: {
      core: '../core',
      ui: '../ui/components/mui',
      themes: '../ui/themes/mui-theme'
    }
  },
  
  berry: {
    name: 'berry',
    displayName: 'Berry Template',
    version: '1.0.0',
    description: 'Berry admin template with modern design and components',
    uiLibrary: '@mui/material',
    themeProvider: '@mui/material/styles',
    componentPrefix: 'Berry',
    iconLibrary: '@tabler/icons-react',
    stylingSolution: 'emotion',
    features: {
      darkMode: true,
      rtl: false,
      responsive: true,
      accessibility: true,
      animations: true,
      theming: true
    },
    paths: {
      components: 'ui/components/berry',
      themes: 'ui/themes/berry-theme',
      layouts: 'ui/layouts',
      pages: 'pages/berry'
    },
    imports: {
      core: '../core',
      ui: '../ui/components/berry',
      themes: '../ui/themes/berry-theme'
    }
  },
  
  antd: {
    name: 'antd',
    displayName: 'Ant Design',
    version: '5.8.0',
    description: 'Ant Design template with enterprise-class UI components',
    uiLibrary: 'antd',
    themeProvider: 'antd',
    componentPrefix: 'Antd',
    iconLibrary: '@ant-design/icons',
    stylingSolution: 'css-modules',
    features: {
      darkMode: true,
      rtl: true,
      responsive: true,
      accessibility: true,
      animations: true,
      theming: true
    },
    paths: {
      components: 'ui/components/antd',
      themes: 'ui/themes/antd-theme',
      layouts: 'ui/layouts',
      pages: 'pages/antd'
    },
    imports: {
      core: '../core',
      ui: '../ui/components/antd',
      themes: '../ui/themes/antd-theme'
    }
  },
  
  chakra: {
    name: 'chakra',
    displayName: 'Chakra UI',
    version: '2.8.0',
    description: 'Chakra UI template with modular and accessible components',
    uiLibrary: '@chakra-ui/react',
    themeProvider: '@chakra-ui/react',
    componentPrefix: 'Chakra',
    iconLibrary: '@chakra-ui/icons',
    stylingSolution: 'emotion',
    features: {
      darkMode: true,
      rtl: false,
      responsive: true,
      accessibility: true,
      animations: true,
      theming: true
    },
    paths: {
      components: 'ui/components/chakra',
      themes: 'ui/themes/chakra-theme',
      layouts: 'ui/layouts',
      pages: 'pages/chakra'
    },
    imports: {
      core: '../core',
      ui: '../ui/components/chakra',
      themes: '../ui/themes/chakra-theme'
    }
  },
  
  custom: {
    name: 'custom',
    displayName: 'Custom Template',
    version: '1.0.0',
    description: 'Custom template configuration',
    uiLibrary: 'custom',
    themeProvider: 'custom',
    componentPrefix: 'Custom',
    iconLibrary: 'custom',
    stylingSolution: 'css-modules',
    features: {
      darkMode: false,
      rtl: false,
      responsive: true,
      accessibility: false,
      animations: false,
      theming: false
    },
    paths: {
      components: 'ui/components/custom',
      themes: 'ui/themes/custom-theme',
      layouts: 'ui/layouts',
      pages: 'pages/custom'
    },
    imports: {
      core: '../core',
      ui: '../ui/components/custom',
      themes: '../ui/themes/custom-theme'
    }
  }
};

export interface TemplateManager {
  currentTemplate: UITemplate;
  setTemplate: (template: UITemplate) => void;
  getTemplateConfig: () => TemplateConfig;
  getComponentPath: (componentName: string) => string;
  getThemePath: () => string;
  getLayoutPath: (layoutName: string) => string;
  getPagePath: (pageName: string) => string;
  isFeatureEnabled: (feature: keyof TemplateConfig['features']) => boolean;
}

class TemplateManagerImpl implements TemplateManager {
  private _currentTemplate: UITemplate = 'mui';

  constructor(initialTemplate: UITemplate = 'mui') {
    this._currentTemplate = initialTemplate;
  }

  get currentTemplate(): UITemplate {
    return this._currentTemplate;
  }

  setTemplate(template: UITemplate): void {
    this._currentTemplate = template;
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('records-ui-template', template);
    }
  }

  getTemplateConfig(): TemplateConfig {
    return TEMPLATE_CONFIGS[this._currentTemplate];
  }

  getComponentPath(componentName: string): string {
    const config = this.getTemplateConfig();
    return `${config.paths.components}/${componentName}`;
  }

  getThemePath(): string {
    const config = this.getTemplateConfig();
    return config.paths.themes;
  }

  getLayoutPath(layoutName: string): string {
    const config = this.getTemplateConfig();
    return `${config.paths.layouts}/${layoutName}`;
  }

  getPagePath(pageName: string): string {
    const config = this.getTemplateConfig();
    return `${config.paths.pages}/${pageName}`;
  }

  isFeatureEnabled(feature: keyof TemplateConfig['features']): boolean {
    const config = this.getTemplateConfig();
    return config.features[feature];
  }
}

// Export singleton instance
export const templateManager = new TemplateManagerImpl();

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  const savedTemplate = localStorage.getItem('records-ui-template') as UITemplate;
  if (savedTemplate && TEMPLATE_CONFIGS[savedTemplate]) {
    templateManager.setTemplate(savedTemplate);
  }
}

// Export template switching utilities
export const switchTemplate = (template: UITemplate) => {
  templateManager.setTemplate(template);
  // Trigger a custom event for components to react to template changes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('templateChanged', { 
      detail: { template, config: templateManager.getTemplateConfig() }
    }));
  }
};

export const getCurrentTemplate = (): UITemplate => {
  return templateManager.currentTemplate;
};

export const getCurrentTemplateConfig = (): TemplateConfig => {
  return templateManager.getTemplateConfig();
};

// Export component path helpers
export const getComponentPath = (componentName: string): string => {
  return templateManager.getComponentPath(componentName);
};

export const getThemePath = (): string => {
  return templateManager.getThemePath();
};

export const getLayoutPath = (layoutName: string): string => {
  return templateManager.getLayoutPath(layoutName);
};

export const getPagePath = (pageName: string): string => {
  return templateManager.getPagePath(pageName);
};

// Export feature check helpers
export const isDarkModeEnabled = (): boolean => {
  return templateManager.isFeatureEnabled('darkMode');
};

export const isRTLEnabled = (): boolean => {
  return templateManager.isFeatureEnabled('rtl');
};

export const isResponsiveEnabled = (): boolean => {
  return templateManager.isFeatureEnabled('responsive');
};

export const isAccessibilityEnabled = (): boolean => {
  return templateManager.isFeatureEnabled('accessibility');
};

export const isAnimationsEnabled = (): boolean => {
  return templateManager.isFeatureEnabled('animations');
};

export const isThemingEnabled = (): boolean => {
  return templateManager.isFeatureEnabled('theming');
};

// Export available templates
export const getAvailableTemplates = (): TemplateConfig[] => {
  return Object.values(TEMPLATE_CONFIGS);
};

export const getTemplateByName = (name: string): TemplateConfig | undefined => {
  return TEMPLATE_CONFIGS[name as UITemplate];
};
