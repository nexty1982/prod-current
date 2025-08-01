/**
 * OMAI Learning Sources Registry
 * Centralized configuration for OMAI learning paths and file types
 * Created: 2025-07-27
 */

const path = require('path');

/**
 * Learning source configuration
 */
const LEARNING_SOURCES = {
  // Project root directory
  projectRoot: '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod',
  
  // Source directories and their classifications
  sources: [
    {
      path: '/docs',
      type: 'documentation',
      tags: ['Documentation', 'Guide', 'Reference'],
      extensions: ['.md', '.txt'],
      recursive: true,
      priority: 'high',
      description: 'Project documentation and guides'
    },
    {
      path: '/front-end/src/components',
      type: 'react-component',
      tags: ['Component', 'Frontend', 'React', 'UI'],
      extensions: ['.tsx', '.jsx', '.ts', '.js'],
      recursive: true,
      priority: 'high',
      description: 'React components and UI elements'
    },
    {
      path: '/server',
      type: 'code',
      tags: ['Backend', 'Server', 'API', 'Node.js'],
      extensions: ['.js', '.ts', '.sql'],
      recursive: true,
      priority: 'high',
      description: 'Backend server code and APIs'
    },
    {
      path: '/scripts',
      type: 'code',
      tags: ['Admin Script', 'Automation', 'DevOps'],
      extensions: ['.js', '.ts', '.sh', '.ps1', '.sql'],
      recursive: true,
      priority: 'medium',
      description: 'Administrative and automation scripts'
    },
    {
      path: '/services',
      type: 'code',
      tags: ['Service', 'Microservice', 'Integration'],
      extensions: ['.js', '.ts', '.json'],
      recursive: true,
      priority: 'high',
      description: 'Service layer and integrations'
    },
    {
      path: '/config',
      type: 'json',
      tags: ['Configuration', 'Settings'],
      extensions: ['.json', '.yaml', '.yml', '.conf'],
      recursive: false,
      priority: 'medium',
      description: 'Configuration files and settings'
    },
    {
      path: '/bigbook',
      type: 'json',
      tags: ['BigBook', 'Knowledge', 'Index'],
      extensions: ['.json', '.md'],
      recursive: true,
      priority: 'high',
      description: 'BigBook knowledge system files'
    },
    {
      path: '/auto-discovered-components.json',
      type: 'json',
      tags: ['Component', 'Discovery', 'Metadata'],
      extensions: ['.json'],
      recursive: false,
      priority: 'high',
      description: 'Auto-discovered component registry'
    }
  ],

  // File type processors
  processors: {
    'documentation': {
      parser: 'markdown',
      chunking: 'section',
      metadata: ['title', 'category', 'tags'],
      indexing: 'full-text'
    },
    'react-component': {
      parser: 'typescript',
      chunking: 'component',
      metadata: ['props', 'hooks', 'dependencies', 'exports'],
      indexing: 'semantic'
    },
    'code': {
      parser: 'javascript',
      chunking: 'function',
      metadata: ['functions', 'classes', 'imports', 'exports'],
      indexing: 'semantic'
    },
    'json': {
      parser: 'json',
      chunking: 'object',
      metadata: ['schema', 'keys', 'structure'],
      indexing: 'structural'
    }
  },

  // Exclusion patterns
  exclude: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '*.min.js',
    '*.min.css',
    '.env*',
    '*.log',
    'temp/**',
    'uploads/**'
  ],

  // Learning configuration
  settings: {
    batchSize: 10,
    maxFileSize: 1024 * 1024, // 1MB
    timeout: 30000, // 30 seconds
    retries: 3,
    concurrent: 5
  }
};

/**
 * Get all learning sources with resolved paths
 */
function getLearningSources() {
  return LEARNING_SOURCES.sources.map(source => ({
    ...source,
    fullPath: path.join(LEARNING_SOURCES.projectRoot, source.path)
  }));
}

/**
 * Get sources by type
 */
function getSourcesByType(type) {
  return getLearningSources().filter(source => source.type === type);
}

/**
 * Get sources by priority
 */
function getSourcesByPriority(priority) {
  return getLearningSources().filter(source => source.priority === priority);
}

/**
 * Get processor configuration for a file type
 */
function getProcessor(type) {
  return LEARNING_SOURCES.processors[type] || LEARNING_SOURCES.processors.code;
}

/**
 * Check if a file should be excluded
 */
function shouldExclude(filePath) {
  const relativePath = path.relative(LEARNING_SOURCES.projectRoot, filePath);
  
  return LEARNING_SOURCES.exclude.some(pattern => {
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
      return regex.test(relativePath);
    }
    return relativePath.includes(pattern.replace('*', ''));
  });
}

/**
 * Get file type from extension
 */
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  for (const source of LEARNING_SOURCES.sources) {
    if (source.extensions.includes(ext)) {
      return source.type;
    }
  }
  
  return 'code'; // default
}

/**
 * Get tags for a file based on its path and type
 */
function getFileTags(filePath) {
  const allTags = new Set();
  
  for (const source of LEARNING_SOURCES.sources) {
    if (filePath.includes(source.path)) {
      source.tags.forEach(tag => allTags.add(tag));
    }
  }
  
  return Array.from(allTags);
}

module.exports = {
  LEARNING_SOURCES,
  getLearningSources,
  getSourcesByType,
  getSourcesByPriority,
  getProcessor,
  shouldExclude,
  getFileType,
  getFileTags
}; 