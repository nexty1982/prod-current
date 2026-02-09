/**
 * Site Structure Scanner API
 * Scans the frontend src/ directory, parses imports, and returns a graph of file relationships.
 * Used by the Site Structure Visualizer at /tools/site-structure
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole } = require('../../middleware/auth');

const FRONTEND_SRC = path.resolve(__dirname, '../../../../front-end/src');

// File type classification
function classifyFile(relPath) {
  const lc = relPath.toLowerCase();
  const base = path.basename(relPath, path.extname(relPath));
  
  if (lc.includes('/routes/') || base === 'Router') return 'route';
  if (lc.includes('/layouts/')) return 'layout';
  if (lc.includes('/store/') || lc.includes('Store') || lc.includes('store.ts')) return 'store';
  if (base.startsWith('use') && !lc.includes('/pages/')) return 'hook';
  if (lc.includes('/hooks/')) return 'hook';
  if (lc.includes('/api/') || lc.includes('ApiService') || lc.includes('apiService') || lc.includes('.api.')) return 'api';
  if (lc.includes('/services/') || lc.includes('Service.') || lc.includes('service.')) return 'service';
  if (lc.includes('/utils/') || lc.includes('/lib/') || lc.includes('/helpers/')) return 'util';
  if (lc.includes('/types/') || lc.endsWith('.types.ts') || lc.endsWith('.d.ts')) return 'type';
  if (lc.includes('/context/')) return 'context';
  if (lc.includes('/views/') || lc.includes('/pages/') || lc.includes('Page.tsx') || lc.includes('Page.ts')) return 'page';
  if (lc.includes('/features/') && (lc.includes('Page') || lc.includes('Dashboard') || lc.includes('Manager'))) return 'page';
  if (lc.endsWith('.tsx') || lc.endsWith('.jsx')) return 'component';
  if (lc.includes('/constants/') || base === 'constants' || base === 'config') return 'config';
  return 'module';
}

// Walk directory recursively
function walkDir(dir, basePath, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(basePath, fullPath);
    
    if (entry.isDirectory()) {
      // Skip node_modules, dist, .git, etc.
      if (['node_modules', 'dist', '.git', 'public', 'assets', '__tests__', 'backup'].includes(entry.name)) continue;
      walkDir(fullPath, basePath, results);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.includes('.backup') && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
      const stat = fs.statSync(fullPath);
      results.push({
        path: relPath,
        fullPath,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    }
  }
  
  return results;
}

// Extract imports from file content
function extractImports(content) {
  const imports = [];
  
  // Match: import ... from '...'
  const importRegex = /import\s+(?:(?:\{[^}]*\}|[\w*]+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match: import '...' (side-effect imports)
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;
  while ((match = sideEffectRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match: require('...')
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match: dynamic import()
  const dynamicRegex = /import\(['"]([^'"]+)['"]\)/g;
  while ((match = dynamicRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

// Extract named exports
function extractExports(content) {
  const exports = [];
  
  // export default
  if (/export\s+default/.test(content)) {
    const defaultMatch = content.match(/export\s+default\s+(?:function|class|const|let|var)?\s*(\w+)/);
    exports.push(defaultMatch ? defaultMatch[1] : 'default');
  }
  
  // export const/function/class
  const namedRegex = /export\s+(?:const|function|class|let|var|type|interface|enum)\s+(\w+)/g;
  let match;
  while ((match = namedRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  return exports;
}

// Count lines of code (non-empty, non-comment)
function countLoc(content) {
  const lines = content.split('\n');
  let loc = 0;
  let inBlockComment = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed === '' || trimmed.startsWith('//')) continue;
    loc++;
  }
  return loc;
}

// Resolve import path to a relative file path
function resolveImportPath(importPath, importerRelDir) {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('@/') && !importPath.startsWith('src/')) {
    return null; // external package
  }
  
  // Handle @/ alias → src/
  let resolved = importPath;
  if (resolved.startsWith('@/')) {
    resolved = resolved.substring(2); // remove @/
  } else if (resolved.startsWith('./') || resolved.startsWith('../')) {
    // Resolve relative to importer directory
    resolved = path.posix.join(importerRelDir, resolved);
    // Normalize
    resolved = path.posix.normalize(resolved);
  }
  
  return resolved;
}

// Find the actual file that matches a resolved import path
function findFileForImport(resolved, fileMap) {
  if (!resolved) return null;
  
  // Try exact match first
  if (fileMap.has(resolved)) return resolved;
  
  // Try with extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    if (fileMap.has(resolved + ext)) return resolved + ext;
  }
  
  // Try index files
  for (const ext of extensions) {
    const indexPath = resolved + '/index' + ext;
    if (fileMap.has(indexPath)) return indexPath;
  }
  
  // Try partial match (for cases like importing a directory)
  for (const [filePath] of fileMap) {
    if (filePath.startsWith(resolved + '/') || filePath.startsWith(resolved + '.')) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * GET /api/admin/site-structure/scan
 * Scan the frontend source tree and return file graph
 */
