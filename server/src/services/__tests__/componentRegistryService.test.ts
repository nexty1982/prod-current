#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-995)
 *
 * DB-backed registry that caches auto-discovered React components.
 * We stub `../config/db-compat` BEFORE requiring the SUT so getAppPool()
 * returns a fake pool whose query() is controlled per-test.
 *
 * Coverage:
 *   - getAllComponents: empty, happy path (JSON parse, shape), cache hit,
 *                       cache expiry, error → fallback
 *   - getComponentByName: not found → null, found (shape + JSON parse),
 *                         error → null
 *   - searchComponents: no filters, category, hasJSX, hasHooks, directory,
 *                       search, combined, custom limit, error → []
 *   - getComponentSummary: happy path, error → zero shape
 *   - updateComponent: builds UPDATE with only provided fields, clears cache,
 *                      no-op when no fields, error re-thrown
 *   - clearCache: empties cache map
 *   - getFallbackComponents: shape
 *
 * Run: npx tsx server/src/services/__tests__/componentRegistryService.test.ts
 */

// ── Stub ../config/db-compat BEFORE requiring SUT ─────────────────────
type PoolCall = { sql: string; params: any[] };
let poolCalls: PoolCall[] = [];
let nextRowsQueue: any[][] = [];
let queryShouldThrow = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    if (queryShouldThrow) throw new Error('db down');
    const rows = nextRowsQueue.shift() ?? [];
    return [rows, {}];
  },
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
  },
} as any;

const ComponentRegistryService = require('../componentRegistryService');

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

// Silence logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function resetPool() {
  poolCalls = [];
  nextRowsQueue = [];
  queryShouldThrow = false;
}

