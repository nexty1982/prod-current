/**
 * Filesystem Test Runner - Backend
 *
 * Read-only filesystem checks scoped to an allowlist of roots.
 * Super-admin only. No writes, deletes, renames, or chmod.
 *
 * Endpoints (mounted under /api/admin/fs-tests):
 *   GET  /              - List saved FS test cases
 *   POST /              - Create FS test case
 *   PUT  /:id           - Update FS test case
 *   DELETE /:id         - Delete FS test case
 *   GET  /roots         - Allowed filesystem roots
 *   POST /run           - Execute FS tests
 */

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { glob } = require('glob');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { promisePool } = require('../../config/db');

const router = express.Router();
const requireSuperAdmin = requireRole(['super_admin']);

// ============================================================================
// CONSTANTS & SAFETY
// ============================================================================

const ALLOWED_ROOTS = {
  prod:   { key: 'prod',   label: 'prod',        path: '/var/www/orthodoxmetrics/prod' },
  backup: { key: 'backup', label: 'backup-prod',  path: '/var/www/orthodoxmetrics/backup-prod' },
};

const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'uploads', 'logs',
  '.cache', '.next', 'coverage', '.nyc_output', 'tmp', '.tmp',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.htm',
  '.css', '.scss', '.yml', '.yaml', '.env', '.txt', '.mjs', '.cjs',
  '.sh', '.bash', '.xml', '.svg', '.conf', '.cfg', '.ini', '.toml',
  '.ejs', '.hbs', '.pug', '.sql', '.graphql', '.gql',
]);

const LIMITS = {
  maxTestsPerRun:      50,
  maxFilesPerTest:   10000,
  maxFileSizeBytes:  2 * 1024 * 1024,
  maxEvidenceLines:    50,
  defaultEvidence:     20,
  excerptMaxChars:    200,
};

// ============================================================================
// DB TABLE (auto-migrate)
// ============================================================================

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS fs_test_cases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        root_key VARCHAR(50) NOT NULL DEFAULT 'prod',
        check_type ENUM('exists','contains','not_contains','glob_count','sha256','modified_since') NOT NULL,
        target VARCHAR(1000) NOT NULL,
        pattern TEXT,
        is_regex TINYINT(1) DEFAULT 0,
        expected_count INT,
        expected_sha256 VARCHAR(64),
        since_date VARCHAR(10),
        max_evidence INT DEFAULT 20,
        enabled TINYINT(1) DEFAULT 1,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tablesEnsured = true;
    console.log('[fsTests] Tables ensured');
  } catch (err) {
    console.error('[fsTests] Table creation failed:', err.message);
  }
}

// ============================================================================
// PATH SAFETY
// ============================================================================

function safePath(rootDir, relTarget) {
  const cleaned = relTarget.replace(/^[/\\]+/, '');
  const resolved = path.resolve(rootDir, cleaned);
  if (!resolved.startsWith(rootDir + '/') && resolved !== rootDir) {
    return null;
  }
  return resolved;
}

function containsExcluded(relPath) {
  const segments = relPath.split(/[/\\]/);
  return segments.some((s) => EXCLUDED_DIRS.has(s));
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

// ============================================================================
// FILE HELPERS
// ============================================================================

async function safeGlob(rootDir, pattern, maxFiles) {
  const limit = maxFiles || LIMITS.maxFilesPerTest;
  try {
    const matches = await glob(pattern, {
      cwd: rootDir,
      nodir: true,
      dot: false,
      ignore: Array.from(EXCLUDED_DIRS).map((d) => '**/' + d + '/**'),
      maxDepth: 20,
    });
    const filtered = matches.filter((m) => !containsExcluded(m));
    const limited = filtered.slice(0, limit);
    return { paths: limited, total: filtered.length, truncated: filtered.length > limit };
  } catch (err) {
    return { paths: [], total: 0, truncated: false, error: 'Glob error: ' + err.message };
  }
}

async function readTextSafe(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > LIMITS.maxFileSizeBytes) return null;
    const buf = await fs.readFile(filePath);
    const checkLen = Math.min(buf.length, 8192);
    for (let i = 0; i < checkLen; i++) {
      if (buf[i] === 0) return null;
    }
    return buf.toString('utf-8');
  } catch {
    return null;
  }
}

// ============================================================================
// TEST EXECUTORS
// ============================================================================

async function runExists(rootDir, test) {
  const full = safePath(rootDir, test.target);
  if (!full) return { pass: false, summary: 'Path escapes allowed root', evidence: [], stats: {} };
  try {
    await fs.access(full);
    return {
      pass: true,
      summary: 'Exists: ' + test.target,
      evidence: [{ path: test.target, line: 0, excerpt: 'File/directory found' }],
      stats: { filesScanned: 1, matches: 1, durationMs: 0 },
    };
  } catch {
    return {
      pass: false,
      summary: 'Not found: ' + test.target,
      evidence: [],
      stats: { filesScanned: 1, matches: 0, durationMs: 0 },
    };
  }
}

