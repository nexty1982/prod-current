/**
 * Component Registry - Manual overrides and customizations
 * This file allows manual control over component discovery and metadata
 */

import { ComponentRegistry } from '../utils/componentScanner';

export const componentRegistry: ComponentRegistry = {
  // Override component metadata
  overrides: {
    'UserFormModal': {
      description: 'Comprehensive user creation and editing modal with validation',
      tags: ['user', 'modal', 'forms', 'admin']
    },
    'TextFormInput': {
      description: 'Enhanced text input with react-hook-form integration and validation',
      tags: ['forms', 'input', 'validation', 'text']
    },
    'ThemeCustomizer': {
      description: 'Advanced theme customization drawer with live preview',
      tags: ['theme', 'customization', 'settings', 'ui']
    },
    'OMAIUltimateLogger': {
      description: 'Real-time logging dashboard with 4-console layout and filtering',
      tags: ['logging', 'monitoring', 'real-time', 'dashboard']
    },
    'LiturgicalCalendar': {
      description: 'Orthodox liturgical calendar with feast days, fasting periods, and multi-language support',
      tags: ['orthodox', 'liturgical', 'calendar', 'church']
    }
  },

  // Components to exclude from auto-discovery
  exclusions: [
    'index', // Barrel export files
    '.test', // Test files
    '.spec', // Spec files
    '.stories', // Storybook files
    'types', // Type definition files
    'constants', // Constant files
    'utils', // Utility files (non-components)
    'hooks', // Custom hooks (not visual components)
  ],

  // Custom components not auto-discoverable
  customComponents: [
    {
      name: 'SiteStructureVisualizer',
      path: '/tools/site-structure-visualizer',
      category: 'utilities',
      source: 'core',
      description: 'Interactive site architecture and API dependency visualization',
      tags: ['visualization', 'architecture', 'api', 'development']
    },
    {
      name: 'ComponentLibraryDemo',
      path: '/sandbox/component-library',
      category: 'features',
      source: 'core',
      description: 'Interactive demo showcase for the @om/components library',
      tags: ['demo', 'showcase', 'components', 'library']
    },
    {
      name: 'JITTerminalConsole',
      path: '/admin/jit-terminal',
      category: 'utilities',
      source: 'modernize',
      description: 'Just-In-Time terminal console for development and debugging',
      tags: ['terminal', 'development', 'debugging', 'console']
    }
  ]
};

/**
 * Get user-friendly category labels
 */
export const categoryLabels = {
  forms: '📝 Form Components',
  layout: '🎨 Layout Components',
  features: '⚡ Feature Components',
  utilities: '🔧 Utility Components',
  charts: '📊 Chart Components',
  data: '🗄️ Data Components'
};

/**
 * Get user-friendly source labels
 */
export const sourceLabels = {
  core: '🧩 Core Components',
  modernize: '🎯 Modernize Components',
  raydar: '⚡ Raydar Components',
  custom: '🔮 Custom Components'
};

/**
 * Component difficulty levels for documentation
 */
export const componentDifficulty = {
  'TextFormInput': 'Beginner',
  'SelectFormInput': 'Beginner',
  'PasswordFormInput': 'Beginner',
  'TextAreaFormInput': 'Beginner',
  'DropzoneFormInput': 'Intermediate',
  'UserFormModal': 'Advanced',
  'ThemeCustomizer': 'Advanced',
  'OMAIUltimateLogger': 'Expert',
  'SiteStructureVisualizer': 'Expert'
};

/**
 * Component status indicators
 */
export const componentStatus = {
  'TextFormInput': 'stable',
  'SelectFormInput': 'stable',
  'PasswordFormInput': 'stable',
  'TextAreaFormInput': 'stable',
  'DropzoneFormInput': 'stable',
  'UserFormModal': 'stable',
  'ThemeCustomizer': 'beta',
  'OMAIUltimateLogger': 'stable',
  'SiteStructureVisualizer': 'beta',
  'ComponentLibraryDemo': 'stable'
} as const;

export default componentRegistry;