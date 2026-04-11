#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/headlineCache.js (OMD-959)
 *
 * Orthodox Headlines caching system. Memory cache via node-cache (real);
 * Redis is optional and null when REDIS_URL env var is unset — we ensure
 * it is unset before loading the SUT so the Redis branch never executes
 * and we test pure memory-cache behavior.
 *
 * Coverage:
 *   - generateKey          builds deterministic keys with defaults
 *   - generateSourcesKey   static
 *   - generateLanguagesKey static
 *   - set / get            memory cache roundtrip + hit/miss stats
 *   - delete               removes entry + stats
 *   - cacheHeadlines       miss → loader called + cached; hit → no loader
 *   - cacheSources         same wrapper pattern
 *   - cacheLanguages       same wrapper pattern
 *   - clearAll             only removes keys starting with 'headlines:'
 *   - invalidateHeadlinesCache  same prefix-only invalidation
 *   - getStats             hit rate math, memoryKeys, redisConnected=false
 *   - warmUp               calls loader multiple times; errors don't abort
 *   - export shape         headlinesCache (singleton), HeadlinesCache, CACHE_CONFIG
 *
 * Run from server/: npx tsx src/utils/__tests__/headlineCache.test.ts
 */

// Ensure Redis path is disabled BEFORE requiring the SUT
delete process.env.REDIS_URL;

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

const { headlinesCache, HeadlinesCache, CACHE_CONFIG } = require('../headlineCache');

// Silence console logs that the SUT emits frequently
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// export shape
// ============================================================================
console.log('\n── export shape ──────────────────────────────────────────');

assert(typeof HeadlinesCache === 'function', 'HeadlinesCache is a class');
assert(headlinesCache instanceof HeadlinesCache, 'headlinesCache is instance');
assert(typeof CACHE_CONFIG === 'object', 'CACHE_CONFIG exported');
assertEq(CACHE_CONFIG.MEMORY_TTL, 3 * 60 * 60, 'MEMORY_TTL = 3h');
assertEq(CACHE_CONFIG.REDIS_TTL, 6 * 60 * 60, 'REDIS_TTL = 6h');
assertEq(CACHE_CONFIG.ENABLE_REDIS, false, 'Redis disabled (no REDIS_URL)');

// ============================================================================
// generateKey
// ============================================================================
console.log('\n── generateKey ───────────────────────────────────────────');

{
  const cache = new HeadlinesCache();
  assertEq(cache.generateKey({}), 'headlines:all:en:20:0', 'all defaults');
  assertEq(
    cache.generateKey({ source: 'GOARCH', lang: 'el', limit: 10, offset: 5 }),
    'headlines:GOARCH:el:10:5',
    'all params supplied'
  );
  assertEq(
    cache.generateKey({ source: 'OCA' }),
    'headlines:OCA:en:20:0',
    'partial params with defaults'
  );
  assertEq(cache.generateSourcesKey(), 'headlines:sources', 'sources key');
  assertEq(cache.generateLanguagesKey(), 'headlines:languages', 'languages key');
}

// ============================================================================
// set / get roundtrip
// ============================================================================
console.log('\n── set / get ─────────────────────────────────────────────');

{
  const cache = new HeadlinesCache();
  // Clean state: clear any leftover entries from singleton import
  await cache.clearAll();
  // Also directly delete the keys we'll use in case singleton populated them
  quiet();
  await cache.set('headlines:test:en:5:0', { items: [1, 2, 3] });
  loud();
  assertEq(cache.stats.sets, 1, 'sets stat incremented');

  quiet();
  const got = await cache.get('headlines:test:en:5:0');
  loud();
  assertEq(got, { items: [1, 2, 3] }, 'get returns same data');
  assertEq(cache.stats.hits, 1, 'hit stat');

  quiet();
  const missed = await cache.get('headlines:does-not-exist:en:5:0');
  loud();
  assertEq(missed, null, 'miss returns null');
  assertEq(cache.stats.misses, 1, 'miss stat');
}

// ============================================================================
// delete
// ============================================================================
console.log('\n── delete ────────────────────────────────────────────────');

{
  const cache = new HeadlinesCache();
  quiet();
  await cache.set('headlines:deltest:en:5:0', { foo: 'bar' });
  const before = await cache.get('headlines:deltest:en:5:0');
  await cache.delete('headlines:deltest:en:5:0');
  const after = await cache.get('headlines:deltest:en:5:0');
  loud();
  assertEq(before, { foo: 'bar' }, 'present before delete');
  assertEq(after, null, 'absent after delete');
  assertEq(cache.stats.deletes, 1, 'delete stat');
}

// ============================================================================
// cacheHeadlines — miss calls loader; hit skips loader
// ============================================================================
console.log('\n── cacheHeadlines ────────────────────────────────────────');

{
  const cache = new HeadlinesCache();
  let loaderCalls = 0;
  const loader = async () => {
    loaderCalls++;
    return { articles: [{ title: 'News' }] };
  };

  quiet();
  const first = await cache.cacheHeadlines(
    { source: 'OCA', lang: 'en', limit: 5, offset: 0 },
    loader
  );
  loud();
  assertEq(first, { articles: [{ title: 'News' }] }, 'first call returns loader data');
  assertEq(loaderCalls, 1, 'loader called on miss');

  quiet();
  const second = await cache.cacheHeadlines(
    { source: 'OCA', lang: 'en', limit: 5, offset: 0 },
    loader
  );
  loud();
  assertEq(second, { articles: [{ title: 'News' }] }, 'second call returns cached data');
  assertEq(loaderCalls, 1, 'loader NOT called on hit');
}

