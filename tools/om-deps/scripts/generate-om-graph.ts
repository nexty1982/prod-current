#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface MadgeOutput {
  [key: string]: string[];
}

interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileTreeNode[];
}

interface DependencyNode {
  id: string;
  name: string;
  type: 'frontend' | 'api' | 'db' | 'shared';
  x?: number;
  y?: number;
  connections: string[];
  path?: string;
}

interface Connection {
  from: string;
  to: string;
  type: string;
}

interface NodeDetails {
  fullPath?: string;
  lines?: number;
  lastModified?: string;
  routes?: string[];
  dbTables?: string[];
  dependencies?: string[];
  methods?: string[];
  type?: string;
}

interface OMDepsOutput {
  fileTree: FileTreeNode[];
  dependencyNodes: DependencyNode[];
  connections: Connection[];
  nodeDetails: { [key: string]: NodeDetails };
  metadata: {
    scanTime: string;
    totalFiles: number;
    totalDependencies: number;
    version: string;
    skippedEdges?: any[];
  };
}

const PROD_ROOT = '/var/www/orthodoxmetrics/prod';
const INPUT_FILE = path.join(PROD_ROOT, 'front-end/src/tools/om-deps/om-deps.raw.json');
const OUTPUT_FILE = path.join(PROD_ROOT, 'front-end/src/tools/om-deps/om-deps.json');

// Generate unique ID for a file path
function generateId(filePath: string): string {
  // Use a hash for consistent IDs across runs
  const hash = crypto.createHash('md5').update(filePath).digest('hex');
  // Convert first 8 chars of hash to a numeric ID
  return parseInt(hash.substring(0, 8), 16).toString();
}

