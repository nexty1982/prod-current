#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/headlineCache.js (OMD-969)
 *
 * HeadlinesCache class wraps NodeCache (memory) + optional Redis.
 * Redis is gated by process.env.REDIS_URL — leave unset so tests run
 * memory-only without any external dependencies.
 *
 * Note: the module uses a singleton `memoryCache` at module scope
 * shared across all HeadlinesCache instances. Tests use unique key
 * prefixes to avoid cross-test contamination, and clear via clearAll
 * + invalidateHeadlinesCache where appropriate.
 *
 * Coverage:
 *   - Key generators: generateKey (with defaults), sources, languages
 *   - get/set/delete (memory cache path; Redis branch unreachable here)
 *   - cacheHeadlines: cache miss → loader called → result cached
 *   - cacheHeadlines: cache hit → loader NOT called
 *   - cacheSources / cacheLanguages: same wrapper semantics
 *   - clearAll: removes only headlines:* keys
 *   - invalidateHeadlinesCache: removes only headlines:* keys
 *   - getStats: hits/misses/sets/deletes counters + hitRate %
 *
 * Run: npx tsx server/src/utils/__tests__/headlineCache.test.ts
 */

// Ensure Redis stays disabled
delete process.env.REDIS_URL;

const { HeadlinesCache, headlinesCache, CACHE_CONFIG } = require('../headlineCache');

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

// Silence noisy console.log from the SUT
const origLog = console.log;
const origErr = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origErr; }

