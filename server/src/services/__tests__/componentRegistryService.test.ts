#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1028)
 *
 * Database-backed component registry. Single dependency: ../config/db-compat.
 * Stubbed via require.cache with a SQL-routed fake pool.
 *
 * Coverage:
 *   - getAllComponents: fresh fetch, JSON parsing, caching, cache-hit skip DB,
 *                       DB error → fallback
 *   - getComponentByName: found, not found, DB error → null
 *   - searchComponents: no filters, category filter, hasJSX/hasHooks,
 *                       directory LIKE, search LIKE, limit, DB error → []
 *   - getComponentSummary: aggregates stats + categories, DB error → empty
 *   - updateComponent: builds dynamic SET clause; no-op when no fields;
 *                      clears cache on success; rethrows on error
 *   - clearCache: empties cache
 *   - getFallbackComponents: returns canned shape
 *
 * Run: npx tsx server/src/services/__tests__/componentRegistryService.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── SQL-routed fake pool ────────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error };
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows !== undefined ? r.rows : []];
      }
    }
    return [[]];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
  promisePool: fakePool,
};

const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const ComponentRegistryService = require('../componentRegistryService');

async function main() {

// ============================================================================
// getAllComponents — happy path
// ============================================================================
console.log('\n── getAllComponents: happy path ──────────────────────────');

{
  resetState();
  routes = [{
    match: /FROM component_registry\s+WHERE is_active = TRUE\s+ORDER BY name/i,
    rows: [
      {
        id: 1, name: 'Button', file_path: '/f/Button.tsx', relative_path: 'f/Button.tsx',
        directory: 'f', extension: '.tsx', category: 'ui',
        props: '[{"name":"onClick"}]', imports: '["react"]', exports: '["Button"]',
        is_default: 1, has_jsx: 1, has_hooks: 0,
        dependencies: '[]', file_size: 100, lines_of_code: 10, complexity_score: 1,
        last_modified: '2026-01-01', discovery_version: 'v1',
        discovered_at: '2026-01-01', updated_at: '2026-01-02',
      },
      {
        id: 2, name: 'Modal', file_path: '/f/Modal.tsx', relative_path: 'f/Modal.tsx',
        directory: 'f', extension: '.tsx', category: 'ui',
        props: '[]', imports: '[]', exports: '[]',
        is_default: 0, has_jsx: 1, has_hooks: 1,
        dependencies: '["react"]', file_size: 200, lines_of_code: 20, complexity_score: 2,
        last_modified: '2026-01-03', discovery_version: 'v1',
        discovered_at: '2026-01-03', updated_at: '2026-01-04',
      },
    ],
  }];

  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();

  assertEq(queryLog.length, 1, 'one query');
  assertEq(r.version, '1.0.0', 'version');
  assert(r.generatedAt.length > 0, 'has generatedAt');
  assertEq(r.components.length, 2, '2 components');
  assertEq(r.components[0].name, 'Button', 'first = Button');
  assertEq(r.components[0].props, [{ name: 'onClick' }], 'props JSON parsed');
  assertEq(r.components[0].imports, ['react'], 'imports parsed');
  assertEq(r.components[0].exports, ['Button'], 'exports parsed');
  assertEq(r.components[0].isDefault, ['export default function Button'], 'isDefault expanded when flag set');
  assertEq(r.components[0].hasJSX, 1, 'hasJSX passed through');
  assertEq(r.components[0].size, 100, 'size from file_size');
  assertEq(r.components[0].lines, 10, 'lines from lines_of_code');
  assertEq(r.components[0].complexity, 1, 'complexity from complexity_score');
  assertEq(r.components[1].isDefault, [], 'isDefault empty array when flag not set');

  // Second call hits cache — no new query
  const r2 = await svc.getAllComponents();
  assertEq(queryLog.length, 1, 'second call hits cache (no new query)');
  assertEq(r2, r, 'cached data returned');
}

// ============================================================================
// getAllComponents — default JSON fields
// ============================================================================
{
  resetState();
  routes = [{
    match: /FROM component_registry/i,
    rows: [{
      id: 3, name: 'Empty', file_path: '', relative_path: '', directory: '',
      extension: '', category: null,
      props: null, imports: null, exports: null, dependencies: null,
      is_default: 0, has_jsx: 0, has_hooks: 0,
      file_size: 0, lines_of_code: 0, complexity_score: 0,
      last_modified: null, discovery_version: null,
      discovered_at: null, updated_at: null,
    }],
  }];
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  assertEq(r.components[0].props, [], 'null props → []');
  assertEq(r.components[0].imports, [], 'null imports → []');
  assertEq(r.components[0].exports, [], 'null exports → []');
  assertEq(r.components[0].dependencies, [], 'null dependencies → []');
}

// ============================================================================
// getAllComponents — DB error → fallback
// ============================================================================
console.log('\n── getAllComponents: DB error fallback ───────────────────');

{
  resetState();
  routes = [{ match: /FROM component_registry/i, throws: new Error('db down') }];
  quiet();
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  loud();
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback generatedBy');
  assertEq(r.components, [], 'empty components');
  assertEq(r.version, '1.0.0', 'fallback version');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

{
  resetState();
  routes = [{
    match: /WHERE name = \? AND is_active = TRUE/i,
    rows: [{
      id: 5, name: 'Card', file_path: '/f/Card.tsx', relative_path: 'f/Card.tsx',
      directory: 'f', extension: '.tsx', category: 'ui',
      props: '[]', imports: '[]', exports: '["Card"]', dependencies: '[]',
      is_default: 1, has_jsx: 1, has_hooks: 0,
      file_size: 50, lines_of_code: 5, complexity_score: 1,
      last_modified: null, discovery_version: 'v1',
      discovered_at: null, updated_at: null,
    }],
  }];
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('Card');
  assert(r !== null, 'returns component');
  assertEq(r.name, 'Card', 'name');
  assertEq(r.isDefault, 1, 'isDefault raw flag (not wrapped like getAll)');
  assertEq(r.exports, ['Card'], 'exports parsed');
  assertEq(queryLog[0].params, ['Card'], 'name param');
}

// Not found
{
  resetState();
  routes = [{ match: /WHERE name = \?/i, rows: [] }];
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('Missing');
  assertEq(r, null, 'not found → null');
}

// DB error
{
  resetState();
  routes = [{ match: /WHERE name = \?/i, throws: new Error('boom') }];
  quiet();
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('X');
  loud();
  assertEq(r, null, 'DB error → null');
}

// ============================================================================
// searchComponents — filters
// ============================================================================
console.log('\n── searchComponents ──────────────────────────────────────');

// No filters — default limit 100
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents();
  assertEq(queryLog[0].params, [], 'no params');
  assert(/LIMIT 100/.test(queryLog[0].sql), 'default limit 100');
  assert(!/category = \?/.test(queryLog[0].sql), 'no category filter');
}

// Category filter
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ category: 'ui' });
  assert(/category = \?/.test(queryLog[0].sql), 'category clause');
  assertEq(queryLog[0].params, ['ui'], 'category param');
}

// hasJSX filter
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasJSX: true });
  assert(/has_jsx = \?/.test(queryLog[0].sql), 'has_jsx clause');
  assertEq(queryLog[0].params, [true], 'hasJSX param');
}

// hasHooks filter
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasHooks: false });
  assert(/has_hooks = \?/.test(queryLog[0].sql), 'has_hooks clause');
  assertEq(queryLog[0].params, [false], 'hasHooks param');
}

// Directory filter (LIKE)
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ directory: 'features' });
  assert(/directory LIKE \?/.test(queryLog[0].sql), 'directory LIKE clause');
  assertEq(queryLog[0].params, ['%features%'], 'directory wildcarded');
}

// Search filter (name OR directory LIKE)
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ search: 'Button' });
  assert(/\(name LIKE \? OR directory LIKE \?\)/.test(queryLog[0].sql), 'OR clause');
  assertEq(queryLog[0].params, ['%Button%', '%Button%'], 'search wildcarded twice');
}

// Custom limit
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ limit: 5 });
  assert(/LIMIT 5/.test(queryLog[0].sql), 'custom limit');
}

// Combined filters
{
  resetState();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ category: 'ui', hasHooks: true, search: 'Form' });
  assertEq(queryLog[0].params, ['ui', true, '%Form%', '%Form%'], 'combined params');
}

// Row transformation
{
  resetState();
  routes = [{
    match: /FROM component_registry/i,
    rows: [{
      id: 7, name: 'X', file_path: '/f/X.tsx', relative_path: 'f/X.tsx',
      directory: 'f', extension: '.tsx', category: 'ui',
      props: '[]', imports: '["react"]', exports: '[]', dependencies: '[]',
      is_default: 0, has_jsx: 1, has_hooks: 0,
      file_size: 11, lines_of_code: 2, complexity_score: 1,
    }],
  }];
  const svc = new ComponentRegistryService();
  const rows = await svc.searchComponents({});
  assertEq(rows.length, 1, '1 row');
  assertEq(rows[0].name, 'X', 'name');
  assertEq(rows[0].imports, ['react'], 'imports parsed');
  assertEq(rows[0].size, 11, 'size');
}

// DB error → []
{
  resetState();
  routes = [{ match: /FROM component_registry/i, throws: new Error('db') }];
  quiet();
  const svc = new ComponentRegistryService();
  const rows = await svc.searchComponents({});
  loud();
  assertEq(rows, [], 'DB error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

{
  resetState();
  routes = [
    {
      match: /COUNT\(\*\) as total_components/i,
      rows: [{
        total_components: 42, total_categories: 5, total_directories: 8,
        avg_file_size: 123.7, avg_lines: 15.2,
        jsx_components: 30, hook_components: 12,
        last_updated: '2026-04-10',
      }],
    },
    {
      match: /GROUP BY category/i,
      rows: [
        { category: 'ui', count: 20 },
        { category: 'layout', count: 15 },
        { category: 'form', count: 7 },
      ],
    },
  ];
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.total, 42, 'total');
  assertEq(r.categories.length, 3, '3 categories');
  assertEq(r.categories[0], { name: 'ui', count: 20 }, 'first category');
  assertEq(r.statistics.totalDirectories, 8, 'totalDirectories');
  assertEq(r.statistics.averageFileSize, 124, 'averageFileSize rounded');
  assertEq(r.statistics.averageLines, 15, 'averageLines rounded');
  assertEq(r.statistics.jsxComponents, 30, 'jsxComponents');
  assertEq(r.statistics.hookComponents, 12, 'hookComponents');
  assertEq(r.statistics.lastUpdated, '2026-04-10', 'lastUpdated');
}

// NULL averages → 0 via "|| 0"
{
  resetState();
  routes = [
    {
      match: /COUNT\(\*\) as total_components/i,
      rows: [{
        total_components: 0, total_directories: 0,
        avg_file_size: null, avg_lines: null,
        jsx_components: 0, hook_components: 0, last_updated: null,
      }],
    },
    { match: /GROUP BY category/i, rows: [] },
  ];
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(r.statistics.averageLines, 0, 'null lines → 0');
  assertEq(r.categories, [], 'no categories');
}

// DB error → empty default
{
  resetState();
  routes = [{ match: /COUNT\(\*\)/i, throws: new Error('db') }];
  quiet();
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  loud();
  assertEq(r.total, 0, 'total 0 on error');
  assertEq(r.categories, [], 'empty categories on error');
  assertEq(r.statistics, {}, 'empty statistics on error');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// Happy path
{
  resetState();
  routes = [{ match: /UPDATE component_registry/i, rows: { affectedRows: 1 } }];
  quiet();
  const svc = new ComponentRegistryService();
  // Seed cache
  (svc as any).cache.set('all_components', { data: {}, timestamp: Date.now() });
  await svc.updateComponent('Card', {
    category: 'ui-new',
    file_size: 999,
    lines_of_code: 50,
    complexity_score: 4,
  });
  loud();
  assertEq(queryLog.length, 1, 'one UPDATE');
  assert(/category = \?/.test(queryLog[0].sql), 'category in SET');
  assert(/file_size = \?/.test(queryLog[0].sql), 'file_size in SET');
  assert(/lines_of_code = \?/.test(queryLog[0].sql), 'lines_of_code in SET');
  assert(/complexity_score = \?/.test(queryLog[0].sql), 'complexity_score in SET');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(queryLog[0].sql), 'updated_at auto');
  assertEq(queryLog[0].params, ['ui-new', 999, 50, 4, 'Card'], 'params in order + name last');
  assertEq((svc as any).cache.size, 0, 'cache cleared after update');
}

// Partial update — only category
{
  resetState();
  routes = [{ match: /UPDATE component_registry/i, rows: { affectedRows: 1 } }];
  quiet();
  const svc = new ComponentRegistryService();
  await svc.updateComponent('X', { category: 'layout' });
  loud();
  assertEq(queryLog[0].params, ['layout', 'X'], 'only category + name');
  assert(!/file_size/.test(queryLog[0].sql), 'no file_size clause');
}

// No fields → no query
{
  resetState();
  const svc = new ComponentRegistryService();
  await svc.updateComponent('X', {});
  assertEq(queryLog.length, 0, 'no query when no fields');
}

// Error → rethrow
{
  resetState();
  routes = [{ match: /UPDATE component_registry/i, throws: new Error('update boom') }];
  quiet();
  const svc = new ComponentRegistryService();
  let caught: Error | null = null;
  try {
    await svc.updateComponent('X', { category: 'ui' });
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'rethrown');
  assert(caught !== null && caught.message === 'update boom', 'message preserved');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  (svc as any).cache.set('k1', 'v1');
  (svc as any).cache.set('k2', 'v2');
  quiet();
  svc.clearCache();
  loud();
  assertEq((svc as any).cache.size, 0, 'cache emptied');
}

// ============================================================================
// getFallbackComponents (direct)
// ============================================================================
console.log('\n── getFallbackComponents ─────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  const r = svc.getFallbackComponents();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'generatedBy');
  assertEq(r.components, [], 'empty components');
  assertEq(r.discoveryTime, 0, 'discoveryTime 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