function makeDbRow(overrides: any = {}): any {
  return {
    id: 1,
    name: 'Button',
    file_path: '/abs/src/components/Button.tsx',
    relative_path: 'components/Button.tsx',
    directory: 'components',
    extension: '.tsx',
    category: 'ui',
    props: '["label","onClick"]',
    imports: '["react"]',
    exports: '["Button"]',
    is_default: 1,
    has_jsx: 1,
    has_hooks: 0,
    dependencies: '["clsx"]',
    file_size: 1234,
    lines_of_code: 42,
    complexity_score: 3,
    last_modified: '2026-01-01T00:00:00Z',
    discovery_version: '1.0',
    discovered_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

async function main() {

// ============================================================================
// getAllComponents — empty result
// ============================================================================
console.log('\n── getAllComponents: empty ──────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  const result = await svc.getAllComponents();
  assertEq(result.version, '1.0.0', 'version');
  assertEq(result.components, [], 'empty components');
  assert(typeof result.generatedAt === 'string', 'generatedAt ISO');
  assert(result.generatedBy.includes('Database'), 'generatedBy mentions Database');
  assertEq(poolCalls.length, 1, '1 query made');
  assert(/FROM component_registry/i.test(poolCalls[0].sql), 'queries component_registry');
  assert(/is_active = TRUE/i.test(poolCalls[0].sql), 'filters active');
}

// ============================================================================
// getAllComponents — happy path + JSON parse
// ============================================================================
console.log('\n── getAllComponents: happy path ─────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([
    makeDbRow({ id: 1, name: 'Button', is_default: 1 }),
    makeDbRow({
      id: 2,
      name: 'Modal',
      is_default: 0,
      has_hooks: 1,
      props: null,
      imports: null,
      exports: null,
      dependencies: null,
    }),
  ]);
  const result = await svc.getAllComponents();
  assertEq(result.components.length, 2, '2 components');
  assertEq(result.components[0].name, 'Button', 'first name');
  assertEq(result.components[0].props, ['label', 'onClick'], 'props parsed');
  assertEq(result.components[0].imports, ['react'], 'imports parsed');
  assertEq(result.components[0].dependencies, ['clsx'], 'dependencies parsed');
  assertEq(result.components[0].isDefault, ['export default function Button'], 'isDefault array');
  assertEq(result.components[0].hasJSX, 1, 'hasJSX preserved');
  assertEq(result.components[0].size, 1234, 'size from file_size');
  assertEq(result.components[0].lines, 42, 'lines from lines_of_code');
  assertEq(result.components[0].complexity, 3, 'complexity from complexity_score');
  // Null JSON columns default to '[]'
  assertEq(result.components[1].props, [], 'null props → []');
  assertEq(result.components[1].imports, [], 'null imports → []');
  assertEq(result.components[1].exports, [], 'null exports → []');
  assertEq(result.components[1].dependencies, [], 'null dependencies → []');
  assertEq(result.components[1].isDefault, [], 'is_default=0 → empty array');
}

// ============================================================================
// getAllComponents — cache hit
// ============================================================================
console.log('\n── getAllComponents: cache ──────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([makeDbRow({ name: 'A' })]);
  const r1 = await svc.getAllComponents();
  assertEq(poolCalls.length, 1, '1 query on first call');

  // Second call → cached
  const r2 = await svc.getAllComponents();
  assertEq(poolCalls.length, 1, 'no new query on cache hit');
  assert(r1 === r2, 'same cached object');

  // Expire cache
  const cached = (svc as any).cache.get('all_components');
  cached.timestamp = Date.now() - (11 * 60 * 1000); // 11 min ago
  nextRowsQueue.push([makeDbRow({ name: 'B' })]);
  const r3 = await svc.getAllComponents();
  assertEq(poolCalls.length, 2, 'new query after expiry');
  assertEq(r3.components[0].name, 'B', 'fresh result after expiry');
}

// ============================================================================
// getAllComponents — error → fallback
// ============================================================================
console.log('\n── getAllComponents: error → fallback ───────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  queryShouldThrow = true;
  quiet();
  const result = await svc.getAllComponents();
  loud();
  assertEq(result.components, [], 'fallback components empty');
  assert(result.generatedBy.includes('Fallback'), 'generatedBy mentions Fallback');
  assertEq(result.version, '1.0.0', 'fallback version');
  assertEq(result.discoveryTime, 0, 'fallback discoveryTime 0');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ───────────────────────────────────');

{
  const svc = new ComponentRegistryService();

  // Not found
  resetPool();
  nextRowsQueue.push([]);
  const notFound = await svc.getComponentByName('Missing');
  assertEq(notFound, null, 'not found → null');
  assertEq(poolCalls[0].params, ['Missing'], 'param passed');
  assert(/WHERE name = \?/i.test(poolCalls[0].sql), 'uses WHERE name = ?');

  // Found
  resetPool();
  nextRowsQueue.push([makeDbRow({ name: 'Card', is_default: 0, has_hooks: 1 })]);
  const found = await svc.getComponentByName('Card');
  assertEq(found.name, 'Card', 'name');
  assertEq(found.props, ['label', 'onClick'], 'props parsed');
  assertEq(found.isDefault, 0, 'isDefault raw (not array here)');
  assertEq(found.hasHooks, 1, 'hasHooks');

  // Error → null
  resetPool();
  queryShouldThrow = true;
  quiet();
  const errResult = await svc.getComponentByName('Boom');
  loud();
  assertEq(errResult, null, 'error → null');
}

// ============================================================================
// searchComponents — no filters
// ============================================================================
console.log('\n── searchComponents: no filters ─────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([makeDbRow({ name: 'X' }), makeDbRow({ name: 'Y' })]);
  const result = await svc.searchComponents({});
  assertEq(result.length, 2, '2 components');
  assertEq(result[0].name, 'X', 'first');
  assertEq(result[0].props, ['label', 'onClick'], 'props parsed');
  assertEq(poolCalls[0].params, [], 'no params with no filters');
  assert(/LIMIT 100/i.test(poolCalls[0].sql), 'default limit 100');
  assert(/is_active = TRUE/i.test(poolCalls[0].sql), 'is_active filter');
  assert(/ORDER BY name/i.test(poolCalls[0].sql), 'order by name');
}

// ============================================================================
// searchComponents — category filter
// ============================================================================
console.log('\n── searchComponents: category ───────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  await svc.searchComponents({ category: 'ui' });
  assertEq(poolCalls[0].params, ['ui'], 'category param');
  assert(/AND category = \?/i.test(poolCalls[0].sql), 'category SQL');
}

// ============================================================================
// searchComponents — hasJSX / hasHooks filters
// ============================================================================
console.log('\n── searchComponents: hasJSX/hasHooks ────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  await svc.searchComponents({ hasJSX: true, hasHooks: false });
  assertEq(poolCalls[0].params, [true, false], 'jsx/hooks params');
  assert(/AND has_jsx = \?/i.test(poolCalls[0].sql), 'has_jsx SQL');
  assert(/AND has_hooks = \?/i.test(poolCalls[0].sql), 'has_hooks SQL');
}

// ============================================================================
// searchComponents — directory LIKE
// ============================================================================
console.log('\n── searchComponents: directory ──────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  await svc.searchComponents({ directory: 'src/pages' });
  assertEq(poolCalls[0].params, ['%src/pages%'], 'directory wrapped with %');
  assert(/AND directory LIKE \?/i.test(poolCalls[0].sql), 'directory LIKE SQL');
}

// ============================================================================
// searchComponents — search text
// ============================================================================
console.log('\n── searchComponents: search ─────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  await svc.searchComponents({ search: 'Btn' });
  assertEq(poolCalls[0].params, ['%Btn%', '%Btn%'], 'search wrapped twice');
  assert(/name LIKE \? OR directory LIKE \?/i.test(poolCalls[0].sql), 'search SQL');
}

// ============================================================================
// searchComponents — combined filters
// ============================================================================
console.log('\n── searchComponents: combined ───────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  await svc.searchComponents({
    category: 'ui',
    hasJSX: true,
    directory: 'cmp',
    search: 'Modal',
    limit: 50,
  });
  assertEq(
    poolCalls[0].params,
    ['ui', true, '%cmp%', '%Modal%', '%Modal%'],
    'combined params in order'
  );
  assert(/LIMIT 50/i.test(poolCalls[0].sql), 'custom limit');
}

