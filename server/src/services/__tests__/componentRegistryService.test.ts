#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1206)
 *
 * Class-based component registry backed by a MySQL table `component_registry`.
 * External dep: `../config/db-compat` which exposes { getAppPool, promisePool }.
 *
 * Stub strategy: replace db-compat in require.cache BEFORE loading the SUT,
 * with a fake pool that dispatches based on SQL regex patterns. This lets us
 * drive getAllComponents/getComponentByName/searchComponents/getComponentSummary
 * /updateComponent through the same fake pool and record every call.
 *
 * Coverage:
 *   - Constructor: empty cache Map, 10-minute cacheTimeout
 *   - getAllComponents:
 *       · happy path — builds result with version/generatedAt/components
 *       · JSON parsing of props/imports/exports/dependencies (incl. null default '[]')
 *       · is_default → isDefault array shape
 *       · cache hit on second call within timeout (no second query)
 *       · cache miss after timeout — re-queries
 *       · DB error → returns fallback structure
 *   - getComponentByName:
 *       · found — returns shaped object
 *       · not found — returns null
 *       · DB error → returns null (swallowed)
 *       · JSON parsing of null-string columns
 *   - searchComponents:
 *       · no filters — emits base query + default LIMIT 100
 *       · category filter
 *       · hasJSX filter (including false)
 *       · hasHooks filter
 *       · directory filter (LIKE wrapping)
 *       · search filter (name OR directory LIKE)
 *       · multi-filter composition
 *       · custom limit
 *       · DB error → returns []
 *   - getComponentSummary:
 *       · shape: total / categories[] / statistics{}
 *       · Math.round of null avg_file_size / avg_lines
 *       · DB error → returns zero shape
 *   - updateComponent:
 *       · updates subset of whitelisted fields
 *       · ignores non-whitelisted fields
 *       · adds updated_at CURRENT_TIMESTAMP
 *       · clears cache on successful update
 *       · no-op when update payload has no whitelisted fields
 *       · DB error → rethrows
 *   - clearCache: empties the Map
 *   - getFallbackComponents: shape check
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

// ── Fake pool with regex dispatch ───────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];
let throwNextQuery: boolean = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (throwNextQuery) {
      throwNextQuery = false;
      throw new Error('fake db error');
    }
    for (const r of responders) {
      if (r.match.test(sql)) {
        return [r.respond(params)];
      }
    }
    return [[]];
  },
};

function resetState() {
  queryLog.length = 0;
  responders = [];
  throwNextQuery = false;
}

// ── Stub db-compat via require.cache ────────────────────────────────
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

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// ── Sample row factory ──────────────────────────────────────────────
function sampleRow(overrides: any = {}) {
  return {
    id: 1,
    name: 'Button',
    file_path: '/abs/src/Button.tsx',
    relative_path: 'src/Button.tsx',
    directory: 'src/components',
    extension: '.tsx',
    category: 'ui',
    props: '[{"name":"label"}]',
    imports: '["react"]',
    exports: '["Button"]',
    is_default: 1,
    has_jsx: 1,
    has_hooks: 0,
    dependencies: '["clsx"]',
    file_size: 2048,
    lines_of_code: 80,
    complexity_score: 3,
    last_modified: '2026-04-10T00:00:00.000Z',
    discovery_version: '1.0.0',
    discovered_at: '2026-04-10T00:00:00.000Z',
    updated_at: '2026-04-10T00:00:00.000Z',
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Constructor
// ============================================================================
console.log('\n── Constructor ───────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  assert(svc.cache instanceof Map, 'cache is a Map');
  assertEq(svc.cache.size, 0, 'cache empty');
  assertEq(svc.cacheTimeout, 10 * 60 * 1000, 'cacheTimeout 10 min');
}

// ============================================================================
// getAllComponents — happy path + JSON parsing
// ============================================================================
console.log('\n── getAllComponents: happy path ──────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow()] },
  ];
  const svc = new ComponentRegistryService();
  const result = await svc.getAllComponents();

  assertEq(result.version, '1.0.0', 'version');
  assertEq(result.generatedBy, 'OrthodoxMetrics Component Discovery System (Database)', 'generatedBy');
  assertEq(result.discoveryTime, 0, 'discoveryTime');
  assert(typeof result.generatedAt === 'string', 'generatedAt is string');
  assertEq(result.components.length, 1, '1 component');

  const c = result.components[0];
  assertEq(c.id, 1, 'id');
  assertEq(c.name, 'Button', 'name');
  assertEq(c.filePath, '/abs/src/Button.tsx', 'filePath mapped from file_path');
  assertEq(c.relativePath, 'src/Button.tsx', 'relativePath');
  assertEq(c.directory, 'src/components', 'directory');
  assertEq(c.extension, '.tsx', 'extension');
  assertEq(c.category, 'ui', 'category');
  assertEq(c.props, [{ name: 'label' }], 'props JSON-parsed');
  assertEq(c.imports, ['react'], 'imports JSON-parsed');
  assertEq(c.exports, ['Button'], 'exports JSON-parsed');
  assertEq(c.dependencies, ['clsx'], 'dependencies JSON-parsed');
  assertEq(c.isDefault, ['export default function Button'], 'isDefault array shape when is_default truthy');
  assertEq(c.hasJSX, 1, 'hasJSX');
  assertEq(c.hasHooks, 0, 'hasHooks');
  assertEq(c.size, 2048, 'size from file_size');
  assertEq(c.lines, 80, 'lines from lines_of_code');
  assertEq(c.complexity, 3, 'complexity from complexity_score');
}

// ============================================================================
// getAllComponents — null JSON columns default to '[]'
// ============================================================================
console.log('\n── getAllComponents: null JSON columns ───────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow({
      props: null, imports: null, exports: null, dependencies: null,
    })] },
  ];
  const svc = new ComponentRegistryService();
  const result = await svc.getAllComponents();
  const c = result.components[0];
  assertEq(c.props, [], 'null props → []');
  assertEq(c.imports, [], 'null imports → []');
  assertEq(c.exports, [], 'null exports → []');
  assertEq(c.dependencies, [], 'null dependencies → []');
}