// ============================================================================
// cacheSources / cacheLanguages
// ============================================================================
console.log('\n── cacheSources / cacheLanguages ─────────────────────────');

{
  const cache = new HeadlinesCache();
  let srcCalls = 0;
  let langCalls = 0;

  quiet();
  await cache.cacheSources(async () => { srcCalls++; return ['A', 'B']; });
  await cache.cacheSources(async () => { srcCalls++; return ['A', 'B']; });
  loud();
  assertEq(srcCalls, 1, 'sources loader once (cached 2nd)');

  quiet();
  await cache.cacheLanguages(async () => { langCalls++; return ['en', 'el']; });
  await cache.cacheLanguages(async () => { langCalls++; return ['en', 'el']; });
  loud();
  assertEq(langCalls, 1, 'languages loader once (cached 2nd)');

  quiet();
  const srcs = await cache.get('headlines:sources');
  const langs = await cache.get('headlines:languages');
  loud();
  assertEq(srcs, ['A', 'B'], 'sources cached');
  assertEq(langs, ['en', 'el'], 'languages cached');
}

// ============================================================================
// clearAll — only headlines: prefix
// ============================================================================
console.log('\n── clearAll ──────────────────────────────────────────────');

{
  const cache = new HeadlinesCache();
  // Need to access the underlying memoryCache — we can only do this via
  // set() and get(). The SUT's clearAll only touches keys starting with
  // 'headlines:'. We can't easily insert non-headline keys via the public
  // API, so we just verify it removes headlines-prefixed keys.
  quiet();
  await cache.set('headlines:alpha:en:5:0', 'A');
  await cache.set('headlines:beta:en:5:0', 'B');
  const beforeA = await cache.get('headlines:alpha:en:5:0');
  const beforeB = await cache.get('headlines:beta:en:5:0');
  await cache.clearAll();
  const afterA = await cache.get('headlines:alpha:en:5:0');
  const afterB = await cache.get('headlines:beta:en:5:0');
  loud();
  assertEq(beforeA, 'A', 'alpha present before');
  assertEq(beforeB, 'B', 'beta present before');
  assertEq(afterA, null, 'alpha cleared');
  assertEq(afterB, null, 'beta cleared');
}

// ============================================================================
// invalidateHeadlinesCache
// ============================================================================
console.log('\n── invalidateHeadlinesCache ──────────────────────────────');

{
  const cache = new HeadlinesCache();
  quiet();
  await cache.set('headlines:inv:en:5:0', 'X');
  const before = await cache.get('headlines:inv:en:5:0');
  await cache.invalidateHeadlinesCache();
  const after = await cache.get('headlines:inv:en:5:0');
  loud();
  assertEq(before, 'X', 'present before invalidate');
  assertEq(after, null, 'absent after invalidate');
}

// ============================================================================
// getStats
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

{
  const cache = new HeadlinesCache();
  quiet();
  await cache.set('headlines:s1:en:5:0', 1);
  await cache.set('headlines:s2:en:5:0', 2);
  await cache.get('headlines:s1:en:5:0'); // hit
  await cache.get('headlines:s2:en:5:0'); // hit
  await cache.get('headlines:none:en:5:0'); // miss
  loud();

  const stats = cache.getStats();
  assertEq(stats.sets, 2, 'stats.sets');
  assertEq(stats.hits, 2, 'stats.hits');
  assertEq(stats.misses, 1, 'stats.misses');
  assertEq(stats.redisConnected, false, 'redisConnected false');
  assert(typeof stats.memoryKeys === 'number', 'memoryKeys is number');
  assert(stats.memoryKeys >= 2, 'memoryKeys >= 2');
  // 2 hits / 3 lookups = 66.67%
  assertEq(stats.hitRate, '66.67%', 'hitRate 66.67%');
  assert(typeof stats.config === 'object', 'config in stats');

  // Fresh instance → 0% rate (division by 0 guard)
  const fresh = new HeadlinesCache();
  const freshStats = fresh.getStats();
  assertEq(freshStats.hitRate, '0%', 'fresh hitRate = 0%');
}

// ============================================================================
// warmUp — calls loader with each popular query; errors don't abort
// ============================================================================
console.log('\n── warmUp ────────────────────────────────────────────────');

// Shim setTimeout so the 100ms delays don't slow the test
const origSetTimeout = global.setTimeout;
(global as any).setTimeout = (fn: any) => { fn(); return 0 as any; };

{
  const cache = new HeadlinesCache();
  await cache.clearAll();
  const seen: any[] = [];
  const loader = async (params: any) => {
    seen.push(params);
    return { ok: true };
  };
  quiet();
  await cache.warmUp(loader);
  loud();
  assertEq(seen.length, 6, 'warmUp calls loader 6 times (popular queries)');
  assertEq(seen[0].source, 'all', 'first: source=all');
  assertEq(seen[1].source, 'GOARCH', 'second: GOARCH');
}

// warmUp tolerates loader errors
{
  const cache = new HeadlinesCache();
  await cache.clearAll();
  let calls = 0;
  const loader = async () => {
    calls++;
    if (calls === 2) throw new Error('boom');
    return { ok: true };
  };
  quiet();
  await cache.warmUp(loader);
  loud();
  assertEq(calls, 6, 'warmUp does not abort on error (all 6 attempted)');
}

(global as any).setTimeout = origSetTimeout;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
