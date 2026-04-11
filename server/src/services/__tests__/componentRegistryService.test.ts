#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentRegistryService.js (OMD-1086)
 *
 * Class wrapping component_registry table queries. Only external dep
 * is config/db-compat which exports getAppPool + promisePool. We stub
 * the whole module via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - getAllComponents: fresh query builds shape + JSON parsing,
 *                        subsequent call hits cache, error → fallback
 *   - getComponentByName: missing → null; found → shaped object;
 *                          DB error → null
 *   - searchComponents: no filters, category, hasJSX, hasHooks,
 *                        directory LIKE, search LIKE, combined,
 *                        default limit, custom limit, error → []
 *   - getComponentSummary: happy path, error → empty shape
 *   - updateComponent: no fields → no query, partial fields, all fields,
 *                       cache cleared, error rethrown
 *   - clearCache
 *   - getFallbackComponents: shape
 *
 * Run: npx tsx server/src/services/__tests__/componentRegistryService.test.ts
 */

import * as pathMod from 'path';

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

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
type ExecuteCall = { sql: string; params: any[] };
const queryLog: ExecuteCall[] = [];
let routes: Route[] = [];
let throwOnPattern: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }
    for (const r of routes) {
      if (r.match.test(sql)) {
        const result = r.respond(params, sql);
        return [result, []];
      }
    }
    return [[], []];
  },
};

// ── Stub config/db-compat ───────────────────────────────────────────
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}

stubModule('config/db-compat', {
  getAppPool: () => fakePool,
  promisePool: fakePool,
});

// Silence logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const ComponentRegistryService = require('../componentRegistryService');

function resetDb() {
  queryLog.length = 0;
  routes = [];
  throwOnPattern = null;
}