// ============================================================================
// getAllComponents — is_default false → empty isDefault array
// ============================================================================
console.log('\n── getAllComponents: is_default false ────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow({ is_default: 0 })] },
  ];
  const svc = new ComponentRegistryService();
  const result = await svc.getAllComponents();
  assertEq(result.components[0].isDefault, [], 'is_default=0 → []');
}

// ============================================================================
// getAllComponents — cache hit on second call
// ============================================================================
console.log('\n── getAllComponents: cache hit ───────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow()] },
  ];
  const svc = new ComponentRegistryService();
  const r1 = await svc.getAllComponents();
  const callsAfterFirst = queryLog.length;
  const r2 = await svc.getAllComponents();
  assertEq(queryLog.length, callsAfterFirst, 'no additional query on cache hit');
  assert(r1 === r2, 'cache returns same reference');
}

// ============================================================================
// getAllComponents — cache expiry → re-query
// ============================================================================
console.log('\n── getAllComponents: cache expiry ────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow()] },
  ];
  const svc = new ComponentRegistryService();
  await svc.getAllComponents();
  // Force cache to be stale by rewinding timestamp
  const entry = svc.cache.get('all_components');
  entry.timestamp = Date.now() - (11 * 60 * 1000);
  await svc.getAllComponents();
  assertEq(queryLog.length, 2, '2 queries when cache stale');
}

// ============================================================================
// getAllComponents — DB error → fallback shape
// ============================================================================
console.log('\n── getAllComponents: DB error fallback ───────────────────');

{
  resetState();
  throwNextQuery = true;
  const svc = new ComponentRegistryService();
  quiet();
  const result = await svc.getAllComponents();
  loud();
  assertEq(result.version, '1.0.0', 'fallback version');
  assertEq(result.generatedBy, 'Fallback (database unavailable)', 'fallback generatedBy');
  assertEq(result.components, [], 'fallback components empty');
  assertEq(svc.cache.size, 0, 'cache not populated on error');
}

// ============================================================================
// getComponentByName — found
// ============================================================================
console.log('\n── getComponentByName: found ─────────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: (p) => {
      // Verify the name parameter was passed
      return [sampleRow({ name: p[0] })];
    } },
  ];
  const svc = new ComponentRegistryService();
  const comp = await svc.getComponentByName('Header');

  assert(comp !== null, 'returns non-null');
  assertEq(comp!.name, 'Header', 'name passed through');
  assertEq(comp!.filePath, '/abs/src/Button.tsx', 'filePath mapped');
  assertEq(comp!.isDefault, 1, 'isDefault raw (not array) for by-name');
  assertEq(comp!.props, [{ name: 'label' }], 'props parsed');
  assertEq(queryLog.length, 1, '1 query');
  assert(queryLog[0].sql.includes('WHERE name = ?'), 'WHERE name = ? in SQL');
  assertEq(queryLog[0].params, ['Header'], 'params = [name]');
}

