#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1177)
 *
 * Reads `component_registry` via getAppPool() from config/db-compat.
 * We stub db-compat via require.cache with a route-dispatch fake pool
 * BEFORE requiring the SUT.
 *
 * Coverage:
 *   - constructor: Map cache, 10-min timeout
 *   - getAllComponents: happy path (maps DB row → result shape, parses
 *     JSON props/imports/exports/dependencies, builds isDefault array),
 *     caching (second call reuses), cache expiry, error → fallback
 *   - getComponentByName: happy path, not found → null, error → null
 *   - searchComponents: no filters, category, hasJSX, hasHooks, directory
 *     LIKE, search LIKE (double), combined, limit default 100 vs custom,
 *     error → []
 *   - getComponentSummary: happy path (stats + categories joined), no data
 *     → zeros, rounds avg_file_size / avg_lines, null avg handled,
 *     error → default shape {total:0, categories:[], statistics:{}}
 *   - updateComponent: each whitelisted field, ignores unknown keys,
 *     multi-field update, no-op when no fields, clearCache on update,
 *     error re-throws
 *   - clearCache: Map cleared
 *   - getFallbackComponents: shape with empty components array
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

// ── Fake pool with SQL-regex dispatch ───────────────────────────────
type Call = { sql: string; params: any[] };
const queryLog: Call[] = [];

type Rule = { pattern: RegExp; result: any[] | (() => any[]); throws?: boolean };
let rules: Rule[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const rule of rules) {
      if (rule.pattern.test(sql)) {
        if (rule.throws) throw new Error('fake db failure');
        return typeof rule.result === 'function' ? rule.result() : rule.result;
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
const dbCompatModule = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: dbCompatStub,
} as any;
require.cache[dbCompatPath] = dbCompatModule;
const dbCompatJsPath = dbCompatPath.replace(/\.ts$/, '.js');
if (dbCompatJsPath !== dbCompatPath) require.cache[dbCompatJsPath] = dbCompatModule;
const dbCompatTsPath = dbCompatPath.replace(/\.js$/, '.ts');
if (dbCompatTsPath !== dbCompatPath) require.cache[dbCompatTsPath] = dbCompatModule;

function resetState() {
  queryLog.length = 0;
  rules = [];
}

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const ComponentRegistryService = require('../componentRegistryService');

// Fixture: canonical DB row
function makeRow(overrides: any = {}) {
  return {
    id: 1,
    name: 'Button',
    file_path: '/src/Button.tsx',
    relative_path: 'src/Button.tsx',
    directory: 'src',
    extension: '.tsx',
    category: 'ui',
    props: JSON.stringify(['label', 'onClick']),
    imports: JSON.stringify(['react']),
    exports: JSON.stringify(['Button']),
    is_default: 1,
    has_jsx: 1,
    has_hooks: 0,
    dependencies: JSON.stringify(['react']),
    file_size: 1024,
    lines_of_code: 50,
    complexity_score: 3,
    last_modified: '2026-04-01',
    discovery_version: '1.0',
    discovered_at: '2026-04-01',
    updated_at: '2026-04-02',
    ...overrides,
  };
}

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  assert(svc.cache instanceof Map, 'cache is Map');
  assertEq(svc.cache.size, 0, 'cache empty');
  assertEq(svc.cacheTimeout, 10 * 60 * 1000, 'cacheTimeout = 10 min');
}

// ============================================================================
// getAllComponents — happy path
// ============================================================================
console.log('\n── getAllComponents: happy path ──────────────────────────');

resetState();
rules = [
  {
    pattern: /FROM component_registry[\s\S]*WHERE is_active = TRUE[\s\S]*ORDER BY name/i,
    result: [[
      makeRow({ name: 'Button' }),
      makeRow({ id: 2, name: 'Modal', is_default: 0, category: 'ui', has_hooks: 1 }),
    ]],
  },
];
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(r.components.length, 2, '2 components');
  const btn = r.components[0];
  assertEq(btn.name, 'Button', 'name');
  assertEq(btn.filePath, '/src/Button.tsx', 'filePath');
  assertEq(btn.relativePath, 'src/Button.tsx', 'relativePath');
  assertEq(btn.props, ['label', 'onClick'], 'props parsed');
  assertEq(btn.imports, ['react'], 'imports parsed');
  assertEq(btn.exports, ['Button'], 'exports parsed');
  assertEq(btn.dependencies, ['react'], 'dependencies parsed');
  assertEq(btn.isDefault, ['export default function Button'], 'isDefault array when is_default=1');
  assertEq(btn.size, 1024, 'size');
  assertEq(btn.lines, 50, 'lines');
  assertEq(btn.complexity, 3, 'complexity');
  // is_default=0 case
  assertEq(r.components[1].isDefault, [], 'isDefault empty when is_default=0');
}

// ============================================================================
// getAllComponents — caching
// ============================================================================
console.log('\n── getAllComponents: caching ─────────────────────────────');