// Detect node type based on file path with improved classification
function detectNodeType(filePath: string): 'frontend' | 'api' | 'db' | 'shared' {
  const lowerPath = filePath.toLowerCase();
  
  // Debug logging for problematic files
  if (filePath.includes('front-end/src/api/')) {
    console.log(`🔍 Debug: ${filePath} - lowerPath: ${lowerPath}`);
    console.log(`🔍 Debug: includes('front-end/src/api/'): ${lowerPath.includes('front-end/src/api/')}`);
    console.log(`🔍 Debug: filePath type: ${typeof filePath}, length: ${filePath.length}`);
    console.log(`🔍 Debug: filePath chars: ${filePath.split('').map(c => c.charCodeAt(0)).join(',')}`);
  }
  
  // Debug logging for all front-end/src files to see classification
  if (filePath.includes('front-end/src/')) {
    console.log(`🔍 Frontend file check: ${filePath}`);
    console.log(`🔍   - includes('front-end/src/'): ${lowerPath.includes('front-end/src/')}`);
    console.log(`🔍   - includes('/config/'): ${lowerPath.includes('/config/')}`);
    console.log(`🔍   - includes('/constants/'): ${lowerPath.includes('/constants/')}`);
    console.log(`🔍   - Final frontend check: ${lowerPath.includes('front-end/src/') && !lowerPath.includes('/config/') && !lowerPath.includes('/constants/')}`);
  }
  
  // 1. Frontend files - highest priority (check specific frontend patterns first)
  if (lowerPath.includes('/components/') || 
      lowerPath.includes('/pages/') ||
      lowerPath.includes('/views/') ||
      lowerPath.includes('/widgets/') ||
      lowerPath.includes('/ui/') ||
      lowerPath.includes('/layouts/') ||
      lowerPath.includes('/hooks/') ||
      lowerPath.includes('/contexts/') ||
      lowerPath.includes('/providers/') ||
      lowerPath.includes('/styles/') ||
      lowerPath.includes('/assets/') ||
      lowerPath.includes('/public/') ||
      lowerPath.endsWith('.tsx') ||
      lowerPath.endsWith('.jsx') ||
      lowerPath.endsWith('.vue') ||
      lowerPath.endsWith('.svelte') ||
      lowerPath.endsWith('.css') ||
      lowerPath.endsWith('.scss') ||
      lowerPath.endsWith('.less') ||
      lowerPath.endsWith('.styl') ||
      // Most important: any file in front-end/src/ should be frontend (except config/constants)
      (lowerPath.includes('front-end/src/') && !lowerPath.includes('/config/') && !lowerPath.includes('/constants/')) ||
      // Specific frontend API files
      lowerPath.includes('front-end/src/api/')) {
    console.log(`🔍 Debug: ${filePath} classified as FRONTEND`);
    return 'frontend';
  }
  
  // 2. Database files - second priority (check before API to avoid server/ override)
  if (lowerPath.includes('/db/') || 
      lowerPath.includes('/models/') ||
      lowerPath.includes('/migrations/') ||
      lowerPath.includes('/database/') ||
      lowerPath.includes('/schemas/') ||
      lowerPath.includes('/tables/') ||
      lowerPath.includes('/queries/') ||
      lowerPath.endsWith('.sql') ||
      lowerPath.endsWith('.db.ts') ||
      lowerPath.endsWith('.db.js') ||
      lowerPath.endsWith('.model.js') ||
      lowerPath.endsWith('.model.ts') ||
      lowerPath.endsWith('.schema.js') ||
      lowerPath.endsWith('.schema.ts') ||
      lowerPath.endsWith('.migration.js') ||
      lowerPath.endsWith('.migration.ts')) {
    return 'db';
  }
  
  // 3. API files - third priority (more specific server checks)
  if ((lowerPath.includes('/api/') && !lowerPath.includes('front-end/src/')) || 
      lowerPath.includes('/routes/') ||
      lowerPath.includes('/controllers/') ||
      lowerPath.includes('/middleware/') ||
      (lowerPath.includes('server/') && !lowerPath.includes('/database/') && !lowerPath.includes('/db/')) ||
      lowerPath.includes('.api.js') ||
      lowerPath.includes('.route.js') ||
      lowerPath.includes('controller.js') ||
      lowerPath.includes('service.js') ||
      lowerPath.includes('handler.js')) {
    return 'api';
  }
  
  // 4. Shared/utility files - fourth priority
  if (lowerPath.includes('/shared/') || 
      lowerPath.includes('/utils/') ||
      lowerPath.includes('/constants/') ||
      lowerPath.includes('/types/') ||
      lowerPath.includes('/helpers/') ||
      lowerPath.includes('/lib/') ||
      lowerPath.includes('/common/') ||
      lowerPath.includes('/config/') ||
      lowerPath.includes('/logger/') ||
      lowerPath.includes('/validation/') ||
      lowerPath.includes('/formatters/') ||
      lowerPath.includes('/converters/') ||
      lowerPath.includes('/adapters/') ||
      lowerPath.includes('/factories/') ||
      lowerPath.includes('/builders/')) {
    return 'shared';
  }
  
  // Fallback: Default to shared for any unmatched files
  return 'shared';
}

// Get file stats safely
function getFileStats(filePath: string): { lines: number; lastModified: string } {
  try {
    const fullPath = path.join(PROD_ROOT, filePath);
    let stats = { lines: 0, lastModified: new Date().toISOString() };
    
    // Try to get file stats
    if (fs.existsSync(fullPath)) {
      const fileStat = fs.statSync(fullPath);
      stats.lastModified = fileStat.mtime.toISOString();
      
      // Count lines
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        stats.lines = content.split('\n').length;
      } catch (e) {
        // If can't read file, estimate lines
        stats.lines = Math.floor(fileStat.size / 50); // Rough estimate
      }
    }
    
    return stats;
  } catch (error) {
    // Return defaults if file doesn't exist
    return { lines: 0, lastModified: new Date().toISOString() };
  }
}

