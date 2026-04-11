#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1231)
 *
 * DB-backed registry for auto-discovered React components. Exposes a class
 * (NOT a singleton) with caching (10-minute TTL) on getAllComponents and
 * fallback behavior on DB errors.
 *
 * External dep stubbed via require.cache:
 *   - ../config/db-compat → getAppPool + promisePool
 *
 * Coverage:
 *   - getAllComponents:
 *       · DB rows parsed, JSON fields decoded, result structure matches
 *       · isDefault=true → synthesized export line; isDefault=false → empty []
 *       · Second call hits cache (no new query)
 *       · clearCache → next call re-queries
 *       · DB error → fallback
 *   - getComponentByName:
 *       · no row → null
 *       · happy path: all fields mapped, JSON parsed
 *       · error → null
 *   - searchComponents:
 *       · no filters → base query, default limit
 *       · category / hasJSX / hasHooks / directory / search / limit all bind correctly
 *       · multiple filters combine
 *       · rows mapped
 *       · DB error → []
 *   - getComponentSummary:
 *       · stats + categories mapped
 *       · null avg values → 0 (rounded)
 *       · error → zero summary
 *   - updateComponent:
 *       · no update fields → no SQL emitted
 *       · category/file_size/lines_of_code/complexity_score all bind with updated_at
 *       · name always bound last
 *       · clears cache after update
 *       · error re-thrown
 *   - clearCache: empties map
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
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return [r.respond(params)];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool, promisePool: fakePool };

const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db-compat' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

