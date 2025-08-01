#!/usr/bin/env node

/**
 * Complete API Audit Script for OrthodoxMetrics Backend
 * Discovers, tests, and analyzes all API endpoints
 * 
 * Usage: node scripts/api-audit-complete.js [--test-endpoints] [--detailed]
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  serverPort: process.env.PORT || 3000,
  serverHost: process.env.HOST || 'localhost',
  serverProtocol: process.env.HTTPS ? 'https' : 'http',
  timeout: 5000,
  routePatterns: [
    'server/routes/**/*.js',
    'server/api/**/*.js',
    'routes/**/*.js',
    'api/**/*.js',
    'server/**/*routes*.js',
    'server/**/*api*.js'
  ],
  frontendPaths: [
    'front-end/src',
    'frontend/src',
    'client/src',
    'src'
  ],
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '*.log'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class APIAuditor {
  constructor() {
    this.routes = new Map();
    this.testResults = new Map();
    this.usageAnalysis = new Map();
    this.stats = {
      totalRoutes: 0,
      workingRoutes: 0,
      errorRoutes: 0,
      unusedRoutes: 0,
      testedRoutes: 0
    };
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async discoverRouteFiles() {
    this.log('\n🔍 Discovering Route Files...', 'cyan');
    const routeFiles = [];

    for (const pattern of CONFIG.routePatterns) {
      try {
        const files = await this.globPattern(pattern);
        routeFiles.push(...files);
      } catch (error) {
        // Pattern might not match anything
      }
    }

    // Also scan server directory recursively for route-like files
    const serverDir = path.join(CONFIG.projectRoot, 'server');
    if (await this.fileExists(serverDir)) {
      const additionalFiles = await this.scanForRouteFiles(serverDir);
      routeFiles.push(...additionalFiles);
    }

    const uniqueFiles = [...new Set(routeFiles)];
    this.log(`Found ${uniqueFiles.length} potential route files`, 'green');
    
    return uniqueFiles;
  }

  async scanForRouteFiles(dir) {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (CONFIG.excludePatterns.some(pattern => entry.name.includes(pattern))) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.scanForRouteFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          // Check if file likely contains routes
          const content = await fs.readFile(fullPath, 'utf8');
          if (this.looksLikeRouteFile(content)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }

    return files;
  }

  looksLikeRouteFile(content) {
    const routeIndicators = [
      'router.',
      'app.get(',
      'app.post(',
      'app.put(',
      'app.delete(',
      'app.patch(',
      'express.Router',
      'route.get',
      'route.post',
      '/api/',
      'router.get',
      'router.post'
    ];

    return routeIndicators.some(indicator => content.includes(indicator));
  }

  async parseRouteFile(filePath) {
    this.log(`📄 Parsing: ${path.relative(CONFIG.projectRoot, filePath)}`, 'yellow');
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const routes = this.extractRoutes(content, filePath);
      
      for (const route of routes) {
        const key = `${route.method}:${route.path}`;
        if (!this.routes.has(key)) {
          this.routes.set(key, {
            ...route,
            file: filePath,
            relativePath: path.relative(CONFIG.projectRoot, filePath)
          });
        }
      }

      this.log(`  Found ${routes.length} routes`, 'green');
      return routes;
    } catch (error) {
      this.log(`  Error parsing file: ${error.message}`, 'red');
      return [];
    }
  }

  extractRoutes(content, filePath) {
    const routes = [];
    
    // Patterns to match Express.js route definitions
    const routePatterns = [
      // router.get('/path', handler)
      /(?:router|app|route)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // app.use('/path', handler)
      /(?:router|app)\.use\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // Explicit route objects or comments
      /\/\*\*[\s\S]*?@route\s+(\w+)\s+([^\s]+)/g
    ];

    const methodPatterns = [
      { pattern: /(?:router|app|route)\.get\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'GET' },
      { pattern: /(?:router|app|route)\.post\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'POST' },
      { pattern: /(?:router|app|route)\.put\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'PUT' },
      { pattern: /(?:router|app|route)\.delete\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'DELETE' },
      { pattern: /(?:router|app|route)\.patch\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'PATCH' },
      { pattern: /(?:router|app|route)\.all\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'ALL' },
      { pattern: /(?:router|app)\.use\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'USE' }
    ];

    for (const { pattern, method } of methodPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(content)) !== null) {
        const routePath = match[1];
        
        // Skip middleware-only routes (usually don't have specific paths)
        if (routePath === '/' && method === 'USE') continue;
        
        // Extract middleware and handler info
        const lineNumber = this.getLineNumber(content, match.index);
        const context = this.extractContext(content, match.index);
        
        routes.push({
          method: method,
          path: routePath,
          lineNumber,
          context,
          middleware: this.extractMiddleware(context),
          description: this.extractDescription(content, match.index)
        });
      }
    }

    return routes;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  extractContext(content, index) {
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, index);
    const start = Math.max(0, lineNumber - 3);
    const end = Math.min(lines.length, lineNumber + 2);
    
    return lines.slice(start, end).join('\n');
  }

  extractMiddleware(context) {
    const middlewarePattern = /(?:authenticate|authorize|validate|check|verify|cors|helmet|rateLimit)/gi;
    const matches = context.match(middlewarePattern) || [];
    return [...new Set(matches)];
  }

  extractDescription(content, index) {
    // Look for comments above the route
    const beforeRoute = content.substring(0, index);
    const lines = beforeRoute.split('\n');
    
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*')) {
        return line.replace(/^\/\/\s*|\*\s*/g, '');
      }
    }
    
    return '';
  }

  async analyzeUsage() {
    this.log('\n🔗 Analyzing Route Usage...', 'cyan');
    
    for (const [routeKey, route] of this.routes) {
      const usage = await this.findRouteUsage(route);
      this.usageAnalysis.set(routeKey, usage);
      
      if (usage.frontendReferences.length === 0 && usage.backendReferences.length === 0) {
        this.stats.unusedRoutes++;
      }
    }
  }

  async findRouteUsage(route) {
    const usage = {
      frontendReferences: [],
      backendReferences: [],
      totalReferences: 0
    };

    // Search patterns for this route
    const searchPatterns = [
      route.path,
      route.path.replace(/:\w+/g, '\\w+'), // Replace params with regex
      `"${route.path}"`,
      `'${route.path}'`,
      `\`${route.path}\``,
      route.path.replace(/^\/api/, '') // Sometimes API prefix is omitted
    ];

    // Search frontend
    for (const frontendPath of CONFIG.frontendPaths) {
      const fullPath = path.join(CONFIG.projectRoot, frontendPath);
      if (await this.fileExists(fullPath)) {
        for (const pattern of searchPatterns) {
          const references = await this.searchInDirectory(fullPath, pattern);
          usage.frontendReferences.push(...references);
        }
      }
    }

    // Search backend (excluding the definition file)
    const serverPath = path.join(CONFIG.projectRoot, 'server');
    if (await this.fileExists(serverPath)) {
      for (const pattern of searchPatterns) {
        const references = await this.searchInDirectory(serverPath, pattern);
        // Filter out the file where the route is defined
        const filteredRefs = references.filter(ref => ref.file !== route.file);
        usage.backendReferences.push(...filteredRefs);
      }
    }

    usage.totalReferences = usage.frontendReferences.length + usage.backendReferences.length;
    return usage;
  }

  async searchInDirectory(dir, pattern) {
    const references = [];
    
    try {
      // Use grep for faster searching
      const { stdout } = await execAsync(
        `grep -r -n -i "${pattern}" "${dir}" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.vue" 2>/dev/null || true`
      );
      
      const lines = stdout.trim().split('\n').filter(line => line);
      
      for (const line of lines) {
        const match = line.match(/^([^:]+):(\d+):(.+)$/);
        if (match) {
          references.push({
            file: match[1],
            lineNumber: parseInt(match[2]),
            content: match[3].trim(),
            relativePath: path.relative(CONFIG.projectRoot, match[1])
          });
        }
      }
    } catch (error) {
      // Grep might fail, that's okay
    }

    return references;
  }

  async testEndpoints() {
    this.log('\n🧪 Testing API Endpoints...', 'cyan');
    
    // Check if server is running
    const serverRunning = await this.checkServerHealth();
    if (!serverRunning) {
      this.log('⚠️  Server not responding - skipping endpoint tests', 'yellow');
      return;
    }

    for (const [routeKey, route] of this.routes) {
      if (route.method === 'USE') continue; // Skip middleware routes
      
      this.log(`Testing ${route.method} ${route.path}...`, 'yellow');
      
      const testResult = await this.testEndpoint(route);
      this.testResults.set(routeKey, testResult);
      this.stats.testedRoutes++;
      
      if (testResult.success) {
        this.stats.workingRoutes++;
        this.log(`  ✅ ${testResult.status}`, 'green');
      } else {
        this.stats.errorRoutes++;
        this.log(`  ❌ ${testResult.error}`, 'red');
      }
    }
  }

  async checkServerHealth() {
    try {
      const response = await this.makeRequest('GET', '/api/health', {});
      return response.success;
    } catch (error) {
      try {
        // Try root path
        const response = await this.makeRequest('GET', '/', {});
        return response.success;
      } catch (error) {
        return false;
      }
    }
  }

  async testEndpoint(route) {
    try {
      // Prepare test data based on method
      const testData = this.generateTestData(route);
      const response = await this.makeRequest(route.method, route.path, testData);
      
      return {
        success: true,
        status: response.statusCode,
        responseTime: response.responseTime,
        contentType: response.contentType,
        bodySize: response.bodySize
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.status || 'Unknown'
      };
    }
  }

  generateTestData(route) {
    // Replace route parameters with test values
    let testPath = route.path;
    testPath = testPath.replace(/:id/g, '1');
    testPath = testPath.replace(/:userId/g, '1');
    testPath = testPath.replace(/:(\w+)/g, 'test');
    
    const data = { path: testPath };
    
    // Add common test data for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      data.body = { test: true, timestamp: Date.now() };
      data.headers = { 'Content-Type': 'application/json' };
    }
    
    return data;
  }

  async makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const url = `${CONFIG.serverProtocol}://${CONFIG.serverHost}:${CONFIG.serverPort}${data.path || path}`;
      
      const options = {
        method,
        timeout: CONFIG.timeout,
        headers: data.headers || {}
      };

      const client = CONFIG.serverProtocol === 'https' ? https : http;
      
      const req = client.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            success: true,
            statusCode: res.statusCode,
            responseTime: Date.now() - startTime,
            contentType: res.headers['content-type'],
            bodySize: body.length,
            body: body.substring(0, 200) // First 200 chars
          });
        });
      });

      req.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          status: error.code
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          success: false,
          error: 'Request timeout',
          status: 'TIMEOUT'
        });
      });

      if (data.body) {
        req.write(JSON.stringify(data.body));
      }

      req.end();
    });
  }

  generateReport() {
    this.log('\n📊 API Audit Report', 'bright');
    this.log('='.repeat(50), 'cyan');

    // Statistics
    this.stats.totalRoutes = this.routes.size;
    this.log(`\n📈 Statistics:`, 'bright');
    this.log(`  Total Routes: ${this.stats.totalRoutes}`, 'white');
    this.log(`  Working Routes: ${this.stats.workingRoutes}`, 'green');
    this.log(`  Error Routes: ${this.stats.errorRoutes}`, 'red');
    this.log(`  Unused Routes: ${this.stats.unusedRoutes}`, 'yellow');
    this.log(`  Tested Routes: ${this.stats.testedRoutes}`, 'blue');

    // Route listing
    this.log(`\n📋 All Discovered Routes:`, 'bright');
    this.log('-'.repeat(80), 'cyan');

    const sortedRoutes = Array.from(this.routes.entries()).sort((a, b) => {
      const [, routeA] = a;
      const [, routeB] = b;
      return routeA.path.localeCompare(routeB.path);
    });

    for (const [routeKey, route] of sortedRoutes) {
      const usage = this.usageAnalysis.get(routeKey) || { totalReferences: 0 };
      const testResult = this.testResults.get(routeKey);
      
      let status = '❓';
      if (testResult) {
        status = testResult.success ? '✅' : '❌';
      }
      
      let usageIndicator = usage.totalReferences > 0 ? '🔗' : '⚪';
      
      this.log(`${status} ${usageIndicator} ${route.method.padEnd(6)} ${route.path}`, 'white');
      this.log(`    📁 ${route.relativePath}:${route.lineNumber}`, 'cyan');
      
      if (route.description) {
        this.log(`    💬 ${route.description}`, 'yellow');
      }
      
      if (route.middleware.length > 0) {
        this.log(`    🛡️  Middleware: ${route.middleware.join(', ')}`, 'magenta');
      }
      
      if (testResult && !testResult.success) {
        this.log(`    ⚠️  Error: ${testResult.error}`, 'red');
      }
      
      if (usage.totalReferences > 0) {
        this.log(`    🔗 ${usage.totalReferences} references (${usage.frontendReferences.length} frontend, ${usage.backendReferences.length} backend)`, 'green');
      } else {
        this.log(`    ⚪ No usage found - may be unused`, 'yellow');
      }
      
      this.log('', 'white');
    }

    // Unused routes
    if (this.stats.unusedRoutes > 0) {
      this.log(`\n⚠️  Potentially Unused Routes:`, 'yellow');
      this.log('-'.repeat(40), 'yellow');
      
      for (const [routeKey, route] of this.routes) {
        const usage = this.usageAnalysis.get(routeKey);
        if (usage && usage.totalReferences === 0) {
          this.log(`  ${route.method} ${route.path} (${route.relativePath})`, 'yellow');
        }
      }
    }

    // Error routes
    if (this.stats.errorRoutes > 0) {
      this.log(`\n❌ Routes with Errors:`, 'red');
      this.log('-'.repeat(40), 'red');
      
      for (const [routeKey, route] of this.routes) {
        const testResult = this.testResults.get(routeKey);
        if (testResult && !testResult.success) {
          this.log(`  ${route.method} ${route.path}: ${testResult.error}`, 'red');
        }
      }
    }

    this.log('\n✅ API Audit Complete!', 'green');
  }

  // Utility methods
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async globPattern(pattern) {
    // Simple glob implementation for basic patterns
    const basePath = pattern.split('*')[0];
    const extension = pattern.includes('*.js') ? '.js' : '';
    
    try {
      return await this.findFiles(basePath, extension);
    } catch {
      return [];
    }
  }

  async findFiles(dir, extension, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !CONFIG.excludePatterns.some(p => entry.name.includes(p))) {
          await this.findFiles(fullPath, extension, files);
        } else if (entry.isFile() && (!extension || entry.name.endsWith(extension))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory might not exist
    }
    
    return files;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testEndpoints = args.includes('--test-endpoints');
  const detailed = args.includes('--detailed');

  console.log(`${colors.bright}${colors.blue}🔍 API Audit Tool for OrthodoxMetrics${colors.reset}`);
  console.log(`${colors.cyan}Starting comprehensive API discovery and analysis...${colors.reset}\n`);

  const auditor = new APIAuditor();

  try {
    // Step 1: Discover route files
    const routeFiles = await auditor.discoverRouteFiles();
    
    if (routeFiles.length === 0) {
      auditor.log('❌ No route files found!', 'red');
      return;
    }

    // Step 2: Parse routes
    for (const file of routeFiles) {
      await auditor.parseRouteFile(file);
    }

    // Step 3: Analyze usage
    await auditor.analyzeUsage();

    // Step 4: Test endpoints (if requested)
    if (testEndpoints) {
      await auditor.testEndpoints();
    }

    // Step 5: Generate report
    auditor.generateReport();

  } catch (error) {
    auditor.log(`❌ Audit failed: ${error.message}`, 'red');
    if (detailed) {
      console.error(error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { APIAuditor }; 