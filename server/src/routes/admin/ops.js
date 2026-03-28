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

// Branch notes file — lightweight operator overrides/notes for branch analysis
const REPO_ROOT_FOR_NOTES = path.resolve(__dirname, '../../../../');
const BRANCH_NOTES_FILE = path.join(REPO_ROOT_FOR_NOTES, '.branch-notes.json');

/** Load branch notes from disk (returns {} on missing/corrupt file) */
async function loadBranchNotes() {
  try {
    const raw = await fs.readFile(BRANCH_NOTES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Save branch notes to disk */
async function saveBranchNotes(notes) {
  await fs.writeFile(BRANCH_NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8');
}

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

// Allowed repositories — whitelist for multi-repo support
const REPOS = {
  orthodoxmetrics: '/var/www/orthodoxmetrics/prod',
  omai: '/var/www/omai',
};
const DEFAULT_REPO = 'orthodoxmetrics';

/** Resolve repo root from ?repo= query param. Returns { repoKey, repoRoot } or throws. */
function resolveRepo(req) {
  const key = (req.query.repo || DEFAULT_REPO).toLowerCase();
  const root = REPOS[key];
  if (!root) throw new Error(`Unknown repository: ${key}. Allowed: ${Object.keys(REPOS).join(', ')}`);
  return { repoKey: key, repoRoot: root };
}

// GET /api/ops/git/repos — list available repositories
router.get('/git/repos', requireAuth, requireAdmin, async (req, res) => {
  res.json({ repos: Object.keys(REPOS).map(k => ({ key: k, path: REPOS[k] })) });
});



/**
 * GET /api/ops/git/status
 * Runs: git status --short --branch
 * Admin/super_admin only, runs at repo root only
 */
router.get('/git/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    // Run git status --short --branch
    const { stdout, stderr } = await execFileAsync(
      'git',
      ['status', '--short', '--branch'],
      {
        cwd: repoRoot,
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
    const { repoKey, repoRoot } = resolveRepo(req);
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
          cwd: repoRoot,
          timeout: 3000,
        }
      );
      currentBranch = branchOutput.trim();

      const { stdout: shaOutput } = await execFileAsync(
        'git',
        ['rev-parse', 'HEAD'],
        {
          cwd: repoRoot,
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
              cwd: repoRoot,
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
              cwd: repoRoot,
              timeout: 5000,
            }
          );

          // Switch back to original branch
          await execFileAsync(
            'git',
            ['checkout', currentBranch],
            {
              cwd: repoRoot,
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

/**
 * GET /api/ops/git/branch-analysis
 *
 * Remote-authoritative branch analysis.
 *
 * PRIMARY SOURCE OF TRUTH: remote branches (refs/remotes/origin/*)
 *   - All comparisons are against origin/main
 *   - Merged status uses `git branch -r --merged origin/main`
 *   - Every remote branch is enumerated and classified
 *
 * SECONDARY: local context
 *   - Current checked-out branch, working tree clean/dirty
 *   - Whether a local branch exists for a given remote branch
 *   - Local-only branches (no remote counterpart) listed separately
 *
 * Response shape:
 *   remoteBranches[]  — repo-authoritative cleanup table
 *   localOnlyBranches[] — local branches with no remote counterpart
 *   localContext       — workstation state
 *   summary            — aggregated counts
 */
router.get('/git/branch-analysis', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    // ── Step 0: Load operator branch notes ────────────────────
    const branchNotes = await loadBranchNotes();

    // ── Step 1: Fetch all remotes with prune ──────────────────
    let fetchOk = true;
    try {
      await execFileAsync('git', ['fetch', '--all', '--prune'], { cwd: repoRoot, timeout: 30000 });
    } catch (err) {
      fetchOk = false;
      console.warn('[Branch Analysis] git fetch --all --prune failed:', err.message);
    }

    // ── Step 2: Local context (workstation state) ────────────
    const { stdout: headOut } = await execFileAsync(
      'git', ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: repoRoot, timeout: 3000 }
    );
    const currentBranch = headOut.trim();

    // Working tree clean/dirty
    let isClean = true;
    try {
      const { stdout: statusOut } = await execFileAsync(
        'git', ['status', '--porcelain'],
        { cwd: repoRoot, timeout: 5000 }
      );
      isClean = !statusOut.trim();
    } catch { /* assume dirty on error */ isClean = false; }

    // Current branch tracking info
    let currentTrackingRemote = null;
    try {
      const { stdout: trackOut } = await execFileAsync(
        'git', ['rev-parse', '--abbrev-ref', `${currentBranch}@{upstream}`],
        { cwd: repoRoot, timeout: 3000 }
      );
      currentTrackingRemote = trackOut.trim();
    } catch { /* no upstream configured */ }

    // ── Step 3: Resolve origin/main ──────────────────────────
    let originMainSha;
    try {
      const { stdout: mainOut } = await execFileAsync(
        'git', ['rev-parse', 'origin/main'],
        { cwd: repoRoot, timeout: 3000 }
      );
      originMainSha = mainOut.trim();
    } catch {
      return res.status(500).json({ success: false, error: 'Cannot resolve origin/main' });
    }

    // ── Step 4: Enumerate all remote branches ────────────────
    const { stdout: remoteOut } = await execFileAsync(
      'git', ['branch', '-r', '--format=%(refname:short)'],
      { cwd: repoRoot, timeout: 5000 }
    );
    const allRemoteRefs = remoteOut.trim().split('\n').filter(Boolean);
    // Exclude origin/HEAD, origin/main, and non-origin refs
    const remoteBranchNames = allRemoteRefs
      .filter(r => r.startsWith('origin/') && r !== 'origin/HEAD' && r !== 'origin/main')
      .map(r => r.replace('origin/', ''));

    // ── Step 5: Get remote branches merged into origin/main ──
    const { stdout: mergedOut } = await execFileAsync(
      'git', ['branch', '-r', '--merged', 'origin/main', '--format=%(refname:short)'],
      { cwd: repoRoot, timeout: 10000 }
    );
    const mergedRemoteSet = new Set(
      mergedOut.trim().split('\n').filter(Boolean)
        .filter(r => r.startsWith('origin/'))
        .map(r => r.replace('origin/', ''))
    );

    // ── Step 6: Get all local branches for cross-reference ───
    const { stdout: localOut } = await execFileAsync(
      'git', ['branch', '--format=%(refname:short)'],
      { cwd: repoRoot, timeout: 5000 }
    );
    const localBranches = localOut.trim().split('\n').filter(Boolean);
    const localBranchSet = new Set(localBranches);

    // Build set of remote branch names for local-only detection
    const remoteBranchSet = new Set(remoteBranchNames);

    // ── Step 7: Analyze each remote branch vs origin/main ────
    const remoteBranchData = [];

    for (const branchName of remoteBranchNames) {
      const remoteRef = `origin/${branchName}`;
      try {
        // Ahead/behind vs origin/main
        const { stdout: abOut } = await execFileAsync(
          'git', ['rev-list', '--left-right', '--count', `origin/main...${remoteRef}`],
          { cwd: repoRoot, timeout: 3000 }
        );
        const [behindStr, aheadStr] = abOut.trim().split(/\s+/);
        const ahead = parseInt(aheadStr) || 0;
        const behind = parseInt(behindStr) || 0;

        // Last commit info (include unix timestamp for age-based classification)
        const { stdout: logOut } = await execFileAsync(
          'git', ['log', '-1', '--format=%s|%ar|%H|%at', remoteRef],
          { cwd: repoRoot, timeout: 3000 }
        );
        const logParts = logOut.trim().split('|');
        const lastCommitMsg = logParts[0] || '';
        const lastCommitDate = logParts[1] || '';
        const lastCommitSha = logParts[2] || '';
        const lastCommitEpoch = parseInt(logParts[3]) || 0;

        // Merge base vs origin/main
        let mergeBase = '';
        try {
          const { stdout: mbOut } = await execFileAsync(
            'git', ['merge-base', 'origin/main', remoteRef],
            { cwd: repoRoot, timeout: 3000 }
          );
          mergeBase = mbOut.trim().substring(0, 8);
        } catch { /* orphan */ }

        // Changed files count (only for non-merged branches to save time)
        let changedFiles = 0;
        const isMerged = mergedRemoteSet.has(branchName);
        if (!isMerged && ahead > 0) {
          try {
            const { stdout: diffOut } = await execFileAsync(
              'git', ['diff', '--name-only', `origin/main...${remoteRef}`],
              { cwd: repoRoot, timeout: 5000 }
            );
            changedFiles = diffOut.trim().split('\n').filter(Boolean).length;
          } catch { /* ignore */ }
        }

        // ── Classification (remote-authoritative) ──────────
        let classification, recommendedAction, confidence;

        // Age calculation (days since last commit)
        const nowEpoch = Math.floor(Date.now() / 1000);
        const commitAgeDays = lastCommitEpoch > 0 ? (nowEpoch - lastCommitEpoch) / 86400 : 999;

        // Check for operator note/override
        const branchNote = branchNotes[branchName] || null;

        if (isMerged && ahead === 0) {
          classification = 'Already Merged';
          recommendedAction = 'Delete';
          confidence = 'high';
        } else if (ahead === 0 && behind > 0) {
          classification = 'Safe To Delete';
          recommendedAction = 'Delete';
          confidence = 'high';
        } else if (ahead > 0 && behind === 0) {
          classification = 'Fast-Forward Safe';
          recommendedAction = 'Merge';
          confidence = 'high';
        } else if (ahead > 0 && behind > 0) {
          // Has unique commits AND behind — multi-tier classification:
          //
          // 1. PARKED WORK — large viable feature branch, not truly stale
          //    - substantial unique work (ahead >= 15)
          //    - trivial divergence: behind is small relative to ahead
          //      (behind <= 5 OR behind/ahead ratio < 0.2)
          //    - NOT massively behind (behind < 30)
          //    Rationale: a 57-commit branch that's 1 commit behind is
          //    parked work, not stale. The age alone shouldn't condemn it.
          //
          // 2. STALE / DIVERGED — abandoned or hopelessly diverged
          //    - behind >= 20 AND ahead is small (ahead <= 10)
          //    - OR behind >= 30 regardless of ahead (massive divergence)
          //    - OR age > 30 days AND behind >= 10 (old AND diverged)
          //    - BUT NOT if ahead is large with trivial behind (that's parked)
          //
          // 3. NEEDS REBASE — active work with manageable divergence
          //    - everything else (moderate behind, recent activity)

          const behindAheadRatio = behind / ahead;
          const isParkedWork =
            ahead >= 15 &&
            behind < 30 &&
            (behind <= 5 || behindAheadRatio < 0.2);

          const isStale =
            !isParkedWork && (
              (behind >= 30) ||
              (behind >= 20 && ahead <= 10) ||
              (commitAgeDays > 30 && behind >= 10) ||
              (ahead <= 10 && behind >= 20)
            );

          if (isParkedWork) {
            classification = 'Parked Work';
            recommendedAction = 'Review';
            confidence = behindAheadRatio < 0.1 ? 'high' : 'medium';
          } else if (isStale) {
            classification = 'Stale / Diverged';
            recommendedAction = 'Delete';
            const staleSignals = [behind >= 30, (behind >= 20 && ahead <= 10), (commitAgeDays > 30 && behind >= 10)].filter(Boolean).length;
            confidence = staleSignals >= 2 ? 'high' : 'medium';
          } else {
            classification = 'Needs Rebase';
            recommendedAction = 'Rebase';
            confidence = behind <= 5 ? 'high' : 'medium';
          }
        } else {
          classification = 'Manual Review';
          recommendedAction = 'Review';
          confidence = 'low';
        }

        // Local tracking info
        const hasLocal = localBranchSet.has(branchName);
        const isCurrentBranch = branchName === currentBranch;

        remoteBranchData.push({
          name: branchName,
          remoteRef,
          ahead,
          behind,
          lastCommit: lastCommitMsg || '',
          lastCommitDate: lastCommitDate || '',
          lastCommitSha: (lastCommitSha || '').substring(0, 8),
          changedFiles,
          classification,
          recommendedAction,
          confidence,
          commitAgeDays: Math.round(commitAgeDays),
          mergeBase,
          isMerged,
          // Local context flags
          hasLocal,
          isCurrent: isCurrentBranch,
          source: hasLocal ? 'both' : 'remote',
          // Operator note (if any)
          note: branchNote?.note || null,
          noteUpdated: branchNote?.updated || null,
        });
      } catch (err) {
        console.warn(`[Branch Analysis] Error analyzing remote ${branchName}:`, err.message);
      }
    }

    // ── Step 8: Find local-only branches (no remote) ─────────
    const localOnlyBranches = [];
    for (const localBranch of localBranches) {
      if (localBranch === 'main') continue;
      if (remoteBranchSet.has(localBranch)) continue; // has remote counterpart

      try {
        // Check if it has unpushed commits vs origin/main
        const { stdout: abOut } = await execFileAsync(
          'git', ['rev-list', '--left-right', '--count', `origin/main...${localBranch}`],
          { cwd: repoRoot, timeout: 3000 }
        );
        const [behindStr, aheadStr] = abOut.trim().split(/\s+/);
        const ahead = parseInt(aheadStr) || 0;
        const behind = parseInt(behindStr) || 0;

        // Last commit info
        const { stdout: logOut } = await execFileAsync(
          'git', ['log', '-1', '--format=%s|%ar|%H', localBranch],
          { cwd: repoRoot, timeout: 3000 }
        );
        const [lastCommitMsg, lastCommitDate, lastCommitSha] = logOut.trim().split('|');

        // Check if merged into origin/main
        let isMerged = false;
        try {
          const { stdout: mergeCheckOut } = await execFileAsync(
            'git', ['branch', '--merged', 'origin/main', '--format=%(refname:short)'],
            { cwd: repoRoot, timeout: 5000 }
          );
          isMerged = mergeCheckOut.trim().split('\n').includes(localBranch);
        } catch { /* ignore */ }

        // Classification for local-only
        let recommendedAction;
        if (isMerged && ahead === 0) {
          recommendedAction = 'Delete';
        } else if (ahead > 0) {
          recommendedAction = 'Push';
        } else {
          recommendedAction = 'Review';
        }

        localOnlyBranches.push({
          name: localBranch,
          ahead,
          behind,
          lastCommit: lastCommitMsg || '',
          lastCommitDate: lastCommitDate || '',
          lastCommitSha: (lastCommitSha || '').substring(0, 8),
          isCurrent: localBranch === currentBranch,
          hasUnpushedCommits: ahead > 0,
          isMerged,
          recommendedAction,
          source: 'local',
        });
      } catch (err) {
        console.warn(`[Branch Analysis] Error analyzing local-only ${localBranch}:`, err.message);
      }
    }

    // ── Step 9: Sort ─────────────────────────────────────────
    const classOrder = {
      'Already Merged': 0,
      'Safe To Delete': 1,
      'Fast-Forward Safe': 2,
      'Needs Rebase': 3,
      'Parked Work': 4,
      'Stale / Diverged': 5,
      'Manual Review': 6,
    };
    remoteBranchData.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return (classOrder[a.classification] ?? 5) - (classOrder[b.classification] ?? 5);
    });

    // ── Step 10: Summary ─────────────────────────────────────
    const summary = {
      totalRemote: remoteBranchData.length,
      totalLocalOnly: localOnlyBranches.length,
      alreadyMerged: remoteBranchData.filter(b => b.classification === 'Already Merged').length,
      safeToDelete: remoteBranchData.filter(b => b.classification === 'Safe To Delete').length,
      fastForwardSafe: remoteBranchData.filter(b => b.classification === 'Fast-Forward Safe').length,
      needsRebase: remoteBranchData.filter(b => b.classification === 'Needs Rebase').length,
      parkedWork: remoteBranchData.filter(b => b.classification === 'Parked Work').length,
      staleDiverged: remoteBranchData.filter(b => b.classification === 'Stale / Diverged').length,
      manualReview: remoteBranchData.filter(b => b.classification === 'Manual Review').length,
    };

    res.json({
      success: true,
      fetchOk,
      comparisonTarget: 'origin/main',
      originMainSha: originMainSha.substring(0, 8),
      localContext: {
        currentBranch,
        isClean,
        trackingRemote: currentTrackingRemote,
      },
      remoteBranches: remoteBranchData,
      localOnlyBranches,
      summary,
    });
  } catch (error) {
    console.error('[Git Ops] Branch analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Branch analysis failed',
      message: error.message,
    });
  }
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/ops/git/branch/:branchName
// Safely delete a remote (and optionally local) branch.
// Only allowed for branches classified as "Already Merged" or "Safe To Delete".
// ────────────────────────────────────────────────────────────────
router.delete('/git/branch/:branchName', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { repoKey, repoRoot } = resolveRepo(req);
  const { branchName } = req.params;

  // ── Safety: validate branch name ──────────────────────────
  if (!branchName || branchName === 'main' || branchName === 'master') {
    return res.status(400).json({ success: false, error: 'Cannot delete protected branch' });
  }

  // Reject any shell-unsafe characters
  if (!/^[a-zA-Z0-9._\-\/]+$/.test(branchName)) {
    return res.status(400).json({ success: false, error: 'Invalid branch name' });
  }

  try {
    // ── Step 1: Verify classification before deletion ────────
    // Re-derive classification live — never trust the client
    const remoteRef = `origin/${branchName}`;

    // Check branch exists on remote
    try {
      await execFileAsync('git', ['rev-parse', '--verify', remoteRef], { cwd: repoRoot, timeout: 3000 });
    } catch {
      return res.status(404).json({ success: false, error: `Remote branch not found: ${branchName}` });
    }

    // Check if merged into origin/main
    let isMerged = false;
    try {
      const { stdout: mergedOut } = await execFileAsync(
        'git', ['branch', '-r', '--merged', 'origin/main', '--format=%(refname:short)'],
        { cwd: repoRoot, timeout: 5000 }
      );
      isMerged = mergedOut.trim().split('\n').map(s => s.replace('origin/', '')).includes(branchName);
    } catch { /* ignore */ }

    // Get ahead/behind
    const { stdout: abOut } = await execFileAsync(
      'git', ['rev-list', '--left-right', '--count', `origin/main...${remoteRef}`],
      { cwd: repoRoot, timeout: 3000 }
    );
    const [behindStr, aheadStr] = abOut.trim().split(/\s+/);
    const ahead = parseInt(aheadStr) || 0;
    const behind = parseInt(behindStr) || 0;

    // Derive classification (same logic as analysis endpoint)
    let classification;
    if (isMerged && ahead === 0) {
      classification = 'Already Merged';
    } else if (ahead === 0 && behind > 0) {
      classification = 'Safe To Delete';
    } else if (ahead > 0 && behind > 0) {
      // Check for parked work vs stale/diverged
      const behindAheadRatio = behind / ahead;
      const isParkedWork = ahead >= 15 && behind < 30 && (behind <= 5 || behindAheadRatio < 0.2);
      // Get commit age for stale detection
      let commitAgeDays = 0;
      try {
        const { stdout: dateOut } = await execFileAsync(
          'git', ['log', '-1', '--format=%ci', remoteRef],
          { cwd: repoRoot, timeout: 3000 }
        );
        commitAgeDays = Math.floor((Date.now() - new Date(dateOut.trim()).getTime()) / 86400000);
      } catch { /* ignore */ }

      const isStale = !isParkedWork && (
        (behind >= 30) ||
        (behind >= 20 && ahead <= 10) ||
        (commitAgeDays > 30 && behind >= 10) ||
        (ahead <= 10 && behind >= 20)
      );

      if (isParkedWork) {
        classification = 'Parked Work';
      } else if (isStale) {
        classification = 'Stale / Diverged';
      } else {
        classification = 'other';
      }
    } else {
      classification = 'other';
    }

    // ── Step 2: Gate — only allow deletable classifications ──
    const SAFE_CLASSIFICATIONS = ['Already Merged', 'Safe To Delete', 'Stale / Diverged'];
    if (!SAFE_CLASSIFICATIONS.includes(classification)) {
      return res.status(403).json({
        success: false,
        error: 'Branch is not eligible for deletion',
        classification,
        ahead,
        behind,
        message: `This branch is classified as "${classification}" and cannot be deleted through this endpoint.`,
      });
    }

    // ── Step 3: Delete remote branch ─────────────────────────
    console.log(`[Git Ops] Deleting remote branch: ${branchName} (classification: ${classification})`);
    await execFileAsync(
      'git', ['push', 'origin', '--delete', branchName],
      { cwd: repoRoot, timeout: 15000 }
    );
    console.log(`[Git Ops] Remote branch deleted: ${branchName}`);

    // ── Step 4: Delete local branch if it exists (safe -d) ──
    let localDeleted = false;
    try {
      // Check if local branch exists
      await execFileAsync('git', ['rev-parse', '--verify', branchName], { cwd: repoRoot, timeout: 3000 });

      // Check it's not the current branch
      const { stdout: curBranch } = await execFileAsync(
        'git', ['branch', '--show-current'],
        { cwd: repoRoot, timeout: 3000 }
      );
      if (curBranch.trim() === branchName) {
        console.log(`[Git Ops] Skipping local delete — branch ${branchName} is currently checked out`);
      } else {
        // Safe delete (will fail if unmerged commits exist locally)
        await execFileAsync('git', ['branch', '-d', branchName], { cwd: repoRoot, timeout: 5000 });
        localDeleted = true;
        console.log(`[Git Ops] Local branch deleted: ${branchName}`);
      }
    } catch {
      // Local branch doesn't exist or couldn't be deleted — that's fine
    }

    // ── Step 5: Fetch + prune to sync refs ───────────────────
    try {
      await execFileAsync('git', ['fetch', '--prune'], { cwd: repoRoot, timeout: 15000 });
    } catch (err) {
      console.warn('[Git Ops] Post-delete fetch/prune warning:', err.message);
    }

    res.json({
      success: true,
      branch: branchName,
      classification,
      remoteDeleted: true,
      localDeleted,
      message: `Branch "${branchName}" deleted successfully`,
    });
  } catch (error) {
    console.error(`[Git Ops] Branch deletion error for ${branchName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Branch deletion failed',
      message: error.message,
    });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/branch/:branchName/merge
// Fast-forward merge a branch into main, push, and delete the branch.
// Only allowed for branches classified as "Fast-Forward Safe" (ahead > 0, behind === 0).
// ────────────────────────────────────────────────────────────────
router.post('/git/branch/:branchName/merge', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { repoKey, repoRoot } = resolveRepo(req);
  const { branchName } = req.params;

  // ── Safety: validate branch name ──────────────────────────
  if (!branchName || branchName === 'main' || branchName === 'master') {
    return res.status(400).json({ success: false, error: 'Cannot merge a protected branch into itself' });
  }
  if (!/^[a-zA-Z0-9._\-\/]+$/.test(branchName)) {
    return res.status(400).json({ success: false, error: 'Invalid branch name' });
  }

  try {
    // ── Step 1: Verify branch exists and is ff-safe ─────────
    const remoteRef = `origin/${branchName}`;
    try {
      await execFileAsync('git', ['rev-parse', '--verify', remoteRef], { cwd: repoRoot, timeout: 3000 });
    } catch {
      return res.status(404).json({ success: false, error: `Remote branch not found: ${branchName}` });
    }

    // Get ahead/behind relative to origin/main
    const { stdout: abOut } = await execFileAsync(
      'git', ['rev-list', '--left-right', '--count', `origin/main...${remoteRef}`],
      { cwd: repoRoot, timeout: 3000 }
    );
    const [behindStr, aheadStr] = abOut.trim().split(/\s+/);
    const ahead = parseInt(aheadStr) || 0;
    const behind = parseInt(behindStr) || 0;

    if (ahead === 0) {
      return res.status(400).json({ success: false, error: 'Branch has no unique commits to merge' });
    }
    if (behind > 0) {
      return res.status(400).json({
        success: false,
        error: `Branch is ${behind} commit(s) behind main — rebase required before merge`,
        ahead,
        behind,
      });
    }

    // ── Step 2: Perform fast-forward merge via repoService ──
    const { mergeToMain } = require('../../services/repoService');
    const result = mergeToMain(repoKey, branchName);

    res.json({
      success: true,
      ...result,
      message: `Branch "${branchName}" merged into main (fast-forward) and deleted`,
    });
  } catch (error) {
    console.error(`[Git Ops] Merge error for ${branchName}:`, error);
    res.status(error.code === 'FF_FAILED' ? 409 : 500).json({
      success: false,
      error: error.code === 'FF_FAILED' ? 'Fast-forward merge failed' : 'Merge failed',
      message: error.message,
    });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/branches/bulk-delete
// Safely delete multiple branches that are "Already Merged" or "Safe To Delete".
// Each branch is independently verified server-side before deletion.
// ────────────────────────────────────────────────────────────────
router.post('/git/branches/bulk-delete', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { repoKey, repoRoot } = resolveRepo(req);
  const { branches } = req.body;

  if (!Array.isArray(branches) || branches.length === 0) {
    return res.status(400).json({ success: false, error: 'No branches provided' });
  }

  // Hard cap to prevent abuse
  if (branches.length > 100) {
    return res.status(400).json({ success: false, error: 'Maximum 100 branches per bulk delete' });
  }

  const SAFE_CLASSIFICATIONS = ['Already Merged', 'Safe To Delete', 'Stale / Diverged'];
  const results = [];

  // Get current branch once
  let currentBranch = '';
  try {
    const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd: repoRoot, timeout: 3000 });
    currentBranch = stdout.trim();
  } catch { /* ignore */ }

  // Get merged branch list once
  let mergedBranches = [];
  try {
    const { stdout: mergedOut } = await execFileAsync(
      'git', ['branch', '-r', '--merged', 'origin/main', '--format=%(refname:short)'],
      { cwd: repoRoot, timeout: 5000 }
    );
    mergedBranches = mergedOut.trim().split('\n').map(s => s.replace('origin/', ''));
  } catch { /* ignore */ }

  for (const branchName of branches) {
    // Validate branch name
    if (!branchName || branchName === 'main' || branchName === 'master') {
      results.push({ branch: branchName, success: false, error: 'Protected branch' });
      continue;
    }
    if (!/^[a-zA-Z0-9._\-\/]+$/.test(branchName)) {
      results.push({ branch: branchName, success: false, error: 'Invalid branch name' });
      continue;
    }

    try {
      const remoteRef = `origin/${branchName}`;

      // Verify remote exists
      try {
        await execFileAsync('git', ['rev-parse', '--verify', remoteRef], { cwd: repoRoot, timeout: 3000 });
      } catch {
        results.push({ branch: branchName, success: false, error: 'Remote branch not found' });
        continue;
      }

      // Get ahead/behind
      const { stdout: abOut } = await execFileAsync(
        'git', ['rev-list', '--left-right', '--count', `origin/main...${remoteRef}`],
        { cwd: repoRoot, timeout: 3000 }
      );
      const [behindStr, aheadStr] = abOut.trim().split(/\s+/);
      const ahead = parseInt(aheadStr) || 0;
      const behind = parseInt(behindStr) || 0;
      const isMerged = mergedBranches.includes(branchName);

      // Re-derive classification
      let classification;
      if (isMerged && ahead === 0) {
        classification = 'Already Merged';
      } else if (ahead === 0 && behind > 0) {
        classification = 'Safe To Delete';
      } else if (ahead > 0 && behind > 0) {
        const behindAheadRatio = behind / ahead;
        const isParkedWork = ahead >= 15 && behind < 30 && (behind <= 5 || behindAheadRatio < 0.2);
        let commitAgeDays = 0;
        try {
          const { stdout: dateOut } = await execFileAsync(
            'git', ['log', '-1', '--format=%ci', remoteRef],
            { cwd: repoRoot, timeout: 3000 }
          );
          commitAgeDays = Math.floor((Date.now() - new Date(dateOut.trim()).getTime()) / 86400000);
        } catch { /* ignore */ }

        const isStale = !isParkedWork && (
          (behind >= 30) ||
          (behind >= 20 && ahead <= 10) ||
          (commitAgeDays > 30 && behind >= 10) ||
          (ahead <= 10 && behind >= 20)
        );

        if (isParkedWork) classification = 'Parked Work';
        else if (isStale) classification = 'Stale / Diverged';
        else classification = 'other';
      } else {
        classification = 'other';
      }

      if (!SAFE_CLASSIFICATIONS.includes(classification)) {
        results.push({ branch: branchName, success: false, error: 'Not eligible for deletion', classification, ahead });
        continue;
      }

      // Delete remote
      await execFileAsync('git', ['push', 'origin', '--delete', branchName], { cwd: repoRoot, timeout: 15000 });

      // Delete local if exists and not current
      let localDeleted = false;
      try {
        await execFileAsync('git', ['rev-parse', '--verify', branchName], { cwd: repoRoot, timeout: 3000 });
        if (currentBranch !== branchName) {
          await execFileAsync('git', ['branch', '-d', branchName], { cwd: repoRoot, timeout: 5000 });
          localDeleted = true;
        }
      } catch { /* local doesn't exist */ }

      results.push({ branch: branchName, success: true, classification, localDeleted });
      console.log(`[Git Ops] Bulk delete: ${branchName} (${classification}) — remote deleted, local ${localDeleted ? 'deleted' : 'skipped'}`);
    } catch (error) {
      results.push({ branch: branchName, success: false, error: error.message });
      console.error(`[Git Ops] Bulk delete error for ${branchName}:`, error.message);
    }
  }

  // Prune once at the end
  try {
    await execFileAsync('git', ['fetch', '--prune'], { cwd: repoRoot, timeout: 15000 });
  } catch (err) {
    console.warn('[Git Ops] Post-bulk-delete prune warning:', err.message);
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  res.json({
    success: failed === 0,
    total: branches.length,
    succeeded,
    failed,
    results,
    message: `Deleted ${succeeded} of ${branches.length} branch(es)${failed > 0 ? ` (${failed} failed)` : ''}`,
  });
});

// ────────────────────────────────────────────────────────────────
// PUT /api/ops/git/branch-notes/:branchName
// Set an operator note for a branch (persists to .branch-notes.json)
// ────────────────────────────────────────────────────────────────
router.put('/git/branch-notes/:branchName', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { branchName } = req.params;
  const { note } = req.body;

  if (!branchName || !/^[a-zA-Z0-9._\-\/]+$/.test(branchName)) {
    return res.status(400).json({ success: false, error: 'Invalid branch name' });
  }

  try {
    const notes = await loadBranchNotes();

    if (!note || note.trim() === '') {
      // Remove note
      delete notes[branchName];
    } else {
      notes[branchName] = {
        note: note.trim().substring(0, 500), // cap at 500 chars
        updated: new Date().toISOString(),
      };
    }

    await saveBranchNotes(notes);
    res.json({ success: true, branch: branchName, note: notes[branchName] || null });
  } catch (error) {
    console.error('[Git Ops] Branch note error:', error);
    res.status(500).json({ success: false, error: 'Failed to save branch note', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/branch-notes
// Get all operator branch notes
// ────────────────────────────────────────────────────────────────
router.get('/git/branch-notes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const notes = await loadBranchNotes();
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load branch notes' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/working-changes?repo=...
// List modified, staged, and untracked files with short diff info
// ────────────────────────────────────────────────────────────────
router.get('/git/working-changes', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const opts = { cwd: repoRoot, timeout: 10000, maxBuffer: 5 * 1024 * 1024 };

    // Porcelain v2 status for machine-readable output
    const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain=v1'], opts);

    const files = [];
    for (const line of statusOut.split('\n').filter(Boolean)) {
      const index = line[0];   // staged status
      const working = line[1]; // working tree status
      const filePath = line.substring(3);
      let status = 'modified';
      if (index === '?' && working === '?') status = 'untracked';
      else if (index === 'A') status = 'added';
      else if (index === 'D' || working === 'D') status = 'deleted';
      else if (index === 'R') status = 'renamed';

      const staged = index !== ' ' && index !== '?';
      files.push({ path: filePath, status, staged, index, working });
    }

    // Get current branch
    const { stdout: branchOut } = await execFileAsync('git', ['branch', '--show-current'], opts);

    res.json({
      success: true,
      repo: repoKey,
      branch: branchOut.trim(),
      files,
      totalModified: files.filter(f => f.status !== 'untracked').length,
      totalUntracked: files.filter(f => f.status === 'untracked').length,
      totalStaged: files.filter(f => f.staged).length,
    });
  } catch (error) {
    console.error('[Git Ops] working-changes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get working changes', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/stage
// Stage specific files for commit
// Body: { files: string[] } or { all: true }
// ────────────────────────────────────────────────────────────────
router.post('/git/stage', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { files, all } = req.body;
    const opts = { cwd: repoRoot, timeout: 15000 };

    if (all) {
      await execFileAsync('git', ['add', '-A'], opts);
    } else if (Array.isArray(files) && files.length > 0) {
      // Validate file paths — no path traversal
      for (const f of files) {
        if (f.includes('..') || f.startsWith('/')) {
          return res.status(400).json({ success: false, error: `Invalid file path: ${f}` });
        }
      }
      await execFileAsync('git', ['add', '--', ...files], opts);
    } else {
      return res.status(400).json({ success: false, error: 'Provide files array or all: true' });
    }

    // Return updated status
    const { stdout } = await execFileAsync('git', ['status', '--porcelain=v1'], opts);
    const staged = stdout.split('\n').filter(l => l && l[0] !== ' ' && l[0] !== '?').length;

    res.json({ success: true, repo: repoKey, stagedCount: staged });
  } catch (error) {
    console.error('[Git Ops] stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to stage files', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/unstage
// Unstage specific files
// Body: { files: string[] } or { all: true }
// ────────────────────────────────────────────────────────────────
router.post('/git/unstage', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { files, all } = req.body;
    const opts = { cwd: repoRoot, timeout: 15000 };

    if (all) {
      await execFileAsync('git', ['reset', 'HEAD'], opts);
    } else if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (f.includes('..') || f.startsWith('/')) {
          return res.status(400).json({ success: false, error: `Invalid file path: ${f}` });
        }
      }
      await execFileAsync('git', ['reset', 'HEAD', '--', ...files], opts);
    } else {
      return res.status(400).json({ success: false, error: 'Provide files array or all: true' });
    }

    res.json({ success: true, repo: repoKey });
  } catch (error) {
    console.error('[Git Ops] unstage error:', error);
    res.status(500).json({ success: false, error: 'Failed to unstage files', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/commit
// Commit staged changes
// Body: { message: string }
// ────────────────────────────────────────────────────────────────
router.post('/git/commit', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { message } = req.body;
    const opts = { cwd: repoRoot, timeout: 30000 };

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Commit message is required' });
    }

    // Verify there are staged changes
    const { stdout: statusOut } = await execFileAsync('git', ['diff', '--cached', '--stat'], opts);
    if (!statusOut.trim()) {
      return res.status(400).json({ success: false, error: 'Nothing staged to commit' });
    }

    const { stdout: commitOut } = await execFileAsync('git', ['commit', '-m', message.trim()], opts);

    // Get the new commit SHA
    const { stdout: shaOut } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], opts);

    res.json({
      success: true,
      repo: repoKey,
      sha: shaOut.trim(),
      output: commitOut.trim(),
    });
  } catch (error) {
    console.error('[Git Ops] commit error:', error);
    res.status(500).json({ success: false, error: 'Commit failed', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/push
// Push current branch to origin
// Body: { force?: boolean }
// ────────────────────────────────────────────────────────────────
router.post('/git/push', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { force } = req.body || {};
    const opts = { cwd: repoRoot, timeout: 60000 };

    // Get current branch
    const { stdout: branchOut } = await execFileAsync('git', ['branch', '--show-current'], opts);
    const branch = branchOut.trim();

    if (!branch) {
      return res.status(400).json({ success: false, error: 'Detached HEAD — cannot push' });
    }

    // Safety: never force-push main/master
    if (force && (branch === 'main' || branch === 'master')) {
      return res.status(400).json({ success: false, error: 'Force push to main/master is not allowed' });
    }

    const args = ['push', '-u', 'origin', branch];
    if (force) args.splice(1, 0, '--force-with-lease');

    const { stdout, stderr } = await execFileAsync('git', args, opts);

    res.json({
      success: true,
      repo: repoKey,
      branch,
      output: (stdout + '\n' + stderr).trim(),
    });
  } catch (error) {
    console.error('[Git Ops] push error:', error);
    res.status(500).json({ success: false, error: 'Push failed', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/compare?repo=...&base=...&head=...
// Compare two branches — diffstat + per-file changes
// ────────────────────────────────────────────────────────────────
router.get('/git/compare', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { base, head } = req.query;
    const opts = { cwd: repoRoot, timeout: 30000, maxBuffer: 10 * 1024 * 1024 };

    if (!base || !head) {
      return res.status(400).json({ success: false, error: 'base and head query params required' });
    }

    // Validate ref names (no shell injection)
    const refPattern = /^[a-zA-Z0-9._\-\/]+$/;
    if (!refPattern.test(base) || !refPattern.test(head)) {
      return res.status(400).json({ success: false, error: 'Invalid branch name' });
    }

    // Diff stat summary
    const { stdout: statOut } = await execFileAsync(
      'git', ['diff', '--stat', `${base}...${head}`], opts
    );

    // Numstat for machine-readable per-file changes
    const { stdout: numstatOut } = await execFileAsync(
      'git', ['diff', '--numstat', `${base}...${head}`], opts
    );

    const files = numstatOut.split('\n').filter(Boolean).map(line => {
      const [added, removed, filePath] = line.split('\t');
      return {
        path: filePath,
        added: added === '-' ? null : parseInt(added),
        removed: removed === '-' ? null : parseInt(removed),
      };
    });

    // Commit log between the two — with date and author
    const { stdout: logOut } = await execFileAsync(
      'git', ['log', '--format=%H%x09%h%x09%ai%x09%an%x09%s', '--no-merges', `${base}...${head}`], opts
    );
    const commits = logOut.split('\n').filter(Boolean).map(line => {
      const [fullSha, sha, date, author, message] = line.split('\t');
      return { sha, fullSha, date, author, message };
    });

    // Merge base
    let mergeBase = null;
    try {
      const { stdout: mbOut } = await execFileAsync('git', ['merge-base', base, head], opts);
      mergeBase = mbOut.trim().substring(0, 8);
    } catch { /* diverged or no common ancestor */ }

    res.json({
      success: true,
      repo: repoKey,
      base,
      head,
      mergeBase,
      summary: statOut.trim(),
      files,
      commits,
      totalFiles: files.length,
      totalAdded: files.reduce((s, f) => s + (f.added || 0), 0),
      totalRemoved: files.reduce((s, f) => s + (f.removed || 0), 0),
    });
  } catch (error) {
    console.error('[Git Ops] compare error:', error);
    res.status(500).json({ success: false, error: 'Compare failed', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/file-diff?repo=...&base=...&head=...&file=...
// Get the actual diff content for a single file between two branches
// ────────────────────────────────────────────────────────────────
router.get('/git/file-diff', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { base, head, file } = req.query;
    const opts = { cwd: repoRoot, timeout: 10000, maxBuffer: 2 * 1024 * 1024 };

    if (!base || !head || !file) {
      return res.status(400).json({ success: false, error: 'base, head, and file query params required' });
    }

    const refPattern = /^[a-zA-Z0-9._\-\/]+$/;
    if (!refPattern.test(base) || !refPattern.test(head)) {
      return res.status(400).json({ success: false, error: 'Invalid branch name' });
    }
    if (file.includes('..')) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }

    const { stdout } = await execFileAsync(
      'git', ['diff', `${base}...${head}`, '--', file], opts
    );

    res.json({ success: true, repo: repoKey, file, diff: stdout });
  } catch (error) {
    console.error('[Git Ops] file-diff error:', error);
    res.status(500).json({ success: false, error: 'File diff failed', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/gitignore?repo=...
// Read the .gitignore file, parsed into sections
// ────────────────────────────────────────────────────────────────
router.get('/git/gitignore', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const gitignorePath = path.join(repoRoot, '.gitignore');

    let raw = '';
    try {
      raw = await fs.readFile(gitignorePath, 'utf8');
    } catch {
      // No .gitignore yet
    }

    // Parse into sections: group consecutive non-blank lines under their preceding comment
    const lines = raw.split('\n');
    const sections = [];
    let currentSection = { title: 'General', lines: [] };

    for (const line of lines) {
      if (line.startsWith('# ') && currentSection.lines.length > 0) {
        sections.push(currentSection);
        currentSection = { title: line.substring(2).trim(), lines: [] };
      } else if (line.startsWith('# ') && currentSection.lines.length === 0) {
        currentSection.title = line.substring(2).trim();
      } else {
        currentSection.lines.push(line);
      }
    }
    if (currentSection.lines.length > 0 || sections.length === 0) {
      sections.push(currentSection);
    }

    // Check which ignored files are currently tracked (would need git rm --cached)
    let trackedIgnored = [];
    try {
      const { stdout } = await execFileAsync(
        'git', ['ls-files', '-ci', '--exclude-standard'],
        { cwd: repoRoot, timeout: 5000 }
      );
      trackedIgnored = stdout.split('\n').filter(Boolean);
    } catch { /* ok */ }

    // Get ignore stats
    let totalIgnored = 0;
    try {
      const { stdout } = await execFileAsync(
        'git', ['status', '--ignored', '--porcelain'],
        { cwd: repoRoot, timeout: 10000, maxBuffer: 5 * 1024 * 1024 }
      );
      totalIgnored = stdout.split('\n').filter(l => l.startsWith('!!')).length;
    } catch { /* ok */ }

    res.json({
      success: true,
      repo: repoKey,
      raw,
      sections,
      stats: {
        totalPatterns: lines.filter(l => l.trim() && !l.startsWith('#')).length,
        totalIgnoredFiles: totalIgnored,
        trackedIgnored,
      },
    });
  } catch (error) {
    console.error('[Git Ops] gitignore read error:', error);
    res.status(500).json({ success: false, error: 'Failed to read .gitignore', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// PUT /api/ops/git/gitignore?repo=...
// Update the .gitignore file
// Body: { content: string }
// ────────────────────────────────────────────────────────────────
router.put('/git/gitignore', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'content (string) is required' });
    }

    const gitignorePath = path.join(repoRoot, '.gitignore');

    // Ensure trailing newline
    const finalContent = content.endsWith('\n') ? content : content + '\n';
    await fs.writeFile(gitignorePath, finalContent, 'utf8');

    res.json({ success: true, repo: repoKey, message: '.gitignore updated', bytes: finalContent.length });
  } catch (error) {
    console.error('[Git Ops] gitignore write error:', error);
    res.status(500).json({ success: false, error: 'Failed to update .gitignore', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/gitignore/check?repo=...
// Check if specific paths are ignored, and test new patterns
// Body: { paths?: string[], testPattern?: string }
// ────────────────────────────────────────────────────────────────
router.post('/git/gitignore/check', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { paths, testPattern } = req.body;
    const opts = { cwd: repoRoot, timeout: 5000 };
    const results = {};

    // Check specific paths
    if (Array.isArray(paths)) {
      for (const p of paths.slice(0, 50)) { // limit to 50
        if (p.includes('..')) continue;
        try {
          await execFileAsync('git', ['check-ignore', '-q', p], opts);
          results[p] = 'ignored';
        } catch {
          results[p] = 'tracked';
        }
      }
    }

    // Test a pattern — show what it would match
    let testMatches = [];
    if (testPattern && typeof testPattern === 'string') {
      try {
        // Use git ls-files to find untracked files, then test pattern against them
        const { stdout } = await execFileAsync(
          'git', ['ls-files', '--others', '--exclude-standard', '--full-name'],
          { ...opts, maxBuffer: 5 * 1024 * 1024 }
        );
        const allUntracked = stdout.split('\n').filter(Boolean);

        // Simple glob-to-regex conversion for preview
        const escaped = testPattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        const re = new RegExp(escaped);
        testMatches = allUntracked.filter(f => re.test(f)).slice(0, 100);
      } catch { /* ok */ }
    }

    res.json({ success: true, repo: repoKey, results, testMatches });
  } catch (error) {
    console.error('[Git Ops] gitignore check error:', error);
    res.status(500).json({ success: false, error: 'Check failed', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ops/git/gitignore/untrack?repo=...
// Remove tracked files that are now in .gitignore (git rm --cached)
// Body: { files: string[] }
// ────────────────────────────────────────────────────────────────
router.post('/git/gitignore/untrack', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { files } = req.body;
    const opts = { cwd: repoRoot, timeout: 15000 };

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'files array required' });
    }

    // Validate paths
    for (const f of files) {
      if (f.includes('..') || f.startsWith('/')) {
        return res.status(400).json({ success: false, error: `Invalid path: ${f}` });
      }
    }

    const { stdout } = await execFileAsync('git', ['rm', '--cached', '-r', '--', ...files], opts);

    res.json({
      success: true,
      repo: repoKey,
      output: stdout.trim(),
      untracked: files.length,
    });
  } catch (error) {
    console.error('[Git Ops] untrack error:', error);
    res.status(500).json({ success: false, error: 'Untrack failed', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/branch-map?repo=...
// List all branches with metadata for the Branch Map section
// ────────────────────────────────────────────────────────────────
router.get('/git/branch-map', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const opts = { cwd: repoRoot, timeout: 15000, maxBuffer: 5 * 1024 * 1024 };

    // Fetch to ensure we have latest refs
    try { await execFileAsync('git', ['fetch', '--all', '--prune'], { ...opts, timeout: 30000 }); } catch { /* best effort */ }

    // All refs with date, author, subject
    const { stdout: refOut } = await execFileAsync('git', [
      'for-each-ref', '--sort=-committerdate',
      '--format=%(refname:short)\t%(objectname:short)\t%(committerdate:iso)\t%(authorname)\t%(subject)\t%(committerdate:relative)',
      'refs/heads/', 'refs/remotes/origin/'
    ], opts);

    const branches = [];
    const seen = new Set();
    for (const line of refOut.split('\n').filter(Boolean)) {
      const [ref, sha, date, author, subject, relativeDate] = line.split('\t');
      // Skip origin/HEAD
      if (ref === 'origin/HEAD') continue;
      // Normalize name — strip origin/ prefix for display
      const name = ref.replace(/^origin\//, '');
      if (seen.has(name)) continue;
      seen.add(name);
      branches.push({
        name,
        ref,
        sha,
        date,
        relativeDate,
        author,
        subject,
        isRemote: ref.startsWith('origin/'),
        isLocal: !ref.startsWith('origin/'),
      });
    }

    // Current branch
    const { stdout: branchOut } = await execFileAsync('git', ['branch', '--show-current'], opts);

    res.json({
      success: true,
      repo: repoKey,
      currentBranch: branchOut.trim(),
      branches,
    });
  } catch (error) {
    console.error('[Git Ops] branch-map error:', error);
    res.status(500).json({ success: false, error: 'Failed to get branch map', message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/ops/git/archive?repo=...&branch=...
// Stream a .zip archive of the branch contents
// ────────────────────────────────────────────────────────────────
router.get('/git/archive', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { repoKey, repoRoot } = resolveRepo(req);
    const { branch } = req.query;

    if (!branch) {
      return res.status(400).json({ success: false, error: 'branch query param required' });
    }

    // Validate ref name
    const refPattern = /^[a-zA-Z0-9._\-\/]+$/;
    if (!refPattern.test(branch)) {
      return res.status(400).json({ success: false, error: 'Invalid branch name' });
    }

    // Verify the ref exists
    try {
      await execFileAsync('git', ['rev-parse', '--verify', branch], { cwd: repoRoot, timeout: 5000 });
    } catch {
      return res.status(404).json({ success: false, error: `Branch not found: ${branch}` });
    }

    // Get short SHA for filename
    const { stdout: shaOut } = await execFileAsync('git', ['rev-parse', '--short', branch], { cwd: repoRoot, timeout: 5000 });
    const sha = shaOut.trim();
    const safeName = branch.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${repoKey}_${safeName}_${sha}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream git archive directly to response
    const { spawn } = require('child_process');
    const archive = spawn('git', ['archive', '--format=zip', branch], { cwd: repoRoot });

    archive.stdout.pipe(res);

    archive.stderr.on('data', (data) => {
      console.error('[Git Ops] archive stderr:', data.toString());
    });

    archive.on('error', (err) => {
      console.error('[Git Ops] archive spawn error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Archive failed' });
      }
    });

    archive.on('close', (code) => {
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({ success: false, error: `git archive exited with code ${code}` });
      }
    });
  } catch (error) {
    console.error('[Git Ops] archive error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Archive failed', message: error.message });
    }
  }
});

module.exports = router;
