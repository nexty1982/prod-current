#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1011)
 *
 * Covers:
 *   - getAllComponents          happy path with JSON deserialization,
 *                                cache hit (returns cached without 2nd query),
 *                                cache expiry (new query after timeout),
 *                                error → fallback shape,
 *                                null JSON fields → default [] via default arg
 *   - getComponentByName        found returns parsed, not-found returns null,
 *                                error returns null (swallowed)
 *   - searchComponents          no filters baseline, category filter,
 *                                hasJSX / hasHooks (including false),
 *                                directory LIKE, search LIKE (OR), limit,
 *                                error returns []
 *   - getComponentSummary       aggregates mapped to return shape,
 *                                numeric rounding of avg_file_size / avg_lines,
 *                                null avg handling,
 *                                categories array mapping,
 *                                error returns empty shape
 *   - updateComponent           field allowlist (only known fields), no-op
 *                                (no fields → no query + no cache clear),
 *                                UPDATE issued with updated_at, cache cleared,
 *                                error re-thrown
 *   - clearCache                empties the cache map
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

// ── Stub config/db-compat BEFORE requiring SUT ──────────────────────────
type Call = { sql: string; params: any[] };
const poolCalls: Call[] = [];
type Route = { match: RegExp; rows: any[]; result?: any; throws?: Error };
const poolRoutes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    for (const r of poolRoutes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows, r.result ?? {}] as any;
      }
    }
    return [[], {}] as any;
  },
};

function resetPool() {
  poolCalls.length = 0;
  poolRoutes.length = 0;
}

const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
  },
} as any;

const ComponentRegistryService = require('../componentRegistryService');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const sampleRow = {
  id: 1,
  name: 'Button',
  file_path: '/a/Button.tsx',
  relative_path: 'a/Button.tsx',
  directory: 'a',
  extension: '.tsx',
  category: 'ui',
  props: JSON.stringify([{ name: 'label', type: 'string' }]),
  imports: JSON.stringify(['react']),
  exports: JSON.stringify(['Button']),
  is_default: 1,
  has_jsx: 1,
  has_hooks: 0,
  dependencies: JSON.stringify(['mui']),
  file_size: 1200,
  lines_of_code: 45,
  complexity_score: 3,
  last_modified: '2026-01-01',
  discovery_version: '1.0',
  discovered_at: '2026-01-01',
  updated_at: '2026-01-02',
};

