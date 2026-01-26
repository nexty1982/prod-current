/**
 * OM-Ops Reports Hub API Routes
 * 
 * Exposes OM-Ops artifacts (reports, logs, analysis) as a browsable library
 * Security: Admin-only access, path traversal protection, safe file serving
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
// Use the same auth pattern as other admin routes
const { requireAuth, requireRole } = require('../../middleware/auth');

const execFileAsync = promisify(execFile);

const router = express.Router();

// OM-Ops root directory
const OM_OPS_ROOT = '/var/backups/OM';

// Safe file extensions
const SAFE_EXTENSIONS = ['.html', '.json', '.txt', '.log', '.md', '.csv'];

// Artifact type mappings (folder -> type)
const ARTIFACT_TYPES = {
  'analysis': 'analysis',
  'changelog': 'changelog',
  'summary': 'system',
  'motivation': 'motivation',
  'roadmap': 'roadmap',
  'nginx': 'nginx',
  'uploads': 'uploads',
  'build': 'build',
};

/**
 * Admin-only middleware (reuse from auth middleware)
 */
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Validate and sanitize file path to prevent path traversal
 */
function sanitizePath(filePath) {
  // Remove any path traversal attempts
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  
  // Ensure path is within OM_OPS_ROOT
  const resolved = path.resolve(OM_OPS_ROOT, normalized);
  if (!resolved.startsWith(OM_OPS_ROOT)) {
    throw new Error('Path traversal detected');
  }
  
  return resolved;
}

/**
 * Check if file extension is safe
 */
function isSafeExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SAFE_EXTENSIONS.includes(ext);
}

/**
 * Get content type for file extension
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Discover artifacts in OM-Ops directory structure
 */