resetState();
let qCount = 0;
rules = [
  {
    pattern: /FROM component_registry/i,
    result: () => { qCount++; return [[makeRow()]]; },
  },
];
{
  const svc = new ComponentRegistryService();
  await svc.getAllComponents();
  await svc.getAllComponents();
  await svc.getAllComponents();
  assertEq(qCount, 1, 'cached — only 1 query');

  // Expire cache
  const entry = svc.cache.get('all_components');
  entry.timestamp = Date.now() - (11 * 60 * 1000);
  await svc.getAllComponents();
  assertEq(qCount, 2, 'expired cache re-queries');

  quiet();
  svc.clearCache();
  loud();
  await svc.getAllComponents();
  assertEq(qCount, 3, 'clearCache forces re-query');
}

// ============================================================================
// getAllComponents — error → fallback
// ============================================================================
console.log('\n── getAllComponents: error fallback ──────────────────────');

resetState();
rules = [{ pattern: /FROM component_registry/i, result: [], throws: true }];
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getAllComponents();
  loud();
  assertEq(r.components, [], 'fallback empty');
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback metadata');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

// Happy path
resetState();
rules = [{
  pattern: /FROM component_registry[\s\S]*WHERE name = \?/i,
  result: [[makeRow({ name: 'Button' })]],
}];
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('Button');
  assertEq(r.name, 'Button', 'name');
  assertEq(r.filePath, '/src/Button.tsx', 'filePath');
  assertEq(r.props, ['label', 'onClick'], 'props parsed');
  assertEq(r.isDefault, 1, 'isDefault raw (not array here)');
  assertEq(queryLog[0].params[0], 'Button', 'name param');
}

// Not found → null
resetState();
rules = [{
  pattern: /FROM component_registry[\s\S]*WHERE name = \?/i,
  result: [[]],
}];
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('NoSuch');
  assertEq(r, null, 'not found → null');
}

// Error → null
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [], throws: true }];
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentByName('Button');
  loud();
  assertEq(r, null, 'error → null');
}

// ============================================================================
// searchComponents
// ============================================================================
console.log('\n── searchComponents ──────────────────────────────────────');

// No filters → default limit 100
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[makeRow()]] }];
{
  const svc = new ComponentRegistryService();
  const r = await svc.searchComponents();
  assertEq(r.length, 1, '1 result');
  assert(/LIMIT 100/i.test(queryLog[0].sql), 'default limit 100');
  assertEq(queryLog[0].params, [], 'no params');
  assertEq(r[0].name, 'Button', 'mapped name');
  assertEq(r[0].filePath, '/src/Button.tsx', 'mapped filePath');
}

// Category filter
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[makeRow()]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ category: 'ui' });
  assert(/AND category = \?/i.test(queryLog[0].sql), 'category clause');
  assertEq(queryLog[0].params[0], 'ui', 'category param');
}

// hasJSX filter (false too, not undefined)
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasJSX: false });
  assert(/AND has_jsx = \?/i.test(queryLog[0].sql), 'hasJSX clause');
  assertEq(queryLog[0].params[0], false, 'hasJSX false param');
}

// hasHooks filter
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ hasHooks: true });
  assert(/AND has_hooks = \?/i.test(queryLog[0].sql), 'hasHooks clause');
  assertEq(queryLog[0].params[0], true, 'hasHooks true param');
}

// directory LIKE
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ directory: 'features' });
  assert(/AND directory LIKE \?/i.test(queryLog[0].sql), 'directory LIKE');
  assertEq(queryLog[0].params[0], '%features%', 'directory % wrapped');
}

// search filter (double LIKE on name + directory)
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ search: 'but' });
  assert(/name LIKE \? OR directory LIKE \?/i.test(queryLog[0].sql), 'double LIKE');
  assertEq(queryLog[0].params[0], '%but%', 'search param 1');
  assertEq(queryLog[0].params[1], '%but%', 'search param 2');
}

// Custom limit
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({ limit: 25 });
  assert(/LIMIT 25/i.test(queryLog[0].sql), 'custom limit');
}

// Combined filters
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [[]] }];
{
  const svc = new ComponentRegistryService();
  await svc.searchComponents({
    category: 'ui',
    hasJSX: true,
    hasHooks: false,
    directory: 'features',
    search: 'modal',
    limit: 10,
  });
  assertEq(queryLog[0].params, ['ui', true, false, '%features%', '%modal%', '%modal%'], 'params in order');
  assert(/LIMIT 10/i.test(queryLog[0].sql), 'custom limit in combined');
}

// Error → []
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [], throws: true }];
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.searchComponents({ search: 'x' });
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

