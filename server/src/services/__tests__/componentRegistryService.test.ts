#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1156)
 *
 * Dependency: ../config/db-compat (getAppPool + promisePool). Stub
 * provides both via the same fake pool.
 *
 * Coverage:
 *   - getAllComponents: shape, JSON field parsing, is_default → array form,
 *     cache hit, TTL expiry, DB error → fallback
 *   - getComponentByName: found + shape, not found → null, DB error → null
 *   - searchComponents: unfiltered, category/hasJSX/hasHooks/directory/search
 *     filters build SQL + params, custom limit, default limit, DB error → []
 *   - getComponentSummary: totals, categories list, stats rounding, DB error
 *     fallback
 *   - updateComponent: allowlist, no fields → no SQL, params order + trailing
 *     name, cache cleared on update, DB error rethrown
 *   - clearCache
 *   - getFallbackComponents: shape
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

// ── db-compat stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const dbQueries: QueryCall[] = [];
let componentRows: any[] = [];
let summaryStatsRows: any[] = [];
let summaryCategoryRows: any[] = [];
let updateThrows = false;
let getAllThrows = false;
let byNameThrows = false;
let searchThrows = false;
let summaryThrows = false;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    dbQueries.push({ sql, params });
    // updateComponent
    if (/^\s*UPDATE component_registry/i.test(sql)) {
      if (updateThrows) throw new Error('update failed');
      return [{ affectedRows: 1 }];
    }
    // getComponentSummary stats
    if (/COUNT\(\*\) as total_components/i.test(sql)) {
      if (summaryThrows) throw new Error('summary failed');
      return [summaryStatsRows];
    }
    // getComponentSummary categories
    if (/GROUP BY category/i.test(sql)) {
      if (summaryThrows) throw new Error('summary failed');
      return [summaryCategoryRows];
    }
    // getComponentByName
    if (/WHERE name = \? AND is_active/i.test(sql)) {
      if (byNameThrows) throw new Error('byName failed');
      return [componentRows];
    }
    // searchComponents (no ORDER BY name when just is_active alone — actually it has ORDER BY)
    if (/FROM component_registry[\s\S]+WHERE is_active = TRUE[\s\S]+LIMIT/i.test(sql)) {
      if (searchThrows) throw new Error('search failed');
      return [componentRows];
    }
    // getAllComponents (matches all-rows query)
    if (/FROM component_registry[\s\S]+ORDER BY name\s*$/i.test(sql) ||
        /FROM component_registry[\s\S]+WHERE is_active = TRUE[\s\S]+ORDER BY name/i.test(sql)) {
      if (getAllThrows) throw new Error('all failed');
      return [componentRows];
    }
    return [[]];
  },
};

const dbCompatStub = {
  getAppPool: () => fakeAppPool,
  promisePool: fakeAppPool,
};

function installStub(relPath: string, exports: any): void {
  const tsxResolved = require.resolve(relPath);
  const alt = tsxResolved.endsWith('.ts')
    ? tsxResolved.replace(/\.ts$/, '.js')
    : tsxResolved.replace(/\.js$/, '.ts');
  for (const p of [tsxResolved, alt]) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  }
}

installStub('../../config/db-compat', dbCompatStub);

function resetState() {
  dbQueries.length = 0;
  componentRows = [];
  summaryStatsRows = [];
  summaryCategoryRows = [];
  updateThrows = false;
  getAllThrows = false;
  byNameThrows = false;
  searchThrows = false;
  summaryThrows = false;
}