async function main() {

// ============================================================================
// getAllComponents — fresh query
// ============================================================================
console.log('\n── getAllComponents ──────────────────────────────────────');

{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [
    {
      match: /FROM component_registry[\s\S]*is_active = TRUE[\s\S]*ORDER BY name/i,
      respond: () => [
        {
          id: 1, name: 'Button', file_path: '/src/Button.tsx',
          relative_path: 'src/Button.tsx', directory: 'src', extension: 'tsx',
          category: 'ui',
          props: '[{"name":"onClick"}]',
          imports: '["React"]',
          exports: '["Button"]',
          is_default: 1, has_jsx: 1, has_hooks: 0,
          dependencies: '["react"]',
          file_size: 500, lines_of_code: 20, complexity_score: 3,
          last_modified: '2026-04-01', discovery_version: '1.0.0',
          discovered_at: '2026-04-01', updated_at: '2026-04-01',
        },
        {
          id: 2, name: 'Card', file_path: '/src/Card.tsx',
          relative_path: 'src/Card.tsx', directory: 'src', extension: 'tsx',
          category: 'ui',
          props: null, imports: null, exports: null, is_default: 0,
          has_jsx: 1, has_hooks: 1, dependencies: null,
          file_size: 300, lines_of_code: 15, complexity_score: 2,
          last_modified: null, discovery_version: '1.0.0',
          discovered_at: null, updated_at: null,
        },
      ],
    },
  ];
  const result = await svc.getAllComponents();
  assertEq(result.version, '1.0.0', 'version');
  assert(typeof result.generatedAt === 'string', 'generatedAt is string');
  assert(result.generatedBy.includes('Database'), 'generatedBy');
  assertEq(result.components.length, 2, '2 components');
  const btn = result.components[0];
  assertEq(btn.id, 1, 'id');
  assertEq(btn.name, 'Button', 'name');
  assertEq(btn.filePath, '/src/Button.tsx', 'filePath');
  assertEq(btn.relativePath, 'src/Button.tsx', 'relativePath');
  assertEq(btn.category, 'ui', 'category');
  assertEq(btn.props, [{ name: 'onClick' }], 'props parsed');
  assertEq(btn.imports, ['React'], 'imports parsed');
  assertEq(btn.exports, ['Button'], 'exports parsed');
  assertEq(btn.dependencies, ['react'], 'dependencies parsed');
  assertEq(btn.isDefault, ['export default function Button'], 'isDefault expanded when is_default=1');
  assertEq(btn.hasJSX, 1, 'hasJSX');
  assertEq(btn.hasHooks, 0, 'hasHooks');
  assertEq(btn.size, 500, 'size');
  assertEq(btn.lines, 20, 'lines');
  assertEq(btn.complexity, 3, 'complexity');

  const card = result.components[1];
  assertEq(card.props, [], 'null props → []');
  assertEq(card.imports, [], 'null imports → []');
  assertEq(card.exports, [], 'null exports → []');
  assertEq(card.dependencies, [], 'null dependencies → []');
  assertEq(card.isDefault, [], 'is_default=0 → []');

  // Cache: second call does NOT issue another query
  const beforeCount = queryLog.length;
  const cached = await svc.getAllComponents();
  assertEq(queryLog.length, beforeCount, 'cached call adds no queries');
  assertEq(cached.components.length, 2, 'cached result has same components');
}

// Cache expiry: rewind cacheTimeout and confirm re-query
{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [
    { match: /FROM component_registry/i, respond: () => [{
      id: 1, name: 'A', file_path: '', relative_path: '', directory: '', extension: '',
      category: null, props: null, imports: null, exports: null,
      is_default: 0, has_jsx: 0, has_hooks: 0, dependencies: null,
      file_size: 0, lines_of_code: 0, complexity_score: 0,
      last_modified: null, discovery_version: '', discovered_at: null, updated_at: null,
    }] },
  ];
  await svc.getAllComponents();
  const entry = svc.cache.get('all_components');
  entry.timestamp = Date.now() - (11 * 60 * 1000); // 11 min ago — past 10-min timeout
  await svc.getAllComponents();
  assertEq(queryLog.length, 2, 'expired cache → re-query');
}

// Error path → fallback
{
  resetDb();
  const svc = new ComponentRegistryService();
  throwOnPattern = /FROM component_registry/i;
  quiet();
  const result = await svc.getAllComponents();
  loud();
  assertEq(result.components, [], 'error → fallback empty components');
  assert(result.generatedBy.includes('Fallback'), 'fallback generatedBy');
}

// ============================================================================
// getComponentByName
// ============================================================================
console.log('\n── getComponentByName ────────────────────────────────────');

{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [
    {
      match: /WHERE name = \? AND is_active = TRUE/i,
      respond: (params) => {
        if (params[0] === 'Button') {
          return [{
            id: 1, name: 'Button', file_path: '/x', relative_path: 'x',
            directory: 'd', extension: 'tsx', category: 'ui',
            props: '[]', imports: '[]', exports: '[]',
            is_default: 1, has_jsx: 1, has_hooks: 0, dependencies: '[]',
            file_size: 100, lines_of_code: 10, complexity_score: 1,
            last_modified: null, discovery_version: '1.0.0',
            discovered_at: null, updated_at: null,
          }];
        }
        return [];
      },
    },
  ];
  const btn = await svc.getComponentByName('Button');
  assertEq(btn.name, 'Button', 'found name');
  assertEq(btn.isDefault, 1, 'isDefault is raw value here (not wrapped)');
  const missing = await svc.getComponentByName('Nonexistent');
  assertEq(missing, null, 'missing → null');
}

// Error path
{
  resetDb();
  const svc = new ComponentRegistryService();
  throwOnPattern = /WHERE name = \?/i;
  quiet();
  const result = await svc.getComponentByName('X');
  loud();
  assertEq(result, null, 'error → null');
}

// ============================================================================
// searchComponents
// ============================================================================
console.log('\n── searchComponents ──────────────────────────────────────');

{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [
    {
      match: /FROM component_registry[\s\S]*is_active = TRUE/i,
      respond: () => [
        {
          id: 1, name: 'A', file_path: '/a', relative_path: 'a',
          directory: 'ui', extension: 'tsx', category: 'form',
          props: '[]', imports: '[]', exports: '[]',
          is_default: 0, has_jsx: 1, has_hooks: 1, dependencies: '[]',
          file_size: 100, lines_of_code: 10, complexity_score: 1,
        },
      ],
    },
  ];

  // No filters
  const all = await svc.searchComponents();
  assertEq(all.length, 1, 'no-filter returns row');
  assertEq(all[0].name, 'A', 'name');
  assert(/LIMIT 100/.test(queryLog[0].sql), 'default limit 100');
  assertEq(queryLog[0].params.length, 0, 'no params');

  // category filter
  resetDb();
  routes = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({ category: 'form' });
  assert(/AND category = \?/.test(queryLog[0].sql), 'category clause');
  assertEq(queryLog[0].params, ['form'], 'category param');

  // hasJSX filter
  resetDb();
  routes = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({ hasJSX: true });
  assert(/AND has_jsx = \?/.test(queryLog[0].sql), 'hasJSX clause');
  assertEq(queryLog[0].params[0], true, 'hasJSX param');

  // hasHooks filter
  resetDb();
  routes = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({ hasHooks: false });
  assert(/AND has_hooks = \?/.test(queryLog[0].sql), 'hasHooks clause');
  assertEq(queryLog[0].params[0], false, 'hasHooks param');

  // directory LIKE
  resetDb();
  routes = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({ directory: 'ui' });
  assert(/AND directory LIKE \?/.test(queryLog[0].sql), 'directory clause');
  assertEq(queryLog[0].params[0], '%ui%', 'directory param wrapped in %');

  // search LIKE (matches name OR directory)
  resetDb();
  routes = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({ search: 'button' });
  assert(/name LIKE \? OR directory LIKE \?/.test(queryLog[0].sql), 'search clause');
  assertEq(queryLog[0].params, ['%button%', '%button%'], 'search params');

  // combined filters
  resetDb();
  routes = [{ match: /FROM component_registry/i, respond: () => [] }];
  await svc.searchComponents({
    category: 'ui', hasJSX: true, directory: 'src', limit: 50,
  });
  const sql = queryLog[0].sql;
  assert(/category = \?/.test(sql), 'combined: category');
  assert(/has_jsx = \?/.test(sql), 'combined: hasJSX');
  assert(/directory LIKE \?/.test(sql), 'combined: directory');
  assert(/LIMIT 50/.test(sql), 'combined: custom limit');
  assertEq(queryLog[0].params, ['ui', true, '%src%'], 'combined params');

  // Error → []
  resetDb();
  throwOnPattern = /FROM component_registry/i;
  quiet();
  const errResult = await svc.searchComponents({ category: 'x' });
  loud();
  assertEq(errResult, [], 'error → []');
}

// ============================================================================
// getComponentSummary
// ============================================================================
console.log('\n── getComponentSummary ───────────────────────────────────');

{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [
    {
      match: /COUNT\(\*\) as total_components/i,
      respond: () => [{
        total_components: 42,
        total_categories: 5,
        total_directories: 12,
        avg_file_size: 275.7,
        avg_lines: 18.4,
        jsx_components: 30,
        hook_components: 20,
        last_updated: '2026-04-01',
      }],
    },
    {
      match: /GROUP BY category/i,
      respond: () => [
        { category: 'ui', count: 20 },
        { category: 'form', count: 10 },
      ],
    },
  ];
  const summary = await svc.getComponentSummary();
  assertEq(summary.total, 42, 'total');
  assertEq(summary.categories.length, 2, '2 categories');
  assertEq(summary.categories[0].name, 'ui', 'category name');
  assertEq(summary.categories[0].count, 20, 'category count');
  assertEq(summary.statistics.totalDirectories, 12, 'totalDirectories');
  assertEq(summary.statistics.averageFileSize, 276, 'avg file size rounded');
  assertEq(summary.statistics.averageLines, 18, 'avg lines rounded');
  assertEq(summary.statistics.jsxComponents, 30, 'jsx count');
  assertEq(summary.statistics.hookComponents, 20, 'hook count');
  assertEq(summary.statistics.lastUpdated, '2026-04-01', 'lastUpdated');
}

// null averages → 0
{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [
    {
      match: /COUNT\(\*\) as total_components/i,
      respond: () => [{
        total_components: 0, total_directories: 0,
        avg_file_size: null, avg_lines: null,
        jsx_components: 0, hook_components: 0, last_updated: null,
      }],
    },
    { match: /GROUP BY category/i, respond: () => [] },
  ];
  const summary = await svc.getComponentSummary();
  assertEq(summary.statistics.averageFileSize, 0, 'null avg → 0');
  assertEq(summary.statistics.averageLines, 0, 'null avg → 0');
}

// Error → empty shape
{
  resetDb();
  const svc = new ComponentRegistryService();
  throwOnPattern = /COUNT\(\*\) as total_components/i;
  quiet();
  const summary = await svc.getComponentSummary();
  loud();
  assertEq(summary.total, 0, 'error: total=0');
  assertEq(summary.categories, [], 'error: no categories');
  assertEq(summary.statistics, {}, 'error: empty stats');
}

// ============================================================================
// updateComponent
// ============================================================================
console.log('\n── updateComponent ───────────────────────────────────────');

// No fields → no query issued
{
  resetDb();
  const svc = new ComponentRegistryService();
  quiet();
  await svc.updateComponent('X', {});
  loud();
  assertEq(queryLog.length, 0, 'no fields → no query');
}

// Single field
{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [{ match: /UPDATE component_registry/i, respond: () => ({ affectedRows: 1 }) }];
  quiet();
  await svc.updateComponent('Button', { category: 'ui' });
  loud();
  assertEq(queryLog.length, 1, '1 query');
  const sql = queryLog[0].sql;
  assert(/SET category = \?/.test(sql), 'SET category');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(sql), 'updated_at touched');
  // params: [category, name]
  assertEq(queryLog[0].params, ['ui', 'Button'], 'params order');
}

