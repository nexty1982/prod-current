#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1045)
 *
 * Covers the ComponentRegistryService class:
 *   - getAllComponents — cache miss → DB query + field mapping + JSON parsing,
 *     cache hit → returns cached value, error path → fallback shape
 *   - getComponentByName — success, not found, error path
 *   - searchComponents — filter composition (category, hasJSX, hasHooks,
 *     directory LIKE, search name/directory OR), limit pagination
 *   - getComponentSummary — stats + categories, error fallback shape
 *   - updateComponent — conditional field inclusion, updated_at appended,
 *     cache cleared, no-op when no fields
 *   - clearCache — direct
 *   - getFallbackComponents — shape sanity
 *
 * Stubs `../config/db-compat` via require.cache with a scriptable SQL-routed
 * pool.
 *
 * Run from server/: npx tsx src/services/__tests__/componentRegistryService.test.ts
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

// ── Scriptable SQL pool ───────────────────────────────────────────────
type Call = { sql: string; params: any[] };
const calls: Call[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any; throws?: boolean };
let routes: Route[] = [];

function resetDb() {
  calls.length = 0;
  routes = [];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) {
        if (route.throws) throw new Error('fake db failure');
        const result = route.respond ? route.respond(params) : route.rows;
        return [result];
      }
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
  },
} as any;

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const ComponentRegistryService = require('../componentRegistryService');

async function main() {

// ============================================================================
// getAllComponents — cache miss → DB
// ============================================================================
console.log('\n── getAllComponents: cache miss ──────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{
    match: /FROM component_registry/i,
    rows: [{
      id: 1, name: 'Button', file_path: '/src/Button.tsx',
      relative_path: 'src/Button.tsx', directory: 'src', extension: '.tsx',
      category: 'ui',
      props: '[{"name":"label"}]',
      imports: '["React"]',
      exports: '["Button"]',
      is_default: 1,
      has_jsx: 1,
      has_hooks: 0,
      dependencies: '["react"]',
      file_size: 500,
      lines_of_code: 50,
      complexity_score: 5,
      last_modified: '2026-04-10',
      discovery_version: '1',
      discovered_at: '2026-04-01',
      updated_at: '2026-04-10',
    }],
  }];

  const result = await svc.getAllComponents();
  assertEq(result.version, '1.0.0', 'version');
  assert(typeof result.generatedAt === 'string', 'generatedAt is string');
  assertEq(result.components.length, 1, '1 component');
  const c = result.components[0];
  assertEq(c.id, 1, 'id');
  assertEq(c.name, 'Button', 'name');
  assertEq(c.filePath, '/src/Button.tsx', 'filePath mapped');
  assertEq(c.relativePath, 'src/Button.tsx', 'relativePath mapped');
  assertEq(c.props, [{ name: 'label' }], 'props parsed');
  assertEq(c.imports, ['React'], 'imports parsed');
  assertEq(c.exports, ['Button'], 'exports parsed');
  assertEq(c.dependencies, ['react'], 'dependencies parsed');
  assertEq(c.isDefault, ['export default function Button'], 'isDefault expanded string');
  assertEq(c.hasJSX, 1, 'hasJSX passed through');
  assertEq(c.size, 500, 'size mapped');
  assertEq(c.lines, 50, 'lines mapped');
  assertEq(c.complexity, 5, 'complexity mapped');
}

// Null JSON fields → default []
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{
    match: /FROM component_registry/i,
    rows: [{
      id: 1, name: 'X', file_path: '', relative_path: '', directory: '',
      extension: '', category: null,
      props: null, imports: null, exports: null, dependencies: null,
      is_default: 0, has_jsx: 0, has_hooks: 0,
      file_size: 0, lines_of_code: 0, complexity_score: 0,
      last_modified: null, discovery_version: null,
      discovered_at: null, updated_at: null,
    }],
  }];
  const result = await svc.getAllComponents();
  const c = result.components[0];
  assertEq(c.props, [], 'null props → []');
  assertEq(c.imports, [], 'null imports → []');
  assertEq(c.exports, [], 'null exports → []');
  assertEq(c.dependencies, [], 'null dependencies → []');
  assertEq(c.isDefault, [], 'is_default=0 → []');
}

// ============================================================================
// getAllComponents — cache hit
// ============================================================================
console.log('\n── getAllComponents: cache hit ───────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{
    match: /FROM component_registry/i,
    rows: [{
      id: 42, name: 'Cached', file_path: '', relative_path: '', directory: '',
      extension: '', category: null, props: null, imports: null, exports: null,
      dependencies: null, is_default: 0, has_jsx: 0, has_hooks: 0,
      file_size: 0, lines_of_code: 0, complexity_score: 0,
      last_modified: null, discovery_version: null,
      discovered_at: null, updated_at: null,
    }],
  }];

  // First call: DB
  await svc.getAllComponents();
  assertEq(calls.length, 1, '1 DB call after first fetch');

  // Second call: cache hit, no new DB call
  const second = await svc.getAllComponents();
  assertEq(calls.length, 1, 'still 1 DB call (cache hit)');
  assertEq(second.components[0].id, 42, 'returns cached data');
}

// ============================================================================
// getAllComponents — error path → fallback
// ============================================================================
console.log('\n── getAllComponents: error fallback ──────────────────────');

{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, throws: true }];
  quiet();
  const result = await svc.getAllComponents();
  loud();
  assertEq(result.components, [], 'fallback empty components');
  assertEq(result.generatedBy, 'Fallback (database unavailable)', 'fallback label');
  assertEq(result.version, '1.0.0', 'version still set');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

// Found
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{
    match: /WHERE name = \? AND is_active/i,
    rows: [{
      id: 7, name: 'Card', file_path: '', relative_path: '', directory: '',
      extension: '.tsx', category: 'ui',
      props: '[]', imports: '[]', exports: '[]', dependencies: '[]',
      is_default: 1, has_jsx: 1, has_hooks: 0,
      file_size: 100, lines_of_code: 20, complexity_score: 2,
      last_modified: '2026-04-01', discovery_version: '1',
      discovered_at: '2026-03-01', updated_at: '2026-04-01',
    }],
  }];
  const c = await svc.getComponentByName('Card');
  assertEq(c.id, 7, 'id');
  assertEq(c.name, 'Card', 'name');
  assertEq(c.isDefault, 1, 'is_default raw (not expanded for single-get)');
  assertEq(calls[0].params, ['Card'], 'name param');
}

// Not found
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /WHERE name = \?/i, rows: [] }];
  const c = await svc.getComponentByName('missing');
  assertEq(c, null, 'null when not found');
}

// Error → null
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /WHERE name = \?/i, throws: true }];
  quiet();
  const c = await svc.getComponentByName('err');
  loud();
  assertEq(c, null, 'error → null');
}

// ============================================================================
// searchComponents
// ============================================================================
console.log('\n── searchComponents: filters ─────────────────────────────');

// No filters → WHERE is_active only, default limit 100
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  await svc.searchComponents();
  assert(/LIMIT 100/.test(calls[0].sql), 'default limit 100');
  assertEq(calls[0].params.length, 0, 'no params');
}

// category filter
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  await svc.searchComponents({ category: 'ui' });
  assert(/AND category = \?/.test(calls[0].sql), 'category condition');
  assertEq(calls[0].params, ['ui'], 'category param');
}

// hasJSX / hasHooks
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  await svc.searchComponents({ hasJSX: true, hasHooks: false });
  assert(/has_jsx = \?/.test(calls[0].sql), 'hasJSX condition');
  assert(/has_hooks = \?/.test(calls[0].sql), 'hasHooks condition');
  assertEq(calls[0].params, [true, false], 'JSX + hooks params');
}

// directory LIKE
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  await svc.searchComponents({ directory: 'pages' });
  assert(/directory LIKE \?/.test(calls[0].sql), 'directory LIKE');
  assertEq(calls[0].params, ['%pages%'], 'wrapped in %');
}

// search term (name OR directory)
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  await svc.searchComponents({ search: 'button' });
  assert(/\(name LIKE \? OR directory LIKE \?\)/.test(calls[0].sql), 'OR condition');
  assertEq(calls[0].params, ['%button%', '%button%'], 'both wrapped');
}

// Custom limit
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, rows: [] }];
  await svc.searchComponents({ limit: 25 });
  assert(/LIMIT 25/.test(calls[0].sql), 'custom limit');
}

// All filters + result mapping
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{
    match: /FROM component_registry/i,
    rows: [{
      id: 9, name: 'Foo', file_path: '', relative_path: '', directory: '',
      extension: '.tsx', category: 'ui',
      props: '[{"name":"x"}]', imports: '[]', exports: '[]', dependencies: '[]',
      is_default: 0, has_jsx: 1, has_hooks: 1,
      file_size: 10, lines_of_code: 5, complexity_score: 1,
    }],
  }];
  const results = await svc.searchComponents({
    category: 'ui', hasJSX: true, hasHooks: true, directory: 'components', search: 'Foo', limit: 10,
  });
  assertEq(results.length, 1, '1 result');
  assertEq(results[0].props, [{ name: 'x' }], 'props parsed');
  assertEq(results[0].hasJSX, 1, 'hasJSX');
  assertEq(calls[0].params.length, 6, '6 params total');
}

// Error → []
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /FROM component_registry/i, throws: true }];
  quiet();
  const r = await svc.searchComponents();
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [
    {
      match: /COUNT\(\*\) as total_components/i,
      rows: [{
        total_components: 50,
        total_categories: 5,
        total_directories: 12,
        avg_file_size: 1234.7,
        avg_lines: 45.3,
        jsx_components: 40,
        hook_components: 25,
        last_updated: '2026-04-10',
      }],
    },
    {
      match: /GROUP BY category/i,
      rows: [
        { category: 'ui', count: 20 },
        { category: 'layout', count: 15 },
      ],
    },
  ];

  const s = await svc.getComponentSummary();
  assertEq(s.total, 50, 'total');
  assertEq(s.categories.length, 2, '2 categories');
  assertEq(s.categories[0], { name: 'ui', count: 20 }, 'first category');
  assertEq(s.statistics.totalDirectories, 12, 'totalDirectories');
  assertEq(s.statistics.averageFileSize, 1235, 'averageFileSize rounded');
  assertEq(s.statistics.averageLines, 45, 'averageLines rounded');
  assertEq(s.statistics.jsxComponents, 40, 'jsx count');
  assertEq(s.statistics.hookComponents, 25, 'hook count');
  assertEq(s.statistics.lastUpdated, '2026-04-10', 'lastUpdated');
}

// Null averages → 0
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [
    {
      match: /COUNT\(\*\) as total_components/i,
      rows: [{
        total_components: 0, total_categories: 0, total_directories: 0,
        avg_file_size: null, avg_lines: null,
        jsx_components: 0, hook_components: 0, last_updated: null,
      }],
    },
    { match: /GROUP BY category/i, rows: [] },
  ];
  const s = await svc.getComponentSummary();
  assertEq(s.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(s.statistics.averageLines, 0, 'null lines → 0');
}

// Error → empty fallback
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /COUNT\(\*\) as total_components/i, throws: true }];
  quiet();
  const s = await svc.getComponentSummary();
  loud();
  assertEq(s.total, 0, 'fallback total');
  assertEq(s.categories, [], 'fallback categories');
  assertEq(s.statistics, {}, 'fallback statistics');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// No fields → no-op (no query)
{
  const svc = new ComponentRegistryService();
  resetDb();
  quiet();
  await svc.updateComponent('Foo', {});
  loud();
  assertEq(calls.length, 0, 'no DB call when nothing to update');
}

// category only
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /UPDATE component_registry/i, rows: {} }];
  quiet();
  await svc.updateComponent('Bar', { category: 'layout' });
  loud();
  assertEq(calls.length, 1, '1 call');
  assert(/SET category = \?, updated_at = CURRENT_TIMESTAMP/.test(calls[0].sql), 'category + updated_at');
  assertEq(calls[0].params, ['layout', 'Bar'], 'params: value + name');
}

// Multiple fields
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /UPDATE component_registry/i, rows: {} }];
  quiet();
  await svc.updateComponent('Baz', {
    category: 'ui', file_size: 200, lines_of_code: 20, complexity_score: 3,
  });
  loud();
  assertEq(calls[0].params, ['ui', 200, 20, 3, 'Baz'], 'all params in order');
  assert(/SET category = \?, file_size = \?, lines_of_code = \?, complexity_score = \?, updated_at/.test(calls[0].sql), 'all fields');
}

// Cache cleared after update
{
  const svc = new ComponentRegistryService();
  // Pre-populate cache
  svc.cache.set('all_components', { data: { fake: true }, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'cache pre-populated');

  resetDb();
  routes = [{ match: /UPDATE component_registry/i, rows: {} }];
  quiet();
  await svc.updateComponent('X', { category: 'new' });
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared after update');
}

// Error re-thrown
{
  const svc = new ComponentRegistryService();
  resetDb();
  routes = [{ match: /UPDATE component_registry/i, throws: true }];
  quiet();
  let caught: Error | null = null;
  try {
    await svc.updateComponent('Err', { category: 'x' });
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'error re-thrown (not swallowed like reads)');
}

// ============================================================================
// clearCache + getFallbackComponents
// ============================================================================
console.log('\n── clearCache / getFallbackComponents ────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('a', 1);
  svc.cache.set('b', 2);
  assertEq(svc.cache.size, 2, 'cache populated');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared');
}

{
  const svc = new ComponentRegistryService();
  const fb = svc.getFallbackComponents();
  assertEq(fb.version, '1.0.0', 'version');
  assertEq(fb.components, [], 'empty components');
  assertEq(fb.generatedBy, 'Fallback (database unavailable)', 'label');
  assert(typeof fb.generatedAt === 'string', 'generatedAt string');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
