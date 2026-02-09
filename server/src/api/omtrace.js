/**
 * OMTrace API Endpoints
 * Provides backend support for the OMTrace Console UI
 * Handles dependency analysis, file tree scanning, and refactoring operations
 *
 * Self-contained: all analysis logic is inline (no external bridge needed)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { requireAuth } = require('../middleware/auth');

// Security: Allowed base directories
const ALLOWED_BASE_DIRS = [
  '/var/www/orthodoxmetrics/prod',
  '/var/www/orthodoxmetrics'
];

const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache'];
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

// ─── Path validation ────────────────────────────────────────────────────────

function validatePath(baseDir, relativePath) {
  const isAllowedBase = ALLOWED_BASE_DIRS.some(allowed =>
    baseDir === allowed || baseDir.startsWith(allowed + '/')
  );
  if (!isAllowedBase) {
    throw new Error('Base directory not allowed. Must be within /var/www/orthodoxmetrics/');
  }
  if (relativePath.includes('..')) {
    throw new Error('Path traversal detected. Relative path cannot contain ".."');
  }
  const fullPath = path.resolve(baseDir, relativePath);
  if (!fullPath.startsWith(path.resolve(baseDir))) {
    throw new Error('Resolved path escapes base directory');
  }
  return fullPath;
}

function validateDepth(depth) {
  const numDepth = parseInt(depth, 10);
  if (isNaN(numDepth) || numDepth < 1 || numDepth > 10) {
    throw new Error('Depth must be a number between 1 and 10');
  }
  return numDepth;
}

// ─── Dependency index builder ───────────────────────────────────────────────

/**
 * Recursively collect all source files under a directory
 */
async function collectSourceFiles(dirPath) {
  const files = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && SOURCE_EXTS.includes(path.extname(entry.name))) {
        files.push(full);
      }
    }
  }

  await walk(dirPath);
  return files;
}

/**
 * Extract import paths from a source file using regex
 */
function extractImports(content, filePath) {
  const imports = [];
  // Matches: import ... from '...', export { } from '...', export * from '...'
  const re = /(?:import|export)\s+(?:.*?\s+from\s+|type\s+.*?\s+from\s+|\*\s+from\s+|\{[^}]*\}\s+from\s+)['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const importPath = m[1];
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Resolve relative import to absolute then normalise
      const resolved = path.resolve(path.dirname(filePath), importPath);
      imports.push(resolved);
    }
  }
  return [...new Set(imports)];
}

/**
 * Normalise an absolute file path to a project-relative id.
 * front-end files → "src/...", server files → "server/src/..."
 */
function normalizeId(filePath, baseDir) {
  if (filePath.includes('/front-end/src/')) {
    const idx = filePath.indexOf('/front-end/src/');
    return filePath.substring(idx + 15); // strip "/front-end/src/"  →  "features/..."
  }
  if (filePath.includes('/server/src/')) {
    const idx = filePath.indexOf('/server/src/');
    return 'server/' + filePath.substring(idx + 1); // → "server/src/..."
  }
  // Fallback: relative to baseDir
  return path.relative(baseDir, filePath);
}

/**
 * Build a dependency index: { nodes: [{ id, imports, kind, mtime }], ... }
 */
async function buildDependencyIndex(scanRoot, baseDir) {
  const startMs = Date.now();

  // Scan both front-end and server trees
  const projectRoot = baseDir; // e.g. /var/www/orthodoxmetrics/prod
  const serverSrc = path.join(projectRoot, 'server', 'src');

  const [feFiles, srvFiles] = await Promise.all([
    collectSourceFiles(scanRoot),
    fsSync.existsSync(serverSrc) ? collectSourceFiles(serverSrc) : Promise.resolve([])
  ]);

  const allFiles = [...feFiles, ...srvFiles];
  const nodes = [];
  let tsCount = 0;

  for (const filePath of allFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stat = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.ts' || ext === '.tsx') tsCount++;

      const rawImports = extractImports(content, filePath);
      // Normalise import paths to ids
      const normImports = rawImports.map(p => normalizeId(p, baseDir));
      const id = normalizeId(filePath, baseDir);

      nodes.push({
        id,
        imports: normImports,
        kind: ext.replace('.', ''),
        mtime: stat.mtime.getTime(),
        _fullPath: filePath // kept for server-endpoint analysis
      });
    } catch {
      // skip unreadable files
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    root: scanRoot,
    stats: { files: nodes.length, ts: tsCount, buildMs: Date.now() - startMs },
    nodes,
    metadata: { baseDir, scanRoot }
  };
}