// ============================================================================
// searchComponents — error → []
// ============================================================================
console.log('\n── searchComponents: error ──────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  queryShouldThrow = true;
  quiet();
  const result = await svc.searchComponents({});
  loud();
  assertEq(result, [], 'error → empty array');
}

// ============================================================================
// getComponentSummary — happy path
// ============================================================================
console.log('\n── getComponentSummary ──────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([{
    total_components: 100,
    total_categories: 5,
    total_directories: 12,
    avg_file_size: 2048.7,
    avg_lines: 85.3,
    jsx_components: 80,
    hook_components: 60,
    last_updated: '2026-04-01T00:00:00Z',
  }]);
  nextRowsQueue.push([
    { category: 'ui', count: 40 },
    { category: 'pages', count: 30 },
    { category: 'forms', count: 20 },
  ]);
  const summary = await svc.getComponentSummary();
  assertEq(summary.total, 100, 'total');
  assertEq(summary.categories.length, 3, '3 categories');
  assertEq(summary.categories[0], { name: 'ui', count: 40 }, 'first category');
  assertEq(summary.statistics.totalDirectories, 12, 'totalDirectories');
  assertEq(summary.statistics.averageFileSize, 2049, 'averageFileSize rounded');
  assertEq(summary.statistics.averageLines, 85, 'averageLines rounded');
  assertEq(summary.statistics.jsxComponents, 80, 'jsxComponents');
  assertEq(summary.statistics.hookComponents, 60, 'hookComponents');
  assertEq(summary.statistics.lastUpdated, '2026-04-01T00:00:00Z', 'lastUpdated');
  assertEq(poolCalls.length, 2, '2 queries');
}

