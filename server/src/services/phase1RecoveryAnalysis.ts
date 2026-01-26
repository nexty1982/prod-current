/**
 * Phase 1: Discovery & Gap Analysis Service
 * 
 * Performs one-way mapping from backup (refactor-src) to live (front-end/src)
 * with documentation-augmented validation and dependency checking.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

// Handle ts-morph import (may not be available)
let Project: any;
try {
  const tsMorph = require('ts-morph');
  Project = tsMorph.Project;
} catch (error) {
  console.warn('ts-morph not available, AST analysis will be limited');
}

// Handle glob import
let globFn: any;
try {
  const globModule = require('glob');
  if (typeof globModule.glob === 'function') {
    globFn = globModule.glob;
  } else if (typeof globModule.default === 'function') {
    globFn = globModule.default;
  } else if (typeof globModule === 'function') {
    globFn = globModule;
  } else {
    globFn = globModule.sync || globModule.globSync || globModule;
  }
} catch (error) {
  console.error('glob module not found');
  throw new Error('glob module required for Phase 1 analysis');
}

const PROJECT_ROOT = '/var/www/orthodoxmetrics/prod';
const BACKUP_SOURCE = path.join(PROJECT_ROOT, 'refactor-src');
const LIVE_TARGET = path.join(PROJECT_ROOT, 'front-end/src');
const DOCS_ROOT = path.join(PROJECT_ROOT, 'docs');
const SERVER_ROUTES = path.join(PROJECT_ROOT, 'server/src/routes');

// Job state management for async analysis
interface JobState {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  currentStep: string;
  result: Phase1Report | null;
  error: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

// In-memory job registry
const jobRegistry = new Map<string, JobState>();

// Track the latest job ID for easy status checking
let latestJobId: string | null = null;

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `phase1-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new job
 */
function createJob(): string {
  const jobId = generateJobId();
  const job: JobState = {
    jobId,
    status: 'queued',
    progress: 0,
    currentStep: 'Queued',
    result: null,
    error: null,
    startedAt: null,
    finishedAt: null
  };
  jobRegistry.set(jobId, job);
  latestJobId = jobId; // Track latest job
  console.log(`[Phase1] Created job ${jobId}`);
  return jobId;
}

/**
 * Get the latest job status (convenience function)
 */
function getLatestJobStatus(): JobState | null {
  if (!latestJobId) return null;
  return jobRegistry.get(latestJobId) || null;
}

/**
 * Get job by ID
 */
function getJob(jobId: string): JobState | null {
  return jobRegistry.get(jobId) || null;
}

/**
 * Update job state
 */
function updateJob(jobId: string, updates: Partial<JobState>): void {
  const job = jobRegistry.get(jobId);
  if (job) {
    Object.assign(job, updates);
    console.log(`[Phase1] Job ${jobId} updated: status=${updates.status || job.status}, progress=${updates.progress ?? job.progress}%`);
  }
}

interface FileComparison {
  relPath: string;
  sourcePath: string;
  targetPath: string | null;
  sourceHash: string;
  targetHash: string | null;
  status: 'missing_in_target' | 'modified_in_target' | 'identical' | 'exists_only_in_target';
  size: number;
  mtimeMs: number;
}

interface ImportDependency {
  importPath: string;
  resolved: boolean;
  resolvedPath: string | null;
  error: string | null;
}

interface EndpointReference {
  method: string;
  path: string;
  foundInDocs: string[]; // File paths where found
  existsInServer: boolean;
  routeFile: string | null;
}

interface ASTIntegrationPoint {
  file: string;
  type: 'MenuItems' | 'Router';
  lineNumber: number;
  codeBlock: string;
}

interface FileAnalysis {
  file: FileComparison;
  imports: ImportDependency[];
  endpoints: EndpointReference[];
  integrationPoints: ASTIntegrationPoint[];
}

interface Phase1Report {
  generatedAt: string;
  sourcePath: string;
  targetPath: string;
  summary: {
    totalFilesInSource: number;
    missingInTarget: number;
    modifiedInTarget: number;
    identical: number;
    existsOnlyInTarget: number;
  };
  restorableFiles: FileComparison[];
  modifiedFiles: FileComparison[];
  documentation: {
    endpointsFound: number;
    endpointsVerified: number;
    endpointsMissing: number;
  };
  files: FileAnalysis[];
  integrationPoints: {
    menuItems: ASTIntegrationPoint | null;
    router: ASTIntegrationPoint | null;
  };
}