// Build hierarchical file tree from flat paths
function buildFileTree(filePaths: string[]): FileTreeNode[] {
  const root: { [key: string]: FileTreeNode } = {};
  let nodeIdCounter = 1000;
  
  // Sort paths for consistent tree building
  const sortedPaths = [...filePaths].sort();
  
  sortedPaths.forEach(filePath => {
    const parts = filePath.split('/');
    let currentPath = '';
    let parentNode: FileTreeNode | null = null;
    let parentChildren: FileTreeNode[] | undefined;
    
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      
      // Check if this node already exists
      if (!root[currentPath]) {
        const node: FileTreeNode = {
          id: generateId(currentPath + (isFile ? '_file' : '_dir')),
          name: part,
          type: isFile ? 'file' : 'folder',
          path: isFile ? currentPath : currentPath + '/'
        };
        
        if (!isFile) {
          node.children = [];
        }
        
        root[currentPath] = node;
        
        // Add to parent's children
        if (parentChildren) {
          parentChildren.push(node);
        }
      }
      
      // Update parent reference
      if (!isFile) {
        parentNode = root[currentPath];
        parentChildren = parentNode.children;
      }
    });
  });
  
  // Find root nodes (top-level directories)
  const rootNodes: FileTreeNode[] = [];
  const topLevelPaths = new Set<string>();
  
  sortedPaths.forEach(p => {
    const firstSlash = p.indexOf('/');
    const rootPath = firstSlash === -1 ? p : p.substring(0, firstSlash);
    topLevelPaths.add(rootPath);
  });
  
  topLevelPaths.forEach(rootPath => {
    if (root[rootPath]) {
      rootNodes.push(root[rootPath]);
    }
  });
  
  return rootNodes;
}

// Deduplicate filenames
function getUniqueFileName(filePath: string, fileNameMap: Map<string, number>): string {
  const baseName = path.basename(filePath);
  const count = fileNameMap.get(baseName) || 0;
  fileNameMap.set(baseName, count + 1);
  
  if (count > 0) {
    // Add parent directory to disambiguate
    const parts = filePath.split('/');
    if (parts.length > 1) {
      return `${parts[parts.length - 2]}/${baseName}`;
    }
    return `${baseName} (${count + 1})`;
  }
  
  return baseName;
}

// Filter out unnecessary connections to improve graph clarity
function shouldSkipConnection(fromFile: string, toFile: string): boolean {
  const lowerToFile = toFile.toLowerCase();
  
  // Skip infrastructure/config files that create noise
  if (lowerToFile.includes('/config/') ||
      lowerToFile.includes('/constants/') ||
      lowerToFile.includes('/logger.js') ||
      lowerToFile.includes('/types.ts') ||
      lowerToFile.includes('/types.js') ||
      lowerToFile.endsWith('.json') ||
      lowerToFile.endsWith('.css') ||
      lowerToFile.endsWith('.scss') ||
      lowerToFile.endsWith('.md') ||
      lowerToFile.endsWith('.txt')) {
    return true;
  }
  
  // Skip self-imports
  if (fromFile === toFile) {
    return true;
  }
  
  // Skip node_modules and external packages
  if (toFile.includes('node_modules/') || 
      toFile.includes('@types/') ||
      toFile.startsWith('react') ||
      toFile.startsWith('vue') ||
      toFile.startsWith('angular')) {
    return true;
  }
  
  return false;
}

// Prioritize connections based on importance
function getConnectionPriority(fromFile: string, toFile: string, fromType: string, toType: string): number {
  let priority = 0;
  
  // Higher priority for cross-type connections (frontend→api, api→db)
  if (fromType !== toType) {
    priority += 10;
  }
  
  // Higher priority for connections to different directories
  const fromDir = path.dirname(fromFile);
  const toDir = path.dirname(toFile);
  if (fromDir !== toDir) {
    priority += 5;
  }
  
  // Lower priority for shared/utility files
  if (toType === 'shared') {
    priority -= 2;
  }
  
  return priority;
}

// Cap connections per node and prioritize the most important ones
function capNodeConnections(nodes: DependencyNode[], connections: Connection[], maxConnections: number = 8): { filteredConnections: Connection[], skippedEdges: any[] } {
  const skippedEdges: any[] = [];
  const filteredConnections: Connection[] = [];
  const nodeConnectionCounts = new Map<string, number>();
  
  // Initialize connection counts
  nodes.forEach(node => nodeConnectionCounts.set(node.id, 0));
  
  // Sort connections by priority
  const prioritizedConnections = connections.map(conn => {
    const fromNode = nodes.find(n => n.id === conn.from);
    const toNode = nodes.find(n => n.id === conn.to);
    
    if (!fromNode || !toNode) return { ...conn, priority: -1 };
    
    const priority = getConnectionPriority(
      fromNode.path || '',
      toNode.path || '',
      fromNode.type,
      toNode.type
    );
    
    return { ...conn, priority };
  }).sort((a, b) => b.priority - a.priority);
  
  // Process connections in priority order
  prioritizedConnections.forEach(conn => {
    const fromCount = nodeConnectionCounts.get(conn.from) || 0;
    const toCount = nodeConnectionCounts.get(conn.to) || 0;
    
    // Check if we can add this connection without exceeding limits
    if (fromCount < maxConnections && toCount < maxConnections) {
      filteredConnections.push(conn);
      nodeConnectionCounts.set(conn.from, fromCount + 1);
      nodeConnectionCounts.set(conn.to, toCount + 1);
    } else {
      // Track skipped connections for metadata
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      
      skippedEdges.push({
        from: fromNode?.name || conn.from,
        to: toNode?.name || conn.to,
        reason: fromCount >= maxConnections ? 'from_node_limit' : 'to_node_limit',
        priority: conn.priority
      });
    }
  });
  
  return { filteredConnections, skippedEdges };
}