async function discoverArtifacts() {
  const artifacts = [];
  
  try {
    // Check if OM_OPS_ROOT exists
    await fs.access(OM_OPS_ROOT);
  } catch (error) {
    console.warn(`[OM-Ops] OM_OPS_ROOT not accessible: ${OM_OPS_ROOT}`);
    return artifacts;
  }

  // Scan known artifact directories
  const artifactDirs = [
    'analysis',
    'changelog',
    'summary',
    'motivation',
    'roadmap',
  ];

  for (const dir of artifactDirs) {
    const dirPath = path.join(OM_OPS_ROOT, dir);
    try {
      await fs.access(dirPath);
      
      // Check for report.html files
      const reportPath = path.join(dirPath, 'report.html');
      try {
        const stats = await fs.stat(reportPath);
        artifacts.push({
          id: `${dir}-report`,
          type: ARTIFACT_TYPES[dir] || dir,
          title: `${dir.charAt(0).toUpperCase() + dir.slice(1)} Report`,
          createdAt: stats.mtime.toISOString(),
          files: [{ name: 'report.html', size: stats.size, type: 'html' }],
          summary: `Main ${dir} report`,
          tags: [dir, 'report'],
          path: reportPath,
        });
      } catch (error) {
        // report.html doesn't exist, skip
      }

      // Check for runs/ subdirectories
      const runsPath = path.join(dirPath, 'runs');
      try {
        const runs = await fs.readdir(runsPath, { withFileTypes: true });
        
        for (const run of runs) {
          if (run.isDirectory()) {
            const runPath = path.join(runsPath, run.name);
            const runFiles = [];
            
            try {
              const files = await fs.readdir(runPath);
              for (const file of files) {
                const filePath = path.join(runPath, file);
                try {
                  const fileStats = await fs.stat(filePath);
                  if (fileStats.isFile() && isSafeExtension(file)) {
                    runFiles.push({
                      name: file,
                      size: fileStats.size,
                      type: path.extname(file).slice(1),
                    });
                  }
                } catch (error) {
                  // Skip files we can't stat
                }
              }
            } catch (error) {
              // Skip directories we can't read
            }

            if (runFiles.length > 0) {
              artifacts.push({
                id: `${dir}-${run.name}`,
                type: ARTIFACT_TYPES[dir] || dir,
                title: `${dir.charAt(0).toUpperCase() + dir.slice(1)} Run: ${run.name}`,
                createdAt: run.name.replace(/_/g, ':').replace(/-/g, '/'), // Try to parse timestamp from folder name
                files: runFiles,
                summary: `Run artifacts from ${run.name}`,
                tags: [dir, 'run', run.name],
                path: runPath,
              });
            }
          }
        }
      } catch (error) {
        // runs/ directory doesn't exist, skip
      }

      // Check for index.json files
      const indexPath = path.join(dirPath, 'index.json');
      try {
        const stats = await fs.stat(indexPath);
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const indexData = JSON.parse(indexContent);
        
        // Extract run information from index.json if available
        if (Array.isArray(indexData) || (indexData.runs && Array.isArray(indexData.runs))) {
          const runs = Array.isArray(indexData) ? indexData : indexData.runs;
          for (const run of runs) {
            if (run.run_id || run.session_id || run.id) {
              const runId = run.run_id || run.session_id || run.id;
              artifacts.push({
                id: `${dir}-${runId}`,
                type: ARTIFACT_TYPES[dir] || dir,
                title: run.title || `${dir} Run: ${runId}`,
                createdAt: run.created_at || run.started_at || run.createdAt || new Date().toISOString(),
                files: run.files || [],
                summary: run.summary || run.outcome || '',
                tags: [dir, 'indexed', ...(run.tags || [])],
                path: path.join(dirPath, 'runs', runId),
              });
            }
          }
        }
      } catch (error) {
        // index.json doesn't exist or is invalid, skip
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
  }

  return artifacts;
}

/**
 * GET /api/admin/ops/artifacts
 * List all artifacts with filtering
 */
router.get('/artifacts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, limit = 100, offset = 0, q, from, to } = req.query;
    
    let artifacts = await discoverArtifacts();
    
    // Filter by type
    if (type) {
      artifacts = artifacts.filter(a => a.type === type);
    }
    
    // Search filter
    if (q) {
      const query = q.toLowerCase();
      artifacts = artifacts.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
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
    console.error('[OM-Ops API] Error listing artifacts:', error);
    res.status(500).json({ success: false, error: 'Failed to list artifacts' });
  }
});

/**
 * GET /api/admin/ops/artifacts/:id
 * Get artifact metadata
 */
router.get('/artifacts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const artifacts = await discoverArtifacts();
    const artifact = artifacts.find(a => a.id === id);
    
    if (!artifact) {
      return res.status(404).json({ success: false, error: 'Artifact not found' });
    }
    
    res.json({
      success: true,
      artifact,
    });
  } catch (error) {
    console.error('[OM-Ops API] Error getting artifact:', error);
    res.status(500).json({ success: false, error: 'Failed to get artifact' });
  }
});

/**
 * GET /api/admin/ops/artifacts/:id/file/:filename
 * Stream artifact file safely
 */
router.get('/artifacts/:id/file/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, filename } = req.params;
    
    // Validate filename
    if (!isSafeExtension(filename)) {
      return res.status(400).json({ success: false, error: 'Unsafe file extension' });
    }
    
    // Find artifact
    const artifacts = await discoverArtifacts();
    const artifact = artifacts.find(a => a.id === id);
    
    if (!artifact) {
      return res.status(404).json({ success: false, error: 'Artifact not found' });
    }
    
    // Check if file exists in artifact
    const file = artifact.files.find(f => f.name === filename);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found in artifact' });
    }
    
    // Build file path
    let filePath;
    if (artifact.path.endsWith('.html')) {
      // Artifact path is the file itself
      filePath = artifact.path;
    } else {
      // Artifact path is directory, file is inside
      filePath = path.join(artifact.path, filename);
    }
    
    // Sanitize and validate path
    try {
      filePath = sanitizePath(path.relative(OM_OPS_ROOT, filePath));
    } catch (error) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }
    
    // Check if file exists
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return res.status(400).json({ success: false, error: 'Not a file' });
      }
    } catch (error) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // Set content type
    const contentType = getContentType(filename);
    res.setHeader('Content-Type', contentType);
    
    // Set CSP header for HTML files
    if (filename.endsWith('.html')) {
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
      );
    }
    
    // Stream file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('[OM-Ops API] Error serving file:', error);
    res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