// Happy path — two queries (stats + categories)
resetState();
rules = [
  {
    pattern: /COUNT\(\*\) as total_components/i,
    result: [[{
      total_components: 42,
      total_categories: 5,
      total_directories: 12,
      avg_file_size: 2048.7,
      avg_lines: 75.3,
      jsx_components: 30,
      hook_components: 20,
      last_updated: '2026-04-05',
    }]],
  },
  {
    pattern: /SELECT category, COUNT\(\*\) as count/i,
    result: [[
      { category: 'ui', count: 20 },
      { category: 'features', count: 15 },
      { category: 'pages', count: 7 },
    ]],
  },
];
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.total, 42, 'total');
  assertEq(r.categories.length, 3, '3 categories');
  assertEq(r.categories[0], { name: 'ui', count: 20 }, 'first category mapped');
  assertEq(r.statistics.totalDirectories, 12, 'totalDirectories');
  assertEq(r.statistics.averageFileSize, 2049, 'avgFileSize rounded');
  assertEq(r.statistics.averageLines, 75, 'avgLines rounded');
  assertEq(r.statistics.jsxComponents, 30, 'jsxComponents');
  assertEq(r.statistics.hookComponents, 20, 'hookComponents');
}

// Null averages → rounded to 0
resetState();
rules = [
  {
    pattern: /COUNT\(\*\) as total_components/i,
    result: [[{
      total_components: 0,
      total_categories: 0,
      total_directories: 0,
      avg_file_size: null,
      avg_lines: null,
      jsx_components: 0,
      hook_components: 0,
      last_updated: null,
    }]],
  },
  { pattern: /SELECT category, COUNT\(\*\) as count/i, result: [[]] },
];
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  assertEq(r.statistics.averageFileSize, 0, 'null avg_file_size → 0');
  assertEq(r.statistics.averageLines, 0, 'null avg_lines → 0');
  assertEq(r.categories, [], 'no categories');
}

// Error → default shape
resetState();
rules = [{ pattern: /FROM component_registry/i, result: [], throws: true }];
quiet();
{
  const svc = new ComponentRegistryService();
  const r = await svc.getComponentSummary();
  loud();
  assertEq(r.total, 0, 'error total 0');
  assertEq(r.categories, [], 'error categories []');
  assertEq(r.statistics, {}, 'error statistics {}');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// Single field: category
resetState();
rules = [{ pattern: /UPDATE component_registry/i, result: [{}] }];
quiet();
{
  const svc = new ComponentRegistryService();
  // Pre-populate cache to verify clearCache on update
  svc.cache.set('all_components', { data: {}, timestamp: Date.now() });
  await svc.updateComponent('Button', { category: 'ui' });
  loud();
  assert(/UPDATE component_registry[\s\S]*SET category = \?/i.test(queryLog[0].sql), 'SET category');
  assert(/updated_at = CURRENT_TIMESTAMP/i.test(queryLog[0].sql), 'updated_at added');
  assert(/WHERE name = \?/i.test(queryLog[0].sql), 'WHERE name');
  assertEq(queryLog[0].params, ['ui', 'Button'], 'params: [category, name]');
  assertEq(svc.cache.size, 0, 'cache cleared after update');
}

// Multi-field
resetState();
rules = [{ pattern: /UPDATE component_registry/i, result: [{}] }];
quiet();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Button', {
    category: 'ui',
    file_size: 2048,
    lines_of_code: 100,
    complexity_score: 5,
  });
  loud();
  assertEq(queryLog[0].params, ['ui', 2048, 100, 5, 'Button'], 'multi-field params');
}

// Unknown fields ignored
resetState();
rules = [{ pattern: /UPDATE component_registry/i, result: [{}] }];
quiet();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Button', { evil: 'injection', name: 'Hack', category: 'safe' });
  loud();
  assertEq(queryLog[0].params, ['safe', 'Button'], 'only category + name from whitelist');
}

// No recognized fields → no query
resetState();
rules = [{ pattern: /UPDATE component_registry/i, result: [{}] }];
quiet();
{
  const svc = new ComponentRegistryService();
  await svc.updateComponent('Button', { evil: 'x' });
  loud();
  assertEq(queryLog.length, 0, 'no query when no valid fields');
}

// Error rethrows
resetState();
rules = [{ pattern: /UPDATE component_registry/i, result: [], throws: true }];
quiet();
{
  const svc = new ComponentRegistryService();
  let caught: any = null;
  try { await svc.updateComponent('Button', { category: 'ui' }); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'error rethrown');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('a', { data: 1, timestamp: Date.now() });
  svc.cache.set('b', { data: 2, timestamp: Date.now() });
  assertEq(svc.cache.size, 2, 'cache populated');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared');
}

// ============================================================================
// getFallbackComponents
// ============================================================================
console.log('\n── getFallbackComponents ─────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  const fb = svc.getFallbackComponents();
  assertEq(fb.version, '1.0.0', 'version');
  assertEq(fb.components, [], 'empty components array');
  assertEq(fb.generatedBy, 'Fallback (database unavailable)', 'generatedBy');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