// ─── Target resolver ────────────────────────────────────────────────────────

/**
 * Score and resolve a target name to matching index nodes
 */
function resolveTarget(target, index) {
  const candidateKey = path.basename(target, path.extname(target));
  const candidateKeyLower = candidateKey.toLowerCase();

  // Exact path match first
  const exact = index.nodes.find(n =>
    n.id === target || n.id.endsWith('/' + target) ||
    n.id.endsWith('/' + target + '.tsx') || n.id.endsWith('/' + target + '.ts')
  );
  if (exact) return [{ path: exact.id, fullPath: exact._fullPath, score: 20000 }];

  const candidates = [];
  for (const node of index.nodes) {
    const nodeBase = path.basename(node.id, path.extname(node.id));
    let score = 0;

    if (nodeBase === candidateKey) score += 10000;
    else if (nodeBase.toLowerCase() === candidateKeyLower) score += 9000;
    else if (nodeBase.toLowerCase().includes(candidateKeyLower)) score += 50;
    else continue; // skip totally unrelated files

    if (node.id.includes('/components/')) score += 200;
    for (const d of ['church', 'user', 'record', 'dashboard', 'admin']) {
      if (node.id.includes(d)) { score += 100; break; }
    }
    score -= node.id.split('/').length * 10;

    candidates.push({ path: node.id, fullPath: node._fullPath, score });
  }

  candidates.sort((a, b) => b.score - a.score || a.path.length - b.path.length);
  return candidates.slice(0, 10);
}

// ─── Dependency tracer ──────────────────────────────────────────────────────

function traceDependencies(targetId, index, flags, maxDepth) {
  const nodeMap = new Map();
  for (const n of index.nodes) nodeMap.set(n.id, n);

  const targetNode = nodeMap.get(targetId);
  if (!targetNode) throw new Error(`Target not found in index: ${targetId}`);

  // Direct imports (resolve to closest matching id in index)
  const directImports = resolveImportIds(targetNode.imports, nodeMap);

  // Reverse imports
  const reverseImports = [];
  if (flags.reverse) {
    for (const n of index.nodes) {
      if (n.id !== targetId && n.imports) {
        const resolved = resolveImportIds(n.imports, nodeMap);
        if (resolved.includes(targetId)) reverseImports.push(n.id);
      }
    }
  }

  // Transitive dependencies
  const transitiveImports = [];
  if (flags.deep) {
    const visited = new Set([targetId]);
    const queue = [...directImports];
    let depth = 0;
    let nextLevel = [];
    let remaining = queue.length;

    while (queue.length > 0 && depth < maxDepth) {
      const current = queue.shift();
      remaining--;
      if (visited.has(current)) { if (remaining === 0 && nextLevel.length) { queue.push(...nextLevel); remaining = nextLevel.length; nextLevel = []; depth++; } continue; }
      visited.add(current);
      transitiveImports.push(current);

      const node = nodeMap.get(current);
      if (node && node.imports) {
        const resolved = resolveImportIds(node.imports, nodeMap);
        nextLevel.push(...resolved.filter(id => !visited.has(id)));
      }
      if (remaining === 0 && nextLevel.length) {
        queue.push(...nextLevel);
        remaining = nextLevel.length;
        nextLevel = [];
        depth++;
      }
    }
  }

  // Server endpoints (scan target file content for API calls)
  const serverEndpoints = findServerEndpoints(targetNode, index);

  return {
    entry: targetId,
    resolvedPath: targetId,
    status: 'ok',
    direct: directImports,
    transitive: transitiveImports,
    reverse: reverseImports,
    api: serverEndpoints,
    routes: [],
    guards: [],
    stats: { duration: 0, cacheHit: false },
    metadata: {
      scanRoot: index.root,
      maxDepth,
      filesIndexed: index.nodes.length
    }
  };
}