function resetState() {
  queryLog.length = 0;
  responders = [];
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const ComponentRegistryService = require('../componentRegistryService');

function makeRow(overrides: any = {}): any {
  return {
    id: 1,
    name: 'Button',
    file_path: '/abs/Button.tsx',
    relative_path: 'src/Button.tsx',
    directory: 'src',
    extension: '.tsx',
    category: 'ui',
    props: JSON.stringify(['label', 'onClick']),
    imports: JSON.stringify(['react']),
    exports: JSON.stringify(['default']),
    is_default: 1,
    has_jsx: 1,
    has_hooks: 0,
    dependencies: JSON.stringify(['react']),
    file_size: 1024,
    lines_of_code: 45,
    complexity_score: 3,
    last_modified: '2026-01-01T00:00:00Z',
    discovery_version: '1',
    discovered_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

async function main() {

// ============================================================================
// getAllComponents: rows parsed + structure
// ============================================================================
console.log('\n── getAllComponents ──────────────────────────────────────');

const svc = new ComponentRegistryService();

resetState();
responders = [
  {
    match: /FROM component_registry/,
    respond: () => [
      makeRow({ id: 1, name: 'Button', is_default: 1 }),
      makeRow({ id: 2, name: 'Card', is_default: 0 }),
    ],
  },
];
{
  const r = await svc.getAllComponents();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(r.components.length, 2, '2 components');
  assertEq(r.components[0].name, 'Button', 'name');
  assertEq(r.components[0].filePath, '/abs/Button.tsx', 'filePath renamed');
  assertEq(r.components[0].relativePath, 'src/Button.tsx', 'relativePath');
  assertEq(r.components[0].props, ['label', 'onClick'], 'props parsed');
  assertEq(r.components[0].imports, ['react'], 'imports parsed');
  assertEq(r.components[0].exports, ['default'], 'exports parsed');
  assertEq(r.components[0].dependencies, ['react'], 'dependencies parsed');
  assertEq(r.components[0].isDefault, ['export default function Button'], 'isDefault=1 → synthesized line');
  assertEq(r.components[1].isDefault, [], 'isDefault=0 → []');
  assertEq(r.components[0].hasJSX, 1, 'hasJSX from DB');
  assertEq(r.components[0].size, 1024, 'size renamed from file_size');
  assertEq(r.components[0].lines, 45, 'lines renamed from lines_of_code');
  assertEq(r.components[0].complexity, 3, 'complexity renamed');
}

// Cache hit
console.log('\n── getAllComponents: caching ─────────────────────────────');
{
  const before = queryLog.length;
  await svc.getAllComponents();
  assertEq(queryLog.length, before, 'cache hit → no new query');

  quiet();
  svc.clearCache();
  loud();
  await svc.getAllComponents();
  assert(queryLog.length > before, 'post-clear → re-query');
}

// DB error → fallback
console.log('\n── getAllComponents: fallback ────────────────────────────');
const svc2 = new ComponentRegistryService();
resetState();
responders = [
  { match: /FROM component_registry/, respond: () => { throw new Error('down'); } },
];
quiet();
{
  const r = await svc2.getAllComponents();
  loud();
  assertEq(r.generatedBy, 'Fallback (database unavailable)', 'fallback marker');
  assertEq(r.components, [], 'empty components');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

// Not found
resetState();
responders = [
  { match: /FROM component_registry/, respond: () => [] },
];
{
  const r = await svc.getComponentByName('ghost');
  assertEq(r, null, 'not found → null');
}

// Happy path
resetState();
responders = [
  {
    match: /FROM component_registry/,
    respond: (params) => {
      // Params should bind name
      return [makeRow({ name: 'Widget', props: JSON.stringify(['x']) })];
    },
  },
];
{
  const r = await svc.getComponentByName('Widget');
  assertEq(r.name, 'Widget', 'name');
  assertEq(r.props, ['x'], 'props parsed');
  assertEq(r.isDefault, 1, 'isDefault raw (not synthesized here)');
  assertEq(queryLog[0].params, ['Widget'], 'name bound');
}

// Error → null
resetState();
responders = [
  { match: /FROM component_registry/, respond: () => { throw new Error('x'); } },
];
quiet();
{
  const r = await svc.getComponentByName('Widget');
  loud();
  assertEq(r, null, 'error → null');
}

// ============================================================================
// searchComponents
// ============================================================================
console.log('\n── searchComponents: no filters ──────────────────────────');

resetState();
responders = [
  {
    match: /FROM component_registry/,
    respond: () => [makeRow({ name: 'A' }), makeRow({ name: 'B' })],
  },
];
{
  const rows = await svc.searchComponents();
  assertEq(rows.length, 2, '2 rows');
  assertEq(queryLog[0].params, [], 'no bound params');
  assert(/LIMIT 100/.test(queryLog[0].sql), 'default limit 100');
}

// Single filter: category
resetState();
responders = [
  { match: /FROM component_registry/, respond: () => [] },
];
await svc.searchComponents({ category: 'ui' });
assertEq(queryLog[0].params, ['ui'], 'category bound');
assert(/AND category = \?/.test(queryLog[0].sql), 'category clause');

// hasJSX
resetState();
responders = [{ match: /FROM component_registry/, respond: () => [] }];
await svc.searchComponents({ hasJSX: true });
assertEq(queryLog[0].params, [true], 'hasJSX bound');
assert(/AND has_jsx = \?/.test(queryLog[0].sql), 'has_jsx clause');

// hasHooks
resetState();
responders = [{ match: /FROM component_registry/, respond: () => [] }];
await svc.searchComponents({ hasHooks: false });
assertEq(queryLog[0].params, [false], 'hasHooks bound');

// directory with LIKE
resetState();
responders = [{ match: /FROM component_registry/, respond: () => [] }];
await svc.searchComponents({ directory: 'src/ui' });
assertEq(queryLog[0].params, ['%src/ui%'], 'directory wrapped in %');

// search → two LIKE bindings
resetState();
responders = [{ match: /FROM component_registry/, respond: () => [] }];
await svc.searchComponents({ search: 'But' });
assertEq(queryLog[0].params, ['%But%', '%But%'], 'search bound twice');
assert(/\(name LIKE \? OR directory LIKE \?\)/.test(queryLog[0].sql), 'search clause');

// limit
resetState();
responders = [{ match: /FROM component_registry/, respond: () => [] }];
await svc.searchComponents({ limit: 7 });
assert(/LIMIT 7/.test(queryLog[0].sql), 'custom limit');

// Multiple filters
resetState();
responders = [{ match: /FROM component_registry/, respond: () => [] }];
await svc.searchComponents({ category: 'ui', hasJSX: true, directory: 'features' });
assertEq(queryLog[0].params, ['ui', true, '%features%'], 'three filters bound in order');

// DB error → []
resetState();
responders = [{ match: /FROM component_registry/, respond: () => { throw new Error('x'); } }];
quiet();
{
  const rows = await svc.searchComponents({ category: 'ui' });
  loud();
  assertEq(rows, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

resetState();
let callIdx = 0;
responders = [
  {
    match: /FROM component_registry/,
    respond: () => {
      callIdx++;
      if (callIdx === 1) {
        // Stats query
        return [{
          total_components: 10,
          total_categories: 3,
          total_directories: 5,
          avg_file_size: 1000.7,
          avg_lines: 50.4,
          jsx_components: 8,
          hook_components: 4,
          last_updated: '2026-01-10T00:00:00Z',
        }];
      }
      // Categories query
      return [
        { category: 'ui', count: 5 },
        { category: 'layout', count: 3 },
      ];
    },
  },
];
{
  const s = await svc.getComponentSummary();
  assertEq(s.total, 10, 'total');
  assertEq(s.categories, [
    { name: 'ui', count: 5 },
    { name: 'layout', count: 3 },
  ], 'categories');
  assertEq(s.statistics.totalDirectories, 5, 'totalDirectories');
  assertEq(s.statistics.averageFileSize, 1001, 'rounded avg size');
  assertEq(s.statistics.averageLines, 50, 'rounded avg lines');
  assertEq(s.statistics.jsxComponents, 8, 'jsx count');
  assertEq(s.statistics.hookComponents, 4, 'hook count');
}

// Null averages → 0
resetState();
callIdx = 0;
responders = [
  {
    match: /FROM component_registry/,
    respond: () => {
      callIdx++;
      if (callIdx === 1) {
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
      }
      return [];
    },
  },
];
{
  const s = await svc.getComponentSummary();
  assertEq(s.total, 0, '0 total');
  assertEq(s.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(s.statistics.averageLines, 0, 'null avg lines → 0');
  assertEq(s.categories, [], 'empty categories');
}

// Error
resetState();
responders = [
  { match: /FROM component_registry/, respond: () => { throw new Error('x'); } },
];
quiet();
{
  const s = await svc.getComponentSummary();
  loud();
  assertEq(s, { total: 0, categories: [], statistics: {} }, 'error fallback');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// No update fields → no SQL
resetState();
await svc.updateComponent('Button', {});
assertEq(queryLog.length, 0, 'no fields → no SQL');

// Happy: all fields
resetState();
responders = [
  { match: /UPDATE component_registry/, respond: () => ({ affectedRows: 1 }) },
];
// Set a cache entry so we can verify it was cleared
svc.cache.set('foo', { data: 'x', timestamp: Date.now() });
quiet();
await svc.updateComponent('Button', {
  category: 'ui',
  file_size: 2048,
  lines_of_code: 100,
  complexity_score: 7,
});
loud();
{
  const upd = queryLog.find(q => /UPDATE component_registry/.test(q.sql));
  assert(upd !== undefined, 'UPDATE executed');
  assertEq(upd!.params, ['ui', 2048, 100, 7, 'Button'], 'params in order');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(upd!.sql), 'updated_at in SET');
  assert(/WHERE name = \?/.test(upd!.sql), 'WHERE name');
  assertEq(svc.cache.size, 0, 'cache cleared');
}

// Error re-thrown
resetState();
responders = [
  { match: /UPDATE component_registry/, respond: () => { throw new Error('db x'); } },
];
quiet();
{
  let err: Error | null = null;
  try { await svc.updateComponent('Button', { category: 'ui' }); }
  catch (e: any) { err = e; }
  loud();
  assert(err !== null, 'error re-thrown');
  assert(err !== null && /db x/.test(err.message), 'original message');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

const svc3 = new ComponentRegistryService();
svc3.cache.set('k', { data: 1, timestamp: Date.now() });
assertEq(svc3.cache.size, 1, 'set');
quiet();
svc3.clearCache();
loud();
assertEq(svc3.cache.size, 0, 'cleared');

// ============================================================================
// getFallbackComponents
// ============================================================================
console.log('\n── getFallbackComponents ─────────────────────────────────');

{
  const fb = svc.getFallbackComponents();
  assertEq(fb.version, '1.0.0', 'version');
  assert(/database unavailable/.test(fb.generatedBy), 'fallback generatedBy');
  assertEq(fb.components, [], 'empty components');
  assertEq(fb.discoveryTime, 0, 'discoveryTime 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
