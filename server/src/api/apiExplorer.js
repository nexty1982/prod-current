/**
 * API Explorer - Backend Route Introspection + Test Case CRUD + Runner
 * 
 * Endpoints:
 *   GET  /api/system/routes          - List all registered Express routes (super_admin)
 *   GET  /api/admin/api-tests        - List test cases
 *   POST /api/admin/api-tests        - Create test case
 *   PUT  /api/admin/api-tests/:id    - Update test case
 *   DELETE /api/admin/api-tests/:id  - Delete test case
 *   POST /api/admin/api-tests/run    - Run test cases
 *   GET  /api/admin/api-tests/:id/runs - Get run history for a test case
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { promisePool } = require('../config/db');
const http = require('http');

const routesRouter = express.Router();
const testsRouter = express.Router();

// ============================================================================
// ROUTE INTROSPECTION
// ============================================================================

// Public routes that require no auth
const NO_AUTH_PATHS = [
  '/api/system/health',
  '/api/maintenance/status',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
];

/**
 * Classify auth requirement for a route path
 */
function classifyAuth(path) {
  if (NO_AUTH_PATHS.includes(path)) return 'none';
  if (path.startsWith('/api/admin')) return 'super_admin';
  if (path.startsWith('/__debug')) return 'none';
  return 'session';
}

/**
 * Classify route into a tag/group
 */
function classifyTag(path) {
  if (path.startsWith('/api/system') || path.startsWith('/__debug')) return 'system';
  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/auth')) return 'auth';
  if (path.includes('record') || path.includes('baptism') || path.includes('marriage') || path.includes('funeral')) return 'records';
  if (path.includes('certificate')) return 'certificates';
  if (path.includes('church')) return 'churches';
  if (path.includes('ocr')) return 'ocr';
  if (path.includes('library') || path.includes('docs')) return 'library';
  if (path.includes('social') || path.includes('blog') || path.includes('chat')) return 'social';
  if (path.includes('invoice') || path.includes('billing') || path.includes('ecommerce')) return 'billing';
  if (path.includes('omai') || path.includes('ai')) return 'ai';
  if (path.includes('kanban') || path.includes('task')) return 'tasks';
  if (path.includes('notification')) return 'notifications';
  if (path.includes('calendar')) return 'calendar';
  if (path.includes('gallery') || path.includes('upload') || path.includes('image')) return 'media';
  if (path.includes('build') || path.includes('version') || path.includes('jit') || path.includes('git')) return 'devops';
  return 'other';
}

/**
 * Recursively extract routes from Express router stack
 */
function extractRoutes(stack, basePath = '') {
  const routes = [];

  if (!stack || !Array.isArray(stack)) return routes;

  for (const layer of stack) {
    try {
      if (layer.route) {
        // Direct route
        const path = basePath + (layer.route.path || '');
        const methods = Object.keys(layer.route.methods || {})
          .filter(m => layer.route.methods[m])
          .map(m => m.toUpperCase());

        for (const method of methods) {
          routes.push({
            method,
            path: path || '/',
            auth: classifyAuth(path),
            tags: [classifyTag(path)],
            source: '',
          });
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        // Nested router
        let prefix = '';
        if (layer.regexp) {
          // Extract path prefix from regexp
          const match = layer.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/, '')
            .replace(/\$/, '');
          if (match && match !== '/' && match !== '') {
            prefix = match;
          }
        }
        // Also check keys for param patterns
        if (layer.keys && layer.keys.length > 0) {
          // Has route params, try to reconstruct
          const paramNames = layer.keys.map(k => `:${k.name}`);
          // Replace capture groups with param names
          let paramPrefix = prefix;
          for (const pn of paramNames) {
            paramPrefix = paramPrefix.replace(/\/\([^)]+\)/, `/${pn}`);
          }
          prefix = paramPrefix;
        }
        const nestedRoutes = extractRoutes(layer.handle.stack, basePath + prefix);
        routes.push(...nestedRoutes);
      }
    } catch (err) {
      // Skip problematic layers silently
      continue;
    }
  }

  return routes;
}

/**
 * GET /api/system/routes - List all registered Express routes
 * Requires super_admin role
 */
