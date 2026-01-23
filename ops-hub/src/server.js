/**
 * OM-Ops Hub Server
 * 
 * Standalone sidecar service for serving OM-Ops artifacts
 * Port: 3010
 * Root: /var/backups/OM
 */

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const { indexArtifacts, getArtifact, getArtifactFile } = require('./artifacts/indexer');

const app = express();
const PORT = process.env.PORT || 3010;
const ARTIFACTS_ROOT = process.env.ARTIFACTS_ROOT || '/var/backups/OM';

// Middleware
app.use(morgan('combined'));
app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'om-ops-hub', port: PORT });
});

/**
 * GET /api/artifacts
 * List artifacts with filtering and pagination
 */
app.get('/api/artifacts', async (req, res) => {
  try {
    const { type, limit = 100, offset = 0, q, from, to } = req.query;
    
    let artifacts = await indexArtifacts(ARTIFACTS_ROOT);
    
    // Filter by type
    if (type) {
      artifacts = artifacts.filter(a => a.type === type);
    }
    
    // Search filter
    if (q) {
      const query = q.toLowerCase();
      artifacts = artifacts.filter(a => 
        a.title.toLowerCase().includes(query) ||
        (a.summary && a.summary.toLowerCase().includes(query)) ||
        (a.tags && a.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Date range filter
    if (from || to) {
      artifacts = artifacts.filter(a => {
        const createdAt = new Date(a.createdAt);
        if (from && createdAt < new Date(from)) return false;
        if (to && createdAt > new Date(to)) return false;
        return true;
      });
    }
    
    // Sort by createdAt descending
    artifacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const total = artifacts.length;
    const paginated = artifacts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      success: true,
      artifacts: paginated,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    console.error('[OM-Ops Hub] Error listing artifacts:', error);
    res.status(500).json({ success: false, error: 'Failed to list artifacts' });
  }
});

/**
 * GET /api/artifacts/:id
 * Get artifact metadata
 */
app.get('/api/artifacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const artifacts = await indexArtifacts(ARTIFACTS_ROOT);
    const artifact = artifacts.find(a => a.id === id);
    
    if (!artifact) {
      return res.status(404).json({ success: false, error: 'Artifact not found' });
    }
    
    res.json({
      success: true,
      artifact,
    });
  } catch (error) {
    console.error('[OM-Ops Hub] Error getting artifact:', error);
    res.status(500).json({ success: false, error: 'Failed to get artifact' });
  }
});

/**
 * GET /api/artifacts/:id/file/:filename
 * Stream artifact file safely
 */
app.get('/api/artifacts/:id/file/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params;
    
    // Validate filename
    const ext = path.extname(filename).toLowerCase();
    const safeExtensions = ['.html', '.json', '.txt', '.log', '.md', '.csv'];
    if (!safeExtensions.includes(ext)) {
      return res.status(400).json({ success: false, error: 'Unsafe file extension' });
    }
    
    // Get artifact and file
    const fileData = await getArtifactFile(ARTIFACTS_ROOT, id, filename);
    
    if (!fileData) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // Set content type
    const contentTypes = {
      '.html': 'text/html',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.log': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
    };
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    
    // Set CSP header for HTML files
    if (ext === '.html') {
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'self';"
      );
    }
    
    // Stream file
    const fileStream = require('fs').createReadStream(fileData.path);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('[OM-Ops Hub] Error serving file:', error);
    res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

/**
 * Serve static UI
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

// Serve static assets if any
app.use('/static', express.static(path.join(__dirname, 'ui', 'static')));

// Start server
app.listen(PORT, () => {
  console.log(`[OM-Ops Hub] Server running on port ${PORT}`);
  console.log(`[OM-Ops Hub] Artifacts root: ${ARTIFACTS_ROOT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[OM-Ops Hub] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[OM-Ops Hub] SIGINT received, shutting down gracefully');
  process.exit(0);
});