// getComponentSummary — null avgs → 0
{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([{
    total_components: 0,
    total_categories: 0,
    total_directories: 0,
    avg_file_size: null,
    avg_lines: null,
    jsx_components: 0,
    hook_components: 0,
    last_updated: null,
  }]);
  nextRowsQueue.push([]);
  const summary = await svc.getComponentSummary();
  assertEq(summary.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(summary.statistics.averageLines, 0, 'null avg → 0');
  assertEq(summary.categories, [], 'empty categories');
}

// getComponentSummary — error → zero shape
{
  const svc = new ComponentRegistryService();
  resetPool();
  queryShouldThrow = true;
  quiet();
  const summary = await svc.getComponentSummary();
  loud();
  assertEq(summary.total, 0, 'error total 0');
  assertEq(summary.categories, [], 'error categories empty');
  assertEq(summary.statistics, {}, 'error statistics empty');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ──────────────────────────────────────');

// Single field
{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  quiet();
  await svc.updateComponent('Button', { category: 'primary-ui' });
  loud();
  assertEq(poolCalls.length, 1, '1 query');
  assert(/UPDATE component_registry/i.test(poolCalls[0].sql), 'UPDATE SQL');
  assert(/category = \?/i.test(poolCalls[0].sql), 'sets category');
  assert(/updated_at = CURRENT_TIMESTAMP/i.test(poolCalls[0].sql), 'sets updated_at');
  assert(/WHERE name = \?/i.test(poolCalls[0].sql), 'WHERE name');
  assertEq(poolCalls[0].params, ['primary-ui', 'Button'], 'params [value, name]');
}

// Multi-field
{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([]);
  quiet();
  await svc.updateComponent('Modal', {
    category: 'overlay',
    file_size: 4096,
    lines_of_code: 150,
    complexity_score: 8,
  });
  loud();
  assert(/category = \?/i.test(poolCalls[0].sql), 'category set');
  assert(/file_size = \?/i.test(poolCalls[0].sql), 'file_size set');
  assert(/lines_of_code = \?/i.test(poolCalls[0].sql), 'lines_of_code set');
  assert(/complexity_score = \?/i.test(poolCalls[0].sql), 'complexity set');
  assertEq(poolCalls[0].params, ['overlay', 4096, 150, 8, 'Modal'], 'all 4 + name');
}

// No fields → no-op (no query)
{
  const svc = new ComponentRegistryService();
  resetPool();
  await svc.updateComponent('Empty', {});
  assertEq(poolCalls.length, 0, 'no query when no fields');
}

// Clears cache on success
{
  const svc = new ComponentRegistryService();
  resetPool();
  nextRowsQueue.push([makeDbRow({ name: 'Card' })]);
  await svc.getAllComponents();
  assertEq((svc as any).cache.size, 1, 'cache populated');
  nextRowsQueue.push([]);
  quiet();
  await svc.updateComponent('Card', { category: 'info' });
  loud();
  assertEq((svc as any).cache.size, 0, 'cache cleared after update');
}

// Error re-thrown
{
  const svc = new ComponentRegistryService();
  resetPool();
  queryShouldThrow = true;
  quiet();
  let thrown = false;
  try {
    await svc.updateComponent('X', { category: 'test' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('db down'), 'original error propagated');
  }
  loud();
  assert(thrown, 'updateComponent re-throws on db error');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ───────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  (svc as any).cache.set('a', { data: 1, timestamp: Date.now() });
  (svc as any).cache.set('b', { data: 2, timestamp: Date.now() });
  assertEq((svc as any).cache.size, 2, 'seeded 2 entries');
  quiet();
  svc.clearCache();
  loud();
  assertEq((svc as any).cache.size, 0, 'cache empty after clearCache');
}

// ============================================================================
// getFallbackComponents (exercised indirectly, verify shape directly)
// ============================================================================
console.log('\n── getFallbackComponents ────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  const fb = svc.getFallbackComponents();
  assertEq(fb.version, '1.0.0', 'version');
  assertEq(fb.components, [], 'empty components');
  assertEq(fb.discoveryTime, 0, 'discoveryTime 0');
  assert(fb.generatedBy.includes('Fallback'), 'generatedBy mentions Fallback');
  assert(typeof fb.generatedAt === 'string', 'generatedAt ISO');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
