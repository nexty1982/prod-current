/**
 * Refactor Console Routes
 * 
 * Source: server/src/routes/refactorConsole.ts
 * Mount point: /api/refactor-console (mounted in server/src/index.ts)
 * 
 * Endpoints:
 * - GET /api/refactor-console/health - Health check
 * - GET /api/refactor-console/scan - Perform codebase scan
 * - POST /api/refactor-console/phase1/start - Start Phase 1 analysis job
 * - GET /api/refactor-console/jobs/:jobId - Get job status
 * - GET /api/refactor-console/jobs/:jobId/result - Get job result
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { Project } from 'ts-morph';

// Import glob with CommonJS compatibility
// glob v10+ exports as ESM, but TypeScript compiles to CommonJS
// Use require() directly to ensure CommonJS compatibility
const globModule = require('glob');
// Handle both ESM default export and CommonJS named export
const glob = globModule.glob || globModule.default?.glob || globModule.default || globModule;

// Defensive validation: ensure glob is a function
if (typeof glob !== 'function') {
  throw new Error(`glob import failed: expected function, got ${typeof glob}. Module keys: ${Object.keys(globModule).join(', ')}`);
}

const router = Router();

// Log router creation for debugging
console.log('[RefactorConsole] Router created, type:', typeof router);
console.log('[RefactorConsole] Router has use method:', typeof router.use === 'function');

// Health check endpoint - verify router is correctly mounted
// GET /api/refactor-console/health
const serverStartTime = Date.now();
router.get('/health', (req: Request, res: Response) => {
  const uptimeSec = Math.floor((Date.now() - serverStartTime) / 1000);
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    ok: true,
    service: 'refactor-console',
    ts: new Date().toISOString(),
    uptimeSec
  });
});

// Test route to verify router is working
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Refactor Console router is working', timestamp: new Date().toISOString() });
});

// Types for our scanner
type Classification = 'green' | 'orange' | 'yellow' | 'red';

interface UsageData {
  importRefs: number;
  serverRefs: number;
  routeRefs: number;
  runtimeHints: number;
  score: number;
}

interface SimilarityData {
  duplicates: string[];
  nearMatches: { target: string; similarity: number }[];
}

interface FileNode {
  path: string;
  relPath: string;
  type: 'file' | 'dir';
  size: number;
  mtimeMs: number;
  classification: Classification;
  reasons: string[];
  usage: UsageData;
  similarity?: SimilarityData;
  featurePathMatch: boolean;
  inDevelTree: boolean;
  // Recovery/Gap Analysis fields
  recoveryStatus?: 'missing_in_prod' | 'modified_since_backup' | 'new_file' | 'unchanged';
  backupPath?: string;
  hash?: string; // MD5 hash for comparison
}

interface ScanSummary {
  totalFiles: number;
  totalDirs: number;
  duplicates: number;
  likelyInProd: number;
  highRisk: number;
  inDevelopment: number;
  legacyOrDupes: number;
  // Recovery/Gap Analysis summary
  missingInProd?: number;
  modifiedSinceBackup?: number;
  newFiles?: number;
}

interface RefactorScan {
  generatedAt: string;
  root: string;
  summary: ScanSummary;
  nodes: FileNode[];
  // Gap Analysis metadata
  backupPath?: string;
  gapAnalysisEnabled?: boolean;
}

const PROJECT_ROOT = '/var/www/orthodoxmetrics/prod';
// September 2025 backup location - update this path if your backup is stored elsewhere
const BACKUP_ROOT = '/var/www/orthodoxmetrics/backup';
const CACHE_FILE = path.join(PROJECT_ROOT, '.analysis', 'refactor-scan.json');
const ANALYSIS_DIR = path.join(PROJECT_ROOT, '.analysis');

// Ensure .analysis directory exists
fs.ensureDirSync(ANALYSIS_DIR);

// Helper function to get file hash (for duplicate detection)
function getFileHash(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return '';
  }
}

// Perform gap analysis comparing current prod with backup
async function performGapAnalysis(
  currentFiles: FileNode[],
  backupDirPath: string = BACKUP_ROOT
): Promise<FileNode[]> {
  console.log(`Performing gap analysis with backup: ${backupDirPath}`);
  
  if (!fs.existsSync(backupDirPath)) {
    console.warn(`Backup directory not found: ${backupDirPath}`);
    return currentFiles;
  }

  // Scan backup directory
  const backupFiles: FileNode[] = [];
  const backupIncludePatterns = [
    path.join(backupDirPath, 'front-end/src/**'),
    path.join(backupDirPath, 'server/**')
  ];
  
  const excludePatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/.next/**',
    '**/build/**',
    '**/.cache/**'
  ];

  // Get all backup files
  const allBackupFiles: string[] = [];
  for (const pattern of backupIncludePatterns) {
    try {
      const files = await glob(pattern, {
        ignore: excludePatterns,
        absolute: true
      });
      allBackupFiles.push(...files);
    } catch (error) {
      console.error(`Error scanning backup ${pattern}:`, error);
    }
  }

  // Build backup file map by relative path
  const backupFileMap = new Map<string, { path: string; hash: string }>();
  for (const backupFilePath of allBackupFiles) {
    try {
      const stats = fs.statSync(backupFilePath);
      if (stats.isFile()) {
        const relPath = backupFilePath.replace(backupDirPath + '/', '');
        const hash = getFileHash(backupFilePath);
        backupFileMap.set(relPath, { path: backupFilePath, hash });
      }
    } catch (error) {
      console.error(`Error processing backup file ${backupFilePath}:`, error);
    }
  }

  console.log(`Found ${backupFileMap.size} files in backup`);

  // Create a map of current files by relative path
  const currentFileMap = new Map<string, FileNode>();
  currentFiles.forEach(file => {
    if (file.type === 'file') {
      currentFileMap.set(file.relPath, file);
    }
  });

  // Analyze each backup file
  const analyzedFiles: FileNode[] = [];
  const missingInProd: FileNode[] = [];
  const modifiedFiles: FileNode[] = [];
  const newFiles: FileNode[] = [];

  // Process backup files (find missing and modified)
  backupFileMap.forEach((backupFile, relPath) => {
    const currentFile = currentFileMap.get(relPath);
    
    if (!currentFile) {
      // File exists in backup but not in prod - MISSING
      const backupFullPath = backupFile.path;
      try {
        const stats = fs.statSync(backupFullPath);
        const missingFile: FileNode = {
          path: backupFullPath,
          relPath,
          type: 'file',
          size: stats.size || 0,
          mtimeMs: stats.mtimeMs,
          classification: 'orange', // High risk - missing file
          reasons: ['Missing in production - exists in backup'],
          usage: { importRefs: 0, serverRefs: 0, routeRefs: 0, runtimeHints: 0, score: 0 },
          featurePathMatch: relPath.includes('front-end/src/features/'),
          inDevelTree: relPath.includes('/features/devel-'),
          recoveryStatus: 'missing_in_prod',
          backupPath: backupFullPath,
          hash: backupFile.hash
        };
        missingInProd.push(missingFile);
        analyzedFiles.push(missingFile);
      } catch (error) {
        console.error(`Error processing missing file ${relPath}:`, error);
      }
    } else {
      // File exists in both - check if modified
      const currentHash = currentFile.hash || getFileHash(currentFile.path);
      if (currentHash !== backupFile.hash) {
        // MODIFIED since backup
        currentFile.recoveryStatus = 'modified_since_backup';
        currentFile.backupPath = backupFile.path;
        currentFile.hash = currentHash;
        modifiedFiles.push(currentFile);
      } else {
        // UNCHANGED
        currentFile.recoveryStatus = 'unchanged';
        currentFile.backupPath = backupFile.path;
        currentFile.hash = currentHash;
      }
      analyzedFiles.push(currentFile);
      currentFileMap.delete(relPath); // Remove from map
    }
  });

  // Remaining files in currentFileMap are NEW (exist in prod but not in backup)
  currentFileMap.forEach((file) => {
    file.recoveryStatus = 'new_file';
    file.hash = file.hash || getFileHash(file.path);
    newFiles.push(file);
    analyzedFiles.push(file);
  });

  console.log(`Gap Analysis Results:`);
  console.log(`  Missing in prod: ${missingInProd.length}`);
  console.log(`  Modified since backup: ${modifiedFiles.length}`);
  console.log(`  New files: ${newFiles.length}`);

  return analyzedFiles;
}

// Helper function to calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  // Handle edge cases
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Handle empty strings
  if (len1 === 0) return 0;
  if (len2 === 0) return 0;

  // Create matrix with proper initialization
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix (start from 1, not 0)
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  return 1 - (distance / Math.max(len1, len2));
}

// Analyze file usage by scanning TypeScript/JavaScript files
async function analyzeUsage(filePaths: string[]): Promise<Map<string, UsageData>> {
  const usageMap = new Map<string, UsageData>();
  
  // Initialize all files with zero usage
  filePaths.forEach(filePath => {
    usageMap.set(filePath, {
      importRefs: 0,
      serverRefs: 0,
      routeRefs: 0,
      runtimeHints: 0,
      score: 0
    });
  });

  const frontendFiles = filePaths.filter(p => p.includes('front-end/src'));
  const serverFiles = filePaths.filter(p => p.includes('server') && !p.includes('node_modules'));

  // Scan frontend files for imports and route references
  for (const filePath of frontendFiles) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        // Count import statements
        const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"];?/);
        if (importMatch) {
          const importedPath = importMatch[1];
          // Map relative imports to actual file paths
          if (importedPath.startsWith('./') || importedPath.startsWith('../')) {
            const resolved = path.resolve(path.dirname(filePath), importedPath);
            // Check for various extensions
            const extensions = ['', '.tsx', '.ts', '.js', '.jsx'];
            for (const ext of extensions) {
              const testPath = resolved + ext;
              if (filePaths.includes(testPath)) {
                const usage = usageMap.get(testPath);
                if (usage) {
                  usage.importRefs++;
                }
              }
            }
          }
        }

        // Look for router/menu references
        if (line.includes('Router') || line.includes('MenuItems') || line.includes('createBrowserRouter')) {
          const usage = usageMap.get(filePath);
          if (usage) {
            usage.routeRefs++;
          }
        }
      });
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
  }

  // Scan server files
  for (const filePath of serverFiles) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Count require() statements
      const requireMatches = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      if (requireMatches) {
        requireMatches.forEach(match => {
          const extracted = match.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
          if (extracted) {
            const filename = path.basename(extracted[1]);
            // Find files with this name
            serverFiles.forEach(serverFile => {
              if (path.basename(serverFile) === filename) {
                const usage = usageMap.get(serverFile);
                if (usage) {
                  usage.serverRefs++;
                }
              }
            });
          }
        });
      }

      // Check if it's a middleware or controller file
      if (filePath.includes('middleware') || filePath.includes('controller') || filePath.includes('routes')) {
        const usage = usageMap.get(filePath);
        if (usage) {
          usage.runtimeHints += 3; // High runtime importance
        }
      }
    } catch (error) {
      console.error(`Error analyzing server file ${filePath}:`, error);
    }
  }

  // Calculate scores for all files
  usageMap.forEach((usage, filePath) => {
    usage.score = usage.importRefs * 4 + usage.serverRefs * 3 + usage.routeRefs * 5 + usage.runtimeHints * 2;
  });

  return usageMap;
}

// Detect duplicates using file hashes
function detectDuplicates(filePaths: string[]): Map<string, string[]> {
  const hashGroups = new Map<string, string[]>();

  filePaths.forEach(filePath => {
    try {
      const hash = getFileHash(filePath);
      if (hash) {
        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, []);
        }
        hashGroups.get(hash)!.push(filePath);
      }
    } catch (error) {
      console.error(`Error hashing file ${filePath}:`, error);
    }
  });

  // Only return groups with more than one file (actual duplicates)
  const duplicates = new Map<string, string[]>();
  hashGroups.forEach((paths, hash) => {
    if (paths.length > 1) {
      paths.forEach(path => {
        duplicates.set(path, paths.filter(p => p !== path));
      });
    }
  });

  return duplicates;
}

// Detect near-duplicates using filename similarity
function detectNearDuplicates(filePaths: string[]): Map<string, { target: string; similarity: number }[]> {
  const nearDuplicates = new Map<string, { target: string; similarity: number }[]>();

  // Group by directory depth for similarity comparison
  const dirGroups = new Map<string, string[]>();
  filePaths.forEach(filePath => {
    const dirName = path.dirname(filePath);
    if (!dirGroups.has(dirName)) {
      dirGroups.set(dirName, []);
    }
    dirGroups.get(dirName)!.push(filePath);
  });

  dirGroups.forEach((filesInDir, dir) => {
    if (filesInDir.length > 1) {
      filesInDir.forEach(filePath => {
        const fileName = path.basename(filePath, path.extname(filePath));
        const nearMatches = filesInDir
          .filter(otherFile => otherFile !== filePath)
          .map(otherFile => ({
            target: otherFile,
            similarity: calculateSimilarity(fileName, path.basename(otherFile, path.extname(otherFile)))
          }))
          .filter(match => match.similarity >= 0.85) // High similarity threshold
          .sort((a, b) => b.similarity - a.similarity);

        if (nearMatches.length > 0) {
          nearDuplicates.set(filePath, nearMatches);
        }
      });
    }
  });

  return nearDuplicates;
}

// Classify files based on various heuristics
function classifyFile(
  filePath: string,
  usage: UsageData,
  duplicates: string[],
  nearMatches: { target: string; similarity: number }[],
  mtimeMs: number
): { classification: Classification; reasons: string[] } {
  const reasons: string[] = [];
  let classification: Classification = 'green';

  const fileName = path.basename(filePath);
  const relativePath = filePath.replace(PROJECT_ROOT, '');
  const isInFrontendFeatures = relativePath.includes('/front-end/src/features/');
  const isInDevelTree = relativePath.includes('/features/devel-') || 
                       relativePath.includes('/features/demos/') ||
                       relativePath.includes('/features/examples/') ||
                       relativePath.includes('/features/sandbox/');
  
  // Check for legacy patterns
  const hasLegacyPattern = /legacy|old|backup|-copy|\.bak|\.old/i.test(fileName) ||
                           relativePath.includes('/legacy/') ||
                           relativePath.includes('/old/') ||
                           relativePath.includes('/backup/');

  // Red classification (legacy/duplicate)
  if (hasLegacyPattern || duplicates.length > 0 || nearMatches.some(m => m.similarity >= 0.9)) {
    classification = 'red';
    if (hasLegacyPattern) reasons.push('Legacy file pattern detected');
    if (duplicates.length > 0) reasons.push(`Exact duplicate of ${duplicates.length} file(s)`);
    if (nearMatches.some(m => m.similarity >= 0.9)) reasons.push('Near-duplicate detected');
    return { classification, reasons };
  }

  // Yellow classification (development/low usage)
  if (isInDevelTree || (usage.score < 3 && mtimeMs > Date.now() - 14 * 24 * 60 * 60 * 1000)) {
    classification = 'yellow';
    if (isInDevelTree) reasons.push('In development tree');
    if (usage.score < 3) reasons.push('Low usage score');
    if (mtimeMs > Date.now() - 14 * 24 * 60 * 60 * 1000) reasons.push('Recently modified');
    return { classification, reasons };
  }

  // Orange classification (high risk)
  if (usage.score >= 6 || filePath.includes('/auth/') || filePath.includes('/middleware/') || 
      relativePath.includes('/src/layouts/') || relativePath.includes('/src/components/auth/')) {
    classification = 'orange';
    if (usage.score >= 6) reasons.push('High usage score');
    if (filePath.includes('/auth/')) reasons.push('Authentication-related');
    if (filePath.includes('/middleware/')) reasons.push('Server middleware');
    return { classification, reasons };
  }

  // Green classification (likely production)
  if (isInFrontendFeatures && usage.score >= 5 && usage.routeRefs > 0) {
    classification = 'green';
    reasons.push('In production features');
    reasons.push('High usage score');
    reasons.push('Referenced in routes/menu');
    return { classification, reasons };
  }

  // Default to orange for unclear cases
  classification = 'orange';
  reasons.push('Unclassified - manual review needed');

  return { classification, reasons };
}

// Main scanning function
async function performScan(rebuild: boolean = false, compareWithBackup: boolean = false): Promise<RefactorScan> {
  // Defensive validation: ensure glob is a function at scan entry point
  if (typeof glob !== 'function') {
    throw new Error('glob import failed: expected function');
  }
  
  // Check cache first
  if (!rebuild && fs.existsSync(CACHE_FILE)) {
    const stats = fs.statSync(CACHE_FILE);
    const ageMs = Date.now() - stats.mtimeMs;
    
    // Cache is valid for 10 minutes
    if (ageMs < 10 * 60 * 1000) {
      console.log('Using cached analysis data');
      return fs.readJsonSync(CACHE_FILE);
    }
  }

  console.log('Performing fresh scan...');

  const includePatterns = [
    '/var/www/orthodoxmetrics/prod/front-end/src/**',
    '/var/www/orthodoxmetrics/prod/server/**'
  ];

  const excludePatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/.next/**',
    '**/build/**',
    '**/.cache/**',
    '**/coverage/**',
    '**/.nyc_output/**'
  ];

  // Get all files
  const allFiles: string[] = [];
  for (const pattern of includePatterns) {
    try {
      const files = await glob(pattern, {
        ignore: excludePatterns,
        absolute: true
      });
      allFiles.push(...files);
    } catch (error) {
      console.error(`Error scanning ${pattern}:`, error);
    }
  }

  console.log(`Found ${allFiles.length} files to analyze`);

  // Analyze usage patterns
  console.log('Analyzing usage patterns...');
  const usageMap = await analyzeUsage(allFiles);

  // Detect duplicates
  console.log('Detecting duplicates...');
  const duplicatesMap = detectDuplicates(allFiles);

  // Detect near-duplicates
  console.log('Detecting near-duplicates...');
  const nearDuplicatesMap = detectNearDuplicates(allFiles);

  // Build file nodes
  console.log('Building file tree...');
  const nodes: FileNode[] = [];

  for (const filePath of allFiles) {
    try {
      const stats = fs.statSync(filePath);
      const relPath = filePath.replace(PROJECT_ROOT + '/', '');
      const usage = usageMap.get(filePath) || {
        importRefs: 0, serverRefs: 0, routeRefs: 0, runtimeHints: 0, score: 0
      };
      
      const duplicates = duplicatesMap.get(filePath) || [];
      const nearMatches = nearDuplicatesMap.get(filePath) || [];
      
      const { classification, reasons } = classifyFile(filePath, usage, duplicates, nearMatches, stats.mtimeMs);

      const node: FileNode = {
        path: filePath,
        relPath,
        type: stats.isDirectory() ? 'dir' : 'file',
        size: stats.size || 0,
        mtimeMs: stats.mtimeMs,
        classification,
        reasons,
        usage,
        similarity: duplicates.length > 0 || nearMatches.length > 0 ? {
          duplicates,
          nearMatches
        } : undefined,
        featurePathMatch: relPath.includes('front-end/src/features/'),
        inDevelTree: relPath.includes('/features/devel-') || 
                     relPath.includes('/features/demos/') ||
                     relPath.includes('/features/examples/') ||
                     relPath.includes('/features/sandbox/'),
        hash: stats.isFile() ? getFileHash(filePath) : undefined
      };

      nodes.push(node);
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  // Perform gap analysis if requested
  let finalNodes = nodes;
  if (compareWithBackup) {
    console.log('Performing gap analysis with backup...');
    finalNodes = await performGapAnalysis(nodes);
  }

  // Calculate summary statistics
  const summary: ScanSummary = {
    totalFiles: finalNodes.filter(n => n.type === 'file').length,
    totalDirs: finalNodes.filter(n => n.type === 'dir').length,
    duplicates: duplicatesMap.size,
    likelyInProd: finalNodes.filter(n => n.classification === 'green').length,
    highRisk: finalNodes.filter(n => n.classification === 'orange').length,
    inDevelopment: finalNodes.filter(n => n.classification === 'yellow').length,
    legacyOrDupes: finalNodes.filter(n => n.classification === 'red').length
  };

  // Add recovery statistics if gap analysis was performed
  if (compareWithBackup) {
    summary.missingInProd = finalNodes.filter(n => n.recoveryStatus === 'missing_in_prod').length;
    summary.modifiedSinceBackup = finalNodes.filter(n => n.recoveryStatus === 'modified_since_backup').length;
    summary.newFiles = finalNodes.filter(n => n.recoveryStatus === 'new_file').length;
  }

  const scanResult: RefactorScan = {
    generatedAt: new Date().toISOString(),
    root: PROJECT_ROOT,
    summary,
    nodes: finalNodes,
    backupPath: compareWithBackup ? BACKUP_ROOT : undefined,
    gapAnalysisEnabled: compareWithBackup
  };

  // Cache the result
  fs.writeJsonSync(CACHE_FILE, scanResult, { spaces: 2 });
  console.log(`Analysis complete. Cached to ${CACHE_FILE}`);

  return scanResult;
}

// API endpoint
router.get('/scan', async (req: Request, res: Response) => {
  try {
    const rebuild = req.query.rebuild === '1';
    const compareWithBackup = req.query.compareWithBackup === '1';
    const scanResult = await performScan(rebuild, compareWithBackup);
    
    res.json(scanResult);
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
      error: 'Scan failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restore file from backup endpoint
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { relPath } = req.body;
    
    if (!relPath) {
      return res.status(400).json({ error: 'relPath is required' });
    }

    const backupFilePath = path.join(BACKUP_ROOT, relPath);
    const prodFilePath = path.join(PROJECT_ROOT, relPath);

    // Verify backup file exists
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Ensure target directory exists
    const targetDir = path.dirname(prodFilePath);
    fs.ensureDirSync(targetDir);

    // Copy file from backup to prod
    fs.copySync(backupFilePath, prodFilePath);

    res.json({ 
      success: true, 
      message: `File restored: ${relPath}`,
      restoredPath: prodFilePath
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ 
      error: 'Restore failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Phase 1: Discovery & Gap Analysis endpoint - Start background job
// Helper function to load phase1 service
function loadPhase1Service(): any {
  try {
    return require('../services/phase1RecoveryAnalysis');
  } catch (e) {
    try {
      return require('../../dist/src/services/phase1RecoveryAnalysis');
    } catch (e2) {
      throw new Error(`Failed to load phase1RecoveryAnalysis service: ${e2 instanceof Error ? e2.message : 'Unknown error'}`);
    }
  }
}

// Phase 1: Start background job
router.post('/phase1/start', async (req: Request, res: Response) => {
  console.log('[Phase1] Route handler called for POST /api/refactor-console/phase1/start');
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const phase1Service = loadPhase1Service();
    
    if (!phase1Service || !phase1Service.startPhase1Analysis) {
      return res.status(500).json({ 
        ok: false,
        error: 'startPhase1Analysis function not found in service'
      });
    }
    
    const jobId = phase1Service.startPhase1Analysis();
    console.log(`[Phase1] Started job ${jobId}`);
    
    // Return 202 Accepted with jobId
    res.status(202).json({ 
      ok: true,
      jobId,
      status: 'queued',
      message: 'Phase 1 analysis job queued'
    });
  } catch (error) {
    console.error('[Phase1] Error starting job:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false,
        error: 'Failed to start Phase 1 analysis', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Phase 1: Get job status
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log(`[Phase1] Route handler called for GET /api/refactor-console/jobs/${jobId}`);
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const phase1Service = loadPhase1Service();
    
    if (!phase1Service || !phase1Service.getJobStatus) {
      return res.status(500).json({ 
        ok: false,
        error: 'getJobStatus function not found in service'
      });
    }
    
    const job = phase1Service.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ 
        ok: false,
        error: 'Job not found',
        jobId
      });
    }
    
    // Ensure response always has valid structure
    const response = {
      ok: true,
      jobId: job.jobId || jobId,
      status: job.status || 'queued',
      progress: job.progress ?? 0,
      currentStep: job.currentStep || '',
      error: job.error || null,
      startedAt: job.startedAt || null,
      finishedAt: job.finishedAt || null
      // Note: result is NOT included in status endpoint - use /result endpoint
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[Phase1] Error getting job ${jobId} status:`, error);
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false,
        error: 'Failed to get job status', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Phase 1: Get job result
router.get('/jobs/:jobId/result', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log(`[Phase1] Route handler called for GET /api/refactor-console/jobs/${jobId}/result`);
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const phase1Service = loadPhase1Service();
    
    if (!phase1Service || !phase1Service.getJob) {
      return res.status(500).json({ 
        ok: false,
        error: 'getJob function not found in service'
      });
    }
    
    const job = phase1Service.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ 
        ok: false,
        error: 'Job not found',
        jobId
      });
    }
    
    if (job.status === 'done' && job.result) {
      // Validate result structure before sending
      const result = job.result;
      if (!result || typeof result !== 'object') {
        console.error(`[Phase1] Invalid result structure for job ${jobId}`);
        return res.status(500).json({ 
          ok: false,
          error: 'Invalid result structure',
          jobId
        });
      }
      
      // Ensure all required fields exist
      const validatedResult = {
        generatedAt: result.generatedAt || new Date().toISOString(),
        sourcePath: result.sourcePath || '',
        targetPath: result.targetPath || '',
        summary: {
          totalFilesInSource: result.summary?.totalFilesInSource ?? 0,
          missingInTarget: result.summary?.missingInTarget ?? 0,
          modifiedInTarget: result.summary?.modifiedInTarget ?? 0,
          identical: result.summary?.identical ?? 0,
          existsOnlyInTarget: result.summary?.existsOnlyInTarget ?? 0
        },
        restorableFiles: Array.isArray(result.restorableFiles) ? result.restorableFiles : [],
        modifiedFiles: Array.isArray(result.modifiedFiles) ? result.modifiedFiles : [],
        documentation: {
          endpointsFound: result.documentation?.endpointsFound ?? 0,
          endpointsVerified: result.documentation?.endpointsVerified ?? 0,
          endpointsMissing: result.documentation?.endpointsMissing ?? 0
        },
        files: Array.isArray(result.files) ? result.files : [],
        integrationPoints: {
          menuItems: result.integrationPoints?.menuItems || null,
          router: result.integrationPoints?.router || null
        }
      };
      
      console.log(`[Phase1] Returning validated result for job ${jobId}, missingInTarget: ${validatedResult.summary.missingInTarget}`);
      return res.json({ 
        ok: true,
        ...validatedResult
      });
    } else if (job.status === 'error') {
      return res.status(500).json({ 
        ok: false,
        error: job.error || 'Job failed',
        jobId
      });
    } else {
      // Job not ready yet
      return res.status(409).json({ 
        ok: false,
        error: 'Job not ready',
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        jobId
      });
    }
  } catch (error) {
    console.error(`[Phase1] Error getting job ${jobId} result:`, error);
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false,
        error: 'Failed to get job result', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Phase 1: Get latest job status (convenience endpoint)
// GET /api/refactor-console/phase1-status
router.get('/phase1-status', async (req: Request, res: Response) => {
  console.log('[Phase1] Route handler called for GET /api/refactor-console/phase1-status');
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const phase1Service = loadPhase1Service();
    
    if (!phase1Service || !phase1Service.getLatestJobStatus) {
      return res.status(500).json({ 
        ok: false,
        error: 'getLatestJobStatus function not found in service'
      });
    }
    
    const job = phase1Service.getLatestJobStatus();
    
    if (!job) {
      return res.json({ 
        ok: true,
        hasJob: false,
        message: 'No Phase 1 analysis job has been started yet'
      });
    }
    
    // Build response with all job information
    const response: any = {
      ok: true,
      hasJob: true,
      jobId: job.jobId,
      status: job.status || 'queued',
      progress: job.progress ?? 0,
      currentStep: job.currentStep || '',
      error: job.error || null,
      startedAt: job.startedAt || null,
      finishedAt: job.finishedAt || null
    };
    
    // Include result summary if job is done
    if (job.status === 'done' && job.result) {
      response.resultSummary = {
        totalFilesInSource: job.result.summary?.totalFilesInSource ?? 0,
        missingInTarget: job.result.summary?.missingInTarget ?? 0,
        modifiedInTarget: job.result.summary?.modifiedInTarget ?? 0,
        identical: job.result.summary?.identical ?? 0,
        restorableFilesCount: job.result.restorableFiles?.length ?? 0
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('[Phase1] Error getting latest job status:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false,
        error: 'Failed to get Phase 1 status', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Backward-compatible: GET /phase1-analysis (starts job and returns jobId)
router.get('/phase1-analysis', async (req: Request, res: Response) => {
  console.log('[Phase1] Route handler called for GET /api/refactor-console/phase1-analysis (backward-compatible)');
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const phase1Service = loadPhase1Service();
    
    if (!phase1Service || !phase1Service.startPhase1Analysis) {
      return res.status(500).json({ 
        ok: false,
        error: 'startPhase1Analysis function not found in service'
      });
    }
    
    const jobId = phase1Service.startPhase1Analysis();
    console.log(`[Phase1] Started job ${jobId} (via backward-compatible endpoint)`);
    
    // Return 202 Accepted with jobId (backward-compatible format)
    res.status(202).json({ 
      ok: true,
      jobId,
      status: 'started',
      message: 'Phase 1 analysis started in background. Poll /api/refactor-console/jobs/' + jobId + ' for status.'
    });
  } catch (error) {
    console.error('[Phase1] Error starting analysis:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false,
        error: 'Failed to start Phase 1 analysis', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Restore bundle endpoint
router.post('/restore-bundle', async (req: Request, res: Response) => {
  try {
    const { bundleFiles, routePath, menuLabel, menuIcon } = req.body;
    
    if (!bundleFiles || !Array.isArray(bundleFiles) || bundleFiles.length === 0) {
      return res.status(400).json({ 
        error: 'bundleFiles is required and must be a non-empty array' 
      });
    }
    
    // Import the bundle restore service
    let bundleService: any;
    try {
      bundleService = require('../services/bundleRestoreService');
    } catch (e) {
      bundleService = require('../../dist/src/services/bundleRestoreService');
    }
    
    const result = await bundleService.restoreBundle({
      bundleFiles,
      routePath,
      menuLabel,
      menuIcon
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Bundle restore error:', error);
    res.status(500).json({ 
      error: 'Bundle restore failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Export router using CommonJS format for Express compatibility
// This ensures Express always sees a Router function, not an Object
console.log('[RefactorConsole] Exporting router, type:', typeof router);
console.log('[RefactorConsole] Router stack length:', router.stack.length);
module.exports = router;