async function main() {

// ============================================================================
// getAllComponents — happy path + cache
// ============================================================================
console.log('\n── getAllComponents: happy path ──────────────────────────');

resetPool();
poolRoutes.push({
  match: /FROM component_registry\s+WHERE is_active = TRUE\s+ORDER BY name/i,
  rows: [sampleRow],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  assertEq(r.version, '1.0.0', 'version');
  assert(typeof r.generatedAt === 'string', 'generatedAt set');
  assertEq(r.components.length, 1, '1 component');
  assertEq(r.components[0].name, 'Button', 'name');
  assertEq(r.components[0].filePath, '/a/Button.tsx', 'filePath');
  assertEq(r.components[0].props, [{ name: 'label', type: 'string' }], 'props parsed');
  assertEq(r.components[0].imports, ['react'], 'imports parsed');
  assertEq(r.components[0].exports, ['Button'], 'exports parsed');
  assertEq(r.components[0].dependencies, ['mui'], 'dependencies parsed');
  assertEq(r.components[0].isDefault, ['export default function Button'], 'isDefault formatted when truthy');
  assertEq(poolCalls.length, 1, '1 query fired');

  // Cache hit: call again, should NOT fire another query
  const r2 = await svc.getAllComponents();
  assertEq(poolCalls.length, 1, 'cache hit (still 1 query)');
  assertEq(r2.components.length, 1, 'cached result returned');
}

// Null JSON fields → default []
resetPool();
poolRoutes.push({
  match: /FROM component_registry/i,
  rows: [{ ...sampleRow, props: null, imports: null, exports: null, dependencies: null, is_default: 0 }],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  assertEq(r.components[0].props, [], 'null props → []');
  assertEq(r.components[0].imports, [], 'null imports → []');
  assertEq(r.components[0].exports, [], 'null exports → []');
  assertEq(r.components[0].dependencies, [], 'null deps → []');
  assertEq(r.components[0].isDefault, [], 'is_default=0 → []');
}

// ============================================================================
// getAllComponents — error → fallback
// ============================================================================
console.log('\n── getAllComponents: error → fallback ────────────────────');

resetPool();
poolRoutes.push({ match: /FROM component_registry/i, rows: [], throws: new Error('db down') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  loud();
  assertEq(r.components, [], 'fallback components = []');
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback marker');
  assertEq(r.version, '1.0.0', 'fallback version');
}

// ============================================================================
// getAllComponents — cache expiry
// ============================================================================
console.log('\n── getAllComponents: cache expiry ────────────────────────');

resetPool();
poolRoutes.push({ match: /FROM component_registry/i, rows: [sampleRow] });
{
  const svc = new ComponentRegistryService();
  svc.cacheTimeout = 1; // 1ms — expires immediately
  await svc.getAllComponents();
  // Tiny delay to ensure timeout is exceeded
  await new Promise(r => setTimeout(r, 5));
  await svc.getAllComponents();
  assertEq(poolCalls.length, 2, '2 queries fired after expiry');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

// Found
resetPool();
poolRoutes.push({
  match: /WHERE name = \? AND is_active = TRUE/i,
  rows: [sampleRow],
});
{
  const svc = new ComponentRegistryService();
  const comp = await svc.getComponentByName('Button');
  assert(comp !== null, 'returns component');
  assertEq(comp.name, 'Button', 'name');
  assertEq(comp.props, [{ name: 'label', type: 'string' }], 'props parsed');
  assertEq(poolCalls[0].params, ['Button'], 'param bound');
  // By-name returns raw is_default (truthy), not an array
  assertEq(comp.isDefault, 1, 'isDefault is raw value');
}

// Not found
resetPool();
poolRoutes.push({ match: /WHERE name = \?/i, rows: [] });
{
  const svc = new ComponentRegistryService();
  const comp = await svc.getComponentByName('Nope');
  assertEq(comp, null, 'not found → null');
}

// Error → null (swallowed)
resetPool();
poolRoutes.push({ match: /WHERE name = \?/i, rows: [], throws: new Error('db fail') });
quiet();
{
  const svc = new ComponentRegistryService();
  const comp = await svc.getComponentByName('X');
  loud();
  assertEq(comp, null, 'error → null');
}

// ============================================================================
// searchComponents — no filters
// ============================================================================
console.log('\n── searchComponents: no filters ──────────────────────────');

resetPool();
poolRoutes.push({ match: /FROM component_registry\s+WHERE is_active = TRUE/i, rows: [sampleRow] });
{
  const svc = new ComponentRegistryService();
  const results = await svc.searchComponents();
  assertEq(results.length, 1, '1 result');
  assertEq(results[0].name, 'Button', 'name');
  assertEq(poolCalls[0].params, [], 'no params');
  assert(/LIMIT 100/i.test(poolCalls[0].sql), 'default limit 100');
}

// ============================================================================
// searchComponents — filter composition
// ============================================================================
console.log('\n── searchComponents: filters ─────────────────────────────');

resetPool();
poolRoutes.push({ match: /FROM component_registry/i, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({
    category: 'ui',
    hasJSX: true,
    hasHooks: false,
    directory: 'pages',
    search: 'Btn',
    limit: 25,
  });
  const c = poolCalls[0];
  assert(/AND category = \?/i.test(c.sql), 'category clause');
  assert(/AND has_jsx = \?/i.test(c.sql), 'has_jsx clause');
  assert(/AND has_hooks = \?/i.test(c.sql), 'has_hooks clause');
  assert(/AND directory LIKE \?/i.test(c.sql), 'directory LIKE clause');
  assert(/AND \(name LIKE \? OR directory LIKE \?\)/i.test(c.sql), 'search OR clause');
  assert(/LIMIT 25/i.test(c.sql), 'custom limit');
  // Params order: category, hasJSX, hasHooks, directory, search × 2
  assertEq(c.params, ['ui', true, false, '%pages%', '%Btn%', '%Btn%'], 'params in order');
}

// hasJSX=false should also be included (undefined check)
resetPool();
poolRoutes.push({ match: /FROM component_registry/i, rows: [] });
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasJSX: false });
  assert(/AND has_jsx = \?/i.test(poolCalls[0].sql), 'has_jsx clause when false');
  assertEq(poolCalls[0].params, [false], 'false param bound');
}

// Error → []
resetPool();
poolRoutes.push({ match: /FROM component_registry/i, rows: [], throws: new Error('fail') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.searchComponents({ category: 'ui' });
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

resetPool();
// Stats query
poolRoutes.push({
  match: /COUNT\(\*\) as total_components/i,
  rows: [{
    total_components: 150,
    total_categories: 5,
    total_directories: 20,
    avg_file_size: 1234.7,
    avg_lines: 56.3,
    jsx_components: 120,
    hook_components: 80,
    last_updated: '2026-04-01',
  }],
});
// Categories query
poolRoutes.push({
  match: /GROUP BY category/i,
  rows: [
    { category: 'ui', count: 50 },
    { category: 'pages', count: 40 },
  ],
});
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.total, 150, 'total');
  assertEq(r.categories.length, 2, '2 categories');
  assertEq(r.categories[0], { name: 'ui', count: 50 }, 'category[0]');
  assertEq(r.statistics.averageFileSize, 1235, 'avg_file_size rounded');
  assertEq(r.statistics.averageLines, 56, 'avg_lines rounded');
  assertEq(r.statistics.jsxComponents, 120, 'jsx count');
  assertEq(r.statistics.hookComponents, 80, 'hook count');
  assertEq(r.statistics.totalDirectories, 20, 'totalDirectories');
  assertEq(r.statistics.lastUpdated, '2026-04-01', 'lastUpdated');
}

// Null avg handling
resetPool();
poolRoutes.push({
  match: /COUNT\(\*\) as total_components/i,
  rows: [{
    total_components: 0,
    total_categories: 0,
    total_directories: 0,
    avg_file_size: null,
    avg_lines: null,
    jsx_components: 0,
    hook_components: 0,
    last_updated: null,
  }],
});
poolRoutes.push({ match: /GROUP BY category/i, rows: [] });
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(r.statistics.averageLines, 0, 'null lines → 0');
  assertEq(r.categories, [], 'empty categories');
}

// Error → empty shape
resetPool();
poolRoutes.push({ match: /COUNT\(\*\)/i, rows: [], throws: new Error('fail') });
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  loud();
  assertEq(r.total, 0, 'error total = 0');
  assertEq(r.categories, [], 'error categories = []');
  assertEq(r.statistics, {}, 'error statistics = {}');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// No fields → no query
resetPool();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Button', {});
  assertEq(poolCalls.length, 0, 'no-op when no fields');
}

// Happy path
resetPool();
poolRoutes.push({ match: /^\s*UPDATE component_registry/i, rows: [] });
quiet();
{
  const svc = new ComponentRegistryService();
  // Prime cache
  svc.cache.set('test', { data: 'x', timestamp: Date.now() });
  await svc.updateComponent('Button', {
    category: 'ui',
    file_size: 1500,
    lines_of_code: 60,
    complexity_score: 4,
    bogus: 'ignored',
  });
  loud();
  assertEq(poolCalls.length, 1, '1 query');
  const c = poolCalls[0];
  assert(/category = \?/i.test(c.sql), 'category updated');
  assert(/file_size = \?/i.test(c.sql), 'file_size updated');
  assert(/lines_of_code = \?/i.test(c.sql), 'lines_of_code updated');
  assert(/complexity_score = \?/i.test(c.sql), 'complexity_score updated');
  assert(/updated_at = CURRENT_TIMESTAMP/i.test(c.sql), 'updated_at touched');
  assert(!/bogus/i.test(c.sql), 'bogus not included');
  // Last param = name
  assertEq(c.params[c.params.length - 1], 'Button', 'name as last param');
  // Cache cleared
  assertEq(svc.cache.size, 0, 'cache cleared after update');
}

// Error re-thrown
resetPool();
poolRoutes.push({ match: /^\s*UPDATE/i, rows: [], throws: new Error('locked') });
quiet();
{
  const svc = new ComponentRegistryService();
  let caught: Error | null = null;
  try { await svc.updateComponent('X', { category: 'y' }); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && /locked/.test(caught!.message), 'update error re-thrown');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('a', { data: 1, timestamp: Date.now() });
  svc.cache.set('b', { data: 2, timestamp: Date.now() });
  assertEq(svc.cache.size, 2, 'cache has 2 entries');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
