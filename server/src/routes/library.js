/**
 * OM-Library API Routes
 * Provides access to the documentation library indexed by om-librarian
 */

const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db-compat');
const { LIBRARY_CONFIG, validatePath, getMimeType, isPreviewable, isPathAllowed } = require('../config/library-config');
const { paginate, sortItems, findRelatedFiles, calculateFilenameSimilarity, groupFilesByTime } = require('../utils/library-helpers');

// Apply auth middleware
router.use(authMiddleware);

// Paths
const LIBRARY_INDEX_PATH = path.join(__dirname, '../../../.analysis/library-index.json');
const LIBRARY_PROCESSED_PATH = path.join(__dirname, '../../../.analysis/library-processed.json');
const LIBRARY_DIR = path.join(__dirname, '../../../front-end/public/docs/library');

/**
 * GET /api/library/status
 * Returns librarian service status and library statistics
 */
router.get('/status', async (req, res) => {
  try {
    // Check if index file exists
    const indexExists = await fs.pathExists(LIBRARY_INDEX_PATH);
    
    if (!indexExists) {
      return res.json({
        running: false,
        status: 'offline',
        message: 'Library index not found. Librarian may not be initialized yet.'
      });
    }

    // Read index file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    // Get file stats
    const indexStats = await fs.stat(LIBRARY_INDEX_PATH);
    
    // Convert object index to array (om-librarian uses object keys as IDs)
    const filesArray = indexData.files 
      ? indexData.files 
      : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);
    
    // Count files in library
    const totalFiles = filesArray.length;
    
    // Calculate uptime (based on index file modified time)
    const lastUpdate = indexStats.mtime;
    
    res.json({
      running: true,
      status: 'online',
      totalFiles,
      lastIndexUpdate: lastUpdate.toISOString(),
      indexVersion: indexData.version || '1.0.0',
      categories: {
        technical: filesArray.filter(f => f.category === 'technical').length,
        ops: filesArray.filter(f => f.category === 'ops').length,
        recovery: filesArray.filter(f => f.category === 'recovery').length,
      }
    });
    
  } catch (error) {
    console.error('Error fetching library status:', error);
    res.status(500).json({
      running: false,
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/library/files
 * Returns all indexed library files
 */
router.get('/files', async (req, res) => {
  try {
    // Check if index file exists
    const indexExists = await fs.pathExists(LIBRARY_INDEX_PATH);
    
    if (!indexExists) {
      return res.status(404).json({
        success: false,
        error: 'Library index not found'
      });
    }

    // Read index file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    // Convert object index to array (om-librarian uses object keys as IDs)
    const filesArray = indexData.files 
      ? indexData.files 
      : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);
    
    res.json({
      success: true,
      files: filesArray,
      totalCount: filesArray.length,
      lastUpdate: indexData.lastUpdate || new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching library files:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/items
 * Returns paginated, sorted, filtered library files
 * Query params:
 *   - page: Page number (1-based, default 1)
 *   - pageSize: Items per page (default 25, max 100)
 *   - sortBy: Field to sort by (title, category, source, size, modified)
 *   - sortDir: Sort direction (asc, desc)
 *   - q: Search query
 *   - mode: Search mode (filename, content)
 *   - category: Filter by category
 *   - groupMode: Grouping mode (none, time) - returns group metadata
 */
router.get('/items', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 25,
      sortBy = 'modified',
      sortDir = 'desc',
      q,
      mode = 'filename',
      category,
      groupMode = 'none'
    } = req.query;

    // Validate pagination params
    const validPage = Math.max(1, parseInt(page) || 1);
    const validPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 25));

    // Validate sortBy
    const allowedSortFields = LIBRARY_CONFIG.sorting.allowedFields;
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'modified';
    const validSortDir = ['asc', 'desc'].includes(sortDir) ? sortDir : 'desc';

    // Check if index file exists
    const indexExists = await fs.pathExists(LIBRARY_INDEX_PATH);
    if (!indexExists) {
      return res.status(404).json({
        success: false,
        error: 'Library index not found'
      });
    }

    // Read index file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    // Convert object index to array
    let filesArray = indexData.files 
      ? indexData.files 
      : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);

    // Apply search filter if query provided
    if (q && q.trim()) {
      const searchLower = q.toLowerCase();
      if (mode === 'filename') {
        filesArray = filesArray.filter(file => 
          file.filename.toLowerCase().includes(searchLower) ||
          file.title.toLowerCase().includes(searchLower)
        );
      } else if (mode === 'content') {
        filesArray = filesArray.filter(file => 
          (file.firstParagraph && file.firstParagraph.toLowerCase().includes(searchLower)) ||
          (file.keywords && file.keywords.some(k => k.toLowerCase().includes(searchLower)))
        );
      }
    }

    // Apply category filter
    if (category && category !== 'all') {
      filesArray = filesArray.filter(f => f.category === category);
    }

    // Sort
    filesArray = sortItems(filesArray, validSortBy, validSortDir);

    // Paginate
    const paginatedResult = paginate(filesArray, validPage, validPageSize);

    // Build response
    const response = {
      success: true,
      items: paginatedResult.items,
      total: paginatedResult.total,
      page: paginatedResult.page,
      pageSize: paginatedResult.pageSize,
      totalPages: paginatedResult.totalPages,
      hasNext: paginatedResult.hasNext,
      hasPrev: paginatedResult.hasPrev,
      sortBy: validSortBy,
      sortDir: validSortDir,
    };

    // Add grouping metadata if requested
    if (groupMode === 'time') {
      const groups = groupFilesByTime(paginatedResult.items);
      response.groups = groups;
    }

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching library items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/search
 * Search library files by filename or content
 */
router.get('/search', async (req, res) => {
  try {
    const { q, mode = 'filename', category } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Read index file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    // Convert object index to array (om-librarian uses object keys as IDs)
    const files = indexData.files 
      ? indexData.files 
      : Object.values(indexData).filter(item => item && typeof item === 'object' && item.id);
    
    // Filter by category if specified
    let filteredFiles = files;
    if (category && category !== 'all') {
      filteredFiles = files.filter(f => f.category === category);
    }
    
    // Search based on mode
    let results = [];
    const searchLower = q.toLowerCase();
    
    if (mode === 'filename') {
      // Search in filename and title
      results = filteredFiles.filter(file => 
        file.filename.toLowerCase().includes(searchLower) ||
        file.title.toLowerCase().includes(searchLower)
      );
    } else if (mode === 'content') {
      // Search in content (firstParagraph and keywords)
      results = filteredFiles.filter(file => 
        (file.firstParagraph && file.firstParagraph.toLowerCase().includes(searchLower)) ||
        (file.keywords && file.keywords.some(k => k.toLowerCase().includes(searchLower)))
      );
      
      // Add snippets for content matches
      results = results.map(file => {
        let snippet = '';
        if (file.firstParagraph && file.firstParagraph.toLowerCase().includes(searchLower)) {
          const index = file.firstParagraph.toLowerCase().indexOf(searchLower);
          const start = Math.max(0, index - 50);
          const end = Math.min(file.firstParagraph.length, index + searchLower.length + 50);
          snippet = '...' + file.firstParagraph.substring(start, end) + '...';
        }
        return { ...file, snippet, matchType: 'content' };
      });
    }
    
    res.json({
      success: true,
      results,
      totalResults: results.length,
      query: q,
      mode
    });
    
  } catch (error) {
    console.error('Error searching library:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/file/:fileId
 * Get specific file details
 */
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Read index file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    // Convert object index to array (om-librarian uses object keys as IDs)
    // OR look up directly by key if it's an object format
    let file = null;
    if (indexData.files) {
      // Array format
      file = indexData.files.find(f => f.id === fileId);
    } else {
      // Object format (direct key lookup)
      file = indexData[fileId];
    }
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Try to read the actual file content
    let content = null;
    if (file.libraryPath && await fs.pathExists(file.libraryPath)) {
      content = await fs.readFile(file.libraryPath, 'utf8');
    }
    
    res.json({
      success: true,
      file: {
        ...file,
        content
      }
    });
    
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/download/:idOrSlug
 * Download a library file with proper Content-Disposition headers
 */
router.get('/download/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    
    // Read index to find file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    let file = null;
    if (indexData.files) {
      file = indexData.files.find(f => f.id === idOrSlug || f.filename === idOrSlug);
    } else {
      file = indexData[idOrSlug];
    }
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found in library index'
      });
    }
    
    // Get file path (prefer libraryPath, fallback to originalPath)
    const filePath = file.libraryPath || file.originalPath;
    
    if (!filePath || !(await fs.pathExists(filePath))) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }
    
    // Validate path (prevent traversal)
    if (!isPathAllowed(filePath)) {
      console.error(`Attempted download of disallowed path: ${filePath}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Set headers for download
    const filename = path.basename(filePath);
    const mimeType = getMimeType(filename);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Download failed'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/preview/:idOrSlug
 * Preview a library file inline (opens in new tab)
 */
router.get('/preview/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    
    // Read index to find file
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    
    let file = null;
    if (indexData.files) {
      file = indexData.files.find(f => f.id === idOrSlug || f.filename === idOrSlug);
    } else {
      file = indexData[idOrSlug];
    }
    
    if (!file) {
      return res.status(404).send('<h1>File Not Found</h1><p>This file is not in the library index.</p>');
    }
    
    // Get file path
    const filePath = file.libraryPath || file.originalPath;
    
    if (!filePath || !(await fs.pathExists(filePath))) {
      return res.status(404).send('<h1>File Not Found</h1><p>This file exists in the index but was not found on disk.</p>');
    }
    
    // Validate path
    if (!isPathAllowed(filePath)) {
      console.error(`Attempted preview of disallowed path: ${filePath}`);
      return res.status(403).send('<h1>Access Denied</h1>');
    }
    
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = getMimeType(filename);
    
    // Check if previewable
    if (!isPreviewable(filename)) {
      // Fallback to download for non-previewable files
      return res.redirect(`/api/library/download/${idOrSlug}`);
    }
    
    // For markdown, render a simple HTML wrapper
    if (ext === '.md') {
      const content = await fs.readFile(filePath, 'utf8');
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${file.title || filename}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    pre {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    h1, h2, h3 { color: #333; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <div class="container">
    <pre style="white-space: pre-wrap; word-wrap: break-word;">${content}</pre>
  </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlContent);
    }
    
    // For other files (PDF, images), serve with inline disposition
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error previewing file:', error);
    res.status(500).send(`<h1>Preview Error</h1><p>${error.message}</p>`);
  }
});

/**
 * POST /api/library/reindex
 * Trigger librarian to reindex files (admin only)
 */
router.post('/reindex', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    // Clear processed files log to force re-processing
    if (await fs.pathExists(LIBRARY_PROCESSED_PATH)) {
      await fs.writeJson(LIBRARY_PROCESSED_PATH, {}, { spaces: 2 });
    }
    
    // Try to trigger V2 librarian if available
    try {
      const OMLibrarianV2 = require('../agents/omLibrarianV2');
      // Note: In production, librarian runs as separate PM2 process
      // This just clears the processed log; the running process will pick up changes
      console.log('✅ Reindex triggered for OM-Librarian V2');
    } catch (error) {
      // V2 not available, fallback to V1 behavior
      console.log('✅ Reindex triggered for OM-Librarian V1');
    }
    
    res.json({
      success: true,
      message: 'Reindex triggered. Librarian will process files on next scan.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering reindex:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/sources
 * List all scan sources (admin only)
 */
router.get('/sources', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const [sources] = await pool.query(`
      SELECT id, name, path, is_active, scan_mode, description, 
             last_scan, file_count, created_at, updated_at
      FROM orthodoxmetrics_db.library_sources
      ORDER BY name ASC
    `);
    
    res.json({
      success: true,
      sources
    });
  } catch (error) {
    console.error('Error fetching library sources:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/library/sources
 * Add a new scan source (super_admin only)
 */
router.post('/sources', requireRole(['super_admin']), async (req, res) => {
  try {
    const { name, path: scanPath, scan_mode = 'recursive', description } = req.body;
    
    if (!name || !scanPath) {
      return res.status(400).json({
        success: false,
        error: 'Name and path are required'
      });
    }
    
    // Validate path
    try {
      validatePath(scanPath);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    // Check if path exists
    if (!(await fs.pathExists(scanPath))) {
      return res.status(400).json({
        success: false,
        error: 'Path does not exist',
        warning: 'You can still create this source, but it will not be scanned until the path exists.'
      });
    }
    
    // Insert into database
    const pool = getAppPool();
    const [result] = await pool.query(`
      INSERT INTO orthodoxmetrics_db.library_sources (name, path, scan_mode, description)
      VALUES (?, ?, ?, ?)
    `, [name, scanPath, scan_mode, description || null]);
    
    // Return created source
    const [newSource] = await pool.query(`
      SELECT * FROM orthodoxmetrics_db.library_sources WHERE id = ?
    `, [result.insertId]);
    
    res.json({
      success: true,
      message: 'Source created successfully',
      source: newSource[0]
    });
    
  } catch (error) {
    console.error('Error creating library source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/library/sources/:id
 * Update a scan source (super_admin only)
 */
router.put('/sources/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path: scanPath, is_active, scan_mode, description } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (scanPath !== undefined) {
      // Validate path
      try {
        validatePath(scanPath);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      updates.push('path = ?');
      values.push(scanPath);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (scan_mode !== undefined) {
      updates.push('scan_mode = ?');
      values.push(scan_mode);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    values.push(id);
    
    const pool = getAppPool();
    await pool.query(`
      UPDATE orthodoxmetrics_db.library_sources
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);
    
    // Return updated source
    const [updated] = await pool.query(`
      SELECT * FROM orthodoxmetrics_db.library_sources WHERE id = ?
    `, [id]);
    
    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Source updated successfully',
      source: updated[0]
    });
    
  } catch (error) {
    console.error('Error updating library source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/library/sources/:id
 * Delete a scan source (super_admin only)
 */
router.delete('/sources/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = getAppPool();
    const [result] = await pool.query(`
      DELETE FROM orthodoxmetrics_db.library_sources WHERE id = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Source deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting library source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/library/category/batch
 * Update category for multiple files
 */
router.post('/category/batch', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { fileIds, category } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fileIds array is required'
      });
    }
    
    if (!['technical', 'ops', 'recovery'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }
    
    // Read index
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    const isArray = Array.isArray(indexData.files);
    
    let updated = 0;
    
    if (isArray) {
      // Array format
      for (const file of indexData.files) {
        if (fileIds.includes(file.id)) {
          file.category = category;
          updated++;
        }
      }
    } else {
      // Object format
      for (const fileId of fileIds) {
        if (indexData[fileId]) {
          indexData[fileId].category = category;
          updated++;
        }
      }
    }
    
    // Save index
    await fs.writeJson(LIBRARY_INDEX_PATH, indexData, { spaces: 2 });
    
    res.json({
      success: true,
      message: `Updated ${updated} file(s)`,
      updated
    });
    
  } catch (error) {
    console.error('Error batch updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/library/related/group
 * Create or update a relationship group
 */
router.post('/related/group', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { fileIds, groupId } = req.body;
    const userId = req.user?.id || req.session?.user?.id;
    
    if (!Array.isArray(fileIds) || fileIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 file IDs are required to create a relationship'
      });
    }
    
    // Generate group ID if not provided
    const finalGroupId = groupId || `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert relationships into database
    const pool = getAppPool();
    
    // Clear existing relationships for these files in this group (if updating)
    if (groupId) {
      await pool.query(`
        DELETE FROM orthodoxmetrics_db.library_relationships
        WHERE group_id = ? AND file_id IN (?)
      `, [groupId, fileIds]);
    }
    
    // Insert new relationships
    const values = fileIds.map(fileId => [finalGroupId, fileId, 'manual', null, userId]);
    
    await pool.query(`
      INSERT INTO orthodoxmetrics_db.library_relationships 
      (group_id, file_id, relationship_type, score, created_by)
      VALUES ?
    `, [values]);
    
    // Update index with related_group_id
    const indexData = await fs.readJson(LIBRARY_INDEX_PATH);
    const isArray = Array.isArray(indexData.files);
    
    if (isArray) {
      for (const file of indexData.files) {
        if (fileIds.includes(file.id)) {
          file.related_group_id = finalGroupId;
        }
      }
    } else {
      for (const fileId of fileIds) {
        if (indexData[fileId]) {
          indexData[fileId].related_group_id = finalGroupId;
        }
      }
    }
    
    await fs.writeJson(LIBRARY_INDEX_PATH, indexData, { spaces: 2 });
    
    res.json({
      success: true,
      message: 'Relationship group created',
      groupId: finalGroupId,
      filesLinked: fileIds.length
    });
    
  } catch (error) {
    console.error('Error creating relationship group:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/library/cleanup/dry-run
 * Plan cleanup without executing (super_admin only)
 * Body: { mode: 'documentation' | 'artifacts' | 'scripts' | 'all' }
 */
router.post('/cleanup/dry-run', requireRole(['super_admin']), async (req, res) => {
  try {
    const { mode = 'documentation' } = req.body;
    
    const LibraryOrganizer = require('../services/libraryOrganizer');
    const organizer = new LibraryOrganizer(undefined, mode);
    
    const plan = await organizer.planCleanup();
    
    res.json({
      success: true,
      plan,
      summary: {
        mode: plan.mode,
        modeDescription: plan.modeDescription,
        totalFiles: plan.plannedMoves.length + plan.skipped.length,
        toMove: plan.plannedMoves.length,
        skipped: plan.skipped.length,
        errors: plan.errors.length,
      }
    });
    
  } catch (error) {
    console.error('Error planning cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/library/cleanup/apply
 * Execute cleanup (move files) (super_admin only)
 * Body: { mode: 'documentation' | 'artifacts' | 'scripts' | 'all' }
 */
router.post('/cleanup/apply', requireRole(['super_admin']), async (req, res) => {
  try {
    const { mode = 'documentation' } = req.body;
    
    const LibraryOrganizer = require('../services/libraryOrganizer');
    const organizer = new LibraryOrganizer(undefined, mode);
    
    const result = await organizer.applyCleanup();
    
    res.json({
      success: true,
      result,
      summary: {
        mode: result.mode,
        moved: result.moved.length,
        failed: result.failed.length,
        manifest: result.manifest,
      }
    });
    
  } catch (error) {
    console.error('Error applying cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/library/cleanup/stats
 * Get cleanup statistics (super_admin only)
 * Query: ?mode=documentation|artifacts|scripts|all
 */
router.get('/cleanup/stats', requireRole(['super_admin']), async (req, res) => {
  try {
    const { mode = 'documentation' } = req.query;
    
    const LibraryOrganizer = require('../services/libraryOrganizer');
    const organizer = new LibraryOrganizer(undefined, mode);
    
    const stats = await organizer.getStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
