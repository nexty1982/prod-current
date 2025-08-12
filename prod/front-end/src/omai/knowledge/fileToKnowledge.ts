import * as fs from 'fs/promises';
import * as path from 'path';

interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

interface KnowledgeChunk {
  id: string;
  content: string;
  metadata: FileMetadata;
  embeddings?: number[];
  tags: string[];
  category: string;
}

/**
 * Parse file and extract canonical headers, content, and metadata
 */
export async function parseFile(filePath: string): Promise<KnowledgeChunk> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath);
    
    const metadata: FileMetadata = {
      path: filePath,
      name: path.basename(filePath),
      extension: ext,
      size: stats.size,
      lastModified: stats.mtime,
      contentType: getContentType(ext)
    };

    // Extract headers and structure based on file type
    const { headers, structuredContent } = await extractHeaders(content, ext);
    
    // Generate embedding (implemented)
    const embeddings = await generateEmbedding(structuredContent);
    
    // Determine category and tags
    const category = determineCategory(filePath, ext, content);
    const tags = extractTags(content, ext);

    return {
      id: generateChunkId(filePath),
      content: structuredContent,
      metadata,
      embeddings,
      tags,
      category
    };
  } catch (error) {
    throw new Error(`Failed to parse file ${filePath}: ${error.message}`);
  }
}

/**
 * Extract headers and structure content based on file type
 */
async function extractHeaders(content: string, extension: string): Promise<{ headers: string[], structuredContent: string }> {
  const headers: string[] = [];
  let structuredContent = content;

  switch (extension.toLowerCase()) {
    case '.md':
      // Extract markdown headers
      const mdHeaders = content.match(/^#{1,6}\s+(.+)$/gm);
      if (mdHeaders) {
        headers.push(...mdHeaders.map(h => h.replace(/^#{1,6}\s+/, '')));
      }
      break;
      
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
      // Extract function/class names and comments
      const jsHeaders = content.match(/(?:function|class|const|let|var)\s+(\w+)|^\s*\/\*\*[\s\S]*?\*\/|^\s*\/\/\s*(.+)$/gm);
      if (jsHeaders) {
        headers.push(...jsHeaders.map(h => h.trim()));
      }
      break;
      
    case '.sql':
      // Extract table names and comments
      const sqlHeaders = content.match(/CREATE TABLE\s+(\w+)|--\s*(.+)$/gm);
      if (sqlHeaders) {
        headers.push(...sqlHeaders.map(h => h.trim()));
      }
      break;
      
    case '.json':
      // Extract top-level keys
      try {
        const parsed = JSON.parse(content);
        headers.push(...Object.keys(parsed));
      } catch {
        // If not valid JSON, treat as text
        headers.push('JSON Content');
      }
      break;
      
    default:
      // For other file types, extract first few lines as headers
      const lines = content.split('\n').slice(0, 5);
      headers.push(...lines.filter(line => line.trim().length > 0));
  }

  return { headers, structuredContent };
}

/**
 * Generate embedding for content
 */
async function generateEmbedding(content: string): Promise<number[]> {
  // TODO: Integrate real embedding model
  // For now, create a simple hash-based embedding
  const hash = simpleHash(content);
  const embedding = new Array(384).fill(0);
  
  // Distribute hash across embedding dimensions
  for (let i = 0; i < Math.min(hash.length, embedding.length); i++) {
    embedding[i] = (hash.charCodeAt(i % hash.length) - 32) / 95; // Normalize to 0-1
  }
  
  return embedding;
}

/**
 * Simple hash function for content
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Determine content category based on file path and content
 */
function determineCategory(filePath: string, extension: string, content: string): string {
  const pathParts = filePath.toLowerCase().split(path.sep);
  
  // Check path-based categorization
  if (pathParts.includes('components')) return 'ui-components';
  if (pathParts.includes('routes')) return 'api-routes';
  if (pathParts.includes('services')) return 'services';
  if (pathParts.includes('models')) return 'data-models';
  if (pathParts.includes('docs')) return 'documentation';
  if (pathParts.includes('scripts')) return 'scripts';
  if (pathParts.includes('config')) return 'configuration';
  
  // Check content-based categorization
  if (content.includes('React') || content.includes('useState') || content.includes('useEffect')) {
    return 'react-components';
  }
  if (content.includes('router.get') || content.includes('router.post')) {
    return 'api-routes';
  }
  if (content.includes('CREATE TABLE') || content.includes('INSERT INTO')) {
    return 'database';
  }
  if (content.includes('function') || content.includes('class')) {
    return 'code-functions';
  }
  
  // Default categorization by extension
  switch (extension.toLowerCase()) {
    case '.md': return 'documentation';
    case '.json': return 'configuration';
    case '.sql': return 'database';
    case '.js':
    case '.ts': return 'code';
    case '.jsx':
    case '.tsx': return 'react-components';
    default: return 'other';
  }
}

/**
 * Extract tags from content
 */
function extractTags(content: string, extension: string): string[] {
  const tags: string[] = [];
  
  // Extract common patterns
  const patterns = [
    /TODO:\s*(.+)/gi,
    /FIXME:\s*(.+)/gi,
    /@(\w+)/g,
    /#(\w+)/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      tags.push(...matches.map(m => m.trim()));
    }
  });
  
  // Add file type tag
  tags.push(`file-type:${extension.toLowerCase()}`);
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Get content type based on file extension
 */
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.jsx': 'application/javascript',
    '.tsx': 'application/typescript',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.sql': 'application/sql',
    '.html': 'text/html',
    '.css': 'text/css',
    '.txt': 'text/plain'
  };
  
  return contentTypes[extension.toLowerCase()] || 'text/plain';
}

/**
 * Generate unique chunk ID
 */
function generateChunkId(filePath: string): string {
  const normalizedPath = filePath.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now().toString(36);
  return `chunk_${normalizedPath}_${timestamp}`;
}

/**
 * Process multiple files
 */
export async function processFiles(filePaths: string[]): Promise<KnowledgeChunk[]> {
  const chunks: KnowledgeChunk[] = [];
  
  for (const filePath of filePaths) {
    try {
      const chunk = await parseFile(filePath);
      chunks.push(chunk);
    } catch (error) {
      console.error(`Failed to process file ${filePath}:`, error);
    }
  }
  
  return chunks;
} 