// ============================================================================
// getComponentByName — not found → null
// ============================================================================
console.log('\n── getComponentByName: not found ─────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [] },
  ];
  const svc = new ComponentRegistryService();
  const comp = await svc.getComponentByName('Missing');
  assertEq(comp, null, 'null when no rows');
}

// ============================================================================
// getComponentByName — null JSON columns default
// ============================================================================
console.log('\n── getComponentByName: null JSON columns ─────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow({
      props: null, imports: null, exports: null, dependencies: null,
    })] },
  ];
  const svc = new ComponentRegistryService();
  const comp = await svc.getComponentByName('X');
  assertEq(comp!.props, [], 'props default []');
  assertEq(comp!.imports, [], 'imports default []');
  assertEq(comp!.exports, [], 'exports default []');
  assertEq(comp!.dependencies, [], 'dependencies default []');
}

// ============================================================================
// getComponentByName — DB error → null
// ============================================================================
console.log('\n── getComponentByName: DB error ──────────────────────────');

{
  resetState();
  throwNextQuery = true;
  const svc = new ComponentRegistryService();
  quiet();
  const comp = await svc.getComponentByName('X');
  loud();
  assertEq(comp, null, 'error swallowed → null');
}

// ============================================================================
// searchComponents — no filters, default limit
// ============================================================================
console.log('\n── searchComponents: no filters ──────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow()] },
  ];
  const svc = new ComponentRegistryService();
  const rows = await svc.searchComponents();
  assertEq(rows.length, 1, '1 row returned');
  assertEq(rows[0].name, 'Button', 'name mapped');
  assertEq(rows[0].filePath, '/abs/src/Button.tsx', 'filePath mapped');
  assertEq(queryLog[0].params, [], 'no params for empty filters');
  assert(queryLog[0].sql.includes('LIMIT 100'), 'default LIMIT 100');
  assert(queryLog[0].sql.includes('ORDER BY name'), 'ORDER BY name');
  assert(!queryLog[0].sql.includes('AND category'), 'no category clause');
}

// ============================================================================
// searchComponents — category filter
// ============================================================================
console.log('\n── searchComponents: category ────────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM component_registry/i, respond: () => [sampleRow()] },
  ];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ category: 'ui' });
  assert(queryLog[0].sql.includes('AND category = ?'), 'category clause');
  assertEq(queryLog[0].params, ['ui'], 'category param');
}

// ============================================================================
// searchComponents — hasJSX filter (including false)
// ============================================================================
console.log('\n── searchComponents: hasJSX ──────────────────────────────');