// Silence logs
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
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [
    {
      id: 1, name: 'Button', file_path: '/a/Button.tsx', relative_path: 'Button.tsx',
      directory: 'ui', extension: '.tsx', category: 'ui',
      props: JSON.stringify(['label', 'onClick']),
      imports: JSON.stringify(['React']),
      exports: JSON.stringify(['Button']),
      is_default: 1, has_jsx: 1, has_hooks: 0,
      dependencies: JSON.stringify(['react']),
      file_size: 500, lines_of_code: 25, complexity_score: 3,
      last_modified: '2026-01-01', discovery_version: 1,
      discovered_at: '2026-01-01', updated_at: '2026-04-01',
    },
    {
      id: 2, name: 'Card', file_path: '/a/Card.tsx', relative_path: 'Card.tsx',
      directory: 'ui', extension: '.tsx', category: 'ui',
      props: null, imports: null, exports: null, is_default: 0,
      has_jsx: 1, has_hooks: 1, dependencies: null,
      file_size: 200, lines_of_code: 10, complexity_score: 1,
      last_modified: null, discovery_version: 1,
      discovered_at: null, updated_at: null,
    },
  ];
  const r = await svc.getAllComponents();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(r.components.length, 2, '2 components');
  assertEq(r.components[0].name, 'Button', 'first name');
  assertEq(r.components[0].props, ['label', 'onClick'], 'props parsed');
  assertEq(r.components[0].isDefault, ['export default function Button'], 'isDefault array form');
  assertEq(r.components[1].isDefault, [], 'non-default → empty array');
  assertEq(r.components[1].props, [], 'null props → []');
  assertEq(r.components[1].dependencies, [], 'null deps → []');
}

// Cache hit
{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [];
  await svc.getAllComponents();
  const first = dbQueries.length;
  await svc.getAllComponents();
  assertEq(dbQueries.length, first, 'cached: no new query');
}

// TTL expiry
{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [];
  await svc.getAllComponents();
  const first = dbQueries.length;
  const entry = svc.cache.get('all_components');
  entry.timestamp = Date.now() - (20 * 60 * 1000);
  await svc.getAllComponents();
  assert(dbQueries.length > first, 'expired → re-fetched');
}

// Error fallback
{
  const svc = new ComponentRegistryService();
  resetState();
  getAllThrows = true;
  quiet();
  const r = await svc.getAllComponents();
  loud();
  assertEq(r.version, '1.0.0', 'fallback version');
  assertEq(r.components, [], 'fallback empty');
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback generatedBy');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [{
    id: 1, name: 'Button', file_path: '/a', relative_path: 'a',
    directory: 'ui', extension: '.tsx', category: 'ui',
    props: JSON.stringify(['x']), imports: JSON.stringify([]),
    exports: JSON.stringify([]), is_default: 1, has_jsx: 1, has_hooks: 0,
    dependencies: JSON.stringify(['react']),
    file_size: 100, lines_of_code: 10, complexity_score: 2,
    last_modified: null, discovery_version: 1,
    discovered_at: null, updated_at: null,
  }];
  const r = await svc.getComponentByName('Button');
  assert(r !== null, 'found');
  assertEq(r.name, 'Button', 'name');
  assertEq(r.props, ['x'], 'props parsed');
  assertEq(r.isDefault, 1, 'isDefault raw value');
  assertEq(dbQueries[0].params, ['Button'], 'param passed');
}

// Not found
{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [];
  const r = await svc.getComponentByName('Missing');
  assertEq(r, null, 'null on not found');
}

// DB error → null
{
  const svc = new ComponentRegistryService();
  resetState();
  byNameThrows = true;
  quiet();
  const r = await svc.getComponentByName('X');
  loud();
  assertEq(r, null, 'error → null');
}

// ============================================================================
// searchComponents
// ============================================================================
console.log('\n── searchComponents ──────────────────────────────────────');

// No filters
{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [];
  await svc.searchComponents();
  const q = dbQueries[0];
  assertEq(q.params, [], 'no params');
  assert(/LIMIT 100/.test(q.sql), 'default limit 100');
}

// All filters
{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [];
  await svc.searchComponents({
    category: 'ui',
    hasJSX: true,
    hasHooks: false,
    directory: 'admin',
    search: 'btn',
    limit: 50,
  });
  const q = dbQueries[0];
  assert(/category = \?/.test(q.sql), 'category clause');
  assert(/has_jsx = \?/.test(q.sql), 'has_jsx clause');
  assert(/has_hooks = \?/.test(q.sql), 'has_hooks clause');
  assert(/directory LIKE \?/.test(q.sql), 'directory LIKE');
  assert(/name LIKE \? OR directory LIKE \?/.test(q.sql), 'search OR');
  assert(/LIMIT 50/.test(q.sql), 'custom limit');
  assertEq(q.params, ['ui', true, false, '%admin%', '%btn%', '%btn%'], 'params order');
}