routesRouter.get('/routes', requireRole(['super_admin']), (req, res) => {
  try {
    const app = req.app;
    if (!app || !app._router || !app._router.stack) {
      return res.json({ success: true, routes: [], message: 'No routes found' });
    }

    const rawRoutes = extractRoutes(app._router.stack);

    // Deduplicate and clean
    const seen = new Set();
    const routes = [];
    for (const r of rawRoutes) {
      // Skip static/internal noise
      if (r.path.includes('favicon') || r.path === '/' || !r.path) continue;
      const key = `${r.method}:${r.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      routes.push(r);
    }

    // Sort by path then method
    routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

    res.json({
      success: true,
      count: routes.length,
      routes,
    });
  } catch (err) {
    console.error('[ApiExplorer] Route introspection failed:', err.message);
    res.status(500).json({ success: false, error: 'Route introspection failed', message: err.message });
  }
});

// ============================================================================
// DB TABLE CREATION (auto-migrate on first use)
// ============================================================================

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS api_test_cases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        method ENUM('GET','POST','PUT','DELETE','PATCH') NOT NULL DEFAULT 'GET',
        path VARCHAR(500) NOT NULL,
        headers_json TEXT,
        query_json TEXT,
        body_json TEXT,
        expected_status INT DEFAULT 200,
        expected_contains TEXT,
        enabled TINYINT(1) DEFAULT 1,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS api_test_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_case_id INT NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('success','fail') NOT NULL,
        actual_status INT,
        duration_ms INT,
        response_snippet TEXT,
        error TEXT,
        FOREIGN KEY (test_case_id) REFERENCES api_test_cases(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    tablesEnsured = true;
    console.log('[ApiExplorer] Tables ensured');
  } catch (err) {
    console.error('[ApiExplorer] Table creation failed:', err.message);
    // Non-fatal - tables may already exist
    tablesEnsured = true;
  }
}

// ============================================================================
// TEST CASE CRUD
// ============================================================================

// GET /api/admin/api-tests - List all test cases
testsRouter.get('/', requireRole(['super_admin']), async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await promisePool.query(
      'SELECT * FROM api_test_cases ORDER BY created_at DESC'
    );
    res.json({ success: true, tests: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/api-tests - Create a test case
testsRouter.post('/', requireRole(['super_admin']), async (req, res) => {
  try {
    await ensureTables();
    const { name, method, path, headers_json, query_json, body_json, expected_status, expected_contains, enabled } = req.body;
    if (!name || !method || !path) {
      return res.status(400).json({ success: false, error: 'name, method, and path are required' });
    }
    const user = req.session?.user?.email || req.user?.email || 'unknown';
    const [result] = await promisePool.query(
      `INSERT INTO api_test_cases (name, method, path, headers_json, query_json, body_json, expected_status, expected_contains, enabled, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, method.toUpperCase(), path, headers_json || null, query_json || null, body_json || null, expected_status || 200, expected_contains || null, enabled !== undefined ? enabled : 1, user]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/api-tests/:id - Update a test case
testsRouter.put('/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    const { name, method, path, headers_json, query_json, body_json, expected_status, expected_contains, enabled } = req.body;
    const [result] = await promisePool.query(
      `UPDATE api_test_cases SET name=?, method=?, path=?, headers_json=?, query_json=?, body_json=?, expected_status=?, expected_contains=?, enabled=? WHERE id=?`,
      [name, method?.toUpperCase(), path, headers_json || null, query_json || null, body_json || null, expected_status || 200, expected_contains || null, enabled !== undefined ? enabled : 1, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Test case not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/api-tests/:id - Delete a test case
testsRouter.delete('/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    const [result] = await promisePool.query('DELETE FROM api_test_cases WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Test case not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/api-tests/:id/runs - Get run history for a test case
testsRouter.get('/:id/runs', requireRole(['super_admin']), async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    const [rows] = await promisePool.query(
      'SELECT * FROM api_test_runs WHERE test_case_id=? ORDER BY run_at DESC LIMIT 50',
      [id]
    );
    res.json({ success: true, runs: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Execute a single test case against localhost:3001
 */
async function executeTest(testCase, cookies) {
  const startTime = Date.now();
  const MAX_SNIPPET = 4096;
  const TIMEOUT = 10000;

  return new Promise((resolve) => {
    try {
      // Build query string
      let queryString = '';
      if (testCase.query_json) {
        try {
          const q = typeof testCase.query_json === 'string' ? JSON.parse(testCase.query_json) : testCase.query_json;
          queryString = '?' + new URLSearchParams(q).toString();
        } catch { /* ignore bad query JSON */ }
      }

      // Build headers
      let headers = { 'Content-Type': 'application/json' };
      if (testCase.headers_json) {
        try {
          const h = typeof testCase.headers_json === 'string' ? JSON.parse(testCase.headers_json) : testCase.headers_json;
          headers = { ...headers, ...h };
        } catch { /* ignore bad headers JSON */ }
      }
      // Forward caller's session cookie
      if (cookies) {
        headers['Cookie'] = cookies;
      }

      // Build body
      let bodyData = null;
      if (testCase.body_json && testCase.method !== 'GET') {
        try {
          const b = typeof testCase.body_json === 'string' ? JSON.parse(testCase.body_json) : testCase.body_json;
          bodyData = JSON.stringify(b);
          headers['Content-Length'] = Buffer.byteLength(bodyData);
        } catch { /* ignore bad body JSON */ }
      }

      const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: testCase.path + queryString,
        method: testCase.method,
        headers,
        timeout: TIMEOUT,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          if (data.length < MAX_SNIPPET) data += chunk;
        });
        res.on('end', () => {
          const duration = Date.now() - startTime;
          const actualStatus = res.statusCode;
          const snippet = data.substring(0, MAX_SNIPPET);

          let ok = actualStatus === testCase.expected_status;
          let error = null;

          if (!ok) {
            error = `Expected status ${testCase.expected_status}, got ${actualStatus}`;
          }

          if (ok && testCase.expected_contains) {
            if (!snippet.includes(testCase.expected_contains)) {
              ok = false;
              error = `Response does not contain "${testCase.expected_contains}"`;
            }
          }

          resolve({
            id: testCase.id,
            name: testCase.name,
            ok,
            expected_status: testCase.expected_status,
            actual_status: actualStatus,
            duration_ms: duration,
            snippet,
            error,
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          id: testCase.id,
          name: testCase.name,
          ok: false,
          expected_status: testCase.expected_status,
          actual_status: 0,
          duration_ms: Date.now() - startTime,
          snippet: '',
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          id: testCase.id,
          name: testCase.name,
          ok: false,
          expected_status: testCase.expected_status,
          actual_status: 0,
          duration_ms: TIMEOUT,
          snippet: '',
          error: 'Request timed out after 10s',
        });
      });

      if (bodyData) req.write(bodyData);
      req.end();
    } catch (err) {
      resolve({
        id: testCase.id,
        name: testCase.name,
        ok: false,
        expected_status: testCase.expected_status,
        actual_status: 0,
        duration_ms: Date.now() - startTime,
        snippet: '',
        error: err.message,
      });
    }
  });
}

// POST /api/admin/api-tests/run - Run test cases
testsRouter.post('/run', requireRole(['super_admin']), async (req, res) => {
  try {
    await ensureTables();
    const { ids, confirmDangerous } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }

    // Fetch test cases
    const placeholders = ids.map(() => '?').join(',');
    const [testCases] = await promisePool.query(
      `SELECT * FROM api_test_cases WHERE id IN (${placeholders})`,
      ids
    );

    if (testCases.length === 0) {
      return res.status(404).json({ success: false, error: 'No test cases found for the given ids' });
    }

    // Check for dangerous methods
    const hasDangerous = testCases.some(tc => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(tc.method));
    if (hasDangerous && !confirmDangerous) {
      return res.status(400).json({
        success: false,
        error: 'Non-GET test cases require confirmDangerous: true',
        dangerous_tests: testCases.filter(tc => tc.method !== 'GET').map(tc => ({ id: tc.id, name: tc.name, method: tc.method, path: tc.path })),
      });
    }

    // Forward caller's cookies for auth
    const cookies = req.headers.cookie || '';

    // Run tests sequentially
    const results = [];
    for (const tc of testCases) {
      const result = await executeTest(tc, cookies);
      results.push(result);

      // Store run in DB
      try {
        await promisePool.query(
          `INSERT INTO api_test_runs (test_case_id, status, actual_status, duration_ms, response_snippet, error)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [tc.id, result.ok ? 'success' : 'fail', result.actual_status, result.duration_ms, result.snippet?.substring(0, 4096) || null, result.error || null]
        );
      } catch (dbErr) {
        console.error('[ApiExplorer] Failed to store test run:', dbErr.message);
      }
    }

    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    res.json({
      success: true,
      total: results.length,
      passed,
      failed,
      results,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { routesRouter, testsRouter };
