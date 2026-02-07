/**
 * OMTrace Bridge Module
 * Connects the backend API to the omtrace engine
 * Handles analysis execution with proper path configuration
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import omtrace engine components
// These paths are relative to the server/src/tools directory
const frontEndToolsPath = path.resolve(__dirname, '../../../front-end/src/tools/omtrace');

/**
 * Run dependency analysis
 * @param {Object} options - Analysis options
 * @param {string} options.baseDir - Base directory (e.g., /var/www/orthodoxmetrics/prod)
 * @param {string} options.relativeRoot - Relative root (e.g., front-end/src)
 * @param {string} options.scanRoot - Resolved scan root path
 * @param {string[]} options.targets - Target components to analyze
 * @param {number} options.maxDepth - Maximum dependency depth (1-10)
 * @param {string} options.mode - 'full' or 'closure'
 * @param {Object} options.flags - Analysis flags
 * @returns {Promise<Object>} Analysis results
 */
export async function runAnalysis(options) {
  const {
    baseDir,
    relativeRoot,
    scanRoot,
    targets,
    maxDepth,
    mode,
    flags
  } = options;

  try {
    // Dynamically import the omtrace engine modules
    const { buildDependencyIndex } = await import(`${frontEndToolsPath}/build_index.ts`);
    const { traceDependencies } = await import(`${frontEndToolsPath}/core/tracer.ts`);
    const { resolveTarget } = await import(`${frontEndToolsPath}/core/resolver.ts`);

    // Build the dependency index for the scan root
    console.log(`[OMTrace] Building index for ${scanRoot} with maxDepth=${maxDepth}`);
    
    const indexOptions = {
      baseDir,
      relativeRoot,
      scanRoot,
      maxDepth,
      mode
    };
    
    const index = await buildDependencyIndex(scanRoot, indexOptions);
    
    console.log(`[OMTrace] Index built: ${index.nodes.length} files indexed`);

    // Analyze each target
    const results = [];
    
    for (const target of targets) {
      try {
        // Resolve target to actual file path(s)
        const candidates = await resolveTarget(target, index, scanRoot);
        
        if (candidates.length === 0) {
          results.push({
            entry: target,
            error: `No files found matching "${target}"`,
            status: 'not_found',
            candidates: []
          });
          continue;
        }
        
        if (candidates.length > 1) {
          // Multiple candidates found - return them for user selection
          results.push({
            entry: target,
            status: 'multiple_candidates',
            candidates: candidates.map(c => ({
              path: c.path,
              fullPath: c.fullPath,
              size: c.size
            })),
            message: `Found ${candidates.length} files matching "${target}". Please select one.`
          });
          continue;
        }
        
        // Single candidate - proceed with analysis
        const resolvedPath = candidates[0].path;
        
        console.log(`[OMTrace] Analyzing ${resolvedPath}`);
        
        const traceOptions = {
          reverse: flags.reverse || false,
          deep: flags.deep || false,
          showServer: true,
          maxDepth
        };
        
        const trace = await traceDependencies(resolvedPath, index, traceOptions);
        
        // Format result for UI
        const result = {
          entry: target,
          resolvedPath: trace.resolvedPath || resolvedPath,
          status: trace.status || 'ok',
          direct: trace.deps?.direct || [],
          transitive: trace.deps?.transitive || [],
          reverse: trace.deps?.reverse || [],
          api: extractApiEndpoints(trace.deps?.server || []),
          routes: [], // TODO: Extract from route analyzer
          guards: [], // TODO: Extract from route analyzer
          stats: {
            duration: 0, // TODO: Add timing
            cacheHit: false
          },
          metadata: {
            scanRoot,
            maxDepth,
            mode,
            filesIndexed: index.nodes.length,
            filesAnalyzed: 1
          }
        };
        
        results.push(result);
        
      } catch (error) {
        console.error(`[OMTrace] Error analyzing ${target}:`, error);
        results.push({
          entry: target,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    return {
      results,
      metadata: {
        scanRoot,
        baseDir,
        relativeRoot,
        maxDepth,
        mode,
        filesIndexed: index.nodes.length,
        targets: targets.length
      }
    };
    
  } catch (error) {
    console.error('[OMTrace] Analysis failed:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

/**
 * Extract API endpoints from server file paths
 */
function extractApiEndpoints(serverFiles) {
  return serverFiles.map(filePath => {
    // Extract endpoint info from file path
    // This is a simplified version - the real implementation would parse the files
    const match = filePath.match(/server\/src\/api\/([^/]+)\.js/);
    if (match) {
      return {
        method: 'GET', // TODO: Parse actual method
        path: `/api/${match[1]}`,
        file: filePath,
        line: 0 // TODO: Parse actual line number
      };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Find candidate files matching a target
 * This is a helper for the resolver
 */
export async function findCandidates(scanRoot, target) {
  const fs = await import('fs/promises');
  const candidates = [];
  
  const targetName = target.replace(/\.(tsx?|jsx?)$/, '');
  const targetLower = targetName.toLowerCase();
  
  async function searchDir(dirPath, relPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        
        const fullPath = path.join(dirPath, entry.name);
        const entryRelPath = path.join(relPath, entry.name);
        
        if (entry.isDirectory()) {
          await searchDir(fullPath, entryRelPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            const baseName = entry.name.replace(/\.(tsx?|jsx?)$/, '');
            
            if (baseName.toLowerCase() === targetLower || 
                baseName === targetName ||
                entryRelPath.includes(targetName)) {
              const stats = await fs.stat(fullPath);
              candidates.push({
                name: entry.name,
                path: entryRelPath,
                fullPath: fullPath,
                size: stats.size,
                modified: stats.mtime.toISOString()
              });
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await searchDir(scanRoot, '');
  
  return candidates;
}