// Result shape
{
  const svc = new ComponentRegistryService();
  resetState();
  componentRows = [{
    id: 1, name: 'X', file_path: '', relative_path: '',
    directory: '', extension: '', category: '',
    props: null, imports: null, exports: null, is_default: 0,
    has_jsx: 1, has_hooks: 0, dependencies: null,
    file_size: 10, lines_of_code: 5, complexity_score: 1,
  }];
  const r = await svc.searchComponents({ category: 'x' });
  assertEq(r.length, 1, 'one result');
  assertEq(r[0].props, [], 'null props → []');
  assertEq(r[0].dependencies, [], 'null deps → []');
}

// Error → []
{
  const svc = new ComponentRegistryService();
  resetState();
  searchThrows = true;
  quiet();
  const r = await svc.searchComponents({ category: 'x' });
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  resetState();
  summaryStatsRows = [{
    total_components: 42,
    total_categories: 5,
    total_directories: 12,
    avg_file_size: 456.7,
    avg_lines: 23.8,
    jsx_components: 38,
    hook_components: 20,
    last_updated: '2026-04-01',
  }];
  summaryCategoryRows = [
    { category: 'ui', count: 20 },
    { category: 'form', count: 10 },
  ];
  const r = await svc.getComponentSummary();
  assertEq(r.total, 42, 'total');
  assertEq(r.categories.length, 2, '2 categories');
  assertEq(r.categories[0], { name: 'ui', count: 20 }, 'first category');
  assertEq(r.statistics.totalDirectories, 12, 'directories');
  assertEq(r.statistics.averageFileSize, 457, 'rounded file size');
  assertEq(r.statistics.averageLines, 24, 'rounded lines');
  assertEq(r.statistics.jsxComponents, 38, 'jsx count');
  assertEq(r.statistics.hookComponents, 20, 'hook count');
}

// Null averages → 0
{
  const svc = new ComponentRegistryService();
  resetState();
  summaryStatsRows = [{
    total_components: 0, total_categories: 0, total_directories: 0,
    avg_file_size: null, avg_lines: null, jsx_components: 0,
    hook_components: 0, last_updated: null,
  }];
  summaryCategoryRows = [];
  const r = await svc.getComponentSummary();
  assertEq(r.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(r.statistics.averageLines, 0, 'null lines → 0');
}

// Error fallback
{
  const svc = new ComponentRegistryService();
  resetState();
  summaryThrows = true;
  quiet();
  const r = await svc.getComponentSummary();
  loud();
  assertEq(r.total, 0, 'error total=0');
  assertEq(r.categories, [], 'empty categories');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// No allowed fields → no UPDATE
{
  const svc = new ComponentRegistryService();
  resetState();
  quiet();
  await svc.updateComponent('Button', { bogus: 'x' } as any);
  loud();
  const upd = dbQueries.find(q => /UPDATE component_registry/i.test(q.sql));
  assert(upd === undefined, 'no UPDATE when no allowed fields');
}

// All fields — verify params order
{
  const svc = new ComponentRegistryService();
  resetState();
  // Seed cache to verify it is cleared
  svc.cache.set('all_components', { data: {}, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'cache seeded');
  quiet();
  await svc.updateComponent('Button', {
    category: 'ui',
    file_size: 500,
    lines_of_code: 25,
    complexity_score: 5,
  });
  loud();
  const upd = dbQueries.find(q => /UPDATE component_registry/i.test(q.sql));
  assert(upd !== undefined, 'UPDATE executed');
  const sql = upd!.sql;
  assert(/category = \?/.test(sql), 'category');
  assert(/file_size = \?/.test(sql), 'file_size');
  assert(/lines_of_code = \?/.test(sql), 'lines_of_code');
  assert(/complexity_score = \?/.test(sql), 'complexity_score');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(sql), 'updated_at literal');
  assertEq(upd!.params, ['ui', 500, 25, 5, 'Button'], 'params order + trailing name');
  // Cache cleared
  assertEq(svc.cache.size, 0, 'cache cleared after update');
}

// Error rethrown
{
  const svc = new ComponentRegistryService();
  resetState();
  updateThrows = true;
  quiet();
  let caught: Error | null = null;
  try { await svc.updateComponent('x', { category: 'y' }); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'error rethrown');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('x', { data: 1, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'has entry');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cleared');
}

// ============================================================================
// getFallbackComponents
// ============================================================================
console.log('\n── getFallbackComponents ─────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  const r = svc.getFallbackComponents();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(r.components, [], 'empty components');
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'generatedBy');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
