/**
 * OM-Library Backend API Routes
 * 
 * Provides advanced search, relationship mapping, and library management
 * for the OM-Library system powered by the om-librarian agent.
 * 
 * Features:
 * - Filename search with fuzzy matching
 * - Full-text content search
 * - Relationship mapping
 * - Librarian status monitoring
 * - Category filtering
 */

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const Fuse = require('fuse.js');

const router = express.Router();

// Configuration
const LIBRARY_DIR = path.join(__dirname, '../../../front-end/public/docs/library');
const INDEX_FILE = path.join(__dirname, '../../../.analysis/library-index.json');
const LIBRARIAN_STATS_FILE = path.join(__dirname, '../../../.analysis/librarian-stats.json');

/**
 * Load library index
 */
function loadIndex() {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      return fs.readJsonSync(INDEX_FILE);
    }
  } catch (error) {
    console.error('Error loading library index:', error);
  }
  return {};
}

/**
 * GET /api/library/status
 * Get librarian agent status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if librarian process is running
    const { exec } = require('child_process');
    
    exec('pm2 jlist', (error, stdout) => {
      if (error) {
        return res.json({
          success: true,
          running: false,
          message: 'PM2 not available or librarian not running'
        });
      }
      
      try {
        const processes = JSON.parse(stdout);
        const librarian = processes.find(p => p.name === 'om-librarian');
        
        if (librarian) {
          const index = loadIndex();
          
          res.json({
            success: true,
            running: true,
            status: librarian.pm2_env.status,
            uptime: librarian.pm2_env.pm_uptime,
            restarts: librarian.pm2_env.restart_time,
            memory: librarian.monit.memory,
            cpu: librarian.monit.cpu,
            totalFiles: Object.keys(index).length,
            lastIndexUpdate: fs.statSync(INDEX_FILE).mtime.toISOString(),
          });
        } else {
          res.json({
            success: true,
            running: false,
            message: 'OM-Librarian not found in PM2'
          });
        }
      } catch (parseError) {
        res.json({
          success: true,
          running: false,
          message: 'Could not parse PM2 status'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get librarian status',
      message: error.message
    });
  }
});

/**
 * GET /api/library/files
 * List all library files with optional filters
 */
router.get('/files', async (req, res) => {
  try {
    const { category, limit, offset } = req.query;
    const index = loadIndex();
    
    let files = Object.values(index);
    
    // Filter by category
    if (category && ['technical', 'ops', 'recovery'].includes(category)) {
      files = files.filter(f => f.category === category);
    }
    
    // Sort by date (newest first)
    files.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    // Pagination
    const total = files.length;
    const start = parseInt(offset) || 0;
    const end = start + (parseInt(limit) || 50);
    files = files.slice(start, end);
    
    res.json({
      success: true,
      total,
      offset: start,
      limit: end - start,
      files
    });
  } catch (error) {
    console.error('Error listing library files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: error.message
    });
  }
});

/**
 * GET /api/library/search
 * Search library files
 */