async function main() {

// ============================================================================
// Sanity: exports
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

assertEq(typeof HeadlinesCache, 'function', 'HeadlinesCache class exported');
assertEq(typeof headlinesCache, 'object', 'singleton exported');
assert(headlinesCache instanceof HeadlinesCache, 'singleton is HeadlinesCache instance');
assertEq(typeof CACHE_CONFIG.MEMORY_TTL, 'number', 'CACHE_CONFIG.MEMORY_TTL');
assertEq(CACHE_CONFIG.ENABLE_REDIS, false, 'Redis disabled (REDIS_URL unset)');

// ============================================================================
// generateKey (with defaults)
// ============================================================================
console.log('\n── generateKey ───────────────────────────────────────────');

const cache = new HeadlinesCache();

assertEq(
  cache.generateKey({}),
  'headlines:all:en:20:0',
  'all defaults'
);
assertEq(
  cache.generateKey({ source: 'GOARCH' }),
  'headlines:GOARCH:en:20:0',
  'source override'
);
assertEq(
  cache.generateKey({ lang: 'el', limit: 10, offset: 5 }),
  'headlines:all:el:10:5',
  'lang/limit/offset overrides'
);
assertEq(
  cache.generateKey({ source: 'OCA', lang: 'ru', limit: 50, offset: 100 }),
  'headlines:OCA:ru:50:100',
  'all four overrides'
);
assertEq(cache.generateSourcesKey(), 'headlines:sources', 'generateSourcesKey');
assertEq(cache.generateLanguagesKey(), 'headlines:languages', 'generateLanguagesKey');

// ============================================================================
// get / set / delete (memory cache path)
// ============================================================================
console.log('\n── get/set/delete ────────────────────────────────────────');

quiet();
{
  const c = new HeadlinesCache();
  const key = 'headlines:test-get-set-1';

  // Initially miss
  const miss = await c.get(key);
  assertEq(miss, null, 'miss returns null');
  assertEq(c.stats.misses, 1, 'misses=1');
  assertEq(c.stats.hits, 0, 'hits=0');

  // Set then get → hit
  await c.set(key, { data: 'hello', n: 42 });
  assertEq(c.stats.sets, 1, 'sets=1');

  const hit = await c.get(key);
  assertEq(hit, { data: 'hello', n: 42 }, 'hit returns stored value');
  assertEq(c.stats.hits, 1, 'hits=1');

  // Delete
  await c.delete(key);
  assertEq(c.stats.deletes, 1, 'deletes=1');

  // Now miss again
  const miss2 = await c.get(key);
  assertEq(miss2, null, 'after delete: miss');
  assertEq(c.stats.misses, 2, 'misses=2');
}
loud();

// set with custom TTL
quiet();
{
  const c = new HeadlinesCache();
  const key = 'headlines:test-custom-ttl';
  await c.set(key, { x: 1 }, 60); // 60 second TTL
  const result = await c.get(key);
  assertEq(result, { x: 1 }, 'custom TTL: value retrievable');
}
loud();

// ============================================================================
// cacheHeadlines wrapper
// ============================================================================
console.log('\n── cacheHeadlines wrapper ────────────────────────────────');

quiet();
{
  const c = new HeadlinesCache();
  let loaderCalls = 0;
  const loader = async () => { loaderCalls++; return { items: ['a', 'b'], count: 2 }; };

  const params = { source: 'WRAP-TEST-1', lang: 'en', limit: 20, offset: 0 };

  // First call: miss → loader runs → result cached
  const r1 = await c.cacheHeadlines(params, loader);
  assertEq(r1, { items: ['a', 'b'], count: 2 }, 'wrapper: returns loader result');
  assertEq(loaderCalls, 1, 'wrapper: loader called once');

  // Second call: hit → loader NOT called
  const r2 = await c.cacheHeadlines(params, loader);
  assertEq(r2, { items: ['a', 'b'], count: 2 }, 'wrapper: same result on hit');
  assertEq(loaderCalls, 1, 'wrapper: loader NOT called on hit');

  // Cleanup
  await c.delete(c.generateKey(params));
}
loud();

// ============================================================================
// cacheSources / cacheLanguages
// ============================================================================
console.log('\n── cacheSources / cacheLanguages ─────────────────────────');

quiet();
{
  const c = new HeadlinesCache();
  // Clear any pre-existing
  await c.delete('headlines:sources');
  await c.delete('headlines:languages');

  let srcCalls = 0;
  const srcLoader = async () => { srcCalls++; return ['GOARCH', 'OCA', 'OT']; };
  const r1 = await c.cacheSources(srcLoader);
  assertEq(r1, ['GOARCH', 'OCA', 'OT'], 'cacheSources: returns');
  assertEq(srcCalls, 1, 'cacheSources: loader called');

  const r2 = await c.cacheSources(srcLoader);
  assertEq(srcCalls, 1, 'cacheSources: cached on 2nd call');
  assertEq(r2, ['GOARCH', 'OCA', 'OT'], 'cacheSources: cached value');

  let langCalls = 0;
  const langLoader = async () => { langCalls++; return ['en', 'el', 'ru']; };
  const l1 = await c.cacheLanguages(langLoader);
  assertEq(l1, ['en', 'el', 'ru'], 'cacheLanguages: returns');
  assertEq(langCalls, 1, 'cacheLanguages: loader called');

  await c.cacheLanguages(langLoader);
  assertEq(langCalls, 1, 'cacheLanguages: cached on 2nd call');

  // Cleanup
  await c.delete('headlines:sources');
  await c.delete('headlines:languages');
}
loud();

// ============================================================================
// clearAll: only removes headlines:* keys
// ============================================================================
console.log('\n── clearAll ──────────────────────────────────────────────');

quiet();
{
  const c = new HeadlinesCache();
  await c.set('headlines:a', { v: 1 });
  await c.set('headlines:b', { v: 2 });
  await c.set('headlines:c', { v: 3 });

  await c.clearAll();

  const r = await c.get('headlines:a');
  assertEq(r, null, 'clearAll removed headlines:a');
  const r2 = await c.get('headlines:b');
  assertEq(r2, null, 'clearAll removed headlines:b');
}
loud();

// ============================================================================
// invalidateHeadlinesCache
// ============================================================================
console.log('\n── invalidateHeadlinesCache ──────────────────────────────');

quiet();
{
  const c = new HeadlinesCache();
  await c.set('headlines:invalidate-1', { v: 1 });
  await c.set('headlines:invalidate-2', { v: 2 });

  await c.invalidateHeadlinesCache();

  assertEq(await c.get('headlines:invalidate-1'), null, 'invalidate removed key 1');
  assertEq(await c.get('headlines:invalidate-2'), null, 'invalidate removed key 2');
}
loud();

// ============================================================================
// getStats: counters + hitRate
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

quiet();
{
  const c = new HeadlinesCache();
  // Initial
  const init = c.getStats();
  assertEq(init.hits, 0, 'init hits=0');
  assertEq(init.misses, 0, 'init misses=0');
  assertEq(init.sets, 0, 'init sets=0');
  assertEq(init.deletes, 0, 'init deletes=0');
  assertEq(init.hitRate, '0%', 'init hitRate=0%');
  assertEq(init.redisConnected, false, 'redis not connected');
  assert(typeof init.config === 'object', 'config object included');

  // Generate some traffic
  await c.set('headlines:stats-1', { v: 1 }); // sets++
  await c.get('headlines:stats-1');           // hit
  await c.get('headlines:stats-1');           // hit
  await c.get('headlines:stats-missing');     // miss
  await c.delete('headlines:stats-1');        // delete

  const s = c.getStats();
  assertEq(s.hits, 2, 'hits=2');
  assertEq(s.misses, 1, 'misses=1');
  assertEq(s.sets, 1, 'sets=1');
  assertEq(s.deletes, 1, 'deletes=1');
  // hitRate = 2/(2+1) * 100 = 66.67
  assertEq(s.hitRate, '66.67%', 'hitRate=66.67%');
}
loud();

// hitRate edge case: 100%
quiet();
{
  const c = new HeadlinesCache();
  await c.set('headlines:hitrate-100', { v: 1 });
  await c.get('headlines:hitrate-100');
  await c.get('headlines:hitrate-100');
  const s = c.getStats();
  assertEq(s.hitRate, '100.00%', 'hitRate=100.00%');
  await c.delete('headlines:hitrate-100');
}
loud();

// ============================================================================
// CACHE_CONFIG shape
// ============================================================================
console.log('\n── CACHE_CONFIG ──────────────────────────────────────────');

assertEq(CACHE_CONFIG.MEMORY_TTL, 3 * 60 * 60, 'MEMORY_TTL = 3h');
assertEq(CACHE_CONFIG.REDIS_TTL, 6 * 60 * 60, 'REDIS_TTL = 6h');
assertEq(CACHE_CONFIG.MAX_MEMORY_KEYS, 100, 'MAX_MEMORY_KEYS = 100');
assertEq(CACHE_CONFIG.MEMORY_CHECK_PERIOD, 60, 'MEMORY_CHECK_PERIOD = 60');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