{
  resetState();
  responders = [{ match: /FROM component_registry/i, respond: () => [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasJSX: true });
  assert(queryLog[0].sql.includes('AND has_jsx = ?'), 'has_jsx clause (true)');
  assertEq(queryLog[0].params, [true], 'has_jsx=true param');

  resetState();
  responders = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({ hasJSX: false });
  assertEq(queryLog[0].params, [false], 'has_jsx=false param passed');
}

// ============================================================================
// searchComponents — hasHooks filter
// ============================================================================
console.log('\n── searchComponents: hasHooks ────────────────────────────');

{
  resetState();
  responders = [{ match: /FROM component_registry/i, respond: () => [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasHooks: true });
  assert(queryLog[0].sql.includes('AND has_hooks = ?'), 'has_hooks clause');
  assertEq(queryLog[0].params, [true], 'has_hooks param');
}

// ============================================================================
// searchComponents — directory filter (LIKE)
// ============================================================================
console.log('\n── searchComponents: directory ───────────────────────────');

{
  resetState();
  responders = [{ match: /FROM component_registry/i, respond: () => [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ directory: 'admin' });
  assert(queryLog[0].sql.includes('AND directory LIKE ?'), 'directory LIKE clause');
  assertEq(queryLog[0].params, ['%admin%'], 'directory wrapped in %');
}

// ============================================================================
// searchComponents — search filter (name OR directory)
// ============================================================================
console.log('\n── searchComponents: search ──────────────────────────────');

{
  resetState();
  responders = [{ match: /FROM component_registry/i, respond: () => [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ search: 'btn' });
  assert(queryLog[0].sql.includes('AND (name LIKE ? OR directory LIKE ?)'), 'OR search clause');
  assertEq(queryLog[0].params, ['%btn%', '%btn%'], 'search wrapped + duplicated');
}

// ============================================================================
// searchComponents — multi-filter composition
// ============================================================================
console.log('\n── searchComponents: multi-filter ────────────────────────');

{
  resetState();
  responders = [{ match: /FROM component_registry/i, respond: () => [] }];
  const svc = new ComponentRegistryService();
  await svc.searchComponents({
    category: 'ui',
    hasJSX: true,
    hasHooks: false,
    directory: 'src',
    search: 'form',
    limit: 25,
  });
  const sql = queryLog[0].sql;
  assert(sql.includes('AND category = ?'), 'category present');
  assert(sql.includes('AND has_jsx = ?'), 'has_jsx present');
  assert(sql.includes('AND has_hooks = ?'), 'has_hooks present');
  assert(sql.includes('AND directory LIKE ?'), 'directory present');
  assert(sql.includes('AND (name LIKE ? OR directory LIKE ?)'), 'search present');
  assert(sql.includes('LIMIT 25'), 'custom limit applied');
  assertEq(queryLog[0].params, ['ui', true, false, '%src%', '%form%', '%form%'], 'params in order');
}

// ============================================================================
// searchComponents — DB error → []
// ============================================================================
console.log('\n── searchComponents: DB error ────────────────────────────');

{
  resetState();
  throwNextQuery = true;
  const svc = new ComponentRegistryService();
  quiet();
  const rows = await svc.searchComponents({});
  loud();
  assertEq(rows, [], 'error → []');
}

// ============================================================================
// getComponentSummary — happy path with Math.round
// ============================================================================
console.log('\n── getComponentSummary: happy path ───────────────────────');

{
  resetState();
  let queryIdx = 0;
  responders = [
    {
      match: /FROM component_registry/i,
      respond: () => {
        queryIdx++;
        if (queryIdx === 1) {
          // stats query
          return [{
            total_components: 42,
            total_categories: 5,
            total_directories: 8,
            avg_file_size: 2048.7,
            avg_lines: 80.4,
            jsx_components: 30,
            hook_components: 15,
            last_updated: '2026-04-10T00:00:00.000Z',
          }];
        } else {
          // categories query
          return [
            { category: 'ui', count: 20 },
            { category: 'admin', count: 12 },
          ];
        }
      },
    },
  ];
  const svc = new ComponentRegistryService();
  const summary = await svc.getComponentSummary();
  assertEq(summary.total, 42, 'total');
  assertEq(summary.categories.length, 2, '2 categories');
  assertEq(summary.categories[0], { name: 'ui', count: 20 }, 'first category shape');
  assertEq(summary.categories[1], { name: 'admin', count: 12 }, 'second category shape');
  assertEq(summary.statistics.totalDirectories, 8, 'totalDirectories');
  assertEq(summary.statistics.averageFileSize, 2049, 'averageFileSize rounded');
  assertEq(summary.statistics.averageLines, 80, 'averageLines rounded');
  assertEq(summary.statistics.jsxComponents, 30, 'jsxComponents');
  assertEq(summary.statistics.hookComponents, 15, 'hookComponents');
  assertEq(summary.statistics.lastUpdated, '2026-04-10T00:00:00.000Z', 'lastUpdated');
  assertEq(queryLog.length, 2, '2 queries issued');
}

// ============================================================================
// getComponentSummary — null averages default to 0
// ============================================================================
console.log('\n── getComponentSummary: null averages ────────────────────');

{
  resetState();
  let queryIdx = 0;
  responders = [
    {
      match: /FROM component_registry/i,
      respond: () => {
        queryIdx++;
        if (queryIdx === 1) {
          return [{
            total_components: 0,
            total_categories: 0,
            total_directories: 0,
            avg_file_size: null,
            avg_lines: null,
            jsx_components: 0,
            hook_components: 0,
            last_updated: null,
          }];
        } else {
          return [];
        }
      },
    },
  ];
  const svc = new ComponentRegistryService();
  const summary = await svc.getComponentSummary();
  assertEq(summary.statistics.averageFileSize, 0, 'null avg_file_size → 0');
  assertEq(summary.statistics.averageLines, 0, 'null avg_lines → 0');
  assertEq(summary.categories, [], 'empty categories');
}

// ============================================================================
// getComponentSummary — DB error → zero shape
// ============================================================================
console.log('\n── getComponentSummary: DB error ─────────────────────────');

{
  resetState();
  throwNextQuery = true;
  const svc = new ComponentRegistryService();
  quiet();
  const summary = await svc.getComponentSummary();
  loud();
  assertEq(summary.total, 0, 'zero total');
  assertEq(summary.categories, [], 'empty categories');
  assertEq(summary.statistics, {}, 'empty statistics');
}

// ============================================================================
// updateComponent — updates whitelisted fields + cache clear
// ============================================================================
console.log('\n── updateComponent: whitelist + cache ────────────────────');

{
  resetState();
  responders = [
    { match: /^\s*\n*\s*UPDATE component_registry/i, respond: () => ({ affectedRows: 1 }) },
  ];
  const svc = new ComponentRegistryService();
  // Prime the cache so we can verify clearCache
  svc.cache.set('all_components', { data: {}, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'cache primed');

  quiet();
  await svc.updateComponent('Button', {
    category: 'ui',
    file_size: 4096,
    lines_of_code: 120,
    complexity_score: 5,
    bogus: 'ignored',
  });
  loud();

  assertEq(queryLog.length, 1, '1 UPDATE query');
  const sql = queryLog[0].sql;
  assert(/UPDATE component_registry/.test(sql), 'UPDATE table');
  assert(sql.includes('category = ?'), 'category set');
  assert(sql.includes('file_size = ?'), 'file_size set');
  assert(sql.includes('lines_of_code = ?'), 'lines_of_code set');
  assert(sql.includes('complexity_score = ?'), 'complexity_score set');
  assert(sql.includes('updated_at = CURRENT_TIMESTAMP'), 'updated_at set');
  assert(!sql.includes('bogus'), 'non-whitelisted ignored');
  assert(/WHERE name = \?/.test(sql), 'WHERE name = ?');
  // params = [category, file_size, lines_of_code, complexity_score, name]
  assertEq(queryLog[0].params, ['ui', 4096, 120, 5, 'Button'], 'params in order');
  assertEq(svc.cache.size, 0, 'cache cleared on success');
}

// ============================================================================
// updateComponent — subset of fields
// ============================================================================
console.log('\n── updateComponent: subset ───────────────────────────────');

{
  resetState();
  responders = [
    { match: /UPDATE component_registry/i, respond: () => ({ affectedRows: 1 }) },
  ];
  const svc = new ComponentRegistryService();
  quiet();
  await svc.updateComponent('Button', { category: 'admin' });
  loud();
  assertEq(queryLog.length, 1, '1 query');
  // params = [category, name]
  assertEq(queryLog[0].params, ['admin', 'Button'], 'single-field params');
}

// ============================================================================
// updateComponent — no whitelisted fields → no-op
// ============================================================================
console.log('\n── updateComponent: no-op ────────────────────────────────');

{
  resetState();
  const svc = new ComponentRegistryService();
  quiet();
  await svc.updateComponent('Button', { totally_unknown: 'x' });
  loud();
  assertEq(queryLog.length, 0, 'no query when nothing to update');
}

// ============================================================================
// updateComponent — DB error → rethrows
// ============================================================================
console.log('\n── updateComponent: DB error ─────────────────────────────');

{
  resetState();
  throwNextQuery = true;
  const svc = new ComponentRegistryService();
  let caught: Error | null = null;
  quiet();
  try {
    await svc.updateComponent('Button', { category: 'ui' });
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'error rethrown');
  assert(caught !== null && caught.message.includes('fake db error'), 'error preserved');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('a', 1);
  svc.cache.set('b', 2);
  assertEq(svc.cache.size, 2, 'cache primed');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache emptied');
}

// ============================================================================
// getFallbackComponents — shape
// ============================================================================
console.log('\n── getFallbackComponents ─────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  const fb = svc.getFallbackComponents();
  assertEq(fb.version, '1.0.0', 'version');
  assertEq(fb.generatedBy, 'Fallback (database unavailable)', 'generatedBy');
  assertEq(fb.discoveryTime, 0, 'discoveryTime');
  assertEq(fb.components, [], 'empty components');
  assert(typeof fb.generatedAt === 'string', 'generatedAt is ISO string');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
