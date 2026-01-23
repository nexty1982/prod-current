/**
 * Artifact Indexer
 * 
 * Scans /var/backups/OM for artifacts and indexes them
 */

const fs = require('fs').promises;
const path = require('path');

// Safe file extensions
const SAFE_EXTENSIONS = ['.html', '.json', '.txt', '.log', '.md', '.csv'];

// Artifact type mappings
const ARTIFACT_TYPES = {
  'analysis': 'analysis',
  'changelog': 'changelog',
  'summary': 'system',
  'motivation': 'motivation',
  'roadmap': 'roadmap',
};

/**
 * Validate and sanitize file path to prevent path traversal
 */
function sanitizePath(filePath, root) {
  // Remove any path traversal attempts
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  
  // Ensure path is within root
  const resolved = path.resolve(root, normalized);
  if (!resolved.startsWith(path.resolve(root))) {
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
 * Discover artifacts in OM-Ops directory structure
 */
async function indexArtifacts(artifactsRoot) {
  const artifacts = [];
  
  try {
    // Check if artifactsRoot exists
    await fs.access(artifactsRoot);
  } catch (error) {
    console.warn(`[Indexer] Artifacts root not accessible: ${artifactsRoot}`);
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
    const dirPath = path.join(artifactsRoot, dir);
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

      // Check for sessions/ subdirectories (changelog)
      if (dir === 'changelog') {
        const sessionsPath = path.join(dirPath, 'sessions');
        try {
          const sessions = await fs.readdir(sessionsPath, { withFileTypes: true });
          
          for (const session of sessions) {
            if (session.isDirectory()) {
              const sessionPath = path.join(sessionsPath, session.name);
              const sessionFiles = [];
              
              try {
                const files = await fs.readdir(sessionPath);
                for (const file of files) {
                  const filePath = path.join(sessionPath, file);
                  try {
                    const fileStats = await fs.stat(filePath);
                    if (fileStats.isFile() && isSafeExtension(file)) {
                      sessionFiles.push({
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

              if (sessionFiles.length > 0) {
                artifacts.push({
                  id: `changelog-${session.name}`,
                  type: 'changelog',
                  title: `Changelog Session: ${session.name}`,
                  createdAt: session.name.split('__')[1]?.replace(/_/g, ':') || new Date().toISOString(),
                  files: sessionFiles,
                  summary: `Changelog session ${session.name}`,
                  tags: ['changelog', 'session', session.name],
                  path: sessionPath,
                });
              }
            }
          }
        } catch (error) {
          // sessions/ directory doesn't exist, skip
        }
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
              const runPath = path.join(dirPath, 'runs', runId);
              
              // Check if run directory exists
              try {
                await fs.access(runPath);
                const runFiles = [];
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
                    // Skip
                  }
                }
                
                artifacts.push({
                  id: `${dir}-${runId}`,
                  type: ARTIFACT_TYPES[dir] || dir,
                  title: run.title || `${dir} Run: ${runId}`,
                  createdAt: run.created_at || run.started_at || run.createdAt || new Date().toISOString(),
                  files: runFiles.length > 0 ? runFiles : (run.files || []),
                  summary: run.summary || run.outcome || '',
                  tags: [dir, 'indexed', ...(run.tags || [])],
                  path: runPath,
                });
              } catch (error) {
                // Run directory doesn't exist, skip
              }
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
 * Get artifact by ID
 */
async function getArtifact(artifactsRoot, artifactId) {
  const artifacts = await indexArtifacts(artifactsRoot);
  return artifacts.find(a => a.id === artifactId);
}

/**
 * Get artifact file path (validated)
 */
async function getArtifactFile(artifactsRoot, artifactId, filename) {
  const artifact = await getArtifact(artifactsRoot, artifactId);
  
  if (!artifact) {
    return null;
  }
  
  // Check if file exists in artifact
  const file = artifact.files.find(f => f.name === filename);
  if (!file) {
    return null;
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
    filePath = sanitizePath(path.relative(artifactsRoot, filePath), artifactsRoot);
  } catch (error) {
    return null;
  }
  
  // Check if file exists
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    return { path: filePath, size: stats.size };
  } catch (error) {
    return null;
  }
}

module.exports = {
  indexArtifacts,
  getArtifact,
  getArtifactFile,
};