/**
 * Given raw import ids (which may lack extensions), find the best match in the nodeMap
 */
function resolveImportIds(rawImports, nodeMap) {
  const resolved = [];
  for (const imp of rawImports) {
    if (nodeMap.has(imp)) { resolved.push(imp); continue; }
    // Try with extensions
    for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js']) {
      if (nodeMap.has(imp + ext)) { resolved.push(imp + ext); break; }
    }
  }
  return resolved;
}

/**
 * Look for API call patterns in a file's content and map to server files
 */
function findServerEndpoints(targetNode, index) {
  const endpoints = [];
  if (!targetNode._fullPath) return endpoints;

  let content;
  try {
    content = fsSync.readFileSync(targetNode._fullPath, 'utf-8');
  } catch {
    return endpoints;
  }

  // Match patterns like .post('/api/...'), apiClient.get('/...'), fetch('/api/...')
  const urlRe = /(?:\.(?:get|post|put|delete|patch)|apiClient\.(?:get|post|put|delete|patch)|fetch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let m;
  while ((m = urlRe.exec(content)) !== null) {
    const url = m[1];
    if (!url.startsWith('/')) continue;
    // Find server files that reference this endpoint
    for (const node of index.nodes) {
      if (!node.id.startsWith('server/')) continue;
      try {
        const srvContent = fsSync.readFileSync(node._fullPath, 'utf-8');
        if (srvContent.includes(url) || srvContent.includes(`'${url}'`) || srvContent.includes(`"${url}"`)) {
          endpoints.push({
            method: (m[0].match(/\.(get|post|put|delete|patch)/i) || ['', 'GET'])[1].toUpperCase(),
            path: url,
            file: node.id,
            line: 0
          });
        }
      } catch {
        // skip
      }
    }
  }

  return endpoints;
}

// ─── Route handlers ─────────────────────────────────────────────────────────

/**
 * POST /api/omtrace/analyze
 */
router.post('/analyze', requireAuth, async (req, res) => {
  const userRole = req.user?.role || req.session?.user?.role;
  if (!['admin', 'super_admin'].includes(userRole)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const { baseDir, relativeRoot, targets, maxDepth, mode = 'closure', flags = {} } = req.body;

    if (!baseDir || !relativeRoot || !targets || !Array.isArray(targets)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: baseDir, relativeRoot, targets'
      });
    }

    const scanRoot = validatePath(baseDir, relativeRoot);
    const validatedDepth = validateDepth(maxDepth || 5);

    try { await fs.access(scanRoot); } catch {
      return res.status(400).json({ success: false, error: `Scan root does not exist: ${scanRoot}` });
    }

    // Build dependency index (self-contained, no bridge needed)
    console.log(`[OMTrace] Building index for ${scanRoot}`);
    const index = await buildDependencyIndex(scanRoot, baseDir);
    console.log(`[OMTrace] Index built: ${index.nodes.length} files indexed in ${index.stats.buildMs}ms`);

    // Analyze each target
    const results = [];
    for (const target of targets) {
      try {
        const candidates = resolveTarget(target, index);
        if (candidates.length === 0) {
          results.push({ entry: target, error: `No files found matching "${target}"`, status: 'not_found', candidates: [] });
          continue;
        }
        if (candidates.length > 1 && candidates[0].score < 10000) {
          results.push({
            entry: target,
            status: 'multiple_candidates',
            candidates: candidates.map(c => ({ path: c.path, score: c.score })),
            message: `Found ${candidates.length} files matching "${target}". Please select one.`
          });
          continue;
        }

        const resolvedId = candidates[0].path;
        console.log(`[OMTrace] Analyzing ${resolvedId}`);
        const trace = traceDependencies(resolvedId, index, flags, validatedDepth);
        results.push(trace);
      } catch (err) {
        console.error(`[OMTrace] Error analyzing ${target}:`, err);
        results.push({ entry: target, error: err.message, status: 'error' });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        metadata: {
          scanRoot, baseDir, relativeRoot,
          maxDepth: validatedDepth, mode,
          filesIndexed: index.nodes.length,
          targets: targets.length
        }
      }
    });

  } catch (error) {
    console.error('OMTrace analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/omtrace/tree
 */
router.post('/tree', requireAuth, async (req, res) => {
  const userRole = req.user?.role || req.session?.user?.role;
  if (!['admin', 'super_admin'].includes(userRole)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const { baseDir, relativeRoot, maxDepth = 5 } = req.body;
    if (!baseDir || !relativeRoot) {
      return res.status(400).json({ success: false, error: 'Missing required fields: baseDir, relativeRoot' });
    }

    const scanRoot = validatePath(baseDir, relativeRoot);
    try { await fs.access(scanRoot); } catch {
      return res.status(400).json({ success: false, error: `Scan root does not exist: ${scanRoot}` });
    }

    const tree = await buildFileTree(scanRoot, relativeRoot, maxDepth);

    res.json({
      success: true,
      data: {
        root: relativeRoot,
        scanRoot,
        nodes: tree,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('File tree scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'File tree scan failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/omtrace/candidates
 */
router.post('/candidates', requireAuth, async (req, res) => {
  const userRole = req.user?.role || req.session?.user?.role;
  if (!['admin', 'super_admin'].includes(userRole)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const { baseDir, relativeRoot, target } = req.body;
    if (!baseDir || !relativeRoot || !target) {
      return res.status(400).json({ success: false, error: 'Missing required fields: baseDir, relativeRoot, target' });
    }

    const scanRoot = validatePath(baseDir, relativeRoot);
    const candidates = await findCandidates(scanRoot, relativeRoot, target);

    res.json({
      success: true,
      data: { target, candidates, count: candidates.length }
    });
  } catch (error) {
    console.error('Candidate search error:', error);
    res.status(500).json({ success: false, error: error.message || 'Candidate search failed' });
  }
});

// ─── File tree / candidate helpers (unchanged) ─────────────────────────────

async function buildFileTree(dirPath, relativePath, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  const nodes = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        const children = await buildFileTree(fullPath, relPath, maxDepth, currentDepth + 1);
        nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
          const stats = await fs.stat(fullPath);
          nodes.push({ name: entry.name, path: relPath, type: 'file', size: stats.size, modified: stats.mtime.toISOString() });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  return nodes;
}

async function findCandidates(scanRoot, relativePath, target) {
  const candidates = [];
  const targetName = target.replace(/\.(tsx?|jsx?)$/, '');
  const targetLower = targetName.toLowerCase();

  async function searchDir(dirPath, relPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
        const fullPath = path.join(dirPath, entry.name);
        const entryRelPath = path.join(relPath, entry.name);

        if (entry.isDirectory()) {
          await searchDir(fullPath, entryRelPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (SOURCE_EXTS.includes(ext)) {
            const baseName = entry.name.replace(/\.(tsx?|jsx?)$/, '');
            if (baseName.toLowerCase() === targetLower || baseName === targetName || entryRelPath.includes(targetName)) {
              const stats = await fs.stat(fullPath);
              candidates.push({ name: entry.name, path: entryRelPath, fullPath, size: stats.size, modified: stats.mtime.toISOString() });
            }
          }
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  await searchDir(scanRoot, relativePath);
  return candidates;
}

module.exports = router;
