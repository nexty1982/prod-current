const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class OMAIPathDiscoveryStandalone {
  constructor() {
    this.productionRoot = '/var/www/orthodoxmetrics/prod';
    this.bigBookRoot = path.join(this.productionRoot, 'bigbook');
    this.indexPath = path.join(this.bigBookRoot, 'bigbook-index.json');
    
    // File classification patterns
    this.classifications = {
      'Build Scripts': {
        patterns: [/build/i, /deploy/i, /webpack/i, /vite/i, /rollup/i],
        keywords: ['npm run', 'yarn build', 'docker build', 'CI/CD'],
        category: 'DevOps > Build'
      },
      'Testing Scripts': {
        patterns: [/test/i, /spec/i, /jest/i, /cypress/i, /mocha/i],
        keywords: ['describe(', 'it(', 'test(', 'expect('],
        category: 'DevOps > Test'
      },
      'Troubleshooting Utilities': {
        patterns: [/debug/i, /fix/i, /repair/i, /diagnose/i, /troubleshoot/i],
        keywords: ['console.log', 'debugger', 'error handling'],
        category: 'Diagnostic Tools'
      },
      'Server Scripts': {
        patterns: [/server/i, /api/i, /route/i, /middleware/i],
        keywords: ['express', 'router', 'app.use', 'require('],
        category: 'Backend > Server'
      },
      'Database Scripts': {
        patterns: [/database/i, /db/i, /sql/i, /migration/i, /schema/i],
        keywords: ['CREATE TABLE', 'ALTER TABLE', 'INSERT INTO', 'SELECT'],
        category: 'Backend > Database'
      },
      'Frontend Scripts': {
        patterns: [/component/i, /react/i, /vue/i, /angular/i, /frontend/i],
        keywords: ['import React', 'useState', 'useEffect', 'component'],
        category: 'Frontend > Components'
      },
      'Configuration': {
        patterns: [/config/i, /setting/i, /env/i, /.json$/i, /.yaml$/i],
        keywords: ['module.exports', 'export default', '"scripts":', '"dependencies":'],
        category: 'Configuration'
      },
      'Documentation': {
        patterns: [/readme/i, /doc/i, /guide/i, /tutorial/i, /\.md$/i],
        keywords: ['# ', '## ', '### ', '- [ ]', '- [x]'],
        category: 'Documentation'
      },
      'Setup Scripts': {
        patterns: [/setup/i, /install/i, /init/i, /bootstrap/i],
        keywords: ['#!/bin/bash', '#!/bin/sh', 'npm install', 'yarn install'],
        category: 'DevOps > Setup'
      }
    };

    // Security patterns to redact
    this.securityPatterns = [
      /(?:password|pwd|pass)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /(?:secret|token)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /(?:database[_-]?url|db[_-]?url)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /(?:connection[_-]?string)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /process\.env\.([A-Z_]+)/gi
    ];
  }

  /**
   * Initialize the OMAI path discovery system (standalone version)
   */
  async initialize() {
    try {
      logger.info('Initializing OMAI Path Discovery system (standalone)...');
      
      // Ensure Big Book directory structure exists
      await this.createBigBookStructure();
      
      logger.info('OMAI Path Discovery system initialized successfully (standalone)');
      return true;
    } catch (error) {
      logger.error('Failed to initialize OMAI Path Discovery:', error);
      throw error;
    }
  }

  /**
   * Create the Big Book directory structure
   */
  async createBigBookStructure() {
    const directories = [
      this.bigBookRoot,
      path.join(this.bigBookRoot, 'index'),
      path.join(this.bigBookRoot, 'metadata'),
      path.join(this.bigBookRoot, 'references'),
      path.join(this.bigBookRoot, 'categories'),
      path.join(this.bigBookRoot, 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: 0o755 });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Perform full directory scan and file discovery
   */
  async discoverFiles() {
    try {
      logger.info('Starting OMAI file discovery process...');
      
      const startTime = Date.now();
      const discoveredFiles = [];
      
      // Scan the production directory recursively
      await this.scanDirectory(this.productionRoot, discoveredFiles);
      
      // Filter for supported file types
      const supportedFiles = discoveredFiles.filter(file => 
        this.isSupportedFile(file.path)
      );
      
      logger.info(`Discovered ${supportedFiles.length} supported files in ${Date.now() - startTime}ms`);
      
      // Process each file
      const processedFiles = [];
      for (const file of supportedFiles) {
        try {
          const processedFile = await this.processFile(file);
          if (processedFile) {
            processedFiles.push(processedFile);
          }
        } catch (error) {
          logger.error(`Error processing file ${file.path}:`, error);
        }
      }
      
      // Create Big Book index
      await this.createBigBookIndex(processedFiles);
      
      // Generate summary
      const summary = this.generateDiscoverySummary(processedFiles);
      await this.saveSummary(summary);
      
      logger.info(`OMAI file discovery completed. Processed ${processedFiles.length} files.`);
      
      return {
        totalFiles: discoveredFiles.length,
        supportedFiles: supportedFiles.length,
        processedFiles: processedFiles.length,
        summary: summary
      };
    } catch (error) {
      logger.error('OMAI file discovery failed:', error);
      throw error;
    }
  }

  /**
   * Recursively scan a directory for files
   */
  async scanDirectory(dirPath, files, relativePath = '') {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        // Skip certain directories
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'logs'];
          if (!skipDirs.includes(entry.name)) {
            await this.scanDirectory(fullPath, files, relativeFilePath);
          }
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            relativePath: relativeFilePath,
            name: entry.name,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime,
            extension: path.extname(entry.name).toLowerCase()
          });
        }
      }
    } catch (error) {
      logger.warn(`Could not scan directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Check if a file is supported for OMAI processing
   */
  isSupportedFile(filePath) {
    const supportedExtensions = ['.md', '.js', '.ts', '.json', '.sh', '.ps1', '.sql', '.yaml', '.yml'];
    const extension = path.extname(filePath).toLowerCase();
    return supportedExtensions.includes(extension);
  }

  /**
   * Process a single file for OMAI integration
   */
  async processFile(file) {
    try {
      // Read file content
      let content = '';
      try {
        content = await fs.readFile(file.path, 'utf8');
      } catch (error) {
        logger.warn(`Could not read file ${file.path}:`, error.message);
        return null;
      }

      // Classify file
      const classification = this.classifyFile(file, content);
      
      // Generate metadata
      const metadata = await this.generateFileMetadata(file, content, classification);
      
      // Create secure reference (don't copy the file, just reference it)
      const fileReference = {
        id: this.generateFileId(file.path),
        originalPath: file.path,
        relativePath: file.relativePath,
        name: file.name,
        extension: file.extension,
        size: file.size,
        modified: file.modified,
        created: file.created,
        classification: classification,
        metadata: metadata,
        contentHash: crypto.createHash('sha256').update(content).digest('hex'),
        discoveredAt: new Date().toISOString()
      };

      // Save metadata to Big Book structure
      await this.saveFileReference(fileReference);
      
      return fileReference;
    } catch (error) {
      logger.error(`Error processing file ${file.path}:`, error);
      return null;
    }
  }

  /**
   * Classify a file based on its content and path
   */
  classifyFile(file, content) {
    let bestMatch = {
      type: 'Other',
      category: 'Uncategorized',
      confidence: 0
    };

    // Check each classification pattern
    for (const [type, config] of Object.entries(this.classifications)) {
      let score = 0;
      
      // Check filename patterns
      for (const pattern of config.patterns) {
        if (pattern.test(file.path) || pattern.test(file.name)) {
          score += 2;
        }
      }
      
      // Check content keywords
      for (const keyword of config.keywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      
      if (score > bestMatch.confidence) {
        bestMatch = {
          type: type,
          category: config.category,
          confidence: score
        };
      }
    }

    return bestMatch;
  }

  /**
   * Generate comprehensive metadata for a file
   */
  async generateFileMetadata(file, content, classification) {
    const metadata = {
      fileStats: {
        lines: content.split('\n').length,
        characters: content.length,
        words: content.split(/\s+/).filter(word => word.length > 0).length
      },
      classification: classification,
      dependencies: this.extractDependencies(file, content),
      security: this.analyzeSecurityContent(content),
      complexity: this.analyzeComplexity(content),
      lastAnalyzed: new Date().toISOString()
    };

    return metadata;
  }

  /**
   * Extract dependencies from file content
   */
  extractDependencies(file, content) {
    const dependencies = [];
    
    // JavaScript/TypeScript imports
    const importRegex = /(?:import.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1] || match[2];
      if (dep && !dep.startsWith('.')) {
        dependencies.push({
          type: 'npm_package',
          name: dep,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }

    // Shell script dependencies
    if (file.extension === '.sh') {
      const commandRegex = /(?:^|\s)(apt|yum|npm|yarn|pip|docker|git)\s+/gm;
      while ((match = commandRegex.exec(content)) !== null) {
        dependencies.push({
          type: 'system_command',
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }

    return dependencies;
  }

  /**
   * Analyze security content and redact sensitive information
   */
  analyzeSecurityContent(content) {
    const findings = [];
    let redactedContent = content;

    for (const pattern of this.securityPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        findings.push({
          type: 'sensitive_data',
          pattern: pattern.source,
          line: content.substring(0, match.index).split('\n').length,
          redacted: true
        });
        
        // Redact the sensitive value
        redactedContent = redactedContent.replace(match[0], match[0].replace(match[1] || match[0], '[REDACTED]'));
      }
    }

    return {
      findings: findings,
      hasSecurityIssues: findings.length > 0,
      redactedContent: findings.length > 0 ? redactedContent : null
    };
  }

  /**
   * Analyze code complexity
   */
  analyzeComplexity(content) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('#') || 
             trimmed.startsWith('/*') || trimmed.startsWith('*');
    });

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length - commentLines.length,
      commentLines: commentLines.length,
      commentRatio: commentLines.length / nonEmptyLines.length || 0,
      averageLineLength: nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length || 0
    };
  }

  /**
   * Generate a unique file ID
   */
  generateFileId(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 12);
  }

  /**
   * Save file reference to Big Book structure
   */
  async saveFileReference(fileReference) {
    // Save to metadata directory
    const metadataPath = path.join(this.bigBookRoot, 'metadata', `${fileReference.id}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(fileReference, null, 2));
    
    // Save to category directory
    const categoryDir = path.join(this.bigBookRoot, 'categories', fileReference.classification.category.replace(/[^a-zA-Z0-9]/g, '_'));
    await fs.mkdir(categoryDir, { recursive: true });
    
    const categoryFile = path.join(categoryDir, `${fileReference.id}.ref`);
    await fs.writeFile(categoryFile, JSON.stringify({
      id: fileReference.id,
      name: fileReference.name,
      path: fileReference.originalPath,
      type: fileReference.classification.type
    }, null, 2));
  }

  /**
   * Create the Big Book index file
   */
  async createBigBookIndex(processedFiles) {
    const index = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      totalFiles: processedFiles.length,
      categories: {},
      files: {}
    };

    // Group files by category
    for (const file of processedFiles) {
      const category = file.classification.category;
      if (!index.categories[category]) {
        index.categories[category] = {
          files: [],
          count: 0
        };
      }
      
      index.categories[category].files.push({
        id: file.id,
        name: file.name,
        path: file.relativePath,
        type: file.classification.type,
        size: file.size,
        modified: file.modified
      });
      index.categories[category].count++;
      
      // Add to files index
      index.files[file.id] = {
        name: file.name,
        path: file.originalPath,
        relativePath: file.relativePath,
        category: category,
        type: file.classification.type,
        contentHash: file.contentHash,
        discoveredAt: file.discoveredAt
      };
    }

    // Save the index
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
    logger.info(`Big Book index created with ${processedFiles.length} files`);
  }

  /**
   * Generate discovery summary
   */
  generateDiscoverySummary(processedFiles) {
    const categoryStats = {};
    const typeStats = {};
    
    for (const file of processedFiles) {
      const category = file.classification.category;
      const type = file.classification.type;
      
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      typeStats[type] = (typeStats[type] || 0) + 1;
    }

    return {
      timestamp: new Date().toISOString(),
      totalFiles: processedFiles.length,
      categories: categoryStats,
      types: typeStats,
      topCategories: Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count })),
      averageFileSize: processedFiles.reduce((sum, file) => sum + file.size, 0) / processedFiles.length || 0,
      totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0)
    };
  }

  /**
   * Save discovery summary
   */
  async saveSummary(summary) {
    const summaryPath = path.join(this.bigBookRoot, 'discovery-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Also save to logs
    const logPath = path.join(this.bigBookRoot, 'logs', `discovery-${new Date().toISOString().split('T')[0]}.log`);
    await fs.writeFile(logPath, JSON.stringify(summary, null, 2));
  }

  /**
   * Get discovery status
   */
  async getStatus() {
    try {
      const indexExists = await fs.access(this.indexPath).then(() => true).catch(() => false);
      
      if (!indexExists) {
        return {
          status: 'not_initialized',
          message: 'Big Book index not found'
        };
      }

      const index = JSON.parse(await fs.readFile(this.indexPath, 'utf8'));
      
      return {
        status: 'ready',
        version: index.version,
        totalFiles: index.totalFiles,
        categories: Object.keys(index.categories).length,
        lastDiscovery: index.createdAt,
        indexPath: this.indexPath
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = OMAIPathDiscoveryStandalone; 