// Main transformation function
async function transformMadgeToOM() {
  console.log('🔄 Starting transformation from madge to OM format...');
  
  // Read input file
  let madgeData: MadgeOutput = {};
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    madgeData = JSON.parse(rawData);
    console.log(`📖 Read ${Object.keys(madgeData).length} files from madge output`);
  } catch (error) {
    console.error('❌ Error reading input file:', error);
    process.exit(1);
  }
  
  // Initialize structures
  const nodeMap = new Map<string, string>(); // file path -> node ID
  const fileNameMap = new Map<string, number>(); // for deduplication
  const dependencyNodes: DependencyNode[] = [];
  const connections: Connection[] = [];
  const nodeDetails: { [key: string]: NodeDetails } = {};
  
  // First pass: Create all nodes
  Object.keys(madgeData).forEach(filePath => {
    console.log(`🔍 Processing file: "${filePath}"`);
    const id = generateId(filePath);
    const name = getUniqueFileName(filePath, fileNameMap);
    const type = detectNodeType(filePath);
    
    nodeMap.set(filePath, id);
    
    // Position nodes based on type for better initial layout
    const typePositions = {
      frontend: { x: 200, y: 100 },
      api: { x: 600, y: 300 },
      db: { x: 1000, y: 200 },
      shared: { x: 400, y: 500 }
    };
    
    const basePos = typePositions[type];
    const node: DependencyNode = {
      id,
      name,
      type,
      path: filePath,
      x: basePos.x + (Math.random() - 0.5) * 300,
      y: basePos.y + (Math.random() - 0.5) * 200,
      connections: []
    };
    
    dependencyNodes.push(node);
    
    // Get file stats
    const stats = getFileStats(filePath);
    
    // Create node details
    nodeDetails[name] = {
      fullPath: filePath,
      lines: stats.lines,
      lastModified: stats.lastModified,
      routes: [], // Could be extracted from file content
      dbTables: [], // Could be extracted from file content
      dependencies: madgeData[filePath] || [],
      methods: [], // Could be extracted from file content
      type
    };
  });
  
  // Log node type distribution for debugging
  const typeDistribution = dependencyNodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('📊 Node type distribution:');
  Object.entries(typeDistribution).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count} files`);
  });
  
  // Show examples of each type for debugging
  console.log('\n🔍 Type classification examples:');
  Object.entries(typeDistribution).forEach(([type, count]) => {
    const examples = dependencyNodes.filter(n => n.type === type).slice(0, 3);
    console.log(`  ${type}:`);
    examples.forEach(node => {
      console.log(`    - ${node.path}`);
    });
  });
  
  // Show some files that should be frontend but aren't
  const potentialFrontendFiles = dependencyNodes.filter(n => 
    n.path && (
      n.path.includes('front-end/src/') ||
      n.path.endsWith('.tsx') ||
      n.path.endsWith('.jsx') ||
      n.path.endsWith('.vue') ||
      n.path.endsWith('.css') ||
      n.path.endsWith('.scss')
    )
  ).slice(0, 5);
  
  console.log('\n🔍 Potential frontend files (first 5):');
  potentialFrontendFiles.forEach(node => {
    console.log(`  - ${node.path} → classified as: ${node.type}`);
  });
  
  // Show some files that should be database but aren't
  const potentialDbFiles = dependencyNodes.filter(n => 
    n.path && (
      n.path.includes('/db/') ||
      n.path.includes('/models/') ||
      n.path.includes('/database/') ||
      n.path.endsWith('.sql') ||
      n.path.endsWith('.model.js') ||
      n.path.endsWith('.model.ts')
    )
  ).slice(0, 5);
  
  console.log('\n🔍 Potential database files (first 5):');
  potentialDbFiles.forEach(node => {
    console.log(`  - ${node.path} → classified as: ${node.type}`);
  });
  
  // Second pass: Create connections
  let connectionCount = 0;
  let skippedCount = 0;
  Object.entries(madgeData).forEach(([fromFile, deps]) => {
    const fromId = nodeMap.get(fromFile);
    if (!fromId) return;
    
    deps.forEach(depPath => {
      // Skip unnecessary connections
      if (shouldSkipConnection(fromFile, depPath)) {
        skippedCount++;
        return;
      }
      
      // Find the target node
      let toId = nodeMap.get(depPath);
      
      if (!toId) {
        // Try to find partial matches (for relative imports)
        for (const [path, id] of nodeMap.entries()) {
          if (path.endsWith(depPath) || 
              path.endsWith(depPath.replace(/^\.\.?\//, '')) ||
              depPath.includes(path)) {
            toId = id;
            break;
          }
        }
      }
      
      if (toId && fromId !== toId) {
        // Add connection
        connections.push({
          from: fromId,
          to: toId,
          type: 'imports'
        });
        connectionCount++;
        
        // Update node connections array
        const fromNode = dependencyNodes.find(n => n.id === fromId);
        if (fromNode && !fromNode.connections.includes(toId)) {
          fromNode.connections.push(toId);
        }
      }
    });
  });
  
  console.log(`🔗 Created ${connectionCount} connections, skipped ${skippedCount} unnecessary ones`);
  
  // Filter and cap connections
  const { filteredConnections, skippedEdges } = capNodeConnections(dependencyNodes, connections);
  
  console.log(`📊 After filtering: ${filteredConnections.length} connections (${connections.length - filteredConnections.length} removed for clarity)`);
  
  // Update node connections arrays to match filtered connections
  dependencyNodes.forEach(node => {
    node.connections = [];
  });
  
  filteredConnections.forEach(conn => {
    const fromNode = dependencyNodes.find(n => n.id === conn.from);
    if (fromNode && !fromNode.connections.includes(conn.to)) {
      fromNode.connections.push(conn.to);
    }
  });
  
  // Build file tree
  const filePaths = Object.keys(madgeData);
  const fileTree = buildFileTree(filePaths);
  
  // Create metadata
  const outputSizeEstimate = JSON.stringify({ fileTree, dependencyNodes, connections, nodeDetails }).length;
  
  // Create final output
  const output: OMDepsOutput = {
    fileTree,
    dependencyNodes,
    connections: filteredConnections, // Use filtered connections
    nodeDetails,
    metadata: {
      scanTime: new Date().toISOString(),
      totalFiles: dependencyNodes.length,
      totalDependencies: filteredConnections.length,
      version: '1.0.0',
      skippedEdges // Add skipped edges to metadata
    }
  };
  
  // Write output file
  try {
    const outputJson = JSON.stringify(output, null, 2);
    fs.writeFileSync(OUTPUT_FILE, outputJson);
    
    // Display summary
    console.log(`✅ Transformation complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Scanned ${output.metadata.totalFiles} files`);
    console.log(`  - Original connections: ${connectionCount}`);
    console.log(`  - Filtered connections: ${filteredConnections.length} (${connectionCount - filteredConnections.length} removed for clarity)`);
    console.log(`  - Skipped infrastructure: ${skippedCount}`);
    console.log(`  - Output size: ${Math.round(outputJson.length / 1024)} KB`);
    console.log(`  - Node types breakdown:`);
    
    const typeCount = dependencyNodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`    • ${type}: ${count} files`);
    });
    
    if (skippedEdges.length > 0) {
      console.log(`  - Skipped edges: ${skippedEdges.length} (see metadata.skippedEdges for details)`);
    }
    
    console.log(`📁 Output saved to: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error writing output file:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  transformMadgeToOM().catch(error => {
    console.error('❌ Transformation failed:', error);
    process.exit(1);
  });
}

export { transformMadgeToOM };