async function runContains(rootDir, test) {
  const maxEvidence = Math.min(test.maxEvidence || LIMITS.defaultEvidence, LIMITS.maxEvidenceLines);
  const evidence = [];
  let filesScanned = 0;
  let matches = 0;
  const isNot = test.type === 'not_contains';

  let matcher;
  if (test.isRegex) {
    try {
      matcher = new RegExp(test.pattern, 'i');
    } catch (e) {
      return { pass: false, summary: 'Invalid regex: ' + e.message, evidence: [], stats: {} };
    }
  } else {
    const lower = (test.pattern || '').toLowerCase();
    matcher = { test: (line) => line.toLowerCase().includes(lower) };
  }

  const { paths, total, truncated, error } = await safeGlob(rootDir, test.target, LIMITS.maxFilesPerTest);
  if (error) return { pass: false, summary: error, evidence: [], stats: { filesScanned: 0, matches: 0 } };

  for (const relPath of paths) {
    if (!isTextFile(relPath)) continue;
    const full = safePath(rootDir, relPath);
    if (!full) continue;
    const content = await readTextSafe(full);
    if (content === null) continue;
    filesScanned++;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (matcher.test(lines[i])) {
        matches++;
        if (evidence.length < maxEvidence) {
          evidence.push({
            path: relPath,
            line: i + 1,
            excerpt: lines[i].trim().slice(0, LIMITS.excerptMaxChars),
          });
        }
      }
    }
  }

  const pass = isNot ? matches === 0 : matches > 0;
  const summary = isNot
    ? (matches === 0
        ? 'Pattern not found (clean) across ' + filesScanned + ' files'
        : 'Found ' + matches + ' match(es) - expected none')
    : (matches > 0
        ? 'Found ' + matches + ' match(es) across ' + filesScanned + ' files'
        : 'Pattern not found in ' + filesScanned + ' files');

  return {
    pass,
    summary: '[' + test.type + '] ' + summary + (truncated ? ' (file limit reached)' : ''),
    evidence,
    stats: { filesScanned, matches, durationMs: 0, totalGlobbed: total },
  };
}

async function runGlobCount(rootDir, test) {
  const { paths, total, truncated } = await safeGlob(rootDir, test.target, LIMITS.maxFilesPerTest);
  const expected = test.expectedCount != null ? test.expectedCount : 0;
  const pass = total === expected;
  const maxEvidence = Math.min(test.maxEvidence || LIMITS.defaultEvidence, LIMITS.maxEvidenceLines);

  const evidence = paths.slice(0, maxEvidence).map((p) => ({
    path: p, line: 0, excerpt: 'Matched by glob',
  }));

  return {
    pass,
    summary: 'Found ' + total + ' file(s), expected ' + expected + (truncated ? ' (limit reached)' : ''),
    evidence,
    stats: { filesScanned: total, matches: total, durationMs: 0 },
  };
}

async function runSha256(rootDir, test) {
  const full = safePath(rootDir, test.target);
  if (!full) return { pass: false, summary: 'Path escapes allowed root', evidence: [], stats: {} };
  try {
    const stat = await fs.stat(full);
    if (stat.size > LIMITS.maxFileSizeBytes) {
      return { pass: false, summary: 'File too large', evidence: [], stats: { filesScanned: 1 } };
    }
    const buf = await fs.readFile(full);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const expected = (test.expectedSha256 || '').toLowerCase();
    const pass = hash === expected;
    return {
      pass,
      summary: pass ? 'SHA-256 matches' : 'SHA-256 mismatch: got ' + hash.slice(0, 16) + '...',
      evidence: [{ path: test.target, line: 0, excerpt: 'sha256: ' + hash }],
      stats: { filesScanned: 1, matches: pass ? 1 : 0, durationMs: 0 },
    };
  } catch (err) {
    return { pass: false, summary: 'Error: ' + err.message, evidence: [], stats: { filesScanned: 0 } };
  }
}

async function runModifiedSince(rootDir, test) {
  const sinceDate = new Date(test.since || '2000-01-01');
  if (isNaN(sinceDate.getTime())) {
    return { pass: false, summary: 'Invalid since date', evidence: [], stats: {} };
  }

  const { paths, total, truncated } = await safeGlob(rootDir, test.target, LIMITS.maxFilesPerTest);
  const maxEvidence = Math.min(test.maxEvidence || LIMITS.defaultEvidence, LIMITS.maxEvidenceLines);
  const recent = [];

  for (const relPath of paths) {
    const full = safePath(rootDir, relPath);
    if (!full) continue;
    try {
      const stat = await fs.stat(full);
      if (stat.mtime >= sinceDate) {
        recent.push({ path: relPath, mtime: stat.mtime });
      }
    } catch { /* skip */ }
  }

  recent.sort((a, b) => b.mtime - a.mtime);
  const pass = recent.length > 0;
  const evidence = recent.slice(0, maxEvidence).map((r) => ({
    path: r.path, line: 0, excerpt: 'Modified: ' + r.mtime.toISOString(),
  }));

  return {
    pass,
    summary: pass
      ? recent.length + ' file(s) modified since ' + test.since + (truncated ? ' (limit reached)' : '')
      : 'No files modified since ' + test.since,
    evidence,
    stats: { filesScanned: total, matches: recent.length, durationMs: 0 },
  };
}

async function runSingleTest(rootDir, test) {
  const start = Date.now();
  let result;
  switch (test.type) {
    case 'exists':         result = await runExists(rootDir, test); break;
    case 'contains':       result = await runContains(rootDir, test); break;
    case 'not_contains':   result = await runContains(rootDir, test); break;
    case 'glob_count':     result = await runGlobCount(rootDir, test); break;
    case 'sha256':         result = await runSha256(rootDir, test); break;
    case 'modified_since': result = await runModifiedSince(rootDir, test); break;
    default:
      result = { pass: false, summary: 'Unknown type: ' + test.type, evidence: [], stats: {} };
  }
  result.stats = result.stats || {};
  result.stats.durationMs = Date.now() - start;
  return result;
}

// ============================================================================
// ROUTES
// ============================================================================

router.get('/roots', requireAuth, requireSuperAdmin, (_req, res) => {
  res.json({ success: true, roots: Object.values(ALLOWED_ROOTS) });
});

router.post('/run', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { rootKey, tests } = req.body;
    const root = ALLOWED_ROOTS[rootKey];
    if (!root) {
      return res.status(400).json({ success: false, error: 'Invalid rootKey: ' + rootKey });
    }
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ success: false, error: 'tests must be a non-empty array' });
    }
    if (tests.length > LIMITS.maxTestsPerRun) {
      return res.status(400).json({ success: false, error: 'Max ' + LIMITS.maxTestsPerRun + ' tests per run' });
    }
    try { await fs.access(root.path); } catch {
      return res.status(500).json({ success: false, error: 'Root not accessible: ' + root.path });
    }

    const results = [];
    for (const test of tests) {
      const result = await runSingleTest(root.path, test);
      results.push({
        id: test.id || null,
        name: test.name || (test.type + ': ' + test.target),
        pass: result.pass,
        summary: result.summary,
        evidence: result.evidence,
        stats: result.stats,
      });
    }

    res.json({ success: true, ok: true, rootKey, results });
  } catch (err) {
    console.error('[fsTests] Run failed:', err);
    res.status(500).json({ success: false, error: 'FS test run failed: ' + err.message });
  }
});

router.get('/', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    await ensureTables();
    const [rows] = await promisePool.query('SELECT * FROM fs_test_cases ORDER BY created_at DESC');
    res.json({ success: true, tests: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await ensureTables();
    const b = req.body;
    if (!b.name || !b.check_type || !b.target) {
      return res.status(400).json({ success: false, error: 'name, check_type, and target are required' });
    }
    const [result] = await promisePool.query(
      'INSERT INTO fs_test_cases (name,root_key,check_type,target,pattern,is_regex,expected_count,expected_sha256,since_date,max_evidence,enabled,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [b.name, b.root_key||'prod', b.check_type, b.target, b.pattern||null, b.is_regex?1:0, b.expected_count!=null?b.expected_count:null, b.expected_sha256||null, b.since_date||null, b.max_evidence||20, b.enabled!=null?b.enabled:1, req.user?.username||'unknown']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await ensureTables();
    const b = req.body;
    await promisePool.query(
      'UPDATE fs_test_cases SET name=?,root_key=?,check_type=?,target=?,pattern=?,is_regex=?,expected_count=?,expected_sha256=?,since_date=?,max_evidence=?,enabled=? WHERE id=?',
      [b.name, b.root_key||'prod', b.check_type, b.target, b.pattern||null, b.is_regex?1:0, b.expected_count!=null?b.expected_count:null, b.expected_sha256||null, b.since_date||null, b.max_evidence||20, b.enabled!=null?b.enabled:1, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await ensureTables();
    await promisePool.query('DELETE FROM fs_test_cases WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;