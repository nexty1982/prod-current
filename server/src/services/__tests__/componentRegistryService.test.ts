#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js
 *
 * Thin DB wrapper over `component_registry`. One dep: `../config/db-compat`
 * (exports both `getAppPool` and `promisePool`). Stubbed via require.cache.
 *
 * Coverage:
 *   - getAllComponents
 *       · cache miss → DB hit → returns formatted result
 *       · cache hit (within timeout) → no DB query
 *       · is_default expansion to array
 *       · JSON parsing of props/imports/exports/dependencies (null → [])
 *       · error path → returns fallback
 *   - getComponentByName
 *       · hit → parsed component
 *       · miss → null
 *       · error → null
 *       · isDefault raw (not expanded to array) for this method
 *   - searchComponents
 *       · filter composition (category, hasJSX, hasHooks, directory LIKE, search OR)
 *       · LIMIT default 100, custom limit
 *       · error → []
 *   - getComponentSummary
 *       · stats + categories structure
 *       · null avg → 0 after round
 *       · error → default empty shape
 *   - updateComponent
 *       · only provided fields in SET
 *       · no fields → no query
 *       · always appends updated_at = CURRENT_TIMESTAMP
 *       · name is last param
 *       · cache cleared after update
 *       · error path re-throws
 *   - clearCache: empties the cache
 *   - getFallbackComponents: static shape
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

// ── Scriptable SQL-routed pool ─────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any; throws?: Error };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbCompatStub = {
  getAppPool: () => fakePool,
  promisePool: fakePool,
};
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath, filename: dbCompatPath, loaded: true, exports: dbCompatStub,
} as any;

// Silence console (module logs on update/clear/error)
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function reset() { queryLog.length = 0; routes = []; }

const ComponentRegistryService = require('../componentRegistryService');

async function main() {

// ============================================================================
// getAllComponents — happy path & cache
// ============================================================================
console.log('\n── getAllComponents ──────────────────────────────────────');

reset();
routes.push({
  match: /FROM component_registry/,
  rows: [
    {
      id: 1, name: 'Foo', file_path: '/a/Foo.tsx', relative_path: 'a/Foo.tsx',
      directory: 'a', extension: 'tsx', category: 'ui',
      props: '["a","b"]', imports: '["react"]', exports: '["Foo"]',
      is_default: 1, has_jsx: 1, has_hooks: 0,
      dependencies: '["dep1"]', file_size: 100, lines_of_code: 10,
      complexity_score: 2, last_modified: '2026-01-01', discovery_version: '1.0',
      discovered_at: '2026-01-01', updated_at: '2026-01-02',
    },
    {
      id: 2, name: 'Bar', file_path: '/b/Bar.tsx', relative_path: 'b/Bar.tsx',
      directory: 'b', extension: 'tsx', category: 'ui',
      props: null, imports: null, exports: null,
      is_default: 0, has_jsx: 1, has_hooks: 1,
      dependencies: null, file_size: 50, lines_of_code: 5,
      complexity_score: 1, last_modified: '2026-01-01', discovery_version: '1.0',
      discovered_at: '2026-01-01', updated_at: '2026-01-02',
    },
  ],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(r.generatedBy, 'OrthodoxMetrics Component Discovery System (Database)', 'generatedBy');
  assertEq(r.components.length, 2, '2 components');

  const foo = r.components[0];
  assertEq(foo.name, 'Foo', 'name');
  assertEq(foo.filePath, '/a/Foo.tsx', 'filePath');
  assertEq(foo.relativePath, 'a/Foo.tsx', 'relativePath');
  assertEq(foo.props, ['a', 'b'], 'props parsed');
  assertEq(foo.imports, ['react'], 'imports parsed');
  assertEq(foo.exports, ['Foo'], 'exports parsed');
  assertEq(foo.dependencies, ['dep1'], 'dependencies parsed');
  assertEq(foo.isDefault, ['export default function Foo'], 'is_default expanded');
  assertEq(foo.hasJSX, 1, 'hasJSX');
  assertEq(foo.hasHooks, 0, 'hasHooks');

  const bar = r.components[1];
  assertEq(bar.props, [], 'null props → []');
  assertEq(bar.imports, [], 'null imports → []');
  assertEq(bar.dependencies, [], 'null dependencies → []');
  assertEq(bar.isDefault, [], 'is_default=0 → empty array');
}

// Cache hit: second call should NOT query DB
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  // Seed cache directly (simulating prior load)
  svc.cache.set('all_components', {
    data: { cached: true, components: [] },
    timestamp: Date.now(),
  });
  const r = await svc.getAllComponents();
  assertEq((r as any).cached, true, 'served from cache');
  assertEq(queryLog.length, 0, 'no DB query on cache hit');
}

// Cache expired (> 10 min ago) → refetch
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  svc.cache.set('all_components', {
    data: { cached: 'old' },
    timestamp: Date.now() - (11 * 60 * 1000), // 11 min ago
  });
  const r = await svc.getAllComponents();
  assertEq((r as any).cached, undefined, 'not served from stale cache');
  assertEq(queryLog.length, 1, 'DB query on expired cache');
}

// Error path → fallback
reset();
routes.push({ match: /FROM component_registry/, throws: new Error('db down') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  loud();
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback on error');
  assertEq(r.components, [], 'fallback components empty');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

// Hit
reset();
routes.push({
  match: /WHERE name = \?/,
  rows: [{
    id: 5, name: 'Widget', file_path: '/x/W.tsx', relative_path: 'x/W.tsx',
    directory: 'x', extension: 'tsx', category: 'ui',
    props: '["p"]', imports: '[]', exports: '[]',
    is_default: 1, has_jsx: 1, has_hooks: 1,
    dependencies: '[]', file_size: 20, lines_of_code: 3,
    complexity_score: 1, last_modified: null, discovery_version: '1.0',
    discovered_at: null, updated_at: null,
  }],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('Widget');
  assertEq(queryLog[0].params, ['Widget'], 'name param');
  assertEq(r.name, 'Widget', 'name');
  assertEq(r.props, ['p'], 'props parsed');
  // Note: getComponentByName returns isDefault as raw (not expanded)
  assertEq(r.isDefault, 1, 'isDefault raw (not expanded)');
}

// Miss
reset();
routes.push({ match: /WHERE name = \?/, rows: [] });
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('Missing');
  assertEq(r, null, 'miss → null');
}

// Error → null
reset();
routes.push({ match: /WHERE name = \?/, throws: new Error('boom') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('X');
  loud();
  assertEq(r, null, 'error → null');
}

// ============================================================================
// searchComponents
// ============================================================================
console.log('\n── searchComponents ──────────────────────────────────────');

// No filters: default LIMIT 100
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents();
  assert(/LIMIT 100/.test(queryLog[0].sql), 'default LIMIT 100');
  assertEq(queryLog[0].params, [], 'no params');
}

// category
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ category: 'ui' });
  assert(/category = \?/.test(queryLog[0].sql), 'category clause');
  assertEq(queryLog[0].params, ['ui'], 'category param');
}

// hasJSX (true)
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasJSX: true });
  assert(/has_jsx = \?/.test(queryLog[0].sql), 'has_jsx clause');
  assertEq(queryLog[0].params, [true], 'hasJSX param');
}

// hasHooks (false)
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasHooks: false });
  assert(/has_hooks = \?/.test(queryLog[0].sql), 'has_hooks clause');
  assertEq(queryLog[0].params, [false], 'hasHooks param');
}

// directory LIKE
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ directory: 'features' });
  assert(/directory LIKE \?/.test(queryLog[0].sql), 'directory LIKE');
  assertEq(queryLog[0].params, ['%features%'], 'directory LIKE param');
}

// search (OR name/directory)
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ search: 'Button' });
  assert(/name LIKE \? OR directory LIKE \?/.test(queryLog[0].sql), 'OR search');
  assertEq(queryLog[0].params, ['%Button%', '%Button%'], 'search params x2');
}

// combined + custom limit
reset();
routes.push({ match: /FROM component_registry/, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ category: 'page', hasJSX: true, limit: 50 });
  assert(/LIMIT 50/.test(queryLog[0].sql), 'custom LIMIT');
  assertEq(queryLog[0].params, ['page', true], 'combined params');
}

// Row mapping
reset();
routes.push({
  match: /FROM component_registry/,
  rows: [{
    id: 1, name: 'X', file_path: '/x', relative_path: 'x', directory: 'a',
    extension: 'tsx', category: 'ui',
    props: '["p"]', imports: null, exports: null,
    is_default: 1, has_jsx: 1, has_hooks: 0,
    dependencies: null, file_size: 10, lines_of_code: 1, complexity_score: 1,
  }],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.searchComponents({});
  assertEq(r.length, 1, '1 row');
  assertEq(r[0].props, ['p'], 'props parsed');
  assertEq(r[0].imports, [], 'null imports → []');
  assertEq(r[0].isDefault, 1, 'isDefault raw');
}

// Error → []
reset();
routes.push({ match: /FROM component_registry/, throws: new Error('boom') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.searchComponents();
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

// Happy path: two queries (stats then categories)
reset();
let statsQueryCount = 0;
routes.push({
  match: /SELECT[\s\S]*COUNT\(\*\) as total_components/,
  respond: () => {
    statsQueryCount++;
    return [{
      total_components: 42,
      total_categories: 5,
      total_directories: 8,
      avg_file_size: 123.7,
      avg_lines: 45.2,
      jsx_components: 30,
      hook_components: 20,
      last_updated: '2026-04-10',
    }];
  },
});
routes.push({
  match: /SELECT category, COUNT\(\*\)/,
  rows: [
    { category: 'ui', count: 20 },
    { category: 'page', count: 15 },
  ],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.total, 42, 'total');
  assertEq(r.categories.length, 2, '2 categories');
  assertEq(r.categories[0], { name: 'ui', count: 20 }, 'ui cat');
  assertEq(r.categories[1], { name: 'page', count: 15 }, 'page cat');
  assertEq(r.statistics.totalDirectories, 8, 'directories');
  assertEq(r.statistics.averageFileSize, 124, 'avg rounded');
  assertEq(r.statistics.averageLines, 45, 'avg lines rounded');
  assertEq(r.statistics.jsxComponents, 30, 'jsx count');
  assertEq(r.statistics.hookComponents, 20, 'hook count');
  assertEq(r.statistics.lastUpdated, '2026-04-10', 'lastUpdated');
}

// Null avg → 0 after round
reset();
routes.push({
  match: /SELECT[\s\S]*COUNT\(\*\) as total_components/,
  rows: [{
    total_components: 0, total_categories: 0, total_directories: 0,
    avg_file_size: null, avg_lines: null,
    jsx_components: 0, hook_components: 0, last_updated: null,
  }],
});
routes.push({ match: /SELECT category, COUNT\(\*\)/, rows: [] });
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(r.statistics.averageLines, 0, 'null avg lines → 0');
  assertEq(r.total, 0, 'total 0');
  assertEq(r.categories, [], 'empty categories');
}

// Error → default empty
reset();
routes.push({ match: /total_components/, throws: new Error('fail') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  loud();
  assertEq(r.total, 0, 'error total 0');
  assertEq(r.categories, [], 'error categories []');
  assertEq(r.statistics, {}, 'error stats {}');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// Happy path: single field update
reset();
routes.push({ match: /UPDATE component_registry/, rows: {} });
quiet();
{
  const svc = new ComponentRegistryService();
  // Seed cache to verify clearCache fires
  svc.cache.set('all_components', { data: {}, timestamp: Date.now() });
  await svc.updateComponent('Widget', { category: 'page' });
  loud();
  assertEq(queryLog.length, 1, 'one UPDATE');
  const sql = queryLog[0].sql;
  assert(/category = \?/.test(sql), 'category SET');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(sql), 'updated_at always appended');
  assert(/WHERE name = \?/.test(sql), 'WHERE name');
  assertEq(queryLog[0].params, ['page', 'Widget'], 'params order');
  assertEq(svc.cache.size, 0, 'cache cleared after update');
}

// Multiple fields
reset();
routes.push({ match: /UPDATE component_registry/, rows: {} });
quiet();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Widget', {
    category: 'ui',
    file_size: 500,
    lines_of_code: 42,
    complexity_score: 3,
  });
  loud();
  const sql = queryLog[0].sql;
  assert(/category = \?/.test(sql), 'category SET');
  assert(/file_size = \?/.test(sql), 'file_size SET');
  assert(/lines_of_code = \?/.test(sql), 'lines_of_code SET');
  assert(/complexity_score = \?/.test(sql), 'complexity_score SET');
  assertEq(queryLog[0].params, ['ui', 500, 42, 3, 'Widget'], 'all params + name last');
}

// No fields → no query
reset();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Widget', {});
  assertEq(queryLog.length, 0, 'empty updates → no query');
}

// Unknown field skipped (no query, since none whitelisted)
reset();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Widget', { unknown: 'x' });
  assertEq(queryLog.length, 0, 'unknown-only → no query');
}

// Error re-thrown
reset();
routes.push({ match: /UPDATE component_registry/, throws: new Error('update fail') });
quiet();
{
  const svc = new ComponentRegistryService();
  let caught: any = null;
  try { await svc.updateComponent('Widget', { category: 'x' }); }
  catch (e) { caught = e; }
  loud();
  assert(caught && /update fail/.test(caught.message), 'error re-thrown');
}

// ============================================================================
// clearCache / getFallbackComponents
// ============================================================================
console.log('\n── clearCache / getFallbackComponents ────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('k1', { data: {}, timestamp: Date.now() });
  svc.cache.set('k2', { data: {}, timestamp: Date.now() });
  assertEq(svc.cache.size, 2, 'seeded 2');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cleared');
}

{
  const svc = new ComponentRegistryService();
  const r = svc.getFallbackComponents();
  assertEq(r.version, '1.0.0', 'fallback version');
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback label');
  assertEq(r.components, [], 'fallback empty');
  assertEq(r.discoveryTime, 0, 'discoveryTime 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