router.get('/scan', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Walk directory
    const files = walkDir(FRONTEND_SRC, FRONTEND_SRC);
    
    // Build file map: relPath → file info
    const fileMap = new Map();
    const nodes = [];
    
    for (const file of files) {
      let content;
      try {
        content = fs.readFileSync(file.fullPath, 'utf8');
      } catch {
        continue;
      }
      
      const relPath = file.path.replace(/\\/g, '/');
      const baseName = path.basename(relPath, path.extname(relPath));
      const dir = path.dirname(relPath).replace(/\\/g, '/');
      const type = classifyFile(relPath);
      const rawImports = extractImports(content);
      const exports = extractExports(content);
      const loc = countLoc(content);
      
      const nodeData = {
        id: relPath,
        label: baseName,
        path: relPath,
        dir,
        type,
        size: file.size,
        loc,
        exports,
        rawImports,
        modified: file.modified,
      };
      
      fileMap.set(relPath, nodeData);
      nodes.push(nodeData);
    }
    
    // Build edges by resolving imports
    const edges = [];
    const edgeSet = new Set();
    
    for (const node of nodes) {
      const importerDir = path.dirname(node.path).replace(/\\/g, '/');
      
      for (const imp of node.rawImports) {
        const resolved = resolveImportPath(imp, importerDir);
        if (!resolved) continue;
        
        const targetPath = findFileForImport(resolved, fileMap);
        if (!targetPath || targetPath === node.id) continue;
        
        const edgeId = `${node.id}→${targetPath}`;
        if (edgeSet.has(edgeId)) continue;
        edgeSet.add(edgeId);
        
        // Determine edge type
        const targetNode = fileMap.get(targetPath);
        let edgeType = 'imports';
        if (targetNode) {
          if (targetNode.type === 'hook') edgeType = 'uses_hook';
          else if (targetNode.type === 'api' || targetNode.type === 'service') edgeType = 'calls_service';
          else if (targetNode.type === 'store' || targetNode.type === 'context') edgeType = 'uses_store';
          else if (targetNode.type === 'type') edgeType = 'uses_type';
          else if (targetNode.type === 'component') edgeType = 'renders';
          else if (targetNode.type === 'layout') edgeType = 'uses_layout';
        }
        
        edges.push({
          id: edgeId,
          source: node.id,
          target: targetPath,
          type: edgeType,
          rawImport: imp,
        });
      }
    }
    
    // Build stats
    const stats = {};
    for (const node of nodes) {
      stats[node.type] = (stats[node.type] || 0) + 1;
    }
    
    // Build directory tree for grouping
    const directories = new Map();
    for (const node of nodes) {
      const topDir = node.dir.split('/')[0] || 'root';
      if (!directories.has(topDir)) directories.set(topDir, []);
      directories.get(topDir).push(node.id);
    }
    
    // Clean rawImports from output to reduce payload size
    const cleanNodes = nodes.map(({ rawImports, ...rest }) => rest);
    
    const elapsed = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        nodes: cleanNodes,
        edges,
        stats,
        directories: Object.fromEntries(directories),
        meta: {
          totalFiles: nodes.length,
          totalEdges: edges.length,
          totalLoc: nodes.reduce((sum, n) => sum + n.loc, 0),
          scanTimeMs: elapsed,
          srcRoot: 'front-end/src',
        },
      },
    });
  } catch (error) {
    console.error('Site structure scan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