router.get('/search', async (req, res) => {
  try {
    const { q, mode, category, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query (q parameter)'
      });
    }
    
    const index = loadIndex();
    let files = Object.values(index);
    
    // Filter by category if specified
    if (category && ['technical', 'ops', 'recovery'].includes(category)) {
      files = files.filter(f => f.category === category);
    }
    
    let results = [];
    
    if (mode === 'content') {
      // Full-text content search
      results = await searchContent(files, q);
    } else {
      // Filename search (default) - fuzzy matching
      results = searchFilenames(files, q);
    }
    
    // Limit results
    const maxResults = parseInt(limit) || 20;
    results = results.slice(0, maxResults);
    
    res.json({
      success: true,
      query: q,
      mode: mode || 'filename',
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Error searching library:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * Search filenames using fuzzy matching
 */
function searchFilenames(files, query) {
  const fuse = new Fuse(files, {
    keys: ['filename', 'title', 'keywords'],
    threshold: 0.4,
    includeScore: true,
    useExtendedSearch: true,
  });
  
  const results = fuse.search(query);
  
  return results.map(result => ({
    ...result.item,
    score: result.score,
    matchType: 'filename'
  }));
}

/**
 * Search file contents
 */
async function searchContent(files, query) {
  const results = [];
  const queryLower = query.toLowerCase();
  
  for (const file of files) {
    try {
      // Read file content
      const content = await fs.readFile(file.libraryPath, 'utf8');
      const contentLower = content.toLowerCase();
      
      // Check if query exists in content
      if (contentLower.includes(queryLower)) {
        // Find context around match
        const index = contentLower.indexOf(queryLower);
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + query.length + 100);
        const snippet = content.substring(start, end);
        
        results.push({
          ...file,
          matchType: 'content',
          snippet: (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : ''),
          matchPosition: index
        });
      }
    } catch (error) {
      console.warn(`Could not search content of ${file.filename}:`, error.message);
    }
  }
  
  // Sort by match position (earlier matches first)
  results.sort((a, b) => a.matchPosition - b.matchPosition);
  
  return results;
}

/**
 * GET /api/library/file/:id
 * Get single file details with related files
 */
router.get('/file/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const index = loadIndex();
    
    const file = index[id];
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `No file found with ID: ${id}`
      });
    }
    
    // Get related files
    const relatedFiles = file.relatedFiles.map(relId => index[relId]).filter(Boolean);
    
    res.json({
      success: true,
      file: {
        ...file,
        related: relatedFiles
      }
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file',
      message: error.message
    });
  }
});

/**
 * GET /api/library/download/:id
 * Download a library file
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const index = loadIndex();
    
    const file = index[id];
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Security check
    if (!file.libraryPath.startsWith(LIBRARY_DIR)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Check file exists
    if (!fs.existsSync(file.libraryPath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }
    
    // Send file
    res.download(file.libraryPath, file.filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed',
      message: error.message
    });
  }
});

/**
 * GET /api/library/categories
 * Get file count by category
 */
router.get('/categories', async (req, res) => {
  try {
    const index = loadIndex();
    const files = Object.values(index);
    
    const categories = {
      technical: 0,
      ops: 0,
      recovery: 0
    };
    
    for (const file of files) {
      categories[file.category]++;
    }
    
    res.json({
      success: true,
      categories,
      total: files.length
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      message: error.message
    });
  }
});

/**
 * GET /api/library/relationships/:id
 * Get detailed relationship graph for a file
 */
router.get('/relationships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const index = loadIndex();
    
    const file = index[id];
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Build relationship graph
    const graph = {
      center: file,
      related: [],
      sameFolder: [],
      sameCategory: []
    };
    
    // Related files (by algorithm)
    graph.related = file.relatedFiles.map(relId => index[relId]).filter(Boolean);
    
    // Same source folder
    graph.sameFolder = Object.values(index).filter(f => 
      f.id !== id && f.sourceFolder === file.sourceFolder
    );
    
    // Same category (sample)
    graph.sameCategory = Object.values(index)
      .filter(f => f.id !== id && f.category === file.category)
      .slice(0, 5);
    
    res.json({
      success: true,
      graph
    });
  } catch (error) {
    console.error('Error getting relationships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get relationships',
      message: error.message
    });
  }
});

/**
 * POST /api/library/reindex
 * Trigger re-indexing (admin only)
 */
router.post('/reindex', async (req, res) => {
  try {
    // TODO: Add admin check
    
    // Trigger re-scan by touching all watched directories
    const watchDirs = [
      path.join(__dirname, '../../../docs/01-27-2026'),
      path.join(__dirname, '../../../docs/1-20-26'),
      path.join(__dirname, '../../../docs/1-22-26'),
    ];
    
    for (const dir of watchDirs) {
      if (fs.existsSync(dir)) {
        // Touch directory to trigger watcher
        const now = new Date();
        fs.utimesSync(dir, now, now);
      }
    }
    
    res.json({
      success: true,
      message: 'Re-indexing triggered'
    });
  } catch (error) {
    console.error('Error triggering reindex:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger reindex',
      message: error.message
    });
  }
});

module.exports = router;