/**
 * Git Operations Endpoints
 * Safe, allowlisted git commands for admin/super_admin only
 */

// Repository root (where git commands will run)
const REPO_ROOT = '/var/www/orthodoxmetrics/prod';

/**
 * GET /api/ops/git/status
 * Runs: git status --short --branch
 * Admin/super_admin only, runs at repo root only
 */
router.get('/git/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Run git status --short --branch
    const { stdout, stderr } = await execFileAsync(
      'git',
      ['status', '--short', '--branch'],
      {
        cwd: REPO_ROOT,
        timeout: 5000, // 5 second timeout
        maxBuffer: 1024 * 1024, // 1MB max output
      }
    );

    if (stderr && !stdout) {
      return res.status(500).json({
        success: false,
        error: 'Git command failed',
        message: stderr
      });
    }

    res.json({
      success: true,
      output: stdout,
      stderr: stderr || null
    });
  } catch (error) {
    console.error('[Git Ops] Error running git status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run git status',
      message: error.message
    });
  }
});

/**
 * POST /api/ops/git/branches/create-default
 * Creates exactly these branches (no client-provided names):
 * - fix/build-events-users-softdelete
 * - chore/gallery-dir-bootstrap
 * Idempotent: if branch exists, returns "exists" status
 * Creates from current HEAD, does not change current branch
 */
router.post('/git/branches/create-default', requireAuth, requireAdmin, async (req, res) => {
  try {
    const DEFAULT_BRANCHES = [
      'fix/build-events-users-softdelete',
      'chore/gallery-dir-bootstrap'
    ];

    // Get current branch and SHA
    let currentBranch, currentSha;
    try {
      const { stdout: branchOutput } = await execFileAsync(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        {
          cwd: REPO_ROOT,
          timeout: 3000,
        }
      );
      currentBranch = branchOutput.trim();

      const { stdout: shaOutput } = await execFileAsync(
        'git',
        ['rev-parse', 'HEAD'],
        {
          cwd: REPO_ROOT,
          timeout: 3000,
        }
      );
      currentSha = shaOutput.trim();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get current branch info',
        message: error.message
      });
    }

    const results = [];

    // Create each branch
    for (const branchName of DEFAULT_BRANCHES) {
      try {
        // Check if branch already exists
        try {
          await execFileAsync(
            'git',
            ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`],
            {
              cwd: REPO_ROOT,
              timeout: 3000,
            }
          );
          // Branch exists
          results.push({
            name: branchName,
            status: 'exists',
            message: 'Branch already exists'
          });
        } catch (checkError) {
          // Branch doesn't exist, create it
          await execFileAsync(
            'git',
            ['checkout', '-b', branchName],
            {
              cwd: REPO_ROOT,
              timeout: 5000,
            }
          );

          // Switch back to original branch
          await execFileAsync(
            'git',
            ['checkout', currentBranch],
            {
              cwd: REPO_ROOT,
              timeout: 5000,
            }
          );

          results.push({
            name: branchName,
            status: 'created',
            message: 'Branch created successfully'
          });
        }
      } catch (error) {
        results.push({
          name: branchName,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      ok: true,
      baseBranch: currentBranch,
      baseSha: currentSha,
      results: results
    });
  } catch (error) {
    console.error('[Git Ops] Error creating default branches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create branches',
      message: error.message
    });
  }
});

module.exports = router;