// Multi field
{
  resetDb();
  const svc = new ComponentRegistryService();
  routes = [{ match: /UPDATE component_registry/i, respond: () => ({ affectedRows: 1 }) }];
  // Pre-populate cache so clearCache has something to clear
  svc.cache.set('all_components', { data: {}, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'cache pre-populated');

  quiet();
  await svc.updateComponent('Button', {
    category: 'ui', file_size: 500, lines_of_code: 20, complexity_score: 4,
  });
  loud();
  const sql = queryLog[0].sql;
  assert(/category = \?/.test(sql), 'category');
  assert(/file_size = \?/.test(sql), 'file_size');
  assert(/lines_of_code = \?/.test(sql), 'lines_of_code');
  assert(/complexity_score = \?/.test(sql), 'complexity_score');
  assertEq(queryLog[0].params, ['ui', 500, 20, 4, 'Button'], 'params order');
  assertEq(svc.cache.size, 0, 'cache cleared after update');
}

// Error is rethrown
{
  resetDb();
  const svc = new ComponentRegistryService();
  throwOnPattern = /UPDATE component_registry/i;
  let caught: Error | null = null;
  try {
    quiet();
    await svc.updateComponent('X', { category: 'ui' });
    loud();
  } catch (e: any) {
    loud();
    caught = e;
  }
  assert(caught !== null, 'error rethrown');
  assert(caught !== null && caught.message.includes('fake db failure'), 'error message preserved');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  svc.cache.set('key1', { data: {}, timestamp: Date.now() });
  svc.cache.set('key2', { data: {}, timestamp: Date.now() });
  assertEq(svc.cache.size, 2, 'pre-clear size');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache empty after clear');
}

// ============================================================================
// getFallbackComponents
// ============================================================================
console.log('\n── getFallbackComponents ─────────────────────────────────');

{
  const svc = new ComponentRegistryService();
  const fb = svc.getFallbackComponents();
  assertEq(fb.version, '1.0.0', 'version');
  assertEq(fb.components, [], 'empty components');
  assert(fb.generatedBy.includes('Fallback'), 'Fallback in generatedBy');
  assert(typeof fb.generatedAt === 'string', 'generatedAt string');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