/**
 * Get MD5 hash of a file
 */
function getFileHash(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Scan backup source directory and compare with live target
 */
async function compareDirectories(): Promise<FileComparison[]> {
  const comparisons: FileComparison[] = [];
  
  if (!fs.existsSync(BACKUP_SOURCE)) {
    console.warn(`Backup source directory not found: ${BACKUP_SOURCE}`);
    return comparisons;
  }
  
  // Get all files from backup source
  let sourceFiles: string[] = [];
  try {
    const result = globFn('**/*', {
      cwd: BACKUP_SOURCE,
      absolute: false,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.next/**', '**/build/**']
    });
    
    if (result && typeof result.then === 'function') {
      sourceFiles = await result;
    } else {
      sourceFiles = result || [];
    }
  } catch (error) {
    console.error('Error scanning backup source:', error);
    return comparisons;
  }

  // Create a map of target files
  const targetFiles = new Map<string, string>();
  if (fs.existsSync(LIVE_TARGET)) {
    try {
      let targetFileList: string[] = [];
      const result = globFn('**/*', {
        cwd: LIVE_TARGET,
        absolute: false,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.next/**', '**/build/**']
      });
      
      if (result && typeof result.then === 'function') {
        targetFileList = await result;
      } else {
        targetFileList = result || [];
      }
      
      targetFileList.forEach(relPath => {
        try {
          const fullPath = path.join(LIVE_TARGET, relPath);
          if (fs.statSync(fullPath).isFile()) {
            targetFiles.set(relPath, fullPath);
          }
        } catch (error) {
          // Skip if can't stat
        }
      });
    } catch (error) {
      console.error('Error scanning live target:', error);
    }
  }

  // Compare each source file
  for (const relPath of sourceFiles) {
    const sourcePath = path.join(BACKUP_SOURCE, relPath);
    
    try {
      const stats = fs.statSync(sourcePath);
      if (!stats.isFile()) continue;

      const sourceHash = getFileHash(sourcePath);
      const targetPath = targetFiles.get(relPath) || null;
      let targetHash: string | null = null;
      let status: FileComparison['status'] = 'missing_in_target';

      if (targetPath && fs.existsSync(targetPath)) {
        targetHash = getFileHash(targetPath);
        if (sourceHash === targetHash) {
          status = 'identical';
        } else {
          status = 'modified_in_target'; // Target has different content - protect it
        }
      } else {
        status = 'missing_in_target';
      }

      comparisons.push({
        relPath,
        sourcePath,
        targetPath,
        sourceHash,
        targetHash,
        status,
        size: stats.size,
        mtimeMs: stats.mtimeMs
      });
    } catch (error) {
      console.error(`Error processing ${relPath}:`, error);
    }
  }

  // Find files that exist only in target (not in backup)
  targetFiles.forEach((targetPath, relPath) => {
    if (!comparisons.find(c => c.relPath === relPath)) {
      try {
        const stats = fs.statSync(targetPath);
        const targetHash = getFileHash(targetPath);
        comparisons.push({
          relPath,
          sourcePath: path.join(BACKUP_SOURCE, relPath), // Doesn't exist but for consistency
          targetPath,
          sourceHash: '',
          targetHash,
          status: 'exists_only_in_target',
          size: stats.size,
          mtimeMs: stats.mtimeMs
        });
      } catch (error) {
        // Skip if can't read
      }
    }
  });

  return comparisons;
}

/**
 * Extract API endpoints from documentation files
 * @param jobId - Optional job ID for progress tracking
 */
async function scanDocumentationForEndpoints(jobId?: string): Promise<EndpointReference[]> {
  const endpoints = new Map<string, EndpointReference>();
  
  if (!fs.existsSync(DOCS_ROOT)) {
    return [];
  }

  // Find all markdown files
  let docFiles: string[] = [];
  try {
    const result = globFn('**/*.md', {
      cwd: DOCS_ROOT,
      absolute: true
    });
    
    if (result && typeof result.then === 'function') {
      docFiles = await result;
    } else {
      docFiles = result || [];
    }
  } catch (error) {
    console.error('Error scanning documentation:', error);
    return [];
  }

  // Patterns to match API endpoints
  const endpointPatterns = [
    /(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:{}]+)/gi,
    /`(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:{}]+)`/gi,
    /##\s*API\s+Reference[^#]*(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:{}]+)/gi,
    /Endpoint[:\s]+(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:{}]+)/gi
  ];

  // Process files in parallel with concurrency limit (50 at a time)
  const CONCURRENCY_LIMIT = 50;
  const processFile = async (docFile: string): Promise<void> => {
    try {
      const content = fs.readFileSync(docFile, 'utf8');
      
      for (const pattern of endpointPatterns) {
        let match;
        // Reset regex lastIndex to avoid issues with global regex
        pattern.lastIndex = 0;
        while ((match = pattern.exec(content)) !== null) {
          const fullMatch = match[0];
          const methodMatch = fullMatch.match(/(GET|POST|PUT|DELETE|PATCH)/i);
          const pathMatch = match[1] || fullMatch.replace(/[`\s]/g, '').replace(/^(GET|POST|PUT|DELETE|PATCH)/i, '');
          
          if (methodMatch && pathMatch) {
            const method = methodMatch[0].toUpperCase();
            const endpointPath = pathMatch.trim();
            const key = `${method} ${endpointPath}`;
            
            if (!endpoints.has(key)) {
              endpoints.set(key, {
                method,
                path: endpointPath,
                foundInDocs: [],
                existsInServer: false,
                routeFile: null
              });
            }
            
            endpoints.get(key)!.foundInDocs.push(path.relative(DOCS_ROOT, docFile));
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${docFile}:`, error);
    }
  };

  // Process files in batches
  for (let i = 0; i < docFiles.length; i += CONCURRENCY_LIMIT) {
    const batch = docFiles.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(batch.map(processFile));
    
      // Update progress if jobId provided
      if (jobId) {
        const progress = Math.min(20 + Math.floor((i / docFiles.length) * 20), 40);
        updateJob(jobId, {
          progress,
          currentStep: `Scanning documentation (${i + batch.length}/${docFiles.length} files)`
        });
      }
  }

  return Array.from(endpoints.values());
}

/**
 * Verify if endpoints exist in server routes
 */
async function verifyEndpointsInServer(endpoints: EndpointReference[]): Promise<void> {
  if (!fs.existsSync(SERVER_ROUTES)) {
    return;
  }

  // Get all route files
  let routeFiles: string[] = [];
  try {
    const result = globFn('**/*.{js,ts}', {
      cwd: SERVER_ROUTES,
      absolute: true
    });
    
    if (result && typeof result.then === 'function') {
      routeFiles = await result;
    } else {
      routeFiles = result || [];
    }
  } catch (error) {
    console.error('Error scanning server routes:', error);
    return;
  }

  // Read all route files and check for endpoint definitions
  const routeContents = new Map<string, string>();
  for (const routeFile of routeFiles) {
    try {
      const content = fs.readFileSync(routeFile, 'utf8');
      routeContents.set(routeFile, content);
    } catch (error) {
      console.error(`Error reading route file ${routeFile}:`, error);
    }
  }

  // Check each endpoint
  for (const endpoint of endpoints) {
    const searchPatterns = [
      new RegExp(`router\\.(get|post|put|delete|patch)\\s*\\(\\s*['"]${endpoint.path.replace(/:/g, '\\:')}`, 'i'),
      new RegExp(`app\\.(get|post|put|delete|patch)\\s*\\(\\s*['"]${endpoint.path.replace(/:/g, '\\:')}`, 'i'),
      new RegExp(`['"]${endpoint.path.replace(/:/g, '\\:')}['"]`, 'i')
    ];

    for (const [routeFile, content] of routeContents.entries()) {
      for (const pattern of searchPatterns) {
        if (pattern.test(content)) {
          endpoint.existsInServer = true;
          endpoint.routeFile = path.relative(PROJECT_ROOT, routeFile);
          break;
        }
      }
      if (endpoint.existsInServer) break;
    }
  }
}

/**
 * Analyze imports using ts-morph
 */
async function analyzeImports(filePath: string, relPath: string): Promise<ImportDependency[]> {
  const dependencies: ImportDependency[] = [];
  
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return dependencies;
  }

  if (!Project) {
    // Fallback: simple regex-based import extraction
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        dependencies.push({
          importPath,
          resolved: false, // Can't resolve without ts-morph
          resolvedPath: null,
          error: 'ts-morph not available'
        });
      }
    } catch (error) {
      console.error(`Error analyzing imports for ${filePath}:`, error);
    }
    return dependencies;
  }

  try {
    let project: any;
    let sourceFile: any;
    
    try {
      project = new Project({
        tsConfigFilePath: path.join(PROJECT_ROOT, 'front-end/tsconfig.json'),
        skipAddingFilesFromTsConfig: true
      });
    } catch (projectError) {
      console.error(`Error creating ts-morph Project for ${filePath}:`, projectError);
      throw projectError;
    }

    try {
      sourceFile = project.addSourceFileAtPath(filePath);
    } catch (sourceFileError) {
      console.error(`Error adding source file ${filePath} to project:`, sourceFileError);
      throw sourceFileError;
    }
    
    // Get all imports
    const imports = sourceFile.getImportDeclarations();
    const sourceFilePath = sourceFile.getFilePath();
    
    for (const importDecl of imports) {
      try {
        // DEFENSIVE: Verify import declaration exists and is valid
        if (!importDecl) {
          console.warn(`[Skip] Null import declaration in ${sourceFilePath}`);
          continue;
        }

        // DEFENSIVE: Get module specifier node with extra protection
        let specifierNode: any;
        try {
          specifierNode = importDecl.getModuleSpecifier();
        } catch (specifierError) {
          console.warn(`[Skip] Failed to get module specifier in ${sourceFilePath}:`, specifierError);
          dependencies.push({
            importPath: '<specifier-error>',
            resolved: false,
            resolvedPath: null,
            error: 'Failed to get module specifier'
          });
          continue;
        }

        // DEFENSIVE: Check the kind before calling getter methods to avoid InvalidOperationError
        // This is critical for handling dynamic imports like: import(variable)
        if (!specifierNode) {
          console.warn(`[Skip] Null specifier node in ${sourceFilePath}`);
          dependencies.push({
            importPath: '<null-specifier>',
            resolved: false,
            resolvedPath: null,
            error: 'Null module specifier'
          });
          continue;
        }

        // DEFENSIVE: Check kind name with try-catch
        let kindName: string;
        try {
          kindName = specifierNode.getKindName();
        } catch (kindError) {
          console.warn(`[Skip] Failed to get kind name in ${sourceFilePath}:`, kindError);
          dependencies.push({
            importPath: '<kind-error>',
            resolved: false,
            resolvedPath: null,
            error: 'Failed to get kind name'
          });
          continue;
        }

        if (kindName !== 'StringLiteral') {
          console.warn(`[Skip] Non-string literal import (kind: ${kindName}) in ${sourceFilePath}`);
          dependencies.push({
            importPath: '<dynamic>',
            resolved: false,
            resolvedPath: null,
            error: `Dynamic or non-string import (kind: ${kindName}) - cannot analyze`
          });
          continue;
        }

        // DEFENSIVE: Get module specifier value with extra protection
        let moduleSpecifier: string;
        try {
          moduleSpecifier = importDecl.getModuleSpecifierValue();
        } catch (valueError) {
          console.warn(`[Skip] Failed to get module specifier value in ${sourceFilePath}:`, valueError);
          dependencies.push({
            importPath: '<value-error>',
            resolved: false,
            resolvedPath: null,
            error: 'Failed to get module specifier value'
          });
          continue;
        }
        let resolved = false;
        let resolvedPath: string | null = null;
        let error: string | null = null;

        try {
          // Try to resolve the import
          if (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')) {
            // Relative import
            const baseDir = path.dirname(filePath);
            const resolvedPathAbs = path.resolve(baseDir, moduleSpecifier);
          
          // Check if file exists (try common extensions)
          const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
          let found = false;
          for (const ext of extensions) {
            const testPath = resolvedPathAbs + ext;
            if (fs.existsSync(testPath)) {
              resolvedPath = path.relative(PROJECT_ROOT, testPath);
              resolved = true;
              found = true;
              break;
            }
          }
          
          // Check for directory index files
          if (!found) {
            for (const ext of extensions) {
              const testPath = path.join(resolvedPathAbs, `index${ext}`);
              if (fs.existsSync(testPath)) {
                resolvedPath = path.relative(PROJECT_ROOT, testPath);
                resolved = true;
                break;
              }
            }
          }
        } else {
          // Node module or alias import - check if it resolves
          // For now, assume node_modules imports resolve
          if (!moduleSpecifier.startsWith('@/')) {
            resolved = true; // Assume node_modules resolve
            resolvedPath = `node_modules/${moduleSpecifier}`;
          } else {
            // Alias import - try to resolve
            const aliasPath = moduleSpecifier.replace('@/', '');
            const testPath = path.join(LIVE_TARGET, aliasPath);
            const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
            for (const ext of extensions) {
              if (fs.existsSync(testPath + ext)) {
                resolvedPath = path.relative(PROJECT_ROOT, testPath + ext);
                resolved = true;
                break;
              }
            }
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
      }

      dependencies.push({
        importPath: moduleSpecifier,
        resolved,
        resolvedPath,
        error
      });
      } catch (err) {
        // Catch errors from getModuleSpecifier() or getModuleSpecifierValue()
        console.error(`[Error] Skipping individual import in ${sourceFilePath}:`, err instanceof Error ? err.message : 'Unknown error');
        dependencies.push({
          importPath: '<parse-error>',
          resolved: false,
          resolvedPath: null,
          error: err instanceof Error ? err.message : 'Unknown error parsing import'
        });
      }
    }
  } catch (error) {
    console.error(`Error analyzing imports for ${filePath}:`, error);
    // Return partial results with error indicator
    if (dependencies.length === 0) {
      dependencies.push({
        importPath: '<analysis-error>',
        resolved: false,
        resolvedPath: null,
        error: error instanceof Error ? error.message : 'Unknown error during import analysis'
      });
    }
  }

  return dependencies;
}

/**
 * Find AST integration points (MenuItems and Router)
 */
async function findIntegrationPoints(): Promise<{
  menuItems: ASTIntegrationPoint | null;
  router: ASTIntegrationPoint | null;
}> {
  const menuItemsPath = path.join(LIVE_TARGET, 'layouts/full/vertical/sidebar/MenuItems.ts');
  const routerPath = path.join(LIVE_TARGET, 'routes/Router.tsx');

  let menuItems: ASTIntegrationPoint | null = null;
  let router: ASTIntegrationPoint | null = null;

  // Find MenuItems array
  if (fs.existsSync(menuItemsPath)) {
    try {
      const content = fs.readFileSync(menuItemsPath, 'utf8');
      
      if (Project) {
        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(menuItemsPath);
        
        // Look for array declarations or exports
        const arrays = sourceFile.getVariableDeclarations().filter(v => {
          const name = v.getName();
          return name.toLowerCase().includes('menu') || name.toLowerCase().includes('items');
        });

        if (arrays.length > 0) {
          const array = arrays[0];
          const lineNumber = array.getStartLineNumber();
          const codeBlock = array.getText();
          
          menuItems = {
            file: path.relative(PROJECT_ROOT, menuItemsPath),
            type: 'MenuItems',
            lineNumber,
            codeBlock: codeBlock.substring(0, 500) // First 500 chars
          };
        }
      } else {
        // Fallback: regex-based search
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/export\s+(const|let|var)\s+\w*[Mm]enu\w*[Ii]tems/)) {
            menuItems = {
              file: path.relative(PROJECT_ROOT, menuItemsPath),
              type: 'MenuItems',
              lineNumber: i + 1,
              codeBlock: lines.slice(i, Math.min(i + 20, lines.length)).join('\n').substring(0, 500)
            };
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing MenuItems:`, error);
    }
  }

  // Find Router array/component
  if (fs.existsSync(routerPath)) {
    try {
      const content = fs.readFileSync(routerPath, 'utf8');
      
      if (Project) {
        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(routerPath);
        
        // Look for Route components or route arrays
        const SyntaxKind = require('ts-morph').SyntaxKind;
        const routeElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
        
        // Also check for arrays
        const arrays = sourceFile.getVariableDeclarations().filter(v => {
          const name = v.getName();
          return name.toLowerCase().includes('route');
        });

        if (arrays.length > 0 || routeElements.length > 0) {
          const lineNumber = arrays.length > 0 ? arrays[0].getStartLineNumber() : routeElements[0].getStartLineNumber();
          const codeBlock = arrays.length > 0 ? arrays[0].getText() : routeElements[0].getText();
          
          router = {
            file: path.relative(PROJECT_ROOT, routerPath),
            type: 'Router',
            lineNumber,
            codeBlock: codeBlock.substring(0, 500) // First 500 chars
          };
        }
      } else {
        // Fallback: regex-based search
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/export\s+(const|let|var|default|function)\s+\w*[Rr]oute/)) {
            router = {
              file: path.relative(PROJECT_ROOT, routerPath),
              type: 'Router',
              lineNumber: i + 1,
              codeBlock: lines.slice(i, Math.min(i + 20, lines.length)).join('\n').substring(0, 500)
            };
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing Router:`, error);
    }
  }

  return { menuItems, router };
}

/**
 * Main Phase 1 analysis function
 * Wrapped in comprehensive error handling to always return valid JSON
 * @param jobId - Optional job ID for progress tracking
 */
async function performPhase1Analysis(jobId?: string): Promise<Phase1Report> {
  console.log(`[Phase1] Starting Phase 1: Discovery & Gap Analysis${jobId ? ` (job ${jobId})` : ''}...`);
  
  // Update job state if jobId provided
  if (jobId) {
    updateJob(jobId, {
      status: 'running',
      progress: 0,
      currentStep: 'Initializing...',
      result: null,
      error: null,
      startedAt: Date.now()
    });
  }

  // Initialize default values for partial results
  let comparisons: FileComparison[] = [];
  let restorableFiles: FileComparison[] = [];
  let modifiedFiles: FileComparison[] = [];
  let identicalFiles: FileComparison[] = [];
  let existsOnlyInTarget: FileComparison[] = [];
  let endpoints: EndpointReference[] = [];
  let endpointsVerified = 0;
  let endpointsMissing = 0;
  let fileAnalyses: FileAnalysis[] = [];
  let integrationPoints: { menuItems: ASTIntegrationPoint | null; router: ASTIntegrationPoint | null } = {
    menuItems: null,
    router: null
  };

  // Step 1: Compare directories
  try {
    console.log('Step 1: Comparing directories...');
    if (jobId) updateJob(jobId, { currentStep: 'Step 1: Comparing directories...', progress: 5 });
    comparisons = await compareDirectories();
    
    restorableFiles = comparisons.filter(f => f.status === 'missing_in_target');
    modifiedFiles = comparisons.filter(f => f.status === 'modified_in_target');
    identicalFiles = comparisons.filter(f => f.status === 'identical');
    existsOnlyInTarget = comparisons.filter(f => f.status === 'exists_only_in_target');
    if (jobId) updateJob(jobId, { progress: 20 });
  } catch (error) {
    console.error('Error in Step 1 (directory comparison):', error);
    console.warn('Continuing with empty file list...');
  }

  // Step 2: Scan documentation for endpoints
  try {
    console.log('Step 2: Scanning documentation for API endpoints...');
    if (jobId) updateJob(jobId, { currentStep: 'Step 2: Scanning documentation...' });
    endpoints = await scanDocumentationForEndpoints(jobId);
    if (jobId) updateJob(jobId, { progress: 40 });
  } catch (error) {
    console.error('Error in Step 2 (documentation scanning):', error);
    console.warn('Continuing with empty endpoint list...');
  }
  
  // Step 3: Verify endpoints in server
  try {
    console.log('Step 3: Verifying endpoints in server routes...');
    if (jobId) updateJob(jobId, { currentStep: 'Step 3: Verifying endpoints...' });
    await verifyEndpointsInServer(endpoints);
    if (jobId) updateJob(jobId, { progress: 50 });
  } catch (error) {
    console.error('Error in Step 3 (endpoint verification):', error);
    console.warn('Continuing without endpoint verification...');
  }

  endpointsVerified = endpoints.filter(e => e.existsInServer).length;
  endpointsMissing = endpoints.filter(e => !e.existsInServer).length;

  // Step 4: Analyze imports for restorable files
  console.log('Step 4: Analyzing imports for restorable files...');
  if (jobId) updateJob(jobId, { currentStep: `Step 4: Analyzing imports (0/${restorableFiles.length} files)...` });
  
  try {
    let processedCount = 0;
    for (const file of restorableFiles) {
      processedCount++;
      if (jobId) {
        updateJob(jobId, {
          currentStep: `Step 4: Analyzing imports (${processedCount}/${restorableFiles.length} files)...`,
          progress: 50 + Math.floor((processedCount / restorableFiles.length) * 30)
        });
      }
      try {
        const imports = await analyzeImports(file.sourcePath, file.relPath);
        
        // Find endpoints referenced in this file (if any)
        const fileEndpoints = endpoints.filter(e => 
          e.foundInDocs.some(doc => doc.includes(file.relPath))
        );

        fileAnalyses.push({
          file,
          imports,
          endpoints: fileEndpoints,
          integrationPoints: []
        });
      } catch (fileError) {
        // Log error but continue processing other files
        console.error(`Error analyzing imports for ${file.relPath}:`, fileError);
        fileAnalyses.push({
          file,
          imports: [{
            importPath: '<error>',
            resolved: false,
            resolvedPath: null,
            error: fileError instanceof Error ? fileError.message : 'Unknown error during import analysis'
          }],
          endpoints: [],
          integrationPoints: []
        });
      }
    }
  } catch (stepError) {
    // Log error but return partial results
    console.error('Error in Step 4 (import analysis):', stepError);
    console.warn('Continuing with partial results...');
  }

  // Step 5: Find integration points
  try {
    console.log('Step 5: Finding integration points...');
    if (jobId) updateJob(jobId, { currentStep: 'Step 5: Finding integration points...', progress: 80 });
    integrationPoints = await findIntegrationPoints();
  } catch (error) {
    console.error('Error in Step 5 (integration points):', error);
    console.warn('Continuing without integration points...');
  }

  // Generate report (always succeeds, even with partial data)
  if (jobId) updateJob(jobId, { currentStep: 'Generating report...', progress: 90 });
  const report: Phase1Report = {
    generatedAt: new Date().toISOString(),
    sourcePath: BACKUP_SOURCE,
    targetPath: LIVE_TARGET,
    summary: {
      totalFilesInSource: comparisons.filter(f => f.status !== 'exists_only_in_target').length,
      missingInTarget: restorableFiles.length,
      modifiedInTarget: modifiedFiles.length,
      identical: identicalFiles.length,
      existsOnlyInTarget: existsOnlyInTarget.length
    },
    restorableFiles,
    modifiedFiles,
    documentation: {
      endpointsFound: endpoints.length,
      endpointsVerified,
      endpointsMissing
    },
    files: fileAnalyses,
    integrationPoints
  };

  console.log(`[Phase1] Phase 1 analysis complete!${jobId ? ` (job ${jobId})` : ''}`);
  console.log(`  Restorable files: ${restorableFiles.length}`);
  console.log(`  Modified files: ${modifiedFiles.length}`);
  console.log(`  Endpoints found: ${endpoints.length}`);
  console.log(`  Endpoints verified: ${endpointsVerified}`);

  // Update job state if jobId provided
  if (jobId) {
    updateJob(jobId, {
      status: 'done',
      progress: 100,
      currentStep: 'Complete',
      result: report,
      finishedAt: Date.now()
    });
  }

  return report;
}

/**
 * Start Phase 1 analysis in background
 * @returns jobId
 */
function startPhase1Analysis(): string {
  const jobId = createJob();
  
  // Run analysis in background
  setImmediate(async () => {
    try {
      updateJob(jobId, {
        status: 'running',
        progress: 0,
        currentStep: 'Starting...',
        startedAt: Date.now()
      });
      
      await performPhase1Analysis(jobId);
      
      const job = getJob(jobId);
      if (job) {
        updateJob(jobId, {
          status: 'done',
          progress: 100,
          currentStep: 'Complete',
          finishedAt: Date.now()
        });
      }
    } catch (error) {
      console.error(`[Phase1] Background analysis error for job ${jobId}:`, error);
      updateJob(jobId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        finishedAt: Date.now()
      });
    }
  });
  
  return jobId;
}

/**
 * Get job status by ID
 */
function getJobStatus(jobId: string): JobState | null {
  return getJob(jobId);
}

// Export for use in routes
module.exports = {
  performPhase1Analysis,
  startPhase1Analysis,
  getJobStatus,
  getJob,
  getLatestJobStatus